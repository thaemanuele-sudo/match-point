// Copia del Motore: non modificare qui, si modifica nel repository motore
// Punto d'ingresso del motore: riesporta tutto ciò che un'app deve poter importare da "core".
// Solo riesportazioni: nessuna logica qui.

export * from "./tipi";

// Nucleo
export { creaMotore } from "./motore";
export { limiti, decadi, prossimoStato, zDaFiducia, prioreEffettivo, proveVere, tettoPermette } from "./apprendimento";
export type { RegoleStato } from "./apprendimento";
export { FASCE, MINIMO_CASI_TARATURA, fasciaDi, probabilitaTarata, sogliaAutomatica } from "./taratura";
export { secchioBase, secchioDecisore, ultimoTestoUtente, haImmagini } from "./secchi";
export { candidatiAmmessi, candidatiProva, catenaDiServizio, costoStimato, creaSospensioni, tokenUscitaStimati } from "./instradatore";

// Cache e voce
export { chiaveCache, normalizzaTesto, unica } from "./cache";
export { dividiFrasi, parlaConCache } from "./voce";

// Costi e catalogo
export { costo, stimaToken, costoAtteso } from "./costi";
export { MODELLI_BASE, creaCatalogo, modelliDaOpenRouter } from "./catalogo";

// Fornitori
export { fornitoreAnthropic } from "./fornitori/anthropic";
export { fornitoreOpenAI } from "./fornitori/openai";
export { voceKitten } from "./fornitori/voce-kitten";
export { voceOpenAI } from "./fornitori/voce-openai";
export { voceElevenLabs } from "./fornitori/voce-elevenlabs";

// Giudice e decisori
export { giudica, MASSIMO_CARATTERI_RICHIESTA, MASSIMO_CARATTERI_RISPOSTA_DECISORE, MASSIMO_CARATTERI_RISPOSTA_MODELLO } from "./giudice";
export { decisoreSage } from "./decisori/sage";
export { decisoreLLM } from "./decisori/llm";

// Archivi, depositi e scambio con il centro
export { archivioMemoria } from "./archivi/memoria";
export { archivioSupabase } from "./archivi/supabase";
export { depositoMemoria } from "./depositi/memoria";
export { depositoSupabase } from "./depositi/supabase";
export { sincronizza } from "./sincronizza";

// Banchi di prova
export { eseguiBanco } from "./banco";
export type { Banco, RigaBanco } from "./banco";
