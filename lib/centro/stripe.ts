import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

// Stripe tramite REST con fetch, senza SDK (per non toccare package.json).
// Le chiavi stanno solo nelle variabili d'ambiente del server, mai nel codice.

// Versione dell'API fissata, così il comportamento non cambia da solo quando Stripe aggiorna quella predefinita dell'account.
const VERSIONE_API = process.env.STRIPE_API_VERSION || "2026-09-30.endive";

// Etichetta per riconoscere nella dashboard le sessioni di questa integrazione (suffisso di 8 lettere casuali, fisso per istanza).
const SUFFISSO = Array.from(randomBytes(8), (b) => "abcdefghijklmnopqrstuvwxyz"[b % 26]).join("");
export const ETICHETTA_INTEGRAZIONE = `matchpoint-quote-${SUFFISSO}`;

/**
 * La carta è attiva solo se ci sono entrambe le chiavi Stripe e la chiave service role di Supabase:
 * il webhook deve poter segnare la quota come pagata senza una sessione utente.
 */
export function stripeAttivo(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.MP_SUPABASE_SERVICE_ROLE_KEY);
}

export class StripeErrore extends Error {
  constructor(public stato: number, messaggio: string) {
    super(messaggio);
  }
}

/** POST a un endpoint Stripe (form-urlencoded, come richiede l'API). */
export async function stripePost<T>(percorso: string, parametri: Record<string, string>): Promise<T> {
  const chiave = process.env.STRIPE_SECRET_KEY;
  if (!chiave) throw new StripeErrore(503, "STRIPE_SECRET_KEY mancante");
  const res = await fetch(`https://api.stripe.com/v1/${percorso}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chiave}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": VERSIONE_API,
    },
    body: new URLSearchParams(parametri).toString(),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T;
  if (!res.ok) throw new StripeErrore(res.status, json.error?.message || "Errore di Stripe");
  return json as T;
}

/**
 * Verifica l'intestazione Stripe-Signature: HMAC SHA-256 di `${t}.${corpo}` con il segreto del webhook.
 * Il corpo deve essere il testo grezzo, non il JSON già letto, altrimenti la firma non torna.
 * La tolleranza sul tempo evita che una richiesta intercettata venga rigiocata dopo ore.
 */
export function verificaFirma(corpo: string, intestazione: string | null, segreto: string, tolleranzaSec = 300): boolean {
  if (!intestazione) return false;
  let t = "";
  const firme: string[] = [];
  for (const parte of intestazione.split(",")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    const k = parte.slice(0, i).trim();
    const v = parte.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") firme.push(v);
  }
  const ts = Number(t);
  if (!t || !Number.isFinite(ts) || !firme.length) return false;
  if (Math.abs(Date.now() / 1000 - ts) > tolleranzaSec) return false;
  const atteso = createHmac("sha256", segreto).update(`${t}.${corpo}`, "utf8").digest();
  return firme.some((f) => {
    if (!/^[0-9a-f]+$/i.test(f) || f.length !== atteso.length * 2) return false;
    return timingSafeEqual(Buffer.from(f, "hex"), atteso);
  });
}
