// Copia del Motore: non modificare qui, si modifica nel repository motore
// Fornitore per l'API Chat Completions di OpenAI e di tutti i servizi compatibili (OpenRouter, server locali…).
// Formati verificati su platform.openai.com/docs/api-reference/chat e openrouter.ai/docs: messaggi con parti
// text/image_url, response_format json_schema, stream_options.include_usage, usage con prompt_tokens_details.
import type { Fornitore, Messaggio, Parte, PezzoFlusso, RichiestaFornitore, RispostaFornitore, Uso } from "../tipi";
import { dettaglioMetadata, ErroreFornitore, inviaRichiesta, riprovabileDaStato, type FetchFn } from "./errori";
import { leggiJSON, leggiSSE } from "./sse";
import { sintetizzaFormatoOpenAI } from "./voce-openai";

export type OpzioniOpenAI = {
  /** Id del fornitore nel motore: "openai", "openrouter"… (è la chiave di `fornitori` e il campo `fornitore` dei modelli). */
  id: string;
  chiave: string;
  /** Indirizzo base, per esempio https://api.openai.com/v1 oppure https://openrouter.ai/api/v1 (senza /chat/completions). */
  url: string;
  fetchFn?: FetchFn;
  /**
   * Nome del campo del tetto di token. OpenAI vuole `max_completion_tokens` (`max_tokens` è deprecato e i modelli
   * con ragionamento lo rifiutano); OpenRouter e gli altri compatibili usano `max_tokens`. Se manca si sceglie dall'indirizzo.
   */
  campo_max_token?: "max_tokens" | "max_completion_tokens";
  /**
   * Marca con `cache_control` l'ultima parte stabile. OpenAI mette in cache da solo, quindi non serve; i modelli
   * Anthropic raggiunti via OpenRouter invece la vogliono esplicita. Se manca: attivo quando il nome del modello inizia con "anthropic/".
   */
  cache_esplicita?: boolean;
  /** `strict` nello schema: con true il fornitore impone lo schema (richiede additionalProperties:false e tutti i campi in required). */
  strict?: boolean;
};

type Json = Record<string, any>;

/**
 * Adattamenti che un modello ha chiesto con un rifiuto (HTTP 400/404/422) e che si ricordano per ripeterli subito
 * alla chiamata dopo. Ogni modello ha le sue regole: i modelli «pensanti» non vogliono `temperature`, alcuni
 * fornitori non sanno imporre uno schema, altri vogliono l'altro nome del tetto di token.
 */
type Correzioni = {
  senzaSchema?: boolean;
  senzaTemperatura?: boolean;
  campoMax?: "max_tokens" | "max_completion_tokens";
  /** Tetto di token alzato perché il modello aveva finito i token nel ragionamento e non aveva scritto nulla. */
  maxTokenMinimo?: number;
};

const MAX_CORREZIONI = 3;
/** Tetto alzato dopo una risposta vuota per tetto troppo basso: abbastanza per ragionare e poi rispondere, senza pagare riserve enormi. */
const MAX_TOKEN_DOPO_VUOTO = 16_000;

/** Un 400/404/422 (o un 503 «nessun fornitore adatto» di OpenRouter) è un rifiuto della richiesta, non un guasto passeggero. */
function eRifiutoDellaRichiesta(e: ErroreFornitore): boolean {
  if (e.stato === 400 || e.stato === 404 || e.stato === 422) return true;
  return e.stato === 503 && /no (available )?(endpoints?|providers?)|routing|requirements|parameters/i.test(e.message);
}

/** Istruzione al posto dello schema imposto: serve quando il fornitore non sa imporlo, per avere comunque JSON. */
function istruzioneSchema(schema: Record<string, unknown>): string {
  return `Rispondi soltanto con un oggetto JSON valido, senza testo prima o dopo e senza blocchi di codice, che rispetti questo schema JSON: ${JSON.stringify(schema)}`;
}

/**
 * Controllo minimo del JSON ricevuto senza schema imposto (tipo del livello alto, campi richiesti, tipi e valori
 * ammessi dei campi semplici). Non è un validatore completo: basta a scartare una risposta fuori forma.
 * Restituisce il motivo, o null se va bene.
 */
