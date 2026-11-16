// Copia del Motore: non modificare qui, si modifica nel repository motore
// Instradatore: sceglie quali modelli provare e in che ordine per una richiesta.
// Funzioni pure o quasi: lo stato (bracci, sospensioni) arriva da fuori, così si testano facilmente.

import type { Braccio, Catalogo, Compito, Fornitore, Genere, Messaggio, ModelloInfo } from "./tipi";
import { costoAtteso } from "./costi";
import { haImmagini } from "./secchi";
import { proveVere } from "./apprendimento";

// ===== Costo atteso =====

/** Prove minime perché il costo medio appreso valga più della stima da listino. */
export const PROVE_PER_COSTO_APPRESO = 5;

/**
 * Token in uscita che ci aspettiamo: serve solo a confrontare i modelli tra loro, non a fatturare.
 * Un classificatore risponde con una parola, un estrattore con un piccolo JSON, un testo è più lungo.
 * `max_token` lo abbassa ma non lo alza: un tetto di 4.000 non vuol dire che si usino.
 */
export function tokenUscitaStimati(c: Pick<Compito<any>, "genere" | "max_token">): number {
  const per: Record<Genere, number> = { classifica: 30, estrai: 250, genera: 500, vedi: 500, parla: 0 };
  const base = per[c.genere] ?? 500;
  return c.max_token ? Math.min(c.max_token, base) : base;
}

/**
 * Costo atteso di una chiamata: il costo medio vero del braccio quando ha almeno 5 prove
 * (misura il modello reale su queste richieste), altrimenti la stima dal listino.
 * Un costo medio a zero con prove fatte vuol dire "mai registrato", non "gratis": si ricade sul listino.
 */
export function costoStimato(info: ModelloInfo, braccio: Braccio | undefined, token_in: number, token_out: number): number {
  if (braccio && proveVere(braccio) >= PROVE_PER_COSTO_APPRESO && braccio.costo_medio > 0) return braccio.costo_medio;
  return costoAtteso(info, token_in, token_out);
}

// ===== Candidati =====

export type Voce = { info: ModelloInfo; braccio: Braccio | undefined; costo: number };

/**
 * Candidati utilizzabili per questa richiesta. Si ignora un candidato se:
 * il suo fornitore non è collegato o non è ammesso dal compito (privacy: i dati non devono
 * andare a chi il compito ha escluso), non è nel catalogo, o non sa fare ciò che serve (immagini).
 * Il riferimento non passa da qui: è sempre disponibile.
 */
export function candidatiAmmessi(
  c: Compito<any>,
  dip: { catalogo: Catalogo; fornitori: Record<string, Fornitore> },
  messaggi: Messaggio[],
): ModelloInfo[] {
  const conImmagini = haImmagini(messaggi);
  const visti = new Set<string>();
  const out: ModelloInfo[] = [];
  for (const id of c.candidati) {
    if (id === c.riferimento || visti.has(id)) continue;
    visti.add(id);
    const info = dip.catalogo.modello(id);
    if (!info) continue;
    if (c.fornitori_ammessi && !c.fornitori_ammessi.includes(info.fornitore)) continue;
    if (!dip.fornitori[info.fornitore]) continue;
    if (conImmagini && !info.immagini) continue;
    // Solo un "no" esplicito esclude: se il catalogo non dice nulla si prova e si lascia giudicare alle prove.
    if (c.schema && info.schema === false) continue;
    out.push(info);
  }
  return out;
}

export function trovaBraccio(bracci: Braccio[], secchio: string, modello: string): Braccio | undefined {
  return bracci.find((b) => b.secchio === secchio && b.modello === modello);
}

// ===== Sospensioni =====

export const ERRORI_DI_FILA = 3;
export const SOSPENSIONE_MS = 5 * 60_000;

/**
 * Tiene in memoria gli errori dei fornitori: tre di fila sospendono il modello per 5 minuti,
 * così un fornitore in panne non rallenta ogni richiesta con un tentativo destinato a fallire.
 * Si perde al riavvio: è voluto, una sospensione sbagliata dura poco.
 */
export function creaSospensioni(adesso: () => number) {
  const stati = new Map<string, { errori: number; fino: number }>();
  return {
    sospeso(modello: string): boolean {
      const s = stati.get(modello);
      return !!s && s.fino > adesso();
    },
    successo(modello: string): void {
      stati.delete(modello);
    },
    /** Registra un errore; ritorna true se questo errore fa scattare la sospensione. */
    errore(modello: string): boolean {
      const s = stati.get(modello) ?? { errori: 0, fino: 0 };
      // Finita una sospensione si riparte da zero: un solo errore nuovo non deve sospendere subito.
      if (s.fino > 0 && s.fino <= adesso()) {
        s.errori = 0;
        s.fino = 0;
      }
      s.errori += 1;
      let scattata = false;
      if (s.errori >= ERRORI_DI_FILA) {
        s.fino = adesso() + SOSPENSIONE_MS;
        s.errori = 0;
        scattata = true;
      }
      stati.set(modello, s);
      return scattata;
    },
  };
}

export type Sospensioni = ReturnType<typeof creaSospensioni>;

// ===== Scelta =====

export type DipScelta = {
  c: Compito<any>;
  rif: ModelloInfo;
  ammessi: ModelloInfo[];
  bracci: Braccio[];
  secchio: string;
  token_in: number;
  token_out: number;
};

function voceDi(d: DipScelta, info: ModelloInfo): Voce {
  const braccio = trovaBraccio(d.bracci, d.secchio, info.id);
  return { info, braccio, costo: costoStimato(info, braccio, d.token_in, d.token_out) };
}

/**
 * Catena di servizio: i bracci `attivo` del secchio dal meno caro al più caro, poi il riferimento.
 * Il riferimento chiude sempre la catena: è la garanzia di qualità e l'ultimo ripiego.
 * In modo `osserva` la catena è solo il riferimento (si impara senza cambiare ciò che vede l'utente).
 */
export function catenaDiServizio(d: DipScelta, opz: { osserva: boolean; sospeso: (modello: string) => boolean }): Voce[] {
  const rif = voceDi(d, d.rif);
  if (opz.osserva) return [rif];
  const attivi = d.ammessi
    .map((info) => voceDi(d, info))
    .filter((v) => v.braccio?.stato === "attivo" && !opz.sospeso(v.info.id))
    // A parità di costo vince l'ordine scelto dall'app nell'elenco dei candidati (sort è stabile).
    .sort((a, b) => a.costo - b.costo);
  return [...attivi, rif];
}

/**
 * Bracci da mettere alla prova in ombra: in `prova` e meno cari di quello servito.
 * In modo `osserva` anche gli `attivi`, perché nulla di ciò che prova serve all'utente
 * e così si vede se un braccio promosso regge o peggiora.
 * Il primo della lista è quello con meno prove vere: i dati si distribuiscono invece di accumularsi sul più economico.
 */
export function candidatiProva(
  d: DipScelta,
  opz: { costo_servito: number; osserva: boolean; sospeso: (modello: string) => boolean },
): Voce[] {
  return d.ammessi
    .map((info) => voceDi(d, info))
    .filter((v) => {
      const stato = v.braccio?.stato ?? "prova";
      if (stato === "escluso") return false;
      if (stato === "attivo" && !opz.osserva) return false;
      if (opz.sospeso(v.info.id)) return false;
      return v.costo < opz.costo_servito;
    })
    .sort((a, b) => {
      const pa = a.braccio ? proveVere(a.braccio) : 0;
      const pb = b.braccio ? proveVere(b.braccio) : 0;
      return pa - pb || a.costo - b.costo;
    });
}
