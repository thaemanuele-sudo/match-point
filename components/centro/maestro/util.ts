// Funzioni pure dell'area E (maestro): niente React, niente Supabase, così sono facili da controllare.
// I tipi sono locali e minimi (solo le colonne lette qui), con gli stessi nomi snake_case del database.
import { fmtOra, isoGiorno, leggiData } from "@/lib/centro/date";

export type RGruppo = {
  id: string; nome: string; fascia: string | null; livello: string | null; giorni: number[] | null; ora: string | null;
  durata_min: number | null; campo_id: string | null; programma_id: string | null; attivo: boolean | null; area_id: string | null;
};
export type RCampo = { id: string; numero: number; nome: string | null; superficie: string | null; copertura: string | null; luci: boolean | null; stato: string | null };
export type RAllievo = {
  id: string; nome: string; cognome: string | null; data_nascita: string | null; membro_id: string | null;
  note_mediche: string | null; certificato_scade: string | null;
};
export type RIscrizione = { allievo_id: string; gruppo_id: string; dal: string | null; al: string | null };
export type RProgramma = { id: string; nome: string; fascia: string | null; schema: string | null; anno: number | null; mesi: unknown; settimane_test: string[] | null };
export type RModello = { id: string; nome: string; durata_min: number | null; blocchi: unknown };
export type REsercizio = { id: string; titolo: string; colpo: string | null; fasce: string[] | null; durata_min: number | null; materiale: string | null; descrizione: string | null; stato: string | null };
export type RCambio = { id: string; gruppo_id: string; data: string; campo_da: string | null; campo_a: string | null; motivo: string | null; deciso_da: string | null };
export type RLezione = {
  id: string; gruppo_id: string | null; data: string; ora: string | null; campo_id: string | null; maestro_id: string | null; modello_id: string | null;
  piano: unknown; svolto: unknown; stato: "programmata" | "in_corso" | "chiusa" | string; riassunto: string | null; riassunto_ok: boolean | null;
  compito: string | null; motivi_scostamento: unknown;
};
export type RPresenza = { id: string; lezione_id: string; allievo_id: string; presente: boolean | null; voto_rapido: number | null; nota: string | null; nota_audio_path: string | null };
export type RValutazione = { id: string; allievo_id: string; maestro_id: string | null; test: string; colpo: string; competenza: string; voto: number; data: string | null };

/* ---------- Nomi ---------- */
export const nomeCompleto = (p: { nome: string; cognome: string | null }) => [p.nome, p.cognome].filter(Boolean).join(" ");
/** "Tommaso R." come nei mockup: nome e iniziale del cognome. */
export const nomeBreve = (p: { nome: string; cognome: string | null }) => (p.cognome ? `${p.nome} ${p.cognome.charAt(0)}.` : p.nome);
export const maiuscola = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Sostituisce {nome} nelle frasi del dizionario: i testi restano interi. */
export function fmt(testo: string, v: Record<string, string | number>): string {
  return testo.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : ""));
}
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/* ---------- Mesi, settimane e test ---------- */
const MESI_K = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const nomeMese = (m: number) => maiuscola(MESI_LUNGHI[((m % 12) + 12) % 12]);
export const chiaveMese = (d: string | Date) => MESI_K[leggiData(d).getMonth()];
/** Settimana del mese da 1 a 4: i programmi hanno sempre quattro settimane per mese (16 novembre = settimana 3). */
export const settimanaMese = (d: string | Date) => Math.min(4, Math.floor((leggiData(d).getDate() - 1) / 7) + 1);
/** Test del mese come nel database: "nov-2026". */
export const chiaveTest = (d: string | Date) => `${chiaveMese(d)}-${leggiData(d).getFullYear()}`;
/** Ordine cronologico di una chiave test ("ott-2026" → numero confrontabile). -1 se non riconosciuta. */
export function ordineTest(k: string): number {
  const m = /^([a-z]{3})-(\d{4})/.exec(k.toLowerCase());
  if (!m) return -1;
  const i = MESI_K.indexOf(m[1]);
  return i < 0 ? -1 : +m[2] * 12 + i;
}
export function etichettaTest(k: string): string {
  const m = /^([a-z]{3})-(\d{4})/.exec(k.toLowerCase());
  const i = m ? MESI_K.indexOf(m[1]) : -1;
  return i < 0 ? k : `${nomeMese(i)} ${m![2]}`;
}
/** Mese (0-11) da un valore del programma: "nov", "novembre", "2026-11", 11. */
export function meseDaValore(v: unknown): number | null {
  if (typeof v === "number" && v >= 1 && v <= 12) return v - 1;
  if (typeof v !== "string") return null;
  const s = norm(v);
  const iso = /^(\d{4})-(\d{1,2})/.exec(s);
  if (iso) return +iso[2] - 1;
  if (/^\d{1,2}$/.test(s)) return +s >= 1 && +s <= 12 ? +s - 1 : null;
  const i = MESI_K.findIndex((b) => s.startsWith(b));
  return i >= 0 ? i : null;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown) => (typeof x === "string" ? x : x == null ? "" : String(x));
