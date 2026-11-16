create or replace function public._rimappa_uuid(j jsonb) returns jsonb
language plpgsql stable as $$
declare r jsonb;
begin
  case jsonb_typeof(j)
    when 'string' then
      select to_jsonb(m.nuovo::text) into r from _clona_mappa m where m.old::text = (j #>> '{}');
      return coalesce(r, j);
    when 'array' then
      return coalesce((select jsonb_agg(public._rimappa_uuid(e)) from jsonb_array_elements(j) e), '[]'::jsonb);
    when 'object' then
      return coalesce((select jsonb_object_agg(k, public._rimappa_uuid(v)) from jsonb_each(j) as t(k, v)), '{}'::jsonb);
    else return j;
  end case;
end $$;

create or replace function public._clona_contenuti(p_src uuid, p_dst uuid, p_campi boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  create temp table if not exists _clona_mappa (old uuid primary key, nuovo uuid not null) on commit preserve rows;
  perform set_config('app.clona', '1', true);
  insert into _clona_mappa select a.id, gen_random_uuid() from public.aree a where a.centro_id = p_src
    on conflict (old) do update set nuovo = excluded.nuovo;
  insert into _clona_mappa select x.id, gen_random_uuid() from public.esercizi x where x.centro_id = p_src and x.stato = 'approvato'
    on conflict (old) do update set nuovo = excluded.nuovo;
  insert into _clona_mappa select x.id, gen_random_uuid() from public.modelli_lezione x where x.centro_id = p_src
    on conflict (old) do update set nuovo = excluded.nuovo;
  insert into _clona_mappa select x.id, gen_random_uuid() from public.programmi x where x.centro_id = p_src
    on conflict (old) do update set nuovo = excluded.nuovo;

  insert into public.aree (id, centro_id, nome, sigla, fasce, ordine)
    select m.nuovo, p_dst, a.nome, a.sigla, a.fasce, a.ordine from public.aree a join _clona_mappa m on m.old = a.id where a.centro_id = p_src;
  insert into public.esercizi (id, centro_id, titolo, colpo, fasce, durata_min, materiale, descrizione, video_path, fonte, stato)
    select m.nuovo, p_dst, x.titolo, x.colpo, x.fasce, x.durata_min, x.materiale, x.descrizione, null, x.fonte, 'approvato'
    from public.esercizi x join _clona_mappa m on m.old = x.id where x.centro_id = p_src;
  insert into public.modelli_lezione (id, centro_id, nome, durata_min, blocchi)
    select m.nuovo, p_dst, x.nome, x.durata_min, public._rimappa_uuid(x.blocchi)
    from public.modelli_lezione x join _clona_mappa m on m.old = x.id where x.centro_id = p_src;
  insert into public.programmi (id, centro_id, nome, fascia, schema, anno, mesi, settimane_test)
    select m.nuovo, p_dst, x.nome, x.fascia, x.schema, x.anno, public._rimappa_uuid(x.mesi), x.settimane_test
    from public.programmi x join _clona_mappa m on m.old = x.id where x.centro_id = p_src;
  insert into public.linee_guida (centro_id, fascia, colpo, competenze, errori, regola, scala, bloccata)
    select p_dst, l.fascia, l.colpo, l.competenze,
      coalesce((select jsonb_agg(e - 'video_path') from jsonb_array_elements(case when jsonb_typeof(l.errori) = 'array' then l.errori else '[]'::jsonb end) e), '[]'::jsonb),
      l.regola, l.scala, l.bloccata
    from public.linee_guida l where l.centro_id = p_src;
  insert into public.corsi_formazione (centro_id, titolo, obbligatorio, moduli)
    select p_dst, c.titolo, c.obbligatorio, c.moduli from public.corsi_formazione c where c.centro_id = p_src;
  insert into public.corsi (centro_id, nome, gruppo_id, quota_cent, sconto_fratelli_pct, rate, scadenze)
    select p_dst, c.nome, null, c.quota_cent, c.sconto_fratelli_pct, c.rate, c.scadenze from public.corsi c where c.centro_id = p_src;
  insert into public.permessi_ruolo (centro_id, area_id, permessi)
    select p_dst, case when p.area_id is null then null else m.nuovo end, p.permessi
    from public.permessi_ruolo p left join _clona_mappa m on m.old = p.area_id
    where p.centro_id = p_src and (p.area_id is null or m.nuovo is not null);
  if p_campi then
    insert into public.campi (centro_id, numero, nome, superficie, copertura, luci, stato, note, x, y, w, h)
      select p_dst, c.numero, c.nome, c.superficie, c.copertura, c.luci, 'disponibile', c.note, c.x, c.y, c.w, c.h from public.campi c where c.centro_id = p_src;
  end if;
  update public.centri d set impostazioni = coalesce((select s.impostazioni - 'eventi' - 'pagamenti' from public.centri s where s.id = p_src), d.impostazioni)
    where d.id = p_dst;
end $$;
