-- 0005a_centri_tabelle: multi-centro (tenant) di Match Point. Enum, tabelle e indici.
-- Perché: ogni centro ha i suoi dati isolati da RLS tramite centro_id (le policy sono in 0005b).
-- Regola: solo aggiunte, nessuna tabella esistente viene toccata (compatibile con il codice già online).

create type public.ruolo_centro as enum
  ('titolare', 'dt', 'responsabile_area', 'maestro', 'segreteria', 'genitore', 'allievo');

-- ───────── centri ─────────
create table public.centri (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  nome text not null check (char_length(btrim(nome)) > 0),
  nome_app text,
  citta text,
  logo_path text,
  colore text not null default '#D8F34A' check (colore ~ '^#[0-9A-Fa-f]{6}$'),
  colore_ink text not null default '#0B0B0C' check (colore_ink ~ '^#[0-9A-Fa-f]{6}$'),
  stato text not null default 'prova' check (stato in ('prova', 'attivo', 'sospeso')),
  prova_fino date,
  piano text not null default 'base',
  impostazioni jsonb not null default
    '{"silenzio_da":"21:00","silenzio_a":"08:00","chat_genitori_fino":18,"account_ragazzo_da":14,"assenza_entro_ore":2,"conservazione_mesi":24}'::jsonb,
  -- extra rispetto al contratto: il modello Match Point non compare negli elenchi
  elencato boolean not null default true,
  creato_da uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index centri_creato_da_idx on public.centri (creato_da);

-- ───────── organizzazione ─────────
create table public.aree (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  nome text not null,
  sigla text,
  fasce text[] not null default '{}',
  ordine int not null default 0,
  created_at timestamptz not null default now()
);
create index aree_centro_idx on public.aree (centro_id);

create table public.membri (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,  -- null finché la persona non accetta l'invito
  ruolo public.ruolo_centro not null,
  nome text not null default '',
  cognome text,
  email text,
  telefono text,
  area_id uuid references public.aree (id) on delete set null,  -- per responsabile_area
  stato text not null default 'attivo' check (stato in ('attivo', 'invitato', 'sospeso')),
  created_at timestamptz not null default now()
);
create index membri_centro_idx on public.membri (centro_id, ruolo);
create index membri_user_centro_idx on public.membri (user_id, centro_id) where user_id is not null;
create index membri_area_idx on public.membri (area_id);
-- Unique (centro, user, ruolo, area): parziale, perché le persone senza account (user_id null) possono ripetersi.
create unique index membri_unico_idx on public.membri
  (centro_id, user_id, ruolo, coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where user_id is not null;

create table public.campi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  numero int not null,
  nome text,
  superficie text not null default 'terra' check (superficie in ('terra', 'cemento', 'sintetico', 'erba')),
  copertura text not null default 'scoperto' check (copertura in ('scoperto', 'coperto', 'pallone')),
  luci boolean not null default false,
  stato text not null default 'disponibile' check (stato in ('disponibile', 'manutenzione', 'chiuso')),
  note text,
  x numeric, y numeric, w numeric, h numeric,  -- posizione nella mappa, 0-100
  created_at timestamptz not null default now(),
  unique (centro_id, numero)
);

-- ───────── Metodo (programmi prima dei gruppi: gruppi.programma_id) ─────────
create table public.linee_guida (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  fascia text not null,
  colpo text not null,
  competenze jsonb not null default '[]',
  errori jsonb not null default '[]',
  regola text,
  scala jsonb not null default '{}',
  bloccata boolean not null default false,
  created_at timestamptz not null default now(),
  unique (centro_id, fascia, colpo)
);

create table public.esercizi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  titolo text not null,
  colpo text,
  fasce text[] not null default '{}',
  durata_min int,
  materiale text,
  descrizione text,
  video_path text,
  fonte text not null default 'centro' check (fonte in ('matchpoint', 'centro', 'maestro')),
  stato text not null default 'approvato' check (stato in ('approvato', 'proposto', 'rifiutato')),
  proposto_da uuid references public.membri (id) on delete set null,
  created_at timestamptz not null default now()
);
create index esercizi_centro_idx on public.esercizi (centro_id);
create index esercizi_proposto_da_idx on public.esercizi (proposto_da);