const numero = (x: unknown, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : Number.isFinite(Number(x)) && x !== "" && x != null ? Number(x) : d);

export type Situazione = {
  mese: number; meseNome: string; tema: string; colpo: string;
  settimana: number; totale: number; temaSettimana: string; modello_id: string | null; test: boolean;
};

/** Dove si trova un gruppo nel programma alla data: mese, tema, settimana "3 di 4" e modello della settimana. */
export function situazioneProgramma(p: RProgramma | null | undefined, data: string | Date): Situazione | null {
  if (!p || !Array.isArray(p.mesi)) return null;
  const d = leggiData(data);
  const mi = d.getMonth();
  const voce = (p.mesi as unknown[]).find((m) => isObj(m) && meseDaValore(m.mese) === mi);
  if (!isObj(voce)) return null;
  const sett = Array.isArray(voce.settimane) ? (voce.settimane as unknown[]) : [];
  const totale = Math.max(4, sett.length || 4);
  const w = Math.min(settimanaMese(d), totale);
  const s = sett[w - 1];
  const so = isObj(s) ? s : {};
  return {
    mese: mi, meseNome: nomeMese(mi), tema: str(voce.tema), colpo: str(voce.colpo),
    settimana: w, totale, temaSettimana: str(so.tema), modello_id: so.modello_id ? str(so.modello_id) : null,
    test: so.test === true,
  };
}
/** "Novembre · Dritto" */
export const etichettaProgramma = (s: Situazione | null) => (s ? [s.meseNome, s.tema].filter(Boolean).join(" · ") : "");

export const SCHEMI: Record<string, string> = {
  mensile: "Focus mensile", settimanale: "Focus settimanale", blocchi: "Lezione a blocchi", periodizzazione: "Periodizzazione agonistica", libero: "Libero guidato",
};

/* ---------- Piano della lezione ---------- */
export type Modo = "bloccato" | "flessibile" | "libero";
export type Sostituto = { esercizio_id: string | null; titolo: string };
export type Variante = { allievo_id: string; nome: string; esercizio_id: string | null; esercizio: string; motivo: string };
export type Blocco = {
  titolo: string; colpo: string; minuti: number; esercizio_id: string | null; esercizio: string; modo: Modo;
  /** Alternative approvate dal DT: nomi oppure id di esercizi della libreria. */
  alternative: string[];
  /** Scelta del maestro al posto dell'esercizio del Metodo (solo blocchi flessibili o liberi). */
  sostituto: Sostituto | null;
  /** Varianti individuali per un singolo allievo (suggerimenti Coach AI applicati). */
  varianti: Variante[];
};

const modoValido = (m: unknown): Modo => (m === "flessibile" || m === "libero" ? m : "bloccato");

export function leggiPiano(j: unknown): Blocco[] {
  const a = Array.isArray(j) ? j : isObj(j) && Array.isArray(j.blocchi) ? (j.blocchi as unknown[]) : [];
  return a.filter(isObj).map((o): Blocco => {
    const s = isObj(o.sostituto) ? { esercizio_id: o.sostituto.esercizio_id ? str(o.sostituto.esercizio_id) : null, titolo: str(o.sostituto.titolo) } : null;
    return {
      titolo: str(o.titolo ?? o.colpo), colpo: str(o.colpo), minuti: Math.max(0, Math.round(numero(o.minuti, 0))),
      esercizio_id: o.esercizio_id ? str(o.esercizio_id) : null, esercizio: str(o.esercizio), modo: modoValido(o.modo),
      alternative: Array.isArray(o.alternative) ? o.alternative.map(str).filter(Boolean) : [],
      sostituto: s && s.titolo ? s : null,
      varianti: Array.isArray(o.varianti)
        ? o.varianti.filter(isObj).map((v) => ({ allievo_id: str(v.allievo_id), nome: str(v.nome), esercizio_id: v.esercizio_id ? str(v.esercizio_id) : null, esercizio: str(v.esercizio), motivo: str(v.motivo) }))
        : [],
    };
  });
}

/** Titolo dell'esercizio da mostrare: la sostituzione se c'è, altrimenti quello del modello. */
export function titoloEsercizio(b: Blocco, es: Map<string, REsercizio>): string {
  if (b.sostituto) return b.sostituto.titolo;
  if (b.esercizio) return b.esercizio;
  return b.esercizio_id ? es.get(b.esercizio_id)?.titolo ?? "" : "";
}
/** Un'alternativa può essere l'id di un esercizio della libreria o già il suo nome. */
export function alternativaA(v: string, es: Map<string, REsercizio>): Sostituto {
  const e = es.get(v);
  return e ? { esercizio_id: e.id, titolo: e.titolo } : { esercizio_id: null, titolo: v };
}

