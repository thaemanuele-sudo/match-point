import type { SupabaseClient } from "@supabase/supabase-js";

export const FASCE = ["U8", "U10", "U12", "U14", "U16", "U18", "Adulti", "Agonisti"] as const;
export type Fascia = (typeof FASCE)[number];

/** nome = valore salvato nel database; k = chiave per i testi del dizionario. */
export const COLPI = [
  { k: "dritto", nome: "Dritto" },
  { k: "rovescio", nome: "Rovescio" },
  { k: "servizio", nome: "Servizio" },
  { k: "risposta", nome: "Risposta" },
  { k: "volee", nome: "Volée" },
  { k: "smash", nome: "Smash" },
  { k: "palleggio", nome: "Palleggio" },
  { k: "gambe", nome: "Gioco di gambe" },
  { k: "tattica", nome: "Tattica" },
  { k: "atletica", nome: "Atletica" },
] as const;
export type ColpoK = (typeof COLPI)[number]["k"];

export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Riconosce il colpo anche se nel database è scritto in modo leggermente diverso ("Gambe", "volée"). */
export function colpoK(s: string | null | undefined): ColpoK | null {
  const n = norm(s ?? "");
  if (!n) return null;
  if (n.includes("gamb")) return "gambe";
  const c = COLPI.find((x) => n === x.k || n === norm(x.nome) || n.startsWith(x.k));
  return c ? c.k : null;
}
export const nomeColpo = (k: ColpoK) => COLPI.find((c) => c.k === k)!.nome;

export type Sb = SupabaseClient;

/** Colonne della libreria esercizi (mai `select('*')`: la tabella cresce con i video e le descrizioni). */
export const COLONNE_ESERCIZIO = "id,titolo,colpo,fasce,durata_min,materiale,descrizione,video_path,fonte,stato,proposto_da,created_at";
/** Stesse colonne senza la descrizione lunga: per gli elenchi in cui serve solo il titolo. */
export const COLONNE_ESERCIZIO_BREVI = "id,titolo,colpo,fasce,durata_min,materiale,video_path,fonte,stato,proposto_da,created_at";
/** Righe per volta negli elenchi lunghi ("Carica altri"). */
export const PAGINA = 50;

/**
 * Filtro `or(...)` del database per un colpo, con le stesse varianti che riconosce `colpoK` ("Volée", "volee", "Gambe"…),
 * così il filtro per colpo lo fa il server e non il browser.
 */
export function filtroColpo(k: ColpoK): string {
  if (k === "gambe") return "colpo.ilike.%gamb%";
  return `colpo.ilike.${k}%,colpo.ilike.${nomeColpo(k)}%`;
}

/** Toglie dal testo cercato i caratteri che hanno un significato nei filtri del database (virgole, parentesi, %, *). */
export const ricercaSicura = (s: string) => s.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim();
export type Righe = Record<string, unknown>[];

export const ordFascia = (f: string) => {
  const i = (FASCE as readonly string[]).indexOf(f);
  return i < 0 ? 99 : i;
};
/** "U8–U10" per più fasce, "U12" per una sola. */
export function rangeFasce(fasce: string[]): string {
  const v = [...fasce].sort((a, b) => ordFascia(a) - ordFascia(b));
  if (v.length === 0) return "";
  if (v.length === 1) return v[0];
  return `${v[0]}–${v[v.length - 1]}`;
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

export function dataBreve(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }).replace(".", "");
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const str = (x: unknown) => (typeof x === "string" ? x : x == null ? "" : String(x));

/* ---------- Linee guida ---------- */
export type Errore = { nome: string; tempo?: string; video_path?: string | null; esercizio_id?: string | null };
export type Scala = { livelli: string[]; atteso: number; livello: string; stato?: "bozza" | "completa"; versione: number; da: string; il: string };

export function leggiCompetenze(j: unknown): string[] {
  if (!Array.isArray(j)) return [];
  return j.map((x) => (isObj(x) ? str(x.testo ?? x.nome ?? x.titolo) : str(x))).filter((s) => s.trim());
}
export function leggiErrori(j: unknown): Errore[] {
  if (!Array.isArray(j)) return [];
  return j
    .map((x): Errore => {
      if (isObj(x)) {
        return {
          nome: str(x.nome ?? x.titolo ?? x.testo),
          tempo: x.tempo ? str(x.tempo) : undefined,
          video_path: x.video_path ? str(x.video_path) : null,
          esercizio_id: x.esercizio_id ? str(x.esercizio_id) : null,
        };
      }
      return { nome: str(x) };
    })
    .filter((e) => e.nome.trim());
}
export function leggiScala(j: unknown, defaultLivelli: string[]): Scala {
  const base: Scala = { livelli: defaultLivelli, atteso: 3, livello: "", versione: 1, da: "", il: "" };
  if (Array.isArray(j)) {
    const l = j.map((x) => (isObj(x) ? str(x.label ?? x.nome) : str(x))).filter(Boolean);
    return { ...base, livelli: l.length >= 4 ? l.slice(0, 4) : defaultLivelli };
  }
  if (!isObj(j)) return base;
  const l = Array.isArray(j.livelli) ? j.livelli.map(str).filter(Boolean) : [];
  const att = Number(j.atteso);
  return {
    livelli: l.length >= 4 ? l.slice(0, 4) : defaultLivelli,
    atteso: att >= 1 && att <= 4 ? att : 3,
    livello: str(j.livello),
    stato: j.stato === "bozza" || j.stato === "completa" ? j.stato : undefined,
    versione: Number(j.versione) > 0 ? Number(j.versione) : 1,
    da: str(j.da),
    il: str(j.il),
  };
}

