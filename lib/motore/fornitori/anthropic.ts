// Copia del Motore: non modificare qui, si modifica nel repository motore
// Fornitore Anthropic (Messages API). Formati verificati su platform.claude.com/docs (vedi rapporto):
// POST /v1/messages, intestazioni x-api-key e anthropic-version, `system` a parte, blocchi image base64/url,
// `cache_control` sui blocchi, risposta strutturata con `output_config.format`, flusso SSE con message_start,
// content_block_delta, message_delta (token cumulativi), message_stop ed eventi `error`.
import type { Fornitore, Messaggio, Parte, PezzoFlusso, RichiestaFornitore, RispostaFornitore, Uso } from "../tipi";
import { ErroreFornitore, inviaRichiesta, riprovabileDaStato, statoDaTipoAnthropic, type FetchFn } from "./errori";
import { leggiJSON, leggiSSE } from "./sse";

const URL_BASE = "https://api.anthropic.com";
// Dalla versione 2026-10-21 temperature/top_p/top_k danno errore 400 su ogni modello. Per questo il motore,
// che ha comunque `temperatura` nel contratto, la invia solo se si sceglie esplicitamente una versione precedente.
const VERSIONE_PREDEFINITA = "2026-10-21";
// max_tokens è obbligatorio per Anthropic. Un valore prudente evita risposte tagliate senza far pagare riserve enormi.
const MAX_TOKEN_PREDEFINITO = 4096;
const STRUMENTO = "risposta";

type Blocco = Record<string, unknown>;
type MessaggioApi = { role: "user" | "assistant"; content: string | Blocco[] };

export type OpzioniAnthropic = {
  chiave: string;
  url?: string;
  fetchFn?: FetchFn;
  /** Valore di `anthropic-version`. Con una versione precedente a 2026-10-21 si invia anche la temperatura. */
  versione_api?: string;
};

// Parole chiave dello schema che la risposta strutturata di Anthropic non accetta (decodifica vincolata):
// limiti numerici, lunghezze di stringhe e di elenchi. La documentazione le elenca tra le funzioni non
// supportate e l'SDK ufficiale le toglie prima di inviare; inviandole a mano si rischia un 400 che
// manda a vuoto ogni chiamata (nel banco «Riassunto» il giudice usava `minimum`/`maximum`).
const VINCOLI_NON_SUPPORTATI = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "maxItems"] as const;

/**
 * Copia dello schema senza i vincoli non supportati: si spostano nella descrizione del campo, così il modello
 * li legge comunque, e il rispetto vero resta a chi riceve la risposta (il motore limita e controlla da sé).
 * `minItems` si lascia se è 0 o 1, gli unici valori ammessi.
 */
export function semplificaSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(semplificaSchema);
  if (!schema || typeof schema !== "object") return schema;
  const fuori: Record<string, unknown> = {};
  const spostati: string[] = [];
  for (const [chiave, valore] of Object.entries(schema as Record<string, unknown>)) {
    if ((VINCOLI_NON_SUPPORTATI as readonly string[]).includes(chiave) && typeof valore !== "object") {
      spostati.push(`${chiave}: ${String(valore)}`);
    } else if (chiave === "minItems" && typeof valore === "number" && valore > 1) {
      spostati.push(`minItems: ${valore}`);
    } else if (chiave === "properties" && valore && typeof valore === "object" && !Array.isArray(valore)) {
      // I nomi dei campi non sono parole chiave: si scende dentro ogni campo, non si guarda la chiave.
      fuori[chiave] = Object.fromEntries(Object.entries(valore as Record<string, unknown>).map(([k, v]) => [k, semplificaSchema(v)]));
    } else {
      fuori[chiave] = semplificaSchema(valore);
    }
  }
  if (spostati.length) {
    const nota = `(${spostati.join(", ")})`;
    fuori.description = typeof fuori.description === "string" && fuori.description ? `${fuori.description} ${nota}` : nota;
  }
  return fuori;
}

function bloccoDaParte(p: Parte): Blocco | null {
  if (p.tipo === "testo") {
    // Anthropic rifiuta i blocchi di testo vuoti: meglio ometterli che far fallire la richiesta.
    return p.testo.trim() === "" ? null : { type: "text", text: p.testo };
  }
  if (p.base64) return { type: "image", source: { type: "base64", media_type: p.mime, data: p.base64 } };
  if (p.url) return { type: "image", source: { type: "url", url: p.url } };
  throw new ErroreFornitore({ fornitore: "anthropic", messaggio: "immagine senza base64 né url", riprovabile: false });
}

