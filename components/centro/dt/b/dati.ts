"use client";
// Caricamento unico dei dati dei maestri (C1, C2, C3): query in parallelo e in due tempi, poi i calcoli (aderenza,
// risposta in chat, valutazioni mancanti, progressi) in locale. La RLS limita già ciò che si vede.
// Pensato per i grandi centri (1500 allievi, 25.000 lezioni, 400.000 presenze, 200.000 messaggi): PostgREST taglia in
// silenzio a 1000 righe, quindi ogni lettura che può superarle passa da `leggiPagine`; i filtri (date, iscrizioni
// attive, tipo di chat, test) si fanno nel database e le colonne pesanti (piano, svolto) si chiedono solo per le
// ultime 12 lezioni di ogni maestro. Gli aggregati veri (aderenza, medie dei test, tempi di risposta) andrebbero in RPC:
// vedi il rapporto della revisione "Scala".
import { useCallback, useEffect, useState } from "react";
import { useCentro, type SB } from "@/lib/centro/contesto";
import { aggiungiGiorni, inizioSettimana, isoGiorno, leggiData } from "@/lib/centro/date";
import {
  analizzaLezione, etichettaGruppo, maiuscola, mediana, percentualeAderenza,
  corsoCompletato,
  type CorsoB, type Esito, type Cambio, type FormazioneB, type GruppoB, type LezioneB, type MembroB, type Riga,
} from "./util";

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export type LezioneAnalizzata = { l: LezioneB; esito: Esito; cambi: Cambio[] };

export type MaestroStat = {
  m: MembroB;
  gruppi: GruppoB[];
  /** Gruppo principale in forma da mockup: "U12 Intermedio · mar-gio 17:00" (più gruppi: il primo e "+n"). */
  etichetta: string;
  lezioniChiuse: number;
  /** Ultime 12 lezioni chiuse, dalla più vecchia alla più recente. */
  ultime: LezioneAnalizzata[];
  allieviIds: string[];
  aderenza: number | null;
  /** Allievi senza valutazione nel test corrente. */
  mancanti: number;
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
  lezioni: LezioneB[];
  iscrizioni: Riga[];
  presenze: Riga[];
  assenze: Riga[];
  segnalazioni: Riga[];
  valutazioni: Riga[];
  testCorrente: string | null;
  testPrecedente: string | null;
  risposteOre: number[];
  programmaLabel: string;
  corsi: CorsoB[];
  formazione: FormazioneB[];
  errori: string[];
};

async function q(p: PromiseLike<{ data: any; error: { message: string } | null }>, errori: string[], nome: string): Promise<Riga[]> {
  const r = await p;
  if (r.error) errori.push(`${nome}: ${r.error.message}`);
  return (r.data as Riga[] | null) ?? [];
}

/** Righe per richiesta: è il tetto di PostgREST, oltre il quale le righe verrebbero tagliate senza errore. */
const BLOCCO = 1000;
/** Quanti id mettere in un `in(...)`: oltre si rischia un indirizzo troppo lungo. */
const ID_PER_RICHIESTA = 80;
const RUOLI_STAFF = ["titolare", "dt", "responsabile_area", "maestro", "segreteria"];
const TIPI_CHAT = ["allievo_maestro", "famiglia_maestro"];

type EsitoQuery = { data: any; error: { message: string } | null };

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

const tuttiIds = (v: Riga[], k: string) => Array.from(new Set(v.map((x) => x[k]).filter(Boolean))) as string[];

function meseCorrisponde(m: any, indice: number): boolean {
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
  const sett: any[] = Array.isArray(voce.settimane) ? voce.settimane : [];
  const w = Math.min(Math.max(sett.length, 1), Math.ceil(oggi.getDate() / 7));
  const tema = voce.colpo || voce.tema;
  return [maiuscola(MESI[oggi.getMonth()]), tema ? maiuscola(String(tema)) : "", sett.length ? `sett. ${w} di ${sett.length}` : ""].filter(Boolean).join(" · ");
}

export type OpzioniDati = {
  /** Solo la scheda di un maestro: si leggono i dati di quel maestro invece di quelli di tutto il centro. */
  maestroId?: string;
  /** Il totale storico delle lezioni chiuse costa una richiesta per maestro: serve solo alla lista e alla scheda. */
  conteggi?: boolean;
};

