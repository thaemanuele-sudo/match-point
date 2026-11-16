// Funzioni pure dell'area G (famiglia e allievo): niente React, niente Supabase, così sono facili da controllare.
import type { SupabaseClient } from "@supabase/supabase-js";
import { aggiungiGiorni, isoGiorno, leggiData } from "@/lib/centro/date";

export const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/** Sostituisce {nome} nelle frasi del dizionario: i testi restano interi e traducibili. */
export function fmt(testo: string, v: Record<string, string | number>): string {
  return testo.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : ""));
}

export const maiuscola = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "gioco_di_gambe" → "Gioco di gambe": i colpi nel database possono essere slug. */
export function nomeColpo(s: string | null | undefined): string {
  return maiuscola((s ?? "").replace(/[_-]+/g, " ").trim());
}

export const nomeMese = (m: number) => maiuscola(MESI_LUNGHI[(m + 12) % 12] ?? "");

/** "2026-11" di una data. */
export const chiaveMese = (d: string | Date) => isoGiorno(leggiData(d)).slice(0, 7);

/** Primo giorno del mese "2026-11" come Date locale. */
export function inizioMese(chiave: string): Date {
  const [a, m] = chiave.split("-").map(Number);
  return new Date(a, m - 1, 1);
}
export const fineMese = (chiave: string): Date => {
  const i = inizioMese(chiave);
  return new Date(i.getFullYear(), i.getMonth() + 1, 0);
};

/** Percentuale 0-100 da un voto 1-5. */
export const pct = (voto: number) => Math.round((voto / 5) * 100);

export function eta(dataNascita: string | null | undefined, oggi: Date = new Date()): number | null {
  if (!dataNascita) return null;
  const n = leggiData(dataNascita);
  if (isNaN(+n)) return null;
  let a = oggi.getFullYear() - n.getFullYear();
  if (oggi.getMonth() < n.getMonth() || (oggi.getMonth() === n.getMonth() && oggi.getDate() < n.getDate())) a--;
  return a;
}

/** Mese (0-11) da un valore del programma: numero 1-12, "2026-11", "novembre", "nov". */
export function meseDaValore(v: unknown): number | null {
  if (typeof v === "number" && v >= 1 && v <= 12) return v - 1;
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  const iso = /^(\d{4})-(\d{1,2})/.exec(s);
  if (iso) return +iso[2] - 1;
  const mi = /^(\d{1,2})[-/](\d{4})$/.exec(s);
  if (mi) return +mi[1] - 1;
  if (/^\d{1,2}$/.test(s)) return +s >= 1 && +s <= 12 ? +s - 1 : null;
  const i = MESI_BREVI.findIndex((b) => s.startsWith(b));
  return i >= 0 ? i : null;
}

type MesePrg = { mese?: unknown; tema?: string; colpo?: string; settimane?: { tema?: string; modello_id?: string | null }[] };

export type TemaMese = { tema: string; colpo: string; settimana: number; totale: number; mese: number };

/**
 * Tema del mese e settimana corrente dal programma del gruppo. La settimana è il blocco di 7 giorni del mese
 * (1-7, 8-14, …): il 16 novembre è la settimana 3 di 4, come nel seed.
 */
export function temaDelMese(mesi: unknown, data: Date = new Date()): TemaMese | null {
  if (!Array.isArray(mesi)) return null;
  const m = (mesi as MesePrg[]).find((x) => meseDaValore(x?.mese) === data.getMonth());
  if (!m) return null;
  const totale = Math.max(m.settimane?.length || 0, 4);
  const settimana = Math.min(Math.floor((data.getDate() - 1) / 7) + 1, totale);
  const tema = (m.tema || m.colpo || "").trim();
  return { tema, colpo: (m.colpo || m.tema || "").trim(), settimana, totale, mese: data.getMonth() };
}

/** Prime/ultime date di una "settimana" 1..totale del mese corrente: [dal, al] in iso. */
export function intervalloSettimana(anno: number, mese: number, settimana: number, totale: number): [string, string] {
  const dal = new Date(anno, mese, (settimana - 1) * 7 + 1);
  const ultimo = new Date(anno, mese + 1, 0).getDate();
  const al = new Date(anno, mese, settimana >= totale ? ultimo : Math.min(settimana * 7, ultimo));
  return [isoGiorno(dal), isoGiorno(al)];
}

/**
 * Interpreta una voce di programmi.settimane_test: data intera ("2026-10-05"), mese ("2026-10", "ott", "ottobre").
 * Il formato non è fissato dal contratto, quindi si accetta tutto ciò che si capisce e si ignora il resto.
 */
export function dataTest(v: string, annoPredefinito: number): { data: string; mese: boolean } | null {
  const s = v.trim().toLowerCase();
  const pieno = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (pieno) return { data: `${pieno[1]}-${pieno[2]}-${pieno[3]}`, mese: false };
  const m = meseDaValore(s);
  if (m === null) return null;
  const a = /(\d{4})/.exec(s)?.[1];
  const anno = a ? +a : annoPredefinito;
  return { data: isoGiorno(new Date(anno, m, 1)), mese: true };
}

/** Etichetta di un periodo: ["2026-08-20", "2026-10-02"] → "ago-ott"; un solo mese → "ott". */
export function etichettaPeriodo(date: string[]): string {
  if (!date.length) return "";
  const ord = [...date].sort();
  const a = leggiData(ord[0]).getMonth();
  const b = leggiData(ord[ord.length - 1]).getMonth();
  return a === b ? MESI_BREVI[a] : `${MESI_BREVI[a]}-${MESI_BREVI[b]}`;
}

