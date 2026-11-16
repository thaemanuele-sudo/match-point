// Copia del Motore: non modificare qui, si modifica nel repository motore
// Voce di ElevenLabs. Verificato su elevenlabs.io/docs/api-reference/text-to-speech/convert:
// POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128, intestazione xi-api-key,
// corpo { text, model_id, language_code }. La risposta è direttamente il file audio.
import type { Fornitore } from "../tipi";
import { ErroreFornitore, inviaRichiesta, type FetchFn } from "./errori";
import { contaCaratteri } from "./sse";
import { generaNonSupportato } from "./voce-openai";

const URL_ELEVENLABS = "https://api.elevenlabs.io";
const BYTE_MINIMI = 200;
// La documentazione dice che language_code non è supportato dai modelli multilingual_v2: lì non lo si manda.
const SENZA_LINGUA = /^eleven_multilingual_v2$/;

export function voceElevenLabs(opz: { chiave: string; url?: string; fetchFn?: FetchFn }): Fornitore {
  const fetchFn: FetchFn = opz.fetchFn ?? ((...a) => fetch(...a));
  const base = (opz.url ?? URL_ELEVENLABS).replace(/\/+$/, "");
  const segreti = [opz.chiave];

  return {
    id: "elevenlabs",
    genera: generaNonSupportato("elevenlabs"),
    async parla(r) {
      if (!r.voce) {
        throw new ErroreFornitore({ fornitore: "elevenlabs", messaggio: "voce non indicata (serve il voice_id)", riprovabile: false });
      }
      const corpo: Record<string, unknown> = { text: r.testo, model_id: r.modello.nome };
      if (r.lingua && !SENZA_LINGUA.test(r.modello.nome)) corpo.language_code = r.lingua.slice(0, 2).toLowerCase();
      const t0 = Date.now();
      const risposta = await inviaRichiesta({
        fornitore: "elevenlabs",
        fetchFn,
        url: `${base}/v1/text-to-speech/${encodeURIComponent(r.voce)}?output_format=mp3_44100_128`,
        segreti,
        init: {
          method: "POST",
          headers: { "xi-api-key": opz.chiave, "content-type": "application/json", accept: "audio/mpeg" },
          body: JSON.stringify(corpo),
          signal: r.segnale,
        },
      });
      const audio = new Uint8Array(await risposta.arrayBuffer());
      if (audio.byteLength < BYTE_MINIMI) {
        throw new ErroreFornitore({ fornitore: "elevenlabs", messaggio: "audio vuoto o troppo corto", riprovabile: true, segreti });
      }
      return {
        audio,
        mime: "audio/mpeg",
        uso: { token_in: 0, token_out: 0, caratteri: contaCaratteri(r.testo) },
        latenza_ms: Date.now() - t0,
      };
    },
  };
}
