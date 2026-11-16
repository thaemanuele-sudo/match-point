import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";

export type Prezzi = Record<string, { in: number; out: number } | number>;

export type Impostazioni = {
  anthropicKey: string | null;
  openaiKey: string | null;
  modelloChat: string;
  modelloAnalisi: string;
  modelloTts: string;
  voceTts: string;
  prezzi: Prezzi;
  budgetMensile: number; // USD per utente, 0 = illimitato
};

const DEFAULT: Impostazioni = {
  anthropicKey: null,
  openaiKey: null,
  modelloChat: "claude-sonnet-5-5",
  modelloAnalisi: "claude-sonnet-5-5",
  modelloTts: "gpt-4o-mini-tts",
  voceTts: "alloy",
  prezzi: {},
  budgetMensile: 0,
};

// Cache in memoria di 60 s: evita una chiamata al database a ogni richiesta.
let cache: { quando: number; valori: Impostazioni } | null = null;

/** Normalizza il risultato della rpc (oggetto, array di {key,value} o stringa JSON) in una mappa chiave→valore. */
function aMappa(dati: unknown): Record<string, string> {
  let d = dati;
  if (typeof d === "string") {
    try { d = JSON.parse(d); } catch { return {}; }
  }
  const out: Record<string, string> = {};
  if (Array.isArray(d)) {
    for (const r of d) {
      if (r && typeof r === "object" && "key" in r) out[String((r as { key: unknown }).key)] = String((r as { value?: unknown }).value ?? "");
    }
  } else if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
      out[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  return out;
}

export async function leggiImpostazioni(): Promise<Impostazioni> {
  const ora = Date.now();
  if (cache && ora - cache.quando < 60_000) return cache.valori;

  let m: Record<string, string> = {};
  try {
    const { data, error } = await supabaseAnon().rpc("server_get_settings", { p_token: process.env.MP_SERVER_TOKEN });
    if (error) console.error("[ai] server_get_settings:", error.message);
    else m = aMappa(data);
  } catch (e) {
    console.error("[ai] impostazioni non leggibili:", e instanceof Error ? e.message : "errore");
  }

  let prezzi: Prezzi = {};
  try { if (m.prezzi) prezzi = JSON.parse(m.prezzi); } catch { /* prezzi non validi: costo 0 */ }
  const budget = Number(m.budget_mensile_utente_usd);

  // Le variabili d'ambiente vincono sulle chiavi salvate dall'admin.
  const valori: Impostazioni = {
    anthropicKey: process.env.ANTHROPIC_API_KEY || m.anthropic_api_key || null,
    openaiKey: process.env.OPENAI_API_KEY || m.openai_api_key || null,
    modelloChat: m.anthropic_model_chat || DEFAULT.modelloChat,
    modelloAnalisi: m.anthropic_model_analisi || DEFAULT.modelloAnalisi,
    modelloTts: m.openai_tts_model || DEFAULT.modelloTts,
    voceTts: m.openai_tts_voice || DEFAULT.voceTts,
    prezzi,
    budgetMensile: Number.isFinite(budget) && budget > 0 ? budget : 0,
  };
  cache = { quando: ora, valori };
  return valori;
}
