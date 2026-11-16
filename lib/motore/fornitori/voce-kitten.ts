// Copia del Motore: non modificare qui, si modifica nel repository motore
// Voce di KittenML. API in formato OpenAI su https://api.kittenml.com/v1, modello kitten-tts-2-latest.
// Dall'integrazione già funzionante nelle app: le voci clonate dell'account si passano come { id } (id "voice_…"),
// quelle di serie per nome. Senza una voce precisa si usa quella di serie della lingua ("Italian", "English"…).
import type { Fornitore } from "../tipi";
import type { FetchFn } from "./errori";
import { generaNonSupportato, sintetizzaFormatoOpenAI, type DipendenzeVoce } from "./voce-openai";

const URL_KITTEN = "https://api.kittenml.com/v1";

/** Le lingue di Kitten-TTS 2 e il nome con cui le sue voci di serie le chiamano. */
const LINGUE: Record<string, string> = {
  it: "Italian", en: "English", fr: "French", de: "German", es: "Spanish",
  pt: "Portuguese", ru: "Russian", zh: "Chinese", hi: "Hindi", ar: "Arabic",
};

export function voceKitten(opz: { chiave: string; url?: string; fetchFn?: FetchFn }): Fornitore {
  const dip: DipendenzeVoce = {
    fornitore: "kittenml",
    chiave: opz.chiave,
    url: opz.url ?? URL_KITTEN,
    fetchFn: opz.fetchFn ?? ((...a) => fetch(...a)),
    voceDiRiserva: (r) => (r.lingua ? LINGUE[r.lingua.slice(0, 2).toLowerCase()] : undefined),
  };
  return { id: "kittenml", genera: generaNonSupportato("kittenml"), parla: (r) => sintetizzaFormatoOpenAI(dip, r) };
}
