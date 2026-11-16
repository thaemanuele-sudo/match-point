import { NextResponse } from "next/server";
import { supabaseServer, supabaseAnon } from "@/lib/supabase/server";
import { ETICHETTA_INTEGRAZIONE, StripeErrore, stripeAttivo, stripePost } from "@/lib/centro/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (stato: number, codice: string, messaggio: string) => NextResponse.json({ errore: codice, messaggio }, { status: stato });

/** L'interfaccia chiede qui se il pagamento con carta è attivo, senza conoscere nessuna chiave. */
export async function GET() {
  return NextResponse.json({ attivo: stripeAttivo() });
}

type QuotaDb = {
  id: string; centro_id: string; allievo_id: string; corso_id: string | null;
  periodo: string; importo_cent: number; scade_il: string; stato: string;
};

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
/** Descrizione breve del periodo per la pagina di Stripe (es. "novembre 2026"). */
function descrizione(periodo: string): string {
  const base = periodo.replace(/\s·\s\dª rata$/, "");
  const rata = periodo.match(/(\d)ª rata$/);
  let d = base;
  let m = base.match(/^(\d{4})-(\d{2})$/);
  if (m) d = `${MESI[+m[2] - 1] ?? ""} ${m[1]}`;
  else if ((m = base.match(/^(\d{4})-T([1-4])$/))) d = `${m[2]}º trimestre ${m[1]}`;
  else if ((m = base.match(/^(\d{4})-(\d{4})$/))) d = `anno ${m[1]}/${m[2].slice(2)}`;
  else if ((m = base.match(/^iscrizione-(\d{4})$/))) d = `iscrizione ${m[1]}`;
  return rata ? `${d} · ${rata[1]}ª rata` : d;
}

