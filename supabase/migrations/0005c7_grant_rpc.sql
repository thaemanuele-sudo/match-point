do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      '_nome_membro','_data_it','_consegna_dopo_silenzio','_gruppi_destinatari','membri_destinatari','_rimappa_uuid','_clona_contenuti',
      'centro_pubblico','anteprima_invito','unisciti_con_codice','registra_centro','clona_centro','invia_messaggio','conta_destinatari',
      'invia_avviso','letture_avvisi','ricorda_avviso','cambia_campo','letture_cambio_campo','avvisa_assenza','segnala','chiudi_lezione','aderenza_maestro'])
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.proname in ('_gruppi_destinatari','membri_destinatari','_rimappa_uuid','_clona_contenuti') then
      execute format('revoke all on function %s from authenticated', f.sig);
    else
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    if f.proname = 'centro_pubblico' then execute format('grant execute on function %s to anon', f.sig); end if;
  end loop;
end $$;
