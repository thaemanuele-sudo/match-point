// Tipi dei centri, allineati al database reale (progetto Supabase wbnqcsrdlfgaomizghnx, migrazioni 0005*).
// I nomi sono quelli delle colonne (snake_case). Le colonne nullable sono `| null`; i controlli `check (... in (...))`
// e l'enum `ruolo_centro` diventano unioni di stringhe. Date e timestamp arrivano da PostgREST come stringhe ISO.
// Se cambi una migrazione, aggiorna anche questo file. Le RPC sono descritte in docs/RPC.md.

// ───────── Enum e valori ammessi ─────────
export type Ruolo = "titolare" | "dt" | "responsabile_area" | "maestro" | "segreteria" | "genitore" | "allievo";
export type StatoCentro = "prova" | "attivo" | "sospeso";
export type StatoMembro = "attivo" | "invitato" | "sospeso";
export type Superficie = "terra" | "cemento" | "sintetico" | "erba";
export type Copertura = "scoperto" | "coperto" | "pallone";
export type StatoCampo = "disponibile" | "manutenzione" | "chiuso";
export type SchemaProgramma = "mensile" | "settimanale" | "blocchi" | "periodizzazione" | "libero";
export type StatoLezione = "programmata" | "in_corso" | "chiusa";
export type MotivoAssenza = "malato" | "scuola" | "viaggio" | "altro";
export type TipoConversazione = "allievo_maestro" | "famiglia_maestro" | "famiglia_segreteria" | "staff";
export type TipoNotifica = "cambio_campo" | "avviso" | "messaggio" | "assenza" | "compito" | "segnalazione" | "pagamento" | "sistema";
export type TipoConsenso = "privacy" | "foto_video" | "ai";
export type FonteEsercizio = "matchpoint" | "centro" | "maestro";
export type StatoEsercizio = "approvato" | "proposto" | "rifiutato";
export type StatoQuota = "attesa" | "pagata" | "scaduta";
export type MetodoPagamento = "carta" | "segreteria" | "bonifico";
export type PrioritaSegnalazione = "alta" | "media" | "bassa";
export type StatoSegnalazione = "nuova" | "presa" | "chiusa";
export type TipoDestinatari = "centro" | "fascia" | "gruppo" | "area" | "maestro";
export type ModoBlocco = "bloccato" | "flessibile" | "libero";

// ───────── Strutture jsonb note ─────────
/** `centri.impostazioni`: default nella migrazione 0005a. */
export type ImpostazioniCentro = {
  silenzio_da: string; // "21:00"
  silenzio_a: string; // "08:00"
  chat_genitori_fino: number;
  account_ragazzo_da: number;
  assenza_entro_ore: number;
  conservazione_mesi: number;
};

/** `permessi_ruolo.permessi`: cosa può fare un responsabile d'area (default nella migrazione 0005a). */
export type Permessi = {
  gruppi: boolean;
  campi: boolean;
  maestri: boolean;
  avvisi: boolean;
  iscrizioni: boolean;
  pagamenti: boolean;
  metodo: "nessuno" | "lettura" | "modifica" | string;
  tutela: boolean;
};

/** Blocco del piano di una lezione (`lezioni.piano`, `modelli_lezione.blocchi`). */
export type BloccoLezione = {
  titolo: string;
  colpo: string;
  minuti: number;
  esercizio_id: string | null;
  modo: ModoBlocco;
  alternative: string[];
  tipo?: string;
};

/** Blocco svolto (`lezioni.svolto`): `indice` è 0-based sul piano. */
export type SvoltoBlocco = {
  indice: number;
  minuti: number;
  fatto: boolean;
  sostituito?: boolean;
  esercizio_id?: string | null;
  saltato?: boolean;
};

/** Mese di `programmi.mesi`. */
export type MeseProgramma = {
  mese?: number | string;
  tema?: string;
  colpo?: string;
  settimane?: unknown[];
};

/** Destinatari di un avviso (`avvisi.destinatari`, parametro di `invia_avviso` e `conta_destinatari`). */
export type Destinatari = { tipo: TipoDestinatari; valori: string[] };

/** `lezioni.motivi_scostamento`: motivo per ogni blocco che si discosta dal piano (chiave = indice). */
export type MotiviScostamento = Record<string, string>;

