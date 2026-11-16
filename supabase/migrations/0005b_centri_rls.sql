-- 0005b_centri_rls: funzioni helper, trigger, RLS, storage e realtime del multi-centro.
-- Perché le funzioni helper non hanno parametri e restituiscono array di id: dentro le policy si chiamano come
-- `(select public.miei_gruppi())`, quindi Postgres le valuta UNA volta per query (InitPlan) e non una volta per riga.
-- Le policy poi usano `colonna = any(array)`, che sfrutta gli indici su centro_id / gruppo_id / allievo_id.
-- Ogni (tabella, azione) ha UNA sola policy permissiva (niente "multiple permissive policies").

-- ───────── perimetro del chiamante (security definer, stable) ─────────
create or replace function public.miei_membri() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(m.id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso'
$$;

create or replace function public.miei_centri() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.centro_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso'
$$;

create or replace function public.centri_ruolo(r public.ruolo_centro[]) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.centro_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso' and m.ruolo = any (r)
$$;

create or replace function public.centri_titolare() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare}') $$;
create or replace function public.centri_dt() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt}') $$;
create or replace function public.centri_amm() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt,segreteria}') $$;
create or replace function public.centri_staff() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt,responsabile_area,segreteria}') $$;
create or replace function public.centri_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{maestro}') $$;
create or replace function public.centri_staff_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$ select public.centri_ruolo('{titolare,dt,responsabile_area,segreteria,maestro}') $$;

create or replace function public.mie_aree() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.area_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso' and m.ruolo = 'responsabile_area' and m.area_id is not null
$$;

-- Aree in cui il chiamante è responsabile E ha il permesso `chiave` (riga dell'area, altrimenti riga predefinita del centro).
create or replace function public.aree_permesso(chiave text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct m.area_id), '{}') from public.membri m
  where m.user_id = (select auth.uid()) and m.stato <> 'sospeso' and m.ruolo = 'responsabile_area' and m.area_id is not null
    and coalesce(
      (select p.permessi ->> chiave from public.permessi_ruolo p where p.centro_id = m.centro_id and p.area_id = m.area_id),
      (select p.permessi ->> chiave from public.permessi_ruolo p where p.centro_id = m.centro_id and p.area_id is null),
      'false') = 'true'
$$;

create or replace function public.centri_permesso(chiave text) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct a.centro_id), '{}') from public.aree a where a.id = any (public.aree_permesso(chiave))
$$;

-- Gruppi in cui il chiamante è maestro.
create or replace function public.miei_gruppi_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct gm.gruppo_id), '{}') from public.gruppi_maestri gm
  where gm.membro_id = any (public.miei_membri())
$$;

-- Gruppi che il chiamante gestisce: maestro + gruppi delle sue aree.
create or replace function public.miei_gruppi_gestione() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select unnest(public.miei_gruppi_maestro()) x
    union select g.id from public.gruppi g where g.area_id = any (public.mie_aree())
  ) s
$$;

-- Allievi dei figli del chiamante (come genitore).
create or replace function public.miei_figli() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct af.allievo_id), '{}') from public.allievi_famiglie af
  where af.membro_id = any (public.miei_membri())
$$;

-- Allievo con account proprio.
create or replace function public.miei_profili_allievo() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(a.id), '{}') from public.allievi a where a.membro_id = any (public.miei_membri())
$$;

create or replace function public.miei_allievi_famiglia() returns uuid[]
language sql stable security definer set search_path = public as $$
  select public.miei_figli() || public.miei_profili_allievo()
$$;

-- Allievi iscritti (iscrizione in corso) ai gruppi di cui il chiamante è maestro.
create or replace function public.miei_allievi_maestro() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct i.allievo_id), '{}') from public.iscrizioni i
  where i.gruppo_id = any (public.miei_gruppi_maestro()) and (i.al is null or i.al >= current_date)
$$;

-- Tutti gli allievi che il chiamante può vedere con un perimetro limitato: suoi allievi (maestro), area (responsabile), figli, sé stesso.
-- DT, titolare e segreteria non passano da qui: vedono tutto il centro tramite centri_amm().
create or replace function public.miei_allievi() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct a), '{}') from (
    select unnest(public.miei_allievi_maestro()) a
    union select i.allievo_id from public.iscrizioni i join public.gruppi g on g.id = i.gruppo_id
      where g.area_id = any (public.mie_aree()) and (i.al is null or i.al >= current_date)
    union select unnest(public.miei_allievi_famiglia())
  ) s
