// Copia del Motore: non modificare qui, si modifica nel repository motore
// Banchi di prova: fanno girare i modelli su righe fisse e misurano qualità, costo e latenza.
// Servono a dare ai bracci un priore (tabella di partenza) prima di toccare i dati reali di un'app.
// Solo TypeScript e Web standard: nessuna dipendenza, nessun file letto.
import type { Archivio, Catalogo, Compito, Contenuto, Decisore, Fornitore, Messaggio } from "./tipi";
import { costo } from "./costi";
import { giudica } from "./giudice";

export type RigaBanco = { id: string; ingresso: unknown; atteso?: { testo?: string; dati?: unknown } };

export type Banco = { id: string; titolo: string; compito: Compito<any>; righe: RigaBanco[] };

export type RisultatoRigaBanco = {
  riga: string;
  modello: string;
  punteggio: number;
  costo_usd: number;
  latenza_ms: number;
  errore?: string;
  // Come è nato il punteggio (utile per il cruscotto): "atteso" = confronto deterministico con la
  // risposta attesa, "riferimento" = giudizio contro il modello di riferimento, "valida" = bocciata
  // da `valida`, "misura" = è il riferimento stesso.
  metodo?: "atteso" | "riferimento" | "valida" | "misura";
};

export type EsitoBanco = { righe: RisultatoRigaBanco[]; finito: boolean; prossima: number };

export type DipendenzeBanco = {
  fornitori: Record<string, Fornitore>;
  catalogo: Catalogo;
  decisore?: Decisore;
  // Non lo usa eseguiBanco: i priori si scrivono dopo ogni pezzo con prioriDaBanco, chi chiama decide quando.
  archivio?: Archivio;
};

export type OpzioniBanco = { modelli: string[]; da?: number; quante?: number; tetto_usd?: number };

// Tetto di chiamate ai fornitori in volo nello stesso momento (modelli e giudizi insieme):
// oltre si rischia di prendere 429 e di falsare le latenze.
const MASSIMO_CONTEMPORANEE = 4;

// Semaforo con passaggio diretto del posto: chi esce lo consegna a chi aspetta senza liberarlo,
// così nessun altro può infilarsi nel mezzo e superare il massimo.
function creaLimite(massimo: number) {
  let attivi = 0;
  const coda: Array<() => void> = [];
  return async function limita<T>(lavoro: () => Promise<T>): Promise<T> {
    if (attivi >= massimo) await new Promise<void>((r) => coda.push(r));
    else attivi++;
    try {
      return await lavoro();
    } finally {
      const prossimo = coda.shift();
      if (prossimo) prossimo();
      else attivi--;
    }
  };
}

function messaggioErrore(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function limita01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// Alcuni fornitori non riempiono `dati` anche se si è chiesto uno schema: proviamo a leggerli dal testo
// (anche dentro un blocco ```json), così `valida` e `confronta` lavorano sempre su oggetti.
function dalTestoJson(testo: string): unknown {
  const pulito = testo.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(pulito);
  } catch {
    const m = pulito.match(/[{[][\s\S]*[}\]]/);
    if (!m) return undefined;
    try {
      return JSON.parse(m[0]);
    } catch {
      return undefined;
    }
  }
}

type Fatta =
  | { ok: true; contenuto: Contenuto; costo_usd: number; latenza_ms: number }
  | { ok: false; errore: string; latenza_ms: number };

type Contesto = {
  dip: DipendenzeBanco;
  banco: Banco;
  modelli: string[];
  limita: <T>(lavoro: () => Promise<T>) => Promise<T>;
};

