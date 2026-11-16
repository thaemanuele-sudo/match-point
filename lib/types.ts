// Tipi condivisi tra app, admin e API. Rispecchiano le tabelle Supabase (migrazione 0001_schema).

export type Fascia = "U10" | "U12" | "U14" | "U16" | "U18" | "ADULTI";
export const FASCE: Fascia[] = ["U10", "U12", "U14", "U16", "U18", "ADULTI"];

export type Profilo = {
  id: string; nome: string; cognome: string; email: string; telefono: string;
  ruolo: "utente" | "admin"; tipo_utente: "giocatore" | "maestro" | "genitore";
  fascia: Fascia | null; livello: string | null; lingua: "it" | "en";
  creato_il: string; ultimo_accesso: string | null;
};

/** Coordinate normalizzate sul campo visto dall'alto: x 0→1 da sinistra a destra (corridoi compresi),
 *  y 0→1 dalla linea di fondo lontana (avversario) a quella vicina (giocatore). La rete sta a y = 0.5. */
export type Keyframe = { t: number; x: number; y: number };
export type ElementoSchema = {
  id: string;
  tipo: "giocatore" | "avversario" | "palla" | "cono";
  etichetta?: string;
  colore?: string;
  keyframes: Keyframe[];
};
export type NotaSchema = { t: number; testo_it: string; testo_en?: string };
export type AnimazioneSchema = { durata: number; elementi: ElementoSchema[]; note: NotaSchema[] };

export type SchemaGioco = {
  id: string; titolo: string; descrizione: string; obiettivo: string; fasce: Fascia[];
  difficolta: number; animazione: AnimazioneSchema; copertina_path: string | null;
  ordine: number; pubblicato: boolean; creato_il: string; aggiornato_il: string;
};

export type CategoriaAtletica = "velocita" | "forza" | "resistenza" | "coordinazione" | "mobilita" | "agilita" | "prevenzione";
export const CATEGORIE_ATLETICA: CategoriaAtletica[] = ["velocita", "forza", "resistenza", "coordinazione", "mobilita", "agilita", "prevenzione"];
export type VideoAtletica = {
  id: string; titolo: string; descrizione: string; categoria: CategoriaAtletica; livello: number; fasce: Fascia[];
  video_path: string | null; copertina_path: string | null; durata_sec: number | null; dosaggio: string;
  ordine: number; pubblicato: boolean; creato_il: string;
};

export type Colpo = "diritto" | "rovescio" | "servizio" | "volee" | "smash" | "back" | "risposta";
export const COLPI: Colpo[] = ["diritto", "rovescio", "servizio", "volee", "smash", "back", "risposta"];
export type VideoTecnica = {
  id: string; colpo: Colpo; tipo: "errore" | "correzione"; codice: string; titolo: string; descrizione: string;
  fasce: Fascia[]; video_path: string | null; copertina_path: string | null; collegato_a: string | null;
  ordine: number; pubblicato: boolean; creato_il: string;
};

/** Risposta di POST /api/ai/analizza */
export type RisultatoAnalisi = {
  colpo: string;
  punteggio: number; // 0-100 qualità del gesto
  sintesi: string;
  fasi: { nome: string; voto: number; nota: string }[];
  errori: { codice: string; titolo: string; descrizione: string; gravita: "alta" | "media" | "bassa"; fotogramma: number }[];
  correzioni: { titolo: string; descrizione: string }[];
  esercizi: { titolo: string; dosaggio: string }[];
};

export type UsoUtente = {
  id: string; nome: string; cognome: string; email: string; telefono: string; tipo_utente: string; fascia: string | null; ruolo: string;
  creato_il: string; ultimo_accesso: string | null;
  costo_oggi: number; costo_settimana: number; costo_mese: number; costo_totale: number;
  chiamate_mese: number; token_in_mese: number; token_out_mese: number; caratteri_mese: number;
};
