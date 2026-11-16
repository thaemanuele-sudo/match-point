-- 0006d2 · Correzione della 0006d: la colonna lezioni.svolto parte da '[]' (non null), quindi il riempimento
-- dello svolto e dei motivi di scostamento (oggetto indice del blocco → motivo) non aveva toccato nessuna riga. Qui si riempiono le lezioni chiuse ancora vuote.
do $seed$
declare b uuid := (select id from public.centri where slug = 'tc-brera');
begin
  update public.lezioni l set svolto = (
    select jsonb_agg(
      jsonb_build_object('indice', t.ord - 1, 'minuti', (t.blk ->> 'minuti')::int,
                         'fatto', not (t.blk ->> 'modo' = 'bloccato' and hh.h < 4))
      || case when t.blk ->> 'modo' = 'flessibile' and hh.h < 35 and jsonb_array_length(t.blk -> 'alternative') > 0
              then jsonb_build_object('sostituito', true, 'esercizio_id', t.blk -> 'alternative' ->> 0) else '{}'::jsonb end
      order by t.ord)
    from jsonb_array_elements(l.piano) with ordinality t(blk, ord)
    cross join lateral (select abs(hashtext(l.gruppo_id::text || l.data::text || t.ord::text)) % 100 as h) hh)
  where l.centro_id = b and l.stato = 'chiusa' and coalesce(jsonb_array_length(l.svolto), 0) = 0;

  update public.lezioni l set motivi_scostamento = (
    select jsonb_object_agg(s ->> 'indice', 'Campo bagnato: scambi accorciati')
    from jsonb_array_elements(l.svolto) s where not (s ->> 'fatto')::boolean)
  where l.centro_id = b and l.stato = 'chiusa' and coalesce(l.motivi_scostamento, '{}'::jsonb) in ('{}'::jsonb, '[]'::jsonb)
    and exists (select 1 from jsonb_array_elements(l.svolto) s where not (s ->> 'fatto')::boolean);
end
$seed$;
