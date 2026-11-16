"use client";
// Lettura condivisa dell'organizzazione del centro (aree, campi, gruppi, maestri, allievi, cambi campo, permessi)
// e funzioni pure per orari, conflitti e programma. Le usano tutte le schermate dell'area D.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCentro, type SB } from "@/lib/centro/contesto";
import type { Membro } from "@/lib/centro/tipi-base";
import { aggiungiGiorni, fmtOra, giornoSettimana, isoGiorno } from "@/lib/centro/date";
import type {
  AreaR, CambioCampoR, CampoR, GruppoMaestroR, GruppoR, IscrizioneR, PermessiArea, PermessoRuoloR, PresenzaL, ProgrammaR, ValutazioneL,
} from "./tipi";

// ───────── colori e nomi ─────────
export const COLORI_AREA = ["#4CD07D", "#3D8BFF", "#FF9F43", "#FF5A5F", "#B58CFF", "#2FC4C4", "#FFD54A"];
export const FASCE = ["U8", "U10", "U12", "U14", "U16", "U18", "Adulti", "Agonisti"];

export const nomeCompleto = (m: { nome: string; cognome?: string | null }) => [m.nome, m.cognome].filter(Boolean).join(" ");
/** "G. Sala": iniziale del nome e cognome, per le celle strette. */
export const nomeBreve = (m: { nome: string; cognome?: string | null }) => (m.cognome ? `${m.nome.charAt(0)}. ${m.cognome}` : m.nome);
/** Nome corto come nei mockup ("Marco R." per gli allievi). */
export const nomeAllievo = (a: { nome: string; cognome?: string | null }) => (a.cognome ? `${a.nome} ${a.cognome.charAt(0)}.` : a.nome);
export const iniziali = (m: { nome: string; cognome?: string | null }) => ((m.nome.charAt(0) || "") + (m.cognome?.charAt(0) || m.nome.split(" ")[1]?.charAt(0) || "")).toUpperCase();

const SFONDI = ["#2A6C4C", "#3E5D8A", "#A65A2E", "#7A4FA8", "#8A3E6C", "#2A6C6C", "#8A4E3E", "#5A4E8A", "#6C7A2A"];
/** Stesso colore per la stessa persona, ovunque. */
export function coloreNome(s: string): string {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SFONDI[h % SFONDI.length];
}

// ───────── orari e conflitti ─────────
export const minutiDa = (ora: string | null | undefined): number | null => {
  const o = fmtOra(ora ?? null);
  if (!o) return null;
  const [h, m] = o.split(":").map(Number);
  return h * 60 + m;
};

export type Posto = { gruppo: GruppoR; campoId: string | null; da: number; a: number; cambio: CambioCampoR | null };

/** Dove si allena davvero un gruppo in una data: il cambio campo di quel giorno vince sul campo abituale. */
export function postiDelGiorno(gruppi: GruppoR[], cambi: CambioCampoR[], iso: string): Posto[] {
  const dow = giornoSettimana(iso);
  const out: Posto[] = [];
  for (const g of gruppi) {
    if (!g.attivo || !g.giorni?.includes(dow)) continue;
    const da = minutiDa(g.ora);
    if (da === null) continue;
    const cambio = cambi.find((c) => c.gruppo_id === g.id && c.data === iso) ?? null;
    out.push({ gruppo: g, campoId: cambio ? cambio.campo_a : g.campo_id, da, a: da + (g.durata_min || 60), cambio });
  }
  return out.sort((x, y) => x.da - y.da);
}

const sovrapposti = (x: Posto, y: Posto) => x.da < y.a && y.da < x.a;

