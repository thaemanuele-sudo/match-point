-- 0006a · Seed del centro modello "matchpoint-modello" (non elencato) con il Metodo Match Point completo.
-- Idempotente: ogni inserimento controlla che la riga non esista già.
-- Il centro modello è la sorgente che clona_centro / registra_centro copiano per ogni nuovo centro.

do $seed$
declare
  v uuid;
  v_admin uuid;
begin
  select id into v_admin from public.profiles where ruolo = 'admin' order by creato_il limit 1;

  select id into v from public.centri where slug = 'matchpoint-modello';
  if v is null then
    insert into public.centri (slug, nome, nome_app, citta, colore, colore_ink, stato, piano, elencato, creato_da, impostazioni)
    values ('matchpoint-modello', 'Match Point · Modello', 'Match Point', 'Milano', '#D8F34A', '#0A0A0A', 'attivo', 'modello', false, v_admin,
      '{"silenzio_da":"21:00","silenzio_a":"08:00","chat_genitori_fino":18,"account_ragazzo_da":14,"assenza_entro_ore":2,"conservazione_mesi":24}'::jsonb)
    returning id into v;
  end if;

  -- 5 aree standard con le fasce che servono
  insert into public.aree (centro_id, nome, sigla, fasce, ordine)
  select v, a.nome, a.sigla, a.fasce, a.ordine
  from (values
    ('SAT', 'SAT', array['U8','U10','U12'], 1),
    ('Pre-accademia', 'PRE', array['U12','U14'], 2),
    ('Accademia', 'ACC', array['U14','U16','U18'], 3),
    ('Agonistica', 'AGO', array['U16','U18','Agonisti'], 4),
    ('Adulti', 'ADU', array['Adulti'], 5)
  ) a(nome, sigla, fasce, ordine)
  where not exists (select 1 from public.aree x where x.centro_id = v and x.nome = a.nome);

  -- permessi per ruolo: la riga con area null vale come predefinito, poi una riga per area
  insert into public.permessi_ruolo (centro_id, area_id, permessi)
  select v, null, '{"gruppi":true,"campi":true,"maestri":false,"avvisi":true,"iscrizioni":true,"pagamenti":false,"metodo":"lettura","tutela":false}'::jsonb
  where not exists (select 1 from public.permessi_ruolo p where p.centro_id = v and p.area_id is null);
  insert into public.permessi_ruolo (centro_id, area_id, permessi)
  select v, a.id,
    jsonb_build_object('gruppi', true, 'campi', true, 'maestri', a.nome in ('SAT','Pre-accademia'), 'avvisi', true,
                       'iscrizioni', true, 'pagamenti', a.nome = 'Adulti', 'metodo', 'lettura', 'tutela', false)
  from public.aree a
  where a.centro_id = v and not exists (select 1 from public.permessi_ruolo p where p.centro_id = v and p.area_id = a.id);

  -- campi tipo (modello dei campi di un club)
  insert into public.campi (centro_id, numero, nome, superficie, copertura, luci, stato, x, y, w, h)
  select v, c.numero, c.nome, c.superficie, c.copertura, c.luci, 'disponibile', c.x, c.y, c.w, c.h
  from (values
    (1, 'Campo 1 · Centrale', 'terra', 'pallone', true, 5, 5, 40, 42),
    (2, 'Campo 2', 'terra', 'scoperto', true, 55, 5, 40, 42),
    (3, 'Campo 3', 'cemento', 'coperto', true, 5, 53, 40, 42),
    (4, 'Campo 4 · Mini', 'sintetico', 'scoperto', false, 55, 53, 40, 42)
  ) c(numero, nome, superficie, copertura, luci, x, y, w, h)
  where not exists (select 1 from public.campi k where k.centro_id = v and k.numero = c.numero);

  -- corsi di formazione dei maestri
  insert into public.corsi_formazione (centro_id, titolo, obbligatorio, moduli)
  select v, f.titolo, f.obbligatorio, f.moduli
  from (values
    ('Metodo Match Point · livello 1', true, 6),
    ('Sicurezza e primo soccorso', true, 4),
    ('Tutela dei minori e comportamento in campo', true, 3),
    ('Didattica del mini tennis U8-U10', false, 5),
    ('Preparazione atletica giovanile', false, 4)
  ) f(titolo, obbligatorio, moduli)
  where not exists (select 1 from public.corsi_formazione x where x.centro_id = v and x.titolo = f.titolo);