create table public.modelli_lezione (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  nome text not null,
  durata_min int not null default 60,
  -- [{titolo, colpo, minuti, esercizio_id, modo: bloccato|flessibile|libero, alternative: [id esercizi], tipo}]
  blocchi jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index modelli_lezione_centro_idx on public.modelli_lezione (centro_id);

create table public.programmi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  nome text not null,
  fascia text,
  schema text not null default 'mensile'
    check (schema in ('mensile', 'settimanale', 'blocchi', 'periodizzazione', 'libero')),
  anno int,  -- anno di settembre (2026 per 2026-27)
  -- [{mese, tema, colpo, colore, fase, carico, test, settimane:[{tema, colore, modello_id, test?, carico?}]}]
  mesi jsonb not null default '[]',
  settimane_test text[] not null default '{ott-4,gen-4,mag-4}',
  created_at timestamptz not null default now()
);
create index programmi_centro_idx on public.programmi (centro_id);

-- ───────── gruppi, allievi, iscrizioni ─────────
create table public.gruppi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  area_id uuid references public.aree (id) on delete set null,
  nome text not null,
  fascia text,
  livello text,
  giorni int[] not null default '{}' check (giorni <@ array[1, 2, 3, 4, 5, 6, 7]),  -- 1 = lunedì
  ora time,
  durata_min int not null default 60,
  campo_id uuid references public.campi (id) on delete set null,
  programma_id uuid references public.programmi (id) on delete set null,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);
create index gruppi_centro_idx on public.gruppi (centro_id);
create index gruppi_area_idx on public.gruppi (area_id);
create index gruppi_campo_idx on public.gruppi (campo_id);
create index gruppi_programma_idx on public.gruppi (programma_id);

create table public.gruppi_maestri (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete cascade,
  principale boolean not null default false,
  created_at timestamptz not null default now(),
  unique (gruppo_id, membro_id)
);
create index gruppi_maestri_centro_idx on public.gruppi_maestri (centro_id);
create index gruppi_maestri_membro_idx on public.gruppi_maestri (membro_id);

create table public.allievi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  nome text not null,
  cognome text,
  data_nascita date,
  membro_id uuid references public.membri (id) on delete set null,  -- account proprio, facoltativo
  note_mediche text,
  certificato_scade date,
  created_at timestamptz not null default now()
);
create index allievi_centro_idx on public.allievi (centro_id);
create index allievi_membro_idx on public.allievi (membro_id);

create table public.allievi_famiglie (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete cascade,  -- genitore
  relazione text,
  created_at timestamptz not null default now(),
  unique (allievo_id, membro_id)
);
create index allievi_famiglie_centro_idx on public.allievi_famiglie (centro_id);
create index allievi_famiglie_membro_idx on public.allievi_famiglie (membro_id);

create table public.iscrizioni (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  dal date not null default current_date,
  al date,
  created_at timestamptz not null default now()
);
create index iscrizioni_centro_idx on public.iscrizioni (centro_id);
create index iscrizioni_allievo_idx on public.iscrizioni (allievo_id);
create index iscrizioni_gruppo_idx on public.iscrizioni (gruppo_id);

