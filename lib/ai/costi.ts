import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import type { Prezzi } from "./impostazioni";

/** Costo in USD di una chiamata Claude: token × prezzo per milione. Modello senza prezzo → 0. */
export function costoToken(prezzi: Prezzi, modello: string, tin: number, tout: number): number {
  const p = prezzi[modello];
  if (!p || typeof p === "number") return 0;
  return (tin * p.in + tout * p.out) / 1e6;
}

/** Costo in USD del TTS: caratteri × prezzo per milione di caratteri (OpenAI o, con `chiave`, KittenML; prezzo non impostato → 0). */
export function costoTts(prezzi: Prezzi, caratteri: number, chiave: "tts_per_milione_caratteri" | "tts_kitten_per_milione_caratteri" = "tts_per_milione_caratteri"): number {
  const p = prezzi[chiave];
  return typeof p === "number" ? (caratteri * p) / 1e6 : 0;
}

/** Registra l'uso in ai_usage. Non lancia mai: la risposta all'utente non dipende dal log. */
export async function registraUso(
  userId: string,
  provider: "anthropic" | "openai" | "kittenml",
  modello: string,
  funzione: "chat" | "analisi" | "voce",
  tin: number,
  tout: number,
  caratteri: number,
  costo: number,
): Promise<void> {
  try {
    const { error } = await supabaseAnon().rpc("server_log_usage", {
      p_token: process.env.MP_SERVER_TOKEN,
      p_user: userId,
      p_provider: provider,
      p_modello: modello,
      p_funzione: funzione,
      p_in: Math.round(tin),
      p_out: Math.round(tout),
      p_caratteri: Math.round(caratteri),
      p_costo: costo,
    });
    if (error) console.error("[ai] server_log_usage:", error.message);
  } catch (e) {
    console.error("[ai] registrazione uso fallita:", e instanceof Error ? e.message : "errore");
  }
}
