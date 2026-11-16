create or replace function public.miei_membri() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso'
$$;

create or replace function public.miei_centri() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.centro_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso'
$$;

create or replace function public.centri_ruolo(r public.ruolo_centro[]) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.centro_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso' and m.ruolo = any (r)
$$;

create or replace function public.centri_titolare() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare}') $$;
create or replace function public.centri_dt() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt}') $$;
create or replace function public.centri_amm() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt,segreteria}') $$;
create or replace function public.centri_staff() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt,responsabile_area,segreteria}') $$;
create or replace function public.centri_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{maestro}') $$;
create or replace function public.centri_staff_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt,responsabile_area,segreteria,maestro}') $$;

create or replace function public.mie_aree() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.area_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso' and m.ruolo = 'responsabile_area' and m.area_id is not null
$$;

create or replace function public.aree_permesso(chiave text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.area_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso' and m.ruolo = 'responsabile_area' and m.area_id is not null
    and coalesce(
      (select p.permessi ->> chiave from public.permessi_ruolo p where p.centro_id = m.centro_id and p.area_id = m.area_id),
      (select p.permessi ->> chiave from public.permessi_ruolo p where p.centro_id = m.centro_id and p.area_id is null),
      'false') = 'true'
$$;

create or replace function public.centri_permesso(chiave text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct a.centro_id), '{}') from public.aree a where a.id = any (public.aree_permesso(chiave))
$$;

create or replace function public.miei_gruppi_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct gm.gruppo_id), '{}') from public.gruppi_maestri gm
  where gm.membro_id = any (public.miei_membri())
$$;

create or replace function public.miei_gruppi_gestione() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select unnest(public.miei_gruppi_maestro()) x
    union select g.id from public.gruppi g where g.area_id = any (public.mie_aree())
  ) s
$$;

create or replace function public.miei_figli() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct af.allievo_id), '{}') from public.allievi_famiglie af
  where af.membro_id = any (public.miei_membri())
$$;

create or replace function public.miei_profili_allievo() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(a.id), '{}') from public.allievi a where a.membro_id = any (public.miei_membri())
$$;

create or replace function public.miei_allievi_famiglia() returns uuid[]
language sql stable security definer set search_path = public as $$
  select public.miei_figli() || public.miei_profili_allievo()
$$;

create or replace function public.miei_allievi_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct i.allievo_id), '{}') from public.iscrizioni i
  where i.gruppo_id = any (public.miei_gruppi_maestro()) and (i.al is null or i.al >= current_date)
$$;

create or replace function public.miei_allievi() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select unnest(public.miei_allievi_maestro()) x
    union select i.allievo_id from public.iscrizioni i join public.gruppi g on g.id = i.gruppo_id
      where g.area_id = any (public.mie_aree()) and (i.al is null or i.al >= current_date)
    union select unnest(public.miei_allievi_famiglia())
  ) s
$$;

create or replace function public.miei_gruppi() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select unnest(public.miei_gruppi_gestione()) x
    union select i.gruppo_id from public.iscrizioni i
      where i.allievo_id = any (public.miei_allievi_famiglia()) and (i.al is null or i.al >= current_date)
  ) s
$$;

create or replace function public.mie_conversazioni() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.conversazione_id), '{}') from public.partecipanti p
  where p.membro_id = any (public.miei_membri())
$$;

create or replace function public.membri_vicini() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select q.membro_id x from public.partecipanti q where q.conversazione_id = any (public.mie_conversazioni())
    union select gm.membro_id from public.gruppi_maestri gm where gm.gruppo_id = any (public.miei_gruppi())
    union select af.membro_id from public.allievi_famiglie af where af.allievo_id = any (public.miei_allievi())
    union select a.membro_id from public.allievi a where a.id = any (public.miei_allievi()) and a.membro_id is not null
  ) s
$$;

create or replace function public.mio_membro(centro uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.membri m
  where m.centro_id = centro and m.user_id = (select auth.uid()) and m.stato <> 'sospeso'
  order by array_position(array['titolare','dt','responsabile_area','segreteria','maestro','genitore','allievo'], m.ruolo::text), m.created_at
  limit 1
$$;

create or replace function public.ha_ruolo(centro uuid, ruoli public.ruolo_centro[]) returns boolean
language sql stable security definer set search_path = public as $$
  select centro = any (public.centri_ruolo(ruoli))
$$;
create or replace function public.is_membro(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select centro = any (public.miei_centri()) $$;
create or replace function public.is_staff(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() or centro = any (public.centri_staff()) $$;
create or replace function public.is_dt(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() or centro = any (public.centri_dt()) $$;
create or replace function public.is_amm(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() or centro = any (public.centri_amm()) $$;

create or replace function public.centro_da_percorso(nome text) returns uuid
language sql immutable set search_path = public as $$
  select case when (storage.foldername(nome))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then ((storage.foldername(nome))[1])::uuid end
$$;
