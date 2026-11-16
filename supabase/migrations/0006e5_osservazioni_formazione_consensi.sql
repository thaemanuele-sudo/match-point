-- 0006e5 · Seed Tennis Club Brera (osservazioni formazione consensi). Vedi l'intestazione di 0006e.
create or replace function pg_temp.mid(c uuid, r text, n text, co text) returns uuid language sql as
$$ select id from public.membri where centro_id = c and ruolo = r::public.ruolo_centro and nome = n and cognome = co and area_id is null order by created_at limit 1 $$;

-- Osservazioni del DT sui maestri, formazione e consensi
do $seed$
declare
  b uuid := (select id from public.centri where slug = 'tc-brera');
  laura uuid := pg_temp.mid((select id from public.centri where slug = 'tc-brera'), 'dt', 'Laura', 'Neri');
begin
  insert into public.osservazioni (centro_id, maestro_id, osservatore_id, lezione_id, voti, voto, consigli, nota, created_at)
  select b, o.maestro, laura,
         (select l.id from public.lezioni l join public.gruppi g on g.id = l.gruppo_id where g.centro_id = b and g.nome = o.gruppo and l.data = o.data),
         o.voti, o.voto, o.consigli, o.nota, (o.data + 1)::timestamp at time zone 'Europe/Rome'
  from (values
    (pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), 'U12 Intermedio', date '2026-11-05', '{"tempi":4,"correzione":5,"gruppo":4,"sicurezza":5}'::jsonb, 4,
      array['Dare un obiettivo misurabile a ogni blocco', 'Lasciare più tempo di gioco nell''ultimo quarto'], 'Correzioni molto chiare sul dritto; ottima gestione del gruppo.'),
    (pg_temp.mid(b, 'maestro', 'Marco', 'Ferri'), 'U12 Intermedio', date '2026-10-08', '{"tempi":3,"correzione":4,"gruppo":4,"sicurezza":4}'::jsonb, 3,
      array['Rispettare i minuti di ogni blocco', 'Preparare il campo prima dell''arrivo dei ragazzi'], 'Lezione solida ma con tempi allungati nel primo blocco.'),
    (pg_temp.mid(b, 'maestro', 'Giulia', 'Sala'), 'U10 Base', date '2026-10-26', '{"tempi":5,"correzione":4,"gruppo":5,"sicurezza":5}'::jsonb, 5,
      array['Aggiungere un video di riferimento per il dritto'], 'Atmosfera ottima: i bambini sono coinvolti e sicuri.'),
    (pg_temp.mid(b, 'maestro', 'Paolo', 'Riva'), 'U14 Agonisti', date '2026-11-04', '{"tempi":3,"correzione":4,"gruppo":4,"sicurezza":4}'::jsonb, 4,
      array['Chiudere sempre con un momento di defaticamento', 'Spiegare lo scopo tattico di ogni esercizio'], 'Intensità alta e buon livello tecnico; migliorare la chiusura della lezione.')
  ) o(maestro, gruppo, data, voti, voto, consigli, nota)
  where not exists (select 1 from public.osservazioni x where x.centro_id = b and x.maestro_id = o.maestro and x.nota = o.nota);

  insert into public.formazione (centro_id, corso_id, membro_id, moduli_fatti, certificato_il, scadenza)
  select b, c.id, m.id, f.fatti, f.cert, f.scad
  from (values
    ('Marco', 'Ferri', 'Metodo Match Point · livello 1', 6, date '2026-03-12', date '2028-03-12'),
    ('Marco', 'Ferri', 'Sicurezza e primo soccorso', 4, date '2026-01-20', date '2027-01-20'),
    ('Marco', 'Ferri', 'Tutela dei minori e comportamento in campo', 3, date '2025-11-25', date '2026-11-25'),
    ('Marco', 'Ferri', 'Didattica del mini tennis U8-U10', 2, null, null),
    ('Giulia', 'Sala', 'Metodo Match Point · livello 1', 6, date '2026-02-18', date '2028-02-18'),
    ('Giulia', 'Sala', 'Sicurezza e primo soccorso', 4, date '2026-02-18', date '2027-02-18'),
    ('Giulia', 'Sala', 'Tutela dei minori e comportamento in campo', 3, date '2026-03-02', date '2027-03-02'),
    ('Giulia', 'Sala', 'Didattica del mini tennis U8-U10', 5, date '2026-05-09', date '2028-05-09'),
    ('Giulia', 'Sala', 'Preparazione atletica giovanile', 1, null, null),
    ('Paolo', 'Riva', 'Metodo Match Point · livello 1', 4, null, null),
    ('Paolo', 'Riva', 'Sicurezza e primo soccorso', 4, date '2026-04-06', date '2027-04-06'),
    ('Paolo', 'Riva', 'Tutela dei minori e comportamento in campo', 3, date '2026-04-06', date '2027-04-06'),
    ('Paolo', 'Riva', 'Preparazione atletica giovanile', 4, date '2026-06-15', date '2028-06-15'),
    ('Davide', 'Neri', 'Metodo Match Point · livello 1', 2, null, null),
    ('Davide', 'Neri', 'Sicurezza e primo soccorso', 2, null, null),
    ('Davide', 'Neri', 'Tutela dei minori e comportamento in campo', 1, null, null),
    ('Sara', 'Conti', 'Metodo Match Point · livello 1', 6, date '2026-05-20', date '2028-05-20'),
    ('Sara', 'Conti', 'Sicurezza e primo soccorso', 4, date '2026-05-20', date '2027-05-20'),
    ('Sara', 'Conti', 'Tutela dei minori e comportamento in campo', 3, date '2026-06-01', date '2027-06-01')
  ) f(nome, cognome, corso, fatti, cert, scad)
  join public.membri m on m.centro_id = b and m.ruolo = 'maestro' and m.nome = f.nome and m.cognome = f.cognome
  join public.corsi_formazione c on c.centro_id = b and c.titolo = f.corso
  where not exists (select 1 from public.formazione x where x.corso_id = c.id and x.membro_id = m.id);

  -- consensi: tre tipi per allievo, di default non firmati (false); alcuni firmati dal genitore (o dall'allievo adulto)
  insert into public.consensi (centro_id, allievo_id, tipo, valore, firmato_da, firmato_il)
  select b, a.id, t.tipo, v.firmato,
         case when v.firmato then coalesce((select f.membro_id from public.allievi_famiglie f where f.allievo_id = a.id order by f.created_at limit 1), a.membro_id) end,
         case when v.firmato then date '2026-09-10' + (abs(hashtext(a.id::text)) % 20) * interval '1 day' + time '18:00' end
  from public.allievi a
  cross join (values ('privacy', 88), ('foto_video', 50), ('ai', 25)) t(tipo, pct)
  cross join lateral (select abs(hashtext(a.id::text || t.tipo)) % 100 < t.pct as firmato) v
  where a.centro_id = b
  on conflict (allievo_id, tipo) do nothing;
end
$seed$;
