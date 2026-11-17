import { NextResponse } from "next/server";
import { guardia } from "@/lib/ai/guardia";
import { ID_RIASSUNTO } from "@/lib/ai/compiti";
import { APP, motoreApp } from "@/lib/ai/motore";
import { SOGLIA_RISCRITTO, frazioneRiscritta } from "@/lib/ai/distanza";

export const runtime = "nodejs";
export const maxDuration = 30;

/*
 * Esito del maestro sul riassunto, per il motore. Il client lo chiama dopo "Approva e invia":
 *  - approvato senza toccarlo  → il modello ha scritto bene: esito positivo;
 *  - riscritto per più del 40% → la bozza non andava: esito negativo (e se veniva dalla cache, la voce si toglie);
 *  - ritocchi leggeri          → nessun esito: non dicono né sì né no.
 * Si conta una volta sola per riassunto (poi l'id della chiamata si azzera), anche se il maestro riapre e riapprova.
 * Non spende nulla e non c'è nessuna chiamata AI, ma passa lo stesso dalla `guardia` (accesso e limite di richieste):
 * un esito pesa sulla scelta del modello per tutti i centri, quindi non si può richiamare a raffica.
 * L'id della chiamata e la bozza stanno in colonne che il maestro può riscrivere: di quei valori non ci si fida.
 * Prima dell'esito si legge la chiamata dall'archivio del motore e si controlla che sia davvero di questo maestro
 * e del riassunto; altrimenti la risposta è la stessa del caso "non c'è niente da contare" e nessun esito parte.
 */
export async function POST(req: Request) {
  const g = await guardia();
  if (!g.ok) return g.risposta;
  const { userId, sb, imp } = g.ctx;

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
    const m = motoreApp(imp);
    if (m) {
      try {
        // La chiamata vera sta nell'archivio del motore, non nella riga della lezione che il maestro può modificare.
        const chiamata = await m.archivio.leggiChiamata(lez.riassunto_chiamata_id);
        if (!chiamata || chiamata.utente !== userId || chiamata.compito !== ID_RIASSUNTO || chiamata.app !== APP || chiamata.ombra) {
          return NextResponse.json({ registrato: false });
        }
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