$$;

-- Gruppi visibili con perimetro limitato: gestiti + quelli dei figli / dell'allievo con account.
create or replace function public.miei_gruppi() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select unnest(public.miei_gruppi_gestione()) x
    union select i.gruppo_id from public.iscrizioni i
      where i.allievo_id = any (public.miei_allievi_famiglia()) and (i.al is null or i.al >= current_date)
  ) s
$$;

create or replace function public.mie_conversazioni() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p.conversazione_id), '{}') from public.partecipanti p
  where p.membro_id = any (public.miei_membri())
$$;

-- Persone che un membro non-staff può vedere: chi è nelle sue chat, i maestri dei suoi gruppi, le famiglie e gli account dei suoi allievi.
create or replace function public.membri_vicini() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select q.membro_id x from public.partecipanti q where q.conversazione_id = any (public.mie_conversazioni())
    union select gm.membro_id from public.gruppi_maestri gm where gm.gruppo_id = any (public.miei_gruppi())
    union select af.membro_id from public.allievi_famiglie af where af.allievo_id = any (public.miei_allievi())
    union select a.membro_id from public.allievi a where a.id = any (public.miei_allievi()) and a.membro_id is not null
  ) s
$$;

-- ───────── funzioni del contratto (usate da RPC e client) ─────────
create or replace function public.mio_membro(centro uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.membri m
  where m.centro_id = centro and m.user_id = (select auth.uid()) and m.stato <> 'sospeso'
  order by array_position(array['titolare','dt','responsabile_area','segreteria','maestro','genitore','allievo'], m.ruolo::text), m.created_at
  limit 1
$$;

create or replace function public.ha_ruolo(centro uuid, ruoli public.ruolo_centro[]) returns boolean
language sql stable security definer set search_path = public as $$
  select centro = any (public.centri_ruolo(ruoli))
$$;
create or replace function public.is_membro(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select centro = any (public.miei_centri()) $$;
-- is_staff / is_dt / is_amm: il super admin (is_admin) conta sempre, perché "vede e fa tutto".
create or replace function public.is_staff(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() or centro = any (public.centri_staff()) $$;
create or replace function public.is_dt(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() or centro = any (public.centri_dt()) $$;
create or replace function public.is_amm(centro uuid) returns boolean
language sql stable security definer set search_path = public as $$ select public.is_admin() or centro = any (public.centri_amm()) $$;

-- Percorso di storage "centro_id/..." -> uuid del centro (null se la cartella non è un uuid).
create or replace function public.centro_da_percorso(nome text) returns uuid
language sql immutable set search_path = public as $$
  select case when (storage.foldername(nome))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then ((storage.foldername(nome))[1])::uuid end
$$;

-- Chi può essere aggiunto a una conversazione da chi non è staff.
create or replace function public.partecipante_ammesso(conv uuid, membro uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare c public.conversazioni%rowtype; t public.membri%rowtype;
begin
  select * into c from public.conversazioni where id = conv;
  select * into t from public.membri where id = membro;
  if c.id is null or t.id is null or c.centro_id <> t.centro_id then return false; end if;
  if public.is_admin() or c.centro_id = any (public.centri_staff()) then return true; end if;
  if not (c.creata_da = any (public.miei_membri())) then return false; end if;
  if t.id = any (public.miei_membri()) then return true; end if;
  if t.ruolo in ('maestro', 'segreteria', 'dt', 'titolare', 'responsabile_area') then return true; end if;
  if c.allievo_id is not null and (
       exists (select 1 from public.allievi_famiglie af where af.allievo_id = c.allievo_id and af.membro_id = t.id)
    or exists (select 1 from public.allievi a where a.id = c.allievo_id and a.membro_id = t.id)) then return true; end if;
  return false;
end $$;

-- ───────── trigger ─────────
-- Nei trigger "invoker" current_user è il ruolo che esegue il comando: le RPC security definer (owner) passano libere.
create or replace function public.proteggi_centro() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not (select public.is_admin()) then
    new.slug := old.slug; new.stato := old.stato; new.prova_fino := old.prova_fino;
    new.piano := old.piano; new.elencato := old.elencato; new.creato_da := old.creato_da;
  end if;
  return new;
end $$;
create trigger centri_protezione before update on public.centri for each row execute function public.proteggi_centro();

create or replace function public.proteggi_membro() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon')
     and not ((select public.is_admin()) or old.centro_id = any ((select public.centri_dt()))) then
    -- chi modifica la propria riga può cambiare solo nome, cognome, email e telefono
    new.ruolo := old.ruolo; new.stato := old.stato; new.area_id := old.area_id;
    new.user_id := old.user_id; new.centro_id := old.centro_id;
  end if;
  return new;
end $$;
create trigger membri_protezione before update on public.membri for each row execute function public.proteggi_membro();

create or replace function public.proteggi_allievo() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon')
     and not ((select public.is_admin()) or old.centro_id = any ((select public.centri_amm()))) then
    -- la famiglia aggiorna solo certificato medico e note mediche
    new.nome := old.nome; new.cognome := old.cognome; new.data_nascita := old.data_nascita;
    new.membro_id := old.membro_id; new.centro_id := old.centro_id;
  end if;
  return new;
end $$;
create trigger allievi_protezione before update on public.allievi for each row execute function public.proteggi_allievo();

-- I messaggi non si modificano e non si cancellano (tutela dei minori). Fanno eccezione solo le cancellazioni a cascata
-- (profondità dei trigger > 1), cioè l'eliminazione di una conversazione o di un intero centro da parte del super admin.
create or replace function public.messaggi_immutabili() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'I messaggi non si modificano e non si cancellano' using errcode = '42501';
end $$;
create trigger messaggi_immutabili before update or delete on public.messaggi for each row execute function public.messaggi_immutabili();

create or replace function public.imposta_creatore_conversazione() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.creata_da is null and current_user in ('authenticated', 'anon') then
    new.creata_da := public.mio_membro(new.centro_id);
  end if;
  return new;
end $$;
create trigger conversazioni_creatore before insert on public.conversazioni for each row execute function public.imposta_creatore_conversazione();

create or replace function public.valida_partecipante() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and not public.partecipante_ammesso(new.conversazione_id, new.membro_id) then
    raise exception 'Partecipante non ammesso in questa conversazione' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger partecipanti_validazione before insert on public.partecipanti for each row execute function public.valida_partecipante();

create or replace function public.firma_consenso() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and new.valore and (tg_op = 'INSERT' or old.valore is distinct from new.valore) then
    new.firmato_il := now();
    new.firmato_da := coalesce(new.firmato_da, public.mio_membro(new.centro_id));
  end if;
  return new;
end $$;
create trigger consensi_firma before insert or update on public.consensi for each row execute function public.firma_consenso();

-- ───────── RLS ─────────
alter table public.centri enable row level security;
alter table public.aree enable row level security;
alter table public.membri enable row level security;
alter table public.inviti enable row level security;
alter table public.campi enable row level security;
alter table public.gruppi enable row level security;
alter table public.gruppi_maestri enable row level security;
alter table public.allievi enable row level security;
alter table public.allievi_famiglie enable row level security;
alter table public.iscrizioni enable row level security;
alter table public.cambi_campo enable row level security;
alter table public.lezioni enable row level security;
alter table public.presenze enable row level security;
alter table public.assenze enable row level security;
alter table public.valutazioni enable row level security;
alter table public.compiti enable row level security;
alter table public.compiti_fatti enable row level security;
alter table public.note_private enable row level security;
alter table public.linee_guida enable row level security;
alter table public.esercizi enable row level security;
alter table public.modelli_lezione enable row level security;
alter table public.programmi enable row level security;
alter table public.osservazioni enable row level security;
alter table public.corsi_formazione enable row level security;
alter table public.formazione enable row level security;
alter table public.conversazioni enable row level security;
alter table public.partecipanti enable row level security;
alter table public.messaggi enable row level security;
alter table public.avvisi enable row level security;
alter table public.avvisi_letture enable row level security;
alter table public.segnalazioni enable row level security;
alter table public.segnalazioni_note enable row level security;
alter table public.notifiche enable row level security;
alter table public.consensi enable row level security;
alter table public.permessi_ruolo enable row level security;
alter table public.registro enable row level security;
alter table public.corsi enable row level security;
alter table public.quote enable row level security;

-- centri
create policy "centri: leggo" on public.centri for select to authenticated
  using ((select public.is_admin()) or id = any ((select public.miei_centri())));
create policy "centri: dt aggiorna" on public.centri for update to authenticated
  using ((select public.is_admin()) or id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or id = any ((select public.centri_dt())));
create policy "centri: admin inserisce" on public.centri for insert to authenticated with check ((select public.is_admin()));
create policy "centri: admin elimina" on public.centri for delete to authenticated using ((select public.is_admin()));

-- aree
create policy "aree: leggo" on public.aree for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.miei_centri())));
create policy "aree: dt inserisce" on public.aree for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "aree: dt aggiorna" on public.aree for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "aree: dt elimina" on public.aree for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- membri
create policy "membri: leggo" on public.membri for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff()))
         or user_id = (select auth.uid()) or id = any ((select public.membri_vicini())));
