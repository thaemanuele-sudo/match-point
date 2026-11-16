-- 0006e1 · Seed Tennis Club Brera (cambio campo). Vedi l'intestazione di 0006e.
create or replace function pg_temp.mid(c uuid, r text, n text, co text) returns uuid language sql as
$$ select id from public.membri where centro_id = c and ruolo = r::public.ruolo_centro and nome = n and cognome = co and area_id is null order by created_at limit 1 $$;

do $seed$
declare
  b uuid := (select id from public.centri where slug = 'tc-brera');
  laura uuid; marco uuid; giulia uuid; paolo uuid; davide uuid; sara uuid; segr uuid;
  g_u12 uuid; c2 uuid; c3 uuid; v_cambio uuid; v_testo text;
begin
  laura := pg_temp.mid(b, 'dt', 'Laura', 'Neri');
  marco := pg_temp.mid(b, 'maestro', 'Marco', 'Ferri');
  giulia := pg_temp.mid(b, 'maestro', 'Giulia', 'Sala');
  paolo := pg_temp.mid(b, 'maestro', 'Paolo', 'Riva');
  davide := pg_temp.mid(b, 'maestro', 'Davide', 'Neri');
  sara := pg_temp.mid(b, 'maestro', 'Sara', 'Conti');
  segr := pg_temp.mid(b, 'segreteria', 'Francesca', 'Bianchi');
  select id into g_u12 from public.gruppi where centro_id = b and nome = 'U12 Intermedio';
  select id into c2 from public.campi where centro_id = b and numero = 2;
  select id into c3 from public.campi where centro_id = b and numero = 3;

  -- eventi del centro (tornei, chiusure, test) letti dal calendario delle famiglie
  update public.centri set impostazioni = impostazioni || jsonb_build_object('eventi', jsonb_build_array(
      jsonb_build_object('tipo', 'torneo', 'data', '2026-11-29', 'titolo', 'Torneo sociale U12'),
      jsonb_build_object('tipo', 'chiusura', 'data', '2026-12-08', 'titolo', 'Immacolata, centro chiuso'),
      jsonb_build_object('tipo', 'test', 'data', '2027-01-11', 'titolo', 'Test di gennaio')))
  where id = b;

  -- cambio campo di martedì 17/11: U12 Intermedio dal Campo 2 al Campo 3 per la manutenzione del fondo (vale solo per quella data)
  if not exists (select 1 from public.cambi_campo where gruppo_id = g_u12 and data = date '2026-11-17') then
    insert into public.cambi_campo (centro_id, gruppo_id, data, campo_da, campo_a, motivo, deciso_da, avvisa, created_at)
    values (b, g_u12, date '2026-11-17', c2, c3, 'Manutenzione del fondo del Campo 2', laura, true, timestamptz '2026-11-13 10:00+01')
    returning id into v_cambio;
    update public.lezioni set campo_id = c3 where gruppo_id = g_u12 and data = date '2026-11-17' and stato = 'programmata';
    insert into public.registro (centro_id, membro_id, azione, oggetto, dettagli, created_at)
    values (b, laura, 'cambio_campo', 'U12 Intermedio', jsonb_build_object('data', date '2026-11-17', 'da', c2, 'a', c3, 'motivo', 'Manutenzione del fondo del Campo 2', 'avvisa', true), timestamptz '2026-11-13 10:00+01');
    v_testo := 'U12 Intermedio · ' || public._data_it(date '2026-11-17') || ' · Campo 2 → Campo 3 · motivo: Manutenzione del fondo del Campo 2';
    -- notifiche a maestro, allievi e famiglie, come fa la funzione cambia_campo; gran parte già letta
    insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, letta_il, rif_id, created_at)
    select b, s.x, 'cambio_campo', 'Cambio campo', v_testo,
           '/c/tc-brera' || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
           'Laura Neri', case when abs(hashtext(s.x::text)) % 100 < 70 then timestamptz '2026-11-13 18:00+01' + (abs(hashtext(s.x::text)) % 2000) * interval '1 minute' end,
           v_cambio, timestamptz '2026-11-13 10:00+01'
    from (
      select gm.membro_id x from public.gruppi_maestri gm where gm.gruppo_id = g_u12
      union select af.membro_id from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id where i.gruppo_id = g_u12
      union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id where i.gruppo_id = g_u12 and a.membro_id is not null
    ) s join public.membri m on m.id = s.x;
  end if;
  insert into public.registro (centro_id, membro_id, azione, oggetto, dettagli, created_at)
  select b, x.membro, x.azione, x.oggetto, x.dettagli, x.quando
  from (values
    (marco, 'sostituzione_blocco', 'U12 Intermedio · 05/11', '{"blocco":"Servizio e risposta","da":"Servizio ai bersagli","a":"Servizio e risposta a punti"}'::jsonb, timestamptz '2026-11-05 17:20+01'),
    (laura, 'modifica_permessi', 'Area SAT', '{"permesso":"maestri","da":false,"a":true}'::jsonb, timestamptz '2026-10-02 09:30+01')
  ) x(membro, azione, oggetto, dettagli, quando)
  where not exists (select 1 from public.registro r where r.centro_id = b and r.azione = x.azione and r.oggetto = x.oggetto);
end
$seed$;