/**
 * Traduce i messaggi del motore. I messaggi "sistema" diventano il parametro `system`.
 * La cache di Anthropic copre tutto il prefisso fino al blocco marcato (strumenti, sistema, messaggi nell'ordine):
 * basta quindi un solo `cache_control`, sull'ultima parte stabile, e vale per tutto ciò che la precede.
 */
export function traduciMessaggi(messaggi: Messaggio[]): { system?: Blocco[]; messages: MessaggioApi[] } {
  const system: Blocco[] = [];
  const messages: MessaggioApi[] = [];
  let ultimoStabile: Blocco | null = null;

  for (const m of messaggi) {
    if (typeof m.contenuto === "string") {
      if (m.ruolo === "sistema") {
        if (m.contenuto.trim() !== "") system.push({ type: "text", text: m.contenuto });
      } else if (m.contenuto.trim() !== "") {
        messages.push({ role: m.ruolo === "utente" ? "user" : "assistant", content: m.contenuto });
      }
      continue;
    }
    const blocchi: Blocco[] = [];
    for (const parte of m.contenuto) {
      const b = bloccoDaParte(parte);
      if (!b) continue;
      if (m.ruolo === "sistema" && b.type === "image") {
        throw new ErroreFornitore({ fornitore: "anthropic", messaggio: "le immagini non sono ammesse nel messaggio di sistema", riprovabile: false });
      }
      if (parte.tipo === "testo" && parte.stabile) ultimoStabile = b;
      blocchi.push(b);
    }
    if (blocchi.length === 0) continue;
    if (m.ruolo === "sistema") system.push(...blocchi);
    else messages.push({ role: m.ruolo === "utente" ? "user" : "assistant", content: blocchi });
  }
  if (ultimoStabile) ultimoStabile.cache_control = { type: "ephemeral" };
  return { system: system.length ? system : undefined, messages };
}

const numero = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/**
 * In Anthropic `input_tokens` conta solo i token NON presi dalla cache: l'ingresso totale è
 * input_tokens + cache_read_input_tokens + cache_creation_input_tokens. Il contratto `Uso` ha la stessa convenzione,
 * così costo() applica a ogni gruppo il suo prezzo senza contare due volte.
 */
export function usoDaAnthropic(u: Record<string, unknown> | undefined, base?: Uso): Uso {
  const uso: Uso = { token_in: base?.token_in ?? 0, token_out: base?.token_out ?? 0 };
  if (base?.token_cache_letti !== undefined) uso.token_cache_letti = base.token_cache_letti;
  if (base?.token_cache_scritti !== undefined) uso.token_cache_scritti = base.token_cache_scritti;
  if (!u) return uso;
  // I campi presenti sovrascrivono: nel flusso i conteggi di message_delta sono cumulativi.
  const i = numero(u.input_tokens);
  const o = numero(u.output_tokens);
  const l = numero(u.cache_read_input_tokens);
  const s = numero(u.cache_creation_input_tokens);
  if (i !== undefined) uso.token_in = i;
  if (o !== undefined) uso.token_out = o;
  if (l !== undefined) uso.token_cache_letti = l;
  if (s !== undefined) uso.token_cache_scritti = s;
  return uso;
}

