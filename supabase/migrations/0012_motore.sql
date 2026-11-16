-- =====================================================================
-- Motore: database di ogni app (cache, bracci, chiamate, priori, modelli, config)
-- =====================================================================
-- Per qualsiasi Postgres con Supabase. Il file è idempotente: si può
-- rilanciare quante volte si vuole (create ... if not exists, create or replace).
--
-- Regole di questo file:
--  * sicurezza per riga accesa e NESSUNA policy: dalle tabelle non si entra,
--    si passa solo dalle funzioni `motore_*`;
--  * le funzioni sono `security definer` con `search_path` fissato (così non
--    si può dirottare una funzione con uno schema costruito ad arte) e
--    controllano `motore_autorizzato(p_token)` come prima cosa;
--  * i tempi sono `timestamptz` nel database e millisecondi (epoch) in ingresso
--    e in uscita dalle funzioni: la conversione sta dentro le funzioni;
--  * qui non ci sono istruzioni di cancellazione né di rimozione di tabelle:
--    lo strumento che applica il file le rifiuta. La pulizia vera è in
--    `sql/pulizia.sql`, da applicare a parte.
--
-- Primo avvio: impostare il token dell'app (se ne usa uno) con
--   insert into motore_config (chiave, valore)
--   values ('token_sha256', encode(extensions.digest('IL-TOKEN-SEGRETO', 'sha256'), 'hex'))
--   on conflict (chiave) do update set valore = excluded.valore;
-- Chi ha il ruolo service_role passa sempre e non ha bisogno del token.
--
-- Ogni parametro ha `default null`: Postgres lo impone, perché `p_token` ha un
-- default e quindi tutti i parametri che lo seguono devono averlo. Le funzioni
-- si chiamano con i nomi dei parametri (come fa PostgREST).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Tabelle
-- ---------------------------------------------------------------------

-- Cache delle risposte. `valore` contiene { testo, dati? }.
create table if not exists motore_cache (
  chiave     text primary key,
  app        text not null,
  compito    text not null,
  valore     jsonb not null,
  modello    text not null default '',
  creato_il  timestamptz not null default now(),
  scade_il   timestamptz not null
);
-- Serve alla pulizia delle voci scadute (sql/pulizia.sql).
create index if not exists motore_cache_scade_idx on motore_cache (scade_il);

-- Bracci: coppia modello e secchio di un compito, per una versione del compito.
create table if not exists motore_bracci (
  app            text not null,
  compito        text not null,
  versione       integer not null,
  secchio        text not null,
  modello        text not null,
  ok             double precision not null default 0,
  ko             double precision not null default 0,
  costo_medio    double precision not null default 0,
  latenza_media  double precision not null default 0,
  stato          text not null default 'prova' check (stato in ('prova', 'attivo', 'escluso')),
  aggiornato_il  timestamptz not null default now(),
  primary key (app, compito, versione, secchio, modello)
);

-- Registro delle chiamate (anche prove in ombra, controlli e giudizi).
create table if not exists motore_chiamate (
  id                     text primary key,
  app                    text not null,
  compito                text not null,
  versione               integer not null,
  secchio                text not null,
  modello                text not null,
  esito                  text not null check (esito in ('risposta', 'cache', 'locale', 'errore')),
  ombra                  boolean not null default false,
  token_in               bigint not null default 0,
  token_out              bigint not null default 0,
  caratteri              bigint not null default 0,
  costo_usd              double precision not null default 0,
  costo_riferimento_usd  double precision not null default 0,
  latenza_ms             double precision not null default 0,
  utente                 text,
  chiave_cache           text,
  creato_il              timestamptz not null default now()
);
create index if not exists motore_chiamate_app_tempo_idx on motore_chiamate (app, creato_il);
create index if not exists motore_chiamate_app_compito_tempo_idx on motore_chiamate (app, compito, creato_il);
-- Per i riepiloghi su tutte le app e per la pulizia delle chiamate vecchie.
create index if not exists motore_chiamate_tempo_idx on motore_chiamate (creato_il);