export function pianoDaModello(blocchi: unknown, es: Map<string, REsercizio>): Blocco[] {
  return leggiPiano(blocchi).map((b) => ({
    ...b, esercizio: b.esercizio || (b.esercizio_id ? es.get(b.esercizio_id)?.titolo ?? "" : ""), sostituto: null, varianti: [],
  }));
}
/** Senza modello nel Metodo: un solo blocco libero lungo quanto la lezione. */
export function pianoLibero(durata: number, titolo: string): Blocco[] {
  return [{ titolo, colpo: "", minuti: durata, esercizio_id: null, esercizio: "", modo: "libero", alternative: [], sostituto: null, varianti: [] }];
}

/* ---------- Svolto (contratto con l'area B) ---------- */
export type Svolto = { indice: number; minuti: number; fatto: boolean; sostituito?: boolean; esercizio_id?: string; saltato?: boolean };

export function leggiSvolto(j: unknown): Svolto[] {
  if (!Array.isArray(j)) return [];
  return j.filter(isObj).map((o) => ({
    indice: numero(o.indice, 0), minuti: numero(o.minuti, 0), fatto: o.fatto === true,
    ...(o.sostituito === true ? { sostituito: true } : {}), ...(o.esercizio_id ? { esercizio_id: str(o.esercizio_id) } : {}), ...(o.saltato === true ? { saltato: true } : {}),
  }));
}
/** Svolto parallelo al piano: minuti dati dal piano, fatto = false finché la lezione non è chiusa. */
export function svoltoDaPiano(piano: Blocco[], prima: Svolto[] = []): Svolto[] {
  return piano.map((b, i) => {
    const p = prima.find((s) => s.indice === i);
    const sost = !!b.sostituto;
    return {
      indice: i, minuti: p ? p.minuti : b.minuti, fatto: p ? p.fatto : false,
      ...(sost ? { sostituito: true } : {}), ...(b.sostituto?.esercizio_id ? { esercizio_id: b.sostituto.esercizio_id } : {}), ...(p?.saltato ? { saltato: true } : {}),
    };
  });
}
export function leggiMotivi(j: unknown): Record<string, string> {
  if (!isObj(j)) return {};
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(j)) if (typeof v === "string" && v.trim()) o[k] = v;
  return o;
}

/* ---------- Campo e orario ---------- */
export const nomeCampo = (c: RCampo | null | undefined) => (c ? `Campo ${c.numero}` : "");
export function campoEffettivo(
  g: Pick<RGruppo, "id" | "campo_id">, data: string, cambi: RCambio[], campi: Map<string, RCampo>, lezione?: Pick<RLezione, "campo_id"> | null,
): { campo: RCampo | null; cambio: RCambio | null } {
  // Il cambio di campo di quella data vince su tutto: è deciso dal centro (manutenzione, ecc.)
  const cambio = cambi.find((c) => c.gruppo_id === g.id && c.data === data && c.campo_a) ?? null;
  const id = cambio?.campo_a ?? lezione?.campo_id ?? g.campo_id;
  return { campo: id ? campi.get(id) ?? null : null, cambio };
}
/** Minuti da adesso all'inizio ("17:00" di oggi). */
export function minutiA(ora: string | null, data: string, adesso: Date = new Date()): number | null {
  const o = fmtOra(ora);
  if (!o) return null;
  const [h, m] = o.split(":").map(Number);
  const d = leggiData(data);
  const q = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
  return Math.round((+q - +adesso) / 60000);
}

/* ---------- Colori dei colpi (come nel mockup) ---------- */
export function coloreColpo(colpo: string | null | undefined): string {
  const n = norm(colpo ?? "");
  if (n.startsWith("dritt") || n.startsWith("dir")) return "#D8F34A";
  if (n.startsWith("rovesc")) return "#3D8BFF";
  if (n.startsWith("serv") || n.startsWith("risp")) return "#FF9F43";
  if (n.startsWith("vole") || n.startsWith("gioco")) return "#4CD07D";
  if (n.startsWith("smash")) return "#FF5A5F";
  return "#A78BFA";
}
export const coloreVoto = (pct: number) => (pct >= 65 ? "#4CD07D" : pct >= 55 ? "#FFD54A" : "#FF9F43");
export const COLORI_VOTO: Record<number, string> = { 1: "#FF5A5F", 2: "#FF9F43", 3: "#FFD54A", 4: "#4CD07D", 5: "#D8F34A" };
export const pctDaVoto = (v: number) => Math.round((v / 5) * 100);

export { fmtOra, isoGiorno };