export function fornitoreAnthropic(opz: OpzioniAnthropic): Fornitore {
  const fetchFn: FetchFn = opz.fetchFn ?? ((...a) => fetch(...a));
  const base = (opz.url ?? URL_BASE).replace(/\/+$/, "");
  const versione = opz.versione_api ?? VERSIONE_PREDEFINITA;
  const segreti = [opz.chiave];

  function corpo(r: RichiestaFornitore, flusso: boolean): { json: Record<string, unknown>; conStrumento: boolean } {
    const { system, messages } = traduciMessaggi(r.messaggi);
    if (messages.length === 0) {
      throw new ErroreFornitore({ fornitore: "anthropic", messaggio: "nessun messaggio da inviare", riprovabile: false });
    }
    const json: Record<string, unknown> = {
      model: r.modello.nome,
      max_tokens: r.max_token ?? MAX_TOKEN_PREDEFINITO,
      messages,
    };
    if (system) json.system = system;
    if (flusso) json.stream = true;
    if (r.temperatura !== undefined && versione < "2026-10-21") json.temperature = r.temperatura;
    // Risposta strutturata: di norma `output_config.format` (decodifica vincolata, JSON sempre valido).
    // Per un modello del catalogo che non la offre (`schema: false`) si ripiega su uno strumento forzato.
    const conStrumento = !!r.schema && r.modello.schema === false;
    if (r.schema && !conStrumento) {
      json.output_config = { format: { type: "json_schema", schema: semplificaSchema(r.schema) } };
    }
    if (r.schema && conStrumento) {
      json.tools = [{ name: STRUMENTO, description: "Restituisce la risposta nel formato richiesto.", input_schema: r.schema }];
      json.tool_choice = { type: "tool", name: STRUMENTO };
    }
    return { json, conStrumento };
  }

  async function invia(r: RichiestaFornitore, flusso: boolean): Promise<{ risposta: Response; conStrumento: boolean }> {
    const { json, conStrumento } = corpo(r, flusso);
    const risposta = await inviaRichiesta({
      fornitore: "anthropic",
      fetchFn,
      url: `${base}/v1/messages`,
      segreti,
      init: {
        method: "POST",
        headers: { "x-api-key": opz.chiave, "anthropic-version": versione, "content-type": "application/json" },
        body: JSON.stringify(json),
        signal: r.segnale,
      },
    });
    return { risposta, conStrumento };
  }

  // Chiude la risposta: controlla il rifiuto, ricava `dati` quando c'è lo schema.
  function concludi(r: RichiestaFornitore, testo: string, stop: string | undefined, uso: Uso, t0: number): RispostaFornitore {
    if (stop === "refusal") {
      throw new ErroreFornitore({ fornitore: "anthropic", messaggio: "il modello ha rifiutato la richiesta (stop_reason: refusal)", riprovabile: false, segreti });
    }
    const out: RispostaFornitore = { testo, uso, latenza_ms: Date.now() - t0 };
    if (r.schema) {
      try {
        out.dati = leggiJSON(testo);
      } catch {
        const motivo = stop === "max_tokens" ? "risposta troncata da max_tokens, JSON incompleto" : "la risposta non è JSON valido";
        throw new ErroreFornitore({ fornitore: "anthropic", messaggio: motivo, riprovabile: false, segreti });
      }
    }
    return out;
  }

  return {
    id: "anthropic",

    async genera(r) {
      const t0 = Date.now();
      const { risposta, conStrumento } = await invia(r, false);
      const j = (await risposta.json()) as { content?: Blocco[]; stop_reason?: string; usage?: Record<string, unknown> };
      const blocchi = j.content ?? [];
      let testo: string;
      if (conStrumento) {
        const uso_ = blocchi.find((b) => b.type === "tool_use");
        testo = uso_ ? JSON.stringify(uso_.input) : "";
      } else {
        testo = blocchi.filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join("");
      }
      return concludi(r, testo, j.stop_reason, usoDaAnthropic(j.usage), t0);
    },

    async *flusso(r): AsyncGenerator<PezzoFlusso> {
      const t0 = Date.now();
      const { risposta } = await invia(r, true);
      let testo = "";
      let uso: Uso = { token_in: 0, token_out: 0 };
      let stop: string | undefined;
      let finito = false;

      for await (const ev of leggiSSE(risposta.body)) {
        let d: Record<string, any>;
        try {
          d = JSON.parse(ev.dati);
        } catch {
          continue; // evento non JSON (es. un ping anomalo): si ignora
        }
        switch (d.type) {
          case "message_start":
            uso = usoDaAnthropic(d.message?.usage, uso);
            break;
          case "content_block_delta": {
            const delta = d.delta ?? {};
            // text_delta per il testo; input_json_delta per lo strumento forzato (JSON a pezzi).
            const pezzo = delta.type === "text_delta" ? delta.text : delta.type === "input_json_delta" ? delta.partial_json : undefined;
            if (typeof pezzo === "string" && pezzo !== "") {
              testo += pezzo;
              yield { delta: pezzo };
            }
            break;
          }
          case "message_delta":
            uso = usoDaAnthropic(d.usage, uso);
            if (d.delta?.stop_reason) stop = d.delta.stop_reason;
            break;
          case "message_stop":
            finito = true;
            break;
          case "error": {
            const tipo: string | undefined = d.error?.type;
            const stato = statoDaTipoAnthropic(tipo);
            throw new ErroreFornitore({
              fornitore: "anthropic",
              messaggio: `errore nel flusso${tipo ? ` (${tipo})` : ""}: ${d.error?.message ?? "sconosciuto"}`,
              stato,
              riprovabile: riprovabileDaStato(stato),
              segreti,
            });
          }
          default:
            break; // ping, content_block_start/stop e tipi futuri: si ignorano
        }
      }
      if (!finito) {
        throw new ErroreFornitore({ fornitore: "anthropic", messaggio: "flusso interrotto prima della fine", riprovabile: true, segreti });
      }
      yield { fine: concludi(r, testo, stop, uso, t0) };
    },
  };
}
