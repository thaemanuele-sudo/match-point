// Copia del Motore: non modificare qui, si modifica nel repository motore
// Banchi di prova: fanno girare i modelli su righe fisse e misurano qualità, costo e latenza.
// Servono a dare ai bracci un priore (tabella di partenza) prima di toccare i dati reali di un'app.
// Solo TypeScript e Web standard: nessuna dipendenza, nessun file letto.
import type { Archivio, Catalogo, Compito, Contenuto, Decisore, Fornitore, Messaggio } from "./tipi";
import { costo } from "./costi";
import { giudica, type Ripiego } from "./giudice";
import { spiegaErrore, spiegaRiferimentoMancante, type FaseErrore, type SpiegazioneErrore } from "./errori-banco";

export type { FaseErrore } from "./errori-banco";

export type RigaBanco = { id: string; ingresso: unknown; atteso?: { testo?: string; dati?: unknown } };

export type Banco = { id: string; titolo: string; compito: Compito<any>; righe: RigaBanco[] };

export type RisultatoRigaBanco = {
  riga: string;
  modello: string;
  punteggio: number;
  costo_usd: number;
  latenza_ms: number;
  // Dettaglio tecnico accorciato (stato HTTP e messaggio del fornitore: mai chiavi, mai il testo delle richieste).
  errore?: string;
  // Dove è fallita la prova. "risposta" = errore del modello provato (conta come errore suo).
  // "giudizio" = il modello ha risposto ma non si è riusciti a giudicarlo (giudice o riferimento fuori uso):
  // NON è colpa del modello, la prova non conta né come riuscita né come errore («non giudicata»).
  fase_errore?: FaseErrore;
  // Il motivo in parole semplici, per il cruscotto.
  motivo?: string;
  stato_http?: number;
  // Come è nato il punteggio (utile per il cruscotto): "atteso" = confronto deterministico con la
  // risposta attesa, "riferimento" = giudizio contro il modello di riferimento, "valida" = bocciata
  // da `valida`, "misura" = è il riferimento stesso, "non_giudicata" = giudizio non riuscito.
  metodo?: "atteso" | "riferimento" | "valida" | "misura" | "non_giudicata";
  // Il decisore ha lasciato il giudizio al modello di riferimento (incerto o in errore).
  ripiego?: "incerto" | "errore";
};

export type EsitoBanco = { righe: RisultatoRigaBanco[]; finito: boolean; prossima: number };

/** Cosa il banco racconta mentre lavora: chi chiama lo scrive nei log del server. Mai chiavi né testi di richieste. */
export type EventoBanco =
  | { tipo: "errore"; banco: string; riga: string; modello: string; fase: FaseErrore; motivo: string; stato?: number; dettaglio: string }
  | { tipo: "riprova"; banco: string; riga: string; modello: string; fase: FaseErrore; tentativo: number; attesa_ms: number; motivo: string }
  | { tipo: "ripiego_giudice"; banco: string; riga: string; modello: string; motivo: "incerto" | "errore"; dettaglio?: string };

export type DipendenzeBanco = {
  fornitori: Record<string, Fornitore>;
  catalogo: Catalogo;
  decisore?: Decisore;
  // Non lo usa eseguiBanco: i priori si scrivono dopo ogni pezzo con prioriDaBanco, chi chiama decide quando.
  archivio?: Archivio;
  registro?: (e: EventoBanco) => void;
  // Per i test: sostituiscono l'attesa vera tra un tentativo e l'altro e l'orologio.
  attendi?: (ms: number) => Promise<void>;
  adesso?: () => number;
};

export type OpzioniBanco = {
  modelli: string[];
  da?: number;
  quante?: number;
  tetto_usd?: number;
  // Tempo massimo del pezzo: finito, non si avviano altre righe (il pezzo torna con `prossima` e chi chiama
  // richiama) e i tentativi si fermano. Serve a restare dentro il tempo della funzione sul server.
  tempo_massimo_ms?: number;
  // Tempo massimo di una singola chiamata a un fornitore (risposta o giudizio).
  chiamata_massimo_ms?: number;
};