-- Priori (tabella di partenza per i bracci nuovi).
-- SCOSTAMENTO DAL CONTRATTO: la chiave primaria include anche `fonte`
-- (genere, modello, fonte) invece di (genere, modello). Serve a tenere separati
-- i contributi di fonti diverse (banco, app, centro): la fonte "centro" è uno
-- stato cumulato che si sostituisce a ogni sincronizzazione, mentre "banco" si
-- somma. Con una riga sola per (genere, modello) le due regole non convivrebbero.
-- Chi legge usa `motore_priori_leggi`, che somma le fonti.
create table if not exists motore_priori (
  genere         text not null check (genere in ('genera', 'classifica', 'estrai', 'vedi', 'parla')),
  modello        text not null,
  fonte          text not null,
  ok             double precision not null default 0,
  ko             double precision not null default 0,
  aggiornato_il  timestamptz not null default now(),
  primary key (genere, modello, fonte)
);

-- Catalogo dei modelli e dei prezzi (dollari per milione di token).
create table if not exists motore_modelli (
  id                       text primary key,
  fornitore                text not null,
  nome                     text not null,
  prezzo_in                double precision not null default 0,
  prezzo_out               double precision not null default 0,
  prezzo_cache_lettura     double precision,
  prezzo_cache_scrittura   double precision,
  prezzo_caratteri         double precision,
  immagini                 boolean,
  schema                   boolean,
  flusso                   boolean,
  voce                     boolean,
  contesto                 bigint,
  aggiornato_il            timestamptz not null default now()
);

-- Configurazione. Contiene `token_sha256`: lo SHA-256 (esadecimale) del token dell'app.
create table if not exists motore_config (
  chiave  text primary key,
  valore  text not null
);

-- Sicurezza per riga accesa e nessuna policy: nessuno legge le tabelle direttamente.
-- I proprietari (e quindi le funzioni security definer) la saltano.
alter table motore_cache    enable row level security;
alter table motore_bracci   enable row level security;
alter table motore_chiamate enable row level security;
alter table motore_priori   enable row level security;
alter table motore_modelli  enable row level security;
alter table motore_config   enable row level security;

-- Difesa in più: anche i permessi sulle tabelle vengono tolti ai ruoli pubblici.
revoke all on table motore_cache, motore_bracci, motore_chiamate, motore_priori, motore_modelli, motore_config
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Funzioni di servizio (interne: nessun ruolo esterno può chiamarle)
-- ---------------------------------------------------------------------

-- Millisecondi dall'epoca di un istante. Arrotonda: to_timestamp lavora in
-- virgola mobile e può sbagliare di un microsecondo.
create or replace function motore_ms(p_t timestamptz)
returns bigint
language sql
immutable
set search_path = public, extensions
as $$
  select round(extract(epoch from p_t) * 1000)::bigint
$$;

-- Fattore di dimenticanza 0,5^(giorni / emivita). Se l'orologio va indietro
-- (giorni negativi) vale 1: i dati non diventano "più freschi" del vero.
create or replace function motore_fattore(p_da timestamptz, p_a timestamptz, p_emivita_giorni double precision)
returns double precision
language sql
immutable
set search_path = public, extensions
as $$
  select power(0.5::double precision,
               greatest(0::double precision, extract(epoch from (p_a - p_da)) / 86400.0) / p_emivita_giorni)
$$;

-- Ruolo della richiesta, come lo imposta PostgREST. Fuori da PostgREST è null.
create or replace function motore_ruolo()
returns text
language sql
stable
set search_path = public, extensions
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    nullif(current_setting('request.jwt.claim.role', true), '')
  )
$$;

-- Passa chi ha il ruolo service_role, oppure chi presenta un token il cui
-- SHA-256 è uguale a quello salvato in motore_config. Si confrontano gli hash,
-- così il token vero non sta mai nel database.
create or replace function motore_autorizzato(p_token text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if motore_ruolo() = 'service_role' then
    return true;
  end if;
  if p_token is null or p_token = '' then
    return false;
  end if;
  return exists (
    select 1
      from motore_config c
     where c.chiave = 'token_sha256'
       and c.valore = encode(digest(p_token, 'sha256'), 'hex')
  );
end
$$;

-- Come motore_autorizzato, ma interrompe con un errore: è la prima riga di ogni funzione.
create or replace function motore_verifica(p_token text default null)
returns void
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not motore_autorizzato(p_token) then
    raise exception 'motore: non autorizzato' using errcode = '42501';
  end if;
end
$$;

-- Rappresentazione JSON di un braccio (tempi in millisecondi).
create or replace function motore_braccio_json(b motore_bracci)
returns jsonb
language sql
immutable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'app', b.app,
    'compito', b.compito,
    'versione', b.versione,
    'secchio', b.secchio,
    'modello', b.modello,
    'ok', b.ok,
    'ko', b.ko,
    'costo_medio', b.costo_medio,
    'latenza_media', b.latenza_media,
    'stato', b.stato,
    'aggiornato_il', motore_ms(b.aggiornato_il)
  )
