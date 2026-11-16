-- 0005c_centri_rpc: RPC del contratto (security definer, search_path = public, controlli di ruolo dentro).
-- Convenzione: i parametri si chiamano come nel contratto, SENZA prefisso p_ (tranne dove indicato in docs/RPC.md).
-- Nelle funzioni con parametri che coincidono con nomi di colonna si usa `#variable_conflict use_column` e si
-- copiano i parametri in variabili v_* subito all'inizio: così nessuna query è ambigua.

-- ───────── utilità interne ─────────
create or replace function public._nome_membro(m uuid) returns text
language sql stable security definer set search_path = public as $$
  select btrim(x.nome || ' ' || coalesce(x.cognome, '')) from public.membri x where x.id = m
$$;

-- "mar 17 nov" senza dipendere dalla lingua del database
create or replace function public._data_it(d date) returns text
language sql immutable set search_path = public as $$
  select (array['lun','mar','mer','gio','ven','sab','dom'])[extract(isodow from d)::int] || ' ' || extract(day from d)::int || ' '
      || (array['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'])[extract(month from d)::int]
$$;

-- Quando consegnare un messaggio/avviso: subito, oppure alla fine del silenzio (di default 21:00 -> 8:00, ora di Roma).
create or replace function public._consegna_dopo_silenzio(imp jsonb) returns timestamptz
language plpgsql stable set search_path = public as $$
declare
  da time := coalesce(nullif(imp ->> 'silenzio_da', ''), '21:00')::time;
  a time := coalesce(nullif(imp ->> 'silenzio_a', ''), '08:00')::time;
  l timestamp := timezone('Europe/Rome', now());
  t time := timezone('Europe/Rome', now())::time;
  in_silenzio boolean;
  giorno date;
begin
  if da > a then in_silenzio := (t >= da or t < a); else in_silenzio := (t >= da and t < a); end if;
  if not in_silenzio then return now(); end if;
  giorno := case when da > a and t >= da then l::date + 1 else l::date end;
  return (giorno + a) at time zone 'Europe/Rome';
end $$;

-- Gruppi toccati da un elenco di destinatari ({tipo, valori}); null per "tutto il centro".
create or replace function public._gruppi_destinatari(p_centro uuid, p_dest jsonb) returns uuid[]
language plpgsql stable security definer set search_path = public as $$
declare v_tipo text := p_dest ->> 'tipo'; v_vals text[] := array(select jsonb_array_elements_text(coalesce(p_dest -> 'valori', '[]'::jsonb))); g uuid[];
begin
  if v_tipo = 'centro' then return null; end if;
  if v_tipo = 'fascia' then
    select array_agg(x.id) into g from public.gruppi x where x.centro_id = p_centro and x.attivo and x.fascia = any (v_vals);
  elsif v_tipo = 'gruppo' then
    select array_agg(x.id) into g from public.gruppi x where x.centro_id = p_centro and x.id::text = any (v_vals);
  elsif v_tipo = 'area' then
    select array_agg(x.id) into g from public.gruppi x where x.centro_id = p_centro and x.area_id::text = any (v_vals);
  elsif v_tipo = 'maestro' then
    select array_agg(distinct gm.gruppo_id) into g from public.gruppi_maestri gm where gm.centro_id = p_centro and gm.membro_id::text = any (v_vals);
  else
    raise exception 'Tipo di destinatari non valido' using errcode = '22023';
  end if;
  return coalesce(g, '{}');
end $$;

-- Persone (membri) che ricevono un avviso: famiglie e allievi dei gruppi, più maestri/responsabili quando ha senso.
create or replace function public.membri_destinatari(p_centro uuid, p_dest jsonb) returns setof uuid
language plpgsql stable security definer set search_path = public as $$
declare v_tipo text := p_dest ->> 'tipo'; v_vals text[] := array(select jsonb_array_elements_text(coalesce(p_dest -> 'valori', '[]'::jsonb))); g uuid[];
begin
  if v_tipo = 'centro' then
    return query select m.id from public.membri m where m.centro_id = p_centro and m.stato <> 'sospeso';
    return;
  end if;
  g := public._gruppi_destinatari(p_centro, p_dest);
  return query
    select distinct s.x from (
      select af.membro_id x from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
        where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date)
      union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id
        where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date) and a.membro_id is not null
      union select gm.membro_id from public.gruppi_maestri gm where gm.gruppo_id = any (g) and v_tipo <> 'maestro'
      union select m.id from public.membri m where v_tipo = 'area' and m.centro_id = p_centro and m.ruolo = 'responsabile_area' and m.area_id::text = any (v_vals)
    ) s join public.membri mm on mm.id = s.x and mm.stato <> 'sospeso'
    where s.x is not null;
end $$;

