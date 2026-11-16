import "server-only";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { leggiImpostazioni } from "@/lib/ai/impostazioni";
import { audioKitten, vociItaliane } from "@/lib/ai/kitten";
import { errore } from "@/lib/ai/guardia";

export const runtime = "nodejs";
export const maxDuration = 60;

// Frase fissa dell'anteprima: l'admin non sceglie il testo, così la chiamata costa sempre pochi caratteri.
const FRASE_ANTEPRIMA = "Ciao, sono il tuo coach. Oggi lavoriamo sul dritto: gomito alto e chiudi il movimento.";

/** Solo l'admin: is_admin() gira nel database con la sessione dell'utente, non ci si fida di nulla che arrivi dal browser. */
async function controllo() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { risposta: errore(401, "non_autenticato", "Accedi per continuare.") };
  const { data: admin } = await sb.rpc("is_admin");
  if (admin !== true) return { risposta: errore(403, "non_autorizzato", "Solo l'amministratore può usare questa funzione.") };
  const imp = await leggiImpostazioni();
  if (!imp.kittenKey) return { risposta: errore(503, "chiave_mancante", "Salva prima la chiave API KittenML.") };
  return { chiave: imp.kittenKey, imp };
}

/** GET: elenco delle voci italiane di KittenML (comprese le clonate) e la voce attualmente scelta. */
export async function GET() {
  const c = await controllo();
  if ("risposta" in c) return c.risposta;
  try {
    const voci = await vociItaliane(c.chiave);
    return NextResponse.json({ voci, scelta: c.imp.kittenVoceId }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin] voci kitten:", e instanceof Error ? e.message : "errore");
    return errore(502, "errore_kitten", e instanceof Error ? e.message : "KittenML non risponde.");
  }
}

/** POST { voce_id }: audio mp3 di anteprima con quella voce. */
export async function POST(req: Request) {
  const c = await controllo();
  if ("risposta" in c) return c.risposta;
  let body: { voce_id?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  const voce = typeof body.voce_id === "string" ? body.voce_id.trim() : "";
  if (!voce || voce.length > 200) return errore(400, "richiesta_non_valida", "Voce mancante.");
  try {
    const audio = await audioKitten(c.chiave, FRASE_ANTEPRIMA, voce);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[admin] anteprima kitten:", e instanceof Error ? e.message : "errore");
    return errore(502, "errore_kitten", e instanceof Error ? e.message : "Anteprima non disponibile.");
  }
}
