-- 0011_correzioni_permessi: correzioni ai permessi emerse dalle prove con i ruoli reali.
--   1. programmi e linee_guida leggibili (sola lettura) anche da genitori e allievi del centro
--   2. RPC notifica_membri: il maestro puo' notificare solo DT/titolare e le famiglie dei suoi allievi
--   3. membri: tutti i membri del centro vedono le righe dello staff (nomi di DT e maestri)
--   4. inviti: anche segreteria e responsabile d'area con permesso 'iscrizioni' (solo genitore e allievo)
--   5. conta_destinatari: solo iscrizioni gia' iniziate (dal <= oggi)
--   6. esercizi_cerca: filtro p_stato (default 'approvato') e colpo tollerante
-- Solo alter policy e create or replace (piu' la sostituzione di una funzione che cambia firma).

-- Helper: centri di cui l'utente e' membro attivo con un ruolo qualsiasi.
create or replace function public.centri_membro()
returns uuid[] language sql stable security definer set search_path = public
as $$ select public.centri_ruolo('{titolare,dt,responsabile_area,segreteria,maestro,genitore,allievo}') $$;
revoke all on function public.centri_membro() from public, anon;
grant execute on function public.centri_membro() to authenticated, service_role;

-- 1. Programmi e linee guida: lettura a tutti i membri del centro (la scrittura resta al DT).
alter policy "programmi: leggo" on public.programmi
  using ((select public.is_admin()) or centro_id = any ((select public.centri_membro())::uuid[]));
alter policy "linee_guida: leggo" on public.linee_guida
  using ((select public.is_admin()) or centro_id = any ((select public.centri_membro())::uuid[]));

-- 3. Membri: ogni membro del centro vede le righe dello staff, cosi' famiglie e maestri leggono i nomi.
alter policy "membri: leggo" on public.membri
  using (
    (select public.is_admin())
    or centro_id = any ((select public.centri_staff())::uuid[])
    or user_id = (select auth.uid())
    or id = any ((select public.membri_vicini())::uuid[])
    or (ruolo in ('titolare','dt','responsabile_area','maestro','segreteria')
        and centro_id = any ((select public.centri_membro())::uuid[]))
  );

-- 4. Inviti: segreteria e responsabile d'area con permesso 'iscrizioni' possono creare inviti per genitori e allievi.
alter policy "inviti: inserisco" on public.inviti
  with check (
    (select public.is_admin())
    or (centro_id = any ((select public.centri_dt())::uuid[])
        and (ruolo <> 'titolare' or centro_id = any ((select public.centri_titolare())::uuid[])))
    or (ruolo in ('genitore','allievo')
        and (centro_id = any ((select public.centri_amm())::uuid[])
             or centro_id = any ((select public.centri_permesso('iscrizioni'))::uuid[])))
    or (ruolo = 'allievo'
        and allievo_id = any ((select public.miei_figli())::uuid[])
        and creato_da = any ((select public.miei_membri())::uuid[]))
  );

-- 2. Notifiche dal maestro (e da chiunque) con controllo dei destinatari.
create or replace function public.notifica_membri(
  p_centro uuid, p_membri uuid[], p_tipo text, p_titolo text, p_testo text default null, p_link text default null)
returns int language plpgsql security definer set search_path = public
as $$
declare v_staff boolean; v_maestro boolean; v_me uuid; v_n int;
begin
  if (select auth.uid()) is null then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  v_staff := public.is_admin() or p_centro = any (public.centri_staff());
  v_maestro := not v_staff and p_centro = any (public.centri_maestro());
  if not (v_staff or v_maestro) then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  if p_tipo is null or p_tipo not in ('cambio_campo','avviso','messaggio','assenza','compito','segnalazione','pagamento','sistema') then
    raise exception 'Tipo di notifica non valido' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_titolo, '')), '') is null then raise exception 'Titolo mancante' using errcode = '22023'; end if;
  if p_link is not null and (left(p_link, 1) <> '/' or left(p_link, 2) = '//') then
    raise exception 'Link non valido: solo percorsi interni' using errcode = '22023';
  end if;
  if p_membri is null or cardinality(p_membri) = 0 then return 0; end if;
  if cardinality(p_membri) > 500 then raise exception 'Troppi destinatari (massimo 500)' using errcode = '22023'; end if;
  v_me := public.mio_membro(p_centro);
  -- Il maestro raggiunge solo titolare/DT e le famiglie (genitori e allievi) degli allievi dei suoi gruppi;
  -- i destinatari non ammessi o di altri centri vengono saltati, non causano errore.
  insert into public.notifiche (centro_id, membro_id, tipo, titolo, testo, link, mittente)
  select p_centro, m.id, p_tipo, left(btrim(p_titolo), 200), left(p_testo, 1000), p_link, public._nome_membro(v_me)
  from public.membri m
  where m.id = any (p_membri) and m.centro_id = p_centro and m.stato <> 'sospeso'
    and (v_staff
         or m.ruolo in ('titolare','dt')
         or m.id in (select af.membro_id from public.allievi_famiglie af where af.allievo_id = any (public.miei_allievi_maestro())
                     union
                     select a.membro_id from public.allievi a where a.id = any (public.miei_allievi_maestro()) and a.membro_id is not null));
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.notifica_membri(uuid, uuid[], text, text, text, text) from public, anon;
grant execute on function public.notifica_membri(uuid, uuid[], text, text, text, text) to authenticated, service_role;

