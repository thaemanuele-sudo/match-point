-- 0012b · Motore dentro Match Point: parti che sono dell'app e non di sql/motore.sql.
--   1. permesso anon sulle funzioni motore_*: come le funzioni server_* già esistenti, il server parla con la chiave
--      pubblica quando manca MP_SUPABASE_SERVICE_ROLE_KEY. La sicurezza vera è il token (motore_config.token_sha256,
--      copiato da settings._server_token_sha256): senza token ogni funzione risponde "non autorizzato".
--   2. deposito dell'audio su tabella (ripiego quando non c'è la chiave service_role per Storage), protetto dal token
--   3. secchio Storage privato "motore" per la voce in cache (si usa se c'è la chiave service_role)
--   4. lezioni: id della chiamata e testo della bozza del riassunto, per dare al motore l'esito del maestro
-- Solo aggiunte: compatibile con il codice già online.

-- 1. anon come per le funzioni server_*
grant execute on function motore_cache_leggi(text, text) to anon;
grant execute on function motore_cache_scrivi(text, text, text, text, jsonb, text, bigint, double precision) to anon;
grant execute on function motore_cache_togli(text, text) to anon;
grant execute on function motore_bracci_leggi(text, text, text, integer) to anon;
grant execute on function motore_braccio_aggiorna(text, text, text, integer, text, text, double precision, double precision, double precision, double precision, double precision, bigint) to anon;
grant execute on function motore_braccio_stato(text, text, text, integer, text, text, text) to anon;
grant execute on function motore_chiamata_registra(text, jsonb) to anon;
grant execute on function motore_chiamata_leggi(text, text) to anon;
grant execute on function motore_priori_leggi(text, text) to anon;
grant execute on function motore_priori_somma(text, text, text, double precision, double precision, text) to anon;
grant execute on function motore_riepilogo(text, text, bigint, bigint) to anon;

-- 2. audio su tabella: `dati` è l'MP3 in base64
create table if not exists motore_audio (
  chiave     text primary key,
  mime       text not null,
  dati       text not null,
  creato_il  timestamptz not null default now()
);
alter table motore_audio enable row level security;
revoke all on table motore_audio from public, anon, authenticated;

create or replace function motore_audio_leggi(
  p_token text default null,
  p_chiave text default null
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
  select jsonb_build_object('mime', a.mime, 'dati', a.dati) into v_r
    from motore_audio a
   where a.chiave = p_chiave;
  return v_r;
end
$$;

create or replace function motore_audio_scrivi(
  p_token text default null,
  p_chiave text default null,
  p_mime text default null,
  p_dati text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  insert into motore_audio as a (chiave, mime, dati)
  values (p_chiave, coalesce(p_mime, 'audio/mpeg'), p_dati)
  on conflict (chiave) do update set mime = excluded.mime, dati = excluded.dati, creato_il = now();
end
$$;

revoke all on function motore_audio_leggi(text, text) from public;
revoke all on function motore_audio_scrivi(text, text, text, text) from public;
grant execute on function motore_audio_leggi(text, text) to anon, authenticated, service_role;
grant execute on function motore_audio_scrivi(text, text, text, text) to anon, authenticated, service_role;

-- 3. secchio privato per la voce (nessuna policy: ci scrive solo la chiave service_role)
insert into storage.buckets (id, name, public) values ('motore', 'motore', false) on conflict (id) do nothing;

-- 4. riassunto della lezione: quale chiamata del motore l'ha scritto e com'era la bozza.
-- Il maestro lo può riscrivere: confrontando bozza e testo approvato il server dice al motore se è andata bene.
alter table public.lezioni add column if not exists riassunto_chiamata_id text;
alter table public.lezioni add column if not exists riassunto_bozza text;