// Tetto di chiamate ai fornitori in volo nello stesso momento (modelli e giudizi insieme):
// oltre si rischia di prendere 429 e di falsare le latenze.
const MASSIMO_CONTEMPORANEE = 4;
// E per ogni singolo fornitore (Anthropic, OpenRouter…): più basso, perché i limiti di frequenza sono per chiave.
const MASSIMO_PER_FORNITORE = 3;

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
  | { ok: false; spiegazione: SpiegazioneErrore; latenza_ms: number };

type Contesto = {
  dip: DipendenzeBanco;
  banco: Banco;
  modelli: string[];
  limita: <T>(lavoro: () => Promise<T>) => Promise<T>;
  // Un tetto anche per fornitore: un solo fornitore con troppe chiamate insieme risponde 429 prima degli altri.
  limitaFornitore: (fornitore: string) => <T>(lavoro: () => Promise<T>) => Promise<T>;
  scadenza: number; // istante oltre cui non si avviano altre chiamate né tentativi
  chiamataMs: number;
  adesso: () => number;
  attendi: (ms: number) => Promise<void>;
};

// Attese prima del secondo e del terzo tentativo: abbastanza per far passare un 429 breve, poche per stare nel tempo della rotta.
const ATTESE_RIPROVA_MS = [1_000, 2_500];
// Margine minimo che deve restare, dopo l'attesa, per tentare ancora: una chiamata vera dura qualche secondo.
const MARGINE_RIPROVA_MS = 8_000;

const tronca = (testo: string, massimo = 300) => (testo.length > massimo ? `${testo.slice(0, massimo)}…` : testo);

// Un errore passeggero (429, 5xx, rete, tempo scaduto) merita un altro tentativo; un rifiuto della richiesta (400, 401…) no.
function eRiprovabile(e: unknown): boolean {
  const x = e as { riprovabile?: unknown; stato?: unknown } | null;
  if (typeof x?.riprovabile === "boolean") return x.riprovabile;
  // Sage non ha il campo: stato 0 = rete o tempo scaduto, 429 e 5xx = passeggero.
  return typeof x?.stato === "number" && (x.stato === 0 || x.stato === 429 || x.stato >= 500);
}

/**
 * Esegue `lavoro` e, se fallisce per un motivo passeggero, lo ripete fino a due volte con una breve attesa,
 * purché il tempo del pezzo lo permetta. L'attesa sta fuori dal semaforo: chi aspetta non occupa un posto.
 */
async function conRiprova<T>(ctx: Contesto, lavoro: () => Promise<T>, quando: (tentativo: number, attesa: number, e: unknown) => void): Promise<T> {
  for (let n = 0; ; n++) {
    try {
      return await lavoro();
    } catch (e) {
      const attesa = ATTESE_RIPROVA_MS[n];
      if (attesa === undefined || !eRiprovabile(e) || ctx.scadenza - ctx.adesso() < attesa + MARGINE_RIPROVA_MS) throw e;
      quando(n + 2, attesa, e);
      await ctx.attendi(attesa);
    }
  }
}

// Il tempo massimo di una chiamata: quello fissato, ma mai oltre la fine del pezzo (resta almeno un secondo).
function segnaleChiamata(ctx: Contesto): AbortSignal {
  return AbortSignal.timeout(Math.max(1_000, Math.min(ctx.chiamataMs, ctx.scadenza - ctx.adesso())));
}

