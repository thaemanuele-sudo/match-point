-- 0006c0 · Correzione dei trigger di protezione di allievi e membri.
-- Nella 0005 il confronto "centro_id = any ((select funzione()))" veniva letto come sottoquery di righe uuid
-- contro un array uuid[] e ogni UPDATE su allievi e membri falliva con "operator does not exist: uuid = uuid[]".
-- Ora la funzione restituisce direttamente l'array e il confronto è tra uuid e uuid[] come previsto.
create or replace function public.proteggi_allievo() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if current_user in ('authenticated', 'anon')
     and not ((select public.is_admin()) or old.centro_id = any (public.centri_amm())) then
    new.nome := old.nome; new.cognome := old.cognome; new.data_nascita := old.data_nascita;
    new.membro_id := old.membro_id; new.centro_id := old.centro_id;
  end if;
  return new;
end $fn$;

create or replace function public.proteggi_membro() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if current_user in ('authenticated', 'anon')
     and not ((select public.is_admin()) or old.centro_id = any (public.centri_dt())) then
    new.ruolo := old.ruolo; new.stato := old.stato; new.area_id := old.area_id;
    new.user_id := old.user_id; new.centro_id := old.centro_id;
  end if;
  return new;
end $fn$;
