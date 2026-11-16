// Tipi delle righe che l'area D (organizzazione, campi, ruoli) legge e scrive.
// Hanno gli stessi nomi snake_case delle colonne di docs/CENTRI.md. Sono locali perché
// lib/centro/tipi.ts (area DB) può non esistere ancora: quando c'è, si possono sostituire.
export type Superficie = "terra" | "cemento" | "sintetico" | "erba";
export type Copertura = "scoperto" | "coperto" | "pallone";
export type StatoCampo = "disponibile" | "manutenzione" | "chiuso";

export type AreaR = { id: string; centro_id: string; nome: string; sigla: string | null; fasce: string[] | null; ordine: number | null };
export type CampoR = {
  id: string; centro_id: string; numero: number; nome: string | null; superficie: Superficie; copertura: Copertura; luci: boolean;
  stato: StatoCampo; note: string | null; x: number | null; y: number | null; w: number | null; h: number | null;
};
export type GruppoR = {
  id: string; centro_id: string; area_id: string | null; nome: string; fascia: string | null; livello: string | null; giorni: number[] | null;
  ora: string | null; durata_min: number | null; campo_id: string | null; programma_id: string | null; attivo: boolean;
};
export type GruppoMaestroR = { id: string; centro_id: string; gruppo_id: string; membro_id: string; principale: boolean };
export type AllievoR = {
  id: string; centro_id: string; nome: string; cognome: string | null; data_nascita: string | null; membro_id: string | null;
  note_mediche: string | null; certificato_scade: string | null;
};
export type FamigliaR = { id: string; centro_id: string; allievo_id: string; membro_id: string; relazione: string | null };
export type IscrizioneR = { id: string; centro_id: string; allievo_id: string; gruppo_id: string; dal: string | null; al: string | null };
export type CambioCampoR = {
  id: string; centro_id: string; gruppo_id: string; data: string; campo_da: string | null; campo_a: string | null; motivo: string | null;
  deciso_da: string | null; avvisa: boolean; created_at: string;
};
export type PermessiArea = { gruppi?: boolean; campi?: boolean; maestri?: boolean; avvisi?: boolean; iscrizioni?: boolean; pagamenti?: boolean; metodo?: string; tutela?: boolean };
export type PermessoRuoloR = { id: string; centro_id: string; area_id: string | null; permessi: PermessiArea | null };
export type ProgrammaR = {
  id: string; centro_id: string; nome: string; fascia: string | null; schema: string | null; anno: number | null;
  mesi: { mese?: number | string; tema?: string; colpo?: string; settimane?: unknown[] }[] | null;
};
export type InvitoR = {
  id: string; centro_id: string; codice: string; ruolo: string; gruppo_id: string | null; area_id: string | null; allievo_id: string | null;
  scade_il: string | null; usi_max: number | null; usi: number | null; created_at: string;
};
export type ValutazioneR = {
  id: string; allievo_id: string; maestro_id: string | null; test: string | null; colpo: string | null; competenza: string | null; voto: number | null; data: string | null;
};
export type LezioneR = { id: string; gruppo_id: string; data: string; stato: string };
export type PresenzaR = { id: string; lezione_id: string; allievo_id: string; presente: boolean };
export type AssenzaR = { id: string; allievo_id: string; data: string; gruppo_id: string | null; motivo: string | null; testo: string | null };
export type RegistroR = { id: string; membro_id: string | null; azione: string; oggetto: string | null; dettagli: Record<string, unknown> | null; created_at: string };
export type ConsensoR = { id: string; allievo_id: string; tipo: string; valore: boolean };
