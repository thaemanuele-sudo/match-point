// Copia del Motore: non modificare qui, si modifica nel repository motore
// Lettura dei flussi "server-sent events" e piccoli aiuti per il testo JSON.
// Senza Buffer né librerie: solo ReadableStream e TextDecoder, che esistono ovunque giri fetch.

export type EventoSSE = { evento?: string; dati: string };

/**
 * Legge un flusso SSE e restituisce un evento per volta.
 * I pezzi di rete arrivano tagliati dove capita (a metà riga, a metà carattere UTF-8):
 * per questo si accumula il testo e si decodifica con `stream: true`, e si emette solo quando si vede la riga vuota.
 * Le righe che iniziano con ":" sono commenti (OpenRouter manda ": OPENROUTER PROCESSING" per tenere aperta la connessione).
 */
export async function* leggiSSE(corpo: ReadableStream<Uint8Array> | null): AsyncGenerator<EventoSSE> {
  if (!corpo) return;
  const lettore = corpo.getReader();
  const decodifica = new TextDecoder();
  let resto = "";
  let evento: string | undefined;
  let dati: string[] = [];

  // Una riga completa alla volta. Ritorna un evento se la riga vuota chiude quello in corso.
  const riga = (r: string): EventoSSE | null => {
    if (r === "") {
      if (dati.length === 0) {
        evento = undefined;
        return null;
      }
      const e: EventoSSE = { evento, dati: dati.join("\n") };
      evento = undefined;
      dati = [];
      return e;
    }
    if (r.startsWith(":")) return null;
    const i = r.indexOf(":");
    const campo = i === -1 ? r : r.slice(0, i);
    let valore = i === -1 ? "" : r.slice(i + 1);
    if (valore.startsWith(" ")) valore = valore.slice(1);
    if (campo === "data") dati.push(valore);
    else if (campo === "event") evento = valore;
    return null;
  };

  try {
    for (;;) {
      const { done, value } = await lettore.read();
      if (done) break;
      // \r\n e \r singolo diventano \n. Se \r e \n arrivano in pezzi diversi nasce una riga vuota in più, che è innocua.
      resto += decodifica.decode(value, { stream: true }).replace(/\r\n?/g, "\n");
      let fine: number;
      while ((fine = resto.indexOf("\n")) !== -1) {
        const e = riga(resto.slice(0, fine));
        resto = resto.slice(fine + 1);
        if (e) yield e;
      }
    }
    resto += decodifica.decode().replace(/\r\n?/g, "\n");
    if (resto) {
      const e = riga(resto);
      if (e) yield e;
    }
    // Flusso chiuso senza riga vuota finale: l'ultimo evento si consegna comunque.
    const ultimo = riga("");
    if (ultimo) yield ultimo;
  } finally {
    // Se chi consuma si ferma prima della fine, si libera la connessione.
    await lettore.cancel().catch(() => undefined);
  }
}

/**
 * Interpreta il testo di una risposta strutturata. Anche con lo schema imposto, alcuni servizi compatibili
 * avvolgono il JSON in un blocco ```json: lo si tollera invece di scartare una risposta buona.
 * Lancia SyntaxError se non è JSON.
 */
export function leggiJSON(testo: string): unknown {
  const t = testo.trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const recinto = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
    if (recinto) return JSON.parse(recinto[1]);
    throw e;
  }
}

/** Conta i caratteri come li conta chi fattura la voce: per simboli Unicode, non per unità UTF-16. */
export function contaCaratteri(testo: string): number {
  let n = 0;
  for (const _ of testo) n++;
  return n;
}