export type RValutazione = { colpo: string; competenza: string | null; voto: number; test: string | null; data: string };

export type CompetenzaColpo = { nome: string; voto: number; prima: number | null };
export type RigaColpo = {
  colpo: string;
  /** Percentuale attuale (media del test più recente per quel colpo). */
  ora: number;
  /** Percentuale nei 3 mesi precedenti, se esiste. */
  prima: number | null;
  delta: number | null;
  periodoPrima: string;
  competenze: CompetenzaColpo[];
  /** Data dell'ultima valutazione di quel colpo. */
  ultima: string;
};

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/**
 * Confronto per colpo tra il test più recente e i 3 mesi precedenti ("confronto trimestre").
 * Un colpo senza valutazioni precedenti compare lo stesso, senza differenza.
 */
export function calcolaColpi(vals: RValutazione[]): RigaColpo[] {
  const perColpo = new Map<string, RValutazione[]>();
  for (const v of vals) {
    if (typeof v.voto !== "number" || !v.colpo) continue;
    const k = v.colpo.toLowerCase();
    perColpo.set(k, [...(perColpo.get(k) || []), v]);
  }
  const righe: RigaColpo[] = [];
  for (const [colpo, vs] of perColpo) {
    // "test" raggruppa le valutazioni; senza test, ogni data è un test a sé
    const gruppi = new Map<string, RValutazione[]>();
    for (const v of vs) {
      const k = v.test || v.data;
      gruppi.set(k, [...(gruppi.get(k) || []), v]);
    }
    const ordinati = [...gruppi.values()].sort((a, b) => b[0].data.localeCompare(a[0].data));
    const attuale = ordinati[0];
    const dataAttuale = attuale.map((x) => x.data).sort();
    const inizio = dataAttuale[0];
    const fine = dataAttuale[dataAttuale.length - 1];
    const limite = isoGiorno(aggiungiGiorni(fine, -92));
    const precedenti = vs.filter((x) => x.data < inizio && x.data >= limite);
    // una riga per competenza: voto attuale e voto precedente (media) della stessa competenza
    const nomi = [...new Set(attuale.map((x) => x.competenza || colpo))];
    const competenze: CompetenzaColpo[] = nomi.map((n) => {
      const ora = media(attuale.filter((x) => (x.competenza || colpo) === n).map((x) => x.voto));
      const pr = precedenti.filter((x) => (x.competenza || colpo) === n).map((x) => x.voto);
      return { nome: n, voto: Math.round(ora * 10) / 10, prima: pr.length ? Math.round(media(pr) * 10) / 10 : null };
    });
    const ora = pct(media(attuale.map((x) => x.voto)));
    const prima = precedenti.length ? pct(media(precedenti.map((x) => x.voto))) : null;
    righe.push({
      colpo, ora, prima, delta: prima === null ? null : ora - prima,
      periodoPrima: etichettaPeriodo(precedenti.map((x) => x.data)), competenze, ultima: fine,
    });
  }
  return righe.sort((a, b) => b.ora - a.ora);
}

/** Cerca un campo per id oppure, se il valore è un numero, per numero del campo (i cambi campo possono usare entrambi). */
export function trovaCampo<C extends { id: string; numero: number }>(rif: string | null | undefined, campi: C[]): C | null {
  if (!rif) return null;
  return campi.find((c) => c.id === rif) ?? campi.find((c) => String(c.numero) === String(rif)) ?? null;
}

/** Nome leggibile del campo: "Campo 3" oppure "Campo 1 · Centrale". */
export function nomeCampo(c: { numero: number; nome: string | null } | null | undefined): string {
  if (!c) return "";
  const base = `Campo ${c.numero}`;
  return c.nome && c.nome.toLowerCase() !== base.toLowerCase() ? `${base} · ${c.nome}` : base;
}

/**
 * Le RPC del contratto sono elencate con i nomi dei parametri senza prefisso (es. avvisa_assenza(allievo, data, …)).
 * Se il database li chiama p_allievo, p_data… la prima chiamata fallisce con PGRST202: si riprova col prefisso.
 */
export async function rpcTollerante(sb: SupabaseClient, nome: string, args: Record<string, unknown>) {
  let r = await sb.rpc(nome, args);
  if (r.error && (r.error.code === "PGRST202" || /could not find the function/i.test(r.error.message))) {
    const conPrefisso = Object.fromEntries(Object.entries(args).map(([k, v]) => ["p_" + k, v]));
    r = await sb.rpc(nome, conPrefisso);
  }
  return r;
}

/** Codice invito di 6 caratteri senza simboli che si confondono (0/O, 1/I). */
export function codiceCasuale(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => alfabeto[n % alfabeto.length]).join("");
}

/** Estensione sicura di un file caricato, per il nome nello storage. */
export function estensione(nome: string): string {
  const m = /\.([a-zA-Z0-9]{1,5})$/.exec(nome);
  return m ? m[1].toLowerCase() : "bin";
}

/** Prime frasi che iniziano con "Prossima volta" nei riassunti: sono la parte "cosa migliorare" già scritta dal maestro. */
export function frasiProssimaVolta(testi: string[]): string[] {
  const out: string[] = [];
  for (const t of testi) {
    const m = t.match(/prossima volta[^.!?]*[.!?]?/gi);
    if (m) out.push(...m.map((x) => x.trim()));
  }
  return out;
}

/** "7" → "7 h", 7.5 → "7,5 h". */
export function fmtOre(minuti: number): string {
  const h = Math.round((minuti / 60) * 2) / 2;
  return `${String(h).replace(".", ",")} h`;
}
