-- 0006e3 · Seed Tennis Club Brera (avvisi). Vedi l'intestazione di 0006e.
create or replace function pg_temp.mid(c uuid, r text, n text, co text) returns uuid language sql as
$$ select id from public.membri where centro_id = c and ruolo = r::public.ruolo_centro and nome = n and cognome = co and area_id is null order by created_at limit 1 $$;

-- Avvisi del DT con le letture dei destinatari
do $seed$
declare
  b uuid := (select id from public.centri where slug = 'tc-brera');
  laura uuid := pg_temp.mid((select id from public.centri where slug = 'tc-brera'), 'dt', 'Laura', 'Neri');
  g_u12 uuid := (select id from public.gruppi where centro_id = (select id from public.centri where slug = 'tc-brera') and nome = 'U12 Intermedio');
begin
  insert into public.avvisi (centro_id, autore_id, titolo, testo, destinatari, conferma, promemoria, consegna_il, created_at)
  select b, laura, a.titolo, a.testo, a.dest, a.conferma, a.promemoria, a.quando, a.quando
  from (values
    ('Torneo sociale U12 · domenica 29 novembre', 'Domenica 29 novembre si gioca il torneo sociale Under 12 sui Campi 1 e 3, dalle 9:00. Iscrizioni in segreteria entro lunedì 23. Ogni famiglia è invitata a confermare la presenza.',
      '{"tipo":"fascia","valori":["U12"]}'::jsonb, true, false, timestamptz '2026-11-11 09:00+01'),
    ('Martedì 17 novembre: cambio campo per l''U12 Intermedio', 'Per la manutenzione del fondo del Campo 2, martedì 17 novembre l''U12 Intermedio si allena sul Campo 3 alla solita ora (17:00). Giovedì si torna sul Campo 2.',
      jsonb_build_object('tipo', 'gruppo', 'valori', jsonb_build_array(g_u12::text)), false, false, timestamptz '2026-11-13 10:00+01'),
    ('Immacolata: centro chiuso lunedì 8 dicembre', 'Lunedì 8 dicembre il centro resta chiuso per la festa dell''Immacolata. Gli allenamenti riprendono martedì 9 dicembre secondo il calendario.',
      '{"tipo":"centro","valori":[]}'::jsonb, false, true, timestamptz '2026-11-14 12:00+01')
  ) a(titolo, testo, dest, conferma, promemoria, quando)
  where not exists (select 1 from public.avvisi x where x.centro_id = b and x.titolo = a.titolo);

  create temp table _dest (avviso_id uuid, membro_id uuid, quando timestamptz, pct int) on commit drop;
  insert into _dest
  select d.id, d.membro, d.consegna_il, d.pct from (
    select av.id, av.consegna_il, case when av.titolo like 'Torneo%' then 70 when av.titolo like 'Martedì%' then 85 else 40 end pct, f.membro_id membro
    from public.avvisi av
    join public.gruppi g on g.centro_id = b and (av.destinatari ->> 'tipo' = 'centro'
         or (av.destinatari ->> 'tipo' = 'fascia' and g.fascia in (select jsonb_array_elements_text(av.destinatari -> 'valori')))
         or (av.destinatari ->> 'tipo' = 'gruppo' and g.id::text in (select jsonb_array_elements_text(av.destinatari -> 'valori'))))
    join public.iscrizioni i on i.gruppo_id = g.id
    join public.allievi_famiglie f on f.allievo_id = i.allievo_id
    where av.centro_id = b
    union
    select av.id, av.consegna_il, case when av.titolo like 'Torneo%' then 70 when av.titolo like 'Martedì%' then 85 else 40 end, a.membro_id
    from public.avvisi av
    join public.gruppi g on g.centro_id = b and (av.destinatari ->> 'tipo' = 'centro'
         or (av.destinatari ->> 'tipo' = 'fascia' and g.fascia in (select jsonb_array_elements_text(av.destinatari -> 'valori')))
         or (av.destinatari ->> 'tipo' = 'gruppo' and g.id::text in (select jsonb_array_elements_text(av.destinatari -> 'valori'))))
    join public.iscrizioni i on i.gruppo_id = g.id
    join public.allievi a on a.id = i.allievo_id and a.membro_id is not null
    where av.centro_id = b
    union
    -- l'avviso a tutto il centro arriva anche ai maestri
    select av.id, av.consegna_il, 40, m.id
    from public.avvisi av join public.membri m on m.centro_id = b and m.ruolo = 'maestro'
    where av.centro_id = b and av.destinatari ->> 'tipo' = 'centro'
  ) d;

  insert into public.avvisi_letture (centro_id, avviso_id, membro_id, letto_il)
  select b, d.avviso_id, d.membro_id, d.quando + (30 + abs(hashtext(d.membro_id::text)) % 3000) * interval '1 minute'
  from _dest d
  where abs(hashtext(d.avviso_id::text || d.membro_id::text)) % 100 < d.pct
  on conflict (avviso_id, membro_id) do nothing;

  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, letta_il, consegna_il, rif_id, created_at)
  select b, d.membro_id, 'avviso', av.titolo, left(av.testo, 140),
         '/c/tc-brera' || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
         'Laura Neri', l.letto_il, av.consegna_il, av.id, av.consegna_il
  from _dest d
  join public.avvisi av on av.id = d.avviso_id
  join public.membri m on m.id = d.membro_id
  left join public.avvisi_letture l on l.avviso_id = d.avviso_id and l.membro_id = d.membro_id
  where not exists (select 1 from public.notifiche n where n.rif_id = av.id and n.membro_id = d.membro_id and n.tipo = 'avviso');
end
$seed$;
