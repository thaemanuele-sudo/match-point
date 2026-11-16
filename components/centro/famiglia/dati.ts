"use client";
// Dati condivisi dalle schermate di genitori e allievi: figli, gruppo, maestri, campo e programma.
// I tipi sono locali e minimi (solo le colonne lette qui) con gli stessi nomi snake_case del database.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCentro } from "@/lib/centro/contesto";
import { isoGiorno, prossimeLezioni, aggiungiGiorni, fmtOra } from "@/lib/centro/date";
import { trovaCampo, type RValutazione } from "./util";

export type RAllievo = {
  id: string; nome: string; cognome: string | null; data_nascita: string | null; membro_id: string | null;
  note_mediche: string | null; certificato_scade: string | null;
};
export type RGruppo = {
  id: string; nome: string; fascia: string | null; livello: string | null; giorni: number[] | null; ora: string | null;
  durata_min: number | null; campo_id: string | null; programma_id: string | null; attivo: boolean | null; area_id: string | null;
};
export type RCampo = { id: string; numero: number; nome: string | null; superficie: string | null; copertura: string | null; luci: boolean | null; stato: string | null };
export type RProgramma = { id: string; nome: string; fascia: string | null; anno: number | null; mesi: unknown; settimane_test: string[] | null };
export type RMembroBreve = { id: string; nome: string; cognome: string | null; ruolo: string };
export type RCambio = { id: string; gruppo_id: string; data: string; campo_da: string | null; campo_a: string | null; motivo: string | null };
export type RLezione = {
  id: string; gruppo_id: string; data: string; ora: string | null; campo_id: string | null; maestro_id: string | null;
  stato: string; riassunto: string | null; riassunto_ok: boolean | null; compito: string | null;
};

export type Figlio = {
  allievo: RAllievo;
  gruppo: RGruppo | null;
  maestri: RMembroBreve[];
  programma: RProgramma | null;
};

export const nomeCompleto = (p: { nome: string; cognome: string | null }) => [p.nome, p.cognome].filter(Boolean).join(" ");
/** "Tommaso R." come nei mockup: nome e iniziale del cognome. */
export const nomeBreve = (p: { nome: string; cognome: string | null }) => (p.cognome ? `${p.nome} ${p.cognome.charAt(0)}.` : p.nome);

export function maestroPrincipale(f: Figlio): RMembroBreve | null {
  return f.maestri[0] ?? null;
}

const chiaveFiglio = (centroId: string) => `mp-figlio-${centroId}`;

// Colonne esplicite: allievi, gruppi e lezioni sono tabelle grandi, niente select('*')
const COL_ALLIEVO = "id,nome,cognome,data_nascita,membro_id,note_mediche,certificato_scade";
const COL_GRUPPO = "id,nome,fascia,livello,giorni,ora,durata_min,campo_id,programma_id,attivo,area_id";
const COL_CAMPO = "id,numero,nome,superficie,copertura,luci,stato";
const COL_PROGRAMMA = "id,nome,fascia,anno,mesi,settimane_test";
/** Colonne di `lezioni` e `cambi_campo` lette dalle schermate della famiglia (stesse dei tipi RLezione e RCambio). */
export const COL_LEZIONE = "id,gruppo_id,data,ora,campo_id,maestro_id,stato,riassunto,riassunto_ok,compito";
export const COL_CAMBIO = "id,gruppo_id,data,campo_da,campo_a,motivo";

// ---------- cache di modulo ----------
// Home, Calendario, Progressi, Report, Compiti, Percorso e Figli usano tutte useFigli: senza cache ogni cambio di
// schermata rifaceva da capo la catena di sei letture. Ora una lettura ogni FRESCO_MS per centro e membro.
const FRESCO_MS = 60_000;
type FigliCaricati = { figli: Figlio[]; campi: RCampo[] };
const cacheFigli = new Map<string, { dati: FigliCaricati; quando: number }>();
const figliInVolo = new Map<string, Promise<FigliCaricati>>();
const cacheCampi = new Map<string, { campi: RCampo[]; quando: number }>();
const CAMPI_FRESCHI_MS = 5 * 60_000;
type Letto<T> = { data: T[] | null; error: { message: string } | null };
/** Aspetta una query di Supabase dandole il tipo delle righe (le query sono "thenable", non Promise vere). */
const leggi = async <T,>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Letto<T>> => {
  const r = await q;
  return { data: (r.data ?? null) as T[] | null, error: r.error };
};

