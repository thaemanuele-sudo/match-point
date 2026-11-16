-- 0006c · Centro dimostrativo "Tennis Club Brera" (tc-brera): clone del Metodo dal modello, persone, gruppi, allievi, famiglie.
-- Le persone dimostrative sono membri senza user_id; gli admin diventano titolare e DT per poter "vedere come".
-- Idempotente: ogni inserimento controlla l'esistenza della riga.

do $seed$
declare
  src uuid := (select id from public.centri where slug = 'matchpoint-modello');
  b uuid;
  v_admin uuid;
begin
  select id into b from public.centri where slug = 'tc-brera';
  if b is null then
    select id into v_admin from public.profiles where ruolo = 'admin' order by creato_il limit 1;
    insert into public.centri (slug, nome, nome_app, citta, colore, colore_ink, stato, piano, elencato, creato_da, impostazioni)
    values ('tc-brera', 'Tennis Club Brera', 'TC Brera', 'Milano', '#D8F34A', '#0A0A0A', 'attivo', 'club', true, v_admin,
      '{"silenzio_da":"21:00","silenzio_a":"08:00","chat_genitori_fino":18,"account_ragazzo_da":14,"assenza_entro_ore":2,"conservazione_mesi":24}'::jsonb)
    returning id into b;
    -- Metodo, aree, campi, permessi, formazione: stessa funzione usata da registra_centro e clona_centro
    perform public._clona_contenuti(src, b, true);
  end if;

  -- admin: titolare e DT del centro dimostrativo
  insert into public.membri (centro_id, user_id, ruolo, nome, cognome, email, telefono, stato)
  select b, p.id, r.ruolo::public.ruolo_centro, coalesce(nullif(p.nome, ''), 'Admin'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, ''), 'attivo'
  from public.profiles p cross join (values ('titolare'), ('dt')) r(ruolo)
  where p.ruolo = 'admin'
    and not exists (select 1 from public.membri m where m.centro_id = b and m.user_id = p.id and m.ruolo = r.ruolo::public.ruolo_centro);

  -- staff dimostrativo: DT, responsabili d'area, maestri, segreteria
  insert into public.membri (centro_id, ruolo, nome, cognome, email, area_id, stato)
  select b, s.ruolo::public.ruolo_centro, s.nome, s.cognome, lower(s.nome || '.' || s.cognome) || '@tcbrera.example',
         (select a.id from public.aree a where a.centro_id = b and a.nome = s.area), 'attivo'
  from (values
    ('dt', 'Laura', 'Neri', null),
    ('responsabile_area', 'Giulia', 'Sala', 'SAT'),
    ('responsabile_area', 'Marco', 'Ferri', 'SAT'),
    ('responsabile_area', 'Marco', 'Ferri', 'Pre-accademia'),
    ('responsabile_area', 'Paolo', 'Riva', 'Accademia'),
    ('responsabile_area', 'Paolo', 'Riva', 'Agonistica'),
    ('responsabile_area', 'Davide', 'Neri', 'Agonistica'),
    ('responsabile_area', 'Sara', 'Conti', 'Adulti'),
    ('responsabile_area', 'Elena', 'Gatti', 'Adulti'),
    ('maestro', 'Giulia', 'Sala', null),
    ('maestro', 'Marco', 'Ferri', null),
    ('maestro', 'Paolo', 'Riva', null),
    ('maestro', 'Davide', 'Neri', null),
    ('maestro', 'Sara', 'Conti', null),
    ('segreteria', 'Francesca', 'Bianchi', null)
  ) s(ruolo, nome, cognome, area)
  where not exists (
    select 1 from public.membri m
    where m.centro_id = b and m.user_id is null and m.ruolo = s.ruolo::public.ruolo_centro and m.nome = s.nome and m.cognome = s.cognome
      and m.area_id is not distinct from (select a.id from public.aree a where a.centro_id = b and a.nome = s.area));

  -- campi del centro: nomi e caratteristiche come da seed (il clone li ha già creati, qui li allineiamo)
  update public.campi k set nome = c.nome, superficie = c.superficie, copertura = c.copertura, luci = c.luci, stato = 'disponibile'
  from (values (1, 'Campo 1 · Centrale', 'terra', 'pallone', true), (2, 'Campo 2', 'terra', 'scoperto', true),
               (3, 'Campo 3', 'cemento', 'coperto', true), (4, 'Campo 4 · Mini', 'sintetico', 'scoperto', false)) c(numero, nome, superficie, copertura, luci)
  where k.centro_id = b and k.numero = c.numero;

  -- aree con le fasce del centro (da seed)
  update public.aree a set fasce = f.fasce
  from (values ('SAT', array['U8','U10','U12']), ('Pre-accademia', array['U12','U14']), ('Accademia', array['U14','U16','U18']),
               ('Agonistica', array['U16','U18','Agonisti']), ('Adulti', array['Adulti'])) f(nome, fasce)
  where a.centro_id = b and a.nome = f.nome;

  -- programma "Novembre · Dritto": copia dell'annuale U12 già clonato, assegnato ai gruppi U10 e U12
  insert into public.programmi (centro_id, nome, fascia, schema, anno, mesi, settimane_test)
  select b, 'Novembre · Dritto', 'U12', p.schema, p.anno, p.mesi, p.settimane_test
  from public.programmi p
  where p.centro_id = b and p.nome = 'Programma annuale 2026 · U12'
    and not exists (select 1 from public.programmi x where x.centro_id = b and x.nome = 'Novembre · Dritto');

  -- gruppi
  insert into public.gruppi (centro_id, area_id, nome, fascia, livello, giorni, ora, durata_min, campo_id, programma_id, attivo)
  select b, (select a.id from public.aree a where a.centro_id = b and a.nome = g.area), g.nome, g.fascia, g.livello, g.giorni, g.ora::time, g.durata,
         (select k.id from public.campi k where k.centro_id = b and k.numero = g.campo),
         (select p.id from public.programmi p where p.centro_id = b and p.nome = g.programma), true
  from (values
    ('U8 Mini', 'SAT', 'U8', 'Mini', array[6], '10:00', 45, 4, null),
    ('U10 Base', 'SAT', 'U10', 'Base', array[1,3], '17:00', 60, 4, 'Novembre · Dritto'),
    ('U12 Intermedio', 'SAT', 'U12', 'Intermedio', array[2,4], '17:00', 60, 2, 'Novembre · Dritto'),
    ('U12 Pre-accademia', 'Pre-accademia', 'U12', 'Pre-accademia', array[1,3], '18:30', 60, 3, 'Novembre · Dritto'),
    ('U14 Agonisti', 'Accademia', 'U14', 'Agonisti', array[1,3,5], '18:30', 90, 1, 'Programma annuale 2026 · U14'),
    ('Squadra U16', 'Agonistica', 'U16', 'Squadra', array[6], '14:00', 90, 1, null),
    ('Adulti sera', 'Adulti', 'Adulti', 'Sera', array[2], '20:00', 90, 3, null)
  ) g(nome, area, fascia, livello, giorni, ora, durata, campo, programma)
  where not exists (select 1 from public.gruppi x where x.centro_id = b and x.nome = g.nome);

  -- maestri dei gruppi
  insert into public.gruppi_maestri (centro_id, gruppo_id, membro_id, principale)
  select b, gr.id, m.id, gm.principale
  from (values
    ('U8 Mini', 'Giulia', 'Sala', true), ('U10 Base', 'Giulia', 'Sala', true),
    ('U12 Intermedio', 'Marco', 'Ferri', true), ('U12 Pre-accademia', 'Marco', 'Ferri', true),
    ('U14 Agonisti', 'Paolo', 'Riva', true),
    ('Squadra U16', 'Paolo', 'Riva', true), ('Squadra U16', 'Davide', 'Neri', false),
    ('Adulti sera', 'Sara', 'Conti', true)
  ) gm(gruppo, nome, cognome, principale)
  join public.gruppi gr on gr.centro_id = b and gr.nome = gm.gruppo
  join public.membri m on m.centro_id = b and m.ruolo = 'maestro' and m.nome = gm.nome and m.cognome = gm.cognome
  where not exists (select 1 from public.gruppi_maestri x where x.gruppo_id = gr.id and x.membro_id = m.id);