export async function caricaDati(sb: SB, centroId: string, opz: OpzioniDati = {}): Promise<Dati> {
  const { maestroId } = opz;
  const conteggi = opz.conteggi !== false;
  const errori: string[] = [];
  const adesso = new Date();
  const oggi = isoGiorno(adesso);
  const da = isoGiorno(aggiungiGiorni(oggi, -90));
  const a = isoGiorno(aggiungiGiorni(oggi, 14));
  const dal30 = isoGiorno(aggiungiGiorni(oggi, -30));
  const da60h = new Date(+adesso - 60 * 86400000).toISOString();
  const lunedi = isoGiorno(inizioSettimana(oggi));
  const domenica = isoGiorno(aggiungiGiorni(lunedi, 6));
  const C = (t: string) => sb.from(t);

  /* ---- primo tempo: tutto ciò che non dipende da altro ---- */
  const [membri, gruppi, gmR, lezR, corsi, formazione, assR, segR, test] = await Promise.all([
    // solo lo staff: i genitori e gli allievi (migliaia) non servono, di loro basta sapere che non sono staff
    q(C("membri").select("id,nome,cognome,ruolo,stato").eq("centro_id", centroId).in("ruolo", RUOLI_STAFF), errori, "membri") as Promise<MembroB[]>,
    q(C("gruppi").select("id,nome,giorni,ora,programma_id,attivo").eq("centro_id", centroId), errori, "gruppi") as Promise<GruppoB[]>,
    q(maestroId ? C("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centroId).eq("membro_id", maestroId) : C("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centroId), errori, "gruppi_maestri"),
    // senza piano/svolto/motivi (jsonb pesanti): quelli si leggono dopo, solo per le ultime 12 lezioni di ogni maestro
    leggiPagine((x, y) => {
      const s = C("lezioni").select("id,gruppo_id,data,ora,campo_id,maestro_id,modello_id,stato").eq("centro_id", centroId).gte("data", da).lte("data", a);
      return (maestroId ? s.eq("maestro_id", maestroId) : s).order("data", { ascending: true }).order("ora", { ascending: true }).order("id").range(x, y);
    }, errori, "lezioni") as Promise<LezioneB[]>,
    q(C("corsi_formazione").select("id,titolo,obbligatorio,moduli").eq("centro_id", centroId).order("created_at", { ascending: true }), errori, "corsi_formazione") as Promise<CorsoB[]>,
    leggiPagine((x, y) => {
      const s = C("formazione").select("id,corso_id,membro_id,moduli_fatti,certificato_il,scadenza").eq("centro_id", centroId);
      return (maestroId ? s.eq("membro_id", maestroId) : s).order("id").range(x, y);
    }, errori, "formazione") as Promise<FormazioneB[]>,
    maestroId ? Promise.resolve([] as Riga[]) : leggiPagine((x, y) => C("assenze").select("allievo_id,data").eq("centro_id", centroId).gte("data", dal30).order("data").order("id").range(x, y), errori, "assenze"),
    maestroId ? Promise.resolve([] as Riga[]) : q(C("segnalazioni").select("id,priorita,stato,riguarda_dt").eq("centro_id", centroId).in("stato", ["nuova", "presa"]).limit(BLOCCO), errori, "segnalazioni"),
    ultimiTest(sb, centroId, errori),
  ]);
  const { testCorrente, testPrecedente } = test;

  const maestriMembri = membri.filter((m) => m.ruolo === "maestro" && m.stato === "attivo" && (!maestroId || m.id === maestroId));
  const idMaestri = new Set(maestriMembri.map((m) => m.id));
  const staff = new Set(membri.map((m) => m.id));

  // gruppi (attivi) di ogni maestro, serve già qui per limitare le iscrizioni
  const gruppiDi = new Map<string, Set<string>>();
  for (const x of gmR) {
    if (!gruppiDi.has(x.membro_id)) gruppiDi.set(x.membro_id, new Set());
    gruppiDi.get(x.membro_id)!.add(x.gruppo_id);
  }
  const gruppiScheda = maestroId ? [...(gruppiDi.get(maestroId) ?? [])] : null;

  // le ultime 12 lezioni chiuse di ogni maestro (dalla più vecchia): sono le sole di cui servono piano e svolto
  const ultimeLezioni = new Map<string, LezioneB[]>();
  for (const m of maestriMembri) ultimeLezioni.set(m.id, lezR.filter((l) => l.maestro_id === m.id && l.stato === "chiusa").slice(-12));
  const idUltime = [...ultimeLezioni.values()].flat().map((l) => l.id);

  /* ---- secondo tempo: ciò che dipende dal primo, sempre in parallelo ---- */
  const iscrizioniP = !gruppiScheda || gruppiScheda.length
    ? leggiPagine((x, y) => {
        // iscrizioni attive oggi: il filtro sta nel database, lo storico di due anni non si scarica
        const s = C("iscrizioni").select("allievo_id,gruppo_id,dal,al").eq("centro_id", centroId).lte("dal", oggi).or(`al.is.null,al.gte.${oggi}`);
        return (gruppiScheda ? s.in("gruppo_id", gruppiScheda) : s).order("id").range(x, y);
      }, errori, "iscrizioni")
    : Promise.resolve([] as Riga[]);

  // voti dei soli due test più recenti (e, per la scheda, dei soli allievi del maestro)
  const valutazioniP = iscrizioniP.then(async (isc) => {
    const tests = [testCorrente, testPrecedente].filter((x): x is string => !!x);
    if (!tests.length) return [] as Riga[];
    if (!maestroId) {
      return leggiPagine((x, y) => C("valutazioni").select("allievo_id,test,colpo,voto").eq("centro_id", centroId).in("test", tests).order("id").range(x, y), errori, "valutazioni", 40);
    }
    return perBlocchi(tuttiIds(isc, "allievo_id"), (blocco) =>
      leggiPagine((x, y) => C("valutazioni").select("allievo_id,test,colpo,voto").eq("centro_id", centroId).in("test", tests).in("allievo_id", blocco).order("id").range(x, y), errori, "valutazioni"));
  });

  // presenze della settimana corrente (bastano per "oggi" e "settimana" di C1): il filtro per data passa dalla lezione
  const presenzeP = maestroId
    ? Promise.resolve([] as Riga[])
    : leggiPagine((x, y) => C("presenze").select("lezione_id,presente,lezioni!inner(data)").eq("centro_id", centroId).gte("lezioni.data", lunedi).lte("lezioni.data", domenica).order("id").range(x, y), errori, "presenze");

  const dettagliP = perBlocchi(idUltime, async (blocco) => {
    const r = await C("lezioni").select("id,piano,svolto,motivi_scostamento").eq("centro_id", centroId).in("id", blocco);
    if (r.error) errori.push(`lezioni (piano): ${r.error.message}`);
    return (r.data as Riga[] | null) ?? [];
  });

  const chatP = leggiChat(sb, centroId, [...idMaestri], maestroId, da60h, errori);

  const idProgramma = programmaPiuUsato(gruppi);
  const programmaP = idProgramma ? q(C("programmi").select("id,mesi").eq("centro_id", centroId).eq("id", idProgramma), errori, "programmi") : Promise.resolve([] as Riga[]);

  const [iscR, valR, presenze, dettagli, chat, progR] = await Promise.all([iscrizioniP, valutazioniP, presenzeP, dettagliP, chatP, programmaP]);

  const dettaglioDi = new Map(dettagli.map((d) => [d.id as string, d]));
  const lezioni: LezioneB[] = lezR.map((l) => {
    const d = dettaglioDi.get(l.id);
    return d ? { ...l, piano: d.piano, svolto: d.svolto, motivi_scostamento: d.motivi_scostamento } : l;
  });
  const lezioneDi = new Map(lezioni.map((l) => [l.id, l]));

  /* ---- medie dei test: costruite una volta sola, non rifiltrando tutte le righe per ogni allievo ---- */
  const somme = new Map<string, Map<string, [number, number]>>();
  for (const v of valR) {
    if (!v.test || v.voto == null) continue;
    const perAllievo = somme.get(v.test) ?? somme.set(v.test, new Map()).get(v.test)!;
    const c = perAllievo.get(v.allievo_id) ?? [0, 0];
    perAllievo.set(v.allievo_id, [c[0] + Number(v.voto), c[1] + 1]);
  }
  const mediaTest = (t: string | null, allievo: string) => {
    const c = t ? somme.get(t)?.get(allievo) : undefined;
    return c && c[1] ? c[0] / c[1] : null;
  };

  /* ---- chat: tempi di risposta e messaggi senza risposta da più di 48 ore ---- */
  const msgDi = new Map<string, Riga[]>();
  for (const m of chat.messaggi) {
    if (!msgDi.has(m.conversazione_id)) msgDi.set(m.conversazione_id, []);
    msgDi.get(m.conversazione_id)!.push(m);
  }
  const risposteMaestro = new Map<string, number[]>();
  const senzaRispostaMaestro = new Map<string, number>();
  const risposteOre: number[] = [];
  const LIMITE = 48 * 3600000;
  for (const [convId, masConv] of chat.maestriDi) {
    const msgs = msgDi.get(convId) ?? [];
    for (let i = 0; i < msgs.length; i++) {
      const r = msgs[i];
      // si misurano solo le domande di famiglie e allievi: chi è staff non conta
      if (staff.has(r.autore_id)) continue;
      const t0 = +new Date(r.created_at);
      const risp = msgs.slice(i + 1).find((x) => idMaestri.has(x.autore_id) && masConv.includes(x.autore_id));
      if (risp) {
        const ore = (+new Date(risp.created_at) - t0) / 3600000;
        risposteOre.push(ore);
        (risposteMaestro.get(risp.autore_id) ?? risposteMaestro.set(risp.autore_id, []).get(risp.autore_id)!).push(ore);
      } else if (+adesso - t0 > LIMITE) {
        for (const id of masConv) senzaRispostaMaestro.set(id, (senzaRispostaMaestro.get(id) ?? 0) + 1);
      }
    }
  }

  /* ---- per maestro ---- */
  const oggiD = leggiData(oggi);
  const attiva = (i: Riga) => (!i.dal || i.dal <= oggi) && (!i.al || i.al >= oggi);
  const iscrizioniAttive = iscR.filter(attiva);
  const iscrizioniPerGruppo = new Map<string, Riga[]>();
  for (const i of iscrizioniAttive) (iscrizioniPerGruppo.get(i.gruppo_id) ?? iscrizioniPerGruppo.set(i.gruppo_id, []).get(i.gruppo_id)!).push(i);
  const formDi = new Map<string, FormazioneB>();
  for (const f of formazione) if (!formDi.has(`${f.corso_id}|${f.membro_id}`)) formDi.set(`${f.corso_id}|${f.membro_id}`, f);

  const maestri: MaestroStat[] = await Promise.all(
    maestriMembri.map(async (m) => {
      const idsGruppi = gruppiDi.get(m.id) ?? new Set<string>();
      const gruppiM = gruppi.filter((g) => idsGruppi.has(g.id) && g.attivo !== false);
      const allieviIds = tuttiIds([...idsGruppi].flatMap((g) => iscrizioniPerGruppo.get(g) ?? []), "allievo_id");

      const chiuse = ultimeLezioni.get(m.id) ?? [];
      const ultime = chiuse.map((l) => ({ l: lezioneDi.get(l.id) ?? l, ...analizzaLezione(lezioneDi.get(l.id) ?? l) }));
      let aderenza = percentualeAderenza(ultime.map((u) => u.esito));

      // Le due richieste per maestro partono insieme (non una dopo l'altra). Servirebbe una RPC unica per tutto il centro.
      const [rpc, cnt] = await Promise.all([
        // Se esiste la funzione del database (aderenza_maestro) vale lei: è la stessa cifra che vedono gli altri schermi.
        Promise.resolve(sb.rpc("aderenza_maestro", { membro: m.id })).catch(() => null),
        conteggi ? C("lezioni").select("id", { count: "exact", head: true }).eq("centro_id", centroId).eq("maestro_id", m.id).eq("stato", "chiusa") : Promise.resolve(null),
      ]);
      if (rpc && !rpc.error) {
        const v = typeof rpc.data === "number" ? rpc.data : rpc.data && typeof rpc.data === "object" ? Number((Array.isArray(rpc.data) ? rpc.data[0] : rpc.data).aderenza ?? NaN) : NaN;
        if (Number.isFinite(v)) aderenza = Math.round(v > 0 && v <= 1 && !Number.isInteger(v) ? v * 100 : v);
      }

      const mancanti = testCorrente ? allieviIds.filter((id) => mediaTest(testCorrente, id) == null).length : 0;
      const coppie = allieviIds.map((id) => [mediaTest(testCorrente, id), mediaTest(testPrecedente, id)] as const).filter((c): c is readonly [number, number] => c[0] != null && c[1] != null && c[1] > 0);
      const progressi = coppie.length ? Math.round(((coppie.reduce((s, c) => s + c[0], 0) / coppie.reduce((s, c) => s + c[1], 0)) - 1) * 100) : null;

      const rm = mediana(risposteMaestro.get(m.id) ?? []);
      return {
        m, gruppi: gruppiM,
        etichetta: gruppiM.length ? etichettaGruppo(gruppiM[0]) + (gruppiM.length > 1 ? ` +${gruppiM.length - 1}` : "") : "",
        lezioniChiuse: cnt?.count ?? lezR.filter((l) => l.maestro_id === m.id && l.stato === "chiusa").length,
        ultime, allieviIds, aderenza, mancanti, progressi, rispostaOre: rm,
        senzaRisposta: senzaRispostaMaestro.get(m.id) ?? 0,
        formFatti: corsi.filter((c) => corsoCompletato(c, formDi.get(`${c.id}|${m.id}`))).length,
        formTot: corsi.length,
      };
    }),
  );

  return {
    oggi, maestri, membri, gruppi, lezioni, iscrizioni: iscrizioniAttive, presenze, assenze: assR, segnalazioni: segR,
    valutazioni: valR, testCorrente, testPrecedente, risposteOre,
    programmaLabel: etichettaProgramma(progR[0], oggiD), corsi, formazione, errori,
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

/**
 * Chat tra famiglie/allievi e maestri degli ultimi 60 giorni.
 * - `maestriDi`: per ogni conversazione di quei due tipi, i maestri che vi partecipano (solo quelle con almeno un maestro);
 * - `messaggi`: i messaggi, dal più vecchio al più recente. Si leggono dal più recente, così un eventuale tetto taglia
 *   i vecchi e non i messaggi senza risposta di oggi.
 */
async function leggiChat(sb: SB, centroId: string, idMaestri: string[], maestroId: string | undefined, da60h: string, errori: string[]): Promise<{ maestriDi: Map<string, string[]>; messaggi: Riga[] }> {
  const vuoto = { maestriDi: new Map<string, string[]>(), messaggi: [] as Riga[] };
  if (!idMaestri.length) return vuoto;
  const C = (t: string) => sb.from(t);
  const part = await perBlocchi(idMaestri, (blocco) =>
    leggiPagine((x, y) => C("partecipanti").select("conversazione_id,membro_id,conversazioni!inner(tipo)").eq("centro_id", centroId).in("membro_id", blocco).in("conversazioni.tipo", TIPI_CHAT).order("id").range(x, y), errori, "partecipanti"));
  const maestriDi = new Map<string, string[]>();
  for (const p of part) (maestriDi.get(p.conversazione_id) ?? maestriDi.set(p.conversazione_id, []).get(p.conversazione_id)!).push(p.membro_id);
  if (!maestriDi.size) return vuoto;

  const ordine = (s: any) => s.order("created_at", { ascending: false }).order("id");
  const messaggi = maestroId
    ? await perBlocchi([...maestriDi.keys()], (blocco) =>
        leggiPagine((x, y) => ordine(C("messaggi").select("conversazione_id,autore_id,created_at").eq("centro_id", centroId).gte("created_at", da60h).in("conversazione_id", blocco)).range(x, y), errori, "messaggi", 15))
    // tutto il centro: il filtro sul tipo di conversazione si fa con il join, senza elencare migliaia di id nell'indirizzo
    : await leggiPagine((x, y) => ordine(C("messaggi").select("conversazione_id,autore_id,created_at,conversazioni!inner(tipo)").eq("centro_id", centroId).gte("created_at", da60h).in("conversazioni.tipo", TIPI_CHAT)).range(x, y), errori, "messaggi", 15);
  messaggi.sort((p, q2) => (p.created_at < q2.created_at ? -1 : p.created_at > q2.created_at ? 1 : 0));
  return { maestriDi, messaggi };
}

export function useDatiMaestri(opz: OpzioniDati = {}) {
  const { centro, sb } = useCentro();
  const { maestroId, conteggi } = opz;
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState("");
  const [carica, setCarica] = useState(true);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setCarica(true);
    caricaDati(sb, centro.id, { maestroId, conteggi })
      .then((d) => { if (vivo) { setDati(d); setErrore(""); } })
      .catch((e) => { if (vivo) setErrore(String(e?.message ?? e)); })
      .finally(() => { if (vivo) setCarica(false); });
    return () => { vivo = false; };
  }, [sb, centro.id, maestroId, conteggi, n]);
  const ricarica = useCallback(() => setN((x) => x + 1), []);
  return { dati, errore, carica, ricarica };
}
