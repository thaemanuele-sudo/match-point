import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { leggiImpostazioni } from "@/lib/ai/impostazioni";
import { errore } from "@/lib/ai/guardia";
import { APP, motorePannello, tokenServerCorto } from "@/lib/ai/motore";
import { sincronizza } from "@/lib/motore";

export const runtime = "nodejs";
export const maxDuration = 60;

const GIORNO = 86_400_000;

/** Solo l'admin: is_admin() gira nel database con la sessione dell'utente, non ci si fida di nulla che arrivi dal browser. */
async function controllo() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { risposta: errore(401, "non_autenticato", "Accedi per continuare.") };
  const { data: admin } = await sb.rpc("is_admin");
  if (admin !== true) return { risposta: errore(403, "non_autorizzato", "Solo l'amministratore può usare questa funzione.") };
  return { imp: await leggiImpostazioni() };
}

/**
 * GET: i numeri del motore per la scheda «Motore». Solo numeri e nomi di modelli: mai testi dei ragazzi,
 * mai chiavi (del motore centrale si dice solo se è impostata).
 */
export async function GET() {
  const c = await controllo();
  if ("risposta" in c) return c.risposta;
  const { imp } = c;
  const m = motorePannello(imp);

  const base = {
    modo: imp.motoreModo,
    // Della chiave di Sage si dice solo se c'è e da dove arriva (Vercel o database): mai il valore.
    sage: { chiave: !!imp.levantoKey, acceso: imp.sageUtenti, origine: process.env.LEVANTO_API_KEY ? "vercel" : imp.levantoKey ? "database" : null },
    // Solo sì o no: il valore del token non esce mai dal server.
    tokenCorto: tokenServerCorto(),
    centro: { url: imp.centroUrl, chiave: !!imp.centroChiave },
  };
  if (!m) return NextResponse.json({ ...base, pronto: false, motivo: "Serve la chiave Claude (Anthropic) e un modello configurato." }, { headers: { "Cache-Control": "no-store" } });

  const adesso = Date.now();
  let spesa = { vera: 0, senza_motore: 0, chiamate: 0, da_cache: 0, locali: 0, ombra: 0 };
  let erroreDati: string | null = null;
  try {
    const righe = await m.archivio.riepilogo(APP, adesso - 30 * GIORNO, adesso);
    for (const r of righe) {
      spesa.vera += r.costo_usd;
      spesa.senza_motore += r.costo_riferimento_usd;
      spesa.chiamate += r.chiamate;
      spesa.da_cache += r.da_cache;
      spesa.locali += r.locali;
      spesa.ombra += r.ombra;
    }
  } catch (e) {
    erroreDati = "Non riesco a leggere i conti del motore dal database.";
    console.error("[admin] motore riepilogo:", e instanceof Error ? e.message : "errore");
  }
  // "Servite" = chiamate arrivate a un utente: le prove in ombra e i giudizi non contano.
  const servite = Math.max(0, spesa.chiamate - spesa.ombra);

  let stati: Awaited<ReturnType<typeof m.motore.stato>> = [];
  try {
    stati = await m.motore.stato();
  } catch (e) {
    erroreDati = erroreDati ?? "Non riesco a leggere lo stato dei modelli.";
    console.error("[admin] motore stato:", e instanceof Error ? e.message : "errore");
  }

  const compiti = m.compiti.map((d) => ({
    id: d.id,
    genere: d.genere,
    versione: d.versione,
    riferimento: d.riferimento,
    candidati: d.candidati,
    secchi: stati
      .filter((s) => s.compito === d.id && s.versione === d.versione)
      .map((s) => ({
        secchio: s.secchio,
        servito: s.servito,
        bracci: s.bracci.map((b) => ({ modello: b.modello, stato: b.stato, prove: b.prove, basso: b.basso, alto: b.alto, ok: b.ok, ko: b.ko, costo_medio: b.costo_medio })),
      })),
  }));

  return NextResponse.json(
    {
      ...base,
      pronto: true,
      erroreDati,
      decisore: m.decisore,
      spesa: {
        vera: spesa.vera,
        senza_motore: spesa.senza_motore,
        risparmio: spesa.senza_motore - spesa.vera,
        chiamate: servite,
        quota_cache: servite > 0 ? (spesa.da_cache + spesa.locali) / servite : 0,
      },
      compiti,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST { azione: "sincronizza" }: manda al motore centrale i numeri dei bracci (mai testi) e ne riceve i priori. */
export async function POST(req: Request) {
  const c = await controllo();
  if ("risposta" in c) return c.risposta;
  const { imp } = c;
  let body: { azione?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  if (body.azione !== "sincronizza") return errore(400, "richiesta_non_valida", "Azione sconosciuta.");

  if (!imp.centroUrl || !imp.centroChiave) return errore(400, "centro_mancante", "Salva prima l'indirizzo e la chiave del motore centrale.");
  if (!/^https:\/\/[^\s/]+/i.test(imp.centroUrl) && !/^http:\/\/localhost(:\d+)?(\/|$)/i.test(imp.centroUrl)) {
    return errore(400, "indirizzo_non_valido", "L'indirizzo del motore centrale deve iniziare con https://.");
  }
  const m = motorePannello(imp);
  if (!m) return errore(503, "motore_non_pronto", "Il motore non è configurato.");
  try {
    const r = await sincronizza({ centro: imp.centroUrl, chiave_app: imp.centroChiave, app: APP, archivio: m.archivio, compiti: m.compiti });
    return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin] sincronizza:", e instanceof Error ? e.message : "errore");
    return errore(502, "errore_centro", e instanceof Error ? e.message.split(imp.centroChiave).join("•••") : "Il motore centrale non risponde.");
  }
}
