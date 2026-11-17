// Copia del Motore: non modificare qui, si modifica nel repository motore
// Archivio in memoria: implementazione completa di `Archivio` senza database.
//
// Serve ai test di tutti i moduli e alla prima pubblicazione del centro, quando
// il database non c'è ancora. Segue le stesse regole delle funzioni di
// sql/motore.sql, così un test fatto qui vale anche con Supabase.
//
// Regole che contano (le stesse del database):
//  * Dimenticanza: prima di ogni aggiornamento ok e ko si moltiplicano per
//    0,5^(giorni / emivita). Se l'orologio va indietro il fattore è 1.
//  * Costo e latenza medi sono medie pesate sulle prove: i dati vecchi pesano
//    (ok + ko) dopo la dimenticanza, il dato nuovo pesa (delta ok + delta ko),
//    oppure 1 se il delta non porta prove. Se il delta non indica costo o
//    latenza, la media resta com'era.
//  * Un braccio nuovo nasce in stato "prova".
//  * Cache con scadenza: una voce scaduta non si restituisce. Senza durata la
//    scadenza è di 30 giorni, come la cache esatta del contratto.
//  * Taratura del decisore: una riga per (app, decisore, uso, compito, fascia), con
//    la stessa dimenticanza dei bracci e aggiornamento in un solo passo. La lettura
//    restituisce sempre le 6 fasce, anche vuote.
//  * Riepilogo: le chiamate in ombra (prove, controlli, giudizi) stanno in righe
//    separate da quelle servite, con lo stesso compito e modello. Il nucleo ne ha
//    bisogno per misurare il tetto dell'apprendimento: la spesa in ombra da una parte
//    e, dall'altra, quanto sarebbe costato il compito con il solo riferimento.
//  * Priori con fonti: "centro" e "app" sono stati cumulati e SOSTITUISCONO il
//    valore precedente della stessa fonte; le altre fonti (per esempio "banco")
//    si SOMMANO. In lettura le fonti si sommano. Così ripetere la
//    sincronizzazione con il centro non raddoppia i priori.

import type {
  Archivio,
  Braccio,
  Chiamata,
  ChiaveBraccio,
  ChiaveTaratura,
  FasciaTaratura,
  Genere,
  Priore,
  Riepilogo,
  StatoBraccio,
  VoceCache,
} from "../tipi";
import { FASCE } from "../taratura";

const GIORNO_MS = 86_400_000;

/** Durata della cache quando chi scrive non ne indica una: 30 giorni. */
export const DURATA_CACHE_PREDEFINITA_S = 30 * 86_400;

/** Fonti dei priori che sono stati cumulati: sostituiscono invece di sommarsi. */
export const FONTI_PRIORI_SOSTITUTIVE: readonly string[] = ["centro", "app"];

/**
 * Fattore di dimenticanza 0,5^(giorni / emivita). Giorni negativi (orologio
 * indietro) valgono 0: i dati non diventano più freschi del vero.
 */
export function fattoreDimenticanza(da: number, a: number, emivita_giorni: number): number {
  const giorni = Math.max(0, (a - da) / GIORNO_MS);
  return Math.pow(0.5, giorni / emivita_giorni);
}

/** Media pesata di un valore vecchio e di uno nuovo; senza valore nuovo non cambia nulla. */
function mediaPesata(vecchio: number, peso_vecchio: number, nuovo: number | undefined, peso_nuovo: number): number {
  if (nuovo === undefined) return vecchio;
  return (vecchio * peso_vecchio + nuovo * peso_nuovo) / (peso_vecchio + peso_nuovo);
}

function chiaveBraccio(c: ChiaveBraccio): string {
  return JSON.stringify([c.app, c.compito, c.versione, c.secchio, c.modello]);
}

function soloChiave(c: ChiaveBraccio): ChiaveBraccio {
  return { app: c.app, compito: c.compito, versione: c.versione, secchio: c.secchio, modello: c.modello };
}

function chiaveTaratura(c: ChiaveTaratura, fascia: number): string {
  return JSON.stringify([c.app, c.decisore, c.uso, c.compito, fascia]);
}

