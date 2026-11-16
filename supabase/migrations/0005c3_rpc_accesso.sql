create or replace function public.centro_pubblico(slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'nome', c.nome, 'nome_app', c.nome_app,
                            'colore', c.colore, 'colore_ink', c.colore_ink, 'logo_path', c.logo_path)
  from public.centri c where c.slug = centro_pubblico.slug
$$;

create or replace function public.anteprima_invito(codice text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  i public.inviti%rowtype; c public.centri%rowtype; dt_nome text; gruppo_nome text; area_nome text; allievo_nome text;
begin
  select * into i from public.inviti where inviti.codice = upper(btrim(anteprima_invito.codice));
  if not found then return jsonb_build_object('valido', false, 'motivo', 'non_trovato'); end if;
  select * into c from public.centri where id = i.centro_id;
  if not found or c.stato = 'sospeso' then return jsonb_build_object('valido', false, 'motivo', 'non_trovato'); end if;
  if i.scade_il is not null and i.scade_il < now() then return jsonb_build_object('valido', false, 'motivo', 'scaduto'); end if;
  if i.usi_max is not null and i.usi >= i.usi_max then return jsonb_build_object('valido', false, 'motivo', 'esaurito'); end if;
  select m.nome || ' ' || coalesce(m.cognome, '') into dt_nome from public.membri m
    where m.centro_id = c.id and m.ruolo = 'dt' and m.stato <> 'sospeso' order by m.created_at limit 1;
  select g.nome into gruppo_nome from public.gruppi g where g.id = i.gruppo_id;
  select a.nome into area_nome from public.aree a where a.id = i.area_id;
  select al.nome into allievo_nome from public.allievi al where al.id = i.allievo_id;
  return jsonb_build_object(
    'valido', true, 'centro_nome', c.nome, 'citta', c.citta, 'dt_nome', btrim(dt_nome),
    'n_maestri', (select count(*) from public.membri m where m.centro_id = c.id and m.ruolo = 'maestro' and m.stato <> 'sospeso'),
    'n_gruppi', (select count(*) from public.gruppi g where g.centro_id = c.id and g.attivo),
    'n_allievi', (select count(*) from public.allievi al where al.centro_id = c.id),
    'ruolo', i.ruolo, 'scade_il', i.scade_il, 'gruppo_nome', gruppo_nome, 'area_nome', area_nome, 'allievo_nome', allievo_nome);
end $$;

create or replace function public.unisciti_con_codice(codice text) returns json
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_codice text := codice; v_user uuid := (select auth.uid());
  i public.inviti%rowtype; c public.centri%rowtype; p public.profiles%rowtype; v_membro uuid;
begin
  if v_user is null then raise exception 'Accedi per usare un codice' using errcode = '42501'; end if;
  select * into i from public.inviti where inviti.codice = upper(btrim(v_codice)) for update;
  if not found then raise exception 'Codice non valido' using errcode = 'P0002'; end if;
  if i.scade_il is not null and i.scade_il < now() then raise exception 'Codice scaduto' using errcode = 'P0001'; end if;
  if i.usi_max is not null and i.usi >= i.usi_max then raise exception 'Codice esaurito: ha già raggiunto il numero di usi' using errcode = 'P0001'; end if;
  select * into c from public.centri where id = i.centro_id;
  if c.stato = 'sospeso' then raise exception 'Codice non valido' using errcode = 'P0002'; end if;
  select * into p from public.profiles where id = v_user;

  select m.id into v_membro from public.membri m
    where m.centro_id = i.centro_id and m.user_id = v_user and m.ruolo = i.ruolo
      and coalesce(m.area_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(i.area_id, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_membro is null then
    insert into public.membri (centro_id, user_id, ruolo, nome, cognome, email, telefono, area_id, stato)
      values (i.centro_id, v_user, i.ruolo, coalesce(nullif(p.nome, ''), 'Nuovo'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, ''),
              case when i.ruolo = 'responsabile_area' then i.area_id end, 'attivo')
      returning id into v_membro;
  end if;
  if i.ruolo = 'genitore' and i.allievo_id is not null then
    insert into public.allievi_famiglie (centro_id, allievo_id, membro_id, relazione) values (i.centro_id, i.allievo_id, v_membro, 'genitore') on conflict do nothing;
  end if;
  if i.ruolo = 'allievo' and i.allievo_id is not null then
    update public.allievi set membro_id = v_membro where id = i.allievo_id and membro_id is null;
  end if;
  if i.ruolo = 'maestro' and i.gruppo_id is not null then
    insert into public.gruppi_maestri (centro_id, gruppo_id, membro_id, principale) values (i.centro_id, i.gruppo_id, v_membro, false) on conflict do nothing;
  end if;
  update public.inviti set usi = usi + 1 where id = i.id;
  return json_build_object('centro_slug', c.slug, 'ruolo', i.ruolo);
end $$;

create or replace function public.registra_centro(nome text, citta text, slug text, campi int default 4) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_nome text := btrim(nome); v_citta text := nullif(btrim(citta), ''); v_slug text := lower(btrim(slug)); v_campi int := coalesce(campi, 4);
  v_user uuid := (select auth.uid()); p public.profiles%rowtype; v_id uuid; v_modello uuid; n int;
begin
  if v_user is null then raise exception 'Accedi per registrare un centro' using errcode = '42501'; end if;
  if v_nome is null or v_nome = '' then raise exception 'Serve il nome del centro' using errcode = '22023'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 3 and 40 then
    raise exception 'Indirizzo non valido: usa 3-40 lettere minuscole, numeri e trattini' using errcode = '22023';
  end if;
  if v_campi < 0 or v_campi > 30 then raise exception 'Numero di campi non valido' using errcode = '22023'; end if;
  if not public.is_admin() and (select count(*) from public.centri where creato_da = v_user) >= 5 then
    raise exception 'Hai già registrato il numero massimo di centri' using errcode = '42501';
  end if;
  select * into p from public.profiles where id = v_user;
  insert into public.centri (slug, nome, nome_app, citta, stato, prova_fino, piano, creato_da)
    values (v_slug, v_nome, v_nome, v_citta, 'prova', current_date + 30, 'prova', v_user) returning id into v_id;
  insert into public.membri (centro_id, user_id, ruolo, nome, cognome, email, telefono) values
    (v_id, v_user, 'titolare', coalesce(nullif(p.nome, ''), 'Titolare'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, '')),
    (v_id, v_user, 'dt', coalesce(nullif(p.nome, ''), 'Titolare'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, ''));
  for n in 1..v_campi loop
    insert into public.campi (centro_id, numero, nome) values (v_id, n, 'Campo ' || n);
  end loop;
  select id into v_modello from public.centri where centri.slug = 'matchpoint-modello';
  if v_modello is not null then perform public._clona_contenuti(v_modello, v_id, false); end if;
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'centro_slug', v_slug);
end $$;

create or replace function public.clona_centro(sorgente uuid, nome text, slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_src uuid := sorgente; v_nome text := btrim(nome); v_slug text := lower(btrim(slug)); v_id uuid; s public.centri%rowtype;
begin
  if not public.is_admin() then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  select * into s from public.centri where id = v_src;
  if not found then raise exception 'Centro di origine non trovato' using errcode = 'P0002'; end if;
  if v_nome is null or v_nome = '' then raise exception 'Serve il nome del centro' using errcode = '22023'; end if;
  insert into public.centri (slug, nome, nome_app, citta, colore, colore_ink, stato, prova_fino, piano, creato_da)
    values (v_slug, v_nome, v_nome, null, s.colore, s.colore_ink, 'prova', current_date + 30, 'prova', (select auth.uid()))
    returning id into v_id;
  perform public._clona_contenuti(v_src, v_id, true);
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'centro_slug', v_slug);
end $$;
