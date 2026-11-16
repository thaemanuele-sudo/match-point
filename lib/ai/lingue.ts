// Lingue delle risposte AI: l'app parla in cinque lingue e il coach risponde nella lingua scelta.
export type LinguaAI = "it" | "en" | "fr" | "de" | "es";
export const linguaAI = (v: unknown): LinguaAI => (v === "en" || v === "fr" || v === "de" || v === "es" ? v : "it");
/** Nome della lingua scritto in inglese, per le istruzioni ai modelli. */
export const NOME_LINGUA: Record<LinguaAI, string> = { it: "Italian", en: "English", fr: "French (France)", de: "German", es: "Spanish (Spain)" };
