// Copia del Motore: non modificare qui, si modifica nel repository motore
// Statistica del motore: limiti di Wilson, dimenticanza, priori e passaggi di stato dei bracci.
// Solo TypeScript puro: niente dipendenze, gira ovunque.

import type { Priore, StatoBraccio } from "./tipi";

// ===== Limiti di Wilson =====

// z per le fiducie che il progetto usa davvero: valori esatti, così i test e il cruscotto
// mostrano sempre gli stessi numeri. Sono unilaterali (0,90 -> 1,2816).
const Z_NOTI: ReadonlyArray<readonly [number, number]> = [
  [0.8, 0.8416],
  [0.9, 1.2816],
  [0.95, 1.6449],
  [0.99, 2.3263],
];

/**
 * Quantile della normale standard per una fiducia unilaterale.
 * Per i valori non in tabella usa l'approssimazione di Abramowitz e Stegun 26.2.23
 * (errore sotto 5e-4): basta, perché serve solo a fissare una soglia prudente.
 */
export function zDaFiducia(fiducia: number): number {
  for (const [f, z] of Z_NOTI) if (Math.abs(f - fiducia) < 1e-9) return z;
  // Sotto 0,5 il quantile sarebbe negativo: un intervallo "al contrario" non ha senso, quindi nessun margine.
  if (!(fiducia > 0.5)) return 0;
  const p = Math.min(fiducia, 0.999999);
  const t = Math.sqrt(-2 * Math.log(1 - p));
  return t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
}

const tra01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Limiti dell'intervallo di Wilson per `ok` successi e `ko` insuccessi (anche decimali, perché
 * i punteggi sono pesati). Wilson e non la formula "normale" perché regge bene con poche prove
 * e agli estremi: con 10 su 10 non dice che l'errore è impossibile.
 * Senza prove i limiti sono 0 e 1: non sappiamo nulla.
 */
export function limiti(ok: number, ko: number, fiducia: number): { basso: number; alto: number } {
  const a = Math.max(0, ok);
  const b = Math.max(0, ko);
  const n = a + b;
  if (!(n > 0)) return { basso: 0, alto: 1 };
  const z = zDaFiducia(fiducia);
  const z2 = z * z;
  const p = a / n;
  const centro = p + z2 / (2 * n);
  const margine = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  const divisore = 1 + z2 / n;
  return { basso: tra01((centro - margine) / divisore), alto: tra01((centro + margine) / divisore) };
}

// ===== Dimenticanza =====

const MS_GIORNO = 86_400_000;

/**
 * Fa "invecchiare" un conteggio: dopo un'emivita vale la metà. Modelli e prezzi cambiano,
 * quindi le prove vecchie devono contare meno di quelle recenti.
 * Se l'orologio va indietro (adesso <= da) o l'emivita non è positiva non si tocca nulla:
 * meglio ricordare troppo che azzerare le statistiche per un errore di orologio.
 */
export function decadi(valore: number, da: number, adesso: number, emivita_giorni: number): number {
  if (!(adesso > da) || !(emivita_giorni > 0)) return valore;
  const giorni = (adesso - da) / MS_GIORNO;
  return valore * Math.pow(0.5, giorni / emivita_giorni);
}

// ===== Priori =====

/**
 * Trasforma il priore della tabella (conteggi grezzi) in a0 e b0, che pesano come `peso_priori` prove.
 * Senza priore (nessun dato) si parte da 1 e 1: l'ipotesi più neutra, che non regala fiducia a nessuno.
 */
export function prioreEffettivo(priore: Priore | undefined, peso_priori: number): { a0: number; b0: number } {
  const n = priore ? priore.ok + priore.ko : 0;
  if (!priore || !(n > 0)) return { a0: 1, b0: 1 };
  const p0 = priore.ok / n;
  return { a0: peso_priori * p0, b0: peso_priori * (1 - p0) };
}

/** Prove vere: quelle fatte dal braccio, senza il priore. */
export function proveVere(b: { ok: number; ko: number }): number {
  return b.ok + b.ko;
}

// ===== Stato =====

export type RegoleStato = { qualita: number; fiducia: number; minimo_prove: number; peso_priori: number };

// Margine di isteresi: una volta promosso un braccio non torna in prova per un soffio,
// ma solo se il limite basso scende chiaramente sotto la qualità richiesta.
const ISTERESI = 0.05;

/**
 * Stato in cui deve stare un braccio dopo l'ultimo aggiornamento.
 * - `prova -> attivo`: prove vere sufficienti e limite basso di Wilson (col priore) almeno pari alla qualità.
 * - `attivo -> prova`: limite alto sotto la qualità, oppure limite basso sotto qualità - 0,05,
 *   oppure prove vere scese sotto metà del minimo (la dimenticanza le ha consumate).
 * - `escluso` lo decide solo una persona e qui non cambia mai.
 */
export function prossimoStato(
  b: { ok: number; ko: number; stato: StatoBraccio },
  priore: Priore,
  regole: RegoleStato,
): StatoBraccio {
  if (b.stato === "escluso") return "escluso";
  const { a0, b0 } = prioreEffettivo(priore, regole.peso_priori);
  const { basso, alto } = limiti(b.ok + a0, b.ko + b0, regole.fiducia);
  const vere = proveVere(b);
  if (b.stato === "prova") {
    return vere >= regole.minimo_prove && basso >= regole.qualita ? "attivo" : "prova";
  }
  if (alto < regole.qualita || basso < regole.qualita - ISTERESI || vere < regole.minimo_prove / 2) return "prova";
  return "attivo";
}

// ===== Tetto =====

/**
 * Il tetto di spesa per l'apprendimento: prove, controlli e giudizi non devono superare una frazione
 * di `totale`, che per il motore è quanto il compito sarebbe costato usando solo il riferimento
 * (somma di `costo_riferimento_usd` delle chiamate servite, ultimi 7 giorni). Non la spesa vera:
 * con un candidato molto economico a servire, la spesa vera è minuscola e i controlli non partirebbero quasi mai.
 * `esente` vale finché un braccio ha poche prove: senza dati iniziali il tetto bloccherebbe
 * l'apprendimento prima che cominci.
 */
export function tettoPermette(s: { apprendimento: number; totale: number; tetto: number; esente: boolean }): boolean {
  if (s.esente) return true;
  return s.apprendimento <= s.tetto * s.totale;
}
