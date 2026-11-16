// Copia del Motore: non modificare qui, si modifica nel repository motore
// Taratura del decisore: quanto ci si può fidare delle probabilità che dichiara.
// Il decisore non si riaddestra: si misura. Le probabilità dichiarate si dividono in 6 fasce e,
// per ognuna, si contano le volte in cui la risposta era davvero buona (`ok`) e quelle in cui no (`ko`).
// Solo TypeScript puro: niente dipendenze, gira ovunque.

import type { FasciaTaratura } from "./tipi";
import { limiti } from "./apprendimento";

/** Bordi delle 6 fasce: 0-0,5, 0,5-0,7, 0,7-0,8, 0,8-0,9, 0,9-0,95, 0,95-1. */
export const FASCE: number[] = [0, 0.5, 0.7, 0.8, 0.9, 0.95, 1];

/** Casi minimi, nelle fasce considerate, perché la taratura valga più della probabilità dichiarata. */
export const MINIMO_CASI_TARATURA = 30;

/** Casi minimi che una singola fascia deve avere perché la soglia automatica possa scendere fino al suo bordo. */
export const MINIMO_CASI_FASCIA = 10;

/**
 * Indice della fascia (da 0 a 5) di una probabilità. Il bordo inferiore appartiene alla fascia
 * che comincia lì: 0,7 è nella fascia 0,7-0,8; 1 è nell'ultima. Un valore fuori scala o non numerico
 * si porta dentro 0-1, così un decisore stonato non fa uscire nessun indice dai limiti.
 */
export function fasciaDi(probabilita: number): number {
  if (!Number.isFinite(probabilita) || probabilita <= 0) return 0;
  for (let i = FASCE.length - 2; i >= 0; i--) {
    if (probabilita >= FASCE[i]) return i;
  }
  return 0;
}

/**
 * Probabilità "tarata": il tasso di successo osservato nella fascia della probabilità dichiarata.
 * Se la fascia ha meno di `minimo` casi (30 se non indicato) non c'è abbastanza per contraddire il
 * decisore e vale la sua probabilità. Così all'inizio, senza dati, nulla cambia.
 */
export function probabilitaTarata(fasce: FasciaTaratura[], probabilita: number, minimo: number = MINIMO_CASI_TARATURA): number {
  const f = fasce.find((x) => x.fascia === fasciaDi(probabilita));
  if (!f) return probabilita;
  const n = f.ok + f.ko;
  if (!(n > 0) || n < minimo) return probabilita;
  return f.ok / n;
}

/**
 * Soglia che il motore può usare al posto di quella fissata a mano: il bordo inferiore della fascia
 * più bassa tale che, da quella fascia in su, il limite basso di Wilson dei successi è almeno `qualita`.
 * - `null` se da nessuna fascia in su ci sono `minimo` casi (30 se non indicato): non si sa abbastanza
 *   e il chiamante tiene la soglia che aveva.
 * - 1 se i casi ci sono ma nemmeno le fasce più alte raggiungono la qualità: il decisore non è abbastanza
 *   affidabile e la soglia va dove nessuna risposta arriva, quindi si serve il riferimento.
 * Si parte dalla fascia più bassa perché una soglia bassa lascia passare più risposte economiche.
 * - Prudenza: la soglia non scende mai sotto il bordo inferiore della fascia più bassa che ha almeno
 *   `MINIMO_CASI_FASCIA` casi da sola. Se i dati stanno solo nelle fasce alte, accettare probabilità
 *   più basse vorrebbe dire fidarsi di valori mai visti alla prova. Se nessuna fascia ha tanti casi
 *   si risponde `null` (non si sa abbastanza) e il chiamante tiene la soglia che aveva.
 */
export function sogliaAutomatica(
  fasce: FasciaTaratura[],
  regole: { qualita: number; fiducia: number; minimo?: number },
): number | null {
  const minimo = regole.minimo ?? MINIMO_CASI_TARATURA;
  const minimoFascia = Math.min(MINIMO_CASI_FASCIA, minimo);
  const pavimento = fasce
    .filter((f) => f.ok + f.ko >= minimoFascia)
    .reduce((m, f) => Math.min(m, f.fascia), Infinity);
  if (!Number.isFinite(pavimento)) return null;
  let abbastanza = false;
  for (let i = Math.max(0, pavimento); i < FASCE.length - 1; i++) {
    let ok = 0;
    let ko = 0;
    for (const f of fasce) {
      if (f.fascia >= i) {
        ok += f.ok;
        ko += f.ko;
      }
    }
    if (ok + ko < minimo) continue;
    abbastanza = true;
    if (limiti(ok, ko, regole.fiducia).basso >= regole.qualita) return FASCE[i];
  }
  return abbastanza ? 1 : null;
}