export type LineaGuida = {
  id: string;
  fascia: string;
  colpo: ColpoK;
  competenze: string[];
  errori: Errore[];
  regola: string;
  scala: Scala;
  bloccata: boolean;
  creata: string;
};
export function leggiLinea(r: Record<string, unknown>, defLivelli: string[]): LineaGuida | null {
  const k = colpoK(str(r.colpo));
  if (!k) return null;
  return {
    id: str(r.id),
    fascia: str(r.fascia),
    colpo: k,
    competenze: leggiCompetenze(r.competenze),
    errori: leggiErrori(r.errori),
    regola: str(r.regola),
    scala: leggiScala(r.scala, defLivelli),
    bloccata: r.bloccata !== false,
    creata: str(r.created_at),
  };
}
/** c = completa, b = bozza, n = da scrivere. Senza stato esplicito conta la completezza dei contenuti. */
export function statoLinea(l: LineaGuida | undefined): "c" | "b" | "n" {
  if (!l) return "n";
  if (l.scala.stato) return l.scala.stato === "completa" ? "c" : "b";
  return l.competenze.length >= 3 && l.regola.trim() ? "c" : "b";
}

/** Contenuti di partenza del Metodo Match Point (bozza da rifinire), scritti per fascia e colpo. */
const BASE: Record<ColpoK, { c: [string, string, string]; e: [[string, string], [string, string]]; r: string }> = {
  dritto: { c: ["Preparazione precoce con la racchetta indietro", "Impatto davanti al corpo, braccio disteso", "Chiusura del gesto sopra la spalla"], e: [["Apertura tardiva", "0:24"], ["Impatto dietro il corpo", "0:31"]], r: "Si parte sempre dal passo laterale e dalla preparazione prima del rimbalzo." },
  rovescio: { c: ["Presa a due mani stabile", "Rotazione delle spalle prima del rimbalzo", "Impatto davanti con spinta delle gambe"], e: [["Spalle ferme", "0:22"], ["Presa che scivola", "0:27"]], r: "Il rovescio si insegna a due mani fino all'Under 12." },
  servizio: { c: ["Lancio di palla alto e costante", "Posizione trophy con gambe flesse", "Impatto alto con il braccio disteso"], e: [["Lancio troppo basso", "0:26"], ["Gambe rigide", "0:30"]], r: "Al massimo 20 servizi consecutivi: si protegge la spalla." },
  risposta: { c: ["Posizione di attesa sugli avampiedi", "Split step quando parte l'avversario", "Risposta corta e controllata"], e: [["Attesa troppo statica", "0:19"], ["Swing troppo lungo", "0:25"]], r: "Si risponde in diagonale prima di cercare il lungolinea." },
  volee: { c: ["Racchetta davanti al corpo", "Passo verso la palla", "Volée corta con polso fermo"], e: [["Swing da dritto", "0:21"], ["Polso molle", "0:23"]], r: "Le volée si allenano con palline morbide fino all'Under 10." },
  smash: { c: ["Passo indietro con spalle laterali", "Braccio libero in alto per leggere la palla", "Impatto con braccio disteso"], e: [["Palla colpita troppo bassa", "0:20"], ["Spalle frontali", "0:28"]], r: "Lo smash si allena solo dopo il riscaldamento delle spalle." },
  palleggio: { c: ["Dieci colpi consecutivi", "Colpo morbido, peso della palla giusto", "Controllo della direzione"], e: [["Colpi troppo forti", "0:18"], ["Piedi fermi", "0:22"]], r: "Il palleggio apre ogni lezione per cinque minuti." },
  gambe: { c: ["Passi piccoli verso la palla", "Split step prima di ogni colpo", "Recupero al centro dopo il colpo"], e: [["Passi troppo lunghi", "0:20"], ["Si ferma dopo il colpo", "0:24"]], r: "Il gioco di gambe è in ogni blocco, non solo nei circuiti." },
  tattica: { c: ["Giocare lungo e al centro", "Variare altezza e direzione", "Cercare il punto debole dell'avversario"], e: [["Gioca solo in diagonale", "0:29"], ["Cerca il vincente subito", "0:33"]], r: "In partita si conta il punteggio, ma si valuta la scelta del colpo." },
  atletica: { c: ["Corsa e coordinazione di base", "Forza con il peso del corpo", "Mobilità di spalle e anche"], e: [["Atterraggio rigido", "0:21"], ["Respiro bloccato", "0:18"]], r: "Fino all'Under 12 l'atletica si fa sempre in forma di gioco." },
};
const LIVELLO: Record<string, string> = {
  U8: "Palla rossa, campo piccolo. 3 palle su 5 nel campo da fermo.",
  U10: "Palla arancio, campo ridotto. 3 palle su 5 nel campo da fermo.",
  U12: "Palla verde. 4 palle su 5 in cross con palleggio da fondo.",
  U14: "Palla gialla. 7 palle su 10 profonde, con cambio di direzione.",
  U16: "Palla gialla. 7 palle su 10 profonde, anche sotto pressione.",
  U18: "Palla gialla. Costanza ad alto ritmo e scelta della direzione a punteggio.",
  Adulti: "Palla gialla. Scambio di 8 colpi con controllo della direzione.",
  Agonisti: "Palla gialla. Costanza sotto pressione e scelta di direzione a punteggio.",
};
const ATTESO: Record<string, number> = { U8: 2, U10: 3, U12: 3, U14: 4, U16: 4, U18: 4, Adulti: 3, Agonisti: 4 };
export function baseLinea(fascia: string, k: ColpoK) {
  const d = BASE[k];
  const minuscola = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const c1 = fascia === "U8" ? `Con palla morbida e rete bassa: ${minuscola(d.c[0])}` : ["U16", "U18", "Agonisti"].includes(fascia) ? `Ad alto ritmo: ${minuscola(d.c[0])}` : d.c[0];
  return {
    competenze: [c1, d.c[1], d.c[2]],
    errori: d.e.map(([nome, tempo]) => ({ nome, tempo })) as Errore[],
    regola: d.r,
    livello: LIVELLO[fascia] ?? "",
    atteso: ATTESO[fascia] ?? 3,
  };
}

