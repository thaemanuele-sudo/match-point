// Calcoli e formati dell'area B (maestri, aderenza, osservazioni, formazione).
// Tutto qui è puro (niente rete) così le regole sono leggibili in un posto solo.
import { fmtGiorni, fmtOra } from "@/lib/centro/date";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Riga = Record<string, any>;

export const COL = {
  verde: "#4CD07D",
  giallo: "#FFD54A",
  arancio: "#FF9F43",
  rosso: "#FF5A5F",
  blu: "#3D8BFF",
  palla: "var(--brand,#D8F34A)",
  muto: "#A1A1A6",
} as const;

export type MembroB = { id: string; nome: string; cognome: string | null; ruolo: string; stato: string };
export type GruppoB = { id: string; nome: string; giorni: number[] | null; ora: string | null; programma_id: string | null; attivo: boolean | null };
export type LezioneB = {
  id: string; gruppo_id: string; data: string; ora: string | null; campo_id: string | null; maestro_id: string | null;
  modello_id: string | null; stato: string; piano: any; svolto: any; motivi_scostamento: any;
};

export const nomeCompleto = (m: { nome: string; cognome?: string | null } | null | undefined) =>
  m ? [m.nome, m.cognome].filter(Boolean).join(" ") : "";

export const iniziali = (m: { nome: string; cognome?: string | null }) =>
  ((m.nome?.[0] ?? "") + (m.cognome?.[0] ?? m.nome?.[1] ?? "")).toUpperCase();

// Colori degli avatar dei mockup, assegnati in modo stabile dall'id (stessa persona, stesso colore).
const AVATAR = ["#2A6C4C", "#8A3E6C", "#3E5D8A", "#8A4E3E", "#6C5A2A", "#4A3E8A"];
export function coloreAvatar(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

/** "U12 Intermedio · mar-gio 17:00" */
export function etichettaGruppo(g: Pick<GruppoB, "nome" | "giorni" | "ora">): string {
  const quando = [fmtGiorni(g.giorni), fmtOra(g.ora)].filter(Boolean).join(" ");
  return quando ? `${g.nome} · ${quando}` : g.nome;
}

export function mediana(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const virgola = (n: number, dec = 1) => String(Number(n.toFixed(dec))).replace(".", ",");

/** Tempo di risposta: "40 min", "2 h", "4,5 h", "31 h". */
export function fmtOre(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  return `${virgola(h, h < 10 ? 1 : 0)} h`;
}

export const coloreAderenza = (a: number | null) => (a == null ? COL.muto : a >= 85 ? COL.verde : a >= 75 ? COL.giallo : COL.arancio);

export const rimpiazza = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/** "dritto" → "Dritto" */
export const maiuscola = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* ---------- Lezioni: piano contro svolto ---------- */

export function comeLista(v: any): any[] {
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { return []; }
  }
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.blocchi)) return v.blocchi;
  return [];
}

export type Esito = "piano" | "sostituito" | "fuori";
export type Cambio = { titolo: string; bloccato: boolean };

// Il blocco svolto può essere un oggetto ({esercizio_id, fatto, saltato, sostituito…}) o un semplice booleano:
// si accettano entrambe le forme perché lo scrive l'area E (chiudi_lezione) e il contratto non fissa i campi.
function bloccoCambiato(b: Riga, f: any): boolean {
  if (f == null) return true;
  if (typeof f === "boolean") return !f;
  if (typeof f !== "object") return false;
  if (f.saltato === true || f.fatto === false || f.sostituito === true) return true;
  if (b.esercizio_id && f.esercizio_id) return b.esercizio_id !== f.esercizio_id;
  if (b.titolo && f.titolo) return b.titolo !== f.titolo;
  return false;
}

/**
 * Confronto piano / svolto dei blocchi.
 * - "fuori": almeno un blocco Bloccato non è stato fatto come scritto nel Metodo (conta contro l'aderenza);
 * - "sostituito": cambiati solo blocchi Flessibili o Liberi (consentito);
 * - "piano": tutto come scritto. Senza piano o senza svolto registrato non c'è nulla da confrontare, quindi "piano".
 */
export function analizzaLezione(l: Pick<LezioneB, "piano" | "svolto">): { esito: Esito; cambi: Cambio[] } {
  const p = comeLista(l.piano);
  const s = comeLista(l.svolto);
  if (!p.length || !s.length) return { esito: "piano", cambi: [] };
  const cambi: Cambio[] = [];
  for (let i = 0; i < p.length; i++) {
    const b = p[i] ?? {};
    // "Ogni blocco nasce bloccato": senza modo si tratta come Bloccato
    const bloccato = (b.modo ?? "bloccato") === "bloccato";
    if (bloccoCambiato(b, s[i])) cambi.push({ titolo: String(b.titolo ?? b.colpo ?? `#${i + 1}`), bloccato });
  }
  if (cambi.some((c) => c.bloccato)) return { esito: "fuori", cambi };
  return { esito: cambi.length ? "sostituito" : "piano", cambi };
}

/** Testo del motivo di scostamento: accetta lista di stringhe, di oggetti {motivo|testo}, o mappa indice → motivo. */
export function motivoScostamento(v: any): string {
  let x = v;
  if (typeof x === "string") {
    try { x = JSON.parse(x); } catch { return x.trim(); }
  }
  if (!x) return "";
  const voci: any[] = Array.isArray(x) ? x : typeof x === "object" ? Object.values(x) : [x];
  return voci
    .map((e) => (typeof e === "string" ? e : e && typeof e === "object" ? e.motivo ?? e.testo ?? e.descrizione ?? "" : ""))
    .filter(Boolean)
    .join(" · ");
}

/** Percentuale di lezioni non "fuori piano" sul totale; null se non ci sono lezioni. */
export function percentualeAderenza(esiti: Esito[]): number | null {
  if (!esiti.length) return null;
  return Math.round((esiti.filter((e) => e !== "fuori").length / esiti.length) * 100);
}

/* ---------- Osservazioni ---------- */

export const CRITERI = ["tempi", "correzione", "gruppo", "sicurezza"] as const;
export type Criterio = (typeof CRITERI)[number];

/** Media (su 5) dei quattro criteri di una osservazione; null se i voti non ci sono. */
export function mediaVoti(voti: any): number | null {
  const n = CRITERI.map((c) => Number(voti?.[c])).filter((x) => x >= 1 && x <= 5);
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
}

/* ---------- Formazione ---------- */

export type CorsoB = { id: string; titolo: string; obbligatorio: boolean | null; moduli: number | null };
export type FormazioneB = { id: string; corso_id: string; membro_id: string; moduli_fatti: number | null; certificato_il: string | null; scadenza: string | null };

export const corsoCompletato = (c: CorsoB, f: FormazioneB | undefined) =>
  !!f && (!!f.certificato_il || (c.moduli != null && c.moduli > 0 && (f.moduli_fatti ?? 0) >= c.moduli));

export const percentualeCorso = (c: CorsoB, f: FormazioneB | undefined) =>
  corsoCompletato(c, f) ? 100 : c.moduli ? Math.min(100, Math.round(((f?.moduli_fatti ?? 0) / c.moduli) * 100)) : 0;

// Il contratto non ha un "tipo" del corso: l'obbligo è l'unica distinzione vera. Il corso base del Metodo
// (titolo che inizia per "Metodo") è la certificazione del mockup.
export type TipoCorso = "certificazione" | "obbligatorio" | "facoltativo";
export const tipoCorso = (c: CorsoB): TipoCorso => (/^metodo/i.test(c.titolo) ? "certificazione" : c.obbligatorio ? "obbligatorio" : "facoltativo");