async function eseguiRiga(ctx: Contesto, riga: RigaBanco): Promise<{ risultati: RisultatoRigaBanco[]; costo: number }> {
  const { dip, banco, modelli, limita } = ctx;
  const compito = banco.compito;
  let costoRiga = 0;

  // Ogni errore si scrive una volta nel registro del server e si traduce in campi della riga.
  const segnala = (modello: string, fase: FaseErrore, sp: SpiegazioneErrore) => {
    dip.registro?.({ tipo: "errore", banco: banco.id, riga: riga.id, modello, fase, motivo: sp.motivo, ...(sp.stato !== undefined ? { stato: sp.stato } : {}), dettaglio: sp.dettaglio });
  };
  const campiErrore = (fase: FaseErrore, sp: SpiegazioneErrore) => ({
    errore: sp.dettaglio,
    fase_errore: fase,
    motivo: sp.motivo,
    ...(sp.stato !== undefined ? { stato_http: sp.stato } : {}),
  });
  const alRiprovare = (modello: string, fase: FaseErrore) => (tentativo: number, attesa_ms: number, e: unknown) =>
    dip.registro?.({ tipo: "riprova", banco: banco.id, riga: riga.id, modello, fase, tentativo, attesa_ms, motivo: spiegaErrore(fase, e).motivo });

  let messaggi: Messaggio[];
  try {
    messaggi = compito.prepara(riga.ingresso);
  } catch (e) {
    // Il messaggio dell'errore di `prepara` potrebbe contenere pezzi della richiesta: si dà solo un motivo generico.
    const sp: SpiegazioneErrore = { motivo: "La richiesta del banco non si è potuta preparare", dettaglio: `prepara: ${e instanceof Error ? e.name : "errore"}` };
    return {
      risultati: modelli.map((modello) => {
        segnala(modello, "risposta", sp);
        return { riga: riga.id, modello, punteggio: 0, costo_usd: 0, latenza_ms: 0, ...campiErrore("risposta", sp) };
      }),
      costo: 0,
    };
  }

  // Ogni modello si chiama una volta sola per riga, anche se serve due volte (come candidato e come
  // riferimento): la promessa in cache è condivisa, così il riferimento non si paga due volte.
  const chiamate = new Map<string, Promise<Fatta>>();
  const eseguiChiamata = async (id: string): Promise<Fatta> => {
    const info = dip.catalogo.modello(id);
    if (!info) return { ok: false, spiegazione: spiegaErrore("risposta", new Error(`modello sconosciuto: ${id}`)), latenza_ms: 0 };
    const fornitore = dip.fornitori[info.fornitore];
    if (!fornitore) return { ok: false, spiegazione: spiegaErrore("risposta", new Error(`fornitore mancante: ${info.fornitore}`)), latenza_ms: 0 };
    if (compito.fornitori_ammessi && !compito.fornitori_ammessi.includes(info.fornitore)) {
      return { ok: false, spiegazione: spiegaErrore("risposta", new Error(`fornitore non ammesso dal compito: ${info.fornitore}`)), latenza_ms: 0 };
    }
    const t0 = ctx.adesso();
    try {
      const r = await conRiprova(
        ctx,
        () =>
          limita(() =>
            ctx.limitaFornitore(info.fornitore)(() =>
              fornitore.genera({
                modello: info,
                messaggi,
                schema: compito.schema,
                max_token: compito.max_token,
                temperatura: compito.temperatura,
                segnale: segnaleChiamata(ctx),
              }),
            ),
          ),
        alRiprovare(id, "risposta"),
      );
      const c = costo(info, r.uso);
      costoRiga += c;
      const contenuto: Contenuto = { testo: r.testo };
      const dati = r.dati !== undefined ? r.dati : compito.schema ? dalTestoJson(r.testo) : undefined;
      if (dati !== undefined) contenuto.dati = dati;
      return { ok: true, contenuto, costo_usd: c, latenza_ms: typeof r.latenza_ms === "number" ? r.latenza_ms : ctx.adesso() - t0 };
    } catch (e) {
      return { ok: false, spiegazione: spiegaErrore("risposta", e), latenza_ms: ctx.adesso() - t0 };
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
      // Errore del modello provato: nessun costo (non ha risposto) e nessun giudizio da fare.
      segnala(modello, "risposta", f.spiegazione);
      return { riga: riga.id, modello, punteggio: 0, costo_usd: 0, latenza_ms: f.latenza_ms, ...campiErrore("risposta", f.spiegazione) };
    }
    const base = { riga: riga.id, modello, costo_usd: f.costo_usd, latenza_ms: f.latenza_ms };
    // Da qui il modello ha risposto: se qualcosa va storto non è più colpa sua.
    const nonGiudicata = (sp: SpiegazioneErrore): RisultatoRigaBanco => {
      segnala(modello, "giudizio", sp);
      return { ...base, punteggio: 0, metodo: "non_giudicata", ...campiErrore("giudizio", sp) };
    };
    try {
      if (compito.valida) {
        // Come nel giudice: un errore del validatore su questa risposta vuol dire che non è nella forma attesa.
        let valida = false;
        try {
          valida = !!compito.valida(f.contenuto, riga.ingresso);
        } catch {
          valida = false;
        }
        if (!valida) return { ...base, punteggio: 0, metodo: "valida" };
      }
      if (atteso && compito.confronta) {
        let p: number | null | undefined;
        try {
          p = compito.confronta(atteso, f.contenuto, riga.ingresso);
        } catch {
          p = null; // il confronto non sa rispondere: si passa al giudice
        }
        if (typeof p === "number" && Number.isFinite(p)) return { ...base, punteggio: limita01(p), metodo: "atteso" };
      }
      // Il riferimento è la misura: confrontarlo con se stesso non ha senso (e costerebbe un giudizio).
      if (modello === compito.riferimento) return { ...base, punteggio: 1, metodo: "misura" };

      const rif = await chiama(compito.riferimento);
      if (!rif.ok) return nonGiudicata(spiegaRiferimentoMancante(rif.spiegazione));
      let ripiego: Ripiego | undefined;
      const g = await conRiprova(
        ctx,
        () =>
          limita(() =>
            giudica(
              {
                fornitori: dip.fornitori,
                catalogo: dip.catalogo,
                ...(dip.decisore ? { decisore: dip.decisore } : {}),
                suRipiego: (r) => {
                  ripiego = r;
                  dip.registro?.({ tipo: "ripiego_giudice", banco: banco.id, riga: riga.id, modello, motivo: r.motivo, ...(r.dettaglio ? { dettaglio: spiegaErrore("giudizio", new Error(r.dettaglio)).dettaglio } : {}) });
                },
                segnale: segnaleChiamata(ctx),
              },
              { compito, ingresso: riga.ingresso, messaggi, riferimento: rif.contenuto, candidato: f.contenuto },
            ),
          ),
        alRiprovare(modello, "giudizio"),
      ).catch((e) => {
        throw new ErroreGiudizio(e);
      });
      // Il giudizio pesa sul tetto di spesa ma non sul costo del modello: il costo per riga è quello
      // che pagherebbe l'app per quella risposta.
      costoRiga += g.costo_usd;
      const ripiegoVisto = ripiego as Ripiego | undefined;
      return { ...base, punteggio: limita01(g.punteggio), metodo: "riferimento", ...(ripiegoVisto ? { ripiego: ripiegoVisto.motivo } : {}) };
    } catch (e) {
      // Un errore qui è del giudizio (o del controllo scritto nel compito), mai della risposta del modello.
      return nonGiudicata(spiegaErrore("giudizio", e instanceof ErroreGiudizio ? e.causa : e));
    }
  };

  const risultati = await Promise.all(modelli.map(valuta));
  // Il riferimento chiamato solo per giudicare (non richiesto in `modelli`) costa comunque: è già in costoRiga.
  return { risultati, costo: costoRiga };
}