create policy "membri: inserisco" on public.membri for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or (ruolo in ('genitore', 'allievo')
             and (centro_id = any ((select public.centri_amm())) or centro_id = any ((select public.centri_permesso('iscrizioni'))))));
create policy "membri: aggiorno" on public.membri for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or user_id = (select auth.uid()))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or user_id = (select auth.uid()));
create policy "membri: dt elimina" on public.membri for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- inviti
create policy "inviti: leggo" on public.inviti for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff())) or creato_da = any ((select public.miei_membri())));
create policy "inviti: inserisco" on public.inviti for insert to authenticated
  with check ((select public.is_admin())
    or (centro_id = any ((select public.centri_dt())) and (ruolo <> 'titolare' or centro_id = any ((select public.centri_titolare()))))
    -- il genitore invita il proprio figlio (account del ragazzo)
    or (ruolo = 'allievo' and allievo_id = any ((select public.miei_figli())) and creato_da = any ((select public.miei_membri()))));
create policy "inviti: aggiorno" on public.inviti for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or creato_da = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or creato_da = any ((select public.miei_membri())));
create policy "inviti: elimino" on public.inviti for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or creato_da = any ((select public.miei_membri())));

-- campi
create policy "campi: leggo" on public.campi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.miei_centri())));
create policy "campi: inserisco" on public.campi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))));
create policy "campi: aggiorno" on public.campi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))));
create policy "campi: elimino" on public.campi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- gruppi
create policy "gruppi: leggo" on public.gruppi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or id = any ((select public.miei_gruppi())));
create policy "gruppi: inserisco" on public.gruppi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or area_id = any ((select public.aree_permesso('gruppi'))));
create policy "gruppi: aggiorno" on public.gruppi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or area_id = any ((select public.aree_permesso('gruppi'))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or area_id = any ((select public.aree_permesso('gruppi'))));
create policy "gruppi: elimino" on public.gruppi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- gruppi_maestri
create policy "gruppi_maestri: leggo" on public.gruppi_maestri for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or gruppo_id = any ((select public.miei_gruppi())));
create policy "gruppi_maestri: inserisco" on public.gruppi_maestri for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('maestri')))));
create policy "gruppi_maestri: aggiorno" on public.gruppi_maestri for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('maestri')))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('maestri')))));
create policy "gruppi_maestri: elimino" on public.gruppi_maestri for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('maestri')))));

