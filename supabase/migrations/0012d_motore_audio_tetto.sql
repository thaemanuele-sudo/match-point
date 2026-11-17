-- 0012d · Tetto alla memoria della voce (motore_audio).
-- Prima ogni frase pronunciata diventava una riga permanente: con testi sempre diversi un solo account poteva
-- riempire il database. Ora motore_audio_scrivi:
--   1. non salva un singolo audio troppo grande (dati in base64 oltre 400.000 caratteri, circa 300 KB di MP3:
--      una frase breve ne pesa 40-160 KB);
--   2. non salva più nulla quando il totale conservato arriva a 200 MB.
-- Oltre i limiti NON dà errore e non scrive: la voce di quella richiesta è già stata pronunciata, serve solo alla prossima volta.
-- Il tipo di ritorno resta `void` (cambiarlo richiederebbe di cancellare la funzione): il codice già online e quello nuovo
-- non vedono nessuna differenza. Stessa protezione col token (motore_verifica) e stessi permessi di 0012b.
-- Le dimensioni si misurano con octet_length e non con length: octet_length legge la misura dall'intestazione del dato
-- senza aprirlo, mentre length obbligherebbe Postgres a leggere e decomprimere tutti gli audio (fino a 200 MB) a ogni scrittura.
-- Il base64 è solo ASCII, quindi i due numeri coincidono.
-- Solo ridefinizione della funzione: compatibile con il codice già online, nessun dato toccato.

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
declare
  c_max_singolo constant bigint := 400000;            -- caratteri base64 di un solo audio
  c_max_totale  constant bigint := 200 * 1024 * 1024; -- 200 MB di base64 in tutto
  v_totale bigint;
  v_vecchio bigint;
begin
  perform motore_verifica(p_token);
  if p_chiave is null or p_dati is null then return; end if;
  if octet_length(p_dati) > c_max_singolo then return; end if;

  -- Una sola scrittura per volta controlla il tetto, così due richieste in parallelo non lo superano insieme.
  perform pg_advisory_xact_lock(hashtext('motore_audio_tetto'));

  select coalesce(sum(octet_length(a.dati)), 0) into v_totale from motore_audio a;
  -- Se la frase c'è già e viene solo rinnovata, il suo vecchio peso non conta due volte.
  select coalesce(octet_length(a.dati), 0) into v_vecchio from motore_audio a where a.chiave = p_chiave;
  if v_totale - coalesce(v_vecchio, 0) + octet_length(p_dati) > c_max_totale then return; end if;

  insert into motore_audio as a (chiave, mime, dati)
  values (p_chiave, coalesce(p_mime, 'audio/mpeg'), p_dati)
  on conflict (chiave) do update set mime = excluded.mime, dati = excluded.dati, creato_il = now();
end
$$;

revoke all on function motore_audio_scrivi(text, text, text, text) from public;
grant execute on function motore_audio_scrivi(text, text, text, text) to anon, authenticated, service_role;
