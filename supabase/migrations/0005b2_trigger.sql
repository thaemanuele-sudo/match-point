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
    new.nome := old.nome; new.cognome := old.cognome; new.data_nascita := old.data_nascita;
    new.membro_id := old.membro_id; new.centro_id := old.centro_id;
  end if;
  return new;
end $$;
create trigger allievi_protezione before update on public.allievi for each row execute function public.proteggi_allievo();

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
