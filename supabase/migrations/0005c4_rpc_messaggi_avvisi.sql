create or replace function public.invia_messaggio(conversazione uuid, testo text) returns public.messaggi
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_conv uuid := conversazione; v_testo text := btrim(testo);
  pa public.partecipanti%rowtype; cv public.conversazioni%rowtype; c public.centri%rowtype; m public.messaggi%rowtype;
  v_cons timestamptz; v_nome text;
begin
  select * into cv from public.conversazioni where id = v_conv;
  if not found then raise exception 'Conversazione non trovata' using errcode = 'P0002'; end if;
  select * into pa from public.partecipanti where conversazione_id = v_conv and membro_id = any (public.miei_membri()) order by sola_lettura limit 1;
  if not found then raise exception 'Non partecipi a questa conversazione' using errcode = '42501'; end if;
  if pa.sola_lettura then raise exception 'In questa conversazione puoi solo leggere' using errcode = '42501'; end if;
  if v_testo is null or char_length(v_testo) = 0 then raise exception 'Il messaggio è vuoto' using errcode = '22023'; end if;
  if char_length(v_testo) > 4000 then raise exception 'Il messaggio è troppo lungo' using errcode = '22023'; end if;
  select * into c from public.centri where id = cv.centro_id;
  v_cons := public._consegna_dopo_silenzio(c.impostazioni);
  insert into public.messaggi (centro_id, conversazione_id, autore_id, testo, consegna_il)
    values (cv.centro_id, v_conv, pa.membro_id, v_testo, v_cons) returning * into m;
  v_nome := public._nome_membro(pa.membro_id);
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, consegna_il, rif_id)
    select cv.centro_id, p.membro_id, 'messaggio', v_nome, left(v_testo, 140), '/c/' || c.slug || '/chat/' || v_conv, v_nome, v_cons, v_conv
    from public.partecipanti p
    where p.conversazione_id = v_conv and p.membro_id <> pa.membro_id
      and not exists (select 1 from public.notifiche n where n.membro_id = p.membro_id and n.tipo = 'messaggio' and n.rif_id = v_conv and n.letta_il is null);
  return m;
end $$;