-- Copia Metodo, aree, corsi, permessi e impostazioni (e, se richiesto, i campi) da un centro a un altro.
-- Non copia persone, allievi, messaggi, pagamenti. Gli id dentro i jsonb (esercizi nei modelli, modelli nei programmi) vengono rimappati.
create or replace function public._rimappa_uuid(j jsonb) returns jsonb
language plpgsql stable as $$
declare r jsonb;
begin
  case jsonb_typeof(j)
    when 'string' then
      select to_jsonb(m.nuovo::text) into r from _clona_mappa m where m.old::text = (j #>> '{}');
      return coalesce(r, j);
    when 'array' then
      return coalesce((select jsonb_agg(public._rimappa_uuid(e)) from jsonb_array_elements(j) e), '[]'::jsonb);
    when 'object' then
      return coalesce((select jsonb_object_agg(k, public._rimappa_uuid(v)) from jsonb_each(j) as t(k, v)), '{}'::jsonb);
    else return j;
  end case;
end $$;

create or replace function public._clona_contenuti(p_src uuid, p_dst uuid, p_campi boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  create temp table if not exists _clona_mappa (old uuid primary key, nuovo uuid not null) on commit drop;
  truncate _clona_mappa;
  insert into _clona_mappa select a.id, gen_random_uuid() from public.aree a where a.centro_id = p_src;
  insert into _clona_mappa select x.id, gen_random_uuid() from public.esercizi x where x.centro_id = p_src and x.stato = 'approvato';
  insert into _clona_mappa select x.id, gen_random_uuid() from public.modelli_lezione x where x.centro_id = p_src;
  insert into _clona_mappa select x.id, gen_random_uuid() from public.programmi x where x.centro_id = p_src;

  insert into public.aree (id, centro_id, nome, sigla, fasce, ordine)
    select m.nuovo, p_dst, a.nome, a.sigla, a.fasce, a.ordine from public.aree a join _clona_mappa m on m.old = a.id where a.centro_id = p_src;
  -- i video stanno nella cartella del centro di origine e non si copiano: video_path resta vuoto
  insert into public.esercizi (id, centro_id, titolo, colpo, fasce, durata_min, materiale, descrizione, video_path, fonte, stato)
    select m.nuovo, p_dst, x.titolo, x.colpo, x.fasce, x.durata_min, x.materiale, x.descrizione, null, x.fonte, 'approvato'
    from public.esercizi x join _clona_mappa m on m.old = x.id where x.centro_id = p_src;
  insert into public.modelli_lezione (id, centro_id, nome, durata_min, blocchi)
    select m.nuovo, p_dst, x.nome, x.durata_min, public._rimappa_uuid(x.blocchi)
    from public.modelli_lezione x join _clona_mappa m on m.old = x.id where x.centro_id = p_src;
  insert into public.programmi (id, centro_id, nome, fascia, schema, anno, mesi, settimane_test)
    select m.nuovo, p_dst, x.nome, x.fascia, x.schema, x.anno, public._rimappa_uuid(x.mesi), x.settimane_test
    from public.programmi x join _clona_mappa m on m.old = x.id where x.centro_id = p_src;
  insert into public.linee_guida (centro_id, fascia, colpo, competenze, errori, regola, scala, bloccata)
    select p_dst, l.fascia, l.colpo, l.competenze,
      coalesce((select jsonb_agg(e - 'video_path') from jsonb_array_elements(case when jsonb_typeof(l.errori) = 'array' then l.errori else '[]'::jsonb end) e), '[]'::jsonb),
      l.regola, l.scala, l.bloccata
    from public.linee_guida l where l.centro_id = p_src;
  insert into public.corsi_formazione (centro_id, titolo, obbligatorio, moduli)
    select p_dst, c.titolo, c.obbligatorio, c.moduli from public.corsi_formazione c where c.centro_id = p_src;
  insert into public.corsi (centro_id, nome, gruppo_id, quota_cent, sconto_fratelli_pct, rate, scadenze)
    select p_dst, c.nome, null, c.quota_cent, c.sconto_fratelli_pct, c.rate, c.scadenze from public.corsi c where c.centro_id = p_src;
  insert into public.permessi_ruolo (centro_id, area_id, permessi)
    select p_dst, case when p.area_id is null then null else m.nuovo end, p.permessi
    from public.permessi_ruolo p left join _clona_mappa m on m.old = p.area_id
    where p.centro_id = p_src and (p.area_id is null or m.nuovo is not null);
  if p_campi then
    insert into public.campi (centro_id, numero, nome, superficie, copertura, luci, stato, note, x, y, w, h)
      select p_dst, c.numero, c.nome, c.superficie, c.copertura, c.luci, 'disponibile', c.note, c.x, c.y, c.w, c.h from public.campi c where c.centro_id = p_src;
  end if;
  -- impostazioni (silenzio, età, ecc.); gli eventi e i dati di pagamento sono del centro di origine
  update public.centri d set impostazioni = coalesce((select s.impostazioni - 'eventi' - 'pagamenti' from public.centri s where s.id = p_src), d.impostazioni)
    where d.id = p_dst;
end $$;

-- ───────── accesso e centri ─────────
-- Dati minimi per il manifest PWA e il marchio: leggibili anche senza accesso.
create or replace function public.centro_pubblico(slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'nome', c.nome, 'nome_app', c.nome_app,
                            'colore', c.colore, 'colore_ink', c.colore_ink, 'logo_path', c.logo_path)
  from public.centri c where c.slug = centro_pubblico.slug
$$;

create or replace function public.anteprima_invito(codice text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  i public.inviti%rowtype; c public.centri%rowtype; dt_nome text; gruppo_nome text; area_nome text; allievo_nome text;
begin
  select * into i from public.inviti where inviti.codice = upper(btrim(anteprima_invito.codice));
  if not found then return jsonb_build_object('valido', false, 'motivo', 'non_trovato'); end if;
  select * into c from public.centri where id = i.centro_id;
  if not found or c.stato = 'sospeso' then return jsonb_build_object('valido', false, 'motivo', 'non_trovato'); end if;
  if i.scade_il is not null and i.scade_il < now() then return jsonb_build_object('valido', false, 'motivo', 'scaduto'); end if;
  if i.usi_max is not null and i.usi >= i.usi_max then return jsonb_build_object('valido', false, 'motivo', 'esaurito'); end if;
  select m.nome || ' ' || coalesce(m.cognome, '') into dt_nome from public.membri m
    where m.centro_id = c.id and m.ruolo = 'dt' and m.stato <> 'sospeso' order by m.created_at limit 1;
  select g.nome into gruppo_nome from public.gruppi g where g.id = i.gruppo_id;
  select a.nome into area_nome from public.aree a where a.id = i.area_id;
  select al.nome into allievo_nome from public.allievi al where al.id = i.allievo_id;
  return jsonb_build_object(
    'valido', true, 'centro_nome', c.nome, 'citta', c.citta, 'dt_nome', btrim(dt_nome),
    'n_maestri', (select count(*) from public.membri m where m.centro_id = c.id and m.ruolo = 'maestro' and m.stato <> 'sospeso'),
    'n_gruppi', (select count(*) from public.gruppi g where g.centro_id = c.id and g.attivo),
    'n_allievi', (select count(*) from public.allievi al where al.centro_id = c.id),
    'ruolo', i.ruolo, 'scade_il', i.scade_il, 'gruppo_nome', gruppo_nome, 'area_nome', area_nome, 'allievo_nome', allievo_nome);
end $$;

create or replace function public.unisciti_con_codice(codice text) returns json
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_codice text := codice; v_user uuid := (select auth.uid());
  i public.inviti%rowtype; c public.centri%rowtype; p public.profiles%rowtype; v_membro uuid;
begin
  if v_user is null then raise exception 'Accedi per usare un codice' using errcode = '42501'; end if;
  select * into i from public.inviti where inviti.codice = upper(btrim(v_codice)) for update;
  if not found then raise exception 'Codice non valido' using errcode = 'P0002'; end if;
  if i.scade_il is not null and i.scade_il < now() then raise exception 'Codice scaduto' using errcode = 'P0001'; end if;
  if i.usi_max is not null and i.usi >= i.usi_max then raise exception 'Codice esaurito: ha già raggiunto il numero di usi' using errcode = 'P0001'; end if;
  select * into c from public.centri where id = i.centro_id;
  if c.stato = 'sospeso' then raise exception 'Codice non valido' using errcode = 'P0002'; end if;
  select * into p from public.profiles where id = v_user;

  select m.id into v_membro from public.membri m
    where m.centro_id = i.centro_id and m.user_id = v_user and m.ruolo = i.ruolo
      and coalesce(m.area_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(i.area_id, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_membro is null then
    insert into public.membri (centro_id, user_id, ruolo, nome, cognome, email, telefono, area_id, stato)
      values (i.centro_id, v_user, i.ruolo, coalesce(nullif(p.nome, ''), 'Nuovo'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, ''),
              case when i.ruolo = 'responsabile_area' then i.area_id end, 'attivo')
      returning id into v_membro;
  end if;
  if i.ruolo = 'genitore' and i.allievo_id is not null then
    insert into public.allievi_famiglie (centro_id, allievo_id, membro_id, relazione) values (i.centro_id, i.allievo_id, v_membro, 'genitore') on conflict do nothing;
  end if;
  if i.ruolo = 'allievo' and i.allievo_id is not null then
    update public.allievi set membro_id = v_membro where id = i.allievo_id and membro_id is null;
  end if;
  if i.ruolo = 'maestro' and i.gruppo_id is not null then
    insert into public.gruppi_maestri (centro_id, gruppo_id, membro_id, principale) values (i.centro_id, i.gruppo_id, v_membro, false) on conflict do nothing;
  end if;
  update public.inviti set usi = usi + 1 where id = i.id;
  return json_build_object('centro_slug', c.slug, 'ruolo', i.ruolo);
end $$;

create or replace function public.registra_centro(nome text, citta text, slug text, campi int default 4) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_nome text := btrim(nome); v_citta text := nullif(btrim(citta), ''); v_slug text := lower(btrim(slug)); v_campi int := coalesce(campi, 4);
  v_user uuid := (select auth.uid()); p public.profiles%rowtype; v_id uuid; v_modello uuid; n int;
begin
  if v_user is null then raise exception 'Accedi per registrare un centro' using errcode = '42501'; end if;
  if v_nome is null or v_nome = '' then raise exception 'Serve il nome del centro' using errcode = '22023'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 3 and 40 then
    raise exception 'Indirizzo non valido: usa 3-40 lettere minuscole, numeri e trattini' using errcode = '22023';
  end if;
  if v_campi < 0 or v_campi > 30 then raise exception 'Numero di campi non valido' using errcode = '22023'; end if;
  -- freno agli abusi: un utente non admin può creare pochi centri
  if not public.is_admin() and (select count(*) from public.centri where creato_da = v_user) >= 5 then
    raise exception 'Hai già registrato il numero massimo di centri' using errcode = '42501';
  end if;
  select * into p from public.profiles where id = v_user;
  insert into public.centri (slug, nome, nome_app, citta, stato, prova_fino, piano, creato_da)
    values (v_slug, v_nome, v_nome, v_citta, 'prova', current_date + 30, 'prova', v_user) returning id into v_id;
  -- chi registra il centro è titolare e direttore tecnico (responsabile tutela = DT)
  insert into public.membri (centro_id, user_id, ruolo, nome, cognome, email, telefono) values
    (v_id, v_user, 'titolare', coalesce(nullif(p.nome, ''), 'Titolare'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, '')),
    (v_id, v_user, 'dt', coalesce(nullif(p.nome, ''), 'Titolare'), nullif(p.cognome, ''), nullif(p.email, ''), nullif(p.telefono, ''));
  for n in 1..v_campi loop
    insert into public.campi (centro_id, numero, nome) values (v_id, n, 'Campo ' || n);
  end loop;
  select id into v_modello from public.centri where centri.slug = 'matchpoint-modello';
  if v_modello is not null then perform public._clona_contenuti(v_modello, v_id, false); end if;
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'centro_slug', v_slug);
end $$;

create or replace function public.clona_centro(sorgente uuid, nome text, slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_src uuid := sorgente; v_nome text := btrim(nome); v_slug text := lower(btrim(slug)); v_id uuid; s public.centri%rowtype;
begin
  if not public.is_admin() then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  select * into s from public.centri where id = v_src;
  if not found then raise exception 'Centro di origine non trovato' using errcode = 'P0002'; end if;
  if v_nome is null or v_nome = '' then raise exception 'Serve il nome del centro' using errcode = '22023'; end if;
  insert into public.centri (slug, nome, nome_app, citta, colore, colore_ink, stato, prova_fino, piano, creato_da)
    values (v_slug, v_nome, v_nome, null, s.colore, s.colore_ink, 'prova', current_date + 30, 'prova', (select auth.uid()))
    returning id into v_id;
  perform public._clona_contenuti(v_src, v_id, true);
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'centro_slug', v_slug);
end $$;

-- ───────── messaggi, avvisi, notifiche ─────────
create or replace function public.invia_messaggio(conversazione uuid, testo text) returns public.messaggi
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_conv uuid := conversazione; v_testo text := btrim(testo);
  pa public.partecipanti%rowtype; cv public.conversazioni%rowtype; c public.centri%rowtype; m public.messaggi%rowtype;
  v_cons timestamptz; v_nome text;
begin
  select * into cv from public.conversazioni where id = v_conv;
  if not found then raise exception 'Conversazione non trovata' using errcode = 'P0002'; end if;
  select * into pa from public.partecipanti where conversazione_id = v_conv and membro_id = any (public.miei_membri()) order by sola_lettura limit 1;
  if not found then raise exception 'Non partecipi a questa conversazione' using errcode = '42501'; end if;
  if pa.sola_lettura then raise exception 'In questa conversazione puoi solo leggere' using errcode = '42501'; end if;
  if v_testo is null or char_length(v_testo) = 0 then raise exception 'Il messaggio è vuoto' using errcode = '22023'; end if;
  if char_length(v_testo) > 4000 then raise exception 'Il messaggio è troppo lungo' using errcode = '22023'; end if;
  select * into c from public.centri where id = cv.centro_id;
  v_cons := public._consegna_dopo_silenzio(c.impostazioni);
  insert into public.messaggi (centro_id, conversazione_id, autore_id, testo, consegna_il)
    values (cv.centro_id, v_conv, pa.membro_id, v_testo, v_cons) returning * into m;
  v_nome := public._nome_membro(pa.membro_id);
  -- una sola notifica non letta per conversazione, così 200 messaggi non diventano 200 notifiche
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, consegna_il, rif_id)
    select cv.centro_id, p.membro_id, 'messaggio', v_nome, left(v_testo, 140), '/c/' || c.slug || '/chat/' || v_conv, v_nome, v_cons, v_conv
    from public.partecipanti p
    where p.conversazione_id = v_conv and p.membro_id <> pa.membro_id
      and not exists (select 1 from public.notifiche n where n.membro_id = p.membro_id and n.tipo = 'messaggio' and n.rif_id = v_conv and n.letta_il is null);
  return m;
end $$;

create or replace function public.conta_destinatari(centro uuid, destinatari jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_c uuid := centro; v_d jsonb := destinatari; g uuid[]; v_al int; v_fa int; v_ma int;
begin
  if not (public.is_admin() or v_c = any (public.centri_staff()) or v_c = any (public.centri_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  g := public._gruppi_destinatari(v_c, v_d);
  if g is null then
    select count(distinct i.allievo_id) into v_al from public.iscrizioni i where i.centro_id = v_c and (i.al is null or i.al >= current_date);
    select count(distinct af.membro_id) into v_fa from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
      where i.centro_id = v_c and (i.al is null or i.al >= current_date);
    select count(*) into v_ma from public.membri m where m.centro_id = v_c and m.ruolo = 'maestro' and m.stato <> 'sospeso';
  else
    select count(distinct i.allievo_id) into v_al from public.iscrizioni i where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date);
    select count(distinct af.membro_id) into v_fa from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
      where i.gruppo_id = any (g) and (i.al is null or i.al >= current_date);
    select count(distinct gm.membro_id) into v_ma from public.gruppi_maestri gm where gm.gruppo_id = any (g);
  end if;
  return jsonb_build_object('allievi', v_al, 'famiglie', v_fa, 'maestri', v_ma);
end $$;

create or replace function public.invia_avviso(titolo text, testo text, destinatari jsonb, conferma boolean default false,
  promemoria boolean default false, consegna_il timestamptz default null, centro uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_titolo text := btrim(titolo); v_testo text := btrim(testo); v_dest jsonb := destinatari; v_conf boolean := coalesce(conferma, false);
  v_prom boolean := coalesce(promemoria, false); v_cons timestamptz := consegna_il; v_centro uuid := centro;
  v_cs uuid[]; v_me uuid; c public.centri%rowtype; v_tipo text; v_vals text[]; v_ok boolean := false; v_av uuid; v_n int; v_nome text;
begin
  if v_titolo is null or v_titolo = '' or v_testo is null or v_testo = '' then raise exception 'Servono titolo e testo' using errcode = '22023'; end if;
  v_dest := coalesce(v_dest, '{"tipo":"centro","valori":[]}'::jsonb);
  if v_centro is null then
    select array_agg(distinct m.centro_id) into v_cs from public.membri m
      where m.id = any (public.miei_membri()) and m.ruolo in ('titolare', 'dt', 'segreteria', 'responsabile_area', 'maestro');
    if coalesce(array_length(v_cs, 1), 0) = 1 then v_centro := v_cs[1];
    else raise exception 'Non riesco a capire per quale centro scrivi: indica il centro' using errcode = '22023'; end if;
  end if;
  select * into c from public.centri where id = v_centro;
  if not found then raise exception 'Centro non trovato' using errcode = 'P0002'; end if;
  v_tipo := v_dest ->> 'tipo';
  v_vals := array(select jsonb_array_elements_text(coalesce(v_dest -> 'valori', '[]'::jsonb)));
  -- chi può scrivere a chi: direzione e segreteria a tutti; responsabile alla sua area; maestro ai suoi gruppi
  if public.is_admin() or v_centro = any (public.centri_amm()) then v_ok := true; end if;
  if not v_ok and v_centro = any (public.centri_staff()) then
    if v_tipo = 'area' and v_vals <@ array(select x::text from unnest(public.aree_permesso('avvisi')) x) then v_ok := true;
    elsif v_tipo = 'gruppo' and not exists (
        select 1 from unnest(v_vals) gv left join public.gruppi g on g.id::text = gv
        where g.area_id is null or g.area_id <> all (public.aree_permesso('avvisi'))) then v_ok := true; end if;
  end if;
  if not v_ok and v_centro = any (public.centri_maestro()) then
    if v_tipo = 'gruppo' and v_vals <@ array(select x::text from unnest(public.miei_gruppi_maestro()) x) then v_ok := true;
    elsif v_tipo = 'maestro' and v_vals <@ array(select x::text from unnest(public.miei_membri()) x) then v_ok := true; end if;
  end if;
  if not v_ok then raise exception 'Non puoi scrivere a questi destinatari' using errcode = '42501'; end if;

  v_me := public.mio_membro(v_centro);
  v_nome := public._nome_membro(v_me);
  v_cons := coalesce(v_cons, public._consegna_dopo_silenzio(c.impostazioni));
  insert into public.avvisi (centro_id, autore_id, titolo, testo, destinatari, conferma, promemoria, consegna_il)
    values (v_centro, v_me, v_titolo, v_testo, v_dest, v_conf, v_prom, v_cons) returning id into v_av;
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, mittente, consegna_il, rif_id)
    select v_centro, d, 'avviso', v_titolo, left(v_testo, 240), v_nome, v_cons, v_av
    from public.membri_destinatari(v_centro, v_dest) d where d <> all (public.miei_membri());
  get diagnostics v_n = row_count;
  return jsonb_build_object('avviso_id', v_av, 'destinatari', v_n, 'consegna_il', v_cons);
end $$;

create or replace function public.letture_avvisi(avvisi uuid[])
returns table (avviso_id uuid, letti bigint, totale bigint, letti_24h bigint)
language sql stable security definer set search_path = public as $$
  select a.id,
    (select count(*) from public.avvisi_letture l where l.avviso_id = a.id),
    (select count(*) from public.notifiche n where n.rif_id = a.id and n.tipo = 'avviso'),
    (select count(*) from public.avvisi_letture l where l.avviso_id = a.id and l.letto_il < a.consegna_il + interval '24 hours')
  from public.avvisi a
  where a.id = any (letture_avvisi.avvisi)
    and (public.is_admin() or a.centro_id = any (public.centri_staff()) or a.autore_id = any (public.miei_membri()))
$$;

create or replace function public.ricorda_avviso(avviso uuid) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_av uuid := avviso; a public.avvisi%rowtype; v_n int;
begin
  select * into a from public.avvisi where id = v_av;
  if not found then raise exception 'Avviso non trovato' using errcode = 'P0002'; end if;
  if not (public.is_admin() or a.centro_id = any (public.centri_dt()) or a.autore_id = any (public.miei_membri())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  -- il promemoria è una notifica "sistema": non altera il conteggio dei destinatari (solo le notifiche "avviso")
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, mittente, rif_id)
    select a.centro_id, n.membro_id, 'sistema', 'Promemoria: ' || a.titolo, left(a.testo, 240), public._nome_membro(a.autore_id), a.id
    from public.notifiche n
    where n.rif_id = a.id and n.tipo = 'avviso'
      and not exists (select 1 from public.avvisi_letture l where l.avviso_id = a.id and l.membro_id = n.membro_id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ───────── campi ─────────
create or replace function public.cambia_campo(gruppo uuid, data date, campo_a uuid, motivo text, avvisa boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_g uuid := gruppo; v_data date := data; v_ca uuid := campo_a; v_motivo text := nullif(btrim(motivo), ''); v_avvisa boolean := coalesce(avvisa, true);
  g public.gruppi%rowtype; k public.campi%rowtype; v_slug text; v_me uuid; v_da uuid; v_cambio uuid; v_confl text; v_n int; v_nome text; v_testo text; v_nome_da text;
begin
  select * into g from public.gruppi where id = v_g;
  if not found then raise exception 'Gruppo non trovato' using errcode = 'P0002'; end if;
  if not (public.is_admin() or g.centro_id = any (public.centri_dt()) or g.area_id = any (public.aree_permesso('campi'))) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into k from public.campi where id = v_ca and centro_id = g.centro_id;
  if not found then raise exception 'Campo non trovato' using errcode = 'P0002'; end if;
  if k.stato <> 'disponibile' then raise exception 'Il Campo % non è disponibile', k.numero using errcode = 'P0001'; end if;
  if not (extract(isodow from v_data)::int = any (g.giorni)) then raise exception 'Il gruppo non si allena in questa data' using errcode = '22023'; end if;
  select cc.campo_da into v_da from public.cambi_campo cc where cc.gruppo_id = v_g and cc.data = v_data;
  if not found then v_da := g.campo_id; end if;
  if v_da is not distinct from v_ca then raise exception 'Il gruppo si allena già su questo campo' using errcode = '22023'; end if;
  -- conflitti: un altro gruppo, quel giorno, sullo stesso campo e con orario sovrapposto (si conta anche il suo cambio campo)
  select o.nome || ' alle ' || to_char(o.ora, 'HH24:MI') into v_confl
  from public.gruppi o
  where o.centro_id = g.centro_id and o.id <> g.id and o.attivo and extract(isodow from v_data)::int = any (o.giorni) and o.ora is not null
    and coalesce((select cc.campo_a from public.cambi_campo cc where cc.gruppo_id = o.id and cc.data = v_data), o.campo_id) = v_ca
    and o.ora < g.ora + make_interval(mins => g.durata_min) and g.ora < o.ora + make_interval(mins => o.durata_min)
  limit 1;
  if v_confl is not null then raise exception 'Conflitto: il Campo % è occupato da % ', k.numero, v_confl using errcode = 'P0001'; end if;

  v_me := public.mio_membro(g.centro_id);
  insert into public.cambi_campo (centro_id, gruppo_id, data, campo_da, campo_a, motivo, deciso_da, avvisa)
    values (g.centro_id, v_g, v_data, v_da, v_ca, v_motivo, v_me, v_avvisa)
    on conflict (gruppo_id, data) do update set campo_a = excluded.campo_a, motivo = excluded.motivo, deciso_da = excluded.deciso_da, avvisa = excluded.avvisa
    returning id into v_cambio;
  update public.lezioni l set campo_id = v_ca where l.gruppo_id = v_g and l.data = v_data and l.stato = 'programmata';
  insert into public.registro (centro_id, membro_id, azione, oggetto, dettagli)
    values (g.centro_id, v_me, 'cambio_campo', g.nome, jsonb_build_object('data', v_data, 'da', v_da, 'a', v_ca, 'motivo', v_motivo, 'avvisa', v_avvisa));

  select c.slug into v_slug from public.centri c where c.id = g.centro_id;
  select 'Campo ' || c.numero into v_nome_da from public.campi c where c.id = v_da;
  v_nome := public._nome_membro(v_me);
  v_testo := g.nome || ' · ' || public._data_it(v_data) || ' · ' || coalesce(v_nome_da, 'campo abituale') || ' → Campo ' || k.numero
             || coalesce(' · motivo: ' || v_motivo, '');
  delete from public.notifiche n where n.rif_id = v_cambio and n.tipo = 'cambio_campo';
  -- i maestri del gruppo sono sempre avvisati; allievi e famiglie solo se "avvisa" è acceso
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
    select g.centro_id, s.x, 'cambio_campo', 'Cambio campo', v_testo,
           '/c/' || v_slug || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
           v_nome, v_cambio
    from (
      select gm.membro_id x from public.gruppi_maestri gm where gm.gruppo_id = v_g
      union select af.membro_id from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
        where v_avvisa and i.gruppo_id = v_g and (i.al is null or i.al >= current_date)
      union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id
        where v_avvisa and i.gruppo_id = v_g and (i.al is null or i.al >= current_date) and a.membro_id is not null
    ) s join public.membri m on m.id = s.x and m.stato <> 'sospeso';
  get diagnostics v_n = row_count;
  return jsonb_build_object('cambio_id', v_cambio, 'campo_da', v_da, 'campo_a', v_ca, 'notificati', v_n);
end $$;

-- compatibilità con il client già scritto (CampiOrari usa i nomi con prefisso p_); l'argomento finale è solo per distinguere la firma
create or replace function public.cambia_campo(p_gruppo uuid, p_data date, p_campo_a uuid, p_motivo text, p_avvisa boolean default true, p_compat int default 0) returns jsonb
language sql security definer set search_path = public as $$
  select public.cambia_campo(p_gruppo, p_data, p_campo_a, p_motivo, p_avvisa)
$$;

create or replace function public.letture_cambio_campo(cambio uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_c uuid := cambio; cc public.cambi_campo%rowtype;
begin
  select * into cc from public.cambi_campo where id = v_c;
  if not found then raise exception 'Cambio non trovato' using errcode = 'P0002'; end if;
  if not (public.is_admin() or cc.centro_id = any (public.centri_staff()) or cc.gruppo_id = any (public.miei_gruppi_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return (select jsonb_build_object(
    'allievi_letti', count(*) filter (where m.ruolo = 'allievo' and n.letta_il is not null),
    'allievi_tot', count(*) filter (where m.ruolo = 'allievo'),
    'famiglie_letti', count(*) filter (where m.ruolo = 'genitore' and n.letta_il is not null),
    'famiglie_tot', count(*) filter (where m.ruolo = 'genitore'))
    from public.notifiche n join public.membri m on m.id = n.membro_id where n.rif_id = v_c and n.tipo = 'cambio_campo');
end $$;

-- ───────── assenze, segnalazioni, lezioni ─────────
create or replace function public.avvisa_assenza(allievo uuid, data date, motivo text, testo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_al uuid := allievo; v_data date := data; v_motivo text := motivo; v_testo text := nullif(btrim(testo), '');
  a public.allievi%rowtype; c public.centri%rowtype; v_me uuid; v_famiglia boolean; v_gruppi uuid[]; r record; v_ore int; v_n int := 0; v_nome text; v_titolo text;
begin
  select * into a from public.allievi where id = v_al;
  if not found then raise exception 'Allievo non trovato' using errcode = 'P0002'; end if;
  v_famiglia := v_al = any (public.miei_allievi_famiglia());
  if not (public.is_admin() or v_famiglia or a.centro_id = any (public.centri_amm()) or v_al = any (public.miei_allievi_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if v_motivo not in ('malato', 'scuola', 'viaggio', 'altro') then raise exception 'Motivo non valido' using errcode = '22023'; end if;
  select * into c from public.centri where id = a.centro_id;
  v_ore := coalesce((c.impostazioni ->> 'assenza_entro_ore')::int, 2);
  select array_agg(g.id) into v_gruppi from public.iscrizioni i join public.gruppi g on g.id = i.gruppo_id
    where i.allievo_id = v_al and (i.al is null or i.al >= v_data) and i.dal <= v_data and g.attivo and extract(isodow from v_data)::int = any (g.giorni);
  -- la famiglia deve avvisare almeno N ore prima (default 2); segreteria e maestri possono registrare anche dopo
  if v_famiglia and not (public.is_admin() or a.centro_id = any (public.centri_amm())) then
    for r in select g.nome, g.ora from public.gruppi g where g.id = any (coalesce(v_gruppi, '{}')) and g.ora is not null loop
      if now() > ((v_data + r.ora) at time zone 'Europe/Rome') - make_interval(hours => v_ore) then
        raise exception 'Troppo tardi: serve avvisare almeno % ore prima. Avvisa il maestro o la segreteria.', v_ore using errcode = 'P0001';
      end if;
    end loop;
  end if;
  v_me := public.mio_membro(a.centro_id);
  if v_gruppi is null then
    insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da) values (a.centro_id, v_al, v_data, null, v_motivo, v_testo, v_me)
      on conflict (allievo_id, data, (coalesce(gruppo_id, '00000000-0000-0000-0000-000000000000'::uuid))) do update set motivo = excluded.motivo, testo = excluded.testo;
    v_n := 1;
  else
    insert into public.assenze (centro_id, allievo_id, data, gruppo_id, motivo, testo, avvisato_da)
      select a.centro_id, v_al, v_data, x, v_motivo, v_testo, v_me from unnest(v_gruppi) x
      on conflict (allievo_id, data, (coalesce(gruppo_id, '00000000-0000-0000-0000-000000000000'::uuid))) do update set motivo = excluded.motivo, testo = excluded.testo;
    v_n := array_length(v_gruppi, 1);
  end if;
  v_nome := btrim(a.nome || ' ' || coalesce(a.cognome, ''));
  v_titolo := 'Assenza: ' || v_nome;
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
    select a.centro_id, s.x, 'assenza', v_titolo,
           public._data_it(v_data) || ' · ' || case v_motivo when 'malato' then 'malato' when 'scuola' then 'scuola o compiti' when 'viaggio' then 'in viaggio' else 'altro' end
             || coalesce(' · ' || v_testo, ''),
           '/c/' || c.slug || case m.ruolo when 'maestro' then '/maestro/notifiche' when 'allievo' then '/allievo/notifiche' else '/genitore' end,
           coalesce(public._nome_membro(v_me), v_nome), v_al
    from (
      select gm.membro_id x from public.gruppi_maestri gm where gm.gruppo_id = any (coalesce(v_gruppi, '{}'))
      union select af.membro_id from public.allievi_famiglie af where af.allievo_id = v_al
      union select a.membro_id where a.membro_id is not null
    ) s join public.membri m on m.id = s.x and m.stato <> 'sospeso'
    where s.x <> all (public.miei_membri());
  return jsonb_build_object('assenze', v_n, 'gruppi', to_jsonb(coalesce(v_gruppi, '{}')));
end $$;

create or replace function public.segnala(categoria text, testo text, anonima boolean default false, per_allievo uuid default null,
  riguarda_dt boolean default false, centro uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_cat text := btrim(categoria); v_testo text := btrim(testo); v_anon boolean := coalesce(anonima, false); v_al uuid := per_allievo;
  v_rdt boolean := coalesce(riguarda_dt, false); v_centro uuid := centro; v_me uuid; v_id uuid; v_pri text; v_slug text; v_cs uuid[];
begin
  if v_cat is null or v_cat = '' or v_testo is null or v_testo = '' then raise exception 'Servono categoria e testo' using errcode = '22023'; end if;
  if v_centro is null and v_al is not null then select a.centro_id into v_centro from public.allievi a where a.id = v_al; end if;
  if v_centro is null then
    v_cs := public.miei_centri();
    if coalesce(array_length(v_cs, 1), 0) = 1 then v_centro := v_cs[1];
    else raise exception 'Non riesco a capire per quale centro scrivi: indica il centro' using errcode = '22023'; end if;
  end if;
  v_me := public.mio_membro(v_centro);
  if v_me is null then raise exception 'Non fai parte di questo centro' using errcode = '42501'; end if;
  if v_al is not null and not exists (select 1 from public.allievi a where a.id = v_al and a.centro_id = v_centro) then
    raise exception 'Allievo non trovato' using errcode = 'P0002';
  end if;
  v_pri := case when v_rdt or v_cat in ('adulto', 'sicurezza', 'bullismo', 'chat', 'disagio', 'infortunio') then 'alta'
                when v_cat = 'gruppo' then 'media' else 'bassa' end;
  -- anonima verso tutti: non si salva l'autore
  insert into public.segnalazioni (centro_id, autore_id, anonima, per_allievo_id, categoria, testo, priorita, riguarda_dt)
    values (v_centro, case when v_anon then null else v_me end, v_anon, v_al, v_cat, v_testo, v_pri, v_rdt) returning id into v_id;
  select c.slug into v_slug from public.centri c where c.id = v_centro;
  -- le segnalazioni su DT arrivano solo al titolare; le altre al DT e al titolare, mai ai maestri
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
    select v_centro, m.id, 'segnalazione', 'Nuova segnalazione', v_cat, '/c/' || v_slug || '/dt/segnalazioni',
           case when v_anon then null else public._nome_membro(v_me) end, v_id
    from public.membri m
    where m.centro_id = v_centro and m.stato <> 'sospeso' and m.ruolo = any (case when v_rdt then array['titolare']::public.ruolo_centro[] else array['titolare', 'dt']::public.ruolo_centro[] end);
  return v_id;
end $$;

create or replace function public.chiudi_lezione(lezione uuid, svolto jsonb, presenze jsonb, compito jsonb default null, motivi jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_l uuid := lezione; v_sv jsonb := svolto; v_pr jsonb := presenze; v_co jsonb := compito; v_mo jsonb := motivi;
  z public.lezioni%rowtype; v_slug text; v_me uuid; v_maestro uuid; e jsonb; v_titolo text; v_cid uuid; v_nuovo boolean := false; v_al uuid;
begin
  select * into z from public.lezioni where id = v_l;
  if not found then raise exception 'Lezione non trovata' using errcode = 'P0002'; end if;
  if not (public.is_admin() or z.centro_id = any (public.centri_dt()) or z.gruppo_id = any (public.miei_gruppi_maestro()) or z.maestro_id = any (public.miei_membri())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  v_me := public.mio_membro(z.centro_id);
  select m.id into v_maestro from public.membri m where m.id = any (public.miei_membri()) and m.centro_id = z.centro_id and m.ruolo = 'maestro' limit 1;
  v_titolo := btrim(coalesce(v_co ->> 'titolo', ''));
  update public.lezioni set
    svolto = coalesce(v_sv, svolto), stato = 'chiusa', maestro_id = coalesce(maestro_id, v_maestro),
    motivi_scostamento = coalesce(v_mo, motivi_scostamento), compito = coalesce(nullif(v_titolo, ''), compito)
    where id = v_l;
  for e in select * from jsonb_array_elements(coalesce(v_pr, '[]'::jsonb)) loop
    insert into public.presenze (centro_id, lezione_id, allievo_id, presente, voto_rapido, nota)
      select z.centro_id, v_l, a.id, coalesce((e ->> 'presente')::boolean, true), nullif(e ->> 'voto_rapido', '')::int, nullif(e ->> 'nota', '')
      from public.allievi a where a.id = (e ->> 'allievo_id')::uuid and a.centro_id = z.centro_id
      on conflict (lezione_id, allievo_id) do update set presente = excluded.presente, voto_rapido = excluded.voto_rapido, nota = excluded.nota;
  end loop;
  if v_titolo <> '' then
    v_al := nullif(v_co ->> 'allievo_id', '')::uuid;
    select c.id into v_cid from public.compiti c where c.lezione_id = v_l limit 1;
    if v_cid is null then
      insert into public.compiti (centro_id, allievo_id, gruppo_id, maestro_id, titolo, durata_min, esercizio_id, scadenza, lezione_id)
        values (z.centro_id, v_al, case when v_al is null then z.gruppo_id end, coalesce(z.maestro_id, v_maestro, v_me), v_titolo,
                nullif(v_co ->> 'durata_min', '')::int, nullif(v_co ->> 'esercizio_id', '')::uuid, nullif(v_co ->> 'scadenza', '')::date, v_l)
        returning id into v_cid;
      v_nuovo := true;
    else
      update public.compiti set titolo = v_titolo, durata_min = nullif(v_co ->> 'durata_min', '')::int,
        esercizio_id = nullif(v_co ->> 'esercizio_id', '')::uuid, scadenza = nullif(v_co ->> 'scadenza', '')::date where id = v_cid;
    end if;
    if v_nuovo then
      select c.slug into v_slug from public.centri c where c.id = z.centro_id;
      insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente, rif_id)
        select z.centro_id, s.x, 'compito', 'Nuovo compito', v_titolo,
               '/c/' || v_slug || case m.ruolo when 'allievo' then '/allievo/compiti' else '/genitore' end,
               public._nome_membro(coalesce(z.maestro_id, v_maestro, v_me)), v_cid
        from (
          select af.membro_id x from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
            where (v_al is null and i.gruppo_id = z.gruppo_id and (i.al is null or i.al >= current_date)) or i.allievo_id = v_al
          union select a.membro_id from public.iscrizioni i join public.allievi a on a.id = i.allievo_id
            where ((v_al is null and i.gruppo_id = z.gruppo_id and (i.al is null or i.al >= current_date)) or i.allievo_id = v_al) and a.membro_id is not null
        ) s join public.membri m on m.id = s.x and m.stato <> 'sospeso';
    end if;
  end if;
end $$;

-- Percentuale (0-100) dei blocchi "bloccati" del piano svolti davvero come da piano (non sostituiti né saltati),
-- sulle lezioni chiuse dell'ultimo anno. null se il maestro non ha ancora blocchi bloccati da valutare.
create or replace function public.aderenza_maestro(membro uuid) returns numeric
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_m uuid := membro; v_c uuid; v_r numeric;
begin
  select m.centro_id into v_c from public.membri m where m.id = v_m;
  if v_c is null or not (public.is_admin() or v_c = any (public.centri_staff()) or v_m = any (public.miei_membri())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select round(100.0 * count(*) filter (where t.fatto) / nullif(count(*), 0), 1) into v_r from (
    select exists (
        select 1 from jsonb_array_elements(l.svolto) s
        where (s ->> 'indice')::int = b.ord - 1 and coalesce((s ->> 'fatto')::boolean, false)
          and not coalesce((s ->> 'sostituito')::boolean, false) and not coalesce((s ->> 'saltato')::boolean, false)) as fatto
    from public.lezioni l cross join lateral jsonb_array_elements(l.piano) with ordinality b (val, ord)
    where l.maestro_id = v_m and l.stato = 'chiusa' and l.data >= current_date - 365
      and coalesce(b.val ->> 'modo', 'bloccato') = 'bloccato'
  ) t;
  return v_r;
end $$;

-- ───────── permessi di esecuzione ─────────
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      '_nome_membro','_data_it','_consegna_dopo_silenzio','_gruppi_destinatari','membri_destinatari','_rimappa_uuid','_clona_contenuti',
      'centro_pubblico','anteprima_invito','unisciti_con_codice','registra_centro','clona_centro','invia_messaggio','conta_destinatari',
      'invia_avviso','letture_avvisi','ricorda_avviso','cambia_campo','letture_cambio_campo','avvisa_assenza','segnala','chiudi_lezione','aderenza_maestro'])
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    if f.proname in ('_gruppi_destinatari','membri_destinatari','_rimappa_uuid','_clona_contenuti') then
      execute format('revoke all on function %s from authenticated', f.sig);
    else
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    if f.proname = 'centro_pubblico' then execute format('grant execute on function %s to anon', f.sig); end if;
  end loop;
end $$;