function perOrdine(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Il database salva JSON: una copia passata da JSON toglie i riferimenti condivisi
// e i campi `undefined`, esattamente come farebbe Supabase.
function copiaJson<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

export function archivioMemoria(opz: { adesso?: () => number } = {}): Archivio {
  const orologio = opz.adesso ?? (() => Date.now());

  const cache = new Map<string, { voce: VoceCache; scade: number }>();
  const bracci = new Map<string, Braccio>();
  const chiamate = new Map<string, Chiamata>();
  const taratura = new Map<string, { ok: number; ko: number; aggiornato_il: number }>();
  // Contributi per (utente, braccio) e chiamate che hanno già ricevuto un esito umano.
  const contributi = new Map<string, number[]>();
  const conEsito = new Set<string>();
  // genere -> modello -> fonte -> contributo
  const priori = new Map<string, Map<string, Map<string, Priore>>>();

  return {
    async leggiCache(chiave) {
      const e = cache.get(chiave);
      if (!e) return null;
      if (e.scade <= orologio()) {
        cache.delete(chiave);
        return null;
      }
      return copiaJson(e.voce);
    },

    async scriviCache(chiave, voce, opz) {
      const durata_s = opz.durata_s ?? DURATA_CACHE_PREDEFINITA_S;
      cache.set(chiave, { voce: copiaJson(voce), scade: orologio() + durata_s * 1000 });
    },

    async togliCache(chiave) {
      cache.delete(chiave);
    },

    async leggiBracci(app, compito, versione) {
      return [...bracci.values()]
        .filter((b) => b.app === app && b.compito === compito && b.versione === versione)
        .sort((x, y) => perOrdine(x.secchio, y.secchio) || perOrdine(x.modello, y.modello))
        .map((b) => ({ ...b }));
    },

    async aggiornaBraccio(chiave, delta, opz) {
      if (!(opz.emivita_giorni > 0)) throw new Error("motore: l'emivita deve essere positiva");
      const k = chiaveBraccio(chiave);
      const vecchio = bracci.get(k);
      const dok = delta.ok ?? 0;
      const dko = delta.ko ?? 0;

      let nuovo: Braccio;
      if (!vecchio) {
        nuovo = {
          ...soloChiave(chiave),
          ok: dok,
          ko: dko,
          costo_medio: delta.costo_usd ?? 0,
          latenza_media: delta.latenza_ms ?? 0,
          stato: "prova",
          aggiornato_il: opz.adesso,
        };
      } else {
        const f = fattoreDimenticanza(vecchio.aggiornato_il, opz.adesso, opz.emivita_giorni);
        const peso_vecchio = (vecchio.ok + vecchio.ko) * f;
        const peso_nuovo = dok + dko > 0 ? dok + dko : 1;
        nuovo = {
          ...soloChiave(chiave),
          ok: vecchio.ok * f + dok,
          ko: vecchio.ko * f + dko,
          costo_medio: mediaPesata(vecchio.costo_medio, peso_vecchio, delta.costo_usd, peso_nuovo),
          latenza_media: mediaPesata(vecchio.latenza_media, peso_vecchio, delta.latenza_ms, peso_nuovo),
          stato: vecchio.stato,
          // Mai all'indietro, come nel database.
          aggiornato_il: Math.max(vecchio.aggiornato_il, opz.adesso),
        };
      }
      bracci.set(k, nuovo);
      return { ...nuovo };
    },

    async impostaStato(chiave, stato: StatoBraccio) {
      const k = chiaveBraccio(chiave);
      const b = bracci.get(k);
      if (b) {
        // Non si tocca `aggiornato_il`: la dimenticanza parte dall'ultimo conteggio.
        b.stato = stato;
        return;
      }
      // Come il database: il braccio nasce vuoto, per poter escludere un modello a mano.
      bracci.set(k, {
        ...soloChiave(chiave),
        ok: 0,
        ko: 0,
        costo_medio: 0,
        latenza_media: 0,
        stato,
        aggiornato_il: orologio(),
      });
    },

    async registraChiamata(c) {
      // Registrare due volte lo stesso id non fa nulla (come `on conflict do nothing`).
      if (!chiamate.has(c.id)) chiamate.set(c.id, copiaJson(c));
    },

    async prenotaContributo(c) {
      // Senza il secchio: dipende dal testo, e chi scrive potrebbe moltiplicare il tetto per il numero di secchi.
      const k = JSON.stringify([c.utente, c.chiave.app, c.chiave.compito, c.chiave.versione, c.chiave.modello]);
      const recenti = (contributi.get(k) ?? []).filter((t) => c.adesso - t < c.finestra_ms);
      if (recenti.length >= c.tetto) {
        contributi.set(k, recenti);
        return false;
      }
      recenti.push(c.adesso);
      contributi.set(k, recenti);
      return true;
    },

    async segnaEsito(id) {
      // Come il database: una chiamata che non c'è non si può segnare.
      if (!chiamate.has(id) || conEsito.has(id)) return false;
      conEsito.add(id);
      return true;
    },

    async leggiChiamata(id) {
      const c = chiamate.get(id);
      return c ? copiaJson(c) : null;
    },

    async leggiPriori(genere: Genere) {
      const fuori: Record<string, Priore> = {};
      for (const [modello, fonti] of priori.get(genere) ?? []) {
        let ok = 0;
        let ko = 0;
        for (const p of fonti.values()) {
          ok += p.ok;
          ko += p.ko;
        }
        fuori[modello] = { ok, ko };
      }
      return fuori;
    },

    async sommaPriori(genere, modello, delta, fonte) {
      let perModello = priori.get(genere);
      if (!perModello) priori.set(genere, (perModello = new Map()));
      let perFonte = perModello.get(modello);
      if (!perFonte) perModello.set(modello, (perFonte = new Map()));
      const prima = perFonte.get(fonte);
      if (!prima || FONTI_PRIORI_SOSTITUTIVE.includes(fonte)) {
        perFonte.set(fonte, { ok: delta.ok, ko: delta.ko });
      } else {
        perFonte.set(fonte, { ok: prima.ok + delta.ok, ko: prima.ko + delta.ko });
      }
    },

    async aggiornaTaratura(chiave, fascia, delta, opz) {
      if (!(opz.emivita_giorni > 0)) throw new Error("motore: l'emivita deve essere positiva");
      if (!Number.isInteger(fascia) || fascia < 0 || fascia >= FASCE.length - 1) {
        throw new Error(`motore: la fascia di taratura deve essere un intero da 0 a ${FASCE.length - 2}`);
      }
      const k = chiaveTaratura(chiave, fascia);
      const vecchia = taratura.get(k);
      const f = vecchia ? fattoreDimenticanza(vecchia.aggiornato_il, opz.adesso, opz.emivita_giorni) : 1;
      taratura.set(k, {
        ok: (vecchia?.ok ?? 0) * f + (delta.ok ?? 0),
        ko: (vecchia?.ko ?? 0) * f + (delta.ko ?? 0),
        // Mai all'indietro, come nel database.
        aggiornato_il: Math.max(vecchia?.aggiornato_il ?? opz.adesso, opz.adesso),
      });
    },

    async leggiTaratura(chiave): Promise<FasciaTaratura[]> {
      return FASCE.slice(0, -1).map((da, fascia) => {
        const r = taratura.get(chiaveTaratura(chiave, fascia));
        return { fascia, da, a: FASCE[fascia + 1], ok: r?.ok ?? 0, ko: r?.ko ?? 0 };
      });
    },

    async riepilogo(app, da, a): Promise<Riepilogo[]> {
      // Estremi inclusi, come nella funzione SQL.
      const gruppi = new Map<string, { r: Riepilogo; somma_latenza: number; con_latenza: number }>();
      for (const c of chiamate.values()) {
        if (app !== null && c.app !== app) continue;
        if (c.creato_il < da || c.creato_il > a) continue;
        const k = JSON.stringify([c.compito, c.modello, c.ombra]);
        let g = gruppi.get(k);
        if (!g) {
          g = {
            r: {
              compito: c.compito,
              modello: c.modello,
              chiamate: 0,
              da_cache: 0,
              locali: 0,
              ombra: 0,
              costo_usd: 0,
              costo_riferimento_usd: 0,
              latenza_media: 0,
            },
            somma_latenza: 0,
            con_latenza: 0,
          };
          gruppi.set(k, g);
        }
        g.r.chiamate += 1;
        if (c.esito === "cache") g.r.da_cache += 1;
        if (c.esito === "locale") g.r.locali += 1;
        if (c.ombra) g.r.ombra += 1;
        g.r.costo_usd += c.costo_usd;
        g.r.costo_riferimento_usd += c.costo_riferimento_usd;
        // Solo le chiamate vere a un fornitore: cache e regole locali durano quasi zero.
        if (c.esito === "risposta") {
          g.somma_latenza += c.latenza_ms;
          g.con_latenza += 1;
        }
      }
      return [...gruppi.values()]
        .map((g) => ({ ...g.r, latenza_media: g.con_latenza > 0 ? g.somma_latenza / g.con_latenza : 0 }))
        // Le righe servite prima di quelle in ombra, a parità di compito e modello.
        .sort((x, y) => perOrdine(x.compito, y.compito) || perOrdine(x.modello, y.modello) || x.ombra - y.ombra);
    },
  };
}
