/*
 * Tipi e piccole funzioni della scheda "Centri" del pannello admin (solo italiano, niente dizionari).
 * I nomi delle colonne sono quelli di docs/CENTRI.md.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type StatoCentro = "prova" | "attivo" | "sospeso";
export type RuoloCentro = "titolare" | "dt" | "responsabile_area" | "maestro" | "segreteria" | "genitore" | "allievo";

export type Centro = {
  id: string; slug: string; nome: string; nome_app: string | null; citta: string | null;
  logo_path: string | null; colore: string | null; colore_ink: string | null;
  stato: StatoCentro; prova_fino: string | null; piano: string | null; created_at: string;
};
/** Colonne della scheda "Centri": niente `select('*')`, la tabella porta anche `impostazioni` e altro che l'elenco non usa. */
export const COL_CENTRO = "id,slug,nome,nome_app,citta,logo_path,colore,colore_ink,stato,prova_fino,piano,created_at";
/** Colonne di `membri` e `inviti` come le mostra il pannello. */
export const COL_MEMBRO = "id,centro_id,user_id,ruolo,nome,cognome,email,telefono,area_id,stato,created_at";
export const COL_INVITO = "id,centro_id,codice,ruolo,gruppo_id,area_id,allievo_id,scade_il,usi_max,usi,created_at";
/** Righe per pagina nelle liste lunghe (membri e inviti di un grande centro). */
export const PAGINA = 50;
/** Attesa prima di cercare sul server mentre si scrive. */
export const DEBOUNCE_MS = 300;
/** Il testo di ricerca senza i caratteri che nei filtri del database hanno un significato. */
export const pulisciRicerca = (s: string) => s.replace(/[%_,()\\*"]/g, " ").replace(/\s+/g, " ").trim();
export type CentroConConteggi = Centro & { n_membri: number; n_allievi: number };

export type Membro = {
  id: string; centro_id: string; user_id: string | null; ruolo: RuoloCentro;
  nome: string | null; cognome: string | null; email: string | null; telefono: string | null;
  area_id: string | null; stato: "attivo" | "invitato" | "sospeso"; created_at: string;
};
export type Area = { id: string; nome: string; sigla: string | null };
export type Gruppo = { id: string; nome: string };
export type Invito = {
  id: string; centro_id: string; codice: string; ruolo: RuoloCentro;
  gruppo_id: string | null; area_id: string | null; allievo_id: string | null;
  scade_il: string | null; usi_max: number | null; usi: number; created_at: string;
};

export const NOME_RUOLO: Record<RuoloCentro, string> = {
  titolare: "Titolare", dt: "Direttore tecnico", responsabile_area: "Responsabile d'area", maestro: "Maestro",
  segreteria: "Segreteria", genitore: "Genitore", allievo: "Allievo",
};
export const RUOLI: RuoloCentro[] = ["titolare", "dt", "responsabile_area", "maestro", "segreteria", "genitore", "allievo"];
export const NOME_STATO: Record<StatoCentro, string> = { prova: "In prova", attivo: "Attivo", sospeso: "Sospeso" };
export const BADGE_STATO: Record<StatoCentro, string> = { prova: "arancio", attivo: "verde", sospeso: "grigio" };

export const COLORE_PREDEFINITO = "#D8F34A";
export const INK_SCURO = "#0B0B0C";
export const INK_CHIARO = "#FFFFFF";
/** Modello da cui parte ogni centro nuovo (seed: stato attivo, non elencato al pubblico). */
export const SLUG_MODELLO = "matchpoint-modello";

// ---------- date ----------
/** Data di oggi come "AAAA-MM-GG" nel fuso del browser (le colonne `date` del database non hanno fuso). */
export const oggiISO = () => new Date().toLocaleDateString("sv-SE");
export function aggiungiGiorni(iso: string, giorni: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + giorni);
  return d.toLocaleDateString("sv-SE");
}
/** Giorni da oggi alla data (negativo se già passata), null se non c'è la data. */
export function giorniA(iso: string | null | undefined) {
  if (!iso) return null;
  const a = new Date(oggiISO() + "T12:00:00").getTime();
  const b = new Date(iso.slice(0, 10) + "T12:00:00").getTime();
  return Math.round((b - a) / 864e5);
}

// ---------- slug e codici ----------
export function slugify(testo: string): string {
  return testo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Codice di 6 caratteri senza simboli ambigui (si detta a voce e si legge sul telefono). */
export function generaCodice(): string {
  const v = new Uint32Array(6);
  crypto.getRandomValues(v);
  return Array.from(v, (n) => ALFABETO[n % ALFABETO.length]).join("");
}
export const doppione = (e: unknown) => /23505|duplicate|unique/i.test(`${(e as { code?: string })?.code ?? ""} ${(e as { message?: string })?.message ?? ""}`);

// ---------- colori ----------
const HEX = /^#[0-9a-fA-F]{6}$/;
export const esadecimale = (c: string | null | undefined, ripiego = COLORE_PREDEFINITO) => (c && HEX.test(c) ? c.toUpperCase() : ripiego);
/** Colore del testo leggibile sopra uno sfondo: scuro sui colori chiari, chiaro sui colori scuri (luminanza WCAG). */
export function inkPer(sfondo: string): string {
  const c = esadecimale(sfondo);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.4 ? INK_SCURO : INK_CHIARO;
}

// ---------- logo ----------
export const BUCKET_LOGHI = "centri-pubblico";
export function urlLogo(sb: SupabaseClient, path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  return sb.storage.from(BUCKET_LOGHI).getPublicUrl(path).data.publicUrl;
}

// ---------- indirizzi ----------
export const urlApp = (slug: string) => `/c/${slug}`;
export const urlDashboard = (slug: string) => `/c/${slug}/dt`;
export const urlVediCome = (slug: string, membroId: string) => `/c/${slug}?come=${membroId}`;
export const urlInvito = (codice: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/app/unisciti?c=${codice}`;

export const nomeCompleto = (m: Pick<Membro, "nome" | "cognome" | "email">) => [m.nome, m.cognome].filter(Boolean).join(" ") || m.email || "Senza nome";
