create or replace function public.avvisa_assenza(allievo uuid, data date, motivo text, testo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_al uuid := allievo; v_data date := data; v_motivo text := motivo; v_testo text := nullif(btrim(testo), '');
  a public.allievi%rowtype; c public.centri%rowtype; v_me uuid; v_famiglia boolean; v_gruppi uuid[]; r record; v_ore int; v_n int := 0; v_nome text; v_titolo text;
begin
  select * into a from public.allievi where id = v_al;
  if not found then raise exception 'Allievo non trovato' using errcode = 'P0002'; end if;
  v_famiglia := v_al = any (public.miei_allievi_famiglia());
  if not (public.is_admin() or v_famiglia or a.centro_id = any (public.centri_amm()) or v_al = any (public.miei_allievi_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if v_motivo not in ('malato', 'scuola', 'viaggio', 'altro') then raise exception 'Motivo non valido' using errcode = '22023'; end if;
  select * into c from public.centri where id = a.centro_id;
  v_ore := coalesce((c.impostazioni ->> 'assenza_entro_ore')::int, 2);
  select array_agg(g.id) into v_gruppi from public.iscrizioni i join public.gruppi g on g.id = i.gruppo_id
    where i.allievo_id = v_al and (i.al is null or i.al >= v_data) and i.dal <= v_data and g.attivo and extract(isodow from v_data)::int = any (g.giorni);
  if v_famiglia and not (public.is_admin() or a.centro_id = any (public.centri_amm())) then
    for r in select g.nome, g.ora from public.gruppi g where g.id = any (coalesce(v_gruppi, '{}')) and g.ora is not null loop
      if now() > ((v_data + r.ora) at time zone 'Europe/Rome') - make_interval(hours => v_ore) then
        raise exception 'Troppo tardi: serve avvisare almeno % ore prima. Avvisa il maestro o la segreteria.', v_ore using errcode = 'P0001';
      end if;
    end loop;
  end if;
  v_me := public.mio_membro(a.centro_id);
  if v_gruppi is null then
    insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da) values (a.centro_id, v_al, v_data, null, v_motivo, v_testo, v_me)
      on conflict (allievo_id, data, (coalesce(gruppo_id, '00000000-0000-0000-0000-000000000000'::uuid))) do update set motivo = excluded.motivo, testo = excluded.testo;
    v_n := 1;
  else
    insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da)
      select a.centro_id, v_al, v_data, x, v_motivo, v_testo, v_me from unnest(v_gruppi) x
      on conflict (allievo_id, data, (coalesce(gruppo_id, '00000000-0000-0000-0000-000000000000'::uuid))) do update set motivo = excluded.motivo, testo = excluded.testo;
    v_n := array_length(v_gruppi, 1);
  end if;
  v_nome := btrim(a.nome || ' ' || coalesce(a.cognome, ''));
  v_titolo := 'Assenza: ' || v_nome;
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
    select a.centro_id, s.x, 'assenza', v_titolo,
           public._data_it(v_data) || ' · ' || case v_motivo when 'malato' then 'malato' when 'scuola' then 'scuola o compiti' when 'viaggio' then 'in viaggio' else 'altro' end
             || coalesce(' · ' || v_testo, ''),
           '/c/' || c.slug || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
           coalesce(public._nome_membro(v_me), v_nome), v_al
    from (
      select gm.membro_id x from public.gruppi_maestri gm where gm.gruppo_id = any (coalesce(v_gruppi, '{}'))
      union select af.membro_id from public.allievi_famiglie af where af.allievo_id = v_al
      union select a.membro_id where a.membro_id is not null
    ) s join public.membri m on m.id = s.x and m.stato <> 'sospeso'
    where s.x <> all (public.miei_membri());
  return jsonb_build_object('assenze', v_n, 'gruppi', to_jsonb(coalesce(v_gruppi, '{}')));
end $$;

create or replace function public.segnala(categoria text, testo text, anonima boolean default false, per_allievo uuid default null,
  riguarda_dt boolean default false, centro uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_cat text := btrim(categoria); v_testo text := btrim(testo); v_anon boolean := coalesce(anonima, false); v_al uuid := per_allievo;
  v_rdt boolean := coalesce(riguarda_dt, false); v_centro uuid := centro; v_me uuid; v_id uuid; v_pri text; v_slug text; v_cs uuid[];
begin
  if v_cat is null or v_cat = '' or v_testo is null or v_testo = '' then raise exception 'Servono categoria e testo' using errcode = '22023'; end if;
  if v_centro is null and v_al is not null then select a.centro_id into v_centro from public.allievi a where a.id = v_al; end if;
  if v_centro is null then
    v_cs := public.miei_centri();
    if coalesce(array_length(v_cs, 1), 0) = 1 then v_centro := v_cs[1];
    else raise exception 'Non riesco a capire per quale centro scrivi: indica il centro' using errcode = '22023'; end if;
  end if;
  v_me := public.mio_membro(v_centro);
  if v_me is null then raise exception 'Non fai parte di questo centro' using errcode = '42501'; end if;
  if v_al is not null and not exists (select 1 from public.allievi a where a.id = v_al and a.centro_id = v_centro) then
    raise exception 'Allievo non trovato' using errcode = 'P0002';
  end if;
  v_pri := case when v_rdt or v_cat in ('adulto', 'sicurezza', 'bullismo', 'chat', 'disagio', 'infortunio') then 'alta'
                when v_cat = 'gruppo' then 'media' else 'bassa' end;
  insert into public.segnalazioni (centro_id, autore_id, anonima, per_allievo_id, categoria, testo, priorita, riguarda_dt)
    values (v_centro, case when v_anon then null else v_me end, v_anon, v_al, v_cat, v_testo, v_pri, v_rdt) returning id into v_id;
  select c.slug into v_slug from public.centri c where c.id = v_centro;
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
    select v_centro, m.id, 'segnalazione', 'Nuova segnalazione', v_cat, '/c/' || v_slug || '/dt/segnalazioni',
           case when v_anon then null else public._nome_membro(v_me) end, v_id
    from public.membri m
    where m.centro_id = v_centro and m.stato <> 'sospeso' and m.ruolo = any (case when v_rdt then array['titolare']::public.ruolo_centro[] else array['titolare', 'dt']::public.ruolo_centro[] end);
  return v_id;
end $$;

create or replace function public.chiudi_lezione(lezione uuid, svolto jsonb, presenze jsonb, compito jsonb default null, motivi jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_l uuid := lezione; v_sv jsonb := svolto; v_pr jsonb := presenze; v_co jsonb := compito; v_mo jsonb := motivi;
  z public.lezioni%rowtype; v_slug text; v_me uuid; v_maestro uuid; e jsonb; v_titolo text; v_cid uuid; v_nuovo boolean := false; v_al uuid;
begin
  select * into z from public.lezioni where id = v_l;
  if not found then raise exception 'Lezione non trovata' using errcode = 'P0002'; end if;
  if not (public.is_admin() or z.centro_id = any (public.centri_dt()) or z.gruppo_id = any (public.miei_gruppi_maestro()) or z.maestro_id = any (public.miei_membri())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  v_me := public.mio_membro(z.centro_id);
  select m.id into v_maestro from public.membri m where m.id = any (public.miei_membri()) and m.centro_id = z.centro_id and m.ruolo = 'maestro' limit 1;
  v_titolo := btrim(coalesce(v_co ->> 'titolo', ''));
  update public.lezioni set
    svolto = coalesce(v_sv, svolto), stato = 'chiusa', maestro_id = coalesce(maestro_id, v_maestro),
    motivi_scostamento = coalesce(v_mo, motivi_scostamento), compito = coalesce(nullif(v_titolo, ''), compito)
    where id = v_l;
  for e in select * from jsonb_array_elements(coalesce(v_pr, '[]'::jsonb)) loop
    insert into public.presenze (centro_id, lezione_id, allievo_id, presente, voto_rapido, nota)
      select z.centro_id, v_l, a.id, coalesce((e ->> 'presente')::boolean, true), nullif(e ->> 'voto_rapido', '')::int, nullif(e ->> 'nota', '')
      from public.allievi a where a.id = (e ->> 'allievo_id')::uuid and a.centro_id = z.centro_id
      on conflict (lezione_id, allievo_id) do update set presente = excluded.presente, voto_rapido = excluded.voto_rapido, nota = excluded.nota;
  end loop;
  if v_titolo <> '' then
    v_al := nullif(v_co ->> 'allievo_id', '')::uuid;
    select c.id into v_cid from public.compiti c where c.lezione_id = v_l limit 1;
    if v_cid is null then
      insert into public.compiti (centro_id, allievo_id, gruppo_id, maestro_id, titolo, durata_min, esercizio_id, scadenza, lezione_id)
        values (z.centro_id, v_al, case when v_al is null then z.gruppo_id end, coalesce(z.maestro_id, v_maestro, v_me), v_titolo,
                nullif(v_co ->> 'durata_min', '')::int, nullif(v_co ->> 'esercizio_id', '')::uuid, nullif(v_co ->> 'scadenza', '')::date, v_l)
        returning id into v_cid;
      v_nuovo := true;
    else
      update public.compiti set titolo = v_titolo, durata_min = nullif(v_co ->> 'durata_min', '')::int,
        esercizio_id = nullif(v_co ->> 'esercizio_id', '')::uuid, scadenza = nullif(v_co ->> 'scadenza', '')::date where id = v_cid;
    end if;
    if v_nuovo then
      select c.slug into v_slug from public.centri c where c.id = z.centro_id;
      insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
        select z.centro_id, s.x, 'compito', 'Nuovo compito', v_titolo,
               '/c/' || v_slug || case m.ruolo when 'allievo' then '/allievo/compiti' else '/genitore' end,
               public._nome_membro(coalesce(z.maestro_id, v_maestro, v_me)), v_cid
        from (
          select af.membro_id x from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
            where (v_al is null and i.gruppo_id = z.gruppo_id and (i.al is null or i.al >= current_date)) or i.allievo_id = v_al
          union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id
            where ((v_al is null and i.gruppo_id = z.gruppo_id and (i.al is null or i.al >= current_date)) or i.allievo_id = v_al) and a.membro_id is not null
        ) s join public.membri m on m.id = s.x and m.stato <> 'sospeso';
    end if;
  end if;
end $$;

create or replace function public.aderenza_maestro(membro uuid) returns numeric
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_m uuid := membro; v_c uuid; v_r numeric;
begin
  select m.centro_id into v_c from public.membri m where m.id = v_m;
  if v_c is null or not (public.is_admin() or v_c = any (public.centri_staff()) or v_m = any (public.miei_membri())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select round(100.0 * count(*) filter (where t.fatto) / nullif(count(*), 0), 1) into v_r from (
    select exists (
        select 1 from jsonb_array_elements(l.svolto) s
        where (s ->> 'indice')::int = b.ord - 1 and coalesce((s ->> 'fatto')::boolean, false)
          and not coalesce((s ->> 'sostituito')::boolean, false) and not coalesce((s ->> 'saltato')::boolean, false)) as fatto
    from public.lezioni l cross join lateral jsonb_array_elements(l.piano) with ordinality b (val, ord)
    where l.maestro_id = v_m and l.stato = 'chiusa' and l.data >= current_date - 365
      and coalesce(b.val ->> 'modo', 'bloccato') = 'bloccato'
  ) t;
  return v_r;
end $$;