end
$seed$;

-- Libreria esercizi (fonte matchpoint, approvati)
insert into public.esercizi (centro_id, titolo, colpo, fasce, durata_min, materiale, descrizione, fonte, stato)
select (select id from public.centri where slug = 'matchpoint-modello'), e.titolo, e.colpo, e.fasce, e.durata, e.materiale, e.descrizione, 'matchpoint', 'approvato'
from (values
  ('Dritto in cross da fondo', 'Dritto', array['U10','U12','U14'], 15, 'palline, racchette', 'Scambio di dritto in diagonale: preparazione precoce, impatto davanti, chiusura sopra la spalla.'),
  ('Dritto lungolinea con bersagli', 'Dritto', array['U12','U14','U16'], 15, 'palline, coni', 'Dal centro si gioca il dritto lungolinea su due bersagli, 10 palle per serie.'),
  ('Dritto sul lancio dell''allenatore', 'Dritto', array['U8','U10'], 10, 'palline morbide', 'Il maestro lancia con la mano e il bambino colpisce a metà campo piccolo.'),
  ('Dritto con cambio di direzione', 'Dritto', array['U14','U16','U18'], 15, 'palline, coni', 'Scambio in cross con segnale: al comando si cambia in lungolinea.'),
  ('Dritto a due palle', 'Dritto', array['U10','U12'], 10, 'palline', 'Prepara e colpisci: due palle consecutive per allenare la preparazione veloce.'),
  ('Rovescio in cross a due mani', 'Rovescio', array['U10','U12','U14'], 15, 'palline, racchette', 'Scambio di rovescio in diagonale con rotazione delle spalle prima del rimbalzo.'),
  ('Rovescio lungolinea con bersagli', 'Rovescio', array['U12','U14'], 15, 'palline, coni', 'Rovescio lungolinea su bersagli, con spinta delle gambe.'),
  ('Rovescio sul lancio', 'Rovescio', array['U8','U10'], 10, 'palline morbide', 'Lancio a mano e rovescio a due mani vicino alla rete.'),
  ('Rovescio a una mano: tecnica base', 'Rovescio', array['U14','U16','U18','Adulti'], 15, 'palline, racchette', 'Presa, preparazione e impatto del rovescio a una mano, con palline lente.'),
  ('Servizio ai bersagli', 'Servizio', array['U10','U12','U14'], 15, 'palline, coni', 'Dieci servizi per bersaglio nei due quadrati, con lancio alto e costante.'),
  ('Servizio con lancio costante', 'Servizio', array['U8','U10','U12'], 10, 'palline', 'Lancio della palla e presa al volo, prima del servizio completo.'),
  ('Servizio e risposta a punti', 'Servizio', array['U12','U14','U16'], 15, 'palline', 'Si gioca il punto dal servizio: uno serve, l''altro risponde in diagonale.'),
  ('Servizio dal ginocchio', 'Servizio', array['U8','U10'], 10, 'palline morbide', 'Servizio da inginocchiati per sentire il gesto e l''impatto alto.'),
  ('Risposta in diagonale', 'Risposta', array['U12','U14'], 15, 'palline', 'Risposta corta e controllata sempre in diagonale.'),
  ('Risposta corta sul secondo servizio', 'Risposta', array['U14','U16','U18'], 15, 'palline', 'Posizione avanzata e swing breve sul secondo servizio.'),
  ('Split step e risposta', 'Risposta', array['U10','U12'], 10, 'palline', 'Split step quando parte il servizio e primo passo verso la palla.'),
  ('Volée contro volée', 'Volée', array['U12','U14','U16'], 15, 'palline morbide', 'Scambio a rete a coppie con polso fermo e racchetta davanti al corpo.'),
  ('Volée di diritto e rovescio alternate', 'Volée', array['U10','U12'], 10, 'palline morbide', 'Il maestro alterna i lanci: passo verso la palla e volée corta.'),
  ('Gioco di punti a rete', 'Volée', array['U12','U14','U16','Adulti'], 15, 'palline', 'Uno a rete e uno a fondo: si gioca il punto cercando la chiusura.'),
  ('Smash dopo lob', 'Smash', array['U12','U14','U16'], 10, 'palline', 'Lob dell''allenatore e smash con passo indietro e braccio libero in alto.'),
  ('Smash e recupero', 'Smash', array['U14','U16','U18'], 10, 'palline', 'Dopo lo smash si recupera al centro per la palla successiva.'),
  ('Palleggio libero a 10 colpi', 'Palleggio', array['U8','U10'], 10, 'palline morbide', 'Coppie che contano i colpi consecutivi con palla morbida.'),
  ('Palleggio a coppie in cross', 'Palleggio', array['U10','U12'], 10, 'palline', 'Palleggio in diagonale a metà campo, poi si allarga il campo.'),
  ('Palleggio con punteggio', 'Palleggio', array['U8','U10','U12'], 10, 'palline', 'Ogni serie di colpi consecutivi vale un punto per la coppia.'),
  ('Scala dell''agilità', 'Gioco di gambe', array['U8','U10','U12'], 10, 'scala, coni', 'Passi piccoli e rapidi nella scala, poi un colpo al volo.'),
  ('Split step sulla linea', 'Gioco di gambe', array['U10','U12','U14'], 10, 'palline', 'Split step a tempo con l''avversario e primo passo laterale.'),
  ('Ombra del dritto e del rovescio', 'Gioco di gambe', array['U12','U14','U16'], 10, 'nessuno', 'Colpi senza palla, con spostamenti laterali e recupero al centro.'),
  ('Recupero al centro', 'Gioco di gambe', array['U12','U14','U16','U18'], 10, 'palline, coni', 'Dopo ogni colpo si torna al centro in tre passi.'),
  ('Gioco del punto da fondo', 'Tattica', array['U12','U14','U16','U18','Adulti'], 15, 'palline', 'Punto giocato da fondo: si valuta la scelta del colpo, non solo il risultato.'),
  ('Mini-partita a punti', 'Tattica', array['U8','U10','U12'], 15, 'palline morbide', 'Partita corta nel campo ridotto, il punteggio si conta davvero.'),
  ('Variare altezza e profondità', 'Tattica', array['U14','U16','U18'], 15, 'palline', 'Scambio in cui si alternano colpi alti e profondi con colpi bassi e corti.'),
  ('Circuito coordinazione a stazioni', 'Atletica', array['U8','U10'], 15, 'cerchi, coni, scala', 'Quattro stazioni di coordinazione in forma di gioco.'),
  ('Salti e atterraggi corretti', 'Atletica', array['U10','U12','U14'], 10, 'cerchi', 'Salti a piedi uniti e atterraggio morbido sulle punte.'),
  ('Core e mobilità delle spalle', 'Atletica', array['U14','U16','U18','Adulti'], 10, 'elastici, tappetino', 'Serie brevi di core e rotazioni di spalla, a corpo libero.'),
  ('Staffetta con racchetta e palline', 'Atletica', array['U8','U10','U12'], 10, 'racchette, palline', 'Staffetta a squadre portando la pallina sulla racchetta.'),
  ('Riscaldamento dinamico', 'Atletica', array['U10','U12','U14','U16','U18','Adulti'], 10, 'coni', 'Corsa, skip e rotazioni articolari prima di prendere la racchetta.'),
  ('Caccia al tesoro con le palline', 'Atletica', array['U8'], 10, 'palline, cerchi', 'Gioco di corsa e raccolta delle palline sparse per il campo.')
) e(titolo, colpo, fasce, durata, materiale, descrizione)
where not exists (
  select 1 from public.esercizi x
  where x.centro_id = (select id from public.centri where slug = 'matchpoint-modello') and x.titolo = e.titolo
);