export function controllaSchemaMinimo(schema: Record<string, unknown>, valore: unknown): string | null {
  const tipo = schema.type;
  if (tipo === "array") return Array.isArray(valore) ? null : "non è un elenco";
  if (tipo !== "object") return null;
  if (!valore || typeof valore !== "object" || Array.isArray(valore)) return "non è un oggetto";
  const o = valore as Record<string, unknown>;
  for (const campo of Array.isArray(schema.required) ? (schema.required as string[]) : []) {
    if (!(campo in o)) return `manca il campo «${campo}»`;
  }
  const proprieta = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  for (const [campo, def] of Object.entries(proprieta)) {
    if (!(campo in o) || !def || typeof def !== "object") continue;
    const v = o[campo];
    const t = def.type;
    const giusto =
      t === "string" ? typeof v === "string" : t === "number" ? typeof v === "number" : t === "integer" ? Number.isInteger(v) : t === "boolean" ? typeof v === "boolean" : true;
    if (!giusto) return `il campo «${campo}» ha il tipo sbagliato`;
    if (Array.isArray(def.enum) && !def.enum.includes(v)) return `il campo «${campo}» ha un valore non ammesso`;
  }
  return null;
}

const sommaUso = (a: Uso, b: Uso): Uso => ({
  token_in: a.token_in + b.token_in,
  token_out: a.token_out + b.token_out,
  ...(a.token_cache_letti !== undefined || b.token_cache_letti !== undefined ? { token_cache_letti: (a.token_cache_letti ?? 0) + (b.token_cache_letti ?? 0) } : {}),
  ...(a.token_cache_scritti !== undefined || b.token_cache_scritti !== undefined ? { token_cache_scritti: (a.token_cache_scritti ?? 0) + (b.token_cache_scritti ?? 0) } : {}),
});

const numero = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * OpenAI conta in `prompt_tokens` TUTTO l'ingresso, anche la parte presa dalla cache. Il contratto `Uso` vuole invece
 * `token_in` senza i token di cache (che hanno il loro prezzo): si sottraggono, altrimenti la cache si pagherebbe due volte.
 */
export function usoDaOpenAI(u: Json | undefined): Uso {
  if (!u) return { token_in: 0, token_out: 0 };
  const prompt = numero(u.prompt_tokens) ?? 0;
  const letti = numero(u.prompt_tokens_details?.cached_tokens);
  const scritti = numero(u.prompt_tokens_details?.cache_write_tokens);
  const uso: Uso = {
    token_in: Math.max(0, prompt - (letti ?? 0) - (scritti ?? 0)),
    token_out: numero(u.completion_tokens) ?? 0,
  };
  if (letti !== undefined) uso.token_cache_letti = letti;
  if (scritti !== undefined) uso.token_cache_scritti = scritti;
  return uso;
}

function statoDaCodice(codice: unknown): number | undefined {
  return typeof codice === "number" ? codice : typeof codice === "string" && /^\d{3}$/.test(codice) ? Number(codice) : undefined;
}

