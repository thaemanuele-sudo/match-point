// Copia del Motore: non modificare qui, si modifica nel repository motore
// Spiega in parole semplici perché una prova del banco è fallita, e conserva il dettaglio tecnico accorciato.
// Solo TypeScript puro: serve sia al server (che scrive i log) sia al cruscotto (che mostra il motivo).
// Regola di sicurezza: nel dettaglio non finiscono mai chiavi né il testo delle richieste. Le chiavi si
// coprono qui anche se i fornitori lo fanno già, perché un messaggio può arrivare da qualunque punto.

/** Dove è andata male la prova: nella risposta del modello o nel giudizio che la valuta. */
export type FaseErrore = "risposta" | "giudizio";

export type SpiegazioneErrore = {
  /** Frase breve per una persona non tecnica. */
  motivo: string;
  /** Stato HTTP del fornitore, se c'è. */
  stato?: number;
  /** Messaggio tecnico accorciato e ripulito. */
  dettaglio: string;
};

const LUNGHEZZA_DETTAGLIO = 220;

/** Toglie chiavi riconoscibili e spazi inutili, poi accorcia. */
export function pulisciDettaglio(testo: string, massimo = LUNGHEZZA_DETTAGLIO): string {
  const pulito = testo
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer ***")
    .replace(/\b(?:sk|pk|lv_live|lv_test|key|xai|gsk)[-_][A-Za-z0-9_-]{8,}/gi, "***")
    .replace(/\s+/g, " ")
    .trim();
  return pulito.length > massimo ? `${pulito.slice(0, massimo - 1)}…` : pulito;
}

function statoDi(e: unknown): number | undefined {
  const s = (e as { stato?: unknown } | null)?.stato;
  return typeof s === "number" && s >= 100 && s <= 599 ? s : undefined;
}

// Riconosce lo stato anche quando sta solo nel testo («openrouter: HTTP 429: …», «Sage 402: …»).
function statoDaTesto(msg: string): number | undefined {
  const m = /\bHTTP (\d{3})\b/.exec(msg) ?? /\bSage (\d{3})\b/.exec(msg);
  return m ? Number(m[1]) : undefined;
}

type Soggetto = { fase: FaseErrore };

const chi = (s: Soggetto) => (s.fase === "giudizio" ? "Il giudice" : "Il modello");

/**
 * Traduce un errore in una frase breve, scegliendo le parole in base alla fase (risposta o giudizio).
 */
export function spiegaErrore(fase: FaseErrore, e: unknown): SpiegazioneErrore {
  const messaggio = e instanceof Error ? e.message : String(e);
  const stato = statoDi(e) ?? statoDaTesto(messaggio);
  const dettaglio = pulisciDettaglio(messaggio);
  const m = messaggio.toLowerCase();
  const s: Soggetto = { fase };

  let motivo: string;
  if (stato === 429) motivo = "Il fornitore ha risposto 429: troppe richieste";
  else if (stato === 401 || stato === 403) motivo = `Il fornitore non ha accettato la chiave o l'accesso (${stato})`;
  else if (stato === 402) motivo = "Il credito presso il fornitore è finito (402)";
  else if (stato === 404 && !/schema|parameter/.test(m)) motivo = "Modello non disponibile presso il fornitore (404)";
  else if (stato === 400 || stato === 404 || stato === 422) {
    motivo = /schema|response_format|json_schema|structured|output_config|format/.test(m)
      ? `${chi(s)} non accetta il formato di risposta richiesto (${stato})`
      : /temperature|max_tokens|max_completion_tokens|parameter|parametro/.test(m)
        ? `${chi(s)} non accetta uno dei parametri della richiesta (${stato})`
        : `Il fornitore ha rifiutato la richiesta (${stato})`;
  } else if (stato !== undefined && stato >= 500) motivo = `Il fornitore ha avuto un guasto o è sovraccarico (${stato})`;
  else if (/tempo scaduto|nessuna risposta entro|timeout|timed out|aborted|annullata/.test(m)) {
    motivo = fase === "giudizio" ? "Il giudice non ha risposto in tempo" : "Il modello non ha risposto in tempo";
  } else if (/risposta vuota|empty|nessun contenuto/.test(m)) motivo = "Il modello ha restituito una risposta vuota";
  else if (/json|formato|schema|troncata|esito non valido|probabilit/.test(m)) {
    motivo = fase === "giudizio" ? "Il giudice ha risposto in un formato non valido" : "Risposta non nel formato richiesto";
  } else if (/rifiutato|filtro dei contenuti|refus/.test(m)) motivo = "Il modello ha rifiutato di rispondere";
  else if (/rete|fetch failed|network|raggiungibile|econn|enotfound/.test(m)) motivo = "Il fornitore non è raggiungibile";
  else if (/sconosciuto|mancante|non ammesso|non presente nel catalogo|non configurato/.test(m)) motivo = "Modello non disponibile";
  else motivo = fase === "giudizio" ? "Il giudizio non è riuscito per un motivo non riconosciuto" : "Errore non riconosciuto";

  return { motivo, ...(stato !== undefined ? { stato } : {}), dettaglio };
}

/**
 * La prova non si può giudicare perché il modello di riferimento non ha risposto: l'errore non è del modello
 * provato, quindi si conta a parte con una frase che lo dice.
 */
export function spiegaRiferimentoMancante(causa: SpiegazioneErrore): SpiegazioneErrore {
  return { ...causa, motivo: `Il modello di riferimento non ha risposto, quindi la prova non si può giudicare (${causa.motivo.charAt(0).toLowerCase()}${causa.motivo.slice(1)})` };
}