-- Linee guida: 7 fasce per 10 colpi (le basi sono le stesse del Metodo, con piccole varianti per fascia)
insert into public.linee_guida (centro_id, fascia, colpo, competenze, errori, regola, scala, bloccata)
select (select id from public.centri where slug = 'matchpoint-modello'), f.fascia, c.colpo,
  jsonb_build_array(
    case when f.fascia = 'U8' then 'Con palla morbida e rete bassa: ' || lower(left(c.c1, 1)) || substr(c.c1, 2)
         when f.fascia in ('U16','U18') then 'Ad alto ritmo: ' || lower(left(c.c1, 1)) || substr(c.c1, 2)
         else c.c1 end, c.c2, c.c3),
  jsonb_build_array(jsonb_build_object('nome', c.e1, 'tempo', c.t1), jsonb_build_object('nome', c.e2, 'tempo', c.t2)),
  c.regola,
  jsonb_build_object('livelli', jsonb_build_array('Da costruire', 'In crescita', 'Acquisito', 'Solido'),
                     'atteso', f.atteso, 'livello', f.livello, 'stato', 'completa', 'versione', 1,
                     'da', 'Match Point', 'il', '2026-09-01T08:00:00Z'),
  true
from (values
  ('U8', 2, 'Palla rossa, campo piccolo. 3 palle su 5 nel campo da fermo.'),
  ('U10', 3, 'Palla arancio, campo ridotto. 3 palle su 5 nel campo da fermo.'),
  ('U12', 3, 'Palla verde. 4 palle su 5 in cross con palleggio da fondo.'),
  ('U14', 4, 'Palla gialla. 7 palle su 10 profonde, con cambio di direzione.'),
  ('U16', 4, 'Palla gialla. 7 palle su 10 profonde, anche sotto pressione.'),
  ('U18', 4, 'Palla gialla. Costanza ad alto ritmo e scelta della direzione a punteggio.'),
  ('Adulti', 3, 'Palla gialla. Scambio di 8 colpi con controllo della direzione.')
) f(fascia, atteso, livello)
cross join (values
  ('Dritto', 'Preparazione precoce con la racchetta indietro', 'Impatto davanti al corpo, braccio disteso', 'Chiusura del gesto sopra la spalla', 'Apertura tardiva', '0:24', 'Impatto dietro il corpo', '0:31', 'Si parte sempre dal passo laterale e dalla preparazione prima del rimbalzo.'),
  ('Rovescio', 'Presa a due mani stabile', 'Rotazione delle spalle prima del rimbalzo', 'Impatto davanti con spinta delle gambe', 'Spalle ferme', '0:22', 'Presa che scivola', '0:27', 'Il rovescio si insegna a due mani fino all''Under 12.'),
  ('Servizio', 'Lancio di palla alto e costante', 'Posizione trophy con gambe flesse', 'Impatto alto con il braccio disteso', 'Lancio troppo basso', '0:26', 'Gambe rigide', '0:30', 'Al massimo 20 servizi consecutivi: si protegge la spalla.'),
  ('Risposta', 'Posizione di attesa sugli avampiedi', 'Split step quando parte l''avversario', 'Risposta corta e controllata', 'Attesa troppo statica', '0:19', 'Swing troppo lungo', '0:25', 'Si risponde in diagonale prima di cercare il lungolinea.'),
  ('Volée', 'Racchetta davanti al corpo', 'Passo verso la palla', 'Volée corta con polso fermo', 'Swing da dritto', '0:21', 'Polso molle', '0:23', 'Le volée si allenano con palline morbide fino all''Under 10.'),
  ('Smash', 'Passo indietro con spalle laterali', 'Braccio libero in alto per leggere la palla', 'Impatto con braccio disteso', 'Palla colpita troppo bassa', '0:20', 'Spalle frontali', '0:28', 'Lo smash si allena solo dopo il riscaldamento delle spalle.'),
  ('Palleggio', 'Dieci colpi consecutivi', 'Colpo morbido, peso della palla giusto', 'Controllo della direzione', 'Colpi troppo forti', '0:18', 'Piedi fermi', '0:22', 'Il palleggio apre ogni lezione per cinque minuti.'),
  ('Gioco di gambe', 'Passi piccoli verso la palla', 'Split step prima di ogni colpo', 'Recupero al centro dopo il colpo', 'Passi troppo lunghi', '0:20', 'Si ferma dopo il colpo', '0:24', 'Il gioco di gambe è in ogni blocco, non solo nei circuiti.'),
  ('Tattica', 'Giocare lungo e al centro', 'Variare altezza e direzione', 'Cercare il punto debole dell''avversario', 'Gioca solo in diagonale', '0:29', 'Cerca il vincente subito', '0:33', 'In partita si conta il punteggio, ma si valuta la scelta del colpo.'),
  ('Atletica', 'Corsa e coordinazione di base', 'Forza con il peso del corpo', 'Mobilità di spalle e anche', 'Atterraggio rigido', '0:21', 'Respiro bloccato', '0:18', 'Fino all''Under 12 l''atletica si fa sempre in forma di gioco.')
) c(colpo, c1, c2, c3, e1, t1, e2, t2, regola)
on conflict (centro_id, fascia, colpo) do nothing;