end
$seed$;

-- Allievi (51) con il genitore di riferimento; gli adulti non hanno genitore e usano un account proprio.
-- La tabella d'appoggio vive solo dentro questo blocco (on commit drop), così non resta nulla nella sessione.
do $seed$
declare b uuid := (select id from public.centri where slug = 'tc-brera');
begin
  create temp table _al (g text, nome text, cognome text, nascita date, genitore text, rel text) on commit drop;
  insert into _al values
  ('U8 Mini','Anna','Rossi','2019-02-11','Chiara','mamma'),
  ('U8 Mini','Pietro','Esposito','2018-11-03','Valentina','mamma'),
  ('U8 Mini','Alice','Ferrari','2019-05-22','Massimo','papà'),
  ('U8 Mini','Edoardo','Gallo','2018-09-30','Monica','mamma'),
  ('U8 Mini','Emma','Greco','2019-01-17','Andrea','papà'),
  ('U8 Mini','Mattia','Conte','2018-12-08','Federica','mamma'),
  ('U10 Base','Sofia','Marchetti','2016-04-09','Elisabetta','mamma'),
  ('U10 Base','Leo','Pellegrini','2016-10-21','Giovanni','papà'),
  ('U10 Base','Giorgio','Romano','2017-01-14','Silvia','mamma'),
  ('U10 Base','Beatrice','Ricci','2016-07-30','Roberto','papà'),
  ('U10 Base','Andrea','Moretti','2017-03-05','Daniela','mamma'),
  ('U10 Base','Martina','Barbieri','2016-12-12','Stefano','papà'),
  ('U10 Base','Lorenzo','Giordano','2017-02-26','Cristina','mamma'),
  ('U10 Base','Aurora','Cattaneo','2016-09-18','Claudio','papà'),
  ('U12 Intermedio','Tommaso','Rossi','2014-06-03','Chiara','mamma'),
  ('U12 Intermedio','Luca','Bianchi','2014-03-19','Gianni','papà'),
  ('U12 Intermedio','Matteo','Bruno','2014-11-25','Elena','mamma'),
  ('U12 Intermedio','Giulia','Lombardi','2015-02-08','Fabrizio','papà'),
  ('U12 Intermedio','Davide','Colombo','2014-08-16','Patrizia','mamma'),
  ('U12 Intermedio','Irene','Piras','2015-01-29','Salvatore','papà'),
  ('U12 Intermedio','Nicolò','Fontana','2014-10-07','Alessandra','mamma'),
  ('U12 Intermedio','Chiara','Villa','2015-04-13','Gianluca','papà'),
  ('U12 Pre-accademia','Federico','Monti','2014-05-21','Barbara','mamma'),
  ('U12 Pre-accademia','Elisa','Parisi','2014-09-02','Vincenzo','papà'),
  ('U12 Pre-accademia','Riccardo','Santoro','2015-03-11','Teresa','mamma'),
  ('U12 Pre-accademia','Ginevra','Leone','2014-12-19','Enrico','papà'),
  ('U12 Pre-accademia','Samuele','Longo','2014-07-27','Angela','mamma'),
  ('U12 Pre-accademia','Vittoria','Mancini','2015-02-23','Franco','papà'),
  ('U14 Agonisti','Alessandro','Caruso','2012-04-15','Rosa','mamma'),
  ('U14 Agonisti','Francesca','Bellini','2012-09-09','Mauro','papà'),
  ('U14 Agonisti','Gabriele','Testa','2013-01-31','Ilaria','mamma'),
  ('U14 Agonisti','Sara','Fiore','2012-06-24','Carlo','papà'),
  ('U14 Agonisti','Simone','Rinaldi','2013-03-17','Nadia','mamma'),
  ('U14 Agonisti','Ludovica','Serra','2012-11-05','Antonio','papà'),
  ('U14 Agonisti','Michele','Orlando','2012-08-28','Simona','mamma'),
  ('U14 Agonisti','Alice','Bernardi','2013-02-14','Gabriele','papà'),
  ('Squadra U16','Jacopo','Silvestri','2010-05-06','Emanuela','mamma'),
  ('Squadra U16','Noemi','Palumbo','2010-10-30','Pasquale','papà'),
  ('Squadra U16','Filippo','Guerra','2011-01-22','Manuela','mamma'),
  ('Squadra U16','Carlotta','De Luca','2010-07-12','Riccardo','papà'),
  ('Squadra U16','Diego','Martini','2011-03-08','Lucia','mamma'),
  ('Squadra U16','Rebecca','Vitale','2010-12-01','Sergio','papà'),
  ('Adulti sera','Stefano','Pace','1984-03-02',null,null),
  ('Adulti sera','Paola','Benedetti','1979-06-15',null,null),
  ('Adulti sera','Roberto','Amato','1972-10-09',null,null),
  ('Adulti sera','Cristina','Fabbri','1988-01-27',null,null),
  ('Adulti sera','Andrea','Valentini','1991-09-03',null,null),
  ('Adulti sera','Silvia','Costa','1983-04-21',null,null),
  ('Adulti sera','Massimo','Rizzo','1969-12-11',null,null),
  ('Adulti sera','Elena','Marini','1990-07-08',null,null),
  ('Adulti sera','Fabio','Donati','1976-02-19',null,null);

  -- allievi (note mediche e certificato solo per alcuni, come in un centro vero)
  insert into public.allievi (centro_id, nome, cognome, data_nascita, note_mediche, certificato_scade)
  select b, a.nome, a.cognome, a.nascita,
         case when a.nome = 'Irene' then 'Asma lieve da sforzo: tiene con sé il broncodilatatore' when a.nome = 'Pietro' then 'Allergia ai pollini in primavera' end,
         case when a.g = 'Adulti sera' then date '2027-03-31' when a.nascita > date '2012-01-01' then date '2027-01-15' else date '2026-12-20' end
  from _al a
  where not exists (select 1 from public.allievi x where x.centro_id = b and x.nome = a.nome and x.cognome = a.cognome);

  -- account propri degli allievi: ragazzi dai 12 anni in su e adulti
  insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
  select b, 'allievo', a.nome, a.cognome, lower(translate(a.nome || '.' || a.cognome, ' àèéìòùò', '-aeeiouo')) || '@allievi.tcbrera.example', 'attivo'
  from _al a
  where a.g in ('U12 Intermedio', 'U14 Agonisti', 'Squadra U16', 'Adulti sera')
    and not exists (select 1 from public.membri m where m.centro_id = b and m.ruolo = 'allievo' and m.nome = a.nome and m.cognome = a.cognome);
  update public.allievi al set membro_id = m.id
  from public.membri m
  where al.centro_id = b and al.membro_id is null and m.centro_id = b and m.ruolo = 'allievo' and m.nome = al.nome and m.cognome = al.cognome;

  -- genitori (un membro per famiglia: Chiara Rossi è mamma di Tommaso e di Anna)
  insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
  select distinct b, 'genitore'::public.ruolo_centro, a.genitore, a.cognome, lower(a.genitore || '.' || translate(a.cognome, ' ', '-')) || '@famiglie.tcbrera.example', 'attivo'
  from _al a
  where a.genitore is not null
    and not exists (select 1 from public.membri m where m.centro_id = b and m.ruolo = 'genitore' and m.nome = a.genitore and m.cognome = a.cognome);

  insert into public.allievi_famiglie (centro_id, allievo_id, membro_id, relazione)
  select b, al.id, m.id, a.rel
  from _al a
  join public.allievi al on al.centro_id = b and al.nome = a.nome and al.cognome = a.cognome
  join public.membri m on m.centro_id = b and m.ruolo = 'genitore' and m.nome = a.genitore and m.cognome = a.cognome
  where not exists (select 1 from public.allievi_famiglie f where f.allievo_id = al.id and f.membro_id = m.id);

  -- iscrizioni ai gruppi (anno sportivo iniziato a settembre)
  insert into public.iscrizioni (centro_id, allievo_id, gruppo_id, dal)
  select b, al.id, g.id, date '2026-09-14'
  from _al a
  join public.allievi al on al.centro_id = b and al.nome = a.nome and al.cognome = a.cognome
  join public.gruppi g on g.centro_id = b and g.nome = a.g
  where not exists (select 1 from public.iscrizioni i where i.allievo_id = al.id and i.gruppo_id = g.id);

  -- corsi senza quote: le inserisce il centro, qui non si inventano prezzi
  insert into public.corsi (centro_id, nome, gruppo_id, quota_cent, sconto_fratelli_pct, rate, scadenze)
  select b, 'Corso ' || g.nome || ' · stagione 2026/27', g.id, null, null, null, '[]'::jsonb
  from public.gruppi g
  where g.centro_id = b and not exists (select 1 from public.corsi c where c.centro_id = b and c.gruppo_id = g.id);
end
$seed$;