async function eseguiRiga(ctx: Contesto, riga: RigaBanco): Promise<{ risultati: RisultatoRigaBanco[]; costo: number }> {
  const { dip, banco, modelli, limita } = ctx;
  const compito = banco.compito;
  let costoRiga = 0;

  let messaggi: Messaggio[];
  try {
    messaggi = compito.prepara(riga.ingresso);
  } catch (e) {
    const errore = `prepara: ${messaggioErrore(e)}`;
    return {
      risultati: modelli.map((modello) => ({ riga: riga.id, modello, punteggio: 0, costo_usd: 0, latenza_ms: 0, errore })),
      costo: 0,
    };
  }

  // Ogni modello si chiama una volta sola per riga, anche se serve due volte (come candidato e come
  // riferimento): la promessa in cache è condivisa, così il riferimento non si paga due volte.
  const chiamate = new Map<string, Promise<Fatta>>();
  const eseguiChiamata = async (id: string): Promise<Fatta> => {
    const info = dip.catalogo.modello(id);
    if (!info) return { ok: false, errore: `modello sconosciuto: ${id}`, latenza_ms: 0 };
    const fornitore = dip.fornitori[info.fornitore];
    if (!fornitore) return { ok: false, errore: `fornitore mancante: ${info.fornitore}`, latenza_ms: 0 };
    if (compito.fornitori_ammessi && !compito.fornitori_ammessi.includes(info.fornitore)) {
      return { ok: false, errore: `fornitore non ammesso dal compito: ${info.fornitore}`, latenza_ms: 0 };
    }
    const t0 = Date.now();
    try {
      const r = await limita(() =>
        fornitore.genera({
          modello: info,
          messaggi,
          schema: compito.schema,
          max_token: compito.max_token,
          temperatura: compito.temperatura,
        }),
      );
      const c = costo(info, r.uso);
      costoRiga += c;
      const contenuto: Contenuto = { testo: r.testo };
      const dati = r.dati !== undefined ? r.dati : compito.schema ? dalTestoJson(r.testo) : undefined;
      if (dati !== undefined) contenuto.dati = dati;
      return { ok: true, contenuto, costo_usd: c, latenza_ms: typeof r.latenza_ms === "number" ? r.latenza_ms : Date.now() - t0 };
    } catch (e) {
      return { ok: false, errore: messaggioErrore(e), latenza_ms: Date.now() - t0 };
    }
  };
  const chiama = (id: string): Promise<Fatta> => {
    let p = chiamate.get(id);
    if (!p) {
      p = eseguiChiamata(id);
      chiamate.set(id, p);
    }
    return p;
  };

  const atteso: Contenuto | undefined = riga.atteso
    ? {
        testo: riga.atteso.testo ?? (riga.atteso.dati !== undefined ? JSON.stringify(riga.atteso.dati) : ""),
        ...(riga.atteso.dati !== undefined ? { dati: riga.atteso.dati } : {}),
      }
    : undefined;

  const valuta = async (modello: string): Promise<RisultatoRigaBanco> => {
    const f = await chiama(modello);
    if (!f.ok) {
      return { riga: riga.id, modello, punteggio: 0, costo_usd: 0, latenza_ms: f.latenza_ms, errore: f.errore };
    }
    const base = { riga: riga.id, modello, costo_usd: f.costo_usd, latenza_ms: f.latenza_ms };
    try {
      if (compito.valida && !compito.valida(f.contenuto, riga.ingresso)) {
        return { ...base, punteggio: 0, metodo: "valida" };
      }
      if (atteso && compito.confronta) {
        const p = compito.confronta(atteso, f.contenuto, riga.ingresso);
        if (typeof p === "number" && Number.isFinite(p)) return { ...base, punteggio: limita01(p), metodo: "atteso" };
      }
      // Il riferimento è la misura: confrontarlo con se stesso non ha senso (e costerebbe un giudizio).
      if (modello === compito.riferimento) return { ...base, punteggio: 1, metodo: "misura" };

      const rif = await chiama(compito.riferimento);
      if (!rif.ok) return { ...base, punteggio: 0, errore: `riferimento non disponibile: ${rif.errore}` };
      const g = await limita(() =>
        giudica(
          { fornitori: dip.fornitori, catalogo: dip.catalogo, ...(dip.decisore ? { decisore: dip.decisore } : {}) },
          { compito, ingresso: riga.ingresso, messaggi, riferimento: rif.contenuto, candidato: f.contenuto },
        ),
      );
      // Il giudizio pesa sul tetto di spesa ma non sul costo del modello: il costo per riga è quello
      // che pagherebbe l'app per quella risposta.
      costoRiga += g.costo_usd;
      return { ...base, punteggio: limita01(g.punteggio), metodo: "riferimento" };
    } catch (e) {
      return { ...base, punteggio: 0, errore: messaggioErrore(e) };
    }
  };

  const risultati = await Promise.all(modelli.map(valuta));
  // Il riferimento chiamato solo per giudicare (non richiesto in `modelli`) costa comunque: è già in costoRiga.
  return { risultati, costo: costoRiga };
}

