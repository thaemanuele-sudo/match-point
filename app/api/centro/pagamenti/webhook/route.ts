import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase/server";
import { stripeAttivo, verificaFirma } from "@/lib/centro/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sessione = {
  id: string;
  payment_status?: string;
  payment_intent?: string | null;
  amount_total?: number | null;
  client_reference_id?: string | null;
  metadata?: { quota_id?: string } | null;
};
type Evento = { id: string; type: string; data?: { object?: Sessione } };

/**
 * Webhook di Stripe: l'unico punto in cui una quota diventa "pagata" con la carta.
 * Non ci si fida mai della pagina di ritorno: l'utente potrebbe aprirla senza aver pagato.
 */
export async function POST(req: Request) {
  const segreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeAttivo() || !segreto) {
    return NextResponse.json({ errore: "non_attivo" }, { status: 503 });
  }

  // Serve il testo grezzo: la firma si calcola su quello, non sul JSON riletto.
  const corpo = await req.text();
  if (!verificaFirma(corpo, req.headers.get("stripe-signature"), segreto)) {
    return NextResponse.json({ errore: "firma_non_valida" }, { status: 400 });
  }

  let evento: Evento;
  try { evento = JSON.parse(corpo) as Evento; } catch { return NextResponse.json({ errore: "json_non_valido" }, { status: 400 }); }

  // Si segna pagata sia al completamento sia dopo i pagamenti asincroni (es. bonifici), ma solo se Stripe dice "paid".
  const tipiPagati = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
  if (!tipiPagati.includes(evento.type)) return NextResponse.json({ ricevuto: true });

  const s = evento.data?.object;
  if (!s || s.payment_status !== "paid") return NextResponse.json({ ricevuto: true });
  const quotaId = s.metadata?.quota_id || s.client_reference_id;
  if (!quotaId || !/^[0-9a-f-]{36}$/i.test(quotaId)) return NextResponse.json({ ricevuto: true });

  // Chiave di servizio: nessuna sessione utente in un webhook. Il filtro su stato evita di segnare due volte.
  const sb = supabaseAnon();
  const { data: quota, error: eLettura } = await sb.from("quote").select("id,importo_cent,stato").eq("id", quotaId).maybeSingle();
  if (eLettura) {
    console.error("[pagamenti] webhook, lettura quota:", eLettura.message);
    return NextResponse.json({ errore: "db" }, { status: 500 }); // Stripe riprova
  }
  if (!quota || quota.stato === "pagata") return NextResponse.json({ ricevuto: true });

  // Se l'importo pagato è inferiore a quello dovuto non si segna pagata: lo vedrà la segreteria.
  if (typeof s.amount_total === "number" && s.amount_total < quota.importo_cent) {
    console.error("[pagamenti] webhook, importo inferiore al dovuto per la quota", quotaId);
    return NextResponse.json({ ricevuto: true });
  }

  const { error } = await sb
    .from("quote")
    .update({
      stato: "pagata",
      pagata_il: new Date().toISOString().slice(0, 10),
      metodo: "carta",
      stripe_id: s.payment_intent || s.id,
    })
    .eq("id", quotaId)
    .neq("stato", "pagata");
  if (error) {
    console.error("[pagamenti] webhook, aggiornamento quota:", error.message);
    return NextResponse.json({ errore: "db" }, { status: 500 });
  }
  return NextResponse.json({ ricevuto: true });
}
