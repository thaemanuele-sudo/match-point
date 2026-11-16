"use client";
// Caricamento dei dati dei maestri (C1 panoramica, C2 lista, C3 scheda).
// I numeri aggregati (aderenza, lezioni, allievi, valutazioni mancanti, progressi, tempi di risposta, panoramica del giorno
// e della settimana) li calcola il database con le RPC di docs/RPC.md ("Aggregati"): `panoramica_centro`,
// `riepilogo_maestri`, `ultime_lezioni_maestro`, `statistiche_allievi_maestro`. Qui restano solo le letture
// "di contorno" (nomi, gruppi, prossime lezioni, piano e svolto delle ultime 12 lezioni di UN maestro).
// PostgREST taglia in silenzio a 1000 righe: le letture che possono superarle passano da `leggiPagine`.
import { useCallback, useEffect, useState } from "react";
import { useCentro, type SB } from "@/lib/centro/contesto";
import { isoGiorno, leggiData } from "@/lib/centro/date";
import {
  analizzaLezione, etichettaGruppo, maiuscola, mediana,
  corsoCompletato,
  type CorsoB, type Esito, type Cambio, type FormazioneB, type GruppoB, type LezioneB, type MembroB, type Riga,
} from "./util";

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export type LezioneAnalizzata = { l: LezioneB; esito: Esito; cambi: Cambio[] };

/** Numeri di un periodo (`panoramica_centro`). */
export type NumeriPeriodo = { lezioni_totali: number; lezioni_chiuse: number; presenze_totali: number; presenze_presenti: number };
/** Risultato di `panoramica_centro` (docs/RPC.md). */
export type Panoramica = {
  oggi: NumeriPeriodo;
  settimana: NumeriPeriodo;
  allievi_attivi: number;
  nuovi_30g: number;
  allievi_con_assenze_ripetute: number;
  maestri_in_campo: number;
  segnalazioni_aperte: number;
  messaggi_senza_risposta_48h: number;
  aderenza_media: number | null;
};

/** Riga di `statistiche_allievi_maestro`. */
export type StatAllievo = { allievo_id: string; presenze_30g_pct: number | null; media_ultimo_test: number | null };

export type MaestroStat = {
  m: MembroB;
  gruppi: GruppoB[];
  /** Gruppo principale in forma da mockup: "U12 Intermedio · mar-gio 17:00" (più gruppi: il primo e "+n"). */
  etichetta: string;
  /** Lista: lezioni chiuse negli ultimi 30 giorni (RPC). Scheda: totale storico. */
  lezioniChiuse: number;
  /** Ultime 12 lezioni chiuse, dalla più vecchia alla più recente (solo nella scheda di un maestro). */
  ultime: LezioneAnalizzata[];
  /** Allievi iscritti attivi nei suoi gruppi. */
  nAllievi: number;
  /** Id degli allievi: solo nella scheda di un maestro (da `statistiche_allievi_maestro`). */
  allieviIds: string[];
  aderenza: number | null;
  /** Allievi senza valutazioni dal 1 del mese. */
  mancanti: number;
  /** Punti di livello rispetto al test precedente (media dei delta). */
  progressi: number | null;
  rispostaOre: number | null;
  senzaRisposta: number;
  formFatti: number;
  formTot: number;
};

export type Dati = {
  oggi: string;
  maestri: MaestroStat[];
  membri: MembroB[];
  gruppi: GruppoB[];
  /** Lezioni non chiuse da oggi in poi (per "prossima lezione da osservare"). */
  lezioni: LezioneB[];
  panoramica: Panoramica | null;
  segnalazioni: Riga[];
  statAllievi: StatAllievo[];
  valutazioni: Riga[];
  testCorrente: string | null;
  testPrecedente: string | null;
  /** Mediana dei tempi di risposta mediani dei maestri (ore). */
  rispostaMediana: number | null;
  programmaLabel: string;
  corsi: CorsoB[];
  formazione: FormazioneB[];
  errori: string[];
};

async function q(p: PromiseLike<{ data: any; error: { message: string } | null }>, errori: string[], nome: string): Promise<Riga[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = await p;
  if (r.error) errori.push(`${nome}: ${r.error.message}`);
  return (r.data as Riga[] | null) ?? [];
}

