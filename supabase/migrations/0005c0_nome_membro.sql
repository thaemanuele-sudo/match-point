create or replace function public._nome_membro(m uuid) returns text
language sql stable security definer set search_path = public as $$
  select btrim(x.nome || ' ' || coalesce(x.cognome, '')) from public.membri x where x.id = m
$$;
