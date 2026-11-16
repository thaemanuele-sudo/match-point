// Tipi minimi usati dalla fondazione (area F). Quando esiste lib/centro/tipi.ts (area DB) i file
// della fondazione importano da lì: questo file resta solo come ripiego.
export type Ruolo = "titolare" | "dt" | "responsabile_area" | "maestro" | "segreteria" | "genitore" | "allievo";

export type ImpostazioniCentro = {
  silenzio_da: string;
  silenzio_a: string;
  chat_genitori_fino: number;
  account_ragazzo_da: number;
  assenza_entro_ore: number;
  conservazione_mesi: number;
};

export type Centro = {
  id: string;
  slug: string;
  nome: string;
  nome_app: string | null;
  citta: string | null;
  logo_path: string | null;
  colore: string | null;
  colore_ink: string | null;
  stato: "prova" | "attivo" | "sospeso";
  prova_fino: string | null;
  piano: string | null;
  impostazioni: Partial<ImpostazioniCentro> | null;
  creato_da: string | null;
  created_at: string;
};

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
  stato: "attivo" | "invitato" | "sospeso";
  created_at: string;
};

export type Notifica = {
  id: string;
  centro_id: string;
  membro_id: string;
  tipo: "cambio_campo" | "avviso" | "messaggio" | "assenza" | "compito" | "segnalazione" | "pagamento" | "sistema";
  titolo: string;
  testo: string | null;
  link: string | null;
  mittente: string | null;
  letta_il: string | null;
  created_at: string;
};
