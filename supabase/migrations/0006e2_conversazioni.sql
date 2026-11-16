-- 0006e2 · Seed Tennis Club Brera (conversazioni). Vedi l'intestazione di 0006e.
create or replace function pg_temp.mid(c uuid, r text, n text, co text) returns uuid language sql as
$$ select id from public.membri where centro_id = c and ruolo = r::public.ruolo_centro and nome = n and cognome = co and area_id is null order by created_at limit 1 $$;

-- Conversazioni e messaggi (tutti i messaggi sono immutabili: si inseriscono una volta sola)
do $seed$
declare
  b uuid := (select id from public.centri where slug = 'tc-brera');
begin
  create temp table _conv (k text, tipo text, titolo text, allievo uuid, creata uuid) on commit drop;
  insert into _conv values
    ('c1', 'allievo_maestro', 'Tommaso R. · Marco', (select id from public.allievi where centro_id = b and nome = 'Tommaso' and cognome = 'Rossi'), pg_temp.mid(b, 'allievo', 'Tommaso', 'Rossi')),
    ('c2', 'famiglia_maestro', 'Famiglia Rossi · Marco', (select id from public.allievi where centro_id = b and nome = 'Tommaso' and cognome = 'Rossi'), pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi')),
    ('c3', 'famiglia_segreteria', 'Famiglia Rossi · Segreteria', (select id from public.allievi where centro_id = b and nome = 'Anna' and cognome = 'Rossi'), pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi')),
    ('c4', 'famiglia_maestro', 'Famiglia Marchetti · Giulia', (select id from public.allievi where centro_id = b and nome = 'Sofia' and cognome = 'Marchetti'), pg_temp.mid(b, 'genitore', 'Elisabetta', 'Marchetti')),
    ('c5', 'famiglia_maestro', 'Famiglia Bianchi · Marco', (select id from public.allievi where centro_id = b and nome = 'Luca' and cognome = 'Bianchi'), pg_temp.mid(b, 'genitore', 'Gianni', 'Bianchi'));

  insert into public.conversazioni (centro_id, tipo, allievo_id, titolo, creata_da, created_at)
  select b, c.tipo, c.allievo, c.titolo, c.creata, timestamptz '2026-11-04 11:00+01'
  from _conv c
  where not exists (select 1 from public.conversazioni x where x.centro_id = b and x.titolo = c.titolo);

  -- partecipanti: nella chat figlio-maestro il genitore è in sola lettura
  insert into public.partecipanti (centro_id, conversazione_id, membro_id, sola_lettura)
  select b, cv.id, p.membro, p.sola_lettura
  from (values
    ('c1', pg_temp.mid(b, 'allievo', 'Tommaso', 'Rossi'), false), ('c1', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), false), ('c1', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), true),
    ('c2', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), false), ('c2', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), false),
    ('c3', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), false), ('c3', pg_temp.mid(b, 'segreteria', 'Francesca', 'Bianchi'), false),
    ('c4', pg_temp.mid(b, 'genitore', 'Elisabetta', 'Marchetti'), false), ('c4', pg_temp.mid(b, 'maestro', 'Giulia', 'Sala'), false),
    ('c5', pg_temp.mid(b, 'genitore', 'Gianni', 'Bianchi'), false), ('c5', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), false)
  ) p(k, membro, sola_lettura)
  join _conv c on c.k = p.k
  join public.conversazioni cv on cv.centro_id = b and cv.titolo = c.titolo
  where not exists (select 1 from public.partecipanti x where x.conversazione_id = cv.id and x.membro_id = p.membro);

  -- messaggi: quello della sera del 12/11 (dopo le 21) viene consegnato alle 8:00 del giorno dopo
  insert into public.messaggi (centro_id, conversazione_id, autore_id, testo, consegna_il, created_at)
  select b, cv.id, m.autore, m.testo, coalesce(m.consegna, m.quando), m.quando
  from (values
    ('c1', pg_temp.mid(b, 'allievo', 'Tommaso', 'Rossi'), timestamptz '2026-11-10 17:42+01', null::timestamptz, 'Ciao Marco, oggi ho provato il dritto con la preparazione più presto. Va meglio?'),
    ('c1', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), timestamptz '2026-11-10 18:20+01', null, 'Ciao Tommaso! Sì, si vede: l''impatto adesso è davanti al corpo. Continua con i 20 palleggi al muro.'),
    ('c1', pg_temp.mid(b, 'allievo', 'Tommaso', 'Rossi'), timestamptz '2026-11-11 16:05+01', null, 'Ok, li faccio oggi. Giovedì c''è ancora il circuito di atletica?'),
    ('c1', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), timestamptz '2026-11-11 16:30+01', null, 'Sì, giovedì circuito all''inizio e poi servizio. Porta la borraccia!'),
    ('c1', pg_temp.mid(b, 'allievo', 'Tommaso', 'Rossi'), timestamptz '2026-11-13 19:10+01', null, 'Fatto! Ho contato 22 palleggi di fila.'),
    ('c1', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), timestamptz '2026-11-13 19:45+01', null, 'Bravissimo, 22 è un ottimo risultato. Martedì proviamo a farne 25 con il rovescio.'),
    ('c2', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), timestamptz '2026-11-09 20:15+01', null, 'Buonasera Marco, martedì 17 Tommaso potrebbe arrivare con 10 minuti di ritardo per la scuola. Va bene?'),
    ('c2', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), timestamptz '2026-11-09 20:40+01', null, 'Buonasera Chiara, nessun problema: iniziamo con il riscaldamento e lui si unisce dopo.'),
    ('c2', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), timestamptz '2026-11-12 22:05+01', timestamptz '2026-11-13 08:00+01', 'Una domanda sul torneo sociale del 29: serve iscriverlo entro lunedì?'),
    ('c2', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), timestamptz '2026-11-13 08:10+01', null, 'Sì, l''iscrizione si fa in segreteria entro lunedì 23. Gli consiglio di partecipare, è un buon test.'),
    ('c2', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), timestamptz '2026-11-13 08:25+01', null, 'Perfetto, passo domani in segreteria. Grazie!'),
    ('c3', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), timestamptz '2026-11-04 11:00+01', null, 'Buongiorno, ho due figli iscritti (Tommaso e Anna): c''è uno sconto fratelli?'),
    ('c3', pg_temp.mid(b, 'segreteria', 'Francesca', 'Bianchi'), timestamptz '2026-11-04 11:35+01', null, 'Buongiorno Chiara, lo sconto fratelli sarà comunicato con le quote della nuova stagione: appena ho le tariffe le scrivo.'),
    ('c3', pg_temp.mid(b, 'genitore', 'Chiara', 'Rossi'), timestamptz '2026-11-04 11:40+01', null, 'Grazie, aspetto notizie.'),
    ('c3', pg_temp.mid(b, 'segreteria', 'Francesca', 'Bianchi'), timestamptz '2026-11-12 09:00+01', null, 'Le ricordo che il certificato medico di Tommaso e di Anna scade il 15 gennaio: potete portarlo in segreteria quando lo rinnovate.'),
    ('c4', pg_temp.mid(b, 'genitore', 'Elisabetta', 'Marchetti'), timestamptz '2026-11-16 08:30+01', null, 'Buongiorno Giulia, mercoledì Sofia non c''è per la gita scolastica: l''ho segnalato anche nell''app.'),
    ('c4', pg_temp.mid(b, 'maestro', 'Giulia', 'Sala'), timestamptz '2026-11-16 09:05+01', null, 'Grazie Elisabetta, ricevuto! Recuperiamo il dritto alla prossima lezione.'),
    ('c5', pg_temp.mid(b, 'genitore', 'Gianni', 'Bianchi'), timestamptz '2026-11-16 07:50+01', null, 'Buongiorno, Luca ha la febbre: domani non può venire.'),
    ('c5', pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), timestamptz '2026-11-16 08:20+01', null, 'Ricevuto, buona guarigione a Luca. Gli passo gli esercizi di servizio per quando sta meglio.')
  ) m(k, autore, quando, consegna, testo)
  join _conv c on c.k = m.k
  join public.conversazioni cv on cv.centro_id = b and cv.titolo = c.titolo
  where not exists (select 1 from public.messaggi x where x.conversazione_id = cv.id and x.created_at = m.quando);

  -- notifiche dei messaggi di oggi non ancora letti dall'altra parte
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, consegna_il, rif_id, created_at)
  select b, p.membro_id, 'messaggio', public._nome_membro(ms.autore_id), left(ms.testo, 140), '/c/tc-brera/chat/' || cv.id, public._nome_membro(ms.autore_id), ms.consegna_il, cv.id, ms.created_at
  from public.conversazioni cv
  join lateral (select * from public.messaggi x where x.conversazione_id = cv.id order by x.created_at desc limit 1) ms on true
  join public.partecipanti p on p.conversazione_id = cv.id and p.membro_id <> ms.autore_id
  where cv.centro_id = b and ms.created_at >= timestamptz '2026-11-16 00:00+01'
    and not exists (select 1 from public.notifiche n where n.membro_id = p.membro_id and n.tipo = 'messaggio' and n.rif_id = cv.id);
end
$seed$;