// Distingue, dentro valuta, l'errore del giudizio da quello di `valida`/`confronta`: tutti e due finiscono come
// «non giudicata», ma `causa` conserva l'errore originale per spiegarlo.
class ErroreGiudizio extends Error {
  constructor(readonly causa: unknown) {
    super(causa instanceof Error ? causa.message : String(causa));
  }
}

export async function eseguiBanco(dip: DipendenzeBanco, banco: Banco, opz: OpzioniBanco): Promise<EsitoBanco> {
  const modelli = [...new Set(opz.modelli)];
  const totale = banco.righe.length;
  const inizio = Math.min(totale, Math.max(0, Math.floor(opz.da ?? 0)));
  const fine = opz.quante === undefined ? totale : Math.min(totale, inizio + Math.max(0, Math.floor(opz.quante)));
  const adesso = dip.adesso ?? Date.now;
  const limitiFornitore = new Map<string, ReturnType<typeof creaLimite>>();
  const ctx: Contesto = {
    dip,
    banco,
    modelli,
    limita: creaLimite(MASSIMO_CONTEMPORANEE),
    limitaFornitore: (f) => {
      let l = limitiFornitore.get(f);
      if (!l) limitiFornitore.set(f, (l = creaLimite(MASSIMO_PER_FORNITORE)));
      return l;
    },
    scadenza: opz.tempo_massimo_ms === undefined ? Infinity : adesso() + opz.tempo_massimo_ms,
    chiamataMs: opz.chiamata_massimo_ms ?? 30_000,
    adesso,
    attendi: dip.attendi ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms))),
  };

  // Si lavora a ondate di righe in parallelo, tenendo conto che ogni riga lancia più modelli:
  // il semaforo resta comunque il vero limite.
  const ondata = Math.max(1, Math.floor(MASSIMO_CONTEMPORANEE / Math.max(1, modelli.length)));
  const righe: RisultatoRigaBanco[] = [];
  let prossima = inizio;
  let spesa = 0;
  let maxRiga = 0; // la riga più cara vista finora: serve a non sforare il tetto con la prossima ondata
  let maxDurata = 0; // l'ondata più lunga vista finora: serve a non cominciarne una che non finirebbe in tempo

  while (prossima < fine) {
    // Il tempo finito non è un errore: il pezzo si chiude qui e chi chiama riparte da `prossima`.
    // La prima ondata parte sempre, altrimenti il banco non avanzerebbe mai.
    if (righe.length > 0 && ctx.scadenza - adesso() < maxDurata * 1.2) break;
    let n = Math.min(ondata, fine - prossima);
    if (opz.tetto_usd !== undefined) {
      const residuo = opz.tetto_usd - spesa;
      if (residuo <= 0) break;
      // Finché non si è misurato quanto costa una riga si procede una alla volta: un'ondata intera
      // alla cieca potrebbe sforare il tetto da sola.
      n = maxRiga > 0 ? Math.min(n, Math.floor(residuo / maxRiga)) : 1;
      if (n < 1) break;
    }
    const t0 = adesso();
    const lavori = banco.righe.slice(prossima, prossima + n).map((r) => eseguiRiga(ctx, r));
    const fatti = await Promise.all(lavori);
    maxDurata = Math.max(maxDurata, adesso() - t0);
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
  qualita: number; // punteggio medio sulle prove giudicate, gli errori del modello contano 0
  costo_medio: number; // dollari per riga, solo righe riuscite (un errore non costa e falserebbe la media)
  latenza_mediana: number; // millisecondi, solo righe riuscite
  errori: number; // errori del modello (la sua risposta non è arrivata)
  non_giudicate: number; // il modello ha risposto ma il giudizio non è riuscito: non è un suo errore
};