export function fornitoreOpenAI(opz: OpzioniOpenAI): Fornitore {
  const fetchFn: FetchFn = opz.fetchFn ?? ((...a) => fetch(...a));
  const base = opz.url.replace(/\/+$/, "");
  const segreti = [opz.chiave];
  const campoMax = opz.campo_max_token ?? (/api\.openai\.com/.test(base) ? "max_completion_tokens" : "max_tokens");
  const eOpenRouter = /openrouter\.ai/.test(base);
  // Per modello (nome): cosa ha chiesto di cambiare. Vale finché l'istanza resta viva.
  const ricordate = new Map<string, Correzioni>();

  function traduci(messaggi: Messaggio[], cache: boolean): Json[] {
    let ultimoStabile: Json | null = null;
    const out: Json[] = [];
    for (const m of messaggi) {
      const role = m.ruolo === "sistema" ? "system" : m.ruolo === "utente" ? "user" : "assistant";
      if (typeof m.contenuto === "string") {
        out.push({ role, content: m.contenuto });
        continue;
      }
      const parti: Json[] = [];
      for (const p of m.contenuto as Parte[]) {
        if (p.tipo === "testo") {
          if (p.testo.trim() === "") continue;
          const b: Json = { type: "text", text: p.testo };
          if (p.stabile) ultimoStabile = b;
          parti.push(b);
        } else {
          // Le immagini passano come URL: se arrivano in base64 si usa un data URL, accettato da OpenAI e OpenRouter.
          const url = p.base64 ? `data:${p.mime};base64,${p.base64}` : p.url;
          if (!url) throw new ErroreFornitore({ fornitore: opz.id, messaggio: "immagine senza base64 né url", riprovabile: false });
          parti.push({ type: "image_url", image_url: { url } });
        }
      }
      if (parti.length) out.push({ role, content: parti });
    }
    if (cache && ultimoStabile) (ultimoStabile as Json).cache_control = { type: "ephemeral" };
    return out;
  }

  function corpo(r: RichiestaFornitore, flusso: boolean, corr: Correzioni): Json {
    const cache = opz.cache_esplicita ?? r.modello.nome.startsWith("anthropic/");
    const messaggi = traduci(r.messaggi, cache);
    const conSchema = !!r.schema && !corr.senzaSchema;
    // Senza schema imposto lo si chiede a parole, in testa ai messaggi, e la risposta si controlla noi.
    if (r.schema && corr.senzaSchema) messaggi.unshift({ role: "system", content: istruzioneSchema(r.schema) });
    const json: Json = { model: r.modello.nome, messages: messaggi };
    if (r.max_token !== undefined) json[corr.campoMax ?? campoMax] = Math.max(r.max_token, corr.maxTokenMinimo ?? 0);
    if (r.temperatura !== undefined && !corr.senzaTemperatura) json.temperature = r.temperatura;
    if (conSchema) {
      json.response_format = {
        type: "json_schema",
        json_schema: { name: "risposta", strict: opz.strict ?? true, schema: r.schema },
      };
      // OpenRouter, senza questa richiesta, manda la chiamata anche a fornitori che ignorano lo schema in silenzio
      // e la risposta torna in prosa. Con `require_parameters` o c'è un fornitore che lo rispetta o si riceve un
      // rifiuto chiaro, da cui si passa al ripiego senza schema.
      if (eOpenRouter) json.provider = { require_parameters: true };
    }
    if (flusso) {
      json.stream = true;
      // Senza questa opzione OpenAI non manda i token d'uso nel flusso e i costi resterebbero a zero.
      json.stream_options = { include_usage: true };
    }
    return json;
  }

  async function invia(r: RichiestaFornitore, flusso: boolean, corr: Correzioni): Promise<Response> {
    return inviaRichiesta({
      fornitore: opz.id,
      fetchFn,
      url: `${base}/chat/completions`,
      segreti,
      init: {
        method: "POST",
        headers: { authorization: `Bearer ${opz.chiave}`, "content-type": "application/json" },
        body: JSON.stringify(corpo(r, flusso, corr)),
        signal: r.segnale,
      },
    });
  }

  // Cosa cambiare nella richiesta dopo un rifiuto, o null se il rifiuto non dipende da un parametro nostro.
  function correzioneDa(e: unknown, r: RichiestaFornitore, corr: Correzioni): Correzioni | null {
    if (!(e instanceof ErroreFornitore) || !eRifiutoDellaRichiesta(e)) return null;
    const msg = e.message.toLowerCase();
    if (r.temperatura !== undefined && !corr.senzaTemperatura && /temperature/.test(msg)) return { senzaTemperatura: true };
    if (r.max_token !== undefined && /max_tokens|max_completion_tokens/.test(msg)) {
      const attuale = corr.campoMax ?? campoMax;
      const altro = attuale === "max_tokens" ? "max_completion_tokens" : "max_tokens";
      // Si cambia nome una volta sola: se rifiuta anche l'altro, il problema è un altro.
      if (corr.campoMax === undefined) return { campoMax: altro };
    }
    if (r.schema && !corr.senzaSchema) return { senzaSchema: true };
    return null;
  }

  // Invia, e se il modello rifiuta un parametro lo toglie o lo cambia e riprova (al massimo MAX_CORREZIONI volte).
  // `corr` si aggiorna sul posto; chi chiama lo ricorda se la chiamata riesce.
  async function inviaAdattando(r: RichiestaFornitore, flusso: boolean, corr: Correzioni): Promise<Response> {
    for (let giro = 0; ; giro++) {
      try {
        return await invia(r, flusso, corr);
      } catch (e) {
        const c = giro < MAX_CORREZIONI ? correzioneDa(e, r, corr) : null;
        if (!c) throw e;
        Object.assign(corr, c);
      }
    }
  }

  const correzioniDi = (r: RichiestaFornitore): Correzioni => ({ ...(ricordate.get(r.modello.nome) ?? {}) });
  const ricorda = (r: RichiestaFornitore, corr: Correzioni) => {
    if (Object.keys(corr).length) ricordate.set(r.modello.nome, corr);
  };

  // OpenRouter può rispondere 200 con un errore nel corpo, o interrompere il flusso con un errore.
  function erroreNelCorpo(j: Json): ErroreFornitore | null {
    const e = j.error;
    if (!e) return null;
    const stato = statoDaCodice(e.code);
    return new ErroreFornitore({
      fornitore: opz.id,
      messaggio: `${stato ?? "errore"}: ${typeof e === "string" ? e : (e.message ?? "sconosciuto")}${typeof e === "string" ? "" : dettaglioMetadata(e.metadata)}`,
      stato,
      riprovabile: stato === undefined ? true : riprovabileDaStato(stato),
      segreti,
    });
  }

  function concludi(r: RichiestaFornitore, testo: string, fine: string | undefined, uso: Uso, t0: number, corr: Correzioni): RispostaFornitore {
    if (fine === "content_filter") {
      throw new ErroreFornitore({ fornitore: opz.id, messaggio: "risposta bloccata dal filtro dei contenuti", riprovabile: false, segreti });
    }
    if (fine === "error") {
      throw new ErroreFornitore({ fornitore: opz.id, messaggio: "il fornitore ha interrotto la risposta con un errore", riprovabile: true, segreti });
    }
    // Contenuto vuoto: i modelli che ragionano consumano il tetto di token pensando e non scrivono nulla.
    // Non va passato come risposta buona (un riassunto vuoto non è un riassunto) e non va confuso con un JSON rotto.
    if (testo.trim() === "") {
      const finitiITokenDiRagionamento = fine === "length";
      throw new ErroreFornitore({
        fornitore: opz.id,
        messaggio: finitiITokenDiRagionamento
          ? `risposta vuota: il modello ha finito i token${r.max_token !== undefined ? ` (tetto ${Math.max(r.max_token, corr.maxTokenMinimo ?? 0)})` : ""} prima di scrivere (probabile ragionamento interno)`
          : "risposta vuota: il modello non ha scritto nulla",
        riprovabile: !finitiITokenDiRagionamento,
        segreti,
      });
    }
    const out: RispostaFornitore = { testo, uso, latenza_ms: Date.now() - t0 };
    if (r.schema) {
      let dati: unknown;
      try {
        dati = leggiJSON(testo);
      } catch {
        const motivo = fine === "length" ? "risposta troncata dal limite di token, JSON incompleto" : "la risposta non è JSON valido";
        throw new ErroreFornitore({ fornitore: opz.id, messaggio: motivo, riprovabile: false, segreti });
      }
      // Se lo schema non è stato imposto dal fornitore, la forma della risposta la controlliamo noi.
      if (corr.senzaSchema) {
        const difetto = controllaSchemaMinimo(r.schema, dati);
        if (difetto) throw new ErroreFornitore({ fornitore: opz.id, messaggio: `la risposta non rispetta lo schema richiesto (${difetto})`, riprovabile: false, segreti });
      }
      out.dati = dati;
    }
    return out;
  }

  // Una richiesta non in flusso, con gli adattamenti: gli errori arrivano sia come stato HTTP sia, su OpenRouter,
  // come corpo con stato 200, e in entrambi i casi un rifiuto per un parametro si corregge e si ripete.
  async function chiediJson(r: RichiestaFornitore, corr: Correzioni): Promise<Json> {
    for (let giro = 0; ; giro++) {
      try {
        const risposta = await invia(r, false, corr);
        let j: Json;
        try {
          j = (await risposta.json()) as Json;
        } catch {
          throw new ErroreFornitore({ fornitore: opz.id, messaggio: "la risposta del fornitore non è JSON valido", riprovabile: true, segreti });
        }
        const err = erroreNelCorpo(j);
        if (err) throw err;
        return j;
      } catch (e) {
        const c = giro < MAX_CORREZIONI ? correzioneDa(e, r, corr) : null;
        if (!c) throw e;
        Object.assign(corr, c);
      }
    }
  }

  const voce = {
    fornitore: opz.id,
    chiave: opz.chiave,
    url: base,
    fetchFn,
    max_caratteri: /api\.openai\.com/.test(base) ? 4096 : undefined,
  };

  return {
    id: opz.id,

    async genera(r) {
      const t0 = Date.now();
      const corr = correzioniDi(r);
      let usoPrima: Uso = { token_in: 0, token_out: 0 };
      for (let giroVuoto = 0; ; giroVuoto++) {
        const j = await chiediJson(r, corr);
        const scelta = j.choices?.[0];
        const msg = scelta?.message ?? {};
        if (typeof msg.refusal === "string" && msg.refusal) {
          throw new ErroreFornitore({ fornitore: opz.id, messaggio: `il modello ha rifiutato la richiesta: ${msg.refusal}`, riprovabile: false, segreti });
        }
        // Alcuni servizi compatibili restituiscono il contenuto come elenco di parti invece che come stringa.
        const testo: string = Array.isArray(msg.content)
          ? msg.content.map((p: Json) => (typeof p?.text === "string" ? p.text : "")).join("")
          : typeof msg.content === "string"
            ? msg.content
            : "";
        const uso = sommaUso(usoPrima, usoDaOpenAI(j.usage));
        // Vuoto perché sono finiti i token (ragionamento interno): una sola nuova prova con il tetto alzato.
        // Il costo della prima prova si somma, perché è stata pagata.
        if (testo.trim() === "" && scelta?.finish_reason === "length" && giroVuoto === 0 && r.max_token !== undefined && r.max_token < MAX_TOKEN_DOPO_VUOTO) {
          corr.maxTokenMinimo = Math.min(MAX_TOKEN_DOPO_VUOTO, Math.max(r.max_token * 4, 2048));
          usoPrima = uso;
          continue;
        }
        ricorda(r, corr);
        return concludi(r, testo, scelta?.finish_reason, uso, t0, corr);
      }
    },

    async *flusso(r): AsyncGenerator<PezzoFlusso> {
      const t0 = Date.now();
      const corr = correzioniDi(r);
      const risposta = await inviaAdattando(r, true, corr);
      ricorda(r, corr);
      let testo = "";
      let uso: Uso = { token_in: 0, token_out: 0 };
      let fine: string | undefined;
      let chiuso = false;

      for await (const ev of leggiSSE(risposta.body)) {
        if (ev.dati.trim() === "[DONE]") {
          chiuso = true;
          break;
        }
        let d: Json;
        try {
          d = JSON.parse(ev.dati);
        } catch {
          continue;
        }
        const err = erroreNelCorpo(d);
        if (err) throw err;
        const scelta = d.choices?.[0];
        const pezzo = scelta?.delta?.content;
        if (typeof pezzo === "string" && pezzo !== "") {
          testo += pezzo;
          yield { delta: pezzo };
        }
        if (typeof scelta?.delta?.refusal === "string" && scelta.delta.refusal) {
          throw new ErroreFornitore({ fornitore: opz.id, messaggio: `il modello ha rifiutato la richiesta: ${scelta.delta.refusal}`, riprovabile: false, segreti });
        }
        if (scelta?.finish_reason) fine = scelta.finish_reason;
        // L'uso arriva in un pezzo finale a parte (choices vuoto) grazie a include_usage.
        if (d.usage) uso = usoDaOpenAI(d.usage);
      }
      if (!chiuso && fine === undefined) {
        throw new ErroreFornitore({ fornitore: opz.id, messaggio: "flusso interrotto prima della fine", riprovabile: true, segreti });
      }
      yield { fine: concludi(r, testo, fine, uso, t0, corr) };
    },

    // OpenAI offre anche la voce con la stessa chiave: così un solo fornitore "openai" copre testo e voce.
    parla: (r) => sintetizzaFormatoOpenAI(voce, r),
  };
}