/** Righe per richiesta: è il tetto di PostgREST, oltre il quale le righe verrebbero tagliate senza errore. */
const BLOCCO = 1000;
/** Quanti id mettere in un `in(...)`: oltre si rischia un indirizzo troppo lungo. */
const ID_PER_RICHIESTA = 80;
const RUOLI_STAFF = ["titolare", "dt", "responsabile_area", "maestro", "segreteria"];

type EsitoQuery = { data: any; error: { message: string } | null }; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Legge una tabella a blocchi da 1000 righe (con un ordine stabile nella fabbrica) fino a `massimo` blocchi. */
export async function leggiPagine(fabbrica: (da: number, a: number) => PromiseLike<EsitoQuery>, errori: string[], nome: string, massimo = 25): Promise<Riga[]> {
  const out: Riga[] = [];
  for (let i = 0; i < massimo; i++) {
    const r = await fabbrica(i * BLOCCO, i * BLOCCO + BLOCCO - 1);
    if (r.error) { errori.push(`${nome}: ${r.error.message}`); break; }
    const righe = (r.data as Riga[] | null) ?? [];
    out.push(...righe);
    if (righe.length < BLOCCO) break;
  }
  return out;
}

/** Una richiesta per gruppo di id (in parallelo) al posto di un `in(...)` lunghissimo. */
async function perBlocchi(ids: string[], leggi: (blocco: string[]) => PromiseLike<Riga[]>): Promise<Riga[]> {
  const parti: Promise<Riga[]>[] = [];
  for (let i = 0; i < ids.length; i += ID_PER_RICHIESTA) parti.push(Promise.resolve(leggi(ids.slice(i, i + ID_PER_RICHIESTA))));
  return (await Promise.all(parti)).flat();
}

function meseCorrisponde(m: any, indice: number): boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (typeof m === "number") return m === indice + 1;
  const s = String(m ?? "").toLowerCase().trim();
  if (!s) return false;
  if (/^\d{1,2}$/.test(s)) return +s === indice + 1;
  const iso = /^\d{4}-(\d{2})/.exec(s);
  if (iso) return +iso[1] === indice + 1;
  return MESI[indice].startsWith(s.slice(0, 3));
}

