/*
 * Quanto il maestro ha riscritto la bozza del riassunto: distanza di Levenshtein tra i due testi (inserimenti, tolte e
 * sostituzioni di caratteri) divisa per la lunghezza del più lungo. 0 = identici, 1 = tutto diverso.
 * Perché sui caratteri e non sulle parole: una correzione di una lettera o di un nome conta poco, come deve.
 */

// Oltre questa lunghezza il confronto sarebbe lento e il testo non è comunque più un riassunto di 70 parole: vale "riscritto".
const MAX_CARATTERI = 4000;

export function frazioneRiscritta(bozza: string, approvato: string): number {
  const a = bozza.trim();
  const b = approvato.trim();
  if (a === b) return 0;
  if (!a || !b) return 1;
  if (a.length > MAX_CARATTERI || b.length > MAX_CARATTERI) return 1;
  let prec = new Uint32Array(b.length + 1);
  let corr = new Uint32Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prec[j] = j;
  for (let i = 1; i <= a.length; i++) {
    corr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      corr[j] = Math.min(prec[j] + 1, corr[j - 1] + 1, prec[j - 1] + costo);
    }
    [prec, corr] = [corr, prec];
  }
  return prec[b.length] / Math.max(a.length, b.length);
}

/** Sopra questa quota di testo riscritto, il maestro ha di fatto bocciato la bozza. */
export const SOGLIA_RISCRITTO = 0.4;
