-- 0006b · Modelli di lezione e programmi annuali 2026 del centro modello.
-- I blocchi puntano agli esercizi per id: la clonazione (_rimappa_uuid) li riscrive nel centro di destinazione.

create or replace function pg_temp.eid(c uuid, t text) returns text language sql as
$$ select id::text from public.esercizi where centro_id = c and titolo = t $$;

-- un blocco di lezione nel formato {titolo, colpo, minuti, esercizio_id, modo, alternative, tipo}
create or replace function pg_temp.blk(t text, colpo text, minuti int, es text, modo text, alt jsonb, tipo text) returns jsonb language sql as
$$ select jsonb_build_object('titolo', t, 'colpo', colpo, 'minuti', minuti, 'esercizio_id', es, 'modo', modo, 'alternative', alt, 'tipo', tipo) $$;

do $seed$
declare
  v uuid := (select id from public.centri where slug = 'matchpoint-modello');
  m_multi uuid; m_gio uuid;
  mk text[] := array['set','ott','nov','dic','gen','feb','mar','apr','mag','giu','lug','ago'];
  tn text[] := array['Palleggio','Gioco di gambe','Dritto','Rovescio','Servizio','Risposta','Volée','Tattica','Ripasso','Torneo','Campo estivo','Pausa'];
  tc text[] := array['#2DD4BF','#FFB020','#4CD07D','#3D8BFF','#FF7A45','#F472B6','#A78BFA','#FF5A5F','#D8F34A','#FFD54A','#7FD3FF','#636366'];
  ta text[] := array['Pa','Ga','Dr','Rv','Se','Ri','Vo','Ta','Rp','To','Ca','—'];
  -- tema di ogni settimana per il programma settimanale: indice nell'elenco dei temi, 0 = test
  sett int[] := array[1,2,3,4, 5,6,7,0, 3,4,5,6, 7,8,3,4, 5,6,7,0, 3,4,2,8, 5,6,7,1, 3,4,5,8, 7,2,9,0, 10,10,9,9, 11,11,11,11, 12,12,12,12];
  fasi text[] := array['Base','Base','Specifica','Specifica','Pre-gara','Pre-gara','Gara','Gara','Gara','Scarico','Campionati','Recupero'];
  fcol text[] := array['#3D8BFF','#3D8BFF','#4CD07D','#4CD07D','#FFB020','#FFB020','#FF5A5F','#FF5A5F','#FF5A5F','#A78BFA','#7FD3FF','#636366'];
  carichi int[] := array[50,60,70,40, 50,60,70,40, 60,70,80,50, 60,70,80,50, 70,80,90,55, 70,80,90,55, 75,85,95,50, 75,85,95,50, 75,85,95,50, 40,40,30,30, 60,70,60,40, 20,20,20,20];
  sub text[] := array['preparazione','controllo','direzioni','applicazione'];
  tests text[] := array['ott-4','gen-2','mag-3'];
  p record; mesi jsonb; sets jsonb; i int; w int; idx int; is_test boolean; mod_id text; tema text; car int; col text; any_test boolean; somma int;
