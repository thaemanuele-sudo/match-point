-- 0010_seed_quanta · Centro dimostrativo "Quanta Club Milano" (slug quanta-club), pensato per provare la scala di un grande centro.
--
-- REALE (fonte pubblica: quantaclub.com, pagina tennis): nome, indirizzo (Via Assietta 19, 20161 Milano), i 17 campi da tennis
--   (6 terra rossa, 5 clay tech, 6 play it), le aree della scuola tennis con le loro fasce, i corsi, il calendario del Quanta Junior Tour.
--   Su richiesta del cliente sono reali anche i nomi dei due direttori tecnici (Marco Brigo, Fabio Chiappini) e dei due
--   responsabili dell'area Adulti (Alan Fiordelmonte, Marco Campanella).
-- DIMOSTRATIVO: tutto il resto (altro staff, allievi, famiglie, gruppi, lezioni, presenze, valutazioni, messaggi, avvisi, segnalazioni).
--   Lo staff tennis non è pubblicato sul sito: i nomi sono inventati e le email usano il dominio quanta-demo.example.
-- I prezzi non sono pubblici: corsi.quota_cent resta NULL, li inserirà il club. Il logo lo caricherà il cliente (colore = predefinito Match Point).
--
-- Oggi è lunedì 16/11/2026: le lezioni fino al 15/11 sono chiuse (6 settimane), da oggi al 29/11 sono programmate (2 settimane).
-- Il Metodo (esercizi, modelli, programmi, linee guida, formazione) è clonato dal centro matchpoint-modello, che resta intatto.
-- Idempotente: il centro si crea una volta sola e ogni inserimento controlla l'esistenza della riga.
-- Nessuna cancellazione di dati. I valori "casuali" derivano da hashtext, quindi sono ripetibili.

-- ============ A. Centro, aree, campi, corsi, staff, gruppi, allievi, famiglie, iscrizioni, consensi ============
do $seed$
declare
  src uuid := (select id from public.centri where slug = 'matchpoint-modello');
  b uuid;
  v_admin uuid;
  v_nuovo boolean := false;
  -- elenchi per generare nomi di fantasia: 40 nomi e 59 cognomi (numeri primi tra loro, così le coppie non si ripetono)
  v_nomi text[] := array['Alessandro','Sofia','Lorenzo','Giulia','Leonardo','Aurora','Mattia','Alice','Gabriele','Ginevra',
    'Riccardo','Beatrice','Tommaso','Emma','Edoardo','Chiara','Federico','Vittoria','Francesco','Martina',
    'Andrea','Greta','Filippo','Anna','Giacomo','Elisa','Nicolò','Sara','Samuele','Noemi',
    'Pietro','Camilla','Matteo','Arianna','Davide','Bianca','Simone','Irene','Daniele','Ludovica'];
  v_cogn text[] := array['Rinaldi','Ferrante','Sorrentino','Caputo','Marchesi','Bellini','Gentile','Fabbri','Serra','Orlando',
    'Testa','Coppola','Palumbo','Amato','Bernardi','Guidi','De Santis','Mazza','Pellegrino','Valentini',
    'Messina','Cattaneo','Benedetti','Grassi','Rizzo','Sanna','Basile','Donati','Fiore','Lombardo',
    'Carbone','Silvestri','Barone','Piazza','Farina','Rossetti','Monti','Vitale','Negri','Cirillo',
    'Martini','Bianco','Papa','Battaglia','Ruggiero','Pagano','Ferri','Villa','Morelli','Conti',
    'Costa','Gallo','Leone','Sala','Ricci','Riva','Marini','Parisi','Esposito'];
