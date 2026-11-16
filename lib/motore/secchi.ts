// Copia del Motore: non modificare qui, si modifica nel repository motore
// Secchi: dividono le richieste di un compito per difficoltà, così un modello economico
// può essere promosso per le richieste facili senza esserlo per quelle difficili.

import type { Archivio, Decisore, Messaggio } from "./tipi";
import { chiaveCache } from "./cache";
import { stimaToken } from "./costi";

// ===== Secchio base =====

/** Vero se almeno un messaggio contiene un'immagine. */
export function haImmagini(messaggi: Messaggio[]): boolean {
  return messaggi.some((m) => typeof m.contenuto !== "string" && m.contenuto.some((p) => p.tipo === "immagine"));
}

/**
 * Secchio senza indicazioni dell'app: lunghezza stimata della richiesta.
 * Meno di 300 token `corto`, meno di 2.000 `medio`, oltre `lungo`; `+img` se ci sono immagini
 * (un modello può leggere bene il testo e male le foto, quindi le statistiche vanno separate).
 */
export function secchioBase(messaggi: Messaggio[]): string {
  const token = stimaToken(messaggi);
  const base = token < 300 ? "corto" : token < 2000 ? "medio" : "lungo";
  return haImmagini(messaggi) ? `${base}+img` : base;
}

// ===== Secchio scelto dal decisore =====

const MAX_CARATTERI = 1500;
const DURATA_SCELTA_S = 30 * 86_400;
const SCELTE = ["facile", "media", "difficile"] as const;

/** Testo dell'ultimo messaggio dell'utente, troncato: è quello che decide la difficoltà. */
export function ultimoTestoUtente(messaggi: Messaggio[], massimo = MAX_CARATTERI): string {
  for (let i = messaggi.length - 1; i >= 0; i--) {
    const m = messaggi[i];
    if (m.ruolo !== "utente") continue;
    const testo =
      typeof m.contenuto === "string"
        ? m.contenuto
        : m.contenuto.map((p) => (p.tipo === "testo" ? p.testo : "")).join("\n");
    return testo.slice(0, massimo);
  }
  return "";
}

export type DipSecchio = {
  decisore: Decisore;
  archivio: Archivio;
  app: string;
  compito: { id: string; versione: number };
  messaggi: Messaggio[];
  adesso: () => number;
  segnale?: AbortSignal;
};

// `probabilita` = quanto il decisore era sicuro della scelta: manca se la scelta viene dalla cache,
// se ha detto "non so" o se non ha risposto.
export type EsitoSecchio = { secchio: string; costo_usd: number; da_cache: boolean; probabilita?: number };

async function chiaveScelta(dip: Pick<DipSecchio, "app" | "compito" | "messaggi">): Promise<string> {
  // Il prefisso "secchio" evita che la chiave si confonda con quelle delle risposte.
  return chiaveCache(["secchio", dip.app, dip.compito.id, dip.compito.versione, ultimoTestoUtente(dip.messaggi)]);
}

/**
 * Il decisore sceglie tra `facile`, `media`, `difficile`. La scelta si tiene 30 giorni nello
 * stesso archivio della cache: la stessa domanda non si fa pagare due volte.
 * Ogni dubbio (risposta "non so", errore, scelta strana) diventa `difficile`: nel dubbio
 * si usa il trattamento più prudente. Con `soloCache` non si chiama mai il decisore e,
 * se la scelta non c'è, si risponde `null`.
 */
export async function secchioDecisore(dip: DipSecchio, opz: { soloCache: true }): Promise<EsitoSecchio | null>;
export async function secchioDecisore(dip: DipSecchio, opz?: { soloCache?: false }): Promise<EsitoSecchio>;
export async function secchioDecisore(dip: DipSecchio, opz: { soloCache?: boolean } = {}): Promise<EsitoSecchio | null> {
  const chiave = await chiaveScelta(dip);
  try {
    const voce = await dip.archivio.leggiCache(chiave);
    if (voce && (SCELTE as readonly string[]).includes(voce.testo)) {
      return { secchio: voce.testo, costo_usd: 0, da_cache: true };
    }
  } catch {
    // Una cache che non risponde non deve fermare la richiesta.
  }
  if (opz.soloCache) return null;

  let secchio = "difficile";
  let costo_usd = 0;
  let scelto = false;
  let probabilita: number | undefined;
  try {
    const e = await dip.decisore.scegli({
      contenuto: ultimoTestoUtente(dip.messaggi),
      istruzioni:
        "Valuta la difficoltà della richiesta dell'utente per scegliere il modello AI meno caro che basta. " +
        "facile: risposta breve o meccanica (classificare, estrarre, rispondere a una domanda semplice). " +
        "media: serve qualche ragionamento o un testo ben scritto. " +
        "difficile: ragionamento lungo, molti vincoli, creatività o ambiguità. " +
        "Nel dubbio scegli difficile.",
      opzioni: [
        { id: "facile", descrizione: "Richiesta semplice, risposta breve o meccanica." },
        { id: "media", descrizione: "Richiesta che richiede un po' di ragionamento o di scrittura." },
        { id: "difficile", descrizione: "Richiesta complessa, lunga o ambigua." },
      ],
      ragiona: "auto",
      segnale: dip.segnale,
    });
    costo_usd = e.costo_usd;
    // "Non so" (scelta nulla) vale `difficile` e si tiene in cache come ogni altra scelta:
    // richiederla ogni volta costerebbe senza cambiare la risposta.
    if (e.scelta && (SCELTE as readonly string[]).includes(e.scelta)) {
      secchio = e.scelta;
      const p = e.probabilita?.[e.scelta];
      if (typeof p === "number" && Number.isFinite(p)) probabilita = p;
    }
    scelto = true;
  } catch {
    // Decisore irraggiungibile: secchio difficile e niente cache, così riproviamo la prossima volta.
    return { secchio, costo_usd, da_cache: false };
  }

  if (scelto) {
    try {
      await dip.archivio.scriviCache(
        chiave,
        { testo: secchio, modello: dip.decisore.id, creato_il: dip.adesso() },
        { app: dip.app, compito: dip.compito.id, durata_s: DURATA_SCELTA_S },
      );
    } catch {
      // Non salvare la scelta costa solo una chiamata in più in futuro.
    }
  }
  return probabilita === undefined ? { secchio, costo_usd, da_cache: false } : { secchio, costo_usd, da_cache: false, probabilita };
}