-- allievi
create policy "allievi: leggo" on public.allievi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or id = any ((select public.miei_allievi())));
create policy "allievi: inserisco" on public.allievi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or centro_id = any ((select public.centri_permesso('iscrizioni'))));
create policy "allievi: aggiorno" on public.allievi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or id = any ((select public.miei_allievi_famiglia())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or id = any ((select public.miei_allievi_famiglia())));
create policy "allievi: dt elimina" on public.allievi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- allievi_famiglie
create policy "famiglie: leggo" on public.allievi_famiglie for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
         or membro_id = any ((select public.miei_membri())) or allievo_id = any ((select public.miei_allievi())));
create policy "famiglie: inserisco" on public.allievi_famiglie for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or centro_id = any ((select public.centri_permesso('iscrizioni'))));
create policy "famiglie: aggiorno" on public.allievi_famiglie for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));
create policy "famiglie: elimino" on public.allievi_famiglie for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));

-- iscrizioni
create policy "iscrizioni: leggo" on public.iscrizioni for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
         or allievo_id = any ((select public.miei_allievi())) or gruppo_id = any ((select public.miei_gruppi_gestione())));
create policy "iscrizioni: inserisco" on public.iscrizioni for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('iscrizioni')))));
create policy "iscrizioni: aggiorno" on public.iscrizioni for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('iscrizioni')))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
    or gruppo_id in (select g.id from public.gruppi g where g.area_id = any ((select public.aree_permesso('iscrizioni')))));
create policy "iscrizioni: elimino" on public.iscrizioni for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- cambi_campo
create policy "cambi_campo: leggo" on public.cambi_campo for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or gruppo_id = any ((select public.miei_gruppi())));
create policy "cambi_campo: inserisco" on public.cambi_campo for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))));
create policy "cambi_campo: aggiorno" on public.cambi_campo for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))));
create policy "cambi_campo: elimino" on public.cambi_campo for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or centro_id = any ((select public.centri_permesso('campi'))));