begin
  if src is null then raise exception 'Centro modello matchpoint-modello assente: eseguire prima le migrazioni 0006'; end if;

  select id into b from public.centri where slug = 'quanta-club';
  if b is null then
    select id into v_admin from public.profiles where ruolo = 'admin' order by creato_il limit 1;
    insert into public.centri (slug, nome, nome_app, citta, stato, piano, elencato, creato_da)
    values ('quanta-club', 'Quanta Club Milano', 'Quanta Club', 'Milano', 'attivo', 'club', true, v_admin)
    returning id into b;
    -- Metodo, aree, permessi, formazione: stessa funzione di registra_centro e clona_centro (i campi li definiamo noi sotto)
    perform public._clona_contenuti(src, b, false);
    v_nuovo := true;
  end if;

  -- aree reali: le prime 5 sono quelle clonate dal modello, che rinominiamo (i permessi seguono l'id); le altre 2 si aggiungono
  if v_nuovo then
    update public.aree a set nome = n.nome, sigla = n.sigla, fasce = n.fasce, ordine = n.ordine
    from (select id, row_number() over (order by ordine) rn from public.aree where centro_id = b) c
    join (values
      (1, 'Scuola Tennis', 'SCT', array['U8','U10','U12','U14','U16'], 1),
      (2, 'Scuola Tennis Adulti', 'SAD', array['Adulti'], 2),
      (3, 'Agonismo Junior', 'AGJ', array['U12','U14','U16','U18'], 3),
      (4, 'Agonismo Adulti', 'AGA', array['Agonisti'], 4),
      (5, 'Tennis Academy', 'ACA', array['U14','U16','U18'], 5)
    ) n(rn, nome, sigla, fasce, ordine) on n.rn = c.rn
    where a.id = c.id;
  end if;
  insert into public.aree (centro_id, nome, sigla, fasce, ordine)
  select b, x.nome, x.sigla, '{}'::text[], x.ordine
  from (values ('Lezioni private', 'PRI', 6), ('One Shot', 'ONE', 7)) x(nome, sigla, ordine)
  where not exists (select 1 from public.aree a where a.centro_id = b and a.nome = x.nome);
  -- le aree nuove usano i permessi predefiniti del centro
  insert into public.permessi_ruolo (centro_id, area_id, permessi)
  select b, a.id, (select p.permessi from public.permessi_ruolo p where p.centro_id = b and p.area_id is null limit 1)
  from public.aree a
  where a.centro_id = b and not exists (select 1 from public.permessi_ruolo p where p.centro_id = b and p.area_id = a.id)
    and exists (select 1 from public.permessi_ruolo p where p.centro_id = b and p.area_id is null);

  -- impostazioni: indirizzo reale ed eventi reali del Quanta Junior Tour (categorie Red, Orange, Green, Yellow).
  -- La clonazione ha riportato le impostazioni del modello, quindi si aggiungono qui (merge, ripetibile).
  update public.centri set impostazioni = impostazioni || jsonb_build_object(
    'indirizzo', 'Via Assietta 19, 20161 Milano',
    'eventi', jsonb_build_array(
      jsonb_build_object('tipo', 'torneo', 'data', '2026-11-14', 'titolo', 'Quanta Junior Tour', 'categorie', jsonb_build_array('Red','Orange','Green','Yellow')),
      jsonb_build_object('tipo', 'torneo', 'data', '2026-12-19', 'titolo', 'Quanta Junior Tour', 'categorie', jsonb_build_array('Red','Orange','Green','Yellow')),
      jsonb_build_object('tipo', 'torneo', 'data', '2027-02-06', 'titolo', 'Quanta Junior Tour', 'categorie', jsonb_build_array('Red','Orange','Green','Yellow')),
      jsonb_build_object('tipo', 'torneo', 'data', '2027-03-20', 'titolo', 'Quanta Junior Tour', 'categorie', jsonb_build_array('Red','Orange','Green','Yellow')),
      jsonb_build_object('tipo', 'torneo', 'data', '2027-06-05', 'titolo', 'Quanta Junior Tour', 'categorie', jsonb_build_array('Red','Orange','Green','Yellow'))))
  where id = b;

  -- 17 campi da tennis: 1-6 terra rossa, 7-11 clay tech, 12-17 play it. Il check della superficie ammette 'terra' e 'sintetico',
  -- quindi clay tech e play it si distinguono dal nome e dalle note. Copertura non pubblicata: ipotesi da confermare con il club.
  -- Mappa: tre file (terra rossa, clay tech, play it) su una griglia 0-100.
  insert into public.campi (centro_id, numero, nome, superficie, copertura, luci, stato, note, x, y, w, h)
  select b, n,
    'Campo ' || n || ' · ' || case when n <= 6 then 'Terra rossa' when n <= 11 then 'Clay tech' else 'Play it' end,
    case when n <= 11 then 'terra' else 'sintetico' end,
    case when n <= 6 then 'scoperto' when n <= 11 then 'pallone' else 'coperto' end,
    true, 'disponibile',
    case when n <= 6 then 'Terra rossa' when n <= 11 then 'Clay tech' else 'Play it' end || ' · copertura da confermare con il club',
    case when n <= 6 then 2 + (n - 1) * 16 when n <= 11 then 10 + (n - 7) * 16 else 2 + (n - 12) * 16 end,
    case when n <= 6 then 3 when n <= 11 then 36 else 69 end,
    14, 28
  from generate_series(1, 17) n
  on conflict (centro_id, numero) do nothing;

  -- corsi reali, senza prezzi (quota_cent NULL): li inserisce il club
  insert into public.corsi (centro_id, nome, gruppo_id, quota_cent)
  select b, c.nome, null, null
  from (values ('Scuola Tennis'), ('Scuola Tennis Adulti'), ('Agonismo Junior'), ('Agonismo Adulti'), ('Pre-Academy Junior'),
               ('Pre-TAcademy'), ('Academy'), ('Lezioni private'), ('One Shot')) c(nome)
  where not exists (select 1 from public.corsi x where x.centro_id = b and x.nome = c.nome);

  -- ---- staff ----
  -- admin: titolare e DT, così possono "vedere come"
  insert into public.membri (centro_id, user_id, ruolo, nome, cognome, email, telefono, stato)
  select b, p.id, r.ruolo::public.ruolo_centro, coalesce(nullif(p.nome, ''), 'Admin'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, ''), 'attivo'
  from public.profiles p cross join (values ('titolare'), ('dt')) r(ruolo)
  where p.ruolo = 'admin'
    and not exists (select 1 from public.membri m where m.centro_id = b and m.user_id = p.id and m.ruolo = r.ruolo::public.ruolo_centro);

  -- direttori tecnici indicati dal cliente
  insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
  select b, 'dt'::public.ruolo_centro, d.nome, d.cognome, lower(d.nome || '.' || d.cognome) || '@quanta-demo.example', 'attivo'
  from (values ('Marco', 'Brigo'), ('Fabio', 'Chiappini')) d(nome, cognome)
  where not exists (select 1 from public.membri m where m.centro_id = b and m.ruolo = 'dt' and m.user_id is null and m.nome = d.nome and m.cognome = d.cognome);

  -- 12 maestri (i nomi di fantasia tranne Alan Fiordelmonte e Marco Campanella, indicati dal cliente, responsabili dell'area Adulti)
  create temp table if not exists _qm (idx int, nome text, cognome text);
  insert into _qm select * from (values
    (1, 'Andrea', 'Vallarino'), (2, 'Silvia', 'Montecresto'), (3, 'Alan', 'Fiordelmonte'), (4, 'Chiara', 'Belcorvo'),
    (5, 'Davide', 'Torresani'), (6, 'Marco', 'Campanella'), (7, 'Elena', 'Rovescalli'), (8, 'Paolo', 'Sandrelli'),
    (9, 'Giulia', 'Ferranova'), (10, 'Stefano', 'Laurenzi'), (11, 'Irene', 'Caldarola'), (12, 'Luca', 'Dorigatti')) v(idx, nome, cognome)
  where not exists (select 1 from _qm);
  insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
  select b, 'maestro'::public.ruolo_centro, q.nome, q.cognome, lower(q.nome || '.' || q.cognome) || '@quanta-demo.example', 'attivo'
  from _qm q
  where not exists (select 1 from public.membri m where m.centro_id = b and m.ruolo = 'maestro' and m.nome = q.nome and m.cognome = q.cognome);

  -- responsabili d'area: due per area dove serve (Academy e Agonismo Junior, Scuola Tennis); gli Adulti sono Alan e Marco Campanella
  insert into public.membri (centro_id, ruolo, nome, cognome, email, area_id, stato)
  select b, 'responsabile_area'::public.ruolo_centro, q.nome, q.cognome, lower(q.nome || '.' || q.cognome) || '@quanta-demo.example',
         (select a.id from public.aree a where a.centro_id = b and a.nome = r.area), 'attivo'
  from (values (1, 'Scuola Tennis'), (2, 'Scuola Tennis'), (3, 'Scuola Tennis Adulti'), (6, 'Scuola Tennis Adulti'),
               (4, 'Agonismo Junior'), (5, 'Agonismo Junior'), (3, 'Agonismo Adulti'), (6, 'Agonismo Adulti'),
               (7, 'Tennis Academy'), (8, 'Tennis Academy')) r(idx, area)
  join _qm q on q.idx = r.idx
  where not exists (select 1 from public.membri m where m.centro_id = b and m.ruolo = 'responsabile_area' and m.nome = q.nome and m.cognome = q.cognome
                      and m.area_id is not distinct from (select a.id from public.aree a where a.centro_id = b and a.nome = r.area));

  insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
  select b, 'segreteria'::public.ruolo_centro, 'Federica', 'Marchesani', 'federica.marchesani@quanta-demo.example', 'attivo'
  where not exists (select 1 from public.membri m where m.centro_id = b and m.ruolo = 'segreteria');

  -- ---- gruppi: 30, coerenti con le aree e gli orari ----
  -- ord, nome, area, fascia, livello, giorni (1 = lun), ora, minuti, campo, maestro principale (idx), secondo maestro, n allievi, anni di nascita da-a, programma annuale
  create temp table if not exists _qg (ord int, nome text, area text, fascia text, livello text, giorni int[], ora text, durata int, campo int,
                         m1 int, m2 int, n int, a0 int, a1 int, prog text);
  insert into _qg select * from (values
    -- Scuola Tennis (4-16 anni): gruppi omogenei, sessioni da 80 minuti con preparazione atletica, pomeriggio 16:30-19:30 e sabato mattina
    (1,  'Mini 4-7 · Lun-Mer',       'Scuola Tennis', 'U8',  'Mini',       array[1,3], '16:30', 80, 12, 1, null, 12, 2019, 2022, 'U10'),
    (2,  'Mini 4-7 · Mar-Gio',       'Scuola Tennis', 'U8',  'Mini',       array[2,4], '16:30', 80, 12, 1, null, 12, 2019, 2022, 'U10'),
    (3,  'Mini 4-7 · Sabato',        'Scuola Tennis', 'U8',  'Mini',       array[6],   '09:30', 80, 12, 1, null, 12, 2019, 2022, 'U10'),
    (4,  'Base · Lun-Mer',           'Scuola Tennis', 'U10', 'Base',       array[1,3], '17:50', 80, 12, 2, null, 12, 2016, 2018, 'U10'),
    (5,  'Base · Mar-Gio',           'Scuola Tennis', 'U10', 'Base',       array[2,4], '17:50', 80, 12, 2, null, 12, 2016, 2018, 'U10'),
    (6,  'Base · Sabato',            'Scuola Tennis', 'U10', 'Base',       array[6],   '10:50', 80, 12, 2, null, 12, 2016, 2018, 'U10'),
    (7,  'Intermedio · Lun-Mer',     'Scuola Tennis', 'U12', 'Intermedio', array[1,3], '16:30', 80, 13, 9, null, 12, 2014, 2015, 'U12'),
    (8,  'Intermedio · Mar-Gio',     'Scuola Tennis', 'U12', 'Intermedio', array[2,4], '16:30', 80, 13, 9, null, 12, 2014, 2015, 'U12'),
    (9,  'Intermedio · Venerdì',     'Scuola Tennis', 'U12', 'Intermedio', array[5],   '16:30', 80, 13, 9, null, 12, 2014, 2015, 'U12'),
    (10, 'Avanzato · Lun-Mer',       'Scuola Tennis', 'U14', 'Avanzato',   array[1,3], '17:50', 80, 13, 10, null, 12, 2012, 2013, 'U14'),
    (11, 'Avanzato · Mar-Gio',       'Scuola Tennis', 'U14', 'Avanzato',   array[2,4], '17:50', 80, 13, 10, null, 12, 2012, 2013, 'U14'),
    -- Scuola Tennis Adulti (oltre 16 anni): sessioni da 90 minuti, sera 19:30-22:00
    (12, 'Adulti principianti · Lun-Mer', 'Scuola Tennis Adulti', 'Adulti', 'Principianti', array[1,3], '19:30', 90, 14, 3, null, 12, 1975, 2000, null),
    (13, 'Adulti principianti · Mar-Gio', 'Scuola Tennis Adulti', 'Adulti', 'Principianti', array[2,4], '19:30', 90, 14, 3, null, 12, 1975, 2000, null),
    (14, 'Adulti intermedi · Lun-Mer',    'Scuola Tennis Adulti', 'Adulti', 'Intermedi',    array[1,3], '20:30', 90, 14, 6, null, 12, 1975, 2000, null),
    (15, 'Adulti intermedi · Mar-Gio',    'Scuola Tennis Adulti', 'Adulti', 'Intermedi',    array[2,4], '20:30', 90, 14, 6, null, 12, 1975, 2000, null),
    (16, 'Adulti avanzati · Venerdì',     'Scuola Tennis Adulti', 'Adulti', 'Avanzati',     array[5],   '19:30', 90, 14, 6, null, 12, 1975, 2000, null),
    -- Agonismo Junior (10-18 anni): 90 minuti di campo + 90 di atletica, 2-4 volte a settimana, 17:00-20:00
    (17, 'Agonismo Junior U12', 'Agonismo Junior', 'U12', 'Agonismo · campo 90 + atletica 90', array[1,3,5], '17:00', 90, 1, 4, 5, 12, 2014, 2015, 'U12'),
    (18, 'Agonismo Junior U14', 'Agonismo Junior', 'U14', 'Agonismo · campo 90 + atletica 90', array[1,3,5], '18:30', 90, 1, 4, 5, 12, 2012, 2013, 'U14'),
    (19, 'Agonismo Junior U16', 'Agonismo Junior', 'U16', 'Agonismo · campo 90 + atletica 90', array[2,4],   '17:00', 90, 2, 5, 4, 12, 2010, 2011, 'U14'),
    (20, 'Agonismo Junior U18', 'Agonismo Junior', 'U18', 'Agonismo · campo 90 + atletica 90', array[2,4],   '18:30', 90, 2, 5, 4, 12, 2008, 2009, 'U14'),
    -- Agonismo Adulti (over 18): 120 minuti di campo + 60 di atletica
    (21, 'Agonismo Adulti · Lun-Mer', 'Agonismo Adulti', 'Agonisti', 'Agonismo · campo 120 + atletica 60', array[1,3], '17:00', 120, 3, 3, null, 8, 1980, 2002, null),
    (22, 'Agonismo Adulti · Mar-Gio', 'Agonismo Adulti', 'Agonisti', 'Agonismo · campo 120 + atletica 60', array[2,4], '17:00', 120, 3, 6, null, 8, 1980, 2002, null),
    -- Tennis Academy: Pre-Academy Junior (nati 2012-2014, lun-ven dalle 14:30), Pre-TAcademy (12-18 anni, 2ª e 3ª categoria), Academy
    (23, 'Pre-Academy Junior A', 'Tennis Academy', 'U14', 'Pre-Academy Junior', array[1,2,3,4,5], '14:30', 90, 4, 7, null, 10, 2012, 2014, 'U14'),
    (24, 'Pre-Academy Junior B', 'Tennis Academy', 'U14', 'Pre-Academy Junior', array[1,2,3,4,5], '16:00', 90, 4, 7, null, 10, 2012, 2014, 'U14'),
    (25, 'Pre-TAcademy · 3ª categoria', 'Tennis Academy', 'U16', 'Pre-TAcademy', array[1,2,3,4,5], '14:30', 90, 5, 8, null, 9, 2010, 2013, 'U14'),
    (26, 'Pre-TAcademy · 2ª categoria', 'Tennis Academy', 'U18', 'Pre-TAcademy', array[1,3,5],     '16:00', 90, 5, 8, null, 9, 2008, 2011, 'U14'),
    (27, 'Academy A', 'Tennis Academy', 'U18', 'Academy', array[1,2,3,4,5], '14:30', 90, 6, 12, null, 8, 2007, 2010, 'U14'),
    (28, 'Academy B', 'Tennis Academy', 'U18', 'Academy', array[1,2,3,4,5], '16:00', 90, 6, 12, null, 8, 2007, 2010, 'U14'),
    -- Lezioni private e One Shot (gruppi da 3-4 persone, 60 minuti)
    (29, 'Lezioni private', 'Lezioni private', 'Tutte', 'Individuale',        array[1,2,3,4,5], '15:00', 60, 7, 10, null, 8, 1990, 2012, null),
    (30, 'One Shot',        'One Shot',         'Tutte', 'Gruppi da 3-4 persone', array[3,6],       '11:00', 60, 8, 11, null, 4, 1985, 2010, null)
  ) v(ord, nome, area, fascia, livello, giorni, ora, durata, campo, m1, m2, n, a0, a1, prog)
  where not exists (select 1 from _qg);

  insert into public.gruppi (centro_id, area_id, nome, fascia, livello, giorni, ora, durata_min, campo_id, programma_id, attivo)
  select b, (select a.id from public.aree a where a.centro_id = b and a.nome = g.area), g.nome, g.fascia, g.livello, g.giorni, g.ora::time, g.durata,
         (select k.id from public.campi k where k.centro_id = b and k.numero = g.campo),
         -- il programma annuale è quello clonato dal modello, assegnato ai gruppi junior
         (select p.id from public.programmi p where p.centro_id = b and p.nome = 'Programma annuale 2026 · ' || g.prog), true
  from _qg g
  where not exists (select 1 from public.gruppi x where x.centro_id = b and x.nome = g.nome);

  insert into public.gruppi_maestri (centro_id, gruppo_id, membro_id, principale)
  select b, gr.id, m.id, x.p
  from _qg g
  join public.gruppi gr on gr.centro_id = b and gr.nome = g.nome
  cross join lateral (values (g.m1, true), (g.m2, false)) x(idx, p)
  join _qm q on q.idx = x.idx
  join public.membri m on m.centro_id = b and m.ruolo = 'maestro' and m.nome = q.nome and m.cognome = q.cognome
  where not exists (select 1 from public.gruppi_maestri y where y.gruppo_id = gr.id and y.membro_id = m.id);

  -- ---- allievi (322), famiglie, iscrizioni, consensi: solo alla prima esecuzione ----
  if not exists (select 1 from public.allievi where centro_id = b) then
    create temp table if not exists _qa (id uuid default gen_random_uuid(), k int, gnome text, a0 int, a1 int, nome text, cognome text,
                           nascita date, adulto boolean, sib boolean, fam int);
    insert into _qa (k, gnome, a0, a1, nome, cognome, nascita, sib, fam)
    select t.k, t.gnome, t.a0, t.a1,
           v_nomi[1 + t.k % cardinality(v_nomi)], v_cogn[1 + t.k % cardinality(v_cogn)],
           make_date(t.a0 + t.k % (t.a1 - t.a0 + 1), 1 + (t.k * 5) % 12, 1 + (t.k * 11) % 28),
           -- ogni 11° allievo junior è fratello del precedente: stessa famiglia e stesso cognome
           (t.k % 11 = 0 and t.a0 >= 2010 and coalesce(t.pa0, 0) >= 2010), t.k
    from (select h.nome gnome, h.a0, h.a1, h.pos + i k, lag(h.a0) over (order by h.ord, i) pa0
          from (select g.*, sum(g.n) over (order by g.ord) - g.n pos from _qg g) h
          cross join lateral generate_series(1, h.n) i) t;
    update _qa x set cognome = y.cognome, fam = y.k from _qa y where x.sib and y.k = x.k - 1;
    update _qa set adulto = nascita < date '2008-01-01' where k > 0;

    insert into public.allievi (id, centro_id, nome, cognome, data_nascita, certificato_scade)
    select id, b, nome, cognome, nascita,
           -- circa il 10% ha il certificato scaduto e il 5% manca: serve a provare il filtro "certificato"
           case when k % 19 = 0 then null else date '2026-11-16' + (((k * 37) % 420) - 45) end
    from _qa;

    -- un genitore per famiglia (i fratelli condividono il genitore), senza account
    insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
    select b, 'genitore'::public.ruolo_centro, v_nomi[1 + (f.k * 3 + 7) % cardinality(v_nomi)], f.cognome,
           'famiglia.' || f.k || '@quanta-demo.example', 'attivo'
    from _qa f where not f.adulto and not f.sib;
    -- gli adulti usano un account proprio
    insert into public.membri (centro_id, ruolo, nome, cognome, email, stato)
    select b, 'allievo'::public.ruolo_centro, q.nome, q.cognome, 'allievo.' || q.k || '@quanta-demo.example', 'attivo'
    from _qa q where q.adulto;
    update public.allievi a set membro_id = m.id
    from _qa q join public.membri m on m.centro_id = b and m.email = 'allievo.' || q.k || '@quanta-demo.example'
    where a.id = q.id and q.adulto;

    insert into public.allievi_famiglie (centro_id, allievo_id, membro_id, relazione)
    select b, q.id, m.id, case when q.fam % 2 = 0 then 'mamma' else 'papà' end
    from _qa q join public.membri m on m.centro_id = b and m.email = 'famiglia.' || q.fam || '@quanta-demo.example'
    where not q.adulto;

    -- iscrizioni: stagione dal 14/09; qualche nuovo iscritto di ottobre (conta nei "nuovi ultimi 30 giorni")
    insert into public.iscrizioni (centro_id, allievo_id, gruppo_id, dal)
    select b, q.id, gr.id, case when q.k % 23 = 0 then date '2026-10-20' else date '2026-09-14' end
    from _qa q join public.gruppi gr on gr.centro_id = b and gr.nome = q.gnome;

    -- consensi: tre tipi per allievo, in parte firmati dal genitore (o dall'allievo adulto)
    insert into public.consensi (centro_id, allievo_id, tipo, valore, firmato_da, firmato_il)
    select b, a.id, t.tipo, v.firmato,
           case when v.firmato then coalesce((select f.membro_id from public.allievi_famiglie f where f.allievo_id = a.id order by f.created_at limit 1), a.membro_id) end,
           case when v.firmato then date '2026-09-10' + (abs(hashtext(a.id::text)) % 20) * interval '1 day' + time '18:00' end
    from public.allievi a
    cross join (values ('privacy', 88), ('foto_video', 50), ('ai', 25)) t(tipo, pct)
    cross join lateral (select abs(hashtext(a.id::text || t.tipo)) % 100 < t.pct as firmato) v
    where a.centro_id = b
    on conflict (allievo_id, tipo) do nothing;
  end if;
end
$seed$;

-- ============ B. Lezioni (6 settimane chiuse + 2 programmate), presenze, assenze, valutazioni, note private ============
do $seed$
declare b uuid := (select id from public.centri where slug = 'quanta-club');
begin
  -- lezioni: ogni gruppo nei suoi giorni, con il modello giusto per fascia e il piano copiato dal modello
  insert into public.lezioni (centro_id, gruppo_id, data, ora, campo_id, maestro_id, modello_id, piano, stato)
  select b, g.id, d::date, g.ora, g.campo_id, gm.membro_id, mo.id, mo.blocchi,
         case when d::date < date '2026-11-16' then 'chiusa' else 'programmata' end
  from public.gruppi g
  cross join generate_series(date '2026-10-05', date '2026-11-29', interval '1 day') d
  join public.gruppi_maestri gm on gm.gruppo_id = g.id and gm.principale
  join public.modelli_lezione mo on mo.centro_id = b and mo.nome = case g.fascia
      when 'U8' then 'Giochi e mini-partite' when 'U10' then 'Tecnica + gioco' when 'U12' then 'Multicolpo a quarti'
      when 'Tutte' then 'Un colpo a fondo' else 'Multicolpo 90 minuti' end
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
  where l.centro_id = b and l.stato = 'chiusa' and jsonb_array_length(l.svolto) = 0 and jsonb_array_length(l.piano) > 0;

  -- motivo dello scostamento: oggetto indice del blocco → motivo (solo per i blocchi bloccati non fatti)
  update public.lezioni l set motivi_scostamento = (
    select jsonb_object_agg(s ->> 'indice', 'Campo bagnato: scambi accorciati')
    from jsonb_array_elements(l.svolto) s where not (s ->> 'fatto')::boolean)
  where l.centro_id = b and l.stato = 'chiusa' and l.motivi_scostamento = '{}'::jsonb
    and exists (select 1 from jsonb_array_elements(l.svolto) s where not (s ->> 'fatto')::boolean);

  -- riassunto per le famiglie (gli ultimi giorni restano da approvare)
  update public.lezioni l set
    riassunto = 'Oggi abbiamo lavorato su ' || coalesce((select string_agg(distinct lower(x ->> 'colpo'), ', ') from jsonb_array_elements(l.piano) x where x ->> 'colpo' <> ''), 'gioco e coordinazione')
                || case abs(hashtext(l.id::text)) % 3
                     when 0 then '. Bella energia del gruppo e tanta voglia di migliorare.'
                     when 1 then '. Buona attenzione sui dettagli tecnici: si vede il lavoro delle ultime settimane.'
                     else '. Ottima partecipazione, qualche palla in più nel campo rispetto alla scorsa lezione.' end,
    riassunto_ok = l.data < date '2026-11-12'
  from public.gruppi g
  where g.id = l.gruppo_id and l.centro_id = b and l.stato = 'chiusa' and g.fascia not in ('Adulti', 'Agonisti') and l.riassunto is null;

  -- compito della settimana (prima lezione della settimana) per i gruppi della Scuola Tennis
  update public.lezioni l set compito = (array['Dritto: 20 palleggi al muro con la racchetta', 'Rovescio a due mani: 15 colpi contro il muro',
      'Servizio: 10 lanci di palla da fermo davanti allo specchio', 'Dritto: 3 serie da 10 colpi al muro'])[1 + extract(week from l.data)::int % 4]
  from public.gruppi g
  where g.id = l.gruppo_id and l.centro_id = b and l.data >= date '2026-10-12'
    and g.fascia in ('U8', 'U10', 'U12', 'U14') and extract(isodow from l.data)::int = g.giorni[1] and l.compito is null;

  -- presenze delle lezioni chiuse: circa il 90% presenti; il voto rapido (1-3) migliora con le settimane
  insert into public.presenze (centro_id, lezione_id, allievo_id, presente, voto_rapido)
  select b, l.id, i.allievo_id, p.presente,
         case when p.presente then 1 + case when v.h < 15 - (l.data - date '2026-10-05') / 4 then 0 when v.h < 60 - (l.data - date '2026-10-05') / 3 then 1 else 2 end end
  from public.lezioni l
  join public.iscrizioni i on i.gruppo_id = l.gruppo_id and i.dal <= l.data
  cross join lateral (select abs(hashtext(l.id::text || i.allievo_id::text)) % 100 as h) hp
  cross join lateral (select abs(hashtext(i.allievo_id::text || l.data::text || 'v')) % 100 as h) v
  cross join lateral (select hp.h >= 10 as presente) p
  where l.centro_id = b and l.stato = 'chiusa'
  on conflict (lezione_id, allievo_id) do nothing;

  -- assenze comunicate: il 40% di quelle passate, più qualche assenza già avvisata per le prossime due settimane
  insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da)
  select b, p.allievo_id, l.data, l.gruppo_id, m.motivo,
         case m.motivo when 'malato' then 'Febbre, torna appena sta meglio.' when 'scuola' then 'Impegno scolastico nel pomeriggio.'
                       when 'viaggio' then 'Fuori città per il fine settimana.' else 'Impegno familiare.' end,
         (select f.membro_id from public.allievi_famiglie f where f.allievo_id = p.allievo_id order by f.created_at limit 1)
  from public.presenze p
  join public.lezioni l on l.id = p.lezione_id
  cross join lateral (select (array['malato', 'scuola', 'viaggio', 'altro'])[1 + abs(hashtext(p.id::text)) % 4] as motivo) m
  where p.centro_id = b and not p.presente and abs(hashtext(p.id::text || 'a')) % 100 < 40
    and not exists (select 1 from public.assenze x where x.allievo_id = p.allievo_id and x.data = l.data);

  insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da)
  select b, i.allievo_id, l.data, l.gruppo_id, m.motivo, 'Avvisata in anticipo dalla famiglia.',
         (select f.membro_id from public.allievi_famiglie f where f.allievo_id = i.allievo_id order by f.created_at limit 1)
  from public.lezioni l
  join public.iscrizioni i on i.gruppo_id = l.gruppo_id
  cross join lateral (select (array['malato', 'scuola', 'viaggio', 'altro'])[1 + abs(hashtext(i.allievo_id::text || l.data::text)) % 4] as motivo) m
  where l.centro_id = b and l.stato = 'programmata' and abs(hashtext(i.allievo_id::text || l.data::text || 'f')) % 100 < 2
    and not exists (select 1 from public.assenze x where x.allievo_id = i.allievo_id and x.data = l.data);

  -- valutazioni dei test: ott-2026 (28/10) e nov-2026 (12/11) su dritto, rovescio e servizio, con le competenze delle linee guida della fascia.
  -- A novembre quasi tutti salgono di un livello.
  insert into public.valutazioni (centro_id, allievo_id, maestro_id, test, colpo, competenza, voto, data)
  select b, a.id, gm.membro_id, t.test, lg.colpo, c.competenza,
         case t.test when 'ott-2026' then v.ott else least(5, v.ott + case when v.salto < 65 then 1 else 0 end) end,
         t.data
  from public.allievi a
  join public.iscrizioni i on i.allievo_id = a.id
  join public.gruppi g on g.id = i.gruppo_id
  join public.gruppi_maestri gm on gm.gruppo_id = g.id and gm.principale
  join public.linee_guida lg on lg.centro_id = b and lg.fascia = g.fascia and lg.colpo in ('Dritto', 'Rovescio', 'Servizio')
  cross join lateral jsonb_array_elements_text(lg.competenze) c(competenza)
  cross join (values ('ott-2026', date '2026-10-28'), ('nov-2026', date '2026-11-12')) t(test, data)
  cross join lateral (select 1 + abs(hashtext(a.id::text || lg.colpo || c.competenza)) % 3 + case when g.fascia in ('U14', 'U16', 'U18') then 1 else 0 end as ott,
                             abs(hashtext(c.competenza || a.id::text || 'su')) % 100 as salto) v
  where a.centro_id = b
  on conflict (allievo_id, test, colpo, competenza) do nothing;

  -- note private dei maestri (mai visibili alle famiglie)
  insert into public.note_private (centro_id, allievo_id, maestro_id, testo)
  select b, a.id, gm.membro_id, (array['Molto motivato: da proteggere dal sovraccarico.', 'Tende a perdere fiducia dopo due errori di fila: lavorare sulla routine tra i punti.',
      'Ottimo servizio, il rovescio è ancora il punto debole.', 'Timido ma attento, risponde bene ai giochi a squadre.'])[1 + abs(hashtext(a.id::text)) % 4]
  from public.allievi a
  join public.iscrizioni i on i.allievo_id = a.id
  join public.gruppi_maestri gm on gm.gruppo_id = i.gruppo_id and gm.principale
  where a.centro_id = b and abs(hashtext(a.id::text || 'np')) % 100 < 4
    and not exists (select 1 from public.note_private x where x.allievo_id = a.id);
end
$seed$;

-- ============ C. Direzione: osservazioni, formazione, conversazioni, avvisi, segnalazioni, notifiche, registro ============
do $seed$
declare
  b uuid := (select id from public.centri where slug = 'quanta-club');
  brigo uuid := (select id from public.membri where centro_id = (select id from public.centri where slug = 'quanta-club') and ruolo = 'dt' and nome = 'Marco' and cognome = 'Brigo');
  chiappini uuid := (select id from public.membri where centro_id = (select id from public.centri where slug = 'quanta-club') and ruolo = 'dt' and nome = 'Fabio' and cognome = 'Chiappini');
  segr uuid := (select id from public.membri where centro_id = (select id from public.centri where slug = 'quanta-club') and ruolo = 'segreteria' limit 1);
  alan uuid := (select id from public.membri where centro_id = (select id from public.centri where slug = 'quanta-club') and ruolo = 'maestro' and nome = 'Alan' and cognome = 'Fiordelmonte');
  campanella uuid := (select id from public.membri where centro_id = (select id from public.centri where slug = 'quanta-club') and ruolo = 'maestro' and nome = 'Marco' and cognome = 'Campanella');
  s1 uuid; s2 uuid;
begin
  -- osservazioni dei due DT su sei maestri (sulla terzultima lezione chiusa di ciascuno)
  insert into public.osservazioni (centro_id, maestro_id, osservatore_id, lezione_id, voti, voto, consigli, nota, created_at)
  select b, m.id, case when q.n % 2 = 0 then brigo else chiappini end, l.id,
         jsonb_build_object('tempi', 3 + q.n % 3, 'correzione', 4 + q.n % 2, 'gruppo', 3 + (q.n + 1) % 3, 'sicurezza', 4 + q.n % 2),
         3 + q.n % 3,
         case q.n % 2 when 0 then array['Dare un obiettivo misurabile a ogni blocco', 'Lasciare più tempo di gioco nell''ultimo blocco']
                      else array['Rispettare i minuti di ogni blocco', 'Preparare il campo prima dell''arrivo dei ragazzi'] end,
         case q.n % 2 when 0 then 'Correzioni chiare e buona gestione del gruppo.' else 'Lezione solida, con qualche tempo allungato nel primo blocco.' end,
         (l.data + 1)::timestamp at time zone 'Europe/Rome'
  from (values (1, 'Andrea', 'Vallarino'), (2, 'Silvia', 'Montecresto'), (3, 'Alan', 'Fiordelmonte'), (4, 'Chiara', 'Belcorvo'),
               (5, 'Elena', 'Rovescalli'), (6, 'Giulia', 'Ferranova')) q(n, nome, cognome)
  join public.membri m on m.centro_id = b and m.ruolo = 'maestro' and m.nome = q.nome and m.cognome = q.cognome
  cross join lateral (select x.id, x.data from public.lezioni x where x.maestro_id = m.id and x.stato = 'chiusa' order by x.data desc offset 2 limit 1) l
  where not exists (select 1 from public.osservazioni o where o.centro_id = b and o.maestro_id = m.id);

  -- formazione: ogni maestro ha fatto una parte dei moduli di ogni corso (certificato solo se completo)
  insert into public.formazione (centro_id, corso_id, membro_id, moduli_fatti, certificato_il, scadenza)
  select b, c.id, m.id, f.fatti,
         case when f.fatti >= c.moduli then date '2026-03-01' + (abs(hashtext(m.id::text || c.id::text)) % 200) end,
         case when f.fatti >= c.moduli then date '2027-03-01' + (abs(hashtext(m.id::text || c.id::text)) % 200) end
  from public.membri m
  cross join public.corsi_formazione c
  cross join lateral (select abs(hashtext(m.id::text || c.id::text)) % (c.moduli + 1) as fatti) f
  where m.centro_id = b and m.ruolo = 'maestro' and c.centro_id = b
    and not exists (select 1 from public.formazione x where x.corso_id = c.id and x.membro_id = m.id);

  -- conversazioni famiglia-maestro (circa il 4% degli allievi), messaggi immutabili: si inseriscono una volta sola
  create temp table if not exists _qc (cid uuid default gen_random_uuid(), allievo uuid, genitore uuid, maestro uuid, an text, titolo text);
  insert into _qc (allievo, genitore, maestro, an, titolo)
  select a.id, f.membro_id, gm.membro_id, a.nome, 'Famiglia ' || a.cognome || ' (' || a.nome || ') · ' || m.nome
  from public.allievi a
  join public.allievi_famiglie f on f.allievo_id = a.id
  join public.iscrizioni i on i.allievo_id = a.id
  join public.gruppi_maestri gm on gm.gruppo_id = i.gruppo_id and gm.principale
  join public.membri m on m.id = gm.membro_id
  where a.centro_id = b and abs(hashtext(a.id::text || 'conv')) % 100 < 4
    and not exists (select 1 from public.conversazioni c where c.centro_id = b and c.allievo_id = a.id and c.tipo = 'famiglia_maestro');

  insert into public.conversazioni (id, centro_id, tipo, allievo_id, titolo, creata_da, created_at)
  select cid, b, 'famiglia_maestro', allievo, titolo, genitore, timestamptz '2026-11-09 17:00+01' from _qc
  on conflict (id) do nothing;
  insert into public.partecipanti (centro_id, conversazione_id, membro_id, sola_lettura)
  select b, q.cid, x.membro, false from _qc q cross join lateral (values (q.genitore), (q.maestro)) x(membro)
  where not exists (select 1 from public.partecipanti p where p.conversazione_id = q.cid and p.membro_id = x.membro);
  -- h=0: la famiglia scrive e nessuno risponde; h=1: risposta del maestro; h=2: scambio completo; h=3: risposta del maestro
  insert into public.messaggi (centro_id, conversazione_id, autore_id, testo, consegna_il, created_at)
  select b, q.cid, case s.n when 2 then q.maestro else q.genitore end,
         case s.n
           when 1 then case abs(hashtext(q.cid::text)) % 3
                         when 0 then 'Buonasera, ' || q.an || ' può portare un amico alla prossima lezione di prova?'
                         when 1 then 'Buongiorno, ' || q.an || ' ha chiesto se può recuperare la lezione persa la settimana scorsa.'
                         else 'Buonasera, a che ora finisce domani la lezione di ' || q.an || '? Devo organizzare il ritiro.' end
           when 2 then 'Buonasera, certo: basta avvisare la segreteria prima dell''inizio della lezione.'
           else 'Perfetto, grazie mille!' end,
         ts.t, ts.t
  from _qc q
  cross join (values (1), (2), (3)) s(n)
  cross join lateral (select abs(hashtext(q.cid::text)) % 4 as h) hh
  cross join lateral (select timestamptz '2026-11-09 17:30+01' + (abs(hashtext(q.cid::text)) % 5) * interval '1 day' + (s.n - 1) * interval '35 minutes' as t) ts
  where (s.n = 1 or (s.n = 2 and hh.h <> 0) or (s.n = 3 and hh.h = 2))
    and not exists (select 1 from public.messaggi x where x.conversazione_id = q.cid);

  -- due conversazioni famiglia-segreteria e una chat dello staff
  insert into public.conversazioni (centro_id, tipo, allievo_id, titolo, creata_da, created_at)
  select b, 'famiglia_segreteria', q.allievo, 'Famiglia ' || a.cognome || ' · Segreteria', q.genitore, timestamptz '2026-11-12 10:00+01'
  from (select * from _qc order by cid limit 2) q join public.allievi a on a.id = q.allievo
  where not exists (select 1 from public.conversazioni c where c.centro_id = b and c.tipo = 'famiglia_segreteria' and c.allievo_id = q.allievo);
  insert into public.conversazioni (centro_id, tipo, titolo, creata_da, created_at)
  select b, 'staff', 'Coordinamento staff', brigo, timestamptz '2026-11-10 09:00+01'
  where not exists (select 1 from public.conversazioni c where c.centro_id = b and c.tipo = 'staff');

  insert into public.partecipanti (centro_id, conversazione_id, membro_id, sola_lettura)
  select b, c.id, x.membro, false
  from public.conversazioni c
  join public.allievi_famiglie f on f.allievo_id = c.allievo_id
  cross join lateral (values (f.membro_id), (segr)) x(membro)
  where c.centro_id = b and c.tipo = 'famiglia_segreteria'
    and not exists (select 1 from public.partecipanti p where p.conversazione_id = c.id and p.membro_id = x.membro);
  insert into public.partecipanti (centro_id, conversazione_id, membro_id, sola_lettura)
  select b, c.id, x.membro, false
  from public.conversazioni c cross join lateral (values (brigo), (chiappini), (alan), (campanella)) x(membro)
  where c.centro_id = b and c.tipo = 'staff'
    and not exists (select 1 from public.partecipanti p where p.conversazione_id = c.id and p.membro_id = x.membro);

  insert into public.messaggi (centro_id, conversazione_id, autore_id, testo, consegna_il, created_at)
  select b, c.id, case s.n when 1 then f.membro_id else segr end,
         case s.n when 1 then 'Buongiorno, vorrei sapere come funziona l''iscrizione al Quanta Junior Tour.'
                  else 'Buongiorno, le inviamo i dettagli non appena sono disponibili nel calendario del club.' end,
         timestamptz '2026-11-12 10:00+01' + (s.n - 1) * interval '30 minutes', timestamptz '2026-11-12 10:00+01' + (s.n - 1) * interval '30 minutes'
  from public.conversazioni c
  join public.allievi_famiglie f on f.allievo_id = c.allievo_id
  cross join (values (1), (2)) s(n)
  where c.centro_id = b and c.tipo = 'famiglia_segreteria'
    and not exists (select 1 from public.messaggi x where x.conversazione_id = c.id);
  insert into public.messaggi (centro_id, conversazione_id, autore_id, testo, consegna_il, created_at)
  select b, c.id, s.autore, s.testo, s.t, s.t
  from public.conversazioni c
  cross join (values
    (brigo, 'Giovedì riunione di coordinamento sul calendario del Quanta Junior Tour: servono i campi 12-17 sabato mattina.', timestamptz '2026-11-10 09:05+01'),
    (alan, 'Per gli Adulti la sera confermo i campi play it: nessun cambio.', timestamptz '2026-11-10 09:40+01'),
    (chiappini, 'Perfetto, ne parliamo giovedì.', timestamptz '2026-11-10 10:00+01')) s(autore, testo, t)
  where c.centro_id = b and c.tipo = 'staff' and not exists (select 1 from public.messaggi x where x.conversazione_id = c.id);

  -- notifiche dei messaggi: quelli più vecchi di due giorni sono già letti
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, letta_il, consegna_il, rif_id, created_at)
  select b, p.membro_id, 'messaggio', public._nome_membro(ms.autore_id), left(ms.testo, 140), '/c/quanta-club/chat/' || cv.id,
         public._nome_membro(ms.autore_id), case when ms.created_at < timestamptz '2026-11-14 00:00+01' then ms.created_at + interval '1 hour' end, ms.consegna_il, cv.id, ms.created_at
  from public.conversazioni cv
  join lateral (select * from public.messaggi x where x.conversazione_id = cv.id order by x.created_at desc limit 1) ms on true
  join public.partecipanti p on p.conversazione_id = cv.id and p.membro_id <> ms.autore_id
  where cv.centro_id = b
    and not exists (select 1 from public.notifiche n where n.membro_id = p.membro_id and n.tipo = 'messaggio' and n.rif_id = cv.id);

  -- avvisi del DT con le letture dei destinatari
  insert into public.avvisi (centro_id, autore_id, titolo, testo, destinatari, conferma, promemoria, consegna_il, created_at)
  select b, brigo, a.titolo, a.testo, a.dest, a.conferma, a.promemoria, a.quando, a.quando
  from (values
    ('Quanta Junior Tour · prossima tappa sabato 19 dicembre', 'Sabato 19 dicembre si gioca la tappa del Quanta Junior Tour, categorie Red, Orange, Green e Yellow. Le famiglie sono invitate a confermare la presenza.',
      '{"tipo":"fascia","valori":["U8","U10","U12"]}'::jsonb, true, false, timestamptz '2026-11-12 09:00+01'),
    ('Agonismo e Academy: orari della prossima settimana', 'Nella prossima settimana gli orari di Agonismo Junior e Tennis Academy restano invariati. Per qualsiasi variazione scriviamo qui.',
      jsonb_build_object('tipo', 'area', 'valori', (select coalesce(jsonb_agg(ar.id::text), '[]'::jsonb) from public.aree ar where ar.centro_id = b and ar.nome in ('Agonismo Junior', 'Tennis Academy'))),
      false, false, timestamptz '2026-11-13 10:00+01'),
    ('Segreteria: orari e contatti', 'Ricordiamo che per qualsiasi richiesta amministrativa potete scrivere alla segreteria dall''app, nella sezione Messaggi.',
      '{"tipo":"centro","valori":[]}'::jsonb, false, true, timestamptz '2026-11-14 12:00+01')
  ) a(titolo, testo, dest, conferma, promemoria, quando)
  where not exists (select 1 from public.avvisi x where x.centro_id = b and x.titolo = a.titolo);

  create temp table if not exists _dest (avviso_id uuid, membro_id uuid, quando timestamptz, pct int);
  insert into _dest
  select av.id, t.membro, av.consegna_il, case when av.titolo like 'Quanta%' then 70 when av.titolo like 'Agonismo%' then 85 else 40 end
  from public.avvisi av
  join public.gruppi g on g.centro_id = b and (av.destinatari ->> 'tipo' = 'centro'
       or (av.destinatari ->> 'tipo' = 'fascia' and g.fascia in (select jsonb_array_elements_text(av.destinatari -> 'valori')))
       or (av.destinatari ->> 'tipo' = 'area' and g.area_id::text in (select jsonb_array_elements_text(av.destinatari -> 'valori'))))
  join public.iscrizioni i on i.gruppo_id = g.id
  cross join lateral (select f.membro_id membro from public.allievi_famiglie f where f.allievo_id = i.allievo_id
                      union select a.membro_id from public.allievi a where a.id = i.allievo_id and a.membro_id is not null) t
  where av.centro_id = b and not exists (select 1 from public.avvisi_letture l where l.avviso_id = av.id)
  union
  -- l'avviso a tutto il centro arriva anche ai maestri
  select av.id, m.id, av.consegna_il, 40
  from public.avvisi av join public.membri m on m.centro_id = b and m.ruolo = 'maestro'
  where av.centro_id = b and av.destinatari ->> 'tipo' = 'centro' and not exists (select 1 from public.avvisi_letture l where l.avviso_id = av.id);

  insert into public.avvisi_letture (centro_id, avviso_id, membro_id, letto_il)
  select b, d.avviso_id, d.membro_id, d.quando + (30 + abs(hashtext(d.membro_id::text)) % 3000) * interval '1 minute'
  from _dest d
  where abs(hashtext(d.avviso_id::text || d.membro_id::text)) % 100 < d.pct
  on conflict (avviso_id, membro_id) do nothing;

  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, letta_il, consegna_il, rif_id, created_at)
  select b, d.membro_id, 'avviso', av.titolo, left(av.testo, 140),
         '/c/quanta-club' || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
         'Marco Brigo', l.letto_il, av.consegna_il, av.id, av.consegna_il
  from _dest d
  join public.avvisi av on av.id = d.avviso_id
  join public.membri m on m.id = d.membro_id
  left join public.avvisi_letture l on l.avviso_id = d.avviso_id and l.membro_id = d.membro_id
  where not exists (select 1 from public.notifiche n where n.membro_id = d.membro_id and n.tipo = 'avviso' and n.rif_id = d.avviso_id);

  -- notifica ai maestri per le assenze già avvisate (da oggi in poi)
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id, created_at)
  select b, gm.membro_id, 'assenza', 'Assenza comunicata', a.nome || ' ' || a.cognome || ' · ' || public._data_it(s.data) || ' (' || s.motivo || ')',
         '/c/quanta-club/maestro/notifiche', 'Famiglia ' || a.cognome, s.id, timestamptz '2026-11-16 08:00+01'
  from public.assenze s
  join public.allievi a on a.id = s.allievo_id
  join public.gruppi_maestri gm on gm.gruppo_id = s.gruppo_id and gm.principale
  where s.centro_id = b and s.data >= date '2026-11-16'
    and not exists (select 1 from public.notifiche n where n.rif_id = s.id and n.membro_id = gm.membro_id);

  -- 2 segnalazioni (testi dimostrativi) con note del DT
  insert into public.segnalazioni (centro_id, autore_id, anonima, per_allievo_id, categoria, testo, priorita, stato, riguarda_dt, created_at)
  select b, x.autore, x.anonima, null, x.categoria, x.testo, x.priorita, x.stato, false, x.quando
  from (values
    ((select f.membro_id from public.allievi_famiglie f join public.allievi a on a.id = f.allievo_id where a.centro_id = b order by f.created_at, f.id limit 1),
     false, 'struttura', 'Le righe di uno dei campi play it sono consumate e alla sera si vedono poco: si potrebbero ritracciare?', 'media', 'nuova', timestamptz '2026-11-15 18:10+01'),
    (null::uuid, true, 'comportamento', 'Tra alcuni ragazzi di un gruppo ci sono prese in giro negli spogliatoi: vorrei che se ne occupasse qualcuno con delicatezza.', 'bassa', 'presa', timestamptz '2026-11-09 21:40+01')
  ) x(autore, anonima, categoria, testo, priorita, stato, quando)
  where not exists (select 1 from public.segnalazioni s where s.centro_id = b and s.testo = x.testo);

  select id into s1 from public.segnalazioni where centro_id = b and categoria = 'struttura' order by created_at limit 1;
  select id into s2 from public.segnalazioni where centro_id = b and categoria = 'comportamento' order by created_at limit 1;
  insert into public.segnalazioni_note (centro_id, segnalazione_id, autore_id, testo, created_at)
  select b, n.sid, chiappini, n.testo, n.quando
  from (values (s2, 'Parlato con i maestri del gruppo: incontro sul rispetto in spogliatoio la prossima settimana.', timestamptz '2026-11-10 10:00+01')) n(sid, testo, quando)
  where n.sid is not null and not exists (select 1 from public.segnalazioni_note x where x.segnalazione_id = n.sid and x.testo = n.testo);

  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id, created_at)
  select b, m.id, 'segnalazione', 'Nuova segnalazione', 'Struttura: righe dei campi play it da ritracciare.', '/c/quanta-club/dt/segnalazioni', 'Sistema', s1, timestamptz '2026-11-15 18:10+01'
  from public.membri m
  where m.centro_id = b and m.ruolo in ('dt', 'titolare') and s1 is not null
    and not exists (select 1 from public.notifiche n where n.membro_id = m.id and n.rif_id = s1);

  -- registro delle modifiche (autori: i due DT)
  insert into public.registro (centro_id, membro_id, azione, oggetto, dettagli, created_at)
  select b, x.membro, x.azione, x.oggetto, x.dettagli, x.quando
  from (values
    (brigo, 'sostituzione_blocco', 'Base · Lun-Mer · 05/11', '{"blocco":"Colpo del giorno","da":"Dritto a due palle","a":"Dritto a bersagli"}'::jsonb, timestamptz '2026-11-05 17:20+01'),
    (chiappini, 'modifica_permessi', 'Area Agonismo Junior', '{"permesso":"maestri","da":false,"a":true}'::jsonb, timestamptz '2026-10-02 09:30+01'),
    (brigo, 'modifica_permessi', 'Area Scuola Tennis Adulti', '{"permesso":"campi","da":false,"a":true}'::jsonb, timestamptz '2026-10-03 11:00+01')
  ) x(membro, azione, oggetto, dettagli, quando)
  where not exists (select 1 from public.registro r where r.centro_id = b and r.azione = x.azione and r.oggetto = x.oggetto);
end
$seed$;
