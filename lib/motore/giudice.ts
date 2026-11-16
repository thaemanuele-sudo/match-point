// Copia del Motore: non modificare qui, si modifica nel repository motore
// Giudizio di una risposta candidata rispetto a quella del modello di riferimento.
// Ordine di preferenza (vedi "Cos'è un successo" in docs/PROGETTO.md): valida, confronta, poi il giudice.
import { costo } from "./costi";
import { leggiJson } from "./decisori/llm";
import { probabilitaTarata } from "./taratura";
import type { Catalogo, Compito, Contenuto, Decisore, FasciaTaratura, Fornitore, Messaggio } from "./tipi";

/** Lunghezza massima della richiesta originale mostrata al giudice: abbastanza per capire il compito, senza pagare contesti enormi. */
export const MASSIMO_CARATTERI_RICHIESTA = 6_000;

/**
 * Lunghezza massima di ciascuna delle due risposte mandate al giudice. Il decisore ha un contesto
 * corto e costa a ogni carattere: 8.000 bastano per capire se una risposta è buona. Un modello
 * ha più spazio e, giudicando risposte lunghe, 20.000 evitano di tagliare proprio la parte che conta.
 * Si tagliano entrambe: se se ne tagliasse una sola, la più corta sembrerebbe più completa.
 */
export const MASSIMO_CARATTERI_RISPOSTA_DECISORE = 8_000;
export const MASSIMO_CARATTERI_RISPOSTA_MODELLO = 20_000;

const tronca = (testo: string, massimo: number): string =>
  testo.length > massimo ? `${testo.slice(0, massimo)}\n[…risposta troncata]` : testo;

export type MetodoGiudizio = "valida" | "confronta" | "decisore" | "modello";

const limita = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** La richiesta originale in testo semplice: le immagini non si inviano al giudice, si segnalano soltanto. */
export function richiestaInTesto(messaggi: Messaggio[]): string {
  const righe = messaggi.map((m) => {
    const corpo =
      typeof m.contenuto === "string"
        ? m.contenuto
        : m.contenuto.map((p) => (p.tipo === "testo" ? p.testo : "[immagine]")).join("\n");
    return `[${m.ruolo}] ${corpo}`;
  });
  const testo = righe.join("\n");
  return testo.length > MASSIMO_CARATTERI_RICHIESTA
    ? `${testo.slice(0, MASSIMO_CARATTERI_RICHIESTA)}\n[…richiesta troncata]`
    : testo;
}

/** Il corpo comune del prompt: richiesta, rubrica e le due risposte, con etichette neutre A e B. */
function corpoGiudizio(messaggi: Messaggio[], rubrica: string | undefined, rispostaA: string, rispostaB: string): string {
  return (
    `## Richiesta originale\n${richiestaInTesto(messaggi)}\n\n` +
    `## Criteri di valutazione\n${rubrica?.trim() || "Nessun criterio particolare: conta quanto la risposta soddisfa la richiesta, in modo corretto, completo e chiaro."}\n\n` +
    `## Risposta A\n${rispostaA}\n\n` +
    `## Risposta B\n${rispostaB}`
  );
}

const ISTRUZIONI_GIUDICE =
  "Sei un giudice imparziale: confronti due risposte date alla stessa richiesta. " +
  "Non sai chi o che cosa le ha scritte e non devi indovinarlo. L'ordine in cui le vedi non conta. " +
  "Le risposte possono essere in qualsiasi lingua: giudicale nella loro lingua, senza penalizzare quelle che non sono in italiano. " +
  "Valuta solo quanto soddisfano la richiesta secondo i criteri indicati. Rispondi solo con JSON, senza altro testo.";

