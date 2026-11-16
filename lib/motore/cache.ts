// Copia del Motore: non modificare qui, si modifica nel repository motore
// Cache del motore: chiavi stabili, normalizzazione del testo e richieste in corso condivise.
// Solo TypeScript e Web Crypto: questo file viene copiato in app diverse e deve girare ovunque.

import type { Messaggio, Parte } from "./tipi";

// ===== JSON canonico =====

// Il JSON canonico serve perché la stessa richiesta dia sempre la stessa chiave: JSON.stringify
// rispetta l'ordine di inserimento delle chiavi, che cambia da un punto del codice all'altro.
function canonico(valore: unknown): string | undefined {
  if (valore === undefined || typeof valore === "function" || typeof valore === "symbol") return undefined;
  if (valore === null) return "null";
  switch (typeof valore) {
    case "number":
      // Come JSON.stringify: NaN e infiniti non esistono in JSON e diventano null.
      return Number.isFinite(valore) ? JSON.stringify(valore) : "null";
    case "bigint":
      return JSON.stringify(valore.toString());
    case "string":
    case "boolean":
      return JSON.stringify(valore);
  }
  const oggetto = valore as { toJSON?: () => unknown };
  // Date e simili si descrivono da soli: gli diamo la parola come farebbe JSON.stringify.
  if (typeof oggetto.toJSON === "function") return canonico(oggetto.toJSON());
  if (Array.isArray(valore)) {
    // Negli array le posizioni contano: un elemento ignorato diventa null, non sparisce.
    return "[" + valore.map((v) => canonico(v) ?? "null").join(",") + "]";
  }
  if (valore instanceof Uint8Array) {
    return "[" + Array.from(valore).join(",") + "]";
  }
  const chiavi = Object.keys(valore as Record<string, unknown>).sort();
  const pezzi: string[] = [];
  for (const k of chiavi) {
    const v = canonico((valore as Record<string, unknown>)[k]);
    if (v !== undefined) pezzi.push(JSON.stringify(k) + ":" + v);
  }
  return "{" + pezzi.join(",") + "}";
}

/** SHA-256 esadecimale di un testo (Web Crypto). */
export async function sha256Esadecimale(testo: string): Promise<string> {
  const byte = new TextEncoder().encode(testo);
  const impronta = await crypto.subtle.digest("SHA-256", byte);
  return Array.from(new Uint8Array(impronta), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 esadecimale del JSON canonico (chiavi ordinate, funzioni e undefined ignorati). */
export async function chiaveCache(parti: unknown[]): Promise<string> {
  return sha256Esadecimale(canonico(parti) ?? "null");
}

// ===== Normalizzazione =====

// Punteggiatura che non cambia il senso di una domanda se sta in fondo.
const PUNTEGGIATURA_FINALE = /[\s.,;:!?…]+$/u;

/** Minuscole, spazi ridotti a uno, punteggiatura finale tolta. Gli accenti restano: "perché" e "perche" sono parole diverse. */
export function normalizzaTesto(testo: string): string {
  return testo
    // NFC perché lo stesso accento può arrivare composto o scomposto a seconda di chi scrive.
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(PUNTEGGIATURA_FINALE, "");
}

// ===== Richieste in corso =====

const inCorso = new Map<string, Promise<unknown>>();

/** Richieste uguali in corso condividono la stessa promessa; la voce si toglie alla fine, anche se fallisce. */
export function unica<T>(chiave: string, lavoro: () => Promise<T>): Promise<T> {
  const esistente = inCorso.get(chiave);
  if (esistente) return esistente as Promise<T>;

  // Promise.resolve().then(...) così anche un `lavoro` che lancia in modo sincrono diventa un rifiuto.
  const promessa: Promise<T> = Promise.resolve()
    .then(lavoro)
    .finally(() => {
      // Si toglie solo se la voce è ancora la nostra: non vogliamo cancellare quella di una richiesta più recente.
      if (inCorso.get(chiave) === promessa) inCorso.delete(chiave);
    });
  inCorso.set(chiave, promessa);
  return promessa;
}

// ===== Messaggi per la chiave =====

async function parteImmagine(p: Extract<Parte, { tipo: "immagine" }>): Promise<unknown> {
  // Il base64 di una foto pesa megabyte: nella chiave entra solo la sua impronta.
  const sorgente = p.base64 !== undefined ? "base64:" + p.base64 : p.url !== undefined ? "url:" + p.url : "";
  return { tipo: "immagine", mime: p.mime, impronta: await sha256Esadecimale(sorgente) };
}

async function contenutoPerChiave(contenuto: Messaggio["contenuto"], normalizza: boolean): Promise<unknown> {
  if (typeof contenuto === "string") return normalizza ? normalizzaTesto(contenuto) : contenuto;
  return Promise.all(
    contenuto.map(async (p) => {
      if (p.tipo === "immagine") return parteImmagine(p);
      // `stabile` è solo un suggerimento per la cache del fornitore: non cambia la risposta, quindi resta fuori.
      return { tipo: "testo", testo: normalizza ? normalizzaTesto(p.testo) : p.testo };
    }),
  );
}

/**
 * Messaggi pronti per entrare nella chiave. Con `normalizza` solo l'ultimo messaggio dell'utente
 * viene normalizzato: le istruzioni e la storia devono restare esatte, perché cambiano la risposta.
 */
export async function messaggiPerChiave(messaggi: Messaggio[], normalizza: boolean): Promise<unknown[]> {
  let ultimoUtente = -1;
  if (normalizza) {
    for (let i = messaggi.length - 1; i >= 0; i--) {
      if (messaggi[i].ruolo === "utente") {
        ultimoUtente = i;
        break;
      }
    }
  }
  return Promise.all(
    messaggi.map(async (m, i) => ({
      ruolo: m.ruolo,
      contenuto: await contenutoPerChiave(m.contenuto, i === ultimoUtente),
    })),
  );
}
