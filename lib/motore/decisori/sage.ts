// Copia del Motore: non modificare qui, si modifica nel repository motore
// Decisore basato su Sage di Levanto (https://docs.levanto.ai).
// Formati verificati sulla documentazione il 2026-11-17:
//   POST {url}/decide, intestazione "Authorization: Bearer <chiave>" (le chiavi iniziano con lv_live_).
//   Richiesta:  { content, question: { id, kind: "yesno" | "choice", instructions, options?: [{ option, description }] }, reasoning: "off" | "auto" | "on" }
//   yesno:  result = { answer: "yes" | "no" | null, probability }   (probability è P(sì), presente anche con answer null)
//   choice: result = { chosen: string | null, probability: number | null, probabilities: [{ option, probability }] }
//   Una risposta null ha stato 200: non è un errore e non va ritentata.
//   Errori: 400 richiesta non valida, 401 chiave mancante o errata, 402 uso incluso esaurito, 503 servizio in caricamento.
import type { Decisore, EsitoScelta, EsitoSiNo, Ragiona } from "../tipi";

// Prezzi di Sage, dollari per milione di token.
// Fonte: https://levanto.ai/pricing, letti il 2026-11-17. Il prezzo di ingresso scende con i piani più grandi
// (0,05 Free e Developer, 0,046 Starter, 0,042 Pro, 0,038 Growth): uso il più alto, così il costo registrato
// è una stima prudente e mai al di sotto di quanto si paga davvero. L'uscita costa 1 dollaro per tutti i piani;
// i token di ragionamento contano come uscita. La ricerca web (0,10 a ricerca) non si usa.
export const PREZZO_SAGE_IN_USD_PER_MILIONE = 0.05;
export const PREZZO_SAGE_OUT_USD_PER_MILIONE = 1;

// Il ragionamento può durare fino a 10 secondi lato server (documentazione: "timeout del client sopra i 10 secondi"):
// senza ragionamento si risponde in pochi centesimi di secondo, quindi un timeout breve basta e non blocca l'app.
const TIMEOUT_BASE_MS = 8_000;
const TIMEOUT_RAGIONAMENTO_MS = 12_000;

/** Errore di Sage con lo stato HTTP. Il messaggio non contiene mai la chiave. */
export class ErroreSage extends Error {
  readonly stato: number;
  constructor(messaggio: string, stato: number) {
    super(messaggio);
    this.name = "ErroreSage";
    this.stato = stato;
  }
}

type UsoSage = { input_tokens?: number; output_tokens?: number; image_tokens?: number };

type RispostaSage = {
  id?: string;
  kind?: string;
  result?: Record<string, unknown> | null;
  meta?: {
    model?: string;
    latency_ms?: number;
    usage?: UsoSage;
    reasoning?: { tokens?: number | null } | null;
  };
};

const REASONING: Record<Ragiona, "off" | "auto" | "on"> = { spento: "off", auto: "auto", acceso: "on" };

function costoDaUso(uso: UsoSage | undefined, stimaIn: number, tokenRagionamento: number): number {
  // Se Sage non riporta meta.usage (la documentazione non ne mostra un esempio) si stima: ingresso a 4 caratteri
  // per token e, come uscita, i soli token di ragionamento dichiarati. Meglio una stima che un costo zero.
  const tokenIn = (uso?.input_tokens ?? stimaIn) + (uso?.image_tokens ?? 0);
  const tokenOut = uso?.output_tokens ?? tokenRagionamento;
  return (tokenIn * PREZZO_SAGE_IN_USD_PER_MILIONE + tokenOut * PREZZO_SAGE_OUT_USD_PER_MILIONE) / 1_000_000;
}

