// Copia del Motore: non modificare qui, si modifica nel repository motore
// Errori e invio delle richieste, comuni a tutti i fornitori.
// Qui si decide una volta sola cosa è "riprovabile" e si toglie la chiave da ogni messaggio:
// il motore registra e mostra gli errori, quindi una chiave nel testo finirebbe nei registri e nel cruscotto.

export type FetchFn = typeof fetch;

/** 429 e 5xx (compreso il 529 "overloaded" di Anthropic) si possono ritentare, gli altri errori HTTP no. */
export function riprovabileDaStato(stato: number | undefined): boolean {
  return stato === 429 || (stato !== undefined && stato >= 500);
}

/** Sostituisce ogni occorrenza dei segreti con "***". */
export function togliSegreti(testo: string, segreti: readonly string[]): string {
  let out = testo;
  for (const s of segreti) {
    if (s) out = out.split(s).join("***");
  }
  return out;
}

export class ErroreFornitore extends Error {
  /** Stato HTTP, se la risposta è arrivata. Assente per errori di rete, timeout e formato. */
  readonly stato?: number;
  readonly fornitore: string;
  /** true se ritentare (o passare a un altro modello) ha senso: 429, 5xx, rete, timeout. */
  readonly riprovabile: boolean;

  constructor(opz: {
    fornitore: string;
    messaggio: string;
    stato?: number;
    riprovabile?: boolean;
    segreti?: readonly string[];
  }) {
    const pulito = togliSegreti(opz.messaggio, opz.segreti ?? []);
    super(`${opz.fornitore}: ${pulito}`);
    this.name = "ErroreFornitore";
    this.fornitore = opz.fornitore;
    this.stato = opz.stato;
    this.riprovabile = opz.riprovabile ?? riprovabileDaStato(opz.stato);
  }
}

/**
 * Estrae il messaggio utile dal corpo di un errore. Formati noti:
 * Anthropic {error:{type,message}}, OpenAI/OpenRouter {error:{message}}, ElevenLabs {detail:{message}} o {detail:"..."}.
 * Se non è JSON si usa il testo grezzo, accorciato.
 */
export function messaggioDaCorpo(corpo: string): string {
  const grezzo = corpo.trim();
  try {
    const j = JSON.parse(grezzo) as Record<string, unknown>;
    const err = j.error as Record<string, unknown> | string | undefined;
    if (typeof err === "string") return err;
    if (err && typeof err.message === "string") return typeof err.type === "string" ? `${err.type}: ${err.message}` : err.message;
    const det = j.detail as unknown;
    if (typeof det === "string") return det;
    if (det && typeof det === "object" && !Array.isArray(det) && typeof (det as Record<string, unknown>).message === "string") {
      return (det as Record<string, string>).message;
    }
    if (typeof j.message === "string") return j.message;
  } catch {
    /* non è JSON: si usa il testo */
  }
  return grezzo.slice(0, 300);
}

/**
 * Esegue la richiesta e trasforma ogni fallimento in ErroreFornitore.
 * `segnale` serve per i tempi massimi: un timeout (AbortSignal.timeout) è un errore transitorio e quindi riprovabile,
 * mentre un annullamento voluto da chi chiama non lo è.
 */
export async function inviaRichiesta(dip: {
  fornitore: string;
  fetchFn: FetchFn;
  url: string;
  init: RequestInit;
  segreti: readonly string[];
}): Promise<Response> {
  const { fornitore, segreti } = dip;
  let risposta: Response;
  try {
    risposta = await dip.fetchFn(dip.url, dip.init);
  } catch (e) {
    const nome = e instanceof Error ? e.name : "";
    const msg = e instanceof Error ? e.message : String(e);
    if (nome === "TimeoutError") {
      throw new ErroreFornitore({ fornitore, messaggio: "tempo scaduto", riprovabile: true, segreti });
    }
    if (nome === "AbortError") {
      throw new ErroreFornitore({ fornitore, messaggio: "richiesta annullata", riprovabile: false, segreti });
    }
    throw new ErroreFornitore({ fornitore, messaggio: `errore di rete (${msg})`, riprovabile: true, segreti });
  }
  if (!risposta.ok) {
    const corpo = await risposta.text().catch(() => "");
    throw new ErroreFornitore({
      fornitore,
      messaggio: `HTTP ${risposta.status}: ${messaggioDaCorpo(corpo) || risposta.statusText}`,
      stato: risposta.status,
      segreti,
    });
  }
  return risposta;
}

/** Codici di errore dei flussi di Anthropic (evento "error") e loro stato HTTP equivalente. */
const STATO_DA_TIPO_ANTHROPIC: Record<string, number> = {
  invalid_request_error: 400,
  authentication_error: 401,
  billing_error: 402,
  permission_error: 403,
  not_found_error: 404,
  request_too_large: 413,
  rate_limit_error: 429,
  api_error: 500,
  timeout_error: 504,
  overloaded_error: 529,
};

export function statoDaTipoAnthropic(tipo: string | undefined): number | undefined {
  return tipo ? STATO_DA_TIPO_ANTHROPIC[tipo] : undefined;
}
