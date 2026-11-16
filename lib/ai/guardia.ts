import "server-only";
import { NextResponse } from "next/server";
import { supabaseAnon, supabaseServer } from "@/lib/supabase/server";
import { leggiImpostazioni, type Impostazioni } from "./impostazioni";

/** Risposta di errore JSON coerente: { errore: codice, messaggio }. */
export function errore(stato: number, codice: string, messaggio: string) {
  return NextResponse.json({ errore: codice, messaggio }, { status: stato });
}

// Limite di frequenza semplice in memoria (per istanza): finestra di 60 s.
const FINESTRA_MS = 60_000;
const MAX_RICHIESTE = 20;
const chiamate = new Map<string, number[]>();

function frequenzaOk(userId: string): boolean {
  const ora = Date.now();
  const lista = (chiamate.get(userId) ?? []).filter((t) => ora - t < FINESTRA_MS);
  if (lista.length >= MAX_RICHIESTE) {
    chiamate.set(userId, lista);
    return false;
  }
  lista.push(ora);
  chiamate.set(userId, lista);
  if (chiamate.size > 5000) {
    for (const [k, v] of chiamate) if (!v.some((t) => ora - t < FINESTRA_MS)) chiamate.delete(k);
  }
  return true;
}

export type Contesto = {
  userId: string;
  sb: Awaited<ReturnType<typeof supabaseServer>>;
  imp: Impostazioni;
};

/** Verifica utente collegato, frequenza e budget mensile. Restituisce il contesto oppure la risposta d'errore. */
export async function guardia(): Promise<{ ok: true; ctx: Contesto } | { ok: false; risposta: NextResponse }> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false, risposta: errore(401, "non_autenticato", "Accedi per usare il Coach AI.") };

  if (!frequenzaOk(user.id)) {
    return { ok: false, risposta: errore(429, "troppe_richieste", "Troppe richieste: riprova tra un minuto.") };
  }

  const imp = await leggiImpostazioni();
  if (imp.budgetMensile > 0) {
    try {
      const { data: costo, error } = await supabaseAnon().rpc("server_user_month_cost", {
        p_token: process.env.MP_SERVER_TOKEN,
        p_user: user.id,
      });
      if (error) console.error("[ai] server_user_month_cost:", error.message);
      else if (Number(costo) >= imp.budgetMensile) {
        return { ok: false, risposta: errore(402, "budget_superato", "Hai raggiunto il limite mensile di utilizzo AI.") };
      }
    } catch (e) {
      console.error("[ai] controllo budget fallito:", e instanceof Error ? e.message : "errore");
    }
  }
  return { ok: true, ctx: { userId: user.id, sb, imp } };
}
