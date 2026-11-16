"use client";
// Caricamento unico dei dati dei maestri (C1, C2, C3): una sola serie di query in parallelo, poi tutti i calcoli
// (aderenza, risposta in chat, valutazioni mancanti, progressi) in locale. La RLS limita già ciò che si vede.
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

/** "Novembre · Dritto · sett. 3 di 4" dal programma più usato dai gruppi attivi; vuoto se non c'è. */
function etichettaProgramma(programmi: Riga[], gruppi: GruppoB[], oggi: Date): string {
  const uso = new Map<string, number>();
  for (const g of gruppi) if (g.attivo !== false && g.programma_id) uso.set(g.programma_id, (uso.get(g.programma_id) ?? 0) + 1);
  const best = [...uso.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const prog = programmi.find((p) => p.id === best);
  if (!prog) return "";
  const mesi: Riga[] = Array.isArray(prog.mesi) ? prog.mesi : [];
  const voce = mesi.find((e) => meseCorrisponde(e?.mese, oggi.getMonth()));
  if (!voce) return "";
  const sett: any[] = Array.isArray(voce.settimane) ? voce.settimane : [];
  const w = Math.min(Math.max(sett.length, 1), Math.ceil(oggi.getDate() / 7));
  const tema = voce.colpo || voce.tema;
  return [maiuscola(MESI[oggi.getMonth()]), tema ? maiuscola(String(tema)) : "", sett.length ? `sett. ${w} di ${sett.length}` : ""].filter(Boolean).join(" · ");
}

export async function caricaDati(sb: SB, centroId: string): Promise<Dati> {
  const errori: string[] = [];
  const adesso = new Date();
  const oggi = isoGiorno(adesso);
  const da = isoGiorno(aggiungiGiorni(oggi, -90));
  const a = isoGiorno(aggiungiGiorni(oggi, 14));
  const dal30 = isoGiorno(aggiungiGiorni(oggi, -30));
  const da60h = new Date(+adesso - 60 * 86400000).toISOString();
  const C = (t: string) => sb.from(t);

  const [membriR, gruppiR, gmR, iscR, lezR, valR, convR, partR, msgR, corsiR, formR, assR, segR, progR] = await Promise.all([
    q(C("membri").select("id,nome,cognome,ruolo,stato").eq("centro_id", centroId), errori, "membri"),
    q(C("gruppi").select("id,nome,giorni,ora,programma_id,attivo").eq("centro_id", centroId), errori, "gruppi"),
    q(C("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centroId), errori, "gruppi_maestri"),
    q(C("iscrizioni").select("allievo_id,gruppo_id,dal,al").eq("centro_id", centroId), errori, "iscrizioni"),
    q(C("lezioni").select("id,gruppo_id,data,ora,campo_id,maestro_id,modello_id,stato,piano,svolto,motivi_scostamento").eq("centro_id", centroId).gte("data", da).lte("data", a).order("data", { ascending: true }), errori, "lezioni"),
    q(C("valutazioni").select("allievo_id,maestro_id,test,colpo,voto,data").eq("centro_id", centroId).limit(5000), errori, "valutazioni"),
    q(C("conversazioni").select("id,tipo").eq("centro_id", centroId), errori, "conversazioni"),
    q(C("partecipanti").select("conversazione_id,membro_id").eq("centro_id", centroId), errori, "partecipanti"),
    q(C("messaggi").select("conversazione_id,autore_id,created_at").eq("centro_id", centroId).gte("created_at", da60h).order("created_at", { ascending: true }).limit(5000), errori, "messaggi"),
    q(C("corsi_formazione").select("id,titolo,obbligatorio,moduli").eq("centro_id", centroId).order("created_at", { ascending: true }), errori, "corsi_formazione"),
    q(C("formazione").select("id,corso_id,membro_id,moduli_fatti,certificato_il,scadenza").eq("centro_id", centroId), errori, "formazione"),
    q(C("assenze").select("allievo_id,data").eq("centro_id", centroId).gte("data", dal30), errori, "assenze"),
    q(C("segnalazioni").select("id,priorita,stato,riguarda_dt").eq("centro_id", centroId).in("stato", ["nuova", "presa"]), errori, "segnalazioni"),
    q(C("programmi").select("id,mesi").eq("centro_id", centroId), errori, "programmi"),
  ]);

  const membri = membriR as MembroB[];
  const gruppi = gruppiR as GruppoB[];
  const lezioni = lezR as LezioneB[];
  const corsi = corsiR as CorsoB[];
  const formazione = formR as FormazioneB[];

  // Presenze delle lezioni della settimana corrente (bastano per "oggi" e "settimana" di C1)
  const lunedi = isoGiorno(inizioSettimana(oggi));
  const domenica = isoGiorno(aggiungiGiorni(lunedi, 6));
  const idSettimana = lezioni.filter((l) => l.data >= lunedi && l.data <= domenica).map((l) => l.id);
  const presenze = idSettimana.length ? await q(C("presenze").select("lezione_id,presente").eq("centro_id", centroId).in("lezione_id", idSettimana), errori, "presenze") : [];

  /* ---- test di valutazione: i due più recenti ---- */
  const ultimaData = new Map<string, string>();
  for (const v of valR) if (v.test) ultimaData.set(v.test, String(v.data ?? "") > (ultimaData.get(v.test) ?? "") ? String(v.data ?? "") : ultimaData.get(v.test) ?? "");
  const test = [...ultimaData.entries()].sort((x, y) => (x[1] < y[1] ? 1 : -1)).map((e) => e[0]);
  const testCorrente = test[0] ?? null;
  const testPrecedente = test[1] ?? null;
  const mediaTest = (t: string | null, allievo: string) => {
    if (!t) return null;
    const n = valR.filter((v) => v.test === t && v.allievo_id === allievo && v.voto != null).map((v) => Number(v.voto));
    return n.length ? n.reduce((x, y) => x + y, 0) / n.length : null;
  };

  /* ---- chat: tempi di risposta e messaggi senza risposta da più di 48 ore ---- */
  const maestriMembri = membri.filter((m) => m.ruolo === "maestro" && m.stato === "attivo");
  const idMaestri = new Set(maestriMembri.map((m) => m.id));
  const ruoloDi = new Map(membri.map((m) => [m.id, m.ruolo]));
  const partDi = new Map<string, Set<string>>();
  for (const p of partR) {
    if (!partDi.has(p.conversazione_id)) partDi.set(p.conversazione_id, new Set());
    partDi.get(p.conversazione_id)!.add(p.membro_id);
  }
  const msgDi = new Map<string, Riga[]>();
  for (const m of msgR) {
    if (!msgDi.has(m.conversazione_id)) msgDi.set(m.conversazione_id, []);
    msgDi.get(m.conversazione_id)!.push(m);
  }
  const risposteMaestro = new Map<string, number[]>();
  const senzaRispostaMaestro = new Map<string, number>();
  const risposteOre: number[] = [];
  const LIMITE = 48 * 3600000;
  for (const c of convR) {
    // le chat di staff e quelle con la segreteria non misurano la risposta dei maestri
    if (c.tipo !== "allievo_maestro" && c.tipo !== "famiglia_maestro") continue;
    const masConv = [...(partDi.get(c.id) ?? [])].filter((id) => idMaestri.has(id));
    if (!masConv.length) continue;
    const msgs = msgDi.get(c.id) ?? [];
    for (let i = 0; i < msgs.length; i++) {
      const r = msgs[i];
      // si misurano solo le domande di famiglie e allievi
      const ruoloA = ruoloDi.get(r.autore_id);
      if (ruoloA !== "genitore" && ruoloA !== "allievo") continue;
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

  const maestri: MaestroStat[] = await Promise.all(
    maestriMembri.map(async (m) => {
      const idsGruppi = new Set(gmR.filter((x) => x.membro_id === m.id).map((x) => x.gruppo_id));
      const gruppiM = gruppi.filter((g) => idsGruppi.has(g.id) && g.attivo !== false);
      const allieviIds = tuttiIds(iscrizioniAttive.filter((i) => idsGruppi.has(i.gruppo_id)), "allievo_id");

      const chiuse = lezioni.filter((l) => l.maestro_id === m.id && l.stato === "chiusa");
      const ultime = chiuse.slice(-12).map((l) => ({ l, ...analizzaLezione(l) }));
      let aderenza = percentualeAderenza(ultime.map((u) => u.esito));
      // Se esiste la funzione del database (aderenza_maestro) vale lei: è la stessa cifra che vedono gli altri schermi.
      try {
        const r = await sb.rpc("aderenza_maestro", { membro: m.id });
        const v = typeof r.data === "number" ? r.data : r.data && typeof r.data === "object" ? Number((Array.isArray(r.data) ? r.data[0] : r.data).aderenza ?? NaN) : NaN;
        if (!r.error && Number.isFinite(v)) aderenza = Math.round(v > 0 && v <= 1 && !Number.isInteger(v) ? v * 100 : v);
      } catch { /* funzione assente: resta il calcolo locale */ }

      const cnt = await sb.from("lezioni").select("id", { count: "exact", head: true }).eq("centro_id", centroId).eq("maestro_id", m.id).eq("stato", "chiusa");

      const mancanti = testCorrente ? allieviIds.filter((id) => mediaTest(testCorrente, id) == null).length : 0;
      const coppie = allieviIds.map((id) => [mediaTest(testCorrente, id), mediaTest(testPrecedente, id)] as const).filter((c): c is readonly [number, number] => c[0] != null && c[1] != null && c[1] > 0);
      const progressi = coppie.length ? Math.round(((coppie.reduce((s, c) => s + c[0], 0) / coppie.reduce((s, c) => s + c[1], 0)) - 1) * 100) : null;

      const rm = mediana(risposteMaestro.get(m.id) ?? []);
      return {
        m, gruppi: gruppiM,
        etichetta: gruppiM.length ? etichettaGruppo(gruppiM[0]) + (gruppiM.length > 1 ? ` +${gruppiM.length - 1}` : "") : "",
        lezioniChiuse: cnt.count ?? chiuse.length,
        ultime, allieviIds, aderenza, mancanti, progressi, rispostaOre: rm,
        senzaRisposta: senzaRispostaMaestro.get(m.id) ?? 0,
        formFatti: corsi.filter((c) => corsoCompletato(c, formazione.find((f) => f.corso_id === c.id && f.membro_id === m.id))).length,
        formTot: corsi.length,
      };
    }),
  );

  return {
    oggi, maestri, membri, gruppi, lezioni, iscrizioni: iscrizioniAttive, presenze, assenze: assR, segnalazioni: segR,
    valutazioni: valR, testCorrente, testPrecedente, risposteOre,
    programmaLabel: etichettaProgramma(progR, gruppi, oggiD), corsi, formazione, errori,
  };
}

export function useDatiMaestri() {
  const { centro, sb } = useCentro();
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState("");
  const [carica, setCarica] = useState(true);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setCarica(true);
    caricaDati(sb, centro.id)
      .then((d) => { if (vivo) { setDati(d); setErrore(""); } })
      .catch((e) => { if (vivo) setErrore(String(e?.message ?? e)); })
      .finally(() => { if (vivo) setCarica(false); });
    return () => { vivo = false; };
  }, [sb, centro.id, n]);
  const ricarica = useCallback(() => setN((x) => x + 1), []);
  return { dati, errore, carica, ricarica };
}