// ───────── Righe delle tabelle ─────────
export type Centro = {
  id: string;
  slug: string;
  nome: string;
  nome_app: string | null;
  citta: string | null;
  logo_path: string | null;
  colore: string;
  colore_ink: string;
  stato: StatoCentro;
  prova_fino: string | null;
  piano: string;
  impostazioni: Partial<ImpostazioniCentro>;
  elencato: boolean;
  creato_da: string | null;
  created_at: string;
};

export type Area = { id: string; centro_id: string; nome: string; sigla: string | null; fasce: string[]; ordine: number; created_at: string };

export type Membro = {
  id: string;
  centro_id: string;
  user_id: string | null;
  ruolo: Ruolo;
  nome: string;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  area_id: string | null;
  stato: StatoMembro;
  created_at: string;
};

export type Invito = {
  id: string;
  centro_id: string;
  codice: string;
  ruolo: Ruolo;
  gruppo_id: string | null;
  area_id: string | null;
  allievo_id: string | null;
  scade_il: string | null;
  usi_max: number | null;
  usi: number;
  creato_da: string | null;
  created_at: string;
};

export type PermessoRuolo = { id: string; centro_id: string; area_id: string | null; permessi: Permessi; created_at: string };

export type Campo = {
  id: string;
  centro_id: string;
  numero: number;
  nome: string | null;
  superficie: Superficie;
  copertura: Copertura;
  luci: boolean;
  stato: StatoCampo;
  note: string | null;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  created_at: string;
};

export type Gruppo = {
  id: string;
  centro_id: string;
  area_id: string | null;
  nome: string;
  fascia: string | null;
  livello: string | null;
  giorni: number[];
  ora: string | null;
  durata_min: number;
  campo_id: string | null;
  programma_id: string | null;
  attivo: boolean;
  created_at: string;
};

export type GruppoMaestro = { id: string; centro_id: string; gruppo_id: string; membro_id: string; principale: boolean; created_at: string };

export type Allievo = {
  id: string;
  centro_id: string;
  nome: string;
  cognome: string | null;
  data_nascita: string | null;
  membro_id: string | null;
  note_mediche: string | null;
  certificato_scade: string | null;
  created_at: string;
};

export type AllievoFamiglia = { id: string; centro_id: string; allievo_id: string; membro_id: string; relazione: string | null; created_at: string };
export type Iscrizione = { id: string; centro_id: string; allievo_id: string; gruppo_id: string; dal: string; al: string | null; created_at: string };

export type Programma = {
  id: string;
  centro_id: string;
  nome: string;
  fascia: string | null;
  schema: SchemaProgramma;
  anno: number | null;
  mesi: MeseProgramma[];
  settimane_test: string[];
  created_at: string;
};

export type LineaGuida = {
  id: string;
  centro_id: string;
  fascia: string;
  colpo: string;
  competenze: unknown[];
  errori: unknown[];
  regola: string | null;
  scala: Record<string, unknown>;
  bloccata: boolean;
  created_at: string;
};

export type Esercizio = {
  id: string;
  centro_id: string;
  titolo: string;
  colpo: string | null;
  fasce: string[];
  durata_min: number | null;
  materiale: string | null;
  descrizione: string | null;
  video_path: string | null;
  fonte: FonteEsercizio;
  stato: StatoEsercizio;
  proposto_da: string | null;
  created_at: string;
};

export type ModelloLezione = { id: string; centro_id: string; nome: string; durata_min: number; blocchi: BloccoLezione[]; created_at: string };

export type Lezione = {
  id: string;
  centro_id: string;
  gruppo_id: string;
  data: string;
  ora: string | null;
  campo_id: string | null;
  maestro_id: string | null;
  modello_id: string | null;
  piano: BloccoLezione[];
  svolto: SvoltoBlocco[];
  stato: StatoLezione;
  riassunto: string | null;
  riassunto_ok: boolean;
  compito: string | null;
  motivi_scostamento: MotiviScostamento;
  created_at: string;
};

export type Presenza = {
  id: string;
  centro_id: string;
  lezione_id: string;
  allievo_id: string;
  presente: boolean;
  voto_rapido: number | null;
  nota: string | null;
  nota_audio_path: string | null;
  created_at: string;
};