begin
  insert into public.modelli_lezione (centro_id, nome, durata_min, blocchi)
  select v, x.nome, x.durata, x.blocchi from (values
    ('Multicolpo a quarti', 60, jsonb_build_array(
      pg_temp.blk('Dritto', 'Dritto', 15, pg_temp.eid(v, 'Dritto in cross da fondo'), 'bloccato', '[]', 't'),
      pg_temp.blk('Rovescio', 'Rovescio', 15, pg_temp.eid(v, 'Rovescio in cross a due mani'), 'bloccato', '[]', 't'),
      pg_temp.blk('Servizio e risposta', 'Servizio', 15, pg_temp.eid(v, 'Servizio ai bersagli'), 'flessibile',
        jsonb_build_array(pg_temp.eid(v, 'Servizio e risposta a punti'), pg_temp.eid(v, 'Servizio con lancio costante')), 't'),
      pg_temp.blk('Volée e gioco', 'Volée', 15, pg_temp.eid(v, 'Volée contro volée'), 'flessibile',
        jsonb_build_array(pg_temp.eid(v, 'Gioco di punti a rete'), pg_temp.eid(v, 'Gioco del punto da fondo')), 'g'))),
    ('Un colpo a fondo', 60, jsonb_build_array(
      pg_temp.blk('Attivazione', '', 10, pg_temp.eid(v, 'Riscaldamento dinamico'), 'bloccato', '[]', 'a'),
      pg_temp.blk('Tecnica del colpo', '', 20, null, 'bloccato', '[]', 't'),
      pg_temp.blk('Esercizio a tema', '', 15, null, 'flessibile', '[]', 't'),
      pg_temp.blk('Gioco a punti', 'Tattica', 15, pg_temp.eid(v, 'Gioco del punto da fondo'), 'libero', '[]', 'g'))),
    ('Tecnica + gioco', 60, jsonb_build_array(
      pg_temp.blk('Giochi di attivazione', '', 10, pg_temp.eid(v, 'Staffetta con racchetta e palline'), 'bloccato', '[]', 'a'),
      pg_temp.blk('Colpo del giorno', '', 15, null, 'flessibile', '[]', 't'),
      pg_temp.blk('Mini-partita', 'Tattica', 20, pg_temp.eid(v, 'Mini-partita a punti'), 'flessibile', '[]', 'g'),
      pg_temp.blk('Gioco finale', '', 15, null, 'libero', '[]', 'g'))),
    ('Giochi e mini-partite', 45, jsonb_build_array(
      pg_temp.blk('Giochi di attivazione', '', 10, pg_temp.eid(v, 'Circuito coordinazione a stazioni'), 'bloccato', '[]', 'a'),
      pg_temp.blk('Colpo del giorno', '', 15, null, 'flessibile', '[]', 't'),
      pg_temp.blk('Gioco a squadre', 'Tattica', 20, pg_temp.eid(v, 'Mini-partita a punti'), 'libero', '[]', 'g'))),
    ('Multicolpo 90 minuti', 90, jsonb_build_array(
      pg_temp.blk('Attivazione', '', 10, pg_temp.eid(v, 'Riscaldamento dinamico'), 'bloccato', '[]', 'a'),
      pg_temp.blk('Dritto', 'Dritto', 20, pg_temp.eid(v, 'Dritto con cambio di direzione'), 'bloccato', '[]', 't'),
      pg_temp.blk('Rovescio', 'Rovescio', 20, pg_temp.eid(v, 'Rovescio lungolinea con bersagli'), 'bloccato', '[]', 't'),
      pg_temp.blk('Servizio e risposta', 'Servizio', 20, pg_temp.eid(v, 'Servizio e risposta a punti'), 'flessibile',
        jsonb_build_array(pg_temp.eid(v, 'Servizio ai bersagli'), pg_temp.eid(v, 'Risposta corta sul secondo servizio')), 't'),
      pg_temp.blk('Volée e gioco', 'Volée', 20, pg_temp.eid(v, 'Gioco di punti a rete'), 'flessibile',
        jsonb_build_array(pg_temp.eid(v, 'Volée contro volée'), pg_temp.eid(v, 'Gioco del punto da fondo')), 'g')))
  ) x(nome, durata, blocchi)
  where not exists (select 1 from public.modelli_lezione m where m.centro_id = v and m.nome = x.nome);

  select id into m_multi from public.modelli_lezione where centro_id = v and nome = 'Multicolpo a quarti';
  select id into m_gio from public.modelli_lezione where centro_id = v and nome = 'Tecnica + gioco';

  -- programmi annuali 2026 (set → ago, 4 settimane per mese); settimane di test ott-4, gen-2, mag-3
  for p in select * from (values
      ('Programma annuale 2026 · U10', 'U10', 'settimanale'),
      ('Programma annuale 2026 · U12', 'U12', 'mensile'),
      ('Programma annuale 2026 · U14', 'U14', 'periodizzazione')) q(nome, fascia, schema)
  loop
    continue when exists (select 1 from public.programmi x where x.centro_id = v and x.nome = p.nome);
    mesi := '[]'::jsonb;
    for i in 1..12 loop
      sets := '[]'::jsonb; any_test := false; somma := 0;
      for w in 1..4 loop
        is_test := (mk[i] || '-' || w) = any (tests);
        idx := case p.schema when 'settimanale' then sett[(i - 1) * 4 + w] else i end;
        if p.schema = 'settimanale' and idx = 0 then is_test := true; end if;
        car := case p.schema when 'periodizzazione' then carichi[(i - 1) * 4 + w] else null end;
        if is_test then
          any_test := true;
          sets := sets || jsonb_build_object('tema', 'Settimana di test', 'colore', '#FFFFFF', 'modello_id', null, 'test', true);
        else
          tema := case p.schema
            when 'settimanale' then tn[idx]
            when 'mensile' then tn[i] || ' · ' || sub[w]
            else fasi[i] || ' · ' || tn[i] end;
          col := case p.schema when 'settimanale' then tc[idx] when 'mensile' then tc[i] else fcol[i] end;
          mod_id := case when i >= 11 then null
                         when i = 10 or (p.schema = 'settimanale' and idx in (1, 2)) then m_gio::text
                         else m_multi::text end;
          sets := sets || (jsonb_build_object('tema', tema, 'colore', col, 'modello_id', mod_id)
                           || case when car is not null then jsonb_build_object('carico', car) else '{}'::jsonb end);
          somma := somma + coalesce(car, 0);
        end if;
      end loop;
      mesi := mesi || (jsonb_build_object(
        'mese', mk[i],
        'tema', case p.schema when 'settimanale' then (select string_agg(case when sett[(i - 1) * 4 + k] = 0 then 'T' else ta[sett[(i - 1) * 4 + k]] end, '·' order by k) from generate_series(1, 4) k)
                              when 'mensile' then tn[i] else fasi[i] end,
        'colpo', case p.schema when 'settimanale' then '' else tn[i] end,
        'colore', case p.schema when 'settimanale' then '#8E8E93' when 'mensile' then tc[i] else fcol[i] end,
        'test', any_test,
        'settimane', sets)
        || case when p.schema = 'periodizzazione' then jsonb_build_object('fase', fasi[i], 'carico', round(somma / 4.0)) else '{}'::jsonb end);
    end loop;
    insert into public.programmi (centro_id, nome, fascia, schema, anno, mesi, settimane_test)
    values (v, p.nome, p.fascia, p.schema, 2026, mesi, tests);
  end loop;
end
$seed$;