export type Conflitto = { tipo: "campo" | "maestro"; a: Posto; b: Posto };
export function conflittiPosti(posti: Posto[], gm: GruppoMaestroR[]): Conflitto[] {
  const out: Conflitto[] = [];
  for (let i = 0; i < posti.length; i++) {
    for (let j = i + 1; j < posti.length; j++) {
      const x = posti[i], y = posti[j];
      if (!sovrapposti(x, y)) continue;
      if (x.campoId && x.campoId === y.campoId) out.push({ tipo: "campo", a: x, b: y });
      const mx = gm.filter((r) => r.gruppo_id === x.gruppo.id).map((r) => r.membro_id);
      if (gm.some((r) => r.gruppo_id === y.gruppo.id && mx.includes(r.membro_id))) out.push({ tipo: "maestro", a: x, b: y });
    }
  }
  return out;
}

/** Il campo è fermo quel giorno: stato del campo, oppure un cambio con motivo "manutenzione" che parte da lui (vale solo per quella data). */
export function inManutenzione(campo: CampoR, cambi: CambioCampoR[], iso: string): boolean {
  if (campo.stato !== "disponibile") return true;
  return cambi.some((c) => c.data === iso && c.campo_da === campo.id && (c.motivo ?? "").toLowerCase().startsWith("manut"));
}

export type EsitoCambio = { ok: boolean; chiave: "noLezione" | "nonDisponibile" | "soloMini" | "occupato" | "stesso" | "libero" | "nessunCampo"; a?: string; b?: string };
/** Controllo dei conflitti prima di un cambio campo (lo ripete poi la funzione cambia_campo sul database). */
export function controllaCambio(p: { gruppo: GruppoR | undefined; iso: string; campo: CampoR | undefined; campi: CampoR[]; gruppi: GruppoR[]; cambi: CambioCampoR[] }): EsitoCambio {
  const { gruppo, iso, campo, campi, gruppi, cambi } = p;
  if (!gruppo || !campo) return { ok: false, chiave: "nessunCampo" };
  if (!gruppo.giorni?.includes(giornoSettimana(iso))) return { ok: false, chiave: "noLezione", a: gruppo.nome };
  if (campo.stato !== "disponibile") return { ok: false, chiave: "nonDisponibile", a: String(campo.numero) };
  if (/mini/i.test(campo.nome ?? "") && !["U8", "U10"].includes(gruppo.fascia ?? "")) return { ok: false, chiave: "soloMini", a: String(campo.numero) };
  const senza = cambi.filter((c) => !(c.gruppo_id === gruppo.id && c.data === iso));
  const miei = postiDelGiorno([gruppo], [], iso)[0];
  const altro = postiDelGiorno(gruppi.filter((g) => g.id !== gruppo.id), senza, iso).find((o) => o.campoId === campo.id && miei && sovrapposti(miei, o));
  if (altro) return { ok: false, chiave: "occupato", a: String(campo.numero), b: altro.gruppo.nome };
  if (campo.id === gruppo.campo_id) return { ok: true, chiave: "stesso" };
  return { ok: true, chiave: "libero", a: String(campo.numero), b: fmtOra(gruppo.ora) };
}

// ───────── programma del gruppo ─────────
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
/** Voce del mese corrente del programma (mese come numero 1-12 o come nome). */
export function meseProgramma(p: ProgrammaR | undefined, oggi: Date = new Date()) {
  if (!p || !Array.isArray(p.mesi)) return null;
  const m = oggi.getMonth();
  return (
    p.mesi.find((x) => {
      const v = x?.mese;
      if (typeof v === "number") return v === m + 1;
      if (typeof v === "string") return v.toLowerCase().startsWith(MESI[m].slice(0, 3)) || v === String(m + 1);
      return false;
    }) ?? null
  );
}
/** "settimana 3 di 4" dal giorno del mese. */
export function settimanaProgramma(p: ProgrammaR | undefined, oggi: Date = new Date()): { n: number; tot: number } | null {
  const voce = meseProgramma(p, oggi);
  if (!p) return null;
  const tot = Array.isArray(voce?.settimane) && voce.settimane.length ? voce.settimane.length : 4;
  return { n: Math.min(tot, Math.ceil(oggi.getDate() / 7)), tot };
}

