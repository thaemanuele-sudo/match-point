// Copia del Motore: non modificare qui, si modifica nel repository motore
// Costi in dollari. Tutti i prezzi dei modelli sono "dollari per milione di token" (o di caratteri per la voce).
import type { Messaggio, ModelloInfo, Uso } from "./tipi";

const MILIONE = 1_000_000;
const TOKEN_PER_IMMAGINE = 1_500;
const CARATTERI_PER_TOKEN = 4;

// Claude Haiku 5.5 costa 5 volte tanto (ingresso, uscita e cache) per le richieste con più di 100.000 token di prompt.
// Il contratto di ModelloInfo non ha fasce di prezzo, quindi la regola sta qui, indicizzata per id del modello.
// Fonte: platform.claude.com/docs/en/about-claude/pricing (0,10/0,50 fino a 100k, 0,50/2,50 oltre).
const FASCE_LUNGO_CONTESTO: Record<string, { oltre: number; moltiplicatore: number }> = {
  "anthropic/claude-haiku-5-5": { oltre: 100_000, moltiplicatore: 5 },
};

function moltiplicatore(modello: ModelloInfo, token_prompt: number): number {
  const fascia = FASCE_LUNGO_CONTESTO[modello.id];
  return fascia && token_prompt > fascia.oltre ? fascia.moltiplicatore : 1;
}

/**
 * Costo vero di una chiamata. I token di cache hanno il loro prezzo; se il catalogo non lo indica si usa il prezzo
 * di lettura normale (è la scelta prudente: non si regala uno sconto che non è documentato).
 * `token_in` non comprende i token di cache: sono gruppi separati (vedi `Uso`).
 */
export function costo(modello: ModelloInfo, uso: Uso): number {
  const letti = uso.token_cache_letti ?? 0;
  const scritti = uso.token_cache_scritti ?? 0;
  const token =
    uso.token_in * modello.prezzo_in +
    uso.token_out * modello.prezzo_out +
    letti * (modello.prezzo_cache_lettura ?? modello.prezzo_in) +
    scritti * (modello.prezzo_cache_scrittura ?? modello.prezzo_in);
  const m = moltiplicatore(modello, uso.token_in + letti + scritti);
  // La voce si paga a caratteri; senza prezzo per carattere nel catalogo non si inventa nulla.
  const voce = (uso.caratteri ?? 0) * (modello.prezzo_caratteri ?? 0);
  return (token * m + voce) / MILIONE;
}

/** Stima grossolana dei token: 4 caratteri l'uno, 1.500 per ogni immagine. Serve a scegliere, non a fatturare. */
export function stimaToken(messaggi: Messaggio[]): number {
  let caratteri = 0;
  let immagini = 0;
  for (const m of messaggi) {
    if (typeof m.contenuto === "string") {
      caratteri += m.contenuto.length;
      continue;
    }
    for (const p of m.contenuto) {
      if (p.tipo === "testo") caratteri += p.testo.length;
      else immagini++;
    }
  }
  return Math.ceil(caratteri / CARATTERI_PER_TOKEN) + immagini * TOKEN_PER_IMMAGINE;
}

/** Costo previsto prima di chiamare, senza cache: serve a ordinare i modelli per prezzo. */
export function costoAtteso(modello: ModelloInfo, token_in: number, token_out: number): number {
  return costo(modello, { token_in, token_out });
}