function aggiungiGiorni(iso: string, n: number) {
  const [y, mo, g] = iso.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1, g + n));
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  // Senza chiavi la carta non esiste: l'interfaccia mostra "non ancora attivo".
  if (!stripeAttivo()) return err(503, "non_attivo", "Pagamento con carta non ancora attivo per questo centro");

  let body: { quota_id?: unknown; rate?: unknown };
  try { body = await req.json(); } catch { return err(400, "richiesta_non_valida", "Richiesta non valida."); }
  const quotaId = typeof body.quota_id === "string" ? body.quota_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(quotaId)) return err(400, "richiesta_non_valida", "Quota non valida.");
  const rate = body.rate === 2 ? 2 : 1;

  // L'utente deve essere entrato; la lettura passa dalla sua sessione, così la RLS decide se può vedere quella quota.
  const sb = await supabaseServer();
  const { data: ut } = await sb.auth.getUser();
  if (!ut.user) return err(401, "non_autenticato", "Devi accedere per pagare.");

  const { data: quota } = await sb
    .from("quote")
    .select("id,centro_id,allievo_id,corso_id,periodo,importo_cent,scade_il,stato")
    .eq("id", quotaId)
    .maybeSingle<QuotaDb>();
  if (!quota) return err(404, "non_trovata", "Quota non trovata.");
  if (quota.stato === "pagata") return err(409, "gia_pagata", "Questa quota è già stata pagata.");

  const [{ data: centro }, { data: allievo }, { data: corso }] = await Promise.all([
    sb.from("centri").select("slug,nome,nome_app,impostazioni").eq("id", quota.centro_id).maybeSingle(),
    sb.from("allievi").select("nome,cognome").eq("id", quota.allievo_id).maybeSingle(),
    quota.corso_id ? sb.from("corsi").select("rate").eq("id", quota.corso_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!centro) return err(404, "centro_non_trovato", "Centro non trovato.");

  // Il centro può spegnere la carta dalle impostazioni dei pagamenti.
  const auto = (centro.impostazioni as { pagamenti?: { auto?: { carta?: boolean; ricevute?: boolean } } } | null)?.pagamenti?.auto;
  if (auto?.carta === false) return err(403, "carta_spenta", "Pagamento con carta non ancora attivo per questo centro");

  let importo = quota.importo_cent;
  let periodo = quota.periodo;

  // Due rate: la quota si divide in due righe. La divisione la fa il server con la chiave di servizio,
  // perché la famiglia non può né modificare né creare quote. Solo se il corso lo consente e la quota non è già una rata.
  if (rate === 2) {
    const consentito = ((corso as { rate?: number | null } | null)?.rate ?? 1) >= 2;
    if (!consentito) return err(400, "rate_non_consentite", "Il centro non consente il pagamento a rate per questo corso.");
    if (!/ª rata$/.test(quota.periodo) && importo >= 200) {
      const prima = Math.ceil(importo / 2);
      const seconda = importo - prima;
      const admin = supabaseAnon();
      const { error: e1 } = await admin
        .from("quote")
        .update({ importo_cent: prima, periodo: `${quota.periodo} · 1ª rata` })
        .eq("id", quota.id)
        .eq("stato", quota.stato);
      if (e1) return err(500, "rate_errore", "Non riesco a dividere la quota in rate.");
      const { error: e2 } = await admin.from("quote").insert({
        centro_id: quota.centro_id,
        allievo_id: quota.allievo_id,
        corso_id: quota.corso_id,
        periodo: `${quota.periodo} · 2ª rata`,
        importo_cent: seconda,
        // la seconda rata scade 15 giorni dopo la quota originale
        scade_il: aggiungiGiorni(quota.scade_il, 15),
        stato: "attesa",
      });
      if (e2) {
        // ripristino: meglio una quota intera che metà quota senza la seconda parte
        await admin.from("quote").update({ importo_cent: quota.importo_cent, periodo: quota.periodo }).eq("id", quota.id);
        return err(500, "rate_errore", "Non riesco a dividere la quota in rate.");
      }
      importo = prima;
      periodo = `${quota.periodo} · 1ª rata`;
    }
  }

  // Stripe accetta importi in euro da 0,50 in su.
  if (!Number.isInteger(importo) || importo < 50) return err(400, "importo_non_valido", "Importo non valido per il pagamento con carta.");

  const origine = new URL(req.url).origin;
  const nomeCentro = (centro.nome_app as string | null) || (centro.nome as string);
  const nomeAllievo = allievo ? `${allievo.nome} ${allievo.cognome ?? ""}`.trim() : "";
  const pagina = `${origine}/c/${centro.slug}/genitore/pagamenti`;

  const parametri: Record<string, string> = {
    mode: "payment",
    // Niente payment_method_types: i metodi (carta, Apple Pay, Google Pay…) si gestiscono dalla dashboard di Stripe.
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(importo),
    "line_items[0][price_data][product_data][name]": `${nomeCentro} · ${descrizione(periodo)}`,
    "line_items[0][price_data][product_data][description]": nomeAllievo || nomeCentro,
    client_reference_id: quota.id,
    // l'identificativo della quota viaggia sia sulla sessione sia sul pagamento: il webhook lo ritrova da entrambi
    "metadata[quota_id]": quota.id,
    "metadata[centro_id]": quota.centro_id,
    "payment_intent_data[metadata][quota_id]": quota.id,
    "payment_intent_data[metadata][centro_id]": quota.centro_id,
    "payment_intent_data[description]": `${nomeCentro} · ${descrizione(periodo)}${nomeAllievo ? ` · ${nomeAllievo}` : ""}`,
    success_url: `${pagina}?pagato=1&quota=${quota.id}`,
    cancel_url: `${pagina}?annullato=1`,
    integration_identifier: ETICHETTA_INTEGRAZIONE,
  };
  // Ricevuta di Stripe per email solo se il centro ha lasciato attive le ricevute automatiche.
  if (auto?.ricevute !== false && ut.user.email) {
    parametri["payment_intent_data[receipt_email]"] = ut.user.email;
    parametri.customer_email = ut.user.email;
  }

  try {
    const sessione = await stripePost<{ id: string; url: string | null }>("checkout/sessions", parametri);
    if (!sessione.url) return err(502, "stripe_errore", "Stripe non ha restituito la pagina di pagamento.");
    return NextResponse.json({ url: sessione.url });
  } catch (e) {
    const s = e instanceof StripeErrore ? e : null;
    console.error("[pagamenti] checkout Stripe fallito:", s?.message ?? e);
    return err(502, "stripe_errore", "Non riesco ad aprire la pagina di pagamento. Riprova tra poco.");
  }
}
