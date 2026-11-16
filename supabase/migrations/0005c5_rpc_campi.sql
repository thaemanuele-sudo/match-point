create or replace function public.cambia_campo(gruppo uuid, data date, campo_a uuid, motivo text, avvisa boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_g uuid := gruppo; v_data date := data; v_ca uuid := campo_a; v_motivo text := nullif(btrim(motivo), ''); v_avvisa boolean := coalesce(avvisa, true);
  g public.gruppi%rowtype; k public.campi%rowtype; v_slug text; v_me uuid; v_da uuid; v_cambio uuid; v_confl text; v_n int; v_nome text; v_testo text; v_nome_da text;
begin
  select * into g from public.gruppi where id = v_g;
  if not found then raise exception 'Gruppo non trovato' using errcode = 'P0002'; end if;
  if not (public.is_admin() or g.centro_id = any (public.centri_dt()) or g.area_id = any (public.aree_permesso('campi'))) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into k from public.campi where id = v_ca and centro_id = g.centro_id;
  if not found then raise exception 'Campo non trovato' using errcode = 'P0002'; end if;
  if k.stato <> 'disponibile' then raise exception 'Il Campo % non è disponibile', k.numero using errcode = 'P0001'; end if;
  if not (extract(isodow from v_data)::int = any (g.giorni)) then raise exception 'Il gruppo non si allena in questa data' using errcode = '22023'; end if;
  select cc.campo_da into v_da from public.cambi_campo cc where cc.gruppo_id = v_g and cc.data = v_data;
  if not found then v_da := g.campo_id; end if;
  if v_da is not distinct from v_ca then raise exception 'Il gruppo si allena già su questo campo' using errcode = '22023'; end if;
  select o.nome || ' alle ' || to_char(o.ora, 'HH24:MI') into v_confl
  from public.gruppi o
  where o.centro_id = g.centro_id and o.id <> g.id and o.attivo and extract(isodow from v_data)::int = any (o.giorni) and o.ora is not null
    and coalesce((select cc.campo_a from public.cambi_campo cc where cc.gruppo_id = o.id and cc.data = v_data), o.campo_id) = v_ca
    and o.ora < g.ora + make_interval(mins => g.durata_min) and g.ora < o.ora + make_interval(mins => o.durata_min)
  limit 1;
  if v_confl is not null then raise exception 'Conflitto: il Campo % è occupato da % ', k.numero, v_confl using errcode = 'P0001'; end if;

  v_me := public.mio_membro(g.centro_id);
  insert into public.cambi_campo (centro_id, gruppo_id, data, campo_da, campo_a, motivo, deciso_da, avvisa)
    values (g.centro_id, v_g, v_data, v_da, v_ca, v_motivo, v_me, v_avvisa)
    on conflict (gruppo_id, data) do update set campo_a = excluded.campo_a, motivo = excluded.motivo, deciso_da = excluded.deciso_da, avvisa = excluded.avvisa
    returning id into v_cambio;
  update public.lezioni l set campo_id = v_ca where l.gruppo_id = v_g and l.data = v_data and l.stato = 'programmata';
  insert into public.registro (centro_id, membro_id, azione, oggetto, dettagli)
    values (g.centro_id, v_me, 'cambio_campo', g.nome, jsonb_build_object('data', v_data, 'da', v_da, 'a', v_ca, 'motivo', v_motivo, 'avvisa', v_avvisa));

  select c.slug into v_slug from public.centri c where c.id = g.centro_id;
  select 'Campo ' || c.numero into v_nome_da from public.campi c where c.id = v_da;
  v_nome := public._nome_membro(v_me);
  v_testo := g.nome || ' · ' || public._data_it(v_data) || ' · ' || coalesce(v_nome_da, 'campo abituale') || ' → Campo ' || k.numero
             || coalesce(' · motivo: ' || v_motivo, '');
  -- se il cambio viene corretto, chi era già stato avvisato non riceve un secondo avviso uguale
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
    select g.centro_id, s.x, 'cambio_campo', 'Cambio campo', v_testo,
           '/c/' || v_slug || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
           v_nome, v_cambio
    from (
      select gm.membro_id x from public.gruppi_maestri gm where gm.gruppo_id = v_g
      union select af.membro_id from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
        where v_avvisa and i.gruppo_id = v_g and (i.al is null or i.al >= current_date)
      union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id
        where v_avvisa and i.gruppo_id = v_g and (i.al is null or i.al >= current_date) and a.membro_id is not null
    ) s join public.membri m on m.id = s.x and m.stato <> 'sospeso'
    where not exists (select 1 from public.notifiche n where n.rif_id = v_cambio and n.tipo = 'cambio_campo' and n.membro_id = s.x);
  get diagnostics v_n = row_count;
  return jsonb_build_object('cambio_id', v_cambio, 'campo_da', v_da, 'campo_a', v_ca, 'notificati', v_n);
end $$;

create or replace function public.cambia_campo(p_gruppo uuid, p_data date, p_campo_a uuid, p_motivo text, p_avvisa boolean default true, p_compat int default 0) returns jsonb
language sql security definer set search_path = public as $$
  select public.cambia_campo(gruppo => p_gruppo, data => p_data, campo_a => p_campo_a, motivo => p_motivo, avvisa => p_avvisa)
$$;

create or replace function public.letture_cambio_campo(cambio uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_c uuid := cambio; cc public.cambi_campo%rowtype;
begin
  select * into cc from public.cambi_campo where id = v_c;
  if not found then raise exception 'Cambio non trovato' using errcode = 'P0002'; end if;
  if not (public.is_admin() or cc.centro_id = any (public.centri_staff()) or cc.gruppo_id = any (public.miei_gruppi_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return (select jsonb_build_object(
    'allievi_letti', count(*) filter (where m.ruolo = 'allievo' and n.letta_il is not null),
    'allievi_tot', count(*) filter (where m.ruolo = 'allievo'),
    'famiglie_letti', count(*) filter (where m.ruolo = 'genitore' and n.letta_il is not null),
    'famiglie_tot', count(*) filter (where m.ruolo = 'genitore'))
    from public.notifiche n join public.membri m on m.id = n.membro_id where n.rif_id = v_c and n.tipo = 'cambio_campo');
end $$;
