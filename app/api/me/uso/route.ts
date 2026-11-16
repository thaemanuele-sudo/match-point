import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Costo AI dell'utente collegato: oggi, ultimi 7 giorni, mese in corso (RLS: legge solo le proprie righe). */
export async function GET() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ errore: "non_autenticato", messaggio: "Accedi per vedere i consumi." }, { status: 401 });

  const ora = new Date();
  const inizioOggi = new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth(), ora.getUTCDate()));
  const sette = new Date(inizioOggi.getTime() - 6 * 86400_000);
  const inizioMese = new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth(), 1));
  const da = new Date(Math.min(sette.getTime(), inizioMese.getTime()));

  const { data, error } = await sb.from("ai_usage").select("costo_usd,creato_il").eq("user_id", u.user.id).gte("creato_il", da.toISOString());
  if (error) {
    console.error("[uso]", error.message);
    return NextResponse.json({ errore: "errore_db", messaggio: "Consumi non disponibili." }, { status: 500 });
  }
  let oggi = 0, settimana = 0, mese = 0;
  for (const r of data ?? []) {
    const t = new Date(r.creato_il).getTime();
    const c = Number(r.costo_usd) || 0;
    if (t >= inizioOggi.getTime()) oggi += c;
    if (t >= sette.getTime()) settimana += c;
    if (t >= inizioMese.getTime()) mese += c;
  }
  return NextResponse.json({ oggi, settimana, mese });
}