/** Id del programma usato da più gruppi attivi (quello che dà il nome al periodo nella panoramica). */
function programmaPiuUsato(gruppi: GruppoB[]): string | null {
  const uso = new Map<string, number>();
  for (const g of gruppi) if (g.attivo !== false && g.programma_id) uso.set(g.programma_id, (uso.get(g.programma_id) ?? 0) + 1);
  return [...uso.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** "Novembre · Dritto · sett. 3 di 4" dal programma più usato dai gruppi attivi; vuoto se non c'è. */
function etichettaProgramma(prog: Riga | undefined, oggi: Date): string {
  if (!prog) return "";
  const mesi: Riga[] = Array.isArray(prog.mesi) ? prog.mesi : [];
  const voce = mesi.find((e) => meseCorrisponde(e?.mese, oggi.getMonth()));
  if (!voce) return "";
  const sett: any[] = Array.isArray(voce.settimane) ? voce.settimane : []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const w = Math.min(Math.max(sett.length, 1), Math.ceil(oggi.getDate() / 7));
  const tema = voce.colpo || voce.tema;
  return [maiuscola(MESI[oggi.getMonth()]), tema ? maiuscola(String(tema)) : "", sett.length ? `sett. ${w} di ${sett.length}` : ""].filter(Boolean).join(" · ");
}

export type OpzioniDati = {
  /** Solo la scheda di un maestro: si leggono i dati di quel maestro invece di quelli di tutto il centro. */
  maestroId?: string;
  /** Solo la panoramica: chiama `panoramica_centro` e salta la formazione (non serve a quella schermata). */
  panoramica?: boolean;
};

/** Riga di `riepilogo_maestri`. */
type RiepilogoMaestro = {
  membro_id: string; aderenza: number | null; lezioni_chiuse: number | null; allievi: number | null; valutazioni_mancanti: number | null;
  progressi: number | string | null; risposta_mediana_ore: number | string | null; messaggi_senza_risposta: number | null;
};
const num = (v: number | string | null | undefined): number | null => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export async function caricaDati(sb: SB, centroId: string, opz: OpzioniDati = {}): Promise<Dati> {
  const { maestroId } = opz;
  const conPanoramica = !!opz.panoramica && !maestroId;
  const conFormazione = !opz.panoramica;
  const errori: string[] = [];
  const oggi = isoGiorno(new Date());
  const C = (t: string) => sb.from(t);

  /* ---- primo tempo: tutto ciò che non dipende da altro, in parallelo ---- */
  const [membri, gruppi, gmR, riepilogoR, panR, lezioniR, corsi, formazione, segR] = await Promise.all([
    // solo lo staff: i genitori e gli allievi (migliaia) non servono
    q(C("membri").select("id,nome,cognome,ruolo,stato").eq("centro_id", centroId).in("ruolo", RUOLI_STAFF), errori, "membri") as Promise<MembroB[]>,
    q(C("gruppi").select("id,nome,giorni,ora,programma_id,attivo").eq("centro_id", centroId), errori, "gruppi") as Promise<GruppoB[]>,
    q(maestroId ? C("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centroId).eq("membro_id", maestroId) : C("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centroId), errori, "gruppi_maestri"),
    // una riga per maestro non sospeso: aderenza, lezioni, allievi, valutazioni mancanti, progressi, risposta in chat
    sb.rpc("riepilogo_maestri", { p_centro: centroId }),
    conPanoramica ? sb.rpc("panoramica_centro", { p_centro: centroId, p_giorno: oggi }) : Promise.resolve(null),
    // prossima lezione da osservare: solo le lezioni da fare, non tutto lo storico
    q((() => {
      const s = C("lezioni").select("id,gruppo_id,data,ora,campo_id,maestro_id,modello_id,stato").eq("centro_id", centroId).neq("stato", "chiusa").gte("data", oggi);
      return (maestroId ? s.eq("maestro_id", maestroId) : s).order("data", { ascending: true }).order("ora", { ascending: true }).limit(100);
    })(), errori, "lezioni") as Promise<LezioneB[]>,
    conFormazione ? q(C("corsi_formazione").select("id,titolo,obbligatorio,moduli").eq("centro_id", centroId).order("created_at", { ascending: true }), errori, "corsi_formazione") as Promise<CorsoB[]> : Promise.resolve([] as CorsoB[]),
    conFormazione
      ? leggiPagine((x, y) => {
          const s = C("formazione").select("id,corso_id,membro_id,moduli_fatti,certificato_il,scadenza").eq("centro_id", centroId);
          return (maestroId ? s.eq("membro_id", maestroId) : s).order("id").range(x, y);
        }, errori, "formazione") as Promise<FormazioneB[]>
      : Promise.resolve([] as FormazioneB[]),
    conPanoramica ? q(C("segnalazioni").select("id,priorita,stato,riguarda_dt").eq("centro_id", centroId).in("stato", ["nuova", "presa"]).limit(BLOCCO), errori, "segnalazioni") : Promise.resolve([] as Riga[]),
  ]);

  if (riepilogoR.error) errori.push(`riepilogo_maestri: ${riepilogoR.error.message}`);
  const riepilogo = ((riepilogoR.data as RiepilogoMaestro[] | null) ?? []);
  let panoramica: Panoramica | null = null;
  if (panR) {
    if (panR.error) errori.push(`panoramica_centro: ${panR.error.message}`);
    else panoramica = panR.data as Panoramica;
  }

  // programma più usato (per l'etichetta del periodo) e, per la scheda, ultime lezioni e allievi
  const idProgramma = programmaPiuUsato(gruppi);
  const [programmi, ultimeR, statR, test] = await Promise.all([
    idProgramma && (conPanoramica || maestroId) ? q(C("programmi").select("id,mesi").eq("centro_id", centroId).eq("id", idProgramma), errori, "programmi") : Promise.resolve([] as Riga[]),
    // ultime lezioni del maestro (fino a oggi): se ne prendono 24 per averne 12 chiuse anche con lezioni di oggi ancora da fare
    maestroId ? sb.rpc("ultime_lezioni_maestro", { p_centro: centroId, p_membro: maestroId, p_n: 24 }) : Promise.resolve(null),
    maestroId ? sb.rpc("statistiche_allievi_maestro", { p_membro: maestroId }) : Promise.resolve(null),
    maestroId ? ultimiTest(sb, centroId, errori) : Promise.resolve({ testCorrente: null as string | null, testPrecedente: null as string | null }),
  ]);
  const { testCorrente, testPrecedente } = test;

  if (ultimeR?.error) errori.push(`ultime_lezioni_maestro: ${ultimeR.error.message}`);
  if (statR?.error) errori.push(`statistiche_allievi_maestro: ${statR.error.message}`);
  const statAllievi = ((statR?.data as StatAllievo[] | null) ?? []);
  const righeUltime = ((ultimeR?.data as Riga[] | null) ?? []).filter((r) => r.stato === "chiusa").slice(0, 12);
  const idUltime = righeUltime.map((r) => r.lezione_id as string);

  // piano, svolto e motivi (jsonb pesanti) solo per le 12 lezioni della scheda
  const [dettagli, valutazioni] = await Promise.all([
    perBlocchi(idUltime, async (blocco) => {
      const r = await C("lezioni").select("id,gruppo_id,data,ora,campo_id,maestro_id,modello_id,stato,piano,svolto,motivi_scostamento").eq("centro_id", centroId).in("id", blocco);
      if (r.error) errori.push(`lezioni (piano): ${r.error.message}`);
      return (r.data as Riga[] | null) ?? [];
    }),
    // voti dei soli due test più recenti e dei soli allievi di questo maestro
    maestroId && testCorrente
      ? perBlocchi(statAllievi.map((s) => s.allievo_id), (blocco) =>
          leggiPagine((x, y) => C("valutazioni").select("allievo_id,test,colpo,voto").eq("centro_id", centroId).in("test", [testCorrente, testPrecedente].filter((v): v is string => !!v)).in("allievo_id", blocco).order("id").range(x, y), errori, "valutazioni"))
      : Promise.resolve([] as Riga[]),
  ]);
  const dettaglioDi = new Map(dettagli.map((d) => [d.id as string, d as LezioneB]));

  /* ---- per maestro ---- */
  const maestriMembri = membri.filter((m) => m.ruolo === "maestro" && m.stato === "attivo" && (!maestroId || m.id === maestroId));
  const rigaDi = new Map(riepilogo.map((r) => [r.membro_id, r]));
  const gruppiDi = new Map<string, Set<string>>();
  for (const x of gmR) {
    if (!gruppiDi.has(x.membro_id)) gruppiDi.set(x.membro_id, new Set());
    gruppiDi.get(x.membro_id)!.add(x.gruppo_id);
  }
  const formDi = new Map<string, FormazioneB>();
  for (const f of formazione) if (!formDi.has(`${f.corso_id}|${f.membro_id}`)) formDi.set(`${f.corso_id}|${f.membro_id}`, f);

  // dalla più vecchia alla più recente, come le mostra la scheda
  const ultime: LezioneAnalizzata[] = [...righeUltime].reverse().map((r) => {
    const base: LezioneB = dettaglioDi.get(r.lezione_id) ?? { id: r.lezione_id, gruppo_id: r.gruppo_id, data: r.data, ora: r.ora, campo_id: null, maestro_id: maestroId ?? null, modello_id: null, stato: r.stato, piano: null, svolto: null, motivi_scostamento: null };
    const a = analizzaLezione(base);
    // "fuori piano" lo decide il database (blocchi Bloccati non fatti); "sostituito" lo si vede solo dal confronto con il piano
    const fuoriDb = Number(r.blocchi_bloccati) > 0 && Number(r.blocchi_fatti) < Number(r.blocchi_bloccati);
    const esito: Esito = fuoriDb ? "fuori" : a.esito === "fuori" ? "piano" : a.esito;
    return { l: base, esito, cambi: a.cambi };
  });

  const maestri: MaestroStat[] = maestriMembri.map((m) => {
    const idsGruppi = gruppiDi.get(m.id) ?? new Set<string>();
    const gruppiM = gruppi.filter((g) => idsGruppi.has(g.id) && g.attivo !== false);
    const r = rigaDi.get(m.id);
    return {
      m, gruppi: gruppiM,
      etichetta: gruppiM.length ? etichettaGruppo(gruppiM[0]) + (gruppiM.length > 1 ? ` +${gruppiM.length - 1}` : "") : "",
      lezioniChiuse: r?.lezioni_chiuse ?? 0,
      ultime: maestroId ? ultime : [],
      nAllievi: r?.allievi ?? 0,
      allieviIds: maestroId ? statAllievi.map((s) => s.allievo_id) : [],
      aderenza: num(r?.aderenza),
      mancanti: r?.valutazioni_mancanti ?? 0,
      progressi: num(r?.progressi) == null ? null : Math.round(num(r?.progressi) as number),
      rispostaOre: num(r?.risposta_mediana_ore),
      senzaRisposta: r?.messaggi_senza_risposta ?? 0,
      formFatti: corsi.filter((c) => corsoCompletato(c, formDi.get(`${c.id}|${m.id}`))).length,
      formTot: corsi.length,
    };
  });

  // scheda: il totale storico delle lezioni chiuse (la RPC conta solo gli ultimi 30 giorni)
  if (maestroId && maestri[0]) {
    const cnt = await C("lezioni").select("id", { count: "exact", head: true }).eq("centro_id", centroId).eq("maestro_id", maestroId).eq("stato", "chiusa");
    if (cnt.error) errori.push(`lezioni (conteggio): ${cnt.error.message}`);
    else if (cnt.count != null) maestri[0].lezioniChiuse = cnt.count;
  }

  return {
    oggi, maestri, membri, gruppi, lezioni: lezioniR, panoramica, segnalazioni: segR, statAllievi,
    valutazioni, testCorrente, testPrecedente,
    rispostaMediana: mediana(maestri.map((m) => m.rispostaOre).filter((v): v is number => v != null)),
    programmaLabel: etichettaProgramma(programmi[0], leggiData(oggi)), corsi, formazione, errori,
  };
}

/** I due test più recenti (per data dell'ultimo voto). Due richieste da una riga l'una, non tutto lo storico dei voti. */
async function ultimiTest(sb: SB, centroId: string, errori: string[]): Promise<{ testCorrente: string | null; testPrecedente: string | null }> {
  const primo = await sb.from("valutazioni").select("test,data").eq("centro_id", centroId).order("data", { ascending: false }).limit(1);
  if (primo.error) { errori.push(`valutazioni: ${primo.error.message}`); return { testCorrente: null, testPrecedente: null }; }
  const testCorrente: string | null = (primo.data as Riga[] | null)?.[0]?.test ?? null;
  if (!testCorrente) return { testCorrente: null, testPrecedente: null };
  const secondo = await sb.from("valutazioni").select("test,data").eq("centro_id", centroId).neq("test", testCorrente).order("data", { ascending: false }).limit(1);
  if (secondo.error) errori.push(`valutazioni: ${secondo.error.message}`);
  return { testCorrente, testPrecedente: (secondo.data as Riga[] | null)?.[0]?.test ?? null };
}

export function useDatiMaestri(opz: OpzioniDati = {}) {
  const { centro, sb } = useCentro();
  const { maestroId, panoramica } = opz;
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState("");
  const [carica, setCarica] = useState(true);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setCarica(true);
    caricaDati(sb, centro.id, { maestroId, panoramica })
      .then((d) => { if (vivo) { setDati(d); setErrore(""); } })
      .catch((e) => { if (vivo) setErrore(String(e?.message ?? e)); })
      .finally(() => { if (vivo) setCarica(false); });
    return () => { vivo = false; };
  }, [sb, centro.id, maestroId, panoramica, n]);
  const ricarica = useCallback(() => setN((x) => x + 1), []);
  return { dati, errore, carica, ricarica };
}
