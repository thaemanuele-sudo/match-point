-- Funzione che manca nel contratto docs/CENTRI.md e che serve all'anteprima di P2 (/app/unisciti).
-- Da inserire nella migrazione 0005_centri (area DB). Senza questa funzione la pagina funziona lo stesso,
-- ma senza anteprima del centro: il controllo del codice resta tutto in `unisciti_con_codice`.
--
-- Perché una funzione e non una select: chi riceve un invito non è ancora membro del centro, quindi l'RLS
-- gli nasconde `inviti` e `centri`. La funzione restituisce solo il minimo necessario per riconoscere il centro
-- (nome, città, direttore, tre contatori, ruolo offerto) e non rivela nessun dato di persone o allievi.

create or replace function public.anteprima_invito(codice text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  i public.inviti%rowtype;
  c public.centri%rowtype;
  dt_nome text;
  gruppo_nome text;
  area_nome text;
  allievo_nome text;
begin
  select * into i from public.inviti where inviti.codice = upper(trim(anteprima_invito.codice));
  if not found then
    return jsonb_build_object('valido', false, 'motivo', 'non_trovato');
  end if;

  select * into c from public.centri where id = i.centro_id;
  if not found or c.stato = 'sospeso' then
    return jsonb_build_object('valido', false, 'motivo', 'non_trovato');
  end if;

  if i.scade_il is not null and i.scade_il < now() then
    return jsonb_build_object('valido', false, 'motivo', 'scaduto');
  end if;
  if i.usi_max is not null and i.usi >= i.usi_max then
    return jsonb_build_object('valido', false, 'motivo', 'esaurito');
  end if;

  select m.nome || ' ' || m.cognome into dt_nome
    from public.membri m
   where m.centro_id = c.id and m.ruolo = 'dt' and m.stato <> 'sospeso'
   order by m.created_at limit 1;
  select g.nome into gruppo_nome from public.gruppi g where g.id = i.gruppo_id;
  select a.nome into area_nome from public.aree a where a.id = i.area_id;
  -- il nome dell'allievo si mostra solo al genitore che riceve l'invito per quell'allievo (solo il nome di battesimo)
  select al.nome into allievo_nome from public.allievi al where al.id = i.allievo_id;

  return jsonb_build_object(
    'valido', true,
    'centro_nome', c.nome,
    'citta', c.citta,
    'dt_nome', dt_nome,
    'n_maestri', (select count(*) from public.membri m where m.centro_id = c.id and m.ruolo = 'maestro' and m.stato <> 'sospeso'),
    'n_gruppi', (select count(*) from public.gruppi g where g.centro_id = c.id and g.attivo),
    'n_allievi', (select count(*) from public.allievi al where al.centro_id = c.id),
    'ruolo', i.ruolo,
    'scade_il', i.scade_il,
    'gruppo_nome', gruppo_nome,
    'area_nome', area_nome,
    'allievo_nome', allievo_nome
  );
end;
$$;

revoke all on function public.anteprima_invito(text) from public;
grant execute on function public.anteprima_invito(text) to authenticated;
