-- 0006d · Tennis Club Brera: lezioni delle ultime 6 settimane (chiuse) e delle prossime due (programmate),
-- presenze, assenze, valutazioni dei test ott-2026 e nov-2026, compiti, note private.
-- Oggi è lunedì 16/11/2026: le lezioni fino al 15/11 sono chiuse, da oggi al 29/11 sono programmate.
-- I valori "casuali" derivano da hashtext, così sono ripetibili e non servono dati veri.

do $seed$
declare b uuid := (select id from public.centri where slug = 'tc-brera');
begin
  -- lezioni: ogni gruppo nei suoi giorni, con il modello e il piano copiato dal modello
  insert into public.lezioni (centro_id, gruppo_id, data, ora, campo_id, maestro_id, modello_id, piano, stato)
  select b, g.id, d::date, g.ora, g.campo_id, gm.membro_id, mo.id, mo.blocchi,
         case when d::date < date '2026-11-16' then 'chiusa' else 'programmata' end
  from public.gruppi g
  cross join generate_series(date '2026-10-05', date '2026-11-29', interval '1 day') d
  join public.gruppi_maestri gm on gm.gruppo_id = g.id and gm.principale
  join public.modelli_lezione mo on mo.centro_id = b and mo.nome = case
      when g.nome = 'U8 Mini' then 'Giochi e mini-partite'
      when g.nome in ('U10 Base', 'U12 Intermedio', 'U12 Pre-accademia') then
        case when d::date >= date '2026-11-02' or extract(isodow from d)::int = g.giorni[1] then 'Multicolpo a quarti' else 'Un colpo a fondo' end
      else 'Multicolpo 90 minuti' end
  where g.centro_id = b and extract(isodow from d)::int = any (g.giorni)
  on conflict (gruppo_id, data) do nothing;

  -- svolto delle lezioni chiuse: blocchi bloccati quasi sempre fatti, i flessibili a volte sostituiti con un'alternativa
  update public.lezioni l set svolto = (
    select jsonb_agg(
      jsonb_build_object('indice', t.ord - 1, 'minuti', (t.blk ->> 'minuti')::int,
                         'fatto', not (t.blk ->> 'modo' = 'bloccato' and hh.h < 4))
      || case when t.blk ->> 'modo' = 'flessibile' and hh.h < 35 and jsonb_array_length(t.blk -> 'alternative') > 0
              then jsonb_build_object('sostituito', true, 'esercizio_id', t.blk -> 'alternative' ->> 0) else '{}'::jsonb end
      order by t.ord)
    from jsonb_array_elements(l.piano) with ordinality t(blk, ord)
    cross join lateral (select abs(hashtext(l.gruppo_id::text || l.data::text || t.ord::text)) % 100 as h) hh)
  where l.centro_id = b and l.stato = 'chiusa' and l.svolto is null;

  -- motivo dello scostamento quando un blocco bloccato non è stato fatto
  update public.lezioni l set motivi_scostamento = (
    select jsonb_agg(jsonb_build_object('indice', (s ->> 'indice')::int, 'motivo', 'Campo bagnato: scambi accorciati'))
    from jsonb_array_elements(l.svolto) s where not (s ->> 'fatto')::boolean)
  where l.centro_id = b and l.stato = 'chiusa' and l.motivi_scostamento is null
    and exists (select 1 from jsonb_array_elements(l.svolto) s where not (s ->> 'fatto')::boolean);

  -- riassunto per le famiglie (gli ultimi giorni restano da approvare) e compito della settimana
  update public.lezioni l set
    riassunto = 'Oggi abbiamo lavorato su ' || coalesce((select string_agg(distinct lower(x ->> 'colpo'), ', ') from jsonb_array_elements(l.piano) x where x ->> 'colpo' <> ''), 'gioco e coordinazione')
                || case abs(hashtext(l.id::text)) % 3
                     when 0 then '. Bella energia del gruppo e tanta voglia di migliorare.'
                     when 1 then '. Buona attenzione sui dettagli tecnici: si vede il lavoro delle ultime settimane.'
                     else '. Ottima partecipazione, qualche palla in più nel campo rispetto alla scorsa lezione.' end,
    riassunto_ok = l.data < date '2026-11-12'
  from public.gruppi g
  where g.id = l.gruppo_id and l.centro_id = b and l.stato = 'chiusa' and g.fascia <> 'Adulti' and l.riassunto is null;

  update public.lezioni l set compito = (array['Dritto: 20 palleggi al muro con la racchetta', 'Rovescio a due mani: 15 colpi contro il muro',
      'Servizio: 10 lanci di palla da fermo davanti allo specchio', 'Dritto: 3 serie da 10 colpi al muro'])[1 + extract(week from l.data)::int % 4]
  from public.gruppi g
  where g.id = l.gruppo_id and l.centro_id = b and l.stato = 'chiusa' and l.data >= date '2026-10-12'
    and g.nome in ('U10 Base', 'U12 Intermedio', 'U12 Pre-accademia') and extract(isodow from l.data)::int = g.giorni[1] and l.compito is null;

  -- presenze: circa il 90% presenti; il voto rapido (1-3) migliora con le settimane; Tommaso R. non manca mai
  insert into public.presenze (centro_id, lezione_id, allievo_id, presente, voto_rapido)
  select b, l.id, i.allievo_id, p.presente,
         case when p.presente then 1 + case when v.h < 15 - (l.data - date '2026-10-05') / 4 then 0 when v.h < 60 - (l.data - date '2026-10-05') / 3 then 1 else 2 end end
  from public.lezioni l
  join public.iscrizioni i on i.gruppo_id = l.gruppo_id
  join public.allievi a on a.id = i.allievo_id
  cross join lateral (select abs(hashtext(l.id::text || i.allievo_id::text)) % 100 as h) hp
  cross join lateral (select abs(hashtext(i.allievo_id::text || l.data::text || 'v')) % 100 as h) v
  cross join lateral (select (hp.h >= 10 or a.nome = 'Tommaso') as presente) p
  where l.centro_id = b and l.stato = 'chiusa'
  on conflict (lezione_id, allievo_id) do nothing;

  update public.presenze p set nota = n.nota
  from (values
    ('Tommaso', 'Rossi', date '2026-10-22', 'Preparazione più precoce del dritto: bene.'),
    ('Tommaso', 'Rossi', date '2026-11-05', 'Impatto davanti al corpo, molto migliorato.'),
    ('Irene', 'Piras', date '2026-11-10', 'Ha portato il broncodilatatore, tutto regolare.'),
    ('Luca', 'Bianchi', date '2026-11-12', 'Bravo nel servizio: lancio alto e costante.'),
    ('Sofia', 'Marchetti', date '2026-11-09', 'Molto concentrata nel palleggio a coppie.')
  ) n(nome, cognome, data, nota)
  join public.allievi a on a.centro_id = b and a.nome = n.nome and a.cognome = n.cognome
  join public.lezioni l on l.centro_id = b and l.data = n.data
  where p.allievo_id = a.id and p.lezione_id = l.id and p.presente;

  -- assenze comunicate dalle famiglie (due già avvisate per i prossimi giorni)
  insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da)
  select b, a.id, s.data, g.id, s.motivo, s.testo, f.membro_id
  from (values
    ('Luca', 'Bianchi', date '2026-11-17', 'malato', 'Febbre da ieri sera, speriamo di tornare giovedì.'),
    ('Sofia', 'Marchetti', date '2026-11-18', 'scuola', 'Gita scolastica con rientro alle 18:00.'),
    ('Matteo', 'Bruno', date '2026-11-05', 'altro', 'Visita dal dentista nel pomeriggio.'),
    ('Giorgio', 'Romano', date '2026-10-28', 'viaggio', 'Weekend lungo fuori città, parte il mercoledì.')
  ) s(nome, cognome, data, motivo, testo)
  join public.allievi a on a.centro_id = b and a.nome = s.nome and a.cognome = s.cognome
  join public.iscrizioni i on i.allievo_id = a.id
  join public.gruppi g on g.id = i.gruppo_id
  left join public.allievi_famiglie f on f.allievo_id = a.id
  where not exists (select 1 from public.assenze x where x.allievo_id = a.id and x.data = s.data);

  -- note private dei maestri (mai visibili alle famiglie)
  insert into public.note_private (centro_id, allievo_id, maestro_id, testo)
  select b, a.id, m.id, n.testo
  from (values
    ('Tommaso', 'Rossi', 'Marco', 'Molto motivato, da proteggere dal sovraccarico: ha anche i tornei Under 12 a novembre.'),
    ('Luca', 'Bianchi', 'Marco', 'Tende a perdere fiducia dopo due errori di fila: lavorare sulla routine tra i punti.'),
    ('Irene', 'Piras', 'Marco', 'Ha l''asma da sforzo: pause più frequenti nei circuiti di atletica.'),
    ('Sofia', 'Marchetti', 'Giulia', 'Timida ma attenta, risponde bene ai giochi a squadre.'),
    ('Alessandro', 'Caruso', 'Paolo', 'Ottimo servizio, il rovescio a due mani è ancora il punto debole.')
  ) n(nome, cognome, maestro, testo)
  join public.allievi a on a.centro_id = b and a.nome = n.nome and a.cognome = n.cognome
  join public.membri m on m.centro_id = b and m.ruolo = 'maestro' and m.nome = n.maestro
  where not exists (select 1 from public.note_private x where x.allievo_id = a.id and x.maestro_id = m.id and x.testo = n.testo);

  -- valutazioni dei test: ott-2026 (28/10) e nov-2026 (12/11) per gli allievi U10, U12 e U14, su dritto, rovescio e servizio
  -- le competenze sono quelle delle linee guida della fascia; a novembre quasi tutti salgono di un livello
  insert into public.valutazioni (centro_id, allievo_id, maestro_id, test, colpo, competenza, voto, data)
  select b, a.id, gm.membro_id, t.test, lg.colpo, c.competenza,
         case t.test when 'ott-2026' then v.ott else least(5, v.ott + case when v.salto < 65 then 1 else 0 end) end,
         t.data
  from public.allievi a
  join public.iscrizioni i on i.allievo_id = a.id
  join public.gruppi g on g.id = i.gruppo_id and g.fascia in ('U10', 'U12', 'U14')
  join public.gruppi_maestri gm on gm.gruppo_id = g.id and gm.principale
  join public.linee_guida lg on lg.centro_id = b and lg.fascia = g.fascia and lg.colpo in ('Dritto', 'Rovescio', 'Servizio')
  cross join lateral jsonb_array_elements_text(lg.competenze) c(competenza)
  cross join (values ('ott-2026', date '2026-10-28'), ('nov-2026', date '2026-11-12')) t(test, data)
  cross join lateral (select 1 + abs(hashtext(a.id::text || lg.colpo || c.competenza)) % 3 + case when g.fascia = 'U14' then 1 else 0 end as ott,
                             abs(hashtext(c.competenza || a.id::text || 'su')) % 100 as salto) v
  where a.centro_id = b
  on conflict (allievo_id, test, colpo, competenza) do nothing;

  -- compiti di gruppo legati alle lezioni (dal 2 novembre) e compiti_fatti: i più vecchi quasi tutti fatti, gli ultimi a metà
  insert into public.compiti (centro_id, gruppo_id, maestro_id, titolo, durata_min, esercizio_id, scadenza, lezione_id)
  select b, l.gruppo_id, l.maestro_id, l.compito, 15,
         (select e.id from public.esercizi e where e.centro_id = b and e.titolo = 'Dritto a due palle'), l.data + 5, l.id
  from public.lezioni l
  where l.centro_id = b and l.compito is not null and l.data >= date '2026-11-02'
    and not exists (select 1 from public.compiti c where c.lezione_id = l.id);

  insert into public.compiti (centro_id, allievo_id, maestro_id, titolo, durata_min, scadenza)
  select b, a.id, m.id, 'Servizio: 15 lanci di palla al giorno, senza racchetta', 10, date '2026-11-20'
  from public.allievi a, public.membri m
  where a.centro_id = b and a.nome = 'Tommaso' and a.cognome = 'Rossi' and m.centro_id = b and m.ruolo = 'maestro' and m.nome = 'Marco'
    and not exists (select 1 from public.compiti c where c.allievo_id = a.id and c.titolo like 'Servizio: 15 lanci%');

  insert into public.compiti_fatti (centro_id, compito_id, allievo_id, fatto_il)
  select b, c.id, i.allievo_id, ((l.data + 1 + abs(hashtext(i.allievo_id::text)) % 3)::timestamp + time '18:30') at time zone 'Europe/Rome'
  from public.compiti c
  join public.lezioni l on l.id = c.lezione_id
  join public.iscrizioni i on i.gruppo_id = c.gruppo_id
  where c.centro_id = b and abs(hashtext(c.id::text || i.allievo_id::text)) % 100 < case when l.data < date '2026-11-09' then 80 else 45 end
  on conflict (compito_id, allievo_id) do nothing;
end
$seed$;