function mediana(valori: number[]): number {
  if (valori.length === 0) return 0;
  const o = [...valori].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

// Una riga non giudicata (il modello ha risposto, il giudizio no) non dice nulla sul modello: sta fuori
// dalla qualità e dai priori, e si conta a parte.
const eNonGiudicata = (r: RisultatoRigaBanco): boolean => r.fase_errore === "giudizio";

export function riassumiBanco(righe: RisultatoRigaBanco[]): Record<string, RiassuntoModello> {
  const per: Record<string, RisultatoRigaBanco[]> = {};
  for (const r of righe) (per[r.modello] ||= []).push(r);
  const fuori: Record<string, RiassuntoModello> = {};
  for (const [modello, rs] of Object.entries(per)) {
    const nonGiudicate = rs.filter(eNonGiudicata);
    const giudicabili = rs.filter((r) => !eNonGiudicata(r));
    const riuscite = giudicabili.filter((r) => !r.errore);
    fuori[modello] = {
      righe: rs.length,
      qualita: giudicabili.length ? giudicabili.reduce((s, r) => s + r.punteggio, 0) / giudicabili.length : 0,
      costo_medio: riuscite.length ? riuscite.reduce((s, r) => s + r.costo_usd, 0) / riuscite.length : 0,
      latenza_mediana: mediana(riuscite.map((r) => r.latenza_ms)),
      errori: giudicabili.length - riuscite.length,
      non_giudicate: nonGiudicate.length,
    };
  }
  return fuori;
}

// Da scrivere con archivio.sommaPriori(genere, modello, delta, "banco"): successi pesati e loro complemento.
// Gli errori del modello contano come insuccesso pieno (punteggio 0): un modello che sbaglia o non risponde non va promosso.
// Le prove non giudicate no: se il giudice non ha risposto non si sa com'era la risposta, e punire il modello sarebbe ingiusto.
export function prioriDaBanco(righe: RisultatoRigaBanco[]): Record<string, { ok: number; ko: number }> {
  const fuori: Record<string, { ok: number; ko: number }> = {};
  for (const r of righe) {
    if (eNonGiudicata(r)) continue;
    const p = (fuori[r.modello] ||= { ok: 0, ko: 0 });
    p.ok += r.punteggio;
    p.ko += 1 - r.punteggio;
  }
  return fuori;
}
