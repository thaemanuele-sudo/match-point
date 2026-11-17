// Copia del Motore: non modificare qui, si modifica nel repository motore
// Contratto comune del motore. Generato da docs/PROGETTO.md: le modifiche si fanno lì.

// ===== Messaggi =====
export type Ruolo = "sistema" | "utente" | "assistente";

export type Parte =
  // stabile = testo che non cambia tra una richiesta e l'altra: si marca per la cache del fornitore
  | { tipo: "testo"; testo: string; stabile?: boolean }
  | { tipo: "immagine"; mime: string; base64?: string; url?: string };

export type Messaggio = { ruolo: Ruolo; contenuto: string | Parte[] };

// ===== Modelli =====
export type Genere = "genera" | "classifica" | "estrai" | "vedi" | "parla";

export type ModelloInfo = {
  id: string; // "fornitore/nome", per esempio "anthropic/claude-haiku-5-5"
  fornitore: string;
  nome: string; // nome presso il fornitore
  prezzo_in: number; // dollari per milione di token letti
  prezzo_out: number; // dollari per milione di token scritti
  prezzo_cache_lettura?: number;
  prezzo_cache_scrittura?: number;
  prezzo_caratteri?: number; // voce: dollari per milione di caratteri
  immagini?: boolean;
  schema?: boolean;
  flusso?: boolean;
  voce?: boolean;
  contesto?: number;
  aggiornato_il?: string;
};

export interface Catalogo {
  modello(id: string): ModelloInfo | undefined;
  tutti(): ModelloInfo[];
}

export type Uso = {
  token_in: number;
  token_out: number;
  token_cache_letti?: number;
  token_cache_scritti?: number;
  caratteri?: number;
};

// ===== Fornitori =====
export type RichiestaFornitore = {
  modello: ModelloInfo;
  messaggi: Messaggio[];
  schema?: Record<string, unknown>; // JSON Schema della risposta
  max_token?: number;
  temperatura?: number;
  segnale?: AbortSignal;
};

export type RispostaFornitore = { testo: string; dati?: unknown; uso: Uso; latenza_ms: number };

export type PezzoFlusso = { delta?: string; fine?: RispostaFornitore };

export type RichiestaVoce = { modello: ModelloInfo; testo: string; voce: string; lingua?: string; segnale?: AbortSignal };

export type RispostaVoce = { audio: Uint8Array; mime: string; uso: Uso; latenza_ms: number };

export interface Fornitore {
  id: string;
  genera(r: RichiestaFornitore): Promise<RispostaFornitore>;
  flusso?(r: RichiestaFornitore): AsyncIterable<PezzoFlusso>;
  parla?(r: RichiestaVoce): Promise<RispostaVoce>;
}

// ===== Decisore =====
export type Ragiona = "spento" | "auto" | "acceso";

export type EsitoScelta = {
  scelta: string | null; // null = non so
  probabilita: Record<string, number>;
  calibrata: boolean;
  latenza_ms: number;
  costo_usd: number;
};

export type EsitoSiNo = {
  risposta: boolean | null; // null = non so
  probabilita: number; // probabilità del sì
  calibrata: boolean;
  latenza_ms: number;
  costo_usd: number;
};

export interface Decisore {
  id: string;
  scegli(r: {
    contenuto: string;
    istruzioni: string;
    opzioni: { id: string; descrizione: string }[];
    ragiona?: Ragiona;
    segnale?: AbortSignal;
  }): Promise<EsitoScelta>;
  sino(r: { contenuto: string; domanda: string; ragiona?: Ragiona; segnale?: AbortSignal }): Promise<EsitoSiNo>;
}

// ===== Compiti =====
export type Contenuto = { testo: string; dati?: unknown };