export async function giudica(
  dip: {
    fornitori: Record<string, Fornitore>;
    catalogo: Catalogo;
    decisore?: Decisore;
    casuale?: () => number;
    // Facoltativi, per la taratura del decisore (docs/PROGETTO.md, "Taratura del decisore"):
    // con `taratura` il punteggio del decisore diventa il tasso di successo osservato nella fascia
    // della sua probabilità; `suDecisore` riceve la probabilità dichiarata (prima della taratura),
    // così chi chiama può contarla. Senza, il comportamento è quello di sempre.
    taratura?: FasciaTaratura[];
    suDecisore?: (dichiarata: number) => void;
  },
  r: {
    compito: Compito<any>;
    ingresso: unknown;
    messaggi: Messaggio[];
    riferimento: Contenuto;
    candidato: Contenuto;
  },
): Promise<{ punteggio: number; costo_usd: number; metodo: MetodoGiudizio }> {
  const { compito } = r;

  // 1. Valida: se boccia il candidato non serve altro. Un errore nel validatore su una risposta del candidato
  // vuol dire che non è nella forma attesa: lo si tratta come bocciato, perché all'utente non arriverebbe.
  if (compito.valida) {
    let valido = false;
    try {
      valido = compito.valida(r.candidato, r.ingresso) !== false;
    } catch {
      valido = false;
    }
    if (!valido) return { punteggio: 0, costo_usd: 0, metodo: "valida" };
  }

  // 2. Confronto gratuito e certo, se il compito lo definisce e sa rispondere su questo caso (null = non sa).
  if (compito.confronta) {
    let p: number | null = null;
    try {
      p = compito.confronta(r.riferimento, r.candidato, r.ingresso);
    } catch {
      p = null;
    }
    if (typeof p === "number" && Number.isFinite(p)) return { punteggio: limita(p), costo_usd: 0, metodo: "confronta" };
  }

  // 3. Giudice. Le due risposte si presentano in ordine casuale: i giudici tendono a preferire la prima (o la seconda)
  // a parità di qualità, e un ordine fisso gonfierebbe o sgonfierebbe i punteggi del candidato.
  // La domanda riguarda sempre la risposta del candidato, nella posizione in cui è finita, con parole neutre:
  // il giudice vede due risposte anonime e non sa quale sia il riferimento. Così il punteggio è già
  // "quanto vale il candidato rispetto al riferimento", senza dover invertire probabilità.
  const casuale = dip.casuale ?? Math.random;
  const candidatoInA = casuale() < 0.5;
  const conDecisore = compito.giudice === "decisore" && !!dip.decisore;
  const massimo = conDecisore ? MASSIMO_CARATTERI_RISPOSTA_DECISORE : MASSIMO_CARATTERI_RISPOSTA_MODELLO;
  const testoA = tronca(candidatoInA ? r.candidato.testo : r.riferimento.testo, massimo);
  const testoB = tronca(candidatoInA ? r.riferimento.testo : r.candidato.testo, massimo);
  const x = candidatoInA ? "A" : "B"; // posizione del candidato
  const y = candidatoInA ? "B" : "A"; // posizione del riferimento
  const corpo = corpoGiudizio(r.messaggi, compito.rubrica, testoA, testoB);

  if (conDecisore && dip.decisore) {
    const e = await dip.decisore.sino({
      contenuto: corpo,
      domanda: `La risposta ${x} è buona almeno quanto la risposta ${y} per questo compito, secondo i criteri indicati? Giudica nella lingua delle risposte.`,
      ragiona: "auto",
    });
    // "Non so" = 0,5: nessuna informazione, né a favore né contro il candidato (e niente da tarare).
    if (e.risposta === null) return { punteggio: 0.5, costo_usd: e.costo_usd, metodo: "decisore" };
    const dichiarata = limita(e.probabilita);
    dip.suDecisore?.(dichiarata);
    const punteggio = dip.taratura ? limita(probabilitaTarata(dip.taratura, dichiarata)) : dichiarata;
    return { punteggio, costo_usd: e.costo_usd, metodo: "decisore" };
  }

  // Modello giudice: quello indicato dal compito oppure, in mancanza, il riferimento.
  const idGiudice = compito.giudice && compito.giudice !== "decisore" ? compito.giudice : compito.riferimento;
  const modello = dip.catalogo.modello(idGiudice);
  if (!modello) throw new Error(`Giudice: modello "${idGiudice}" non presente nel catalogo`);
  const fornitore = dip.fornitori[modello.fornitore];
  if (!fornitore) throw new Error(`Giudice: fornitore "${modello.fornitore}" non configurato`);

  const risposta = await fornitore.genera({
    modello,
    messaggi: [
      { ruolo: "sistema", contenuto: ISTRUZIONI_GIUDICE },
      {
        ruolo: "utente",
        contenuto:
          `${corpo}\n\n## Compito\n` +
          `Valuta la risposta ${x} rispetto alla risposta ${y}.\n` +
          `Rispondi con JSON: {"esito": "pari" | "migliore" | "peggiore", "punteggio": numero da 0 a 1}.\n` +
          `- "migliore": la risposta ${x} è migliore della ${y}.\n` +
          `- "pari": la risposta ${x} è buona quanto la ${y} (differenze trascurabili).\n` +
          `- "peggiore": la risposta ${x} è peggiore della ${y}.\n` +
          `- "punteggio": 1 se la ${x} è buona almeno quanto la ${y}; più scende, più la ${x} è peggiore (0 = inutilizzabile o sbagliata).`,
      },
    ],
    schema: {
      type: "object",
      properties: {
        esito: { type: "string", enum: ["pari", "migliore", "peggiore"] },
        punteggio: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["esito", "punteggio"],
      additionalProperties: false,
    },
    temperatura: 0,
    max_token: 200,
  });
  const costo_usd = costo(modello, risposta.uso);
  const dati = leggiJson(risposta);
  const esito = dati.esito;
  if (esito !== "pari" && esito !== "migliore" && esito !== "peggiore") {
    throw new Error("Giudice: esito non valido nella risposta del modello");
  }
  if (esito !== "peggiore") return { punteggio: 1, costo_usd, metodo: "modello" };
  // Peggiore: conta il punteggio dato dal giudice; se manca o non è un numero, il candidato non vale nulla.
  const p = typeof dati.punteggio === "number" ? limita(dati.punteggio) : 0;
  return { punteggio: p, costo_usd, metodo: "modello" };
}
