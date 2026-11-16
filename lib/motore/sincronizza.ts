// Copia del Motore: non modificare qui, si modifica nel repository motore
// Scambio con il centro: l'app invia i numeri dei suoi bracci e riceve i priori.
//
//  1. INVIO. Per ogni compito legge i bracci con `leggiBracci` e li manda a
//     POST {centro}/api/v1/statistiche (Authorization: Bearer {chiave_app}):
//       { app, righe: [{ compito, versione, secchio, modello, genere, ok, ko, costo_medio }] }
//     Sono valori CUMULATI, non differenze: il centro sostituisce la riga
//     precedente, quindi l'invio si può ripetere senza falsare nulla.
//     Privacy: nel corpo viaggiano solo questi numeri. Mai testi, richieste,
//     risposte o identificativi di utenti.
//  2. RICEZIONE. Legge GET {centro}/api/v1/tabella:
//       { priori: { [genere]: { [modello]: { ok, ko } } }, modelli: ModelloInfo[] }
//     e scrive ogni priore nell'archivio con `sommaPriori(..., "centro")`.
//     REGOLA: la fonte "centro" SOSTITUISCE il valore precedente della stessa
//     fonte invece di sommarlo (vedi archivioMemoria e motore_priori_somma).
//     Il centro pubblica ogni volta il totale: sommarlo ogni volta lo
//     raddoppierebbe a ogni sincronizzazione.
//     L'elenco dei modelli non viene scritto qui: l'archivio non ha un metodo per
//     il catalogo, che l'app costruisce da sé.
//
// Con i bracci vuoti non si invia nulla (ma la tabella si legge comunque).

import type { Archivio, Genere } from "./tipi";

const GENERI: readonly string[] = ["genera", "classifica", "estrai", "vedi", "parla"];

// Un invio troppo grande potrebbe superare i limiti del centro (5000 righe per chiamata).
const RIGHE_PER_INVIO = 500;

type RigaInviata = {
  compito: string;
  versione: number;
  secchio: string;
  modello: string;
  genere: Genere;
  ok: number;
  ko: number;
  costo_medio: number;
};

export async function sincronizza(opz: {
  centro: string;
  chiave_app: string;
  app: string;
  archivio: Archivio;
  compiti: { id: string; versione: number; genere: Genere }[];
  fetchFn?: typeof fetch;
}): Promise<{ inviati: number; priori: number }> {
  const richiedi: typeof fetch = opz.fetchFn ?? ((input, init) => fetch(input, init));
  const base = opz.centro.replace(/\/+$/, "");
  const intestazioni = { Authorization: `Bearer ${opz.chiave_app}` };

  // 1. Invio dello stato attuale dei bracci.
  const righe: RigaInviata[] = [];
  for (const c of opz.compiti) {
    for (const b of await opz.archivio.leggiBracci(opz.app, c.id, c.versione)) {
      righe.push({
        compito: c.id,
        versione: c.versione,
        secchio: b.secchio,
        modello: b.modello,
        genere: c.genere,
        ok: b.ok,
        ko: b.ko,
        costo_medio: b.costo_medio,
      });
    }
  }
  for (let i = 0; i < righe.length; i += RIGHE_PER_INVIO) {
    const r = await richiedi(`${base}/api/v1/statistiche`, {
      method: "POST",
      headers: { ...intestazioni, "Content-Type": "application/json" },
      body: JSON.stringify({ app: opz.app, righe: righe.slice(i, i + RIGHE_PER_INVIO) }),
    });
    if (!r.ok) throw new Error(`sincronizza: invio delle statistiche fallito (${r.status}) ${await testoRisposta(r)}`.trim());
  }

  // 2. Ricezione dei priori.
  const r = await richiedi(`${base}/api/v1/tabella`, { method: "GET", headers: intestazioni });
  if (!r.ok) throw new Error(`sincronizza: lettura della tabella fallita (${r.status}) ${await testoRisposta(r)}`.trim());
  const tabella = (await r.json()) as {
    priori?: Record<string, Record<string, { ok?: unknown; ko?: unknown }>>;
  };

  let priori = 0;
  for (const [genere, modelli] of Object.entries(tabella.priori ?? {})) {
    if (!GENERI.includes(genere)) continue;
    for (const [modello, p] of Object.entries(modelli ?? {})) {
      const ok = Number(p?.ok);
      const ko = Number(p?.ko);
      // Un valore rotto non deve entrare nelle statistiche.
      if (!Number.isFinite(ok) || !Number.isFinite(ko) || ok < 0 || ko < 0) continue;
      await opz.archivio.sommaPriori(genere as Genere, modello, { ok, ko }, "centro");
      priori += 1;
    }
  }

  return { inviati: righe.length, priori };
}

async function testoRisposta(r: Response): Promise<string> {
  return r.text().catch(() => "");
}
