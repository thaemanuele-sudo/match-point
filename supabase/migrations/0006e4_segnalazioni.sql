-- 0006e4 · Seed Tennis Club Brera (segnalazioni). Vedi l'intestazione di 0006e.
create or replace function pg_temp.mid(c uuid, r text, n text, co text) returns uuid language sql as
$$ select id from public.membri where centro_id = c and ruolo = r::public.ruolo_centro and nome = n and cognome = co and area_id is null order by created_at limit 1 $$;

-- Segnalazioni (una alta), note del DT, altre notifiche
do $seed$
declare
  b uuid := (select id from public.centri where slug = 'tc-brera');
  laura uuid := pg_temp.mid((select id from public.centri where slug = 'tc-brera'), 'dt', 'Laura', 'Neri');
  s1 uuid; s2 uuid; s3 uuid;
begin
  insert into public.segnalazioni (centro_id, autore_id, anonima, per_allievo_id, categoria, testo, priorita, stato, riguarda_dt, created_at)
  select b, x.autore, x.anonima, null, x.categoria, x.testo, x.priorita, x.stato, false, x.quando
  from (values
    (pg_temp.mid(b, 'genitore', 'Elisabetta', 'Marchetti'), false, 'sicurezza', 'Durante l''allenamento di lunedì ho visto una persona estranea scattare foto ai bambini dal bordo del Campo 4. Chiedo di verificare chi può entrare nell''area dei campi.', 'alta', 'nuova', timestamptz '2026-11-15 18:10+01'),
    (null::uuid, true, 'comportamento', 'Tra alcuni ragazzi dell''U14, negli spogliatoi, ci sono prese in giro pesanti verso un compagno. Vorrei che se ne occupasse qualcuno con delicatezza.', 'media', 'presa', timestamptz '2026-11-09 21:40+01'),
    (pg_temp.mid(b, 'genitore', 'Salvatore', 'Piras'), false, 'struttura', 'Le luci del Campo 2 si accendono con ritardo: alle 17:00, in inverno, si gioca quasi al buio.', 'bassa', 'chiusa', timestamptz '2026-10-20 17:30+01')
  ) x(autore, anonima, categoria, testo, priorita, stato, quando)
  where not exists (select 1 from public.segnalazioni s where s.centro_id = b and s.testo = x.testo);

  select id into s1 from public.segnalazioni where centro_id = b and priorita = 'alta';
  select id into s2 from public.segnalazioni where centro_id = b and categoria = 'comportamento';
  select id into s3 from public.segnalazioni where centro_id = b and categoria = 'struttura';

  insert into public.segnalazioni_note (centro_id, segnalazione_id, autore_id, testo, created_at)
  select b, n.sid, laura, n.testo, n.quando
  from (values
    (s2, 'Parlato con Paolo Riva: giovedì incontro con il gruppo U14 sul rispetto in spogliatoio.', timestamptz '2026-11-10 10:00+01'),
    (s3, 'Chiesto alla manutenzione di anticipare l''accensione automatica alle 16:30.', timestamptz '2026-10-21 09:15+01'),
    (s3, 'Fatto: le luci del Campo 2 ora si accendono alle 16:30.', timestamptz '2026-10-27 12:00+01')
  ) n(sid, testo, quando)
  where not exists (select 1 from public.segnalazioni_note x where x.segnalazione_id = n.sid and x.testo = n.testo);

  -- notifiche ai DT (anche agli admin che "vedono come" il DT) per la segnalazione alta
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id, created_at)
  select b, m.id, 'segnalazione', 'Segnalazione urgente', 'Sicurezza: persona estranea a bordo campo durante l''allenamento.', '/c/tc-brera/dt/segnalazioni', 'Sistema', s1, timestamptz '2026-11-15 18:10+01'
  from public.membri m
  where m.centro_id = b and m.ruolo in ('dt', 'titolare') and s1 is not null
    and not exists (select 1 from public.notifiche n where n.membro_id = m.id and n.rif_id = s1);

  -- assenze: notifica al maestro; compiti: notifica a famiglie e allievi; sistema: esito di un esercizio proposto
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id, created_at)
  select b, gm.membro_id, 'assenza', 'Assenza comunicata', a.nome || ' ' || a.cognome || ' · ' || public._data_it(s.data) || ' (' || s.motivo || ')',
         '/c/tc-brera/maestro/notifiche', 'Famiglia ' || a.cognome, s.id, timestamptz '2026-11-16 08:00+01'
  from public.assenze s
  join public.allievi a on a.id = s.allievo_id
  join public.gruppi_maestri gm on gm.gruppo_id = s.gruppo_id and gm.principale
  where s.centro_id = b and s.data >= date '2026-11-16'
    and not exists (select 1 from public.notifiche n where n.rif_id = s.id and n.membro_id = gm.membro_id);

  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, letta_il, rif_id, created_at)
  select b, s.x, 'compito', 'Nuovo compito', c.titolo,
         '/c/tc-brera' || case m.ruolo when 'allievo' then '/allievo/compiti' else '/genitore' end,
         public._nome_membro(c.maestro_id),
         case when abs(hashtext(s.x::text || c.id::text)) % 100 < 55 then l.data + 1 end::timestamp at time zone 'Europe/Rome', c.id, (l.data::timestamp + time '19:30') at time zone 'Europe/Rome'
  from public.compiti c
  join public.lezioni l on l.id = c.lezione_id
  join lateral (
    select af.membro_id x from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id where i.gruppo_id = c.gruppo_id
    union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id where i.gruppo_id = c.gruppo_id and a.membro_id is not null
  ) s on true
  join public.membri m on m.id = s.x
  where c.centro_id = b and l.data >= date '2026-11-09'
    and not exists (select 1 from public.notifiche n where n.rif_id = c.id and n.membro_id = s.x);

  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id, created_at)
  select b, pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), 'sistema', 'Esercizio proposto approvato', '"Servizio e risposta a punti" è ora nella libreria del centro.', '/c/tc-brera/maestro/metodo', 'Laura Neri', null, timestamptz '2026-11-12 11:00+01'
  where not exists (select 1 from public.notifiche n where n.centro_id = b and n.tipo = 'sistema' and n.titolo = 'Esercizio proposto approvato');
end
$seed$;