create table public.inviti (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  codice char(6) not null unique,
  ruolo public.ruolo_centro not null,
  gruppo_id uuid references public.gruppi (id) on delete cascade,
  area_id uuid references public.aree (id) on delete cascade,
  allievo_id uuid references public.allievi (id) on delete cascade,
  scade_il timestamptz,
  usi_max int,
  usi int not null default 0,
  creato_da uuid references public.membri (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inviti_centro_idx on public.inviti (centro_id);
create index inviti_gruppo_idx on public.inviti (gruppo_id);
create index inviti_area_idx on public.inviti (area_id);
create index inviti_allievo_idx on public.inviti (allievo_id);
create index inviti_creato_da_idx on public.inviti (creato_da);

create table public.cambi_campo (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  data date not null,
  campo_da uuid references public.campi (id) on delete set null,
  campo_a uuid references public.campi (id) on delete set null,
  motivo text,
  deciso_da uuid references public.membri (id) on delete set null,
  avvisa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gruppo_id, data)
);
create index cambi_campo_centro_idx on public.cambi_campo (centro_id, data);
create index cambi_campo_campo_da_idx on public.cambi_campo (campo_da);
create index cambi_campo_campo_a_idx on public.cambi_campo (campo_a);
create index cambi_campo_deciso_da_idx on public.cambi_campo (deciso_da);

-- ───────── lezioni e dati degli allievi ─────────
create table public.lezioni (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  gruppo_id uuid not null references public.gruppi (id) on delete cascade,
  data date not null,
  ora time,
  campo_id uuid references public.campi (id) on delete set null,
  maestro_id uuid references public.membri (id) on delete set null,
  modello_id uuid references public.modelli_lezione (id) on delete set null,
  piano jsonb not null default '[]',   -- blocchi (stessa forma di modelli_lezione.blocchi)
  svolto jsonb not null default '[]',  -- [{indice (0 = primo blocco), minuti, fatto, sostituito?, esercizio_id?, saltato?}]
  stato text not null default 'programmata' check (stato in ('programmata', 'in_corso', 'chiusa')),
  riassunto text,
  riassunto_ok boolean not null default false,
  compito text,
  motivi_scostamento jsonb not null default '{}',  -- {"indice": "motivo"}
  created_at timestamptz not null default now(),
  unique (gruppo_id, data)
);
create index lezioni_centro_data_idx on public.lezioni (centro_id, data);
create index lezioni_maestro_idx on public.lezioni (maestro_id, data);
create index lezioni_campo_idx on public.lezioni (campo_id);
create index lezioni_modello_idx on public.lezioni (modello_id);

create table public.presenze (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  lezione_id uuid not null references public.lezioni (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  presente boolean not null default true,
  voto_rapido int check (voto_rapido between 1 and 5),
  nota text,
  nota_audio_path text,
  created_at timestamptz not null default now(),
  unique (lezione_id, allievo_id)
);
create index presenze_centro_idx on public.presenze (centro_id);
create index presenze_allievo_idx on public.presenze (allievo_id);

create table public.assenze (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  data date not null,
  gruppo_id uuid references public.gruppi (id) on delete set null,
  motivo text not null default 'altro' check (motivo in ('malato', 'scuola', 'viaggio', 'altro')),
  testo text,
  avvisato_da uuid references public.membri (id) on delete set null,
  created_at timestamptz not null default now()
);
create index assenze_centro_data_idx on public.assenze (centro_id, data);
create index assenze_allievo_idx on public.assenze (allievo_id);
create index assenze_gruppo_idx on public.assenze (gruppo_id);
create index assenze_avvisato_da_idx on public.assenze (avvisato_da);
create unique index assenze_unica_idx on public.assenze
  (allievo_id, data, coalesce(gruppo_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.valutazioni (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  maestro_id uuid references public.membri (id) on delete set null,
  test text not null,  -- es. 'nov-2026'
  colpo text not null,
  competenza text not null,
  voto int not null check (voto between 1 and 5),
  data date not null default current_date,
  created_at timestamptz not null default now(),
  unique (allievo_id, test, colpo, competenza)
);
create index valutazioni_centro_idx on public.valutazioni (centro_id);
create index valutazioni_allievo_idx on public.valutazioni (allievo_id, test);
create index valutazioni_maestro_idx on public.valutazioni (maestro_id);

create table public.compiti (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid references public.allievi (id) on delete cascade,  -- null se di gruppo
  gruppo_id uuid references public.gruppi (id) on delete cascade,
  maestro_id uuid references public.membri (id) on delete set null,
  titolo text not null,
  durata_min int,
  esercizio_id uuid references public.esercizi (id) on delete set null,
  scadenza date,
  lezione_id uuid references public.lezioni (id) on delete set null,  -- extra: evita doppioni in chiudi_lezione
  created_at timestamptz not null default now()
);
create index compiti_centro_idx on public.compiti (centro_id);
create index compiti_allievo_idx on public.compiti (allievo_id);
create index compiti_gruppo_idx on public.compiti (gruppo_id);
create index compiti_maestro_idx on public.compiti (maestro_id);
create index compiti_esercizio_idx on public.compiti (esercizio_id);
create index compiti_lezione_idx on public.compiti (lezione_id);

create table public.compiti_fatti (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  compito_id uuid not null references public.compiti (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  fatto_il timestamptz not null default now(),
  media_path text,
  created_at timestamptz not null default now(),
  unique (compito_id, allievo_id)
);
create index compiti_fatti_centro_idx on public.compiti_fatti (centro_id);
create index compiti_fatti_allievo_idx on public.compiti_fatti (allievo_id);

create table public.note_private (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  maestro_id uuid references public.membri (id) on delete set null,
  testo text not null,
  created_at timestamptz not null default now()
);
create index note_private_centro_idx on public.note_private (centro_id);
create index note_private_allievo_idx on public.note_private (allievo_id);
create index note_private_maestro_idx on public.note_private (maestro_id);

-- ───────── osservazioni e formazione ─────────
create table public.osservazioni (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  maestro_id uuid not null references public.membri (id) on delete cascade,
  osservatore_id uuid references public.membri (id) on delete set null,
  lezione_id uuid references public.lezioni (id) on delete set null,
  voti jsonb not null default '{}',  -- {tempi, correzione, gruppo, sicurezza}
  voto int,
  consigli text[] not null default '{}',
  nota text,
  created_at timestamptz not null default now()
);
create index osservazioni_centro_idx on public.osservazioni (centro_id);
create index osservazioni_maestro_idx on public.osservazioni (maestro_id);
create index osservazioni_osservatore_idx on public.osservazioni (osservatore_id);
create index osservazioni_lezione_idx on public.osservazioni (lezione_id);

create table public.corsi_formazione (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  titolo text not null,
  obbligatorio boolean not null default false,
  moduli int not null default 1,
  created_at timestamptz not null default now()
);
create index corsi_formazione_centro_idx on public.corsi_formazione (centro_id);

create table public.formazione (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  corso_id uuid not null references public.corsi_formazione (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete cascade,
  moduli_fatti int not null default 0,
  certificato_il date,
  scadenza date,
  created_at timestamptz not null default now(),
  unique (corso_id, membro_id)
);
create index formazione_centro_idx on public.formazione (centro_id);
create index formazione_membro_idx on public.formazione (membro_id);

-- ───────── comunicazione ─────────
create table public.conversazioni (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  tipo text not null check (tipo in ('allievo_maestro', 'famiglia_maestro', 'famiglia_segreteria', 'staff')),
  allievo_id uuid references public.allievi (id) on delete cascade,
  titolo text,
  creata_da uuid references public.membri (id) on delete set null,  -- extra: serve alla RLS di partecipanti
  created_at timestamptz not null default now()
);
create index conversazioni_centro_idx on public.conversazioni (centro_id);
create index conversazioni_allievo_idx on public.conversazioni (allievo_id);
create index conversazioni_creata_da_idx on public.conversazioni (creata_da);

create table public.partecipanti (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  conversazione_id uuid not null references public.conversazioni (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete cascade,
  sola_lettura boolean not null default false,  -- genitori nella chat figlio-maestro
  created_at timestamptz not null default now(),
  unique (conversazione_id, membro_id)
);
create index partecipanti_centro_idx on public.partecipanti (centro_id);
create index partecipanti_membro_idx on public.partecipanti (membro_id);

create table public.messaggi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  conversazione_id uuid not null references public.conversazioni (id) on delete cascade,
  autore_id uuid not null references public.membri (id) on delete cascade,
  testo text not null check (char_length(testo) between 1 and 4000),
  consegna_il timestamptz not null default now(),  -- in silenzio (dopo le 21) si consegna alle 8:00
  created_at timestamptz not null default now()
);
create index messaggi_centro_idx on public.messaggi (centro_id);
create index messaggi_conv_idx on public.messaggi (conversazione_id, created_at);
create index messaggi_autore_idx on public.messaggi (autore_id);

create table public.avvisi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  autore_id uuid references public.membri (id) on delete set null,
  titolo text not null,
  testo text not null,
  destinatari jsonb not null default '{"tipo":"centro","valori":[]}',  -- {tipo: centro|fascia|gruppo|area|maestro, valori: []}
  conferma boolean not null default false,
  promemoria boolean not null default false,
  consegna_il timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index avvisi_centro_idx on public.avvisi (centro_id, created_at desc);
create index avvisi_autore_idx on public.avvisi (autore_id);

create table public.avvisi_letture (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  avviso_id uuid not null references public.avvisi (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete cascade,
  letto_il timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (avviso_id, membro_id)
);
create index avvisi_letture_centro_idx on public.avvisi_letture (centro_id);
create index avvisi_letture_membro_idx on public.avvisi_letture (membro_id);

create table public.segnalazioni (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  autore_id uuid references public.membri (id) on delete set null,  -- null se anonima verso tutti
  anonima boolean not null default false,
  per_allievo_id uuid references public.allievi (id) on delete set null,
  categoria text not null,
  testo text not null,
  priorita text not null default 'media' check (priorita in ('alta', 'media', 'bassa')),
  stato text not null default 'nuova' check (stato in ('nuova', 'presa', 'chiusa')),
  riguarda_dt boolean not null default false,
  created_at timestamptz not null default now()
);
create index segnalazioni_centro_idx on public.segnalazioni (centro_id, created_at desc);
create index segnalazioni_autore_idx on public.segnalazioni (autore_id);
create index segnalazioni_allievo_idx on public.segnalazioni (per_allievo_id);

create table public.segnalazioni_note (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  segnalazione_id uuid not null references public.segnalazioni (id) on delete cascade,
  autore_id uuid references public.membri (id) on delete set null,
  testo text not null,
  created_at timestamptz not null default now()
);
create index segnalazioni_note_centro_idx on public.segnalazioni_note (centro_id);
create index segnalazioni_note_segn_idx on public.segnalazioni_note (segnalazione_id);
create index segnalazioni_note_autore_idx on public.segnalazioni_note (autore_id);

create table public.notifiche (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  membro_id uuid not null references public.membri (id) on delete cascade,
  tipo text not null check (tipo in ('cambio_campo', 'avviso', 'messaggio', 'assenza', 'compito', 'segnalazione', 'pagamento', 'sistema')),
  titolo text not null,
  testo text,
  link text,
  mittente text,
  letta_il timestamptz,
  -- extra: una notifica con consegna_il futura (silenzio, avviso programmato) resta invisibile al destinatario
  consegna_il timestamptz not null default now(),
  rif_id uuid,  -- extra: id dell'oggetto collegato (avviso, conversazione, cambio campo...)
  created_at timestamptz not null default now()
);
create index notifiche_centro_idx on public.notifiche (centro_id);
create index notifiche_membro_idx on public.notifiche (membro_id, letta_il, created_at desc);

create table public.consensi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  tipo text not null check (tipo in ('privacy', 'foto_video', 'ai')),
  valore boolean not null default false,
  firmato_da uuid references public.membri (id) on delete set null,
  firmato_il timestamptz,
  created_at timestamptz not null default now(),
  unique (allievo_id, tipo)
);
create index consensi_centro_idx on public.consensi (centro_id);
create index consensi_firmato_da_idx on public.consensi (firmato_da);

create table public.permessi_ruolo (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  area_id uuid references public.aree (id) on delete cascade,  -- null = permessi predefiniti del centro
  permessi jsonb not null default
    '{"gruppi":true,"campi":true,"maestri":true,"avvisi":true,"iscrizioni":true,"pagamenti":false,"metodo":"lettura","tutela":false}',
  created_at timestamptz not null default now()
);
create index permessi_ruolo_centro_idx on public.permessi_ruolo (centro_id);
create index permessi_ruolo_area_idx on public.permessi_ruolo (area_id);
create unique index permessi_ruolo_unico_idx on public.permessi_ruolo
  (centro_id, coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.registro (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  membro_id uuid references public.membri (id) on delete set null,
  azione text not null,
  oggetto text,
  dettagli jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index registro_centro_idx on public.registro (centro_id, created_at desc);
create index registro_membro_idx on public.registro (membro_id);

-- ───────── corsi e quote (area pagamenti) ─────────
create table public.corsi (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  nome text not null,
  gruppo_id uuid references public.gruppi (id) on delete set null,
  quota_cent int check (quota_cent is null or quota_cent >= 0),  -- null finché non la mette il centro: niente prezzi inventati
  sconto_fratelli_pct int check (sconto_fratelli_pct is null or sconto_fratelli_pct between 0 and 100),
  rate int,
  scadenze jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index corsi_centro_idx on public.corsi (centro_id);
create index corsi_gruppo_idx on public.corsi (gruppo_id);

create table public.quote (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centri (id) on delete cascade,
  allievo_id uuid not null references public.allievi (id) on delete cascade,
  corso_id uuid references public.corsi (id) on delete set null,
  periodo text,
  importo_cent int not null check (importo_cent >= 0),
  scade_il date,
  stato text not null default 'attesa' check (stato in ('attesa', 'pagata', 'scaduta')),
  pagata_il date,
  metodo text check (metodo is null or metodo in ('carta', 'segreteria', 'bonifico')),
  stripe_id text,
  created_at timestamptz not null default now()
);
create index quote_centro_idx on public.quote (centro_id, periodo, stato);
create index quote_allievo_idx on public.quote (allievo_id);
create index quote_corso_idx on public.quote (corso_id);