-- lezioni
create policy "lezioni: leggo" on public.lezioni for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
         or gruppo_id = any ((select public.miei_gruppi())) or maestro_id = any ((select public.miei_membri())));
create policy "lezioni: inserisco" on public.lezioni for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or gruppo_id = any ((select public.miei_gruppi_maestro())));
create policy "lezioni: aggiorno" on public.lezioni for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or gruppo_id = any ((select public.miei_gruppi_maestro())) or maestro_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or gruppo_id = any ((select public.miei_gruppi_maestro())) or maestro_id = any ((select public.miei_membri())));
create policy "lezioni: elimino" on public.lezioni for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- presenze
create policy "presenze: leggo" on public.presenze for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi()))
         or lezione_id in (select l.id from public.lezioni l where l.maestro_id = any ((select public.miei_membri()))));
create policy "presenze: inserisco" on public.presenze for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or lezione_id in (select l.id from public.lezioni l where l.gruppo_id = any ((select public.miei_gruppi_maestro())) or l.maestro_id = any ((select public.miei_membri()))));
create policy "presenze: aggiorno" on public.presenze for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or lezione_id in (select l.id from public.lezioni l where l.gruppo_id = any ((select public.miei_gruppi_maestro())) or l.maestro_id = any ((select public.miei_membri()))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or lezione_id in (select l.id from public.lezioni l where l.gruppo_id = any ((select public.miei_gruppi_maestro())) or l.maestro_id = any ((select public.miei_membri()))));
create policy "presenze: elimino" on public.presenze for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or lezione_id in (select l.id from public.lezioni l where l.gruppo_id = any ((select public.miei_gruppi_maestro())) or l.maestro_id = any ((select public.miei_membri()))));

-- assenze (l'avviso della famiglia passa dalla RPC avvisa_assenza, che controlla il limite delle ore)
create policy "assenze: leggo" on public.assenze for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi())));
create policy "assenze: inserisco" on public.assenze for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi_maestro())));
create policy "assenze: aggiorno" on public.assenze for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi_maestro())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi_maestro())));
create policy "assenze: elimino" on public.assenze for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));

-- valutazioni
create policy "valutazioni: leggo" on public.valutazioni for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi())));
create policy "valutazioni: inserisco" on public.valutazioni for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (allievo_id = any ((select public.miei_allievi_maestro())) and maestro_id = any ((select public.miei_membri()))));
create policy "valutazioni: aggiorno" on public.valutazioni for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (allievo_id = any ((select public.miei_allievi_maestro())) and maestro_id = any ((select public.miei_membri()))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (allievo_id = any ((select public.miei_allievi_maestro())) and maestro_id = any ((select public.miei_membri()))));
create policy "valutazioni: elimino" on public.valutazioni for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())));

-- compiti
create policy "compiti: leggo" on public.compiti for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or maestro_id = any ((select public.miei_membri()))
         or allievo_id = any ((select public.miei_allievi())) or gruppo_id = any ((select public.miei_gruppi())));
create policy "compiti: inserisco" on public.compiti for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (centro_id = any ((select public.centri_maestro())) and maestro_id = any ((select public.miei_membri()))));
create policy "compiti: aggiorno" on public.compiti for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())));
create policy "compiti: elimino" on public.compiti for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())));

-- compiti_fatti (il genitore e l'allievo con account segnano i propri; il maestro legge)
create policy "compiti_fatti: leggo" on public.compiti_fatti for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi())));
create policy "compiti_fatti: inserisco" on public.compiti_fatti for insert to authenticated
  with check ((select public.is_admin()) or allievo_id = any ((select public.miei_allievi_famiglia())));
create policy "compiti_fatti: aggiorno" on public.compiti_fatti for update to authenticated
  using ((select public.is_admin()) or allievo_id = any ((select public.miei_allievi_famiglia())))
  with check ((select public.is_admin()) or allievo_id = any ((select public.miei_allievi_famiglia())));
create policy "compiti_fatti: elimino" on public.compiti_fatti for delete to authenticated
  using ((select public.is_admin()) or allievo_id = any ((select public.miei_allievi_famiglia())));