$$;

-- ---------------------------------------------------------------------
-- Cache
-- ---------------------------------------------------------------------

-- Restituisce { testo, dati?, modello, creato_il } oppure null se manca o è scaduta.
create or replace function motore_cache_leggi(
  p_token text default null,
  p_chiave text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_r jsonb;
begin
  perform motore_verifica(p_token);
  select jsonb_build_object(
           'testo', c.valore -> 'testo',
           'modello', c.modello,
           'creato_il', motore_ms(c.creato_il)
         )
         -- `dati` si include solo se c'era: un `dati: null` vero resta null.
         || case when c.valore ? 'dati' then jsonb_build_object('dati', c.valore -> 'dati') else '{}'::jsonb end
    into v_r
    from motore_cache c
   where c.chiave = p_chiave
     and c.scade_il > now();
  return v_r;
end
$$;

-- Scrive (o sostituisce) una voce. La scadenza si conta da adesso; senza durata
-- vale 30 giorni (2592000 secondi), la durata della cache esatta del contratto.
create or replace function motore_cache_scrivi(
  p_token text default null,
  p_chiave text default null,
  p_app text default null,
  p_compito text default null,
  p_valore jsonb default null,
  p_modello text default null,
  p_creato_il bigint default null,
  p_durata_s double precision default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  insert into motore_cache as c (chiave, app, compito, valore, modello, creato_il, scade_il)
  values (
    p_chiave, p_app, p_compito, p_valore, coalesce(p_modello, ''),
    coalesce(to_timestamp(p_creato_il / 1000.0), now()),
    now() + make_interval(secs => coalesce(p_durata_s, 2592000))
  )
  on conflict (chiave) do update
    set app = excluded.app,
        compito = excluded.compito,
        valore = excluded.valore,
        modello = excluded.modello,
        creato_il = excluded.creato_il,
        scade_il = excluded.scade_il;
end
$$;

-- "Toglie" una voce facendola scadere subito (qui non si cancella nulla: la
-- rimozione fisica la fa sql/pulizia.sql). Una voce già scaduta resta com'è.
create or replace function motore_cache_togli(
  p_token text default null,
  p_chiave text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  update motore_cache
     set scade_il = now()
   where chiave = p_chiave
     and scade_il > now();
end
$$;

-- ---------------------------------------------------------------------
-- Bracci
-- ---------------------------------------------------------------------

-- Tutti i bracci di un compito e di una versione, ordinati per secchio e modello.
create or replace function motore_bracci_leggi(
  p_token text default null,
  p_app text default null,
  p_compito text default null,
  p_versione integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  return coalesce(
    (select jsonb_agg(motore_braccio_json(b) order by b.secchio collate "C", b.modello collate "C")
       from motore_bracci b
      where b.app = p_app and b.compito = p_compito and b.versione = p_versione),
    '[]'::jsonb
  );
end
$$;

-- Aggiornamento atomico di un braccio, in UN'unica istruzione:
--  1. applica la dimenticanza a ok e ko: valore * 0,5^(giorni / emivita);
--  2. somma il delta;
--  3. aggiorna costo e latenza medi con una media pesata sulle prove: il peso
--     dei dati vecchi è (ok + ko) dopo la dimenticanza, quello del nuovo è
--     (delta ok + delta ko), oppure 1 se il delta non porta prove;
--  4. se il braccio non esiste lo crea in stato "prova".
-- Perché in una sola istruzione: due richieste insieme si accodano sul blocco
-- della riga e nessuna delle due perde il suo delta.
-- Se costo o latenza non sono indicati, la media resta quella che era.
create or replace function motore_braccio_aggiorna(
  p_token text default null,
  p_app text default null,
  p_compito text default null,
  p_versione integer default null,
  p_secchio text default null,
  p_modello text default null,
  p_ok double precision default 0,
  p_ko double precision default 0,
  p_costo_usd double precision default null,
  p_latenza_ms double precision default null,
  p_emivita_giorni double precision default 30,
  p_adesso bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_adesso timestamptz := coalesce(to_timestamp(p_adesso / 1000.0), now());
  v_emivita double precision := coalesce(p_emivita_giorni, 30);
  v_ok double precision := coalesce(p_ok, 0);
  v_ko double precision := coalesce(p_ko, 0);
  v_peso double precision;
  v_r jsonb;
begin
  perform motore_verifica(p_token);
  if v_emivita <= 0 then
    raise exception 'motore: l''emivita deve essere positiva';
  end if;
  v_peso := case when v_ok + v_ko > 0 then v_ok + v_ko else 1 end;

  with nuovo as (
    insert into motore_bracci as b
      (app, compito, versione, secchio, modello, ok, ko, costo_medio, latenza_media, stato, aggiornato_il)
    values
      (p_app, p_compito, p_versione, p_secchio, p_modello, v_ok, v_ko,
       coalesce(p_costo_usd, 0), coalesce(p_latenza_ms, 0), 'prova', v_adesso)
    on conflict (app, compito, versione, secchio, modello) do update
      set ok = b.ok * motore_fattore(b.aggiornato_il, v_adesso, v_emivita) + v_ok,
          ko = b.ko * motore_fattore(b.aggiornato_il, v_adesso, v_emivita) + v_ko,
          costo_medio = case
            when p_costo_usd is null then b.costo_medio
            else (b.costo_medio * (b.ok + b.ko) * motore_fattore(b.aggiornato_il, v_adesso, v_emivita)
                  + p_costo_usd * v_peso)
                 / ((b.ok + b.ko) * motore_fattore(b.aggiornato_il, v_adesso, v_emivita) + v_peso)
          end,
          latenza_media = case
            when p_latenza_ms is null then b.latenza_media
            else (b.latenza_media * (b.ok + b.ko) * motore_fattore(b.aggiornato_il, v_adesso, v_emivita)
                  + p_latenza_ms * v_peso)
                 / ((b.ok + b.ko) * motore_fattore(b.aggiornato_il, v_adesso, v_emivita) + v_peso)
          end,
          -- Mai all'indietro: un orologio in ritardo non deve far "ringiovanire" i dati.
          aggiornato_il = greatest(b.aggiornato_il, v_adesso)
    returning b.*
  )
  -- `returning b.*` mantiene l'ordine delle colonne della tabella: si può
  -- rileggere la riga come tipo composito.
  select motore_braccio_json(row(n.*)::motore_bracci) into v_r from nuovo n;

  return v_r;
end
$$;

-- Imposta lo stato di un braccio (prova, attivo, escluso). Se il braccio non
-- esiste lo crea vuoto: serve a escludere a mano un modello prima di ogni dato.
-- Non tocca `aggiornato_il`: la dimenticanza si misura dall'ultimo aggiornamento
-- dei conteggi, non dal cambio di stato.
create or replace function motore_braccio_stato(
  p_token text default null,
  p_app text default null,
  p_compito text default null,
  p_versione integer default null,
  p_secchio text default null,
  p_modello text default null,
  p_stato text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  insert into motore_bracci as b (app, compito, versione, secchio, modello, stato)
  values (p_app, p_compito, p_versione, p_secchio, p_modello, p_stato)
  on conflict (app, compito, versione, secchio, modello) do update
    set stato = excluded.stato;
end
$$;

-- ---------------------------------------------------------------------
-- Chiamate
-- ---------------------------------------------------------------------

-- Registra una chiamata. `p_chiamata` ha le chiavi del tipo `Chiamata`
-- (creato_il in millisecondi). Registrare due volte lo stesso id non fa nulla.
create or replace function motore_chiamata_registra(
  p_token text default null,
  p_chiamata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  insert into motore_chiamate
    (id, app, compito, versione, secchio, modello, esito, ombra, token_in, token_out, caratteri,
     costo_usd, costo_riferimento_usd, latenza_ms, utente, chiave_cache, creato_il)
  values (
    p_chiamata ->> 'id',
    p_chiamata ->> 'app',
    p_chiamata ->> 'compito',
    (p_chiamata ->> 'versione')::integer,
    p_chiamata ->> 'secchio',
    p_chiamata ->> 'modello',
    p_chiamata ->> 'esito',
    coalesce((p_chiamata ->> 'ombra')::boolean, false),
    round(coalesce((p_chiamata ->> 'token_in')::numeric, 0))::bigint,
    round(coalesce((p_chiamata ->> 'token_out')::numeric, 0))::bigint,
    round(coalesce((p_chiamata ->> 'caratteri')::numeric, 0))::bigint,
    coalesce((p_chiamata ->> 'costo_usd')::double precision, 0),
    coalesce((p_chiamata ->> 'costo_riferimento_usd')::double precision, 0),
    coalesce((p_chiamata ->> 'latenza_ms')::double precision, 0),
    p_chiamata ->> 'utente',
    p_chiamata ->> 'chiave_cache',
    coalesce(to_timestamp((p_chiamata ->> 'creato_il')::double precision / 1000.0), now())
  )
  on conflict (id) do nothing;
end
$$;

-- Una chiamata per id, oppure null. I campi vuoti (utente, chiave_cache) non compaiono.
create or replace function motore_chiamata_leggi(
  p_token text default null,
  p_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_r jsonb;
begin
  perform motore_verifica(p_token);
  select jsonb_strip_nulls(jsonb_build_object(
           'id', c.id,
           'app', c.app,
           'compito', c.compito,
           'versione', c.versione,
           'secchio', c.secchio,
           'modello', c.modello,
           'esito', c.esito,
           'ombra', c.ombra,
           'token_in', c.token_in,
           'token_out', c.token_out,
           'caratteri', c.caratteri,
           'costo_usd', c.costo_usd,
           'costo_riferimento_usd', c.costo_riferimento_usd,
           'latenza_ms', c.latenza_ms,
           'utente', c.utente,
           'chiave_cache', c.chiave_cache,
           'creato_il', motore_ms(c.creato_il)
         ))
    into v_r
    from motore_chiamate c
   where c.id = p_id;
  return v_r;
end
$$;

-- ---------------------------------------------------------------------
-- Priori
-- ---------------------------------------------------------------------

-- Priori di un genere: { modello: { ok, ko } }, somma di tutte le fonti.
create or replace function motore_priori_leggi(
  p_token text default null,
  p_genere text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  return coalesce(
    (select jsonb_object_agg(s.modello, jsonb_build_object('ok', s.ok, 'ko', s.ko))
       from (select p.modello, sum(p.ok) as ok, sum(p.ko) as ko
               from motore_priori p
              where p.genere = p_genere
              group by p.modello) s),
    '{}'::jsonb
  );
end
$$;

-- Aggiunge un contributo ai priori.
-- REGOLA DELLE FONTI: "centro" e "app" sono stati cumulati (il centro pubblica
-- ogni volta la somma di tutto): quindi SOSTITUISCONO il valore precedente della
-- stessa fonte. Ripetere la sincronizzazione con il centro non raddoppia i priori.
-- Tutte le altre fonti (per esempio "banco") si SOMMANO.
create or replace function motore_priori_somma(
  p_token text default null,
  p_genere text default null,
  p_modello text default null,
  p_ok double precision default 0,
  p_ko double precision default 0,
  p_fonte text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  insert into motore_priori as p (genere, modello, fonte, ok, ko)
  values (p_genere, p_modello, p_fonte, coalesce(p_ok, 0), coalesce(p_ko, 0))
  on conflict (genere, modello, fonte) do update
    set ok = case when excluded.fonte in ('centro', 'app') then excluded.ok else p.ok + excluded.ok end,
        ko = case when excluded.fonte in ('centro', 'app') then excluded.ko else p.ko + excluded.ko end,
        aggiornato_il = now();
end
$$;

-- ---------------------------------------------------------------------
-- Riepilogo
-- ---------------------------------------------------------------------

-- Aggrega le chiamate per compito e modello tra `p_da` e `p_a` (millisecondi,
-- estremi inclusi; null = senza limite). `p_app` null = tutte le app.
--  chiamate = tutte le righe; da_cache / locali = esito cache / locale;
--  ombra = chiamate non andate all'utente;
--  latenza_media = media delle sole chiamate con esito "risposta" (cache e
--  regole locali durano quasi zero e falserebbero la media).
create or replace function motore_riepilogo(
  p_token text default null,
  p_app text default null,
  p_da bigint default null,
  p_a bigint default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  return coalesce(
    (select jsonb_agg(
              jsonb_build_object(
                'compito', r.compito,
                'modello', r.modello,
                'chiamate', r.chiamate,
                'da_cache', r.da_cache,
                'locali', r.locali,
                'ombra', r.ombra,
                'costo_usd', r.costo_usd,
                'costo_riferimento_usd', r.costo_riferimento_usd,
                'latenza_media', r.latenza_media
              )
              order by r.compito collate "C", r.modello collate "C")
       from (select c.compito,
                    c.modello,
                    count(*) as chiamate,
                    count(*) filter (where c.esito = 'cache') as da_cache,
                    count(*) filter (where c.esito = 'locale') as locali,
                    count(*) filter (where c.ombra) as ombra,
                    coalesce(sum(c.costo_usd), 0) as costo_usd,
                    coalesce(sum(c.costo_riferimento_usd), 0) as costo_riferimento_usd,
                    coalesce(avg(c.latenza_ms) filter (where c.esito = 'risposta'), 0) as latenza_media
               from motore_chiamate c
              where (p_app is null or c.app = p_app)
                and (p_da is null or c.creato_il >= to_timestamp(p_da / 1000.0))
                and (p_a is null or c.creato_il <= to_timestamp(p_a / 1000.0))
              group by c.compito, c.modello) r),
    '[]'::jsonb
  );
end
$$;

-- ---------------------------------------------------------------------
-- Permessi sulle funzioni
-- ---------------------------------------------------------------------
-- La sicurezza vera sta nel token (o nel ruolo service_role). I permessi di
-- esecuzione tolgono comunque l'accesso anonimo.

-- Funzioni pubbliche: authenticated e service_role.
revoke all on function motore_cache_leggi(text, text) from public, anon;
revoke all on function motore_cache_scrivi(text, text, text, text, jsonb, text, bigint, double precision) from public, anon;
revoke all on function motore_cache_togli(text, text) from public, anon;
revoke all on function motore_bracci_leggi(text, text, text, integer) from public, anon;
revoke all on function motore_braccio_aggiorna(text, text, text, integer, text, text, double precision, double precision, double precision, double precision, double precision, bigint) from public, anon;
revoke all on function motore_braccio_stato(text, text, text, integer, text, text, text) from public, anon;
revoke all on function motore_chiamata_registra(text, jsonb) from public, anon;
revoke all on function motore_chiamata_leggi(text, text) from public, anon;
revoke all on function motore_priori_leggi(text, text) from public, anon;
revoke all on function motore_priori_somma(text, text, text, double precision, double precision, text) from public, anon;
revoke all on function motore_riepilogo(text, text, bigint, bigint) from public, anon;

grant execute on function motore_cache_leggi(text, text) to authenticated, service_role;
grant execute on function motore_cache_scrivi(text, text, text, text, jsonb, text, bigint, double precision) to authenticated, service_role;
grant execute on function motore_cache_togli(text, text) to authenticated, service_role;
grant execute on function motore_bracci_leggi(text, text, text, integer) to authenticated, service_role;
grant execute on function motore_braccio_aggiorna(text, text, text, integer, text, text, double precision, double precision, double precision, double precision, double precision, bigint) to authenticated, service_role;
grant execute on function motore_braccio_stato(text, text, text, integer, text, text, text) to authenticated, service_role;
grant execute on function motore_chiamata_registra(text, jsonb) to authenticated, service_role;
grant execute on function motore_chiamata_leggi(text, text) to authenticated, service_role;
grant execute on function motore_priori_leggi(text, text) to authenticated, service_role;
grant execute on function motore_priori_somma(text, text, text, double precision, double precision, text) to authenticated, service_role;
grant execute on function motore_riepilogo(text, text, bigint, bigint) to authenticated, service_role;

-- Funzioni interne: le chiamano solo le funzioni sopra (che girano da proprietario).
-- Non ci sono permessi da dare; si toglie anche l'accesso a chi li ha per
-- impostazione predefinita, perché `motore_autorizzato` altrimenti permetterebbe
-- a chiunque di provare dei token a raffica.
revoke all on function motore_ms(timestamptz) from public, anon, authenticated, service_role;
revoke all on function motore_fattore(timestamptz, timestamptz, double precision) from public, anon, authenticated, service_role;
revoke all on function motore_ruolo() from public, anon, authenticated, service_role;
revoke all on function motore_autorizzato(text) from public, anon, authenticated, service_role;
revoke all on function motore_verifica(text) from public, anon, authenticated, service_role;
revoke all on function motore_braccio_json(motore_bracci) from public, anon, authenticated, service_role;