create or replace function public.conta_destinatari(centro uuid, destinatari jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_c uuid := centro; v_d jsonb := destinatari; g uuid[]; v_al int; v_fa int; v_ma int;
begin
  if not (public.is_admin() or v_c = any (public.centri_staff()) or v_c = any (public.centri_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  g := public._gruppi_destinatari(v_c, v_d);
  if g is null then
    select count(distinct i.allievo_id) into v_al from public.iscrizioni i where i.centro_id = v_c and (i.al is null or i.al >= current_date);
    select count(distinct af.membro_id) into v_fa from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
      where i.centro_id = v_c and (i.al is null or i.al >= current_date);
    select count(*) into v_ma from public.membri m where m.centro_id = v_c and m.ruolo = 'maestro' and m.stato <> 'sospeso';
  else
    select count(distinct i.allievo_id) into v_al from public.iscrizioni i where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date);
    select count(distinct af.membro_id) into v_fa from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
      where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date);
    select count(distinct gm.membro_id) into v_ma from public.gruppi_maestri gm where gm.gruppo_id = any (g);
  end if;
  return jsonb_build_object('allievi', v_al, 'famiglie', v_fa, 'maestri', v_ma);
end $$;

create or replace function public.invia_avviso(titolo text, testo text, destinatari jsonb, conferma boolean default false,
  promemoria boolean default false, consegna_il timestamptz default null, centro uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_titolo text := btrim(titolo); v_testo text := btrim(testo); v_dest jsonb := destinatari; v_conf boolean := coalesce(conferma, false);
  v_prom boolean := coalesce(promemoria, false); v_cons timestamptz := consegna_il; v_centro uuid := centro;
  v_cs uuid[]; v_me uuid; c public.centri%rowtype; v_tipo text; v_vals text[]; v_ok boolean := false; v_av uuid; v_n int; v_nome text;
begin
  if v_titolo is null or v_titolo = '' or v_testo is null or v_testo = '' then raise exception 'Servono titolo e testo' using errcode = '22023'; end if;
  v_dest := coalesce(v_dest, '{"tipo":"centro","valori":[]}'::jsonb);
  if v_centro is null then
    select array_agg(distinct m.centro_id) into v_cs from public.membri m
      where m.id = any (public.miei_membri()) and m.ruolo in ('titolare', 'dt', 'segreteria', 'responsabile_area', 'maestro');
    if coalesce(array_length(v_cs, 1), 0) = 1 then v_centro := v_cs[1];
    else raise exception 'Non riesco a capire per quale centro scrivi: indica il centro' using errcode = '22023'; end if;
  end if;
  select * into c from public.centri where id = v_centro;
  if not found then raise exception 'Centro non trovato' using errcode = 'P0002'; end if;
  v_tipo := v_dest ->> 'tipo';
  v_vals := array(select jsonb_array_elements_text(coalesce(v_dest -> 'valori', '[]'::jsonb)));
  if public.is_admin() or v_centro = any (public.centri_amm()) then v_ok := true; end if;
  if not v_ok and v_centro = any (public.centri_staff()) then
    if v_tipo = 'area' and v_vals <@ array(select x::text from unnest(public.aree_permesso('avvisi')) x) then v_ok := true;
    elsif v_tipo = 'gruppo' and not exists (
        select 1 from unnest(v_vals) gv left join public.gruppi g on g.id::text = gv
        where g.area_id is null or g.area_id <> all (public.aree_permesso('avvisi'))) then v_ok := true; end if;
  end if;
  if not v_ok and v_centro = any (public.centri_maestro()) then
    if v_tipo = 'gruppo' and v_vals <@ array(select x::text from unnest(public.miei_gruppi_maestro()) x) then v_ok := true;
    elsif v_tipo = 'maestro' and v_vals <@ array(select x::text from unnest(public.miei_membri()) x) then v_ok := true; end if;
  end if;
  if not v_ok then raise exception 'Non puoi scrivere a questi destinatari' using errcode = '42501'; end if;

  v_me := public.mio_membro(v_centro);
  v_nome := public._nome_membro(v_me);
  v_cons := coalesce(v_cons, public._consegna_dopo_silenzio(c.impostazioni));
  insert into public.avvisi (centro_id, autore_id, titolo, testo, destinatari, conferma, promemoria, consegna_il)
    values (v_centro, v_me, v_titolo, v_testo, v_dest, v_conf, v_prom, v_cons) returning id into v_av;
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, mittente, consegna_il, rif_id)
    select v_centro, d, 'avviso', v_titolo, left(v_testo, 240), v_nome, v_cons, v_av
    from public.membri_destinatari(v_centro, v_dest) d where d <> all (public.miei_membri());
  get diagnostics v_n = row_count;
  return jsonb_build_object('avviso_id', v_av, 'destinatari', v_n, 'consegna_il', v_cons);
end $$;

create or replace function public.letture_avvisi(avvisi uuid[])
returns table (avviso_id uuid, letti bigint, totale bigint, letti_24h bigint)
language sql stable security definer set search_path = public as $$
  select a.id,
    (select count(*) from public.avvisi_letture l where l.avviso_id = a.id),
    (select count(*) from public.notifiche n where n.rif_id = a.id and n.tipo = 'avviso'),
    (select count(*) from public.avvisi_letture l where l.avviso_id = a.id and l.letto_il < a.consegna_il + interval '24 hours')
  from public.avvisi a
  where a.id = any (letture_avvisi.avvisi)
    and (public.is_admin() or a.centro_id = any (public.centri_staff()) or a.autore_id = any (public.miei_membri()))
$$;

create or replace function public.ricorda_avviso(avviso uuid) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_av uuid := avviso; a public.avvisi%rowtype; v_n int;
begin
  select * into a from public.avvisi where id = v_av;
  if not found then raise exception 'Avviso non trovato' using errcode = 'P0002'; end if;
  if not (public.is_admin() or a.centro_id = any (public.centri_dt()) or a.autore_id = any (public.miei_membri())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, mittente, rif_id)
    select a.centro_id, n.membro_id, 'sistema', 'Promemoria: ' || a.titolo, left(a.testo, 240), public._nome_membro(a.autore_id), a.id
    from public.notifiche n
    where n.rif_id = a.id and n.tipo = 'avviso'
      and not exists (select 1 from public.avvisi_letture l where l.avviso_id = a.id and l.membro_id = n.membro_id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
