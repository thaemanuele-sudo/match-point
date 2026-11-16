-- 0012c · Motore: aggiornamento di sql/motore.sql arrivato dopo 0012_motore.
--   * tabella e funzioni della taratura del decisore (motore_taratura*)
--   * motore_riepilogo: le chiamate in ombra in righe separate (stesso risultato per chi somma)
--   * permessi: authenticated e service_role come nel file del motore; anon come per le altre funzioni motore_* (vedi 0012b)
-- Solo aggiunte e create or replace: compatibile con il codice già online.

-- Taratura del decisore: per ogni app, decisore, uso ("verifica" o "giudice") e compito,
-- le 6 fasce di probabilità dichiarata (0 = 0-0,5 ... 5 = 0,95-1) con quante volte la
-- risposta era davvero buona (ok) e quante no (ko). Pesate come i bracci, con dimenticanza.
create table if not exists motore_taratura (
  app            text not null,
  decisore       text not null,
  uso            text not null check (uso in ('verifica', 'giudice')),
  compito        text not null,
  fascia         integer not null check (fascia between 0 and 5),
  ok             double precision not null default 0,
  ko             double precision not null default 0,
  aggiornato_il  timestamptz not null default now(),
  primary key (app, decisore, uso, compito, fascia)
);

alter table motore_taratura enable row level security;
revoke all on table motore_taratura from public, anon, authenticated;

-- Aggrega le chiamate per compito, modello e "ombra" tra `p_da` e `p_a`
-- (millisecondi, estremi inclusi; null = senza limite). `p_app` null = tutte le app.
--  Le chiamate in ombra (prove, controlli, giudizi: non sono andate all'utente) stanno
--  in righe separate da quelle servite, con lo stesso compito e modello: una riga ha
--  `ombra = 0` (servite) oppure `ombra = chiamate` (tutte in ombra). Il nucleo ne ha
--  bisogno per il tetto dell'apprendimento: spesa in ombra da una parte e, dall'altra,
--  quanto sarebbe costato il compito con il solo riferimento (somma di
--  `costo_riferimento_usd` delle chiamate servite). Chi somma le righe ottiene gli
--  stessi totali di prima.
--  chiamate = righe del gruppo; da_cache / locali = esito cache / locale;
--  ombra = chiamate non andate all'utente;
--  latenza_media = media delle sole chiamate con esito "risposta" (cache e
--  regole locali durano quasi zero e falserebbero la media).
create or replace function motore_riepilogo(
  p_token text default null,
  p_app text default null,
  p_da bigint default null,
  p_a bigint default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  return coalesce(
    (select jsonb_agg(
              jsonb_build_object(
                'compito', r.compito,
                'modello', r.modello,
                'chiamate', r.chiamate,
                'da_cache', r.da_cache,
                'locali', r.locali,
                'ombra', r.ombra,
                'costo_usd', r.costo_usd,
                'costo_riferimento_usd', r.costo_riferimento_usd,
                'latenza_media', r.latenza_media
              )
              order by r.compito collate "C", r.modello collate "C", r.in_ombra)
       from (select c.compito,
                    c.modello,
                    c.ombra as in_ombra,
                    count(*) as chiamate,
                    count(*) filter (where c.esito = 'cache') as da_cache,
                    count(*) filter (where c.esito = 'locale') as locali,
                    count(*) filter (where c.ombra) as ombra,
                    coalesce(sum(c.costo_usd), 0) as costo_usd,
                    coalesce(sum(c.costo_riferimento_usd), 0) as costo_riferimento_usd,
                    coalesce(avg(c.latenza_ms) filter (where c.esito = 'risposta'), 0) as latenza_media
               from motore_chiamate c
              where (p_app is null or c.app = p_app)
                and (p_da is null or c.creato_il >= to_timestamp(p_da / 1000.0))
                and (p_a is null or c.creato_il <= to_timestamp(p_a / 1000.0))
              group by c.compito, c.modello, c.ombra) r),
    '[]'::jsonb
  );
end
$$;

-- ---------------------------------------------------------------------
-- Taratura del decisore
-- ---------------------------------------------------------------------

-- Aggiornamento atomico di una fascia, in UN'unica istruzione, come per i bracci:
-- applica la dimenticanza (valore * 0,5^(giorni / emivita)), somma il delta e, se la
-- riga non esiste, la crea. Due richieste insieme si accodano sul blocco della riga e
-- nessuna perde il suo delta.
create or replace function motore_taratura_aggiorna(
  p_token text default null,
  p_app text default null,
  p_decisore text default null,
  p_uso text default null,
  p_compito text default null,
  p_fascia integer default null,
  p_ok double precision default 0,
  p_ko double precision default 0,
  p_emivita_giorni double precision default 30,
  p_adesso bigint default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_adesso timestamptz := coalesce(to_timestamp(p_adesso / 1000.0), now());
  v_emivita double precision := coalesce(p_emivita_giorni, 30);
  v_ok double precision := coalesce(p_ok, 0);
  v_ko double precision := coalesce(p_ko, 0);
begin
  perform motore_verifica(p_token);
  if v_emivita <= 0 then
    raise exception 'motore: l''emivita deve essere positiva';
  end if;
  insert into motore_taratura as t (app, decisore, uso, compito, fascia, ok, ko, aggiornato_il)
  values (p_app, p_decisore, p_uso, p_compito, p_fascia, v_ok, v_ko, v_adesso)
  on conflict (app, decisore, uso, compito, fascia) do update
    set ok = t.ok * motore_fattore(t.aggiornato_il, v_adesso, v_emivita) + v_ok,
        ko = t.ko * motore_fattore(t.aggiornato_il, v_adesso, v_emivita) + v_ko,
        -- Mai all'indietro: un orologio in ritardo non deve far "ringiovanire" i dati.
        aggiornato_il = greatest(t.aggiornato_il, v_adesso);
end
$$;

-- Le 6 fasce di un decisore, per un uso e un compito: [{ fascia, ok, ko }], sempre
-- tutte e sei in ordine, con zero dove non c'è ancora nulla. I bordi delle fasce
-- (da, a) stanno nel codice e non viaggiano.
create or replace function motore_taratura_leggi(
  p_token text default null,
  p_app text default null,
  p_decisore text default null,
  p_uso text default null,
  p_compito text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform motore_verifica(p_token);
  return (select jsonb_agg(
                   jsonb_build_object('fascia', f.n, 'ok', coalesce(t.ok, 0), 'ko', coalesce(t.ko, 0))
                   order by f.n)
            from generate_series(0, 5) as f(n)
            left join motore_taratura t
              on t.app = p_app and t.decisore = p_decisore and t.uso = p_uso
             and t.compito = p_compito and t.fascia = f.n);
end
$$;

revoke all on function motore_taratura_aggiorna(text, text, text, text, text, integer, double precision, double precision, double precision, bigint) from public;
revoke all on function motore_taratura_leggi(text, text, text, text, text) from public;
grant execute on function motore_taratura_aggiorna(text, text, text, text, text, integer, double precision, double precision, double precision, bigint) to anon, authenticated, service_role;
grant execute on function motore_taratura_leggi(text, text, text, text, text) to anon, authenticated, service_role;
