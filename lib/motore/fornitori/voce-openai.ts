// Copia del Motore: non modificare qui, si modifica nel repository motore
// Voce con l'API /audio/speech nel formato OpenAI.
// Lo stesso formato lo parla anche KittenML (https://api.kittenml.com/v1), per questo la logica sta qui e
// voce-kitten.ts la riusa: cambiano solo indirizzo, nome e il modo di scegliere la voce.
// Verificato su platform.openai.com/docs/api-reference/audio/createSpeech: POST /audio/speech con
// { model, input (max 4096 caratteri), voice (nome oppure { id } per le voci clonate), response_format }.
import type { Fornitore, RichiestaVoce, RispostaVoce } from "../tipi";
import { ErroreFornitore, inviaRichiesta, type FetchFn } from "./errori";
import { contaCaratteri } from "./sse";

const URL_OPENAI = "https://api.openai.com/v1";
const MAX_CARATTERI_OPENAI = 4096;
// Un MP3 vero, anche di una sola parola, pesa ben più di così: sotto questa soglia l'audio è vuoto o guasto.
const BYTE_MINIMI = 200;

/** Le voci clonate (id "voice_…") si passano come oggetto { id }, quelle di serie per nome. */
export const campoVoce = (voce: string): string | { id: string } => (voce.startsWith("voice_") ? { id: voce } : voce);

export type DipendenzeVoce = {
  fornitore: string;
  chiave: string;
  url: string;
  fetchFn: FetchFn;
  /** Voce da usare quando la richiesta non ne indica una (Kitten: la voce di serie della lingua). */
  voceDiRiserva?: (r: RichiestaVoce) => string | undefined;
  max_caratteri?: number;
};

/** Sintetizza una frase. Restituisce MP3 come Uint8Array e i caratteri fatturati in `uso.caratteri`. */
export async function sintetizzaFormatoOpenAI(dip: DipendenzeVoce, r: RichiestaVoce): Promise<RispostaVoce> {
  const { fornitore } = dip;
  const segreti = [dip.chiave];
  const voce = r.voce || dip.voceDiRiserva?.(r);
  if (!voce) {
    throw new ErroreFornitore({ fornitore, messaggio: "voce non indicata", riprovabile: false, segreti });
  }
  const caratteri = contaCaratteri(r.testo);
  if (dip.max_caratteri && caratteri > dip.max_caratteri) {
    throw new ErroreFornitore({
      fornitore,
      messaggio: `testo troppo lungo per una sola richiesta (${caratteri} caratteri, massimo ${dip.max_caratteri}): dividerlo in frasi`,
      riprovabile: false,
      segreti,
    });
  }
  const t0 = Date.now();
  const risposta = await inviaRichiesta({
    fornitore,
    fetchFn: dip.fetchFn,
    url: `${dip.url.replace(/\/+$/, "")}/audio/speech`,
    segreti,
    init: {
      method: "POST",
      headers: { authorization: `Bearer ${dip.chiave}`, "content-type": "application/json" },
      body: JSON.stringify({ model: r.modello.nome, input: r.testo, voice: campoVoce(voce), response_format: "mp3" }),
      signal: r.segnale,
    },
  });
  const audio = new Uint8Array(await risposta.arrayBuffer());
  if (audio.byteLength < BYTE_MINIMI) {
    throw new ErroreFornitore({ fornitore, messaggio: "audio vuoto o troppo corto", riprovabile: true, segreti });
  }
  const tipo = risposta.headers.get("content-type") ?? "";
  return {
    audio,
    mime: tipo.startsWith("audio/") ? tipo.split(";")[0] : "audio/mpeg",
    uso: { token_in: 0, token_out: 0, caratteri },
    latenza_ms: Date.now() - t0,
  };
}

/** Un fornitore di sola voce non genera testo: l'errore dice cosa fare invece di fallire in modo oscuro. */
export function generaNonSupportato(fornitore: string): Fornitore["genera"] {
  return async () => {
    throw new ErroreFornitore({
      fornitore,
      messaggio: "questo fornitore sintetizza solo voce: usare parla(), non genera()",
      riprovabile: false,
    });
  };
}

export function voceOpenAI(opz: { chiave: string; url?: string; fetchFn?: FetchFn }): Fornitore {
  const dip: DipendenzeVoce = {
    fornitore: "openai",
    chiave: opz.chiave,
    url: opz.url ?? URL_OPENAI,
    fetchFn: opz.fetchFn ?? ((...a) => fetch(...a)),
    max_caratteri: MAX_CARATTERI_OPENAI,
  };
  return { id: "openai", genera: generaNonSupportato("openai"), parla: (r) => sintetizzaFormatoOpenAI(dip, r) };
}