/** Dopo una modifica che cambia figli, gruppi o iscrizioni: la prossima lettura va al database. */
export function invalidaFigli(): void {
  cacheFigli.clear();
  cacheCampi.clear();
}

async function campiDelCentro(sb: SupabaseClient, centroId: string): Promise<RCampo[]> {
  const c = cacheCampi.get(centroId);
  if (c && Date.now() - c.quando < CAMPI_FRESCHI_MS) return c.campi;
  const r = await sb.from("campi").select(COL_CAMPO).eq("centro_id", centroId).order("numero", { ascending: true });
  const campi = (r.data ?? []) as RCampo[];
  if (!r.error) cacheCampi.set(centroId, { campi, quando: Date.now() });
  return campi;
}

async function leggiFigli(sb: SupabaseClient, centroId: string, ma: { id: string }, modo: "famiglia" | "allievo"): Promise<FigliCaricati> {
  // i campi non dipendono da nulla: si leggono in parallelo con gli allievi
  const campiP = campiDelCentro(sb, centroId);
  // 1) gli allievi: il proprio profilo (account del ragazzo, allievi.membro_id) e, se non c'è, i figli (allievi_famiglie):
  //    un genitore che usa la Modalità ragazzo sul suo telefono entra nelle pagine dell'allievo con i dati dei figli
  let allievi: RAllievo[] = [];
  if (modo === "allievo") {
    const r = await sb.from("allievi").select(COL_ALLIEVO).eq("centro_id", centroId).eq("membro_id", ma.id);
    if (r.error) throw new Error(r.error.message);
    allievi = (r.data ?? []) as RAllievo[];
  }
  if (!allievi.length) {
    const fam = await sb.from("allievi_famiglie").select("allievo_id").eq("centro_id", centroId).eq("membro_id", ma.id);
    if (fam.error) throw new Error(fam.error.message);
    const ids = [...new Set((fam.data ?? []).map((x: { allievo_id: string }) => x.allievo_id))];
    if (ids.length) {
      const r = await sb.from("allievi").select(COL_ALLIEVO).eq("centro_id", centroId).in("id", ids).order("data_nascita", { ascending: true });
      if (r.error) throw new Error(r.error.message);
      allievi = (r.data ?? []) as RAllievo[];
    }
  }
  if (!allievi.length) return { figli: [], campi: await campiP };
  const idAll = allievi.map((a) => a.id);
  // 2) iscrizione in corso (al vuoto o futuro), la più recente per allievo: il filtro sulle date lo fa il database,
  //    non si scarica più tutto lo storico delle iscrizioni
  const oggi = isoGiorno();
  const isc = await sb.from("iscrizioni").select("allievo_id,gruppo_id,dal,al").eq("centro_id", centroId).in("allievo_id", idAll).or(`al.is.null,al.gte.${oggi}`).order("dal", { ascending: false });
  const gruppoDi = new Map<string, string>();
  for (const i of (isc.data ?? []) as { allievo_id: string; gruppo_id: string }[]) {
    if (!gruppoDi.has(i.allievo_id)) gruppoDi.set(i.allievo_id, i.gruppo_id);
  }
  const idGr = [...new Set(gruppoDi.values())];
  let gruppi: RGruppo[] = [];
  let programmi: RProgramma[] = [];
  let maestri: { gruppo_id: string; membro_id: string; principale: boolean | null }[] = [];
  let membri: RMembroBreve[] = [];
  if (idGr.length) {
    // gruppi e maestri in parallelo; poi programmi e nomi dei maestri, di nuovo in parallelo
    const [g, gm] = await Promise.all([
      leggi<RGruppo>(sb.from("gruppi").select(COL_GRUPPO).eq("centro_id", centroId).in("id", idGr)),
      leggi<(typeof maestri)[number]>(sb.from("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centroId).in("gruppo_id", idGr)),
    ]);
    gruppi = g.data ?? [];
    maestri = gm.data ?? [];
    const idPr = [...new Set(gruppi.map((x) => x.programma_id).filter(Boolean))] as string[];
    const idM = [...new Set(maestri.map((x) => x.membro_id))];
    const [p, m] = await Promise.all([
      idPr.length ? leggi<RProgramma>(sb.from("programmi").select(COL_PROGRAMMA).eq("centro_id", centroId).in("id", idPr)) : Promise.resolve<Letto<RProgramma>>({ data: [], error: null }),
      // se la RLS non lascia leggere i membri, i nomi mancano e le schermate ripiegano su "il maestro"
      idM.length ? leggi<RMembroBreve>(sb.from("membri").select("id,nome,cognome,ruolo").in("id", idM)) : Promise.resolve<Letto<RMembroBreve>>({ data: [], error: null }),
    ]);
    programmi = p.data ?? [];
    membri = m.data ?? [];
  }
  const gruppoPerId = new Map(gruppi.map((g) => [g.id, g]));
  const programmaPerId = new Map(programmi.map((p) => [p.id, p]));
  const membroPerId = new Map(membri.map((m) => [m.id, m]));
  const figli: Figlio[] = allievi.map((a) => {
    const g = gruppoPerId.get(gruppoDi.get(a.id) ?? "") ?? null;
    const ms = g
      ? maestri
          .filter((x) => x.gruppo_id === g.id)
          .sort((x, y) => Number(!!y.principale) - Number(!!x.principale))
          .map((x) => membroPerId.get(x.membro_id))
          .filter(Boolean) as RMembroBreve[]
      : [];
    return { allievo: a, gruppo: g, maestri: ms, programma: (g?.programma_id ? programmaPerId.get(g.programma_id) : null) ?? null };
  });
  return { figli, campi: await campiP };
}

/**
 * Figli del genitore (o l'allievo stesso, per le pagine dell'allievo) con gruppo, maestri e programma.
 * Usa sempre il membro "attivo" (vistaCome ?? membro), mai auth.uid(): così il titolare può vedere come un genitore.
 */
export function useFigli(modo: "famiglia" | "allievo" = "famiglia") {
  const { centro, membroAttivo: ma, sb } = useCentro();
  const chiave = ma ? `${centro.id}|${ma.id}|${modo}` : "";
  const inCache = chiave ? cacheFigli.get(chiave) : undefined;
  const [figli, setFigli] = useState<Figlio[]>(() => inCache?.dati.figli ?? []);
  const [campi, setCampi] = useState<RCampo[]>(() => inCache?.dati.campi ?? []);
  const [caricamento, setCaricamento] = useState(!inCache);
  const [errore, setErrore] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);

  // una ricarica esplicita (dopo aver aggiunto un figlio, cambiato un gruppo...) salta la cache
  const ricarica = useCallback(() => { invalidaFigli(); setGiro((g) => g + 1); }, []);

  useEffect(() => {
    let vivo = true;
    if (!ma) {
      setFigli([]);
      setCaricamento(false);
      return;
    }
    setErrore(null);
    const k = `${centro.id}|${ma.id}|${modo}`;
    const c = cacheFigli.get(k);
    if (c && Date.now() - c.quando < FRESCO_MS) {
      setFigli(c.dati.figli);
      setCampi(c.dati.campi);
      setCaricamento(false);
      return;
    }
    // una sola lettura per chiave anche se due schermate la chiedono insieme
    let p = figliInVolo.get(k);
    if (!p) {
      p = leggiFigli(sb, centro.id, ma, modo).then((dati) => { cacheFigli.set(k, { dati, quando: Date.now() }); return dati; });
      figliInVolo.set(k, p);
      void p.then(() => figliInVolo.delete(k), () => figliInVolo.delete(k));
    }
    p.then((dati) => {
      if (!vivo) return;
      setFigli(dati.figli);
      setCampi(dati.campi);
      setCaricamento(false);
    }).catch((e: unknown) => {
      if (vivo) { setErrore(e instanceof Error ? e.message : String(e)); setCaricamento(false); }
    });
    return () => { vivo = false; };
  }, [centro.id, ma?.id, modo, sb, giro]); // eslint-disable-line react-hooks/exhaustive-deps

  // il figlio scelto si ricorda per la sessione (stesso figlio in Home, Calendario, Progressi…)
  useEffect(() => {
    if (!figli.length) return;
    let salvato: string | null = null;
    try { salvato = sessionStorage.getItem(chiaveFiglio(centro.id)); } catch { /* storage non disponibile */ }
    setSelId((cur) => (cur && figli.some((f) => f.allievo.id === cur) ? cur : figli.find((f) => f.allievo.id === salvato)?.allievo.id ?? figli[0].allievo.id));
  }, [figli, centro.id]);

  const scegli = useCallback((id: string) => {
    setSelId(id);
    try { sessionStorage.setItem(chiaveFiglio(centro.id), id); } catch { /* ok */ }
  }, [centro.id]);

  const figlio = useMemo(() => figli.find((f) => f.allievo.id === selId) ?? figli[0] ?? null, [figli, selId]);
  return { figli, figlio, scegli, campi, caricamento, errore, ricarica, ma };
}

/** Lezione dell'agenda: calcolata da giorni e orario del gruppo, arricchita dalla riga in `lezioni` e dai cambi campo. */
export type VoceLezione = {
  data: string;
  ora: string;
  campo: RCampo | null;
  campoOriginale: RCampo | null;
  cambiato: boolean;
  motivoCambio: string | null;
  lezione: RLezione | null;
};

/**
 * Elenco delle lezioni di un gruppo tra due date: quelle del calendario settimanale più le righe vere di `lezioni`
 * (recuperi e lezioni fuori orario). Il campo effettivo considera sempre i cambi campo di quella data.
 */
export function agendaLezioni(
  gruppo: RGruppo, campi: RCampo[], dal: Date, giorni: number, cambi: RCambio[], righe: RLezione[], oggiPassato: boolean,
): VoceLezione[] {
  const calc = prossimeLezioni([gruppo], { da: dal, giorniAvanti: giorni, max: 400, includiOggiPassato: oggiPassato });
  const perData = new Map(righe.map((r) => [r.data, r]));
  const voci: VoceLezione[] = calc.map((c) => ({ data: c.data, ora: c.ora, ...risolviCampo(gruppo, campi, c.data, cambi, perData.get(c.data) ?? null) }));
  const fine = isoGiorno(aggiungiGiorni(dal, giorni));
  const inizio = isoGiorno(dal);
  for (const r of righe) {
    if (r.data < inizio || r.data > fine || voci.some((v) => v.data === r.data)) continue;
    voci.push({ data: r.data, ora: fmtOra(r.ora) || fmtOra(gruppo.ora), ...risolviCampo(gruppo, campi, r.data, cambi, r) });
  }
  return voci.sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
}

function risolviCampo(g: RGruppo, campi: RCampo[], data: string, cambi: RCambio[], lez: RLezione | null) {
  const abituale = trovaCampo(lez?.campo_id ?? g.campo_id, campi);
  const cambio = cambi.find((c) => c.gruppo_id === g.id && c.data === data);
  const nuovo = cambio ? trovaCampo(cambio.campo_a, campi) : null;
  const originale = cambio ? trovaCampo(cambio.campo_da, campi) ?? abituale : abituale;
  return {
    campo: nuovo ?? abituale,
    campoOriginale: originale,
    cambiato: !!(cambio && nuovo && originale && nuovo.id !== originale.id),
    motivoCambio: cambio?.motivo ?? null,
    lezione: lez,
  };
}

// ---------- valutazioni di un allievo (Home, Progressi e Percorso leggono le stesse righe) ----------
const cacheVal = new Map<string, { righe: RValutazione[]; quando: number }>();
const valInVolo = new Map<string, Promise<RValutazione[]>>();

/**
 * Ultime 500 valutazioni di un allievo, con una lettura sola ogni minuto anche se Home, Progressi e Percorso la chiedono
 * una dopo l'altra. Lancia l'errore del database, così le schermate lo mostrano come prima.
 */
export function valutazioniAllievo(sb: SupabaseClient, centroId: string, allievoId: string): Promise<RValutazione[]> {
  const k = `${centroId}|${allievoId}`;
  const c = cacheVal.get(k);
  if (c && Date.now() - c.quando < FRESCO_MS) return Promise.resolve(c.righe);
  const gia = valInVolo.get(k);
  if (gia) return gia;
  const p = (async () => {
    const x = await sb.from("valutazioni").select("colpo,competenza,voto,test,data").eq("centro_id", centroId).eq("allievo_id", allievoId).order("data", { ascending: false }).limit(500);
    if (x.error) throw new Error(x.error.message);
    const righe = (x.data ?? []) as RValutazione[];
    cacheVal.set(k, { righe, quando: Date.now() });
    return righe;
  })().finally(() => { valInVolo.delete(k); });
  valInVolo.set(k, p);
  return p;
}
