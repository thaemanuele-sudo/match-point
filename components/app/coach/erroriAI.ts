/** Esito di una chiamata alle API /api/ai/*: da codice HTTP a chiave del messaggio tradotto. */
export type ChiaveErrore = "accesso" | "budget" | "chiave" | "limite" | "generico";

export function chiaveErrore(stato: number): ChiaveErrore {
  if (stato === 401) return "accesso";
  if (stato === 402) return "budget";
  if (stato === 503) return "chiave";
  if (stato === 429) return "limite";
  return "generico";
}

/** Percorso della pagina di accesso (non è in lib/rotte.ts). */
export const PERCORSO_ACCESSO = "/app/accesso";

/** Errore con il codice HTTP, per distinguerlo dagli errori di rete. */
export class ErroreHttp extends Error {
  constructor(public stato: number) {
    super(`http_${stato}`);
  }
}
