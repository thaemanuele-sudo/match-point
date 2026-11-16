-- 0008_aggregati: estensioni, indici di scala e RPC di aggregazione per i centri.
-- Perche': i grandi centri (1500 allievi, 25.000 lezioni, 400.000 presenze ciascuno) non possono
-- sommare righe nel browser. Tutti i numeri arrivano da funzioni che contano nel database.
-- Regola di sicurezza:
--   * security invoker dove basta la RLS (le liste con il perimetro del ruolo: maestro, area, famiglia);
--   * security definer con controllo esplicito (is_dt / is_admin) per i numeri di tutto il centro,
--     che la RLS da sola renderebbe lenti (controllo riga per riga) o incompleti (messaggi, segnalazioni).
-- Nessuna istruzione distruttiva: solo create ... if not exists / create or replace.

-- ---------------------------------------------------------------------------------------------
-- 1. Estensioni (nello schema extensions, come da buone pratiche Supabase)
-- ---------------------------------------------------------------------------------------------
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent di serie e' "stable": per usarlo in un indice serve un involucro immutabile con il
-- dizionario fissato e lo schema scritto per esteso.
create or replace function public.f_unaccent(t text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, t) $$;

-- ---------------------------------------------------------------------------------------------
-- 2. Indici
-- ---------------------------------------------------------------------------------------------
-- Elenco allievi paginato (ordine cognome, nome, id) e ricerca per trigrammi senza accenti.
create index if not exists allievi_centro_cognome_idx on public.allievi (centro_id, cognome, nome, id);
create index if not exists allievi_nome_trgm_idx on public.allievi
  using gin (public.f_unaccent(lower(nome || ' ' || coalesce(cognome, ''))) extensions.gin_trgm_ops);

-- Iscrizioni: le attive (al null) per gruppo, e lo storico per allievo.
create index if not exists iscrizioni_gruppo_attive_idx on public.iscrizioni (gruppo_id, allievo_id) where al is null;
create index if not exists iscrizioni_allievo_al_idx on public.iscrizioni (allievo_id, al);

-- Valutazioni: progressi per colpo, storico dell'allievo, test del centro.
create index if not exists valutazioni_centro_colpo_data_idx on public.valutazioni (centro_id, colpo, data);
create index if not exists valutazioni_allievo_data_idx on public.valutazioni (allievo_id, data desc);
create index if not exists valutazioni_centro_test_allievo_idx on public.valutazioni (centro_id, test, allievo_id);

