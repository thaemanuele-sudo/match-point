// Copia del Motore: non modificare qui, si modifica nel repository motore
// Catalogo dei modelli e dei loro prezzi (dollari per milione di token, o di caratteri per la voce).
import type { Catalogo, ModelloInfo } from "./tipi";
import { ErroreFornitore, inviaRichiesta, type FetchFn } from "./fornitori/errori";

/**
 * Modelli di partenza. Prezzi dei Claude verificati sulla pagina ufficiale
 * https://platform.claude.com/docs/en/about-claude/pricing (17/11/2026):
 *   Opus 5.5   4 / 20    cache: scrittura 5 min 5,00    lettura 0,20
 *   Sonnet 5.5 2 / 10    cache: scrittura 5 min 2,50    lettura 0,10
 *   Haiku 5.5  0,10 / 0,50  cache: scrittura 5 min 0,125  lettura 0,01  (oltre 100.000 token di prompt 5 volte tanto: lo gestisce costi.ts)
 * Prezzi di cache = scrittura di 5 minuti, quella che `cache_control: ephemeral` produce di norma.
 * Voce: ElevenLabs da elevenlabs.io/pricing/api, OpenAI tts-1 dalla pagina del modello, Kitten dal sito (piano Pro, "da").
 */
export const MODELLI_BASE: ModelloInfo[] = [
  {
    id: "anthropic/claude-opus-5-5",
    fornitore: "anthropic",
    nome: "claude-opus-5-5",
    prezzo_in: 4,
    prezzo_out: 20,
    prezzo_cache_lettura: 0.2,
    prezzo_cache_scrittura: 5,
    immagini: true,
    schema: true,
    flusso: true,
    contesto: 1_000_000,
  },
  {
    id: "anthropic/claude-sonnet-5-5",
    fornitore: "anthropic",
    nome: "claude-sonnet-5-5",
    prezzo_in: 2,
    prezzo_out: 10,
    prezzo_cache_lettura: 0.1,
    prezzo_cache_scrittura: 2.5,
    immagini: true,
    schema: true,
    flusso: true,
    contesto: 1_000_000,
  },
  {
    id: "anthropic/claude-haiku-5-5",
    fornitore: "anthropic",
    nome: "claude-haiku-5-5",
    prezzo_in: 0.1,
    prezzo_out: 0.5,
    prezzo_cache_lettura: 0.01,
    prezzo_cache_scrittura: 0.125,
    immagini: true,
    schema: true,
    flusso: true,
    contesto: 1_000_000,
  },
  // ===== Voce =====
  {
    id: "kittenml/kitten-tts-2-latest",
    fornitore: "kittenml",
    nome: "kitten-tts-2-latest",
    prezzo_in: 0,
    prezzo_out: 0,
    prezzo_caratteri: 0.65, // "da 0,65 dollari per milione di caratteri" sul piano Pro; il piano base costa di più (circa 15)
    voce: true,
  },
  {
    // tts-1 e tts-1-hd sono annunciati in chiusura il 6/1/2027; per ora sono gli unici di OpenAI fatturati a carattere.
    id: "openai/tts-1",
    fornitore: "openai",
    nome: "tts-1",
    prezzo_in: 0,
    prezzo_out: 0,
    prezzo_caratteri: 15,
    voce: true,
  },
  {
    id: "elevenlabs/eleven_multilingual_v2",
    fornitore: "elevenlabs",
    nome: "eleven_multilingual_v2",
    prezzo_in: 0,
    prezzo_out: 0,
    prezzo_caratteri: 80, // 0,08 dollari ogni 1.000 caratteri
    voce: true,
  },
  {
    id: "elevenlabs/eleven_flash_v2_5",
    fornitore: "elevenlabs",
    nome: "eleven_flash_v2_5",
    prezzo_in: 0,
    prezzo_out: 0,
    prezzo_caratteri: 40, // 0,04 dollari ogni 1.000 caratteri
    voce: true,
  },
];

