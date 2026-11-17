-- 0012e · Tetto per utente ed esito umano unico (nucleo del motore aggiornato).
-- Copiato da sql/motore.sql del motore e adattato a Match Point:
--   - in Match Point le funzioni motore_* si chiamano con la chiave pubblica più il token del server (come in 0012b e 0012c):
--     le due funzioni nuove hanno quindi il permesso anche per `anon`; la sicurezza vera è motore_verifica(p_token);
--   - la tabella motore_contributi è chiusa a tutti (come motore_audio e motore_taratura): ci scrivono solo le funzioni.
-- Solo aggiunte (create ... if not exists, add column if not exists, create or replace): compatibile con il codice già online.
-- ---------------------------------------------------------------------
-- Tetto per utente ed esito umano unico (aggiunta additiva, idempotente)
-- ---------------------------------------------------------------------
-- Un solo utente non deve poter spostare un braccio da solo, né dare più volte
-- l'esito umano alla stessa chiamata. Le istanze del servizio non condividono la
-- memoria: il conto sta qui, in funzioni atomiche.

-- Un contributo di un utente a un braccio (prova in ombra, controllo, esito umano).
-- Serve solo a contare quanti ne ha dati nelle ultime 24 ore. Le righe vecchie si
-- tolgono dalla pulizia periodica, non da questo file.
create table if not exists motore_contributi (
  id         bigint generated always as identity primary key,
  app        text not null,
  utente     text not null,
  compito    text not null,
  versione   integer not null,
  secchio    text not null,
  modello    text not null,
  creato_il  timestamptz not null default now()
);
create index if not exists motore_contributi_braccio_idx
  on motore_contributi (app, utente, compito, versione, secchio, modello, creato_il);
create index if not exists motore_contributi_tempo_idx on motore_contributi (creato_il);
alter table motore_contributi enable row level security;

-- Segno persistente sulla chiamata: l'esito umano è già stato dato.
alter table motore_chiamate add column if not exists esito_umano_il timestamptz;

-- Prenota un contributo di `p_utente` al braccio. Conta quelli degli ultimi
-- `p_finestra_ms` millisecondi: se sono già `p_tetto` o più restituisce false e non
-- scrive nulla, altrimenti ne scrive uno e restituisce true. Il blocco consultivo
-- sulla coppia (utente, braccio) rende il conto esatto anche con richieste insieme.
create or replace function motore_contributo_prenota(
  p_token text default null,
  p_app text default null,
  p_utente text default null,
  p_compito text default null,
  p_versione integer default null,
  p_secchio text default null,
  p_modello text default null,
  p_tetto integer default 3,
  p_finestra_ms bigint default 86400000,
  p_adesso bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_adesso timestamptz := coalesce(to_timestamp(p_adesso / 1000.0), now());
  v_da timestamptz := coalesce(to_timestamp(p_adesso / 1000.0), now()) - (coalesce(p_finestra_ms, 86400000) * interval '1 millisecond');
  v_n integer;
begin
  perform motore_verifica(p_token);
  perform pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', p_app, p_utente, p_compito, p_versione::text, p_secchio, p_modello), 0));
  select count(*) into v_n
    from motore_contributi c
   where c.app = p_app and c.utente = p_utente and c.compito = p_compito
     and c.versione = p_versione and c.secchio = p_secchio and c.modello = p_modello
     and c.creato_il > v_da;
  if v_n >= coalesce(p_tetto, 3) then
    return false;
  end if;
  insert into motore_contributi (app, utente, compito, versione, secchio, modello, creato_il)
  values (p_app, p_utente, p_compito, p_versione, p_secchio, p_modello, v_adesso);
  return true;
end
$$;

-- Segna che la chiamata ha ricevuto un esito umano. Vero solo la prima volta
-- (l'aggiornamento condizionato è atomico); falso se già segnata o se non esiste.
create or replace function motore_esito_segna(
  p_token text default null,
  p_id text default null,
  p_adesso bigint default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_n integer;
begin
  perform motore_verifica(p_token);
  update motore_chiamate
     set esito_umano_il = coalesce(to_timestamp(p_adesso / 1000.0), now())
   where id = p_id and esito_umano_il is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end
$$;

-- Permessi: come le altre funzioni motore_* di Match Point (0012b, 0012c).
revoke all on table motore_contributi from public, anon, authenticated;
revoke all on function motore_contributo_prenota(text, text, text, text, integer, text, text, integer, bigint, bigint) from public;
revoke all on function motore_esito_segna(text, text, bigint) from public;
grant execute on function motore_contributo_prenota(text, text, text, text, integer, text, text, integer, bigint, bigint) to anon, authenticated, service_role;
grant execute on function motore_esito_segna(text, text, bigint) to anon, authenticated, service_role;