export type Compito<I = unknown> = {
  id: string; // "app/nome", per esempio "matchpoint/riassunto-lezione"
  versione: number; // cambiarla fa ripartire cache e statistiche
  genere: Genere;
  prepara: (ingresso: I) => Messaggio[];
  schema?: Record<string, unknown>;
  riferimento: string; // id del modello che garantisce la qualità
  candidati: string[]; // id dei modelli più economici da mettere alla prova
  qualita?: number; // 0,9
  fiducia?: number; // 0,9
  minimo_prove?: number; // 20
  campione?: number; // 0,15
  controllo?: number; // 0,03
  cache?: { attiva: boolean; durata_s?: number; normalizza?: boolean; chiave?: (ingresso: I) => unknown };
  locale?: (ingresso: I) => Contenuto | null | Promise<Contenuto | null>;
  valida?: (risposta: Contenuto, ingresso: I) => boolean;
  confronta?: (riferimento: Contenuto, candidato: Contenuto, ingresso: I) => number | null;
  rubrica?: string;
  giudice?: string; // id di un modello oppure "decisore"; se manca, il riferimento
  secchio?: "decisore" | ((ingresso: I) => string);
  verifica?: { soglia: number; auto?: boolean }; // auto = la soglia si sposta da sola con la taratura
  max_token?: number;
  temperatura?: number;
  fornitori_ammessi?: string[];
};

export type Risultato = Contenuto & {
  id_chiamata: string;
  modello: string;
  secchio: string;
  da_cache: boolean;
  locale: boolean;
  costo_usd: number;
  costo_riferimento_usd: number; // quanto sarebbe costato il riferimento
  latenza_ms: number;
  uso: Uso;
};

// ===== Archivio =====
export type StatoBraccio = "prova" | "attivo" | "escluso";

export type ChiaveBraccio = { app: string; compito: string; versione: number; secchio: string; modello: string };

export type Braccio = ChiaveBraccio & {
  ok: number;
  ko: number;
  costo_medio: number;
  latenza_media: number;
  stato: StatoBraccio;
  aggiornato_il: number; // millisecondi
};

export type EsitoChiamata = "risposta" | "cache" | "locale" | "errore";

export type Chiamata = {
  id: string;
  app: string;
  compito: string;
  versione: number;
  secchio: string;
  modello: string;
  esito: EsitoChiamata;
  ombra: boolean; // true = prova, controllo o giudizio: non è andata all'utente
  token_in: number;
  token_out: number;
  caratteri: number;
  costo_usd: number;
  costo_riferimento_usd: number;
  latenza_ms: number;
  utente?: string;
  chiave_cache?: string;
  creato_il: number;
};

export type VoceCache = Contenuto & { modello: string; creato_il: number };

export type Priore = { ok: number; ko: number };

export type Riepilogo = {
  compito: string;
  modello: string;
  chiamate: number;
  da_cache: number;
  locali: number;
  ombra: number;
  costo_usd: number;
  costo_riferimento_usd: number;
  latenza_media: number;
};

// ===== Taratura del decisore =====
export type UsoDecisore = "verifica" | "giudice";

export type ChiaveTaratura = { app: string; decisore: string; uso: UsoDecisore; compito: string };

// Una fascia di probabilità dichiarata dal decisore e quante volte aveva ragione davvero
export type FasciaTaratura = { fascia: number; da: number; a: number; ok: number; ko: number };

export type StatoTaratura = { chiave: ChiaveTaratura; fasce: FasciaTaratura[]; soglia: number | null };

