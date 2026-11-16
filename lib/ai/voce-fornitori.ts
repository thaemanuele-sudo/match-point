import "server-only";
import type { Fornitore, RichiestaVoce, RispostaVoce } from "@/lib/motore";
import { audioKitten, vociItaliane } from "./kitten";

/*
 * Fornitori di voce di Match Point per il motore.
 * Perché non i fornitori di lib/motore: l'app ha già una voce che funziona e che i ragazzi conoscono. Qui si riusa
 * lo stesso codice (stessa API, stesse istruzioni di tono, stessa scelta della voce) e il motore ci aggiunge la cache
 * per frase. Così cambia solo che una frase già detta non si paga di nuovo.
 */

const nonGenera: Fornitore["genera"] = async () => {
  throw new Error("fornitore di sola voce");
};

const NOME_LINGUA_VOCE = { it: "italiano", en: "inglese", fr: "francese", de: "tedesco", es: "spagnolo" } as const;

// La prima voce italiana dell'elenco si cerca una volta ogni dieci minuti, non a ogni frase.
let voceDiRiserva: { chiave: string; id: string | null; quando: number } | null = null;

async function riservaKitten(chiave: string): Promise<string | null> {
  if (voceDiRiserva && voceDiRiserva.chiave === chiave && Date.now() - voceDiRiserva.quando < 600_000) return voceDiRiserva.id;
  let id: string | null = null;
  try { id = (await vociItaliane(chiave))[0]?.id ?? null; } catch { /* si prova comunque con la lingua */ }
  voceDiRiserva = { chiave, id, quando: Date.now() };
  return id;
}

export function voceKittenApp(chiave: string): Fornitore {
  return {
    id: "kittenml",
    genera: nonGenera,
    async parla(r: RichiestaVoce): Promise<RispostaVoce> {
      const t0 = Date.now();
      const voce = r.voce || (await riservaKitten(chiave));
      const buf = await audioKitten(chiave, r.testo, voce);
      return { audio: new Uint8Array(buf), mime: "audio/mpeg", uso: { token_in: 0, token_out: 0, caratteri: r.testo.length }, latenza_ms: Date.now() - t0 };
    },
  };
}

export function voceOpenAIApp(chiave: string): Fornitore {
  return {
    id: "openai",
    genera: nonGenera,
    async parla(r: RichiestaVoce): Promise<RispostaVoce> {
      const t0 = Date.now();
      const payload: Record<string, unknown> = { model: r.modello.nome, voice: r.voce, input: r.testo, response_format: "mp3" };
      // Solo gpt-4o-mini-tts accetta le istruzioni sul tono.
      if (r.modello.nome === "gpt-4o-mini-tts") {
        const l = (r.lingua ?? "it") as keyof typeof NOME_LINGUA_VOCE;
        payload.instructions = `Voce di un allenatore di tennis, calda e chiara, in ${NOME_LINGUA_VOCE[l] ?? NOME_LINGUA_VOCE.it}`;
      }
      const risposta = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: r.segnale,
      });
      // Il messaggio non contiene mai la chiave: solo lo stato.
      if (!risposta.ok) throw new Error(`OpenAI voce: risposta ${risposta.status}`);
      return { audio: new Uint8Array(await risposta.arrayBuffer()), mime: "audio/mpeg", uso: { token_in: 0, token_out: 0, caratteri: r.testo.length }, latenza_ms: Date.now() - t0 };
    },
  };
}
