insert into storage.buckets (id, name, public, file_size_limit)
  values ('centri', 'centri', false, 209715200)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('centri-pubblico', 'centri-pubblico', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
  on conflict (id) do nothing;

create policy "centri-pubblico: lettura anonima" on storage.objects for select to anon using (bucket_id = 'centri-pubblico');
create policy "centri: leggo" on storage.objects for select to authenticated
  using (bucket_id = 'centri-pubblico'
    or (bucket_id = 'centri' and ((select public.is_admin())
        or (public.centro_da_percorso(name) = any ((select public.miei_centri())::uuid[])
            and ((storage.foldername(name))[2] is null or (storage.foldername(name))[2] not in ('note', 'note-audio', 'compiti')
                 or owner_id = (select auth.uid())::text
                 or public.centro_da_percorso(name) = any ((select public.centri_staff_maestro())::uuid[]))))));
create policy "centri: carico" on storage.objects for insert to authenticated
  with check ((bucket_id = 'centri' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.miei_centri())::uuid[])))
    or (bucket_id = 'centri-pubblico' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.centri_dt())::uuid[]))));
create policy "centri: modifico" on storage.objects for update to authenticated
  using ((bucket_id = 'centri' and ((select public.is_admin()) or owner_id = (select auth.uid())::text or public.centro_da_percorso(name) = any ((select public.centri_dt())::uuid[])))
    or (bucket_id = 'centri-pubblico' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.centri_dt())::uuid[]))));
create policy "centri: elimino" on storage.objects for delete to authenticated
  using ((bucket_id = 'centri' and ((select public.is_admin()) or owner_id = (select auth.uid())::text or public.centro_da_percorso(name) = any ((select public.centri_dt())::uuid[])))
    or (bucket_id = 'centri-pubblico' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.centri_dt())::uuid[]))));

do $$ begin
  alter publication supabase_realtime add table public.notifiche;
  alter publication supabase_realtime add table public.messaggi;
exception when others then raise notice 'realtime non configurato: %', sqlerrm;
end $$;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      'miei_membri','miei_centri','centri_ruolo','centri_titolare','centri_dt','centri_amm','centri_staff','centri_maestro',
      'centri_staff_maestro','mie_aree','aree_permesso','centri_permesso','miei_gruppi_maestro','miei_gruppi_gestione',
      'miei_figli','miei_profili_allievo','miei_allievi_famiglia','miei_allievi_maestro','miei_allievi','miei_gruppi',
      'mie_conversazioni','membri_vicini','mio_membro','ha_ruolo','is_membro','is_staff','is_dt','is_amm',
      'centro_da_percorso','partecipante_ammesso'])
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array['proteggi_centro','proteggi_membro','proteggi_allievo',
      'messaggi_immutabili','imposta_creatore_conversazione','valida_partecipante','firma_consenso'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