-- note_private: mai le famiglie
create policy "note_private: leggo" on public.note_private for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff())) or allievo_id = any ((select public.miei_allievi_maestro())));
create policy "note_private: inserisco" on public.note_private for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (allievo_id = any ((select public.miei_allievi_maestro())) and maestro_id = any ((select public.miei_membri()))));
create policy "note_private: aggiorno" on public.note_private for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())));
create policy "note_private: elimino" on public.note_private for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or maestro_id = any ((select public.miei_membri())));

-- Metodo
create policy "linee_guida: leggo" on public.linee_guida for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff_maestro())));
create policy "linee_guida: inserisco" on public.linee_guida for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "linee_guida: aggiorno" on public.linee_guida for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "linee_guida: elimino" on public.linee_guida for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

create policy "esercizi: leggo" on public.esercizi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff_maestro()))
         or (centro_id = any ((select public.miei_centri())) and stato = 'approvato') or proposto_da = any ((select public.miei_membri())));
create policy "esercizi: inserisco" on public.esercizi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (centro_id = any ((select public.centri_maestro())) and stato = 'proposto' and fonte = 'maestro' and proposto_da = any ((select public.miei_membri()))));
create policy "esercizi: aggiorno" on public.esercizi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "esercizi: elimino" on public.esercizi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or (proposto_da = any ((select public.miei_membri())) and stato = 'proposto'));

create policy "modelli_lezione: leggo" on public.modelli_lezione for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff_maestro())));
create policy "modelli_lezione: inserisco" on public.modelli_lezione for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "modelli_lezione: aggiorno" on public.modelli_lezione for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "modelli_lezione: elimino" on public.modelli_lezione for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

create policy "programmi: leggo" on public.programmi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff_maestro())));
create policy "programmi: inserisco" on public.programmi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "programmi: aggiorno" on public.programmi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "programmi: elimino" on public.programmi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- osservazioni
create policy "osservazioni: leggo" on public.osservazioni for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or osservatore_id = any ((select public.miei_membri())) or maestro_id = any ((select public.miei_membri())));
create policy "osservazioni: inserisco" on public.osservazioni for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (centro_id = any ((select public.centri_staff())) and osservatore_id = any ((select public.miei_membri()))));
create policy "osservazioni: aggiorno" on public.osservazioni for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or osservatore_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or osservatore_id = any ((select public.miei_membri())));
create policy "osservazioni: elimino" on public.osservazioni for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- formazione
create policy "corsi_formazione: leggo" on public.corsi_formazione for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff_maestro())));
create policy "corsi_formazione: inserisco" on public.corsi_formazione for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "corsi_formazione: aggiorno" on public.corsi_formazione for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "corsi_formazione: elimino" on public.corsi_formazione for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

create policy "formazione: leggo" on public.formazione for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff())) or membro_id = any ((select public.miei_membri())));
create policy "formazione: inserisco" on public.formazione for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or membro_id = any ((select public.miei_membri())));
create policy "formazione: aggiorno" on public.formazione for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or membro_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or membro_id = any ((select public.miei_membri())));
create policy "formazione: elimino" on public.formazione for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- conversazioni, partecipanti, messaggi
-- DT e titolare leggono tutte le conversazioni del centro: è la tutela dei minori ("nessuna chat nascosta adulto-minore").
create policy "conversazioni: leggo" on public.conversazioni for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or id = any ((select public.mie_conversazioni())) or creata_da = any ((select public.miei_membri())));
create policy "conversazioni: inserisco" on public.conversazioni for insert to authenticated
  with check ((select public.is_admin())
    or (centro_id = any ((select public.miei_centri())) and creata_da = any ((select public.miei_membri()))
        and (tipo <> 'staff' or centro_id = any ((select public.centri_staff())))));
create policy "conversazioni: dt aggiorna" on public.conversazioni for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "conversazioni: dt elimina" on public.conversazioni for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

create policy "partecipanti: leggo" on public.partecipanti for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or conversazione_id = any ((select public.mie_conversazioni())));
-- il controllo su chi si può aggiungere sta nel trigger partecipanti_validazione
create policy "partecipanti: inserisco" on public.partecipanti for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_staff()))
    or conversazione_id in (select c.id from public.conversazioni c where c.creata_da = any ((select public.miei_membri()))));
create policy "partecipanti: dt aggiorna" on public.partecipanti for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "partecipanti: dt elimina" on public.partecipanti for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- messaggi: si scrive solo con invia_messaggio (silenzio, sola lettura, notifiche). Nessuna policy di update/delete.
create policy "messaggi: leggo" on public.messaggi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or (conversazione_id = any ((select public.mie_conversazioni()))
             and (consegna_il <= now() or autore_id = any ((select public.miei_membri())))));