export type Assenza = {
  id: string;
  centro_id: string;
  allievo_id: string;
  data: string;
  gruppo_id: string | null;
  motivo: MotivoAssenza;
  testo: string | null;
  avvisato_da: string | null;
  created_at: string;
};

export type CambioCampo = {
  id: string;
  centro_id: string;
  gruppo_id: string;
  data: string;
  campo_da: string | null;
  campo_a: string | null;
  motivo: string | null;
  deciso_da: string | null;
  avvisa: boolean;
  created_at: string;
};

export type Compito = {
  id: string;
  centro_id: string;
  allievo_id: string | null;
  gruppo_id: string | null;
  maestro_id: string | null;
  titolo: string;
  durata_min: number | null;
  esercizio_id: string | null;
  scadenza: string | null;
  lezione_id: string | null;
  created_at: string;
};

export type CompitoFatto = {
  id: string;
  centro_id: string;
  compito_id: string;
  allievo_id: string;
  fatto_il: string;
  media_path: string | null;
  created_at: string;
};

export type Valutazione = {
  id: string;
  centro_id: string;
  allievo_id: string;
  maestro_id: string | null;
  test: string;
  colpo: string;
  competenza: string;
  voto: number;
  data: string;
  created_at: string;
};

export type NotaPrivata = { id: string; centro_id: string; allievo_id: string; maestro_id: string | null; testo: string; created_at: string };

export type Osservazione = {
  id: string;
  centro_id: string;
  maestro_id: string;
  osservatore_id: string | null;
  lezione_id: string | null;
  voti: Record<string, number>;
  voto: number | null;
  consigli: string[];
  nota: string | null;
  created_at: string;
};

export type Conversazione = {
  id: string;
  centro_id: string;
  tipo: TipoConversazione;
  allievo_id: string | null;
  titolo: string | null;
  creata_da: string | null;
  created_at: string;
};

export type Partecipante = { id: string; centro_id: string; conversazione_id: string; membro_id: string; sola_lettura: boolean; created_at: string };

export type Messaggio = {
  id: string;
  centro_id: string;
  conversazione_id: string;
  autore_id: string;
  testo: string;
  consegna_il: string;
  created_at: string;
};

export type Avviso = {
  id: string;
  centro_id: string;
  autore_id: string | null;
  titolo: string;
  testo: string;
  destinatari: Destinatari;
  conferma: boolean;
  promemoria: boolean;
  consegna_il: string;
  created_at: string;
};

export type AvvisoLettura = { id: string; centro_id: string; avviso_id: string; membro_id: string; letto_il: string; created_at: string };

export type Notifica = {
  id: string;
  centro_id: string;
  membro_id: string;
  tipo: TipoNotifica;
  titolo: string;
  testo: string | null;
  link: string | null;
  mittente: string | null;
  letta_il: string | null;
  consegna_il: string;
  rif_id: string | null;
  created_at: string;
};

export type Segnalazione = {
  id: string;
  centro_id: string;
  autore_id: string | null;
  anonima: boolean;
  per_allievo_id: string | null;
  categoria: string;
  testo: string;
  priorita: PrioritaSegnalazione;
  stato: StatoSegnalazione;
  riguarda_dt: boolean;
  created_at: string;
};

export type SegnalazioneNota = { id: string; centro_id: string; segnalazione_id: string; autore_id: string | null; testo: string; created_at: string };

export type Consenso = {
  id: string;
  centro_id: string;
  allievo_id: string;
  tipo: TipoConsenso;
  valore: boolean;
  firmato_da: string | null;
  firmato_il: string | null;
  created_at: string;
};

export type Corso = {
  id: string;
  centro_id: string;
  nome: string;
  gruppo_id: string | null;
  quota_cent: number | null;
  sconto_fratelli_pct: number | null;
  rate: number | null;
  scadenze: Record<string, unknown>;
  created_at: string;
};

export type Quota = {
  id: string;
  centro_id: string;
  allievo_id: string;
  corso_id: string | null;
  periodo: string | null;
  importo_cent: number;
  scade_il: string | null;
  stato: StatoQuota;
  pagata_il: string | null;
  metodo: MetodoPagamento | null;
  stripe_id: string | null;
  created_at: string;
};

