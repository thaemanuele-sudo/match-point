// Copia del Motore: non modificare qui, si modifica nel repository motore
// Deposito in memoria: file (audio, per esempio) tenuti in una mappa.
// Serve ai test e alla prima pubblicazione senza Supabase Storage.

import type { Deposito } from "../tipi";

export function depositoMemoria(): Deposito {
  const file = new Map<string, { dati: Uint8Array; mime: string }>();
  return {
    async leggi(chiave) {
      const f = file.get(chiave);
      // Si restituisce una copia: chi legge non deve poter cambiare il deposito.
      return f ? { dati: f.dati.slice(), mime: f.mime } : null;
    },
    async scrivi(chiave, dati, mime) {
      file.set(chiave, { dati: dati.slice(), mime });
    },
  };
}