create policy "messaggi: admin inserisce" on public.messaggi for insert to authenticated with check ((select public.is_admin()));

-- avvisi: i destinatari li leggono tramite le loro notifiche (rif_id), che invia_avviso crea una per persona
create policy "avvisi: leggo" on public.avvisi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff())) or autore_id = any ((select public.miei_membri()))
         or id in (select n.rif_id from public.notifiche n
                   where n.membro_id = any ((select public.miei_membri())) and n.tipo = 'avviso' and n.consegna_il <= now()));
create policy "avvisi: inserisco" on public.avvisi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));
create policy "avvisi: aggiorno" on public.avvisi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or autore_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or autore_id = any ((select public.miei_membri())));
create policy "avvisi: elimino" on public.avvisi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or autore_id = any ((select public.miei_membri())));

create policy "avvisi_letture: leggo" on public.avvisi_letture for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff())) or membro_id = any ((select public.miei_membri()))
         or avviso_id in (select a.id from public.avvisi a where a.autore_id = any ((select public.miei_membri()))));
create policy "avvisi_letture: inserisco" on public.avvisi_letture for insert to authenticated
  with check ((select public.is_admin()) or membro_id = any ((select public.miei_membri())));
create policy "avvisi_letture: aggiorno" on public.avvisi_letture for update to authenticated
  using ((select public.is_admin()) or membro_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or membro_id = any ((select public.miei_membri())));

-- segnalazioni: solo DT e titolare (se riguarda_dt, solo il titolare); l'autore non anonimo vede le proprie. Mai i maestri.
create policy "segnalazioni: leggo" on public.segnalazioni for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_titolare()))
         or (not riguarda_dt and centro_id = any ((select public.centri_dt()))) or autore_id = any ((select public.miei_membri())));
create policy "segnalazioni: admin inserisce" on public.segnalazioni for insert to authenticated with check ((select public.is_admin()));
create policy "segnalazioni: aggiorno" on public.segnalazioni for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_titolare()))
         or (not riguarda_dt and centro_id = any ((select public.centri_dt()))))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_titolare()))
         or (not riguarda_dt and centro_id = any ((select public.centri_dt()))));
create policy "segnalazioni: admin elimina" on public.segnalazioni for delete to authenticated using ((select public.is_admin()));

create policy "segnalazioni_note: leggo" on public.segnalazioni_note for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_titolare()))
         or (centro_id = any ((select public.centri_dt())) and segnalazione_id in (select s.id from public.segnalazioni s where not s.riguarda_dt)));
create policy "segnalazioni_note: inserisco" on public.segnalazioni_note for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_titolare()))
         or (centro_id = any ((select public.centri_dt())) and segnalazione_id in (select s.id from public.segnalazioni s where not s.riguarda_dt)));

-- notifiche: le mie (consegnate); DT e titolare le vedono tutte per "vedere come"
create policy "notifiche: leggo" on public.notifiche for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
         or (membro_id = any ((select public.miei_membri())) and consegna_il <= now()));
create policy "notifiche: staff inserisce" on public.notifiche for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_staff())));
create policy "notifiche: segno lette" on public.notifiche for update to authenticated
  using ((select public.is_admin()) or membro_id = any ((select public.miei_membri())))
  with check ((select public.is_admin()) or membro_id = any ((select public.miei_membri())));
create policy "notifiche: elimino le mie" on public.notifiche for delete to authenticated
  using ((select public.is_admin()) or membro_id = any ((select public.miei_membri())));

-- consensi (default false: li firma il genitore)
create policy "consensi: leggo" on public.consensi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_allievi())));
create policy "consensi: inserisco" on public.consensi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_figli())));
create policy "consensi: aggiorno" on public.consensi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_figli())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())) or allievo_id = any ((select public.miei_figli())));
create policy "consensi: elimino" on public.consensi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- permessi_ruolo
create policy "permessi_ruolo: leggo" on public.permessi_ruolo for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_staff())));
create policy "permessi_ruolo: inserisco" on public.permessi_ruolo for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "permessi_ruolo: aggiorno" on public.permessi_ruolo for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));
create policy "permessi_ruolo: elimino" on public.permessi_ruolo for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- registro: solo aggiunte (nessuna policy di update/delete)
create policy "registro: leggo" on public.registro for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())) or membro_id = any ((select public.miei_membri())));
create policy "registro: inserisco" on public.registro for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_dt()))
    or (centro_id = any ((select public.miei_centri())) and membro_id = any ((select public.miei_membri()))));

