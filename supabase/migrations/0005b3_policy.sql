do $mig$
declare
  r record; l char; e text; nome text; cmd text;
begin
  for r in select * from (values
    ('centri','s',$p${A} or {id:miei_centri}$p$),
    ('centri','u',$p${A} or {id:centri_dt}$p$),
    ('centri','id',$p${A}$p$),
    ('aree','s',$p${A} or {CE}$p$),
    ('aree','iud',$p${A} or {DT}$p$),
    ('membri','s',$p${A} or {STAFF} or user_id = (select auth.uid()) or {id:membri_vicini}$p$),
    ('membri','i',$p${A} or {DT} or (ruolo in ('genitore','allievo') and ({AMM} or {centro_id:centri_permesso:iscrizioni}))$p$),
    ('membri','u',$p${A} or {DT} or user_id = (select auth.uid())$p$),
    ('membri','d',$p${A} or {DT}$p$),
    ('inviti','s',$p${A} or {STAFF} or {creato_da:miei_membri}$p$),
    ('inviti','i',$p${A} or ({DT} and (ruolo <> 'titolare' or {TIT})) or (ruolo = 'allievo' and {allievo_id:miei_figli} and {creato_da:miei_membri})$p$),
    ('inviti','ud',$p${A} or {DT} or {creato_da:miei_membri}$p$),
    ('campi','s',$p${A} or {CE}$p$),
    ('campi','iu',$p${A} or {DT} or {centro_id:centri_permesso:campi}$p$),
    ('campi','d',$p${A} or {DT}$p$),
    ('gruppi','s',$p${A} or {AMM} or {id:miei_gruppi}$p$),
    ('gruppi','iu',$p${A} or {DT} or {area_id:aree_permesso:gruppi}$p$),
    ('gruppi','d',$p${A} or {DT}$p$),
    ('gruppi_maestri','s',$p${A} or {AMM} or {gruppo_id:miei_gruppi}$p$),
    ('gruppi_maestri','iud',$p${A} or {DT} or gruppo_id in (select g.id from public.gruppi g where {g.area_id:aree_permesso:maestri})$p$),
    ('allievi','s',$p${A} or {AMM} or {id:miei_allievi}$p$),
    ('allievi','i',$p${A} or {AMM} or {centro_id:centri_permesso:iscrizioni}$p$),
    ('allievi','u',$p${A} or {AMM} or {id:miei_allievi_famiglia}$p$),
    ('allievi','d',$p${A} or {DT}$p$),
    ('allievi_famiglie','s',$p${A} or {AMM} or {membro_id:miei_membri} or {allievo_id:miei_allievi}$p$),
    ('allievi_famiglie','i',$p${A} or {AMM} or {centro_id:centri_permesso:iscrizioni}$p$),
    ('allievi_famiglie','ud',$p${A} or {AMM}$p$),
    ('iscrizioni','s',$p${A} or {AMM} or {allievo_id:miei_allievi} or {gruppo_id:miei_gruppi_gestione}$p$),
    ('iscrizioni','iu',$p${A} or {AMM} or gruppo_id in (select g.id from public.gruppi g where {g.area_id:aree_permesso:iscrizioni})$p$),
    ('iscrizioni','d',$p${A} or {DT}$p$),
    ('cambi_campo','s',$p${A} or {AMM} or {gruppo_id:miei_gruppi}$p$),
    ('cambi_campo','iud',$p${A} or {DT} or {centro_id:centri_permesso:campi}$p$),
    ('lezioni','s',$p${A} or {AMM} or {gruppo_id:miei_gruppi} or {maestro_id:miei_membri}$p$),
    ('lezioni','i',$p${A} or {DT} or {gruppo_id:miei_gruppi_maestro}$p$),
    ('lezioni','u',$p${A} or {DT} or {gruppo_id:miei_gruppi_maestro} or {maestro_id:miei_membri}$p$),
    ('lezioni','d',$p${A} or {DT}$p$),
    ('presenze','s',$p${A} or {AMM} or {allievo_id:miei_allievi} or lezione_id in (select l.id from public.lezioni l where {l.maestro_id:miei_membri})$p$),
    ('presenze','iud',$p${A} or {DT} or lezione_id in (select l.id from public.lezioni l where {l.gruppo_id:miei_gruppi_maestro} or {l.maestro_id:miei_membri})$p$),
    ('assenze','s',$p${A} or {AMM} or {allievo_id:miei_allievi}$p$),
    ('assenze','iu',$p${A} or {AMM} or {allievo_id:miei_allievi_maestro}$p$),
    ('assenze','d',$p${A} or {AMM}$p$),
    ('valutazioni','s',$p${A} or {AMM} or {allievo_id:miei_allievi}$p$),
    ('valutazioni','iu',$p${A} or {DT} or ({allievo_id:miei_allievi_maestro} and {maestro_id:miei_membri})$p$),
    ('valutazioni','d',$p${A} or {DT} or {maestro_id:miei_membri}$p$),
    ('compiti','s',$p${A} or {AMM} or {maestro_id:miei_membri} or {allievo_id:miei_allievi} or {gruppo_id:miei_gruppi}$p$),
    ('compiti','i',$p${A} or {DT} or ({centro_id:centri_maestro} and {maestro_id:miei_membri})$p$),
    ('compiti','ud',$p${A} or {DT} or {maestro_id:miei_membri}$p$),
    ('compiti_fatti','s',$p${A} or {AMM} or {allievo_id:miei_allievi}$p$),
    ('compiti_fatti','iud',$p${A} or {allievo_id:miei_allievi_famiglia}$p$),
    ('note_private','s',$p${A} or {STAFF} or {allievo_id:miei_allievi_maestro}$p$),
    ('note_private','i',$p${A} or {DT} or ({allievo_id:miei_allievi_maestro} and {maestro_id:miei_membri})$p$),
    ('note_private','ud',$p${A} or {DT} or {maestro_id:miei_membri}$p$),
    ('linee_guida','s',$p${A} or {SM}$p$),
    ('linee_guida','iud',$p${A} or {DT}$p$),
    ('modelli_lezione','s',$p${A} or {SM}$p$),
    ('modelli_lezione','iud',$p${A} or {DT}$p$),
    ('programmi','s',$p${A} or {SM}$p$),
    ('programmi','iud',$p${A} or {DT}$p$),
    ('corsi_formazione','s',$p${A} or {SM}$p$),
    ('corsi_formazione','iud',$p${A} or {DT}$p$),
    ('esercizi','s',$p${A} or {SM} or ({centro_id:miei_centri} and stato = 'approvato') or {proposto_da:miei_membri}$p$),
    ('esercizi','i',$p${A} or {DT} or ({centro_id:centri_maestro} and stato = 'proposto' and fonte = 'maestro' and {proposto_da:miei_membri})$p$),
    ('esercizi','u',$p${A} or {DT}$p$),
    ('esercizi','d',$p${A} or {DT} or ({proposto_da:miei_membri} and stato = 'proposto')$p$),
    ('osservazioni','s',$p${A} or {DT} or {osservatore_id:miei_membri} or {maestro_id:miei_membri}$p$),
    ('osservazioni','i',$p${A} or {DT} or ({STAFF} and {osservatore_id:miei_membri})$p$),
    ('osservazioni','u',$p${A} or {DT} or {osservatore_id:miei_membri}$p$),
    ('osservazioni','d',$p${A} or {DT}$p$),
    ('formazione','s',$p${A} or {STAFF} or {membro_id:miei_membri}$p$),
    ('formazione','iu',$p${A} or {DT} or {membro_id:miei_membri}$p$),
    ('formazione','d',$p${A} or {DT}$p$),
    ('conversazioni','s',$p${A} or {DT} or {id:mie_conversazioni} or {creata_da:miei_membri}$p$),
    ('conversazioni','i',$p${A} or ({CE} and {creata_da:miei_membri} and (tipo <> 'staff' or {STAFF}))$p$),
    ('conversazioni','ud',$p${A} or {DT}$p$),
    ('partecipanti','s',$p${A} or {DT} or {conversazione_id:mie_conversazioni}$p$),
    ('partecipanti','i',$p${A} or {STAFF} or conversazione_id in (select c.id from public.conversazioni c where {c.creata_da:miei_membri})$p$),
    ('partecipanti','ud',$p${A} or {DT}$p$),
    ('messaggi','s',$p${A} or {DT} or ({conversazione_id:mie_conversazioni} and (consegna_il <= now() or {autore_id:miei_membri}))$p$),
    ('messaggi','i',$p${A}$p$),
    ('avvisi','s',$p${A} or {STAFF} or {autore_id:miei_membri} or id in (select n.rif_id from public.notifiche n where {n.membro_id:miei_membri} and n.tipo = 'avviso' and n.consegna_il <= now())$p$),
    ('avvisi','i',$p${A} or {AMM}$p$),
    ('avvisi','ud',$p${A} or {DT} or {autore_id:miei_membri}$p$),
    ('avvisi_letture','s',$p${A} or {STAFF} or {membro_id:miei_membri} or avviso_id in (select a.id from public.avvisi a where {a.autore_id:miei_membri})$p$),
    ('avvisi_letture','iu',$p${A} or {membro_id:miei_membri}$p$),
    ('segnalazioni','s',$p${A} or {TIT} or (not riguarda_dt and {DT}) or {autore_id:miei_membri}$p$),
    ('segnalazioni','id',$p${A}$p$),
    ('segnalazioni','u',$p${A} or {TIT} or (not riguarda_dt and {DT})$p$),
    ('segnalazioni_note','si',$p${A} or {TIT} or ({DT} and segnalazione_id in (select s.id from public.segnalazioni s where not s.riguarda_dt))$p$),
    ('notifiche','s',$p${A} or {DT} or ({membro_id:miei_membri} and consegna_il <= now())$p$),
    ('notifiche','i',$p${A} or {STAFF}$p$),
    ('notifiche','ud',$p${A} or {membro_id:miei_membri}$p$),
    ('consensi','s',$p${A} or {AMM} or {allievo_id:miei_allievi}$p$),
    ('consensi','iu',$p${A} or {AMM} or {allievo_id:miei_figli}$p$),
    ('consensi','d',$p${A} or {DT}$p$),
    ('permessi_ruolo','s',$p${A} or {STAFF}$p$),
    ('permessi_ruolo','iud',$p${A} or {DT}$p$),
    ('registro','s',$p${A} or {DT} or {membro_id:miei_membri}$p$),
    ('registro','i',$p${A} or {DT} or ({CE} and {membro_id:miei_membri})$p$),
    ('corsi','s',$p${A} or {CE}$p$),
    ('corsi','iu',$p${A} or {AMM}$p$),
    ('corsi','d',$p${A} or {DT}$p$),
    ('quote','s',$p${A} or {AMM} or {centro_id:centri_permesso:pagamenti} or {allievo_id:miei_figli}$p$),
    ('quote','iu',$p${A} or {AMM}$p$),
    ('quote','d',$p${A} or {DT}$p$)
  ) v(t, c, x)
  loop
    e := r.x;
    -- scorciatoie sul centro: {DT} = sono DT o titolare del centro della riga, ecc.
    e := replace(e, '{A}', '(select public.is_admin())');
    e := replace(e, '{DT}', '{centro_id:centri_dt}');
    e := replace(e, '{AMM}', '{centro_id:centri_amm}');
    e := replace(e, '{STAFF}', '{centro_id:centri_staff}');
    e := replace(e, '{SM}', '{centro_id:centri_staff_maestro}');
    e := replace(e, '{TIT}', '{centro_id:centri_titolare}');
    e := replace(e, '{CE}', '{centro_id:miei_centri}');
    -- {col:funzione} = "col = any(array)": il cast ::uuid[] evita che Postgres legga any((select ..)) come sottoquery a righe
    e := regexp_replace(e, '\{([\w.]+):(\w+):(\w+)\}', '\1 = any ((select public.\2(''\3''))::uuid[])', 'g');
    e := regexp_replace(e, '\{([\w.]+):(\w+)\}', '\1 = any ((select public.\2())::uuid[])', 'g');
    for l in select unnest(string_to_array(regexp_replace(r.c, '(.)', '\1,', 'g'), ',')) loop
      continue when l = '';
      if l = 's' then
        execute format('create policy %I on public.%I for select to authenticated using (%s)', r.t || ': leggo', r.t, e);
      elsif l = 'i' then
        execute format('create policy %I on public.%I for insert to authenticated with check (%s)', r.t || ': inserisco', r.t, e);
      elsif l = 'u' then
        execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', r.t || ': aggiorno', r.t, e, e);
      elsif l = 'd' then
        execute format('create policy %I on public.%I for delete to authenticated using (%s)', r.t || ': elimino', r.t, e);
      end if;
    end loop;
  end loop;
end $mig$;

create policy "profilo: admin legge tutti" on public.profiles for select to authenticated using ((select public.is_admin()));
