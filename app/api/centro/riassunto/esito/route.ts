import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { leggiImpostazioni } from "@/lib/ai/impostazioni";
import { motoreApp } from "@/lib/ai/motore";
import { SOGLIA_RISCRITTO, frazioneRiscritta } from "@/lib/ai/distanza";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
 * Esito del maestro sul riassunto, per il motore. Il client lo chiama dopo "Approva e invia":
 *  - approvato senza toccarlo  → il modello ha scritto bene: esito positivo;
 *  - riscritto per più del 40% → la bozza non andava: esito negativo (e se veniva dalla cache, la voce si toglie);
 *  - ritocchi leggeri          → nessun esito: non dicono né sì né no.
 * Si conta una volta sola per riassunto (poi l'id della chiamata si azzera), anche se il maestro riapre e riapprova.
 * Non serve il controllo del budget: non spende nulla. Non c'è nessuna chiamata AI.
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ errore: "non_autenticato" }, { status: 401 });

  let body: { lezione_id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ errore: "richiesta_non_valida" }, { status: 400 }); }
  const id = typeof body.lezione_id === "string" ? body.lezione_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ errore: "richiesta_non_valida" }, { status: 400 });

  // La lettura passa dalla sessione del maestro: se la RLS non gli fa vedere la lezione, per lui non esiste.
  const { data: lez } = await sb.from("lezioni").select("riassunto,riassunto_ok,riassunto_chiamata_id,riassunto_bozza").eq("id", id).maybeSingle();
  if (!lez || !lez.riassunto_chiamata_id || !lez.riassunto_bozza || lez.riassunto_ok !== true || typeof lez.riassunto !== "string") {
    return NextResponse.json({ registrato: false });
  }

  const quota = frazioneRiscritta(lez.riassunto_bozza, lez.riassunto);
  const ok = quota === 0 ? true : quota > SOGLIA_RISCRITTO ? false : null;
  let registrato = false;
  if (ok !== null) {
    const m = motoreApp(await leggiImpostazioni());
    if (m) {
      try {
        await m.motore.esito(lez.riassunto_chiamata_id, { ok });
        registrato = true;
      } catch (e) {
        // Un esito perso non è grave: non si insiste e non si disturba il maestro.
        console.error("[centro] esito del riassunto:", e instanceof Error ? e.message : "errore");
      }
    }
  }
  // Fatto (o non conta): l'id si azzera così lo stesso riassunto non viene contato due volte.
  await sb.from("lezioni").update({ riassunto_chiamata_id: null, riassunto_bozza: null }).eq("id", id);
  return NextResponse.json({ registrato });
}