export type CorsoFormazione = { id: string; centro_id: string; titolo: string; obbligatorio: boolean; moduli: number; created_at: string };

export type Formazione = {
  id: string;
  centro_id: string;
  corso_id: string;
  membro_id: string;
  moduli_fatti: number;
  certificato_il: string | null;
  scadenza: string | null;
  created_at: string;
};

export type Registro = {
  id: string;
  centro_id: string;
  membro_id: string | null;
  azione: string;
  oggetto: string | null;
  dettagli: Record<string, unknown>;
  created_at: string;
};

// ───────── Valori di ritorno delle RPC (docs/RPC.md) ─────────
export type CentroPubblico = {
  id: string;
  slug: string;
  nome: string;
  nome_app: string | null;
  colore: string;
  colore_ink: string;
  logo_path: string | null;
};

export type AnteprimaInvito =
  | { valido: false; motivo: "non_trovato" | "scaduto" | "esaurito" }
  | {
      valido: true;
      centro_nome: string;
      citta: string | null;
      dt_nome: string | null;
      n_maestri: number;
      n_gruppi: number;
      n_allievi: number;
      ruolo: Ruolo;
      scade_il: string | null;
      gruppo_nome: string | null;
      area_nome: string | null;
      allievo_nome: string | null;
    };

export type RitornoUnisciti = { centro_slug: string; ruolo: Ruolo };
export type RitornoRegistraCentro = { id: string; slug: string; centro_slug: string };
export type RitornoClonaCentro = RitornoRegistraCentro;
export type ConteggioDestinatari = { allievi: number; famiglie: number; maestri: number };
export type RitornoInviaAvviso = { avviso_id: string; destinatari: number; consegna_il: string };
export type LetturaAvviso = { avviso_id: string; letti: number; totale: number; letti_24h: number };
export type RitornoCambiaCampo = { cambio_id: string; campo_da: string | null; campo_a: string; notificati: number };
export type LettureCambioCampo = { allievi_letti: number; allievi_tot: number; famiglie_letti: number; famiglie_tot: number };
export type RitornoAvvisaAssenza = { assenze: number; gruppi: number };

/** Presenza inviata a `chiudi_lezione`. */
export type PresenzaChiusura = { allievo_id: string; presente: boolean; voto_rapido?: number; nota?: string };
/** Compito inviato a `chiudi_lezione`; senza `allievo_id` vale per tutto il gruppo. */
export type CompitoChiusura = { titolo: string; durata_min?: number; esercizio_id?: string; scadenza?: string; allievo_id?: string };

/** Motivi dello scostamento dal piano inviati a `chiudi_lezione`: chiave = indice 0-based del blocco, valore = motivo scritto dal maestro. */
export type MotiviChiusura = Record<string, string>;
/** Argomenti di `chiudi_lezione`; `compito` e `motivi` sono facoltativi. */
export type ArgomentiChiudiLezione = {
  lezione: string;
  svolto: SvoltoBlocco[];
  presenze: PresenzaChiusura[];
  compito?: CompitoChiusura | null;
  motivi?: MotiviChiusura | null;
};
/** Argomenti di `notifica_membri` (ritorna il numero di notifiche create). */
export type ArgomentiNotificaMembri = { p_centro: string; p_membri: string[]; p_tipo: string; p_titolo: string; p_testo?: string | null; p_link?: string | null };

/** Ritorni per nome di RPC (`aderenza_maestro` ritorna 0-100, null se nessun blocco bloccato). */
export type RitornoRpc = {
  centro_pubblico: CentroPubblico | null;
  anteprima_invito: AnteprimaInvito;
  unisciti_con_codice: RitornoUnisciti;
  registra_centro: RitornoRegistraCentro;
  clona_centro: RitornoClonaCentro;
  invia_messaggio: Messaggio;
  conta_destinatari: ConteggioDestinatari;
  invia_avviso: RitornoInviaAvviso;
  letture_avvisi: LetturaAvviso[];
  ricorda_avviso: number;
  cambia_campo: RitornoCambiaCampo;
  letture_cambio_campo: LettureCambioCampo;
  avvisa_assenza: RitornoAvvisaAssenza;
  segnala: string;
  chiudi_lezione: void;
  aderenza_maestro: number | null;
};