// ───────── permessi dell'area ─────────
export const PERMESSI_BASE: Required<Pick<PermessiArea, "gruppi" | "campi" | "maestri" | "avvisi" | "iscrizioni" | "pagamenti">> = {
  gruppi: true, campi: true, maestri: true, avvisi: true, iscrizioni: true, pagamenti: false,
};
export const CHIAVI_PERMESSI = ["gruppi", "campi", "maestri", "avvisi", "iscrizioni", "metodo", "tutela", "pagamenti"] as const;
export type ChiavePermesso = (typeof CHIAVI_PERMESSI)[number];
export function permessiDi(righe: PermessoRuoloR[], areaId: string): PermessiArea {
  const r = righe.find((x) => x.area_id === areaId);
  return { ...PERMESSI_BASE, metodo: "lettura", tutela: false, ...(r?.permessi ?? {}) };
}

// ───────── lettura a blocchi, ricerca e colonne ─────────
// Regole di docs/CENTRI.md, sezione "Scala": colonne esplicite, liste a blocchi di 50, ricerca sul server con debounce di 300 ms.
/** Righe per pagina nelle liste lunghe ("carica altri"). */
export const PAGINA = 50;
/** Attesa prima di interrogare il database mentre si scrive nella ricerca. */
export const DEBOUNCE_MS = 300;
/** Il database risponde con al massimo 1000 righe per richiesta, in silenzio: oltre si legge a blocchi. */
const BLOCCO = 1000;

export const COL_AREA = "id,centro_id,nome,sigla,fasce,ordine";
export const COL_CAMPO = "id,centro_id,numero,nome,superficie,copertura,luci,stato,note,x,y,w,h";
export const COL_GRUPPO = "id,centro_id,area_id,nome,fascia,livello,giorni,ora,durata_min,campo_id,programma_id,attivo";
export const COL_GRUPPO_MAESTRO = "id,centro_id,gruppo_id,membro_id,principale";
export const COL_MEMBRO = "id,centro_id,user_id,ruolo,nome,cognome,email,telefono,area_id,stato,created_at";
export const COL_ISCRIZIONE = "id,centro_id,allievo_id,gruppo_id,dal,al";
export const COL_CAMBIO = "id,centro_id,gruppo_id,data,campo_da,campo_a,motivo,deciso_da,avvisa,created_at";
export const COL_PERMESSI = "id,centro_id,area_id,permessi";
export const COL_PROGRAMMA = "id,centro_id,nome,fascia,schema,anno,mesi";
export const COL_ALLIEVO_LISTA = "id,nome,cognome,data_nascita,certificato_scade";
export const COL_INVITO = "id,centro_id,codice,ruolo,gruppo_id,area_id,allievo_id,scade_il,usi_max,usi,created_at";
/** Ruoli che l'organizzazione usa davvero: i genitori (migliaia) si leggono solo nella scheda dell'allievo. */
export const RUOLI_STAFF = ["titolare", "dt", "responsabile_area", "maestro", "segreteria"];

type Risposta = { data: unknown; error: { message: string } | null; count?: number | null };

/**
 * Legge tutte le righe di una query a blocchi di 1000. Il primo blocco chiede anche il totale: gli altri partono insieme,
 * così 18.000 presenze costano due viaggi e non diciotto uno dopo l'altro.
 */
export async function tuttePagine<T>(pagina: (da: number, a: number, conta: boolean) => PromiseLike<Risposta>): Promise<{ righe: T[]; errore: string | null }> {
  const primo = await pagina(0, BLOCCO - 1, true);
  if (primo.error) return { righe: [], errore: primo.error.message };
  const righe = [...((primo.data ?? []) as T[])];
  const totale = primo.count ?? righe.length;
  if (righe.length < BLOCCO || totale <= BLOCCO) return { righe, errore: null };
  const altri = await Promise.all(
    Array.from({ length: Math.ceil(totale / BLOCCO) - 1 }, (_, i) => pagina((i + 1) * BLOCCO, (i + 2) * BLOCCO - 1, false)),
  );
  for (const r of altri) {
    if (r.error) return { righe: [], errore: r.error.message };
    righe.push(...((r.data ?? []) as T[]));
  }
  return { righe, errore: null };
}