/** Catalogo in memoria. Se un id compare due volte vale l'ultimo: così un aggiornamento dei prezzi sostituisce il vecchio. */
export function creaCatalogo(modelli: ModelloInfo[]): Catalogo {
  const perId = new Map<string, ModelloInfo>();
  for (const m of modelli) perId.set(m.id, m);
  return {
    modello: (id) => perId.get(id),
    tutti: () => [...perId.values()],
  };
}

const URL_ELENCO_OPENROUTER = "https://openrouter.ai/api/v1/models";

type ModelloOpenRouter = {
  id?: unknown;
  context_length?: unknown;
  pricing?: Record<string, unknown>;
  architecture?: { input_modalities?: unknown; output_modalities?: unknown };
  supported_parameters?: unknown;
};

/** OpenRouter dà i prezzi in dollari per token, come testo. Si converte in dollari per milione, togliendo il rumore dei decimali. */
function perMilione(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return undefined; // "-1" = prezzo variabile (router): non è un prezzo
  return Number((n * 1_000_000).toPrecision(12));
}

const elenco = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Trasforma una voce dell'elenco pubblico di OpenRouter in ModelloInfo, o null se non è un modello di testo con prezzo. */
export function modelloDaVoceOpenRouter(m: ModelloOpenRouter, oggi: string): ModelloInfo | null {
  if (typeof m.id !== "string" || !m.id) return null;
  const prezzo_in = perMilione(m.pricing?.prompt);
  const prezzo_out = perMilione(m.pricing?.completion);
  if (prezzo_in === undefined || prezzo_out === undefined) return null;
  const uscite = elenco(m.architecture?.output_modalities);
  if (uscite.length > 0 && !uscite.includes("text")) return null; // generatori di sole immagini o audio
  const parametri = elenco(m.supported_parameters);
  const info: ModelloInfo = {
    id: `openrouter/${m.id}`,
    fornitore: "openrouter",
    nome: m.id,
    prezzo_in,
    prezzo_out,
    immagini: elenco(m.architecture?.input_modalities).includes("image"),
    // json_schema funziona solo dove l'elenco dichiara structured_outputs: response_format da solo ammette il solo json_object.
    schema: parametri.includes("structured_outputs"),
    flusso: true,
    aggiornato_il: oggi,
  };
  const lettura = perMilione(m.pricing?.input_cache_read);
  const scrittura = perMilione(m.pricing?.input_cache_write);
  if (lettura !== undefined) info.prezzo_cache_lettura = lettura;
  if (scrittura !== undefined) info.prezzo_cache_scrittura = scrittura;
  if (typeof m.context_length === "number") info.contesto = m.context_length;
  return info;
}

/**
 * Legge l'elenco pubblico dei modelli di OpenRouter (nessuna chiave) e lo converte.
 * Gli id diventano `openrouter/<slug>`, per esempio `openrouter/anthropic/claude-haiku-5.5`.
 */
export async function modelliDaOpenRouter(fetchFn?: FetchFn): Promise<ModelloInfo[]> {
  const f: FetchFn = fetchFn ?? ((...a) => fetch(...a));
  const risposta = await inviaRichiesta({
    fornitore: "openrouter",
    fetchFn: f,
    url: URL_ELENCO_OPENROUTER,
    init: { method: "GET", headers: { accept: "application/json" } },
    segreti: [],
  });
  const j = (await risposta.json().catch(() => null)) as { data?: unknown } | null;
  if (!j || !Array.isArray(j.data)) {
    throw new ErroreFornitore({ fornitore: "openrouter", messaggio: "elenco dei modelli non valido: manca il campo data", riprovabile: false });
  }
  const oggi = new Date().toISOString().slice(0, 10);
  const out: ModelloInfo[] = [];
  for (const voce of j.data as ModelloOpenRouter[]) {
    const m = modelloDaVoceOpenRouter(voce, oggi);
    if (m) out.push(m);
  }
  return out;
}
