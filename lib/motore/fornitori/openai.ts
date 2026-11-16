// Copia del Motore: non modificare qui, si modifica nel repository motore
// Fornitore per l'API Chat Completions di OpenAI e di tutti i servizi compatibili (OpenRouter, server locali…).
// Formati verificati su platform.openai.com/docs/api-reference/chat e openrouter.ai/docs: messaggi con parti
// text/image_url, response_format json_schema, stream_options.include_usage, usage con prompt_tokens_details.
import type { Fornitore, Messaggio, Parte, PezzoFlusso, RichiestaFornitore, RispostaFornitore, Uso } from "../tipi";
import { ErroreFornitore, inviaRichiesta, riprovabileDaStato, type FetchFn } from "./errori";
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

  function corpo(r: RichiestaFornitore, flusso: boolean): Json {
    const cache = opz.cache_esplicita ?? r.modello.nome.startsWith("anthropic/");
    const json: Json = { model: r.modello.nome, messages: traduci(r.messaggi, cache) };
    if (r.max_token !== undefined) json[campoMax] = r.max_token;
    if (r.temperatura !== undefined) json.temperature = r.temperatura;
    if (r.schema) {
      json.response_format = {
        type: "json_schema",
        json_schema: { name: "risposta", strict: opz.strict ?? true, schema: r.schema },
      };
    }
    if (flusso) {
      json.stream = true;
      // Senza questa opzione OpenAI non manda i token d'uso nel flusso e i costi resterebbero a zero.
      json.stream_options = { include_usage: true };
    }
    return json;
  }

  async function invia(r: RichiestaFornitore, flusso: boolean): Promise<Response> {
    return inviaRichiesta({
      fornitore: opz.id,
      fetchFn,
      url: `${base}/chat/completions`,
      segreti,
      init: {
        method: "POST",
        headers: { authorization: `Bearer ${opz.chiave}`, "content-type": "application/json" },
        body: JSON.stringify(corpo(r, flusso)),
        signal: r.segnale,
      },
    });
  }

  // OpenRouter può rispondere 200 con un errore nel corpo, o interrompere il flusso con un errore.
  function erroreNelCorpo(j: Json): ErroreFornitore | null {
    const e = j.error;
    if (!e) return null;
    const stato = statoDaCodice(e.code);
    return new ErroreFornitore({
      fornitore: opz.id,
      messaggio: `${stato ?? "errore"}: ${typeof e === "string" ? e : (e.message ?? "sconosciuto")}`,
      stato,
      riprovabile: stato === undefined ? true : riprovabileDaStato(stato),
      segreti,
    });
  }

  function concludi(r: RichiestaFornitore, testo: string, fine: string | undefined, uso: Uso, t0: number): RispostaFornitore {
    if (fine === "content_filter") {
      throw new ErroreFornitore({ fornitore: opz.id, messaggio: "risposta bloccata dal filtro dei contenuti", riprovabile: false, segreti });
    }
    if (fine === "error") {
      throw new ErroreFornitore({ fornitore: opz.id, messaggio: "il fornitore ha interrotto la risposta con un errore", riprovabile: true, segreti });
    }
    const out: RispostaFornitore = { testo, uso, latenza_ms: Date.now() - t0 };
    if (r.schema) {
      try {
        out.dati = leggiJSON(testo);
      } catch {
        const motivo = fine === "length" ? "risposta troncata dal limite di token, JSON incompleto" : "la risposta non è JSON valido";
        throw new ErroreFornitore({ fornitore: opz.id, messaggio: motivo, riprovabile: false, segreti });
      }
    }
    return out;
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
      const j = (await (await invia(r, false)).json()) as Json;
      const err = erroreNelCorpo(j);
      if (err) throw err;
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
      return concludi(r, testo, scelta?.finish_reason, usoDaOpenAI(j.usage), t0);
    },

    async *flusso(r): AsyncGenerator<PezzoFlusso> {
      const t0 = Date.now();
      const risposta = await invia(r, true);
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
      yield { fine: concludi(r, testo, fine, uso, t0) };
    },

    // OpenAI offre anche la voce con la stessa chiave: così un solo fornitore "openai" copre testo e voce.
    parla: (r) => sintetizzaFormatoOpenAI(voce, r),
  };
}