export interface Archivio {
  leggiCache(chiave: string): Promise<VoceCache | null>;
  scriviCache(chiave: string, voce: VoceCache, opz: { app: string; compito: string; durata_s?: number }): Promise<void>;
  togliCache(chiave: string): Promise<void>;
  leggiBracci(app: string, compito: string, versione: number): Promise<Braccio[]>;
  aggiornaBraccio(
    chiave: ChiaveBraccio,
    delta: { ok: number; ko: number; costo_usd?: number; latenza_ms?: number },
    opz: { emivita_giorni: number; adesso: number },
  ): Promise<Braccio>;
  impostaStato(chiave: ChiaveBraccio, stato: StatoBraccio): Promise<void>;
  registraChiamata(c: Chiamata): Promise<void>;
  leggiChiamata(id: string): Promise<Chiamata | null>;
  leggiPriori(genere: Genere): Promise<Record<string, Priore>>;
  sommaPriori(genere: Genere, modello: string, delta: Priore, fonte: string): Promise<void>;
  riepilogo(app: string | null, da: number, a: number): Promise<Riepilogo[]>;
  // Facoltativi: servono alla taratura del decisore. Un archivio che non li ha lascia la taratura spenta.
  aggiornaTaratura?(
    chiave: ChiaveTaratura,
    fascia: number,
    delta: { ok: number; ko: number },
    opz: { emivita_giorni: number; adesso: number },
  ): Promise<void>;
  leggiTaratura?(chiave: ChiaveTaratura): Promise<FasciaTaratura[]>;
  // Facoltativi: servono a non far spostare un braccio a un solo utente e a contare un solo esito umano per chiamata.
  // Un archivio che non li ha lascia al motore il ripiego, che vale per istanza (in memoria).
  // `prenotaContributo`: in un solo passo conta i contributi di (utente, braccio) nella finestra e, se sono meno di `tetto`,
  // ne aggiunge uno. Vero = prenotato, falso = tetto raggiunto.
  prenotaContributo?(c: { chiave: ChiaveBraccio; utente: string; tetto: number; finestra_ms: number; adesso: number }): Promise<boolean>;
  // `segnaEsito`: segna sulla chiamata che ha ricevuto un esito umano. Vero solo la prima volta.
  segnaEsito?(id: string, adesso: number): Promise<boolean>;
}

export interface Deposito {
  leggi(chiave: string): Promise<{ dati: Uint8Array; mime: string } | null>;
  scrivi(chiave: string, dati: Uint8Array, mime: string): Promise<void>;
}

// ===== Motore =====
export type Modo = "attivo" | "osserva" | "spento";

export type EventoMotore = { tipo: string; compito?: string; modello?: string; dettagli?: Record<string, unknown> };

export type OpzioniMotore = {
  app: string;
  fornitori: Record<string, Fornitore>; // per id del fornitore
  catalogo: Catalogo;
  archivio: Archivio;
  decisore?: Decisore;
  deposito?: Deposito;
  modo?: Modo; // "attivo"
  dopo?: (lavoro: () => Promise<void>) => void; // esegue dopo la risposta (per esempio after() di Next.js)
  casuale?: () => number;
  adesso?: () => number;
  registro?: (evento: EventoMotore) => void;
  emivita_giorni?: number; // 30
  peso_priori?: number; // 8
  tetto_apprendimento?: number; // 0,2
  tetto_utente?: number; // 3: contributi al giorno di un utente a uno stesso braccio (Infinity lo spegne)
};

export type OpzioniChiamata = { utente?: string; segnale?: AbortSignal; senza_cache?: boolean };

export type StatoCompito = {
  compito: string;
  versione: number;
  secchio: string;
  servito: string; // modello che oggi serve questo secchio
  bracci: (Braccio & { basso: number; alto: number; prove: number })[];
};

export type RichiestaParla = { testo: string; voce: string; modello: string; lingua?: string; utente?: string };

export type RisultatoParla = {
  audio: Uint8Array;
  mime: string;
  da_cache: boolean; // true solo se tutte le frasi erano in cache
  costo_usd: number;
  costo_pieno_usd: number; // senza cache
  caratteri_pagati: number;
};

export interface Motore {
  registra<I>(compito: Compito<I>): void;
  esegui<I>(compito: string, ingresso: I, opz?: OpzioniChiamata): Promise<Risultato>;
  flusso<I>(compito: string, ingresso: I, opz?: OpzioniChiamata): AsyncIterable<{ delta?: string; fine?: Risultato }>;
  parla(r: RichiestaParla): Promise<RisultatoParla>;
  esito(id_chiamata: string, e: { ok: boolean; peso?: number }): Promise<void>;
  stato(compito?: string): Promise<StatoCompito[]>;
  taratura(compito?: string): Promise<StatoTaratura[]>; // quanto ci si può fidare del decisore, per compito e uso
}