-- corsi e quote
create policy "corsi: leggo" on public.corsi for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.miei_centri())));
create policy "corsi: inserisco" on public.corsi for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));
create policy "corsi: aggiorno" on public.corsi for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));
create policy "corsi: elimino" on public.corsi for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

create policy "quote: leggo" on public.quote for select to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm()))
         or centro_id = any ((select public.centri_permesso('pagamenti'))) or allievo_id = any ((select public.miei_figli())));
create policy "quote: inserisco" on public.quote for insert to authenticated
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));
create policy "quote: aggiorno" on public.quote for update to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_amm())))
  with check ((select public.is_admin()) or centro_id = any ((select public.centri_amm())));
create policy "quote: elimino" on public.quote for delete to authenticated
  using ((select public.is_admin()) or centro_id = any ((select public.centri_dt())));

-- is_admin() può leggere i profili (per cercare una persona per email e aggiungerla a un centro)
create policy "profilo: admin legge tutti" on public.profiles for select to authenticated using ((select public.is_admin()));

-- ───────── storage ─────────
insert into storage.buckets (id, name, public, file_size_limit)
  values ('centri', 'centri', false, 209715200)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('centri-pubblico', 'centri-pubblico', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
  on conflict (id) do nothing;

-- Convenzione dei percorsi nel bucket privato: {centro_id}/video/…, {centro_id}/errori/…, {centro_id}/note/…, {centro_id}/compiti/…
-- Le cartelle `note` (note audio dei maestri) e `compiti` (video degli allievi) le leggono solo staff, maestri e chi le ha caricate.
create policy "centri-pubblico: lettura anonima" on storage.objects for select to anon using (bucket_id = 'centri-pubblico');
create policy "centri: leggo" on storage.objects for select to authenticated
  using (bucket_id = 'centri-pubblico'
    or (bucket_id = 'centri' and ((select public.is_admin())
        or (public.centro_da_percorso(name) = any ((select public.miei_centri()))
            and ((storage.foldername(name))[2] is null or (storage.foldername(name))[2] not in ('note', 'compiti')
                 or owner_id = (select auth.uid())::text
                 or public.centro_da_percorso(name) = any ((select public.centri_staff_maestro())))))));
create policy "centri: carico" on storage.objects for insert to authenticated
  with check ((bucket_id = 'centri' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.miei_centri()))))
    or (bucket_id = 'centri-pubblico' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.centri_dt())))));
create policy "centri: modifico" on storage.objects for update to authenticated
  using ((bucket_id = 'centri' and ((select public.is_admin()) or owner_id = (select auth.uid())::text or public.centro_da_percorso(name) = any ((select public.centri_dt()))))
    or (bucket_id = 'centri-pubblico' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.centri_dt())))));
create policy "centri: elimino" on storage.objects for delete to authenticated
  using ((bucket_id = 'centri' and ((select public.is_admin()) or owner_id = (select auth.uid())::text or public.centro_da_percorso(name) = any ((select public.centri_dt()))))
    or (bucket_id = 'centri-pubblico' and ((select public.is_admin()) or public.centro_da_percorso(name) = any ((select public.centri_dt())))));

-- ───────── realtime: solo notifiche e messaggi ─────────
do $$ begin
  alter publication supabase_realtime add table public.notifiche;
  alter publication supabase_realtime add table public.messaggi;
exception when others then raise notice 'realtime non configurato: %', sqlerrm;
end $$;

-- ───────── permessi di esecuzione: solo utenti autenticati, mai anonimi ─────────
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      'miei_membri','miei_centri','centri_ruolo','centri_titolare','centri_dt','centri_amm','centri_staff','centri_maestro',
      'centri_staff_maestro','mie_aree','aree_permesso','centri_permesso','miei_gruppi_maestro','miei_gruppi_gestione',
      'miei_figli','miei_profili_allievo','miei_allievi_famiglia','miei_allievi_maestro','miei_allievi','miei_gruppi',
      'mie_conversazioni','membri_vicini','mio_membro','ha_ruolo','is_membro','is_staff','is_dt','is_amm',
      'centro_da_percorso','partecipante_ammesso'])
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
  -- le funzioni dei trigger girano comunque: nessuno deve poterle chiamare a mano
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array['proteggi_centro','proteggi_membro','proteggi_allievo',
      'messaggi_immutabili','imposta_creatore_conversazione','valida_partecipante','firma_consenso'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
