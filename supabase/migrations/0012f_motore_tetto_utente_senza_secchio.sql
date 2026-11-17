-- 0012f · Il tetto per utente conta per modello, senza il secchio.
-- Prima il conto era per (app, utente, compito, versione, secchio, modello): il secchio (facile, media, difficile)
-- dipende dal testo, quindi chi scrive poteva moltiplicare i suoi 3 contributi al giorno per il numero di secchi.
-- Ora il conto e il blocco sono per (app, utente, compito, versione, modello). La colonna `secchio` si scrive ancora.
-- Stessa firma di prima (i permessi di 0012e restano validi). Solo ridefinizione e un indice in più: nessun dato toccato.

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
  -- Una prenotazione per volta sullo stesso utente e modello, così due richieste in parallelo non superano il tetto.
  perform pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', p_app, p_utente, p_compito, p_versione::text, p_modello), 0));
  select count(*) into v_n
    from motore_contributi c
   where c.app = p_app and c.utente = p_utente and c.compito = p_compito
     and c.versione = p_versione and c.modello = p_modello
     and c.creato_il > v_da;
  if v_n >= coalesce(p_tetto, 3) then
    return false;
  end if;
  insert into motore_contributi (app, utente, compito, versione, secchio, modello, creato_il)
  values (p_app, p_utente, p_compito, p_versione, p_secchio, p_modello, v_adesso);
  return true;
end
$$;

create index if not exists motore_contributi_conto_idx
  on motore_contributi (app, utente, compito, versione, modello, creato_il);