-- Presenze (la tabella piu' grande): per centro+lezione e per allievo+lezione.
create index if not exists presenze_centro_lezione_idx on public.presenze (centro_id, lezione_id);
create index if not exists presenze_allievo_lezione_idx on public.presenze (allievo_id, lezione_id);

-- Liste ordinate per data di creazione.
create index if not exists membri_centro_creato_idx on public.membri (centro_id, created_at, id);
create index if not exists inviti_centro_creato_idx on public.inviti (centro_id, created_at desc, id);
create index if not exists quote_centro_scade_idx on public.quote (centro_id, scade_il, id);
create index if not exists quote_allievo_stato_scade_idx on public.quote (allievo_id, stato, scade_il);
create index if not exists notifiche_membro_creata_idx on public.notifiche (membro_id, created_at desc);
-- NOTA: lezioni (gruppo_id, data) esiste gia' come vincolo unico lezioni_gruppo_id_data_key:
-- un secondo indice identico sarebbe solo spazio sprecato.
create index if not exists lezioni_centro_maestro_stato_data_idx on public.lezioni (centro_id, maestro_id, stato, data desc);
create index if not exists messaggi_centro_creato_idx on public.messaggi (centro_id, created_at desc);
create index if not exists compiti_allievo_creato_idx on public.compiti (allievo_id, created_at desc);
create index if not exists compiti_gruppo_creato_idx on public.compiti (gruppo_id, created_at desc);
create index if not exists esercizi_centro_stato_creato_idx on public.esercizi (centro_id, stato, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- 3. Funzioni di supporto (prefisso _)
-- ---------------------------------------------------------------------------------------------
-- Rende un array jsonb anche quando il dato e' null o di altro tipo (evita errori nei piani vecchi).
create or replace function public._jarr(j jsonb)
returns jsonb
language sql immutable parallel safe
set search_path = public
as $$ select case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end $$;

-- Un blocco del piano e' "fatto come da piano" se compare in svolto, fatto e non sostituito ne' saltato.
-- Stessa regola di aderenza_maestro, qui in forma riusabile.
create or replace function public._blocco_fatto(p_svolto jsonb, p_indice int)
returns boolean
language sql immutable parallel safe
set search_path = public
as $$
  select exists (
    select 1 from jsonb_array_elements(public._jarr(p_svolto)) s
    where (s ->> 'indice')::int = p_indice
      and coalesce((s ->> 'fatto')::boolean, false)
      and not coalesce((s ->> 'sostituito')::boolean, false)
      and not coalesce((s ->> 'saltato')::boolean, false)
  )
$$;

-- Allievi con 3 o piu' assenze nelle ultime 6 lezioni chiuse di un loro gruppo.
-- Si guardano solo gli ultimi 120 giorni: basta per 6 lezioni settimanali e tiene piccola la finestra.
create or replace function public._allievi_ripetute(p_centro uuid)
returns setof uuid
language sql stable
set search_path = public
as $$
  with ult as (
    select l.id, l.gruppo_id,
           row_number() over (partition by l.gruppo_id order by l.data desc, l.ora desc nulls last, l.id) as rn
    from public.lezioni l
    where l.centro_id = p_centro and l.stato = 'chiusa' and l.data >= current_date - 120
  )
  select distinct p.allievo_id
  from ult u
  join public.presenze p on p.lezione_id = u.id and p.centro_id = p_centro
  where u.rn <= 6 and not p.presente
  group by p.allievo_id, u.gruppo_id
  having count(*) >= 3
$$;

-- Livello (0-100) di ogni allievo nel test piu' recente (rn = 1) e in quello precedente (rn = 2).
-- Il livello e' la media dei voti 1-5 per 20; se p_colpo e' valorizzato conta solo quel colpo.
create or replace function public._allievi_test(p_centro uuid, p_colpo text default null)
returns table(allievo_id uuid, test text, data date, livello numeric, rn int)
language sql stable
set search_path = public
as $$
  select t.allievo_id, t.test, t.data, t.livello, t.rn
  from (
    select x.allievo_id, x.test, x.data, x.livello,
           (row_number() over (partition by x.allievo_id order by x.data desc, x.test desc))::int as rn
    from (
      select v.allievo_id, v.test, max(v.data) as data, round(avg(v.voto) * 20, 1) as livello
      from public.valutazioni v
      where v.centro_id = p_centro
        and (p_colpo is null or v.colpo = p_colpo)
        and v.data >= current_date - 550
      group by v.allievo_id, v.test
    ) x
  ) t
  where t.rn <= 2
$$;

-- Aderenza di tutti i maestri del centro in un solo passaggio (stessa regola di aderenza_maestro).
-- Interna: la chiamano solo le funzioni definer che hanno gia' controllato il ruolo.
create or replace function public._aderenza_maestri(p_centro uuid)
returns table(maestro_id uuid, aderenza numeric)
language sql stable security definer
set search_path = public
as $$
  select t.maestro_id,
         round(100.0 * count(*) filter (where t.fatto) / nullif(count(*), 0), 1)
  from (
    select l.maestro_id, public._blocco_fatto(l.svolto, (b.ord - 1)::int) as fatto
    from public.lezioni l
    cross join lateral jsonb_array_elements(public._jarr(l.piano)) with ordinality as b(val, ord)
    where l.centro_id = p_centro and l.maestro_id is not null and l.stato = 'chiusa'
      and l.data >= current_date - 365
      and coalesce(b.val ->> 'modo', 'bloccato') = 'bloccato'
  ) t
  group by t.maestro_id
$$;

-- Conversazioni (con eventuale maestro partecipante) il cui ultimo messaggio e' di una famiglia
-- o di un allievo e non ha risposta da piu' di p_ore ore. Solo ultimi 30 giorni, per non
-- contare conversazioni abbandonate da mesi. Interna: i messaggi di tutto il centro non passano dalla RLS.
create or replace function public._conv_senza_risposta(p_centro uuid, p_ore int default 48)
returns table(conversazione_id uuid, maestro_id uuid)
language sql stable security definer
set search_path = public
as $$
  with ult as (
    select distinct on (m.conversazione_id) m.conversazione_id, m.autore_id, m.created_at
    from public.messaggi m
    where m.centro_id = p_centro
      and m.created_at >= now() - interval '30 days'
      and m.consegna_il <= now()
    order by m.conversazione_id, m.created_at desc
  )
  select u.conversazione_id, mx.membro_id
  from ult u
  join public.membri a on a.id = u.autore_id and a.ruolo in ('genitore', 'allievo')
  join public.conversazioni c on c.id = u.conversazione_id
       and c.tipo in ('allievo_maestro', 'famiglia_maestro', 'famiglia_segreteria')
  left join (
    select pa.conversazione_id, pa.membro_id
    from public.partecipanti pa
    join public.membri mm on mm.id = pa.membro_id and mm.ruolo = 'maestro'
  ) mx on mx.conversazione_id = c.id
  where u.created_at < now() - make_interval(hours => p_ore)
$$;

-- ---------------------------------------------------------------------------------------------
-- 4. Panoramica del centro (C1) e riepilogo maestri (C2): solo DT e titolare
-- ---------------------------------------------------------------------------------------------
-- Giorno e settimana (lunedi-domenica) di p_giorno. "Maestri in campo" = maestri con una lezione
-- in corso nel giorno. "Messaggi senza risposta" = conversazioni ferme da oltre 48 ore.
create or replace function public.panoramica_centro(p_centro uuid, p_giorno date)
returns json
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_g date := coalesce(p_giorno, current_date);
  v_ini date := date_trunc('week', coalesce(p_giorno, current_date)::timestamp)::date;
  v_fin date;
  v_oggi jsonb;
  v_sett jsonb;
begin
  if not public.is_dt(p_centro) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  v_fin := v_ini + 6;

  with l as (
    select x.id, x.data, x.stato from public.lezioni x
    where x.centro_id = p_centro and x.data between v_ini and v_fin
  ),
  p as (
    select l.id, count(*) as tot, count(*) filter (where pr.presente) as pres
    from l join public.presenze pr on pr.lezione_id = l.id and pr.centro_id = p_centro
    group by l.id
  )
  select
    jsonb_build_object(
      'lezioni_totali', count(*) filter (where l.data = v_g),
      'lezioni_chiuse', count(*) filter (where l.data = v_g and l.stato = 'chiusa'),
      'presenze_totali', coalesce(sum(p.tot) filter (where l.data = v_g), 0),
      'presenze_presenti', coalesce(sum(p.pres) filter (where l.data = v_g), 0)),
    jsonb_build_object(
      'lezioni_totali', count(*),
      'lezioni_chiuse', count(*) filter (where l.stato = 'chiusa'),
      'presenze_totali', coalesce(sum(p.tot), 0),
      'presenze_presenti', coalesce(sum(p.pres), 0))
  into v_oggi, v_sett
  from l left join p on p.id = l.id;

  return json_build_object(
    'oggi', v_oggi,
    'settimana', v_sett,
    'allievi_attivi', (
      select count(distinct i.allievo_id) from public.iscrizioni i
      where i.centro_id = p_centro and i.dal <= v_g and (i.al is null or i.al >= v_g)),
    'nuovi_30g', (
      select count(*) from public.allievi a
      where a.centro_id = p_centro
        and a.created_at >= (v_g - 30)::timestamptz and a.created_at < (v_g + 1)::timestamptz),
    'allievi_con_assenze_ripetute', (select count(*) from public._allievi_ripetute(p_centro)),
    'maestri_in_campo', (
      select count(distinct l2.maestro_id) from public.lezioni l2
      where l2.centro_id = p_centro and l2.data = v_g and l2.stato = 'in_corso' and l2.maestro_id is not null),
    -- Le segnalazioni "riguarda_dt" le vede solo il titolare (stessa regola della RLS).
    'segnalazioni_aperte', (
      select count(*) from public.segnalazioni s
      where s.centro_id = p_centro and s.stato <> 'chiusa'
        and (not s.riguarda_dt or public.is_admin() or p_centro = any (public.centri_titolare()))),
    'messaggi_senza_risposta_48h', (
      select count(distinct s.conversazione_id) from public._conv_senza_risposta(p_centro, 48) s),
    'aderenza_media', (select round(avg(a.aderenza), 1) from public._aderenza_maestri(p_centro) a)
  );
end $$;

-- Una riga per maestro (non sospeso). Definizioni:
--   aderenza: blocchi "bloccati" fatti come da piano, ultimi 365 giorni, in % intera;
--   lezioni_chiuse: ultimi 30 giorni; allievi: iscritti attivi nei suoi gruppi;
--   valutazioni_mancanti: suoi allievi senza nessuna valutazione dal 1 del mese corrente;
--   progressi: media (punti di livello 0-100) tra ultimo test e precedente dei suoi allievi;
--   risposta_mediana_ore: mediana tra un messaggio di famiglia/allievo e la sua risposta (90 giorni);
--   messaggi_senza_risposta: conversazioni sue ferme da oltre 48 ore.
create or replace function public.riepilogo_maestri(p_centro uuid)
returns table(membro_id uuid, aderenza int, lezioni_chiuse int, allievi int, valutazioni_mancanti int,
              progressi numeric, risposta_mediana_ore numeric, messaggi_senza_risposta int)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_dt(p_centro) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;

  return query
  with mae as (
    select m.id from public.membri m
    where m.centro_id = p_centro and m.ruolo = 'maestro' and m.stato <> 'sospeso'
  ),
  ad as (select a.maestro_id, a.aderenza from public._aderenza_maestri(p_centro) a),
  lc as (
    select l.maestro_id, count(*)::int as n from public.lezioni l
    where l.centro_id = p_centro and l.stato = 'chiusa' and l.data >= current_date - 30 and l.maestro_id is not null
    group by l.maestro_id
  ),
  alu as (
    select distinct gm.membro_id as maestro_id, i.allievo_id
    from public.gruppi_maestri gm
    join public.iscrizioni i on i.gruppo_id = gm.gruppo_id and i.centro_id = p_centro
         and i.dal <= current_date and (i.al is null or i.al >= current_date)
    where gm.centro_id = p_centro
  ),
  alc as (select alu.maestro_id, count(*)::int as n from alu group by alu.maestro_id),
  vm as (
    select distinct v.allievo_id from public.valutazioni v
    where v.centro_id = p_centro and v.data >= date_trunc('month', current_date::timestamp)::date
  ),
  mc as (
    select alu.maestro_id, count(*)::int as n from alu
    where not exists (select 1 from vm where vm.allievo_id = alu.allievo_id)
    group by alu.maestro_id
  ),
  t as materialized (select * from public._allievi_test(p_centro)),
  dl as (
    select a.allievo_id, a.livello - b.livello as delta
    from t a join t b on b.allievo_id = a.allievo_id and a.rn = 1 and b.rn = 2
  ),
  pg as (
    select alu.maestro_id, round(avg(dl.delta), 1) as d
    from alu join dl on dl.allievo_id = alu.allievo_id
    group by alu.maestro_id
  ),
  rm as (
    select pa.membro_id as maestro_id,
           round((percentile_cont(0.5) within group (order by (extract(epoch from (r.t - m.created_at)) / 3600.0)::float8))::numeric, 1) as ore
    from public.messaggi m
    join public.membri a on a.id = m.autore_id and a.ruolo in ('genitore', 'allievo')
    join public.partecipanti pa on pa.conversazione_id = m.conversazione_id
    join public.membri mm on mm.id = pa.membro_id and mm.ruolo = 'maestro'
    cross join lateral (
      select min(x.created_at) as t from public.messaggi x
      where x.conversazione_id = m.conversazione_id and x.autore_id = pa.membro_id and x.created_at > m.created_at
    ) r
    where m.centro_id = p_centro and m.created_at >= now() - interval '90 days' and r.t is not null
    group by pa.membro_id
  ),
  sr as (
    select s.maestro_id, count(*)::int as n from public._conv_senza_risposta(p_centro, 48) s
    where s.maestro_id is not null group by s.maestro_id
  )
  select mae.id,
         round(ad.aderenza)::int,
         coalesce(lc.n, 0),
         coalesce(alc.n, 0),
         coalesce(mc.n, 0),
         pg.d,
         rm.ore,
         coalesce(sr.n, 0)
  from mae
  left join ad on ad.maestro_id = mae.id
  left join lc on lc.maestro_id = mae.id
  left join alc on alc.maestro_id = mae.id
  left join mc on mc.maestro_id = mae.id
  left join pg on pg.maestro_id = mae.id
  left join rm on rm.maestro_id = mae.id
  left join sr on sr.maestro_id = mae.id
  order by mae.id;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 5. Maestro: ultime lezioni, statistiche allievi, aderenza per gruppo (security invoker: la RLS
--    mostra solo cio' che il chiamante puo' gia' leggere)
-- ---------------------------------------------------------------------------------------------
-- Lezioni del maestro fino a oggi, dalla piu' recente. Include quelle non ancora chiuse, cosi'
-- si vedono anche le lezioni da chiudere. p_n limitato a 1..100.
create or replace function public.ultime_lezioni_maestro(p_centro uuid, p_membro uuid, p_n int default 12)
returns table(lezione_id uuid, data date, ora time, gruppo_id uuid, gruppo_nome text, stato text,
              presenti int, totale int, blocchi_bloccati int, blocchi_fatti int, aderenza int, riassunto_ok boolean)
language sql stable
set search_path = public
as $$
  select l.id, l.data, l.ora, l.gruppo_id, g.nome, l.stato,
         coalesce(pr.presenti, 0)::int,
         coalesce(pr.totale, 0)::int,
         coalesce(bl.bloccati, 0)::int,
         coalesce(bl.fatti, 0)::int,
         case when coalesce(bl.bloccati, 0) > 0 then round(100.0 * bl.fatti / bl.bloccati)::int end,
         l.riassunto_ok
  from (
    select x.* from public.lezioni x
    where x.centro_id = p_centro and x.maestro_id = p_membro and x.data <= current_date
    order by x.data desc, x.ora desc nulls last
    limit least(greatest(coalesce(p_n, 12), 1), 100)
  ) l
  join public.gruppi g on g.id = l.gruppo_id
  left join lateral (
    select count(*) as totale, count(*) filter (where p.presente) as presenti
    from public.presenze p where p.lezione_id = l.id
  ) pr on true
  left join lateral (
    select count(*) filter (where coalesce(b.val ->> 'modo', 'bloccato') = 'bloccato') as bloccati,
           count(*) filter (where coalesce(b.val ->> 'modo', 'bloccato') = 'bloccato'
                              and public._blocco_fatto(l.svolto, (b.ord - 1)::int)) as fatti
    from jsonb_array_elements(public._jarr(l.piano)) with ordinality as b(val, ord)
  ) bl on true
  order by l.data desc, l.ora desc nulls last
$$;

-- Per ogni allievo iscritto ai gruppi del maestro: presenze % negli ultimi 30 giorni (lezioni chiuse)
-- e media dei voti (1-5) dell'ultimo test.
create or replace function public.statistiche_allievi_maestro(p_membro uuid)
returns table(allievo_id uuid, presenze_30g_pct int, media_ultimo_test numeric)
language sql stable
set search_path = public
as $$
  with al as (
    select distinct i.allievo_id
    from public.gruppi_maestri gm
    join public.iscrizioni i on i.gruppo_id = gm.gruppo_id
         and i.dal <= current_date and (i.al is null or i.al >= current_date)
    where gm.membro_id = p_membro
  ),
  pr as (
    select p.allievo_id, round(100.0 * count(*) filter (where p.presente) / count(*))::int as pct
    from public.presenze p
    join public.lezioni l on l.id = p.lezione_id
    where exists (select 1 from al where al.allievo_id = p.allievo_id)
      and l.stato = 'chiusa' and l.data > current_date - 30 and l.data <= current_date
    group by p.allievo_id
  ),
  lt as (
    select distinct on (v.allievo_id) v.allievo_id, v.test
    from public.valutazioni v
    where exists (select 1 from al where al.allievo_id = v.allievo_id)
    order by v.allievo_id, v.data desc, v.test desc
  ),
  mt as (
    select lt.allievo_id, round(avg(v.voto), 2) as media
    from lt join public.valutazioni v on v.allievo_id = lt.allievo_id and v.test = lt.test
    group by lt.allievo_id
  )
  select al.allievo_id, pr.pct, mt.media
  from al
  left join pr on pr.allievo_id = al.allievo_id
  left join mt on mt.allievo_id = al.allievo_id
$$;

-- Aderenza (% blocchi "bloccati" fatti come da piano, ultimi 365 giorni) per gruppo, sulle lezioni del maestro.
create or replace function public.aderenza_gruppi(p_membro uuid)
returns table(gruppo_id uuid, aderenza numeric)
language sql stable
set search_path = public
as $$
  select t.gruppo_id,
         round(100.0 * count(*) filter (where t.fatto) / nullif(count(*), 0), 1)
  from (
    select l.gruppo_id, public._blocco_fatto(l.svolto, (b.ord - 1)::int) as fatto
    from public.lezioni l
    cross join lateral jsonb_array_elements(public._jarr(l.piano)) with ordinality as b(val, ord)
    where l.maestro_id = p_membro and l.stato = 'chiusa' and l.data >= current_date - 365
      and coalesce(b.val ->> 'modo', 'bloccato') = 'bloccato'
  ) t
  group by t.gruppo_id
$$;

-- ---------------------------------------------------------------------------------------------
-- 6. Libreria esercizi con ricerca senza accenti. p_da e p_a sono gli estremi (inclusi, base 0)
--    della pagina, come .range() del client: max 200 righe per chiamata.
-- ---------------------------------------------------------------------------------------------
create or replace function public.esercizi_cerca(
  p_centro uuid, p_testo text default null, p_colpo text default null, p_fonte text default null,
  p_da int default 0, p_a int default 49)
returns table(id uuid, titolo text, colpo text, fasce text[], durata_min int, materiale text,
              descrizione text, video_path text, fonte text, stato text, proposto_da uuid,
              created_at timestamptz, totale bigint)
language plpgsql stable
set search_path = public
as $$
#variable_conflict use_column
declare
  v_s text := nullif(btrim(public.f_unaccent(lower(coalesce(p_testo, '')))), '');
  v_pat text := '%';
  v_off int := greatest(coalesce(p_da, 0), 0);
  v_lim int := greatest(least(coalesce(p_a, 49) - greatest(coalesce(p_da, 0), 0) + 1, 200), 0);
begin
  if v_s is not null then
    v_pat := '%' || replace(replace(replace(v_s, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  return query
  select e.id, e.titolo, e.colpo, e.fasce, e.durata_min, e.materiale, e.descrizione, e.video_path,
         e.fonte, e.stato, e.proposto_da, e.created_at, count(*) over ()
  from public.esercizi e
  where e.centro_id = p_centro
    and (p_colpo is null or e.colpo = p_colpo)
    and (p_fonte is null or e.fonte = p_fonte)
    and public.f_unaccent(lower(coalesce(e.titolo, '') || ' ' || coalesce(e.descrizione, '') || ' ' || coalesce(e.materiale, ''))) ilike v_pat
  order by public.f_unaccent(lower(coalesce(e.titolo, ''))), e.id
  limit v_lim offset v_off;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 7. Allievi del centro (C10): lista paginata con stato, riepilogo e conteggi
-- ---------------------------------------------------------------------------------------------
-- p_aree: se valorizzato, solo allievi iscritti (oggi) a gruppi di quelle aree.
-- p_q: ricerca senza accenti su "nome cognome" (anche in ordine inverso), con indice trigrammi.
-- p_filtro: tutti | ritardo | ripetute | certificato (scaduto, in scadenza entro 30 giorni o mancante).
-- p_colpo: limita ai voti di quel colpo il calcolo del calo tra un test e l'altro.
-- perc/assenti/su: presenze agli allievi nelle lezioni chiuse degli ultimi 30 giorni (perc null se su = 0).
-- ritardo: perc di 10 punti sotto la media del gruppo, oppure livello calato di 5 punti rispetto al test precedente.
-- ripetute: 3 o piu' assenze nelle ultime 6 lezioni chiuse.
-- totale: righe che rispettano i filtri, prima di limit/offset (per la paginazione).
create or replace function public.allievi_stato_lista(
  p_centro uuid, p_aree uuid[] default null, p_q text default null, p_filtro text default 'tutti',
  p_colpo text default null, p_limit int default 50, p_offset int default 0)
returns table(id uuid, nome text, cognome text, data_nascita date, certificato_scade date,
              gruppi text[], maestri text[], perc int, assenti int, su int,
              ritardo boolean, ripetute boolean, totale bigint)
language plpgsql stable
set search_path = public
as $$
#variable_conflict use_column
declare
  v_s text;
  v_fw text := '%';
  v_rv text := '%';
  v_lim int := least(greatest(coalesce(p_limit, 50), 1), 100000);
  v_off int := greatest(coalesce(p_offset, 0), 0);
  v_f text := coalesce(p_filtro, 'tutti');
begin
  if v_f not in ('tutti', 'ritardo', 'ripetute', 'certificato') then
    raise exception 'Filtro non valido: %', v_f using errcode = '22023';
  end if;

  -- Schemi di ricerca: parole nell'ordine scritto e nell'ordine inverso ("rossi mario" trova "Mario Rossi").
  v_s := nullif(btrim(regexp_replace(public.f_unaccent(lower(coalesce(p_q, ''))), '\s+', ' ', 'g')), '');
  if v_s is not null then
    v_s := replace(replace(replace(v_s, '\', '\\'), '%', '\%'), '_', '\_');
    v_fw := '%' || replace(v_s, ' ', '%') || '%';
    v_rv := '%' || (select string_agg(x.t, '%' order by x.o desc)
                    from unnest(string_to_array(v_s, ' ')) with ordinality as x(t, o)) || '%';
  end if;

  return query
  with ba as (
    select a.id, a.nome, a.cognome, a.data_nascita, a.certificato_scade
    from public.allievi a
    where a.centro_id = p_centro
      and (public.f_unaccent(lower(a.nome || ' ' || coalesce(a.cognome, ''))) ilike v_fw
           or public.f_unaccent(lower(a.nome || ' ' || coalesce(a.cognome, ''))) ilike v_rv)
  ),
  isc as (
    select i.allievo_id, g.id as gruppo_id, g.nome as gruppo_nome
    from public.iscrizioni i
    join public.gruppi g on g.id = i.gruppo_id
    where i.centro_id = p_centro and i.dal <= current_date and (i.al is null or i.al >= current_date)
      and g.attivo and (p_aree is null or g.area_id = any (p_aree))
  ),
  ig as (
    select i.allievo_id, array_agg(distinct i.gruppo_nome) as gruppi from isc i group by i.allievo_id
  ),
  mg as (
    select i.allievo_id, array_agg(distinct btrim(m.nome || ' ' || coalesce(m.cognome, ''))) as maestri
    from isc i
    join public.gruppi_maestri gmm on gmm.gruppo_id = i.gruppo_id
    join public.membri m on m.id = gmm.membro_id
    group by i.allievo_id
  ),
  st as (
    select p.allievo_id, count(*)::int as su, (count(*) filter (where not p.presente))::int as assenti
    from public.lezioni l
    join public.presenze p on p.lezione_id = l.id and p.centro_id = p_centro
    where l.centro_id = p_centro and l.stato = 'chiusa' and l.data > current_date - 30 and l.data <= current_date
    group by p.allievo_id
  ),
  memb as (
    select i.gruppo_id, i.allievo_id
    from public.iscrizioni i join public.gruppi g on g.id = i.gruppo_id
    where i.centro_id = p_centro and i.dal <= current_date and (i.al is null or i.al >= current_date) and g.attivo
  ),
  gmed as (
    select m.gruppo_id, avg(100.0 * (s.su - s.assenti) / s.su) as media
    from memb m join st s on s.allievo_id = m.allievo_id
    where s.su > 0
    group by m.gruppo_id
  ),
  rif as (
    select i.allievo_id, avg(gmed.media) as media
    from isc i join gmed on gmed.gruppo_id = i.gruppo_id
    group by i.allievo_id
  ),
  t as materialized (select * from public._allievi_test(p_centro, p_colpo)),
  tt as (
    select a.allievo_id, a.livello - b.livello as delta
    from t a join t b on b.allievo_id = a.allievo_id and a.rn = 1 and b.rn = 2
  ),
  rip as (select x as allievo_id from public._allievi_ripetute(p_centro) x),
  cand as (
    select ba.id, ba.nome, ba.cognome, ba.data_nascita, ba.certificato_scade,
           coalesce(ig.gruppi, '{}'::text[]) as gruppi,
           coalesce(mg.maestri, '{}'::text[]) as maestri,
           case when st.su > 0 then round(100.0 * (st.su - st.assenti) / st.su)::int end as perc,
           coalesce(st.assenti, 0) as assenti,
           coalesce(st.su, 0) as su,
           (coalesce(st.su, 0) > 0 and coalesce(100.0 * (st.su - st.assenti) / nullif(st.su, 0) < rif.media - 10, false))
             or coalesce(tt.delta <= -5, false) as ritardo,
           (rip.allievo_id is not null) as ripetute
    from ba
    left join ig on ig.allievo_id = ba.id
    left join mg on mg.allievo_id = ba.id
    left join st on st.allievo_id = ba.id
    left join rif on rif.allievo_id = ba.id
    left join tt on tt.allievo_id = ba.id
    left join rip on rip.allievo_id = ba.id
    where p_aree is null or ig.allievo_id is not null
  ),
  fil as (
    select c.* from cand c
    where case v_f
            when 'ritardo' then c.ritardo
            when 'ripetute' then c.ripetute
            when 'certificato' then (c.certificato_scade is null or c.certificato_scade < current_date + 30)
            else true
          end
  )
  select f.id, f.nome, f.cognome, f.data_nascita, f.certificato_scade, f.gruppi, f.maestri,
         f.perc, f.assenti, f.su, f.ritardo, f.ripetute, count(*) over ()
  from fil f
  order by f.cognome, f.nome, f.id
  limit v_lim offset v_off;
end $$;

-- Quattro numeri in testa alla lista, calcolati con la stessa logica della lista (stessi filtri area e colpo).
-- presenze_mese_perc = presenze degli ultimi 30 giorni, pesate sul numero di lezioni.
create or replace function public.allievi_riepilogo(p_centro uuid, p_aree uuid[] default null, p_colpo text default null)
returns json
language sql stable
set search_path = public
as $$
  with r as (select * from public.allievi_stato_lista(p_centro, p_aree, null, 'tutti', p_colpo, 100000, 0))
  select json_build_object(
    'attivi', count(*) filter (where cardinality(r.gruppi) > 0),
    'presenze_mese_perc', case when coalesce(sum(r.su), 0) > 0
                               then round(100.0 * (sum(r.su) - sum(r.assenti)) / sum(r.su))::int end,
    'in_ritardo', count(*) filter (where r.ritardo),
    'assenze_ripetute', count(*) filter (where r.ripetute))
  from r
$$;

-- Allievi iscritti oggi per gruppo (anche i gruppi vuoti, con 0).
create or replace function public.conteggi_gruppi(p_centro uuid, p_aree uuid[] default null)
returns table(gruppo_id uuid, n_allievi int)
language sql stable
set search_path = public
as $$
  select g.id, count(distinct i.allievo_id)::int
  from public.gruppi g
  left join public.iscrizioni i on i.gruppo_id = g.id
       and i.dal <= current_date and (i.al is null or i.al >= current_date)
  where g.centro_id = p_centro and (p_aree is null or g.area_id = any (p_aree))
  group by g.id
$$;

-- Progressi (C11) per gruppo o per maestro. n_allievi = iscritti attivi dell'unita';
-- livello (0-100) = media dell'ultimo test; delta = media del cambio rispetto al test precedente
-- (solo chi ha entrambi). Livello e delta sono null se nessuno ha valutazioni.
create or replace function public.progressi_per_unita(
  p_centro uuid, p_colpo text, p_vista text, p_aree uuid[] default null)
returns table(unita_id uuid, nome text, n_allievi int, livello numeric, delta numeric)
language plpgsql stable
set search_path = public
as $$
#variable_conflict use_column
begin
  if p_vista is null or p_vista not in ('gruppi', 'maestri') then
    raise exception 'Vista non valida: usare gruppi o maestri' using errcode = '22023';
  end if;

  return query
  with t as materialized (select * from public._allievi_test(p_centro, p_colpo)),
  cur as (
    select a.allievo_id, a.livello as ora, b.livello as prima
    from t a left join t b on b.allievo_id = a.allievo_id and b.rn = 2
    where a.rn = 1
  ),
  iscr as (
    select i.allievo_id, i.gruppo_id
    from public.iscrizioni i join public.gruppi g on g.id = i.gruppo_id
    where i.centro_id = p_centro and i.dal <= current_date and (i.al is null or i.al >= current_date)
      and g.attivo and (p_aree is null or g.area_id = any (p_aree))
  ),
  un as (
    select distinct iscr.allievo_id,
           case when p_vista = 'gruppi' then iscr.gruppo_id else gm.membro_id end as uid
    from iscr
    left join public.gruppi_maestri gm on p_vista = 'maestri' and gm.gruppo_id = iscr.gruppo_id
  ),
  agg as (
    select un.uid, count(*)::int as n, round(avg(cur.ora), 1) as livello, round(avg(cur.ora - cur.prima), 1) as delta
    from un left join cur on cur.allievo_id = un.allievo_id
    where un.uid is not null
    group by un.uid
  )
  select agg.uid,
         case when p_vista = 'gruppi'
              then (select g.nome from public.gruppi g where g.id = agg.uid)
              else (select btrim(m.nome || ' ' || coalesce(m.cognome, '')) from public.membri m where m.id = agg.uid)
         end,
         agg.n, agg.livello, agg.delta
  from agg
  order by 2, 1;
end $$;

-- Presenze % dell'area negli ultimi 30 giorni (lezioni chiuse); null se non ci sono lezioni.
create or replace function public.area_presenze_mese(p_centro uuid, p_area uuid)
returns int
language sql stable
set search_path = public
as $$
  select round(100.0 * count(*) filter (where p.presente) / nullif(count(*), 0))::int
  from public.lezioni l
  join public.gruppi g on g.id = l.gruppo_id
  join public.presenze p on p.lezione_id = l.id and p.centro_id = p_centro
  where l.centro_id = p_centro and g.area_id = p_area and l.stato = 'chiusa'
    and l.data > current_date - 30 and l.data <= current_date
$$;

-- Consensi del centro: quanti allievi, quanti hanno firmato ogni consenso (valore vero)
-- e quanti hanno il certificato medico ancora valido.
create or replace function public.consensi_riepilogo(p_centro uuid)
returns json
language sql stable
set search_path = public
as $$
  select json_build_object(
    'allievi', (select count(*) from public.allievi a where a.centro_id = p_centro),
    'privacy', (select count(*) from public.consensi c where c.centro_id = p_centro and c.tipo = 'privacy' and c.valore),
    'foto_video', (select count(*) from public.consensi c where c.centro_id = p_centro and c.tipo = 'foto_video' and c.valore),
    'ai', (select count(*) from public.consensi c where c.centro_id = p_centro and c.tipo = 'ai' and c.valore),
    'certificati_validi', (select count(*) from public.allievi a where a.centro_id = p_centro and a.certificato_scade >= current_date))
$$;

-- ---------------------------------------------------------------------------------------------
-- 8. Super admin: conteggi per centro e per ruolo (solo is_admin)
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_conteggi_centri()
returns table(centro_id uuid, n_membri bigint, n_allievi bigint)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
  select c.id,
         (select count(*) from public.membri m where m.centro_id = c.id),
         (select count(*) from public.allievi a where a.centro_id = c.id)
  from public.centri c;
end $$;

create or replace function public.admin_membri_conteggi_ruolo(p_centro uuid)
returns table(ruolo text, n bigint)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
  select m.ruolo::text, count(*) from public.membri m
  where m.centro_id = p_centro
  group by m.ruolo
  order by m.ruolo::text;
end $$;

-- ---------------------------------------------------------------------------------------------
-- 9. Pagamenti (C17): riepilogo in euro-centesimi e per famiglia (RLS di quote decide chi lo vede)
-- ---------------------------------------------------------------------------------------------
-- Perimetro: quote con scadenza tra p_dal e p_al, piu' le piu' arretrate non pagate (scadenza prima di p_dal).
-- Stato effettivo: una quota "attesa" gia' scaduta alla data p_oggi vale "scaduta".
-- Famiglia = il genitore con il membro_id minore tra quelli dell'allievo (senza genitori: l'allievo stesso).
-- Per ogni famiglia conta lo stato peggiore: scaduta, poi attesa, poi pagata.
create or replace function public.riepilogo_pagamenti(p_centro uuid, p_dal date, p_al date, p_oggi date default current_date)
returns json
language sql stable
set search_path = public
as $$
  with fam as (
    select af.allievo_id, (array_agg(af.membro_id order by af.membro_id))[1] as famiglia
    from public.allievi_famiglie af
    where af.centro_id = p_centro
    group by af.allievo_id
  ),
  qq as (
    select q.allievo_id, q.importo_cent,
           case when q.stato = 'pagata' then 'pagata'
                when q.stato = 'scaduta' or q.scade_il < coalesce(p_oggi, current_date) then 'scaduta'
                else 'attesa' end as eff
    from public.quote q
    where q.centro_id = p_centro
      and (q.scade_il between p_dal and p_al or (q.scade_il < p_dal and q.stato <> 'pagata'))
  ),
  fq as (
    select coalesce(fam.famiglia, qq.allievo_id) as f,
           min(case qq.eff when 'scaduta' then 0 when 'attesa' then 1 else 2 end) as peggio
    from qq left join fam on fam.allievo_id = qq.allievo_id
    group by 1
  )
  select json_build_object(
    'pagato_cent', coalesce((select sum(importo_cent) from qq where eff = 'pagata'), 0),
    'attesa_cent', coalesce((select sum(importo_cent) from qq where eff = 'attesa'), 0),
    'scaduto_cent', coalesce((select sum(importo_cent) from qq where eff = 'scaduta'), 0),
    'famiglie_pagate', (select count(*) from fq where peggio = 2),
    'famiglie_attesa', (select count(*) from fq where peggio = 1),
    'famiglie_scadute', (select count(*) from fq where peggio = 0))
$$;

-- ---------------------------------------------------------------------------------------------
-- 10. Scheda allievo: progressi, badge e report mensile (security invoker: la RLS limita a figli,
--     allievi del maestro, area o centro)
-- ---------------------------------------------------------------------------------------------
-- Per ogni competenza: voto (1-5) nell'ultimo test (ora), in quello precedente (prima) e il test precedente.
create or replace function public.progressi_allievo(p_centro uuid, p_allievo uuid)
returns table(colpo text, competenza text, ora int, prima int, periodo_prima text)
language sql stable
set search_path = public
as $$
  select x.colpo, x.competenza,
         (max(x.voto) filter (where x.rn = 1))::int,
         (max(x.voto) filter (where x.rn = 2))::int,
         max(x.test) filter (where x.rn = 2)
  from (
    select v.colpo, v.competenza, v.voto, v.test,
           row_number() over (partition by v.colpo, v.competenza order by v.data desc, v.test desc) as rn
    from public.valutazioni v
    where v.centro_id = p_centro and v.allievo_id = p_allievo
  ) x
  where x.rn <= 2
  group by x.colpo, x.competenza
  order by x.colpo, x.competenza
$$;

-- Badge dell'allievo: contatori e traguardi (ottenuto/valore/soglia) da mostrare nell'app dei ragazzi.
create or replace function public.badge_allievo(p_centro uuid, p_allievo uuid)
returns json
language sql stable
set search_path = public
as $$
  with pr as (
    select x.presente,
           row_number() over (order by x.data desc, x.ora desc nulls last, x.lid) as rn
    from (
      select p.presente, l.data, l.ora, l.id as lid
      from public.presenze p
      join public.lezioni l on l.id = p.lezione_id
      where p.centro_id = p_centro and p.allievo_id = p_allievo and l.stato = 'chiusa'
    ) x
  ),
  k as (
    select
      (select count(*) from pr where presente) as presenti,
      (select coalesce(min(rn) filter (where not presente) - 1, count(*)) from pr) as serie,
      (select count(distinct v.test) from public.valutazioni v where v.centro_id = p_centro and v.allievo_id = p_allievo) as test_fatti,
      (select count(*) from public.compiti_fatti cf
        where cf.centro_id = p_centro and cf.allievo_id = p_allievo and cf.fatto_il is not null) as compiti_fatti,
      (select count(*) from public.progressi_allievo(p_centro, p_allievo) g where g.ora > g.prima) as migliorate
  )
  select json_build_object(
    'lezioni_presenti', k.presenti,
    'serie_presenze', k.serie,
    'test_fatti', k.test_fatti,
    'compiti_fatti', k.compiti_fatti,
    'competenze_migliorate', k.migliorate,
    'badge', json_build_array(
      json_build_object('codice', 'costante', 'titolo', 'Costante', 'descrizione', '10 lezioni di fila senza assenze',
                        'ottenuto', k.serie >= 10, 'valore', k.serie, 'soglia', 10),
      json_build_object('codice', 'veterano', 'titolo', 'Veterano', 'descrizione', '50 lezioni frequentate',
                        'ottenuto', k.presenti >= 50, 'valore', k.presenti, 'soglia', 50),
      json_build_object('codice', 'primo_test', 'titolo', 'Primo test', 'descrizione', 'Hai fatto il tuo primo test',
                        'ottenuto', k.test_fatti >= 1, 'valore', k.test_fatti, 'soglia', 1),
      json_build_object('codice', 'in_crescita', 'titolo', 'In crescita', 'descrizione', '3 competenze migliorate dall''ultimo test',
                        'ottenuto', k.migliorate >= 3, 'valore', k.migliorate, 'soglia', 3),
      json_build_object('codice', 'compiti', 'titolo', 'Compiti a casa', 'descrizione', '10 compiti fatti',
                        'ottenuto', k.compiti_fatti >= 10, 'valore', k.compiti_fatti, 'soglia', 10)))
  from k
$$;

-- Report del mese (G4) per la famiglia: presenze, note del maestro, riassunti approvati, compiti,
-- valutazioni del mese e progressi. p_mese puo' essere un giorno qualsiasi del mese.
create or replace function public.report_mensile_allievo(p_centro uuid, p_allievo uuid, p_mese date)
returns json
language sql stable
set search_path = public
as $$
  with m as (
    select date_trunc('month', coalesce(p_mese, current_date)::timestamp)::date as ini,
           (date_trunc('month', coalesce(p_mese, current_date)::timestamp) + interval '1 month')::date as fin
  ),
  pr as (
    select p.presente, p.voto_rapido, p.nota, l.data, l.gruppo_id, l.riassunto, l.riassunto_ok
    from public.presenze p
    join public.lezioni l on l.id = p.lezione_id
    cross join m
    where p.centro_id = p_centro and p.allievo_id = p_allievo and l.stato = 'chiusa'
      and l.data >= m.ini and l.data < m.fin
  ),
  cp as (
    select c.id
    from public.compiti c
    cross join m
    where c.centro_id = p_centro and c.created_at >= m.ini and c.created_at < m.fin
      and (c.allievo_id = p_allievo
           or (c.allievo_id is null and c.gruppo_id in (select i.gruppo_id from public.iscrizioni i where i.allievo_id = p_allievo)))
  )
  select json_build_object(
    'mese', (select ini from m),
    'allievo', (select json_build_object('id', a.id, 'nome', a.nome, 'cognome', a.cognome)
                from public.allievi a where a.id = p_allievo and a.centro_id = p_centro),
    'presenze', (select json_build_object(
                   'lezioni', count(*),
                   'presenti', count(*) filter (where pr.presente),
                   'assenti', count(*) filter (where not pr.presente),
                   'perc', round(100.0 * count(*) filter (where pr.presente) / nullif(count(*), 0))::int)
                 from pr),
    'voto_rapido_medio', (select round(avg(pr.voto_rapido), 1) from pr),
    'note', coalesce((select json_agg(json_build_object('data', pr.data, 'nota', pr.nota) order by pr.data)
                      from pr where pr.nota is not null and btrim(pr.nota) <> ''), '[]'::json),
    'riassunti', coalesce((select json_agg(json_build_object('data', pr.data, 'gruppo', g.nome, 'riassunto', pr.riassunto) order by pr.data)
                           from pr join public.gruppi g on g.id = pr.gruppo_id
                           where pr.riassunto_ok and pr.riassunto is not null), '[]'::json),
    'compiti', (select json_build_object(
                  'assegnati', count(*),
                  'fatti', count(*) filter (where exists (
                     select 1 from public.compiti_fatti cf
                     where cf.compito_id = cp.id and cf.allievo_id = p_allievo and cf.fatto_il is not null)))
                from cp),
    'valutazioni', coalesce((select json_agg(json_build_object('test', v.test, 'colpo', v.colpo, 'competenza', v.competenza, 'voto', v.voto)
                                              order by v.data, v.colpo, v.competenza)
                             from public.valutazioni v cross join m
                             where v.centro_id = p_centro and v.allievo_id = p_allievo
                               and v.data >= m.ini and v.data < m.fin), '[]'::json),
    'progressi', coalesce((select json_agg(row_to_json(g)) from public.progressi_allievo(p_centro, p_allievo) g), '[]'::json))
$$;

-- ---------------------------------------------------------------------------------------------
-- 11. Permessi di esecuzione: mai agli anonimi; le due funzioni interne definer nemmeno agli autenticati
--     (le chiamano solo le RPC definer qui sopra, dopo il controllo del ruolo).
-- ---------------------------------------------------------------------------------------------
do $grant$
declare r record;
begin
  for r in
    select p.oid::regprocedure as f, p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any (array[
        'f_unaccent', '_jarr', '_blocco_fatto', '_allievi_ripetute', '_allievi_test', '_aderenza_maestri',
        '_conv_senza_risposta', 'panoramica_centro', 'riepilogo_maestri', 'ultime_lezioni_maestro',
        'statistiche_allievi_maestro', 'aderenza_gruppi', 'esercizi_cerca', 'allievi_stato_lista',
        'allievi_riepilogo', 'conteggi_gruppi', 'progressi_per_unita', 'area_presenze_mese',
        'consensi_riepilogo', 'admin_conteggi_centri', 'admin_membri_conteggi_ruolo',
        'riepilogo_pagamenti', 'progressi_allievo', 'badge_allievo', 'report_mensile_allievo'])
  loop
    execute format('revoke all on function %s from public, anon', r.f);
    if r.proname in ('_aderenza_maestri', '_conv_senza_risposta') then
      execute format('revoke all on function %s from authenticated', r.f);
    else
      execute format('grant execute on function %s to authenticated', r.f);
    end if;
  end loop;
end $grant$;