/** Il testo scritto nella ricerca senza i caratteri che nei filtri del database hanno un significato (virgole, parentesi, %). */
export const pulisciRicerca = (s: string) => s.replace(/[%_,()\\*"]/g, " ").replace(/\s+/g, " ").trim();

/** Valore che arriva alla ricerca solo dopo 300 ms senza altri tasti. */
export function useDebounce<T>(valore: T, ms: number = DEBOUNCE_MS): T {
  const [v, setV] = useState(valore);
  useEffect(() => {
    const id = window.setTimeout(() => setV(valore), ms);
    return () => window.clearTimeout(id);
  }, [valore, ms]);
  return v;
}

// ───────── aggregati dal database ─────────
// I numeri delle dashboard (allievi attivi, presenze, in ritardo, allievi per gruppo) li calcola il database con le RPC di
// docs/RPC.md, sezione Aggregati: il client non scarica presenze né valutazioni per contarle.
export type RiepilogoAllievi = { attivi: number; presenze_mese_perc: number | null; in_ritardo: number; assenze_ripetute: number };
export type RigaConteggioGruppo = { gruppo_id: string; n_allievi: number };

/** Il colpo si scrive nel database com'è (es. "Dritto", "Volée", "Gioco di gambe"): le RPC lo confrontano per uguaglianza. */
export const COLPI_DB = { dritto: "Dritto", rovescio: "Rovescio", servizio: "Servizio", volee: "Volée", gambe: "Gioco di gambe" } as const;

/**
 * Conteggi dell'organizzazione calcolati dal database: allievi attivi per gruppo (`conteggi_gruppi`) e riepilogo
 * (`allievi_riepilogo`, con `p_colpo` per i "in ritardo"). Si rileggono quando cambia `dati` (dopo ogni modifica).
 */
export function useConteggi(sb: SB, centroId: string, aree: string[] | null, dati: unknown, colpo: string | null = null) {
  const [x, setX] = useState<{ chiave: string; perGruppo: Map<string, number>; riepilogo: RiepilogoAllievi } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const chiave = `${centroId}|${aree?.join(",") ?? "*"}|${colpo ?? ""}`;
  useEffect(() => {
    if (!dati) return;
    let vivo = true;
    (async () => {
      const [c, r] = await Promise.all([
        sb.rpc("conteggi_gruppi", { p_centro: centroId, p_aree: aree }),
        sb.rpc("allievi_riepilogo", { p_centro: centroId, p_aree: aree, p_colpo: colpo }),
      ]);
      if (!vivo) return;
      const err = c.error ?? r.error;
      if (err) { setErrore(err.message); return; }
      setErrore(null);
      const perGruppo = new Map<string, number>(((c.data ?? []) as RigaConteggioGruppo[]).map((g) => [g.gruppo_id, g.n_allievi]));
      setX({ chiave, perGruppo, riepilogo: r.data as RiepilogoAllievi });
    })();
    return () => { vivo = false; };
    // `aree` è un array nuovo a ogni render: la chiave testuale lo rappresenta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, centroId, chiave, dati]);
  // finché non arrivano i numeri della selezione corrente non si mostrano quelli di un'altra
  const pronto = x && x.chiave === chiave ? x : null;
  return { perGruppo: pronto?.perGruppo ?? null, riepilogo: pronto?.riepilogo ?? null, errore };
}

// ───────── lettura dei dati ─────────
/**
 * Solo ciò che è piccolo e serve a tutte le schermate. Gli allievi (1500 per centro) e le famiglie (2000) NON si caricano qui:
 * ogni schermata li legge a pagine, o solo quelli che mostra. `iscrizioni` contiene le sole iscrizioni in corso;
 * `membri` solo il personale (i genitori si leggono nella scheda dell'allievo).
 */
export type DatiOrg = {
  aree: AreaR[]; campi: CampoR[]; gruppi: GruppoR[]; gm: GruppoMaestroR[]; membri: Membro[];
  iscrizioni: IscrizioneR[]; cambi: CambioCampoR[]; permessi: PermessoRuoloR[]; programmi: ProgrammaR[];
};

/**
 * Carica l'organizzazione del centro e la restringe all'area quando la pagina è aperta da un responsabile d'area
 * (o con ?area=<id>). La RLS già limita ciò che il database restituisce: il filtro qui serve a mostrare solo l'area scelta.
 */
export function useOrg() {
  const { centro, sb, membroAttivo, ruolo } = useCentro();
  const sp = useSearchParams();
  const [dati, setDati] = useState<DatiOrg | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setErrore(null);
    const da = isoGiorno(aggiungiGiorni(new Date(), -30));
    const oggiIso = isoGiorno();
    const q = (t: string, colonne: string) => sb.from(t).select(colonne).eq("centro_id", centro.id);
    const [aree, campi, gruppi, gm, membri, isc, cambi, permessi, programmi] = await Promise.all([
      q("aree", COL_AREA).order("ordine"), q("campi", COL_CAMPO).order("numero"), q("gruppi", COL_GRUPPO), q("gruppi_maestri", COL_GRUPPO_MAESTRO),
      q("membri", COL_MEMBRO).in("ruolo", RUOLI_STAFF),
      // solo le iscrizioni in corso (la storia non serve alle schermate), a blocchi perché oltre 1000 righe il database taglia
      tuttePagine<IscrizioneR>((x, y, conta) => sb.from("iscrizioni").select(COL_ISCRIZIONE, conta ? { count: "exact" } : undefined)
        .eq("centro_id", centro.id).or(`al.is.null,al.gte.${oggiIso}`).order("id").range(x, y)),
      q("cambi_campo", COL_CAMBIO).gte("data", da), q("permessi_ruolo", COL_PERMESSI), q("programmi", COL_PROGRAMMA),
    ]);
    // aree, campi, gruppi e membri sono indispensabili; il resto, se manca o non è leggibile, si mostra vuoto
    const grave = [aree, campi, gruppi, membri].find((r) => r.error);
    if (grave?.error) { setErrore(grave.error.message); return; }
    setDati({
      aree: (aree.data ?? []) as unknown as AreaR[], campi: (campi.data ?? []) as unknown as CampoR[], gruppi: (gruppi.data ?? []) as unknown as GruppoR[],
      gm: (gm.data ?? []) as unknown as GruppoMaestroR[], membri: (membri.data ?? []) as unknown as Membro[], iscrizioni: isc.errore ? [] : isc.righe,
      cambi: (cambi.data ?? []) as unknown as CambioCampoR[], permessi: (permessi.data ?? []) as unknown as PermessoRuoloR[], programmi: (programmi.data ?? []) as unknown as ProgrammaR[],
    });
  }, [sb, centro.id]);

  useEffect(() => { void carica(); }, [carica]);

  const oggi = isoGiorno();
  const eResp = ruolo === "responsabile_area";
  const isDT = ruolo === "dt" || ruolo === "titolare";

  const derivati = useMemo(() => {
    const d = dati;
    if (!d) return null;
    // un responsabile può guidare più aree (Marco Ferri: SAT e Pre-accademia): sono righe diverse di `membri` della stessa persona
    const io = membroAttivo;
    const stessa = (m: Membro) => !!io && (io.user_id ? m.user_id === io.user_id : m.nome === io.nome && (m.cognome ?? "") === (io.cognome ?? ""));
    const areeMie = eResp
      ? d.membri.filter((m) => m.ruolo === "responsabile_area" && m.area_id && stessa(m)).map((m) => m.area_id as string)
      : [];
    const daUrl = sp.get("area");
    let ids: string[] | null = null;
    if (eResp) ids = daUrl && areeMie.includes(daUrl) ? [daUrl] : areeMie;
    else if (daUrl) ids = [daUrl];

    const gruppiVis = ids ? d.gruppi.filter((g) => g.area_id && ids.includes(g.area_id)) : d.gruppi;
    const idGruppi = new Set(gruppiVis.map((g) => g.id));
    // `d.iscrizioni` contiene già solo quelle in corso; il controllo sulla data copre la pagina rimasta aperta oltre la mezzanotte
    const attive = d.iscrizioni.filter((i) => !i.al || i.al >= oggi);
    const iscrAttive = ids ? attive.filter((i) => idGruppi.has(i.gruppo_id)) : attive;
    // campi dell'area: quelli dove si allenano i suoi gruppi (abituali o per un cambio)
    const idCampi = new Set<string>();
    gruppiVis.forEach((g) => { if (g.campo_id) idCampi.add(g.campo_id); });
    d.cambi.filter((c) => idGruppi.has(c.gruppo_id)).forEach((c) => { if (c.campo_a) idCampi.add(c.campo_a); if (c.campo_da) idCampi.add(c.campo_da); });
    const campiVis = ids ? d.campi.filter((c) => idCampi.has(c.id)) : d.campi;
    const areaPrincipale = ids?.[0] ?? null;
    return { areeMie, ids, gruppiVis, iscrAttive, campiVis, areaPrincipale };
  }, [dati, membroAttivo, eResp, sp, oggi]);

  /** Chi può cambiare cosa: direzione sempre; il responsabile solo se il permesso della sua area è acceso. */
  const can = useCallback(
    (chiave: ChiavePermesso, areaId?: string | null): boolean => {
      if (isDT) return true;
      if (!eResp || !dati || !derivati) return false;
      const a = areaId ?? derivati.areaPrincipale;
      if (!a || !derivati.areeMie.includes(a)) return false;
      return permessiDi(dati.permessi, a)[chiave] === true;
    },
    [isDT, eResp, dati, derivati],
  );

  const registra = useCallback(
    async (azione: string, oggetto: string, dettagli: Record<string, unknown> = {}) => {
      // il registro è un di più: se la scrittura fallisce la modifica resta valida
      await sb.from("registro").insert({ centro_id: centro.id, membro_id: membroAttivo?.id ?? null, azione, oggetto, dettagli });
    },
    [sb, centro.id, membroAttivo],
  );

  return { centro, sb, membroAttivo, ruolo, eResp, isDT, oggi, dati, errore, carica, can, registra, ...(derivati ?? { areeMie: [] as string[], ids: null as string[] | null, gruppiVis: [] as GruppoR[], iscrAttive: [] as IscrizioneR[], campiVis: [] as CampoR[], areaPrincipale: null as string | null }) };
}
export type Org = ReturnType<typeof useOrg>;

// ───────── funzioni di consultazione ─────────
export const areaDi = (d: DatiOrg, id: string | null) => d.aree.find((a) => a.id === id);
export const colorePerArea = (d: DatiOrg, id: string | null) => COLORI_AREA[Math.max(0, d.aree.findIndex((a) => a.id === id)) % COLORI_AREA.length];
/** Maestri del gruppo, il principale per primo. */
export function maestriDi(d: DatiOrg, gruppoId: string): Membro[] {
  return d.gm
    .filter((r) => r.gruppo_id === gruppoId)
    .sort((a, b) => Number(b.principale) - Number(a.principale))
    .map((r) => d.membri.find((m) => m.id === r.membro_id))
    .filter((m): m is Membro => !!m);
}
export const campoEtichetta = (c: CampoR | undefined) => (c ? String(c.numero) : "");
export const allieviDelGruppo = (iscr: IscrizioneR[], gruppoId: string): string[] => [...new Set(iscr.filter((i) => i.gruppo_id === gruppoId).map((i) => i.allievo_id))];
export const sostituisci = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** "U8-U12" se le fasce sono tutte Uxx, altrimenti l'elenco. */
export function fasceTesto(fasce: string[] | null | undefined): string {
  if (!fasce?.length) return "";
  if (fasce.length >= 2 && fasce.every((f) => /^U\d+$/.test(f))) return `${fasce[0]}-${fasce[fasce.length - 1]}`;
  return fasce.join(" · ");
}

// ───────── codici di invito ─────────
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // senza 0/O e 1/I: si dettano al telefono
export function nuovoCodice(): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join("");
}