export function decisoreSage(opz: { chiave: string; url?: string; fetchFn?: typeof fetch }): Decisore {
  const base = (opz.url ?? "https://sage.levanto.ai").replace(/\/+$/, "");
  // Si lega a globalThis: chiamare fetch come metodo di un altro oggetto dà "Illegal invocation" nei browser e su Vercel.
  const fetchFn: typeof fetch = opz.fetchFn ?? ((...a) => globalThis.fetch(...a));

  // La chiave non deve mai finire in un messaggio d'errore: se il server o la rete la riecheggiano, la si copre.
  const pulisci = (testo: string) => (opz.chiave ? testo.split(opz.chiave).join("***") : testo);

  async function chiama(
    corpo: Record<string, unknown>,
    ragiona: Ragiona,
    segnale?: AbortSignal,
  ): Promise<{ risposta: RispostaSage; latenza_ms: number }> {
    const limite = ragiona === "spento" ? TIMEOUT_BASE_MS : TIMEOUT_RAGIONAMENTO_MS;
    const controllo = new AbortController();
    let scaduto = false;
    const timer = setTimeout(() => {
      scaduto = true;
      controllo.abort();
    }, limite);
    const alFermo = () => controllo.abort();
    if (segnale) {
      if (segnale.aborted) controllo.abort();
      else segnale.addEventListener("abort", alFermo, { once: true });
    }
    const inizio = Date.now();
    try {
      let res: Response;
      try {
        res = await fetchFn(`${base}/decide`, {
          method: "POST",
          headers: { Authorization: `Bearer ${opz.chiave}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...corpo, reasoning: REASONING[ragiona] }),
          signal: controllo.signal,
        });
      } catch (e) {
        if (scaduto) throw new ErroreSage(`Sage: nessuna risposta entro ${limite} ms`, 0);
        if (segnale?.aborted) throw e; // annullata da chi chiama: si lascia passare com'è
        throw new ErroreSage(`Sage: richiesta non riuscita (${pulisci(e instanceof Error ? e.message : String(e))})`, 0);
      }
      if (!res.ok) {
        let dettaglio = "";
        try {
          const grezzo = await res.text();
          try {
            const j = JSON.parse(grezzo) as { detail?: unknown };
            dettaglio = typeof j.detail === "string" ? j.detail : grezzo;
          } catch {
            dettaglio = grezzo;
          }
        } catch {
          // il corpo dell'errore non è indispensabile
        }
        dettaglio = pulisci(dettaglio).slice(0, 200);
        const significato =
          res.status === 401
            ? "chiave mancante o non valida"
            : res.status === 402
              ? "credito finito (uso incluso nel periodo esaurito)"
              : res.status === 503
                ? "servizio in caricamento o non disponibile"
                : res.status === 400
                  ? "richiesta non valida"
                  : "errore";
        throw new ErroreSage(`Sage ${res.status}: ${significato}${dettaglio ? ` (${dettaglio})` : ""}`, res.status);
      }
      let risposta: RispostaSage;
      try {
        risposta = (await res.json()) as RispostaSage;
      } catch {
        if (scaduto) throw new ErroreSage(`Sage: nessuna risposta entro ${limite} ms`, 0);
        throw new ErroreSage("Sage: risposta non in formato JSON", res.status);
      }
      if (!risposta || typeof risposta !== "object" || !risposta.result || typeof risposta.result !== "object") {
        throw new ErroreSage("Sage: risposta senza il campo result", res.status);
      }
      // Latenza misurata qui (rete compresa): meta.latency_ms è solo il tempo del server.
      return { risposta, latenza_ms: Date.now() - inizio };
    } finally {
      clearTimeout(timer);
      segnale?.removeEventListener("abort", alFermo);
    }
  }

  return {
    id: "sage",

    async sino(r): Promise<EsitoSiNo> {
      const ragiona = r.ragiona ?? "spento";
      const { risposta, latenza_ms } = await chiama(
        { content: r.contenuto, question: { id: "q", kind: "yesno", instructions: r.domanda } },
        ragiona,
        r.segnale,
      );
      const res = risposta.result as { answer?: unknown; probability?: unknown };
      const p = res.probability;
      if (typeof p !== "number" || !Number.isFinite(p)) throw new ErroreSage("Sage: risposta yesno senza probabilità", 200);
      const risp = res.answer === "yes" ? true : res.answer === "no" ? false : null;
      return {
        risposta: risp,
        probabilita: Math.min(1, Math.max(0, p)),
        calibrata: true,
        latenza_ms,
        costo_usd: costoDaUso(
          risposta.meta?.usage,
          Math.ceil((r.contenuto.length + r.domanda.length) / 4),
          risposta.meta?.reasoning?.tokens ?? 0,
        ),
      };
    },

    async scegli(r): Promise<EsitoScelta> {
      // Limiti di Sage per choice: da 2 a 120 opzioni. Meglio fermarsi qui con un messaggio chiaro che avere un 400.
      if (r.opzioni.length < 2 || r.opzioni.length > 120) {
        throw new ErroreSage(`Sage: le opzioni devono essere da 2 a 120 (ricevute ${r.opzioni.length})`, 400);
      }
      const ragiona = r.ragiona ?? "spento";
      const { risposta, latenza_ms } = await chiama(
        {
          content: r.contenuto,
          question: {
            id: "q",
            kind: "choice",
            instructions: r.istruzioni,
            options: r.opzioni.map((o) => ({ option: o.id, description: o.descrizione })),
          },
        },
        ragiona,
        r.segnale,
      );
      const res = risposta.result as { chosen?: unknown; probabilities?: unknown };
      const ammesse = new Set(r.opzioni.map((o) => o.id));
      let scelta: string | null = null;
      if (res.chosen !== null && res.chosen !== undefined) {
        if (typeof res.chosen !== "string" || !ammesse.has(res.chosen)) {
          throw new ErroreSage("Sage: la scelta restituita non è tra le opzioni", 200);
        }
        scelta = res.chosen;
      }
      // probabilities è un array di { option, probability } nell'ordine della richiesta: si porta a una mappa.
      const probabilita: Record<string, number> = {};
      if (Array.isArray(res.probabilities)) {
        for (const v of res.probabilities as { option?: unknown; probability?: unknown }[]) {
          if (v && typeof v.option === "string" && typeof v.probability === "number" && ammesse.has(v.option)) {
            probabilita[v.option] = v.probability;
          }
        }
      }
      const lunghezzaIn = r.contenuto.length + r.istruzioni.length + r.opzioni.reduce((s, o) => s + o.id.length + o.descrizione.length, 0);
      return {
        scelta,
        probabilita,
        calibrata: true,
        latenza_ms,
        costo_usd: costoDaUso(risposta.meta?.usage, Math.ceil(lunghezzaIn / 4), risposta.meta?.reasoning?.tokens ?? 0),
      };
    },
  };
}