-- 5. conta_destinatari: contano solo le iscrizioni gia' iniziate.
create or replace function public.conta_destinatari(centro uuid, destinatari jsonb)
returns jsonb language plpgsql stable security definer set search_path = public
as $function$
#variable_conflict use_column
declare v_c uuid := centro; v_d jsonb := destinatari; g uuid[]; v_al int; v_fa int; v_ma int;
begin
  if not (public.is_admin() or v_c = any (public.centri_staff()) or v_c = any (public.centri_maestro())) then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  g := public._gruppi_destinatari(v_c, v_d);
  if g is null then
    select count(distinct i.allievo_id) into v_al from public.iscrizioni i
      where i.centro_id = v_c and i.dal <= current_date and (i.al is null or i.al >= current_date);
    select count(distinct af.membro_id) into v_fa from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
      where i.centro_id = v_c and i.dal <= current_date and (i.al is null or i.al >= current_date);
    select count(*) into v_ma from public.membri m where m.centro_id = v_c and m.ruolo = 'maestro' and m.stato <> 'sospeso';
  else
    select count(distinct i.allievo_id) into v_al from public.iscrizioni i
      where i.gruppo_id = any (g) and i.dal <= current_date and (i.al is null or i.al >= current_date);
    select count(distinct af.membro_id) into v_fa from public.iscrizioni i join public.allievi_famiglie af on af.allievo_id = i.allievo_id
      where i.gruppo_id = any (g) and i.dal <= current_date and (i.al is null or i.al >= current_date);
    select count(distinct gm.membro_id) into v_ma from public.gruppi_maestri gm where gm.gruppo_id = any (g);
  end if;
  return jsonb_build_object('allievi', v_al, 'famiglie', v_fa, 'maestri', v_ma);
end $function$;

-- 6. esercizi_cerca: nuovo parametro p_stato (null = tutti) e confronto del colpo senza accenti e maiuscole.
-- Cambia la firma: la vecchia versione si rinomina e si toglie ai client (gli strumenti automatici non
-- permettono di eliminarla), altrimenti PostgREST vede due funzioni ambigue. Si potra' eliminare a mano.
alter function public.esercizi_cerca(uuid, text, text, text, integer, integer) rename to esercizi_cerca_v1_obsoleta;
revoke all on function public.esercizi_cerca_v1_obsoleta(uuid, text, text, text, integer, integer) from public, anon, authenticated;
create or replace function public.esercizi_cerca(
  p_centro uuid, p_testo text default null, p_colpo text default null, p_fonte text default null,
  p_da integer default 0, p_a integer default 49, p_stato text default 'approvato')
returns table(id uuid, titolo text, colpo text, fasce text[], durata_min integer, materiale text, descrizione text,
              video_path text, fonte text, stato text, proposto_da uuid, created_at timestamptz, totale bigint)
language plpgsql stable set search_path = public
as $function$
#variable_conflict use_column
declare
  v_s text := nullif(btrim(public.f_unaccent(lower(coalesce(p_testo, '')))), '');
  v_colpo text := nullif(btrim(public.f_unaccent(lower(coalesce(p_colpo, '')))), '');
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
    and (v_colpo is null or public.f_unaccent(lower(btrim(e.colpo))) = v_colpo)
    and (p_fonte is null or e.fonte = p_fonte)
    and (p_stato is null or e.stato = p_stato)
    and public.f_unaccent(lower(coalesce(e.titolo, '') || ' ' || coalesce(e.descrizione, '') || ' ' || coalesce(e.materiale, ''))) ilike v_pat
  order by public.f_unaccent(lower(coalesce(e.titolo, ''))), e.id
  limit v_lim offset v_off;
end $function$;
revoke all on function public.esercizi_cerca(uuid, text, text, text, integer, integer, text) from public, anon;
grant execute on function public.esercizi_cerca(uuid, text, text, text, integer, integer, text) to authenticated, service_role;
