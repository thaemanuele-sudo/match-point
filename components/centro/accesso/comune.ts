/*
 * Pezzi condivisi delle tre schermate di ingresso ai centri (P1 profili, P2 unisciti, P3 registra centro).
 * Niente testi visibili qui: i testi stanno nei dizionari dei componenti.
 *
 * La scelta del profilo (quale membro e quale ruolo si usa in un centro) si salva sul dispositivo
 * e la legge anche la rotta /c/[slug] per smistare al ruolo giusto:
 *   localStorage["mp-centro-scelta:<slug>"] = {"membro_id": "...", "ruolo": "maestro"}
 *   localStorage["mp-centro-ultimo"]        = {"slug": "...", "membro_id": "..."}  (ultimo profilo usato)
 */

export type RuoloCentro = "titolare" | "dt" | "responsabile_area" | "maestro" | "segreteria" | "genitore" | "allievo";

export const RUOLI_CENTRO: RuoloCentro[] = ["titolare", "dt", "responsabile_area", "maestro", "segreteria", "genitore", "allievo"];

/** Cartella della rotta /c/[slug]/<cartella> di ogni ruolo (titolare e segreteria usano la dashboard del centro). */
export const CARTELLA_RUOLO: Record<RuoloCentro, "dt" | "area" | "maestro" | "genitore" | "allievo"> = {
  titolare: "dt",
  dt: "dt",
  responsabile_area: "area",
  maestro: "maestro",
  segreteria: "dt",
  genitore: "genitore",
  allievo: "allievo",
};

export const percorsoRuolo = (slug: string, ruolo: RuoloCentro) => `/c/${slug}/${CARTELLA_RUOLO[ruolo]}`;

export const chiaveScelta = (slug: string) => `mp-centro-scelta:${slug}`;
const CHIAVE_ULTIMO = "mp-centro-ultimo";

export type Scelta = { membro_id: string; ruolo: RuoloCentro };

/** Salva il profilo scelto. Se l'archivio del browser non c'è (finestra privata) si prosegue lo stesso. */
export function salvaScelta(slug: string, membro_id: string, ruolo: RuoloCentro) {
  try {
    localStorage.setItem(chiaveScelta(slug), JSON.stringify({ membro_id, ruolo } satisfies Scelta));
    localStorage.setItem(CHIAVE_ULTIMO, JSON.stringify({ slug, membro_id }));
  } catch {
    /* archivio non disponibile: la scelta vale solo per questa visita */
  }
}

export function leggiScelta(slug: string): Scelta | null {
  try {
    const r = localStorage.getItem(chiaveScelta(slug));
    if (!r) return null;
    const x = JSON.parse(r) as Partial<Scelta>;
    return x.membro_id && x.ruolo && RUOLI_CENTRO.includes(x.ruolo) ? { membro_id: x.membro_id, ruolo: x.ruolo } : null;
  } catch {
    return null;
  }
}

/** Ultimo profilo usato: serve a preselezionarlo in P1. */
export function leggiUltimo(): { slug: string; membro_id: string } | null {
  try {
    const r = localStorage.getItem(CHIAVE_ULTIMO);
    return r ? (JSON.parse(r) as { slug: string; membro_id: string }) : null;
  } catch {
    return null;
  }
}

// ---------- indirizzo del centro ----------

/** "Tennis Club Brera" → "tennis-club-brera" (senza accenti, solo a-z 0-9 e trattini). */
export function slugify(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ---------- codici invito ----------

/** Alfabeto senza caratteri ambigui (niente 0/O, 1/I/L): i codici si dettano a voce e si leggono sul telefono. */
export const ALFABETO_CODICE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generaCodice(): string {
  const v = new Uint32Array(6);
  crypto.getRandomValues(v);
  return Array.from(v, (n) => ALFABETO_CODICE[n % ALFABETO_CODICE.length]).join("");
}

/** Pulisce quello che l'utente scrive: maiuscole e solo lettere/cifre, al massimo 6 caratteri. */
export const pulisciCodice = (t: string) => t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/**
 * Estrae il codice da quello che si incolla: il codice da solo, un link con ?c=CODICE
 * oppure un link che finisce con /invito/CODICE.
 */
export function estraiCodice(testo: string): string {
  const t = testo.trim();
  if (!t) return "";
  const dalParametro = t.match(/[?&]c=([A-Za-z0-9]{6})(?![A-Za-z0-9])/);
  if (dalParametro) return dalParametro[1].toUpperCase();
  const dalPercorso = t.match(/\/invito\/([A-Za-z0-9]{6})(?![A-Za-z0-9])/);
  if (dalPercorso) return dalPercorso[1].toUpperCase();
  return pulisciCodice(t);
}

// ---------- prossima lezione (per la riga del genitore) ----------

/**
 * Prossima lezione di un gruppo: giorni 1 = lunedì … 7 = domenica, ora "HH:MM[:SS]".
 * Restituisce quanti giorni mancano (0 = oggi) e l'ora, oppure null se il gruppo non ha un orario.
 */
export function prossimaLezione(giorni: number[] | null | undefined, ora: string | null | undefined, adesso = new Date()): { giorni: number; ora: string; giorno: Date } | null {
  if (!giorni?.length || !ora) return null;
  const hhmm = ora.slice(0, 5);
  for (let i = 0; i < 8; i++) {
    const d = new Date(adesso);
    d.setDate(adesso.getDate() + i);
    const iso = d.getDay() === 0 ? 7 : d.getDay();
    if (!giorni.includes(iso)) continue;
    if (i === 0 && hhmm <= adesso.toTimeString().slice(0, 5)) continue;
    return { giorni: i, ora: hhmm, giorno: d };
  }
  return null;
}

/** "Tommaso", "Tommaso e Anna", "Tommaso, Anna e Luca". */
export function elencoNomi(nomi: string[], e: string): string {
  if (nomi.length <= 1) return nomi[0] ?? "";
  return nomi.slice(0, -1).join(", ") + ` ${e} ` + nomi[nomi.length - 1];
}

/** Messaggio tecnico di un errore Supabase, per riconoscere i casi noti senza mostrarlo a schermo. */
export function messaggioErrore(e: unknown): string {
  const x = e as { message?: string; code?: string } | null;
  return `${x?.code ?? ""} ${x?.message ?? ""}`.toLowerCase();
}