export async function eseguiBanco(dip: DipendenzeBanco, banco: Banco, opz: OpzioniBanco): Promise<EsitoBanco> {
  const modelli = [...new Set(opz.modelli)];
  const totale = banco.righe.length;
  const inizio = Math.min(totale, Math.max(0, Math.floor(opz.da ?? 0)));
  const fine = opz.quante === undefined ? totale : Math.min(totale, inizio + Math.max(0, Math.floor(opz.quante)));
  const ctx: Contesto = { dip, banco, modelli, limita: creaLimite(MASSIMO_CONTEMPORANEE) };

  // Si lavora a ondate di righe in parallelo, tenendo conto che ogni riga lancia più modelli:
  // il semaforo resta comunque il vero limite.
  const ondata = Math.max(1, Math.floor(MASSIMO_CONTEMPORANEE / Math.max(1, modelli.length)));
  const righe: RisultatoRigaBanco[] = [];
  let prossima = inizio;
  let spesa = 0;
  let maxRiga = 0; // la riga più cara vista finora: serve a non sforare il tetto con la prossima ondata

  while (prossima < fine) {
    let n = Math.min(ondata, fine - prossima);
    if (opz.tetto_usd !== undefined) {
      const residuo = opz.tetto_usd - spesa;
      if (residuo <= 0) break;
      // Finché non si è misurato quanto costa una riga si procede una alla volta: un'ondata intera
      // alla cieca potrebbe sforare il tetto da sola.
      n = maxRiga > 0 ? Math.min(n, Math.floor(residuo / maxRiga)) : 1;
      if (n < 1) break;
    }
    const lavori = banco.righe.slice(prossima, prossima + n).map((r) => eseguiRiga(ctx, r));
    const fatti = await Promise.all(lavori);
    for (const f of fatti) {
      righe.push(...f.risultati);
      spesa += f.costo;
      maxRiga = Math.max(maxRiga, f.costo);
    }
    prossima += n;
  }

  return { righe, finito: prossima >= totale, prossima };
}

export type RiassuntoModello = {
  righe: number; // quante righe ha il modello nel campione
  qualita: number; // punteggio medio, gli errori contano 0
  costo_medio: number; // dollari per riga, solo righe riuscite (un errore non costa e falserebbe la media)
  latenza_mediana: number; // millisecondi, solo righe riuscite
  errori: number;
};

function mediana(valori: number[]): number {
  if (valori.length === 0) return 0;
  const o = [...valori].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

export function riassumiBanco(righe: RisultatoRigaBanco[]): Record<string, RiassuntoModello> {
  const per: Record<string, RisultatoRigaBanco[]> = {};
  for (const r of righe) (per[r.modello] ||= []).push(r);
  const fuori: Record<string, RiassuntoModello> = {};
  for (const [modello, rs] of Object.entries(per)) {
    const riuscite = rs.filter((r) => !r.errore);
    fuori[modello] = {
      righe: rs.length,
      qualita: rs.reduce((s, r) => s + r.punteggio, 0) / rs.length,
      costo_medio: riuscite.length ? riuscite.reduce((s, r) => s + r.costo_usd, 0) / riuscite.length : 0,
      latenza_mediana: mediana(riuscite.map((r) => r.latenza_ms)),
      errori: rs.length - riuscite.length,
    };
  }
  return fuori;
}

// Da scrivere con archivio.sommaPriori(genere, modello, delta, "banco"): successi pesati e loro complemento.
// Gli errori contano come insuccesso pieno (punteggio 0): un modello che sbaglia o non risponde non va promosso.
export function prioriDaBanco(righe: RisultatoRigaBanco[]): Record<string, { ok: number; ko: number }> {
  const fuori: Record<string, { ok: number; ko: number }> = {};
  for (const r of righe) {
    const p = (fuori[r.modello] ||= { ok: 0, ko: 0 });
    p.ok += r.punteggio;
    p.ko += 1 - r.punteggio;
  }
  return fuori;
}