/* ---------- Esercizi ---------- */
export type Esercizio = {
  id: string;
  titolo: string;
  colpo: ColpoK | null;
  fasce: string[];
  durata: number;
  materiale: string;
  descrizione: string;
  video_path: string | null;
  fonte: "matchpoint" | "centro" | "maestro";
  stato: "approvato" | "proposto" | "rifiutato";
  proposto_da: string | null;
  creato: string;
};
export function leggiEsercizio(r: Record<string, unknown>): Esercizio {
  const fonte = str(r.fonte);
  const stato = str(r.stato);
  return {
    id: str(r.id),
    titolo: str(r.titolo),
    colpo: colpoK(str(r.colpo)),
    fasce: Array.isArray(r.fasce) ? r.fasce.map(str) : [],
    durata: Number(r.durata_min) || 10,
    materiale: str(r.materiale),
    descrizione: str(r.descrizione),
    video_path: r.video_path ? str(r.video_path) : null,
    fonte: fonte === "matchpoint" || fonte === "maestro" ? fonte : "centro",
    stato: stato === "proposto" || stato === "rifiutato" ? stato : "approvato",
    proposto_da: r.proposto_da ? str(r.proposto_da) : null,
    creato: str(r.created_at),
  };
}

/* ---------- Gruppi ---------- */
export type Gruppo = { id: string; nome: string; fascia: string; giorni: number[]; ora: string; programma_id: string | null; attivo: boolean };
export function leggiGruppo(r: Record<string, unknown>): Gruppo {
  return {
    id: str(r.id),
    nome: str(r.nome),
    fascia: str(r.fascia),
    giorni: Array.isArray(r.giorni) ? r.giorni.map(Number) : [],
    ora: str(r.ora).slice(0, 5),
    programma_id: r.programma_id ? str(r.programma_id) : null,
    attivo: r.attivo !== false,
  };
}
export function etichettaGruppo(g: Gruppo, t: Record<string, string>): string {
  const gg = g.giorni.map((d) => t[`gs${d}`] ?? "").filter(Boolean).join("-");
  return [g.nome, [gg, g.ora].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

/** Anno scolastico in corso: da settembre ad agosto. `anno` = anno di settembre. */
export function annoCorrente(oggi = new Date()): number {
  return oggi.getMonth() >= 8 ? oggi.getFullYear() : oggi.getFullYear() - 1;
}

/* ---------- Registro ---------- */
/** Ogni modifica del Metodo resta tracciata e la vede il DT. Un errore qui non deve bloccare il lavoro. */
export async function registra(sb: Sb, centroId: string, membroId: string | undefined, azione: string, oggetto: string, dettagli: Record<string, unknown> = {}) {
  try {
    await sb.from("registro").insert({ centro_id: centroId, membro_id: membroId ?? null, azione, oggetto, dettagli });
  } catch {
    /* il registro è di sola scrittura: se manca il permesso si prosegue */
  }
}
