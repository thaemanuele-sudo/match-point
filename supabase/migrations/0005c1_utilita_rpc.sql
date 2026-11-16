create or replace function public._data_it(d date) returns text
language sql immutable set search_path = public as $$
  select (array['lun','mar','mer','gio','ven','sab','dom'])[extract(isodow from d)::int] || ' ' || extract(day from d)::int || ' '
      || (array['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'])[extract(month from d)::int]
$$;

create or replace function public._consegna_dopo_silenzio(imp jsonb) returns timestamptz
language plpgsql stable set search_path = public as $$
declare
  da time := coalesce(nullif(imp ->> 'silenzio_da', ''), '21:00')::time;
  a time := coalesce(nullif(imp ->> 'silenzio_a', ''), '08:00')::time;
  l timestamp := timezone('Europe/Rome', now());
  t time := timezone('Europe/Rome', now())::time;
  in_silenzio boolean;
  giorno date;
begin
  if da > a then in_silenzio := (t >= da or t < a); else in_silenzio := (t >= da and t < a); end if;
  if not in_silenzio then return now(); end if;
  giorno := case when da > a and t >= da then l::date + 1 else l::date end;
  return (giorno + a) at time zone 'Europe/Rome';
end $$;

create or replace function public._gruppi_destinatari(p_centro uuid, p_dest jsonb) returns uuid[]
language plpgsql stable security definer set search_path = public as $$
declare v_tipo text := p_dest ->> 'tipo'; v_vals text[] := array(select jsonb_array_elements_text(coalesce(p_dest -> 'valori', '[]'::jsonb))); g uuid[];
begin
  if v_tipo = 'centro' then return null; end if;
  if v_tipo = 'fascia' then
    select array_agg(x.id) into g from public.gruppi x where x.centro_id = p_centro and x.attivo and x.fascia = any (v_vals);
  elsif v_tipo = 'gruppo' then
    select array_agg(x.id) into g from public.gruppi x where x.centro_id = p_centro and x.id::text = any (v_vals);
  elsif v_tipo = 'area' then
    select array_agg(x.id) into g from public.gruppi x where x.centro_id = p_centro and x.area_id::text = any (v_vals);
  elsif v_tipo = 'maestro' then
    select array_agg(distinct gm.gruppo_id) into g from public.gruppi_maestri gm where gm.centro_id = p_centro and gm.membro_id::text = any (v_vals);
  else
    raise exception 'Tipo di destinatari non valido' using errcode = '22023';
  end if;
  return coalesce(g, '{}');
end $$;

create or replace function public.membri_destinatari(p_centro uuid, p_dest jsonb) returns setof uuid
language plpgsql stable security definer set search_path = public as $$
declare v_tipo text := p_dest ->> 'tipo'; v_vals text[] := array(select jsonb_array_elements_text(coalesce(p_dest -> 'valori', '[]'::jsonb))); g uuid[];
begin
  if v_tipo = 'centro' then
    return query select m.id from public.membri m where m.centro_id = p_centro and m.stato <> 'sospeso';
    return;
  end if;
  g := public._gruppi_destinatari(p_centro, p_dest);
  return query
    select distinct s.x from (
      select af.membro_id x from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
        where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date)
      union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id
        where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date) and a.membro_id is not null
      union select gm.membro_id from public.gruppi_maestri gm where gm.gruppo_id = any (g) and v_tipo <> 'maestro'
      union select m.id from public.membri m where v_tipo = 'area' and m.centro_id = p_centro and m.ruolo = 'responsabile_area' and m.area_id::text = any (v_vals)
    ) s join public.membri mm on mm.id = s.x and mm.stato <> 'sospeso'
    where s.x is not null;
end $$;
