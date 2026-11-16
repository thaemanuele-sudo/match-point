"use client";
// Numeri calcolati dai dati veri per M2, M3 e M4: progressi per allievo, assenze ripetute, aderenza al Metodo del gruppo.
import { useEffect, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, isoGiorno } from "@/lib/centro/date";
import { COL, leggiPagine, messaggioErrore, type DatiMaestro } from "./dati";
import { ordineTest, pctDaVoto, type RValutazione } from "./util";

export type StatAllievo = {
  /** Media dell'ultimo test, 0-100; null se non ha ancora voti. */
  pct: number | null;
  /** Punti rispetto al test precedente; null se non c'è un test precedente. */
  delta: number | null;
  /** La competenza con il voto più basso nell'ultimo test: "errore principale". */
  peggiore: { colpo: string; competenza: string; voto: number } | null;
  assenze30: number;
  presenze30: number;
  inRitardo: boolean;
  assenzeRipetute: boolean;
  valutazioni: RValutazione[];
};

export const SOGLIA_RITARDO = 60;
export const SOGLIA_ASSENZE = 2;

/** Calcolo puro: valutazioni e presenze di un allievo → numeri della scheda. */
export function calcolaStat(val: RValutazione[], assenze30: number, presenze30: number): StatAllievo {
  const test = [...new Set(val.map((v) => v.test))].sort((a, b) => ordineTest(a) - ordineTest(b));
  const ultimo = test[test.length - 1];
  const prima = test[test.length - 2];
  const media = (t: string | undefined) => {
    const r = val.filter((v) => v.test === t);
    return r.length ? Math.round(pctDaVoto(r.reduce((s, v) => s + v.voto, 0) / r.length)) : null;
  };
  const pct = media(ultimo);
  const pp = media(prima);
  const peggiore = val.filter((v) => v.test === ultimo).sort((a, b) => a.voto - b.voto)[0];
  return {
    pct, delta: pct !== null && pp !== null ? pct - pp : null,
    peggiore: peggiore ? { colpo: peggiore.colpo, competenza: peggiore.competenza, voto: peggiore.voto } : null,
    assenze30, presenze30,
    inRitardo: pct !== null && pct < SOGLIA_RITARDO,
    assenzeRipetute: assenze30 >= SOGLIA_ASSENZE,
    valutazioni: val,
  };
}

/** Riga di `allievi_stato_lista` (docs/RPC.md): presenze degli ultimi 30 giorni e bandierine "in ritardo" / "assenze ripetute". */
type RigaStato = { id: string; perc: number | null; assenti: number | null; su: number | null; ritardo: boolean | null; ripetute: boolean | null };
/** Riga di `statistiche_allievi_maestro`. */
type RigaMedia = { allievo_id: string; presenze_30g_pct: number | null; media_ultimo_test: number | string | null };

/**
 * Statistiche di tutti gli allievi dei gruppi del maestro.
 * Presenze, "in ritardo" e "assenze ripetute" li calcola il database (`allievi_stato_lista`) e la media dell'ultimo test
 * anche (`statistiche_allievi_maestro`); restano nel browser solo i voti, che servono per l'errore principale e il
 * confronto con il test precedente di ogni allievo.
 */
export function useStatAllievi(dati: DatiMaestro | null) {
  const { sb, centro, membroAttivo: ma } = useCentro();
  const maId = ma?.id ?? null;
  const [stat, setStat] = useState<Map<string, StatAllievo> | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!dati) return;
    const ids = [...dati.allievi.keys()];
    if (!ids.length || !maId) { setStat(new Map()); return; }
    let vivo = true;
    (async () => {
      try {
        const daVal = isoGiorno(aggiungiGiorni(new Date(), -400));
        // `allievi_stato_lista` è "invoker": la RLS lascia vedere solo gli allievi dei gruppi del maestro. Si legge a pagine da 1000.
        const stato: RigaStato[] = [];
        for (let off = 0; off < 25000; off += 1000) {
          const r = await sb.rpc("allievi_stato_lista", { p_centro: centro.id, p_filtro: "tutti", p_limit: 1000, p_offset: off });
          if (r.error) throw new Error(`allievi_stato_lista: ${r.error.message}`);
          const righe = (r.data ?? []) as RigaStato[];
          stato.push(...righe);
          if (righe.length < 1000) break;
        }
        const [medie, v] = await Promise.all([
          sb.rpc("statistiche_allievi_maestro", { p_membro: maId }),
          // a pagine di 1000 righe, con intervallo di date: i voti più vecchi di un anno non servono al confronto fra test
          leggiPagine<RValutazione>((a, b) => sb.from("valutazioni").select(COL.valutazioni).in("allievo_id", ids).gte("data", daVal).order("data", { ascending: false }).range(a, b)),
        ]);
        if (medie.error) throw new Error(`statistiche_allievi_maestro: ${medie.error.message}`);
        const mediaDi = new Map(((medie.data ?? []) as RigaMedia[]).map((m) => [m.allievo_id, m.media_ultimo_test == null ? null : Number(m.media_ultimo_test)]));
        const statoDi = new Map(stato.map((x) => [x.id, x]));
        const val = new Map<string, RValutazione[]>();
        for (const x of v) val.set(x.allievo_id, [...(val.get(x.allievo_id) ?? []), x]);
        if (!vivo) return;
        setStat(new Map(ids.map((id) => {
          const st = statoDi.get(id);
          const su = st?.su ?? 0;
          const assenti = st?.assenti ?? 0;
          const base = calcolaStat(val.get(id) ?? [], assenti, su - assenti);
          const media = mediaDi.get(id);
          return [id, {
            ...base,
            // la media dell'ultimo test e le due bandierine sono quelle del database
            pct: media != null ? pctDaVoto(media) : base.pct,
            inRitardo: st ? !!st.ritardo : base.inRitardo,
            assenzeRipetute: st ? !!st.ripetute : base.assenzeRipetute,
          }];
        })));
        setErrore(null);
      } catch (e) {
        if (vivo) setErrore(messaggioErrore(e));
      }
    })();
    return () => { vivo = false; };
  }, [dati, sb, centro.id, maId]);

  return { stat, errore };
}

/**
 * Aderenza al Metodo di ogni gruppo del maestro (RPC `aderenza_gruppi`): dei blocchi bloccati delle lezioni chiuse
 * nell'ultimo anno, quanti sono stati fatti come da piano (fatti e non sostituiti). Stessa regola di aderenza_maestro, ma per gruppo.
 */
export function useAderenza(dati: DatiMaestro | null) {
  const { sb, membroAttivo: ma } = useCentro();
  const maId = ma?.id ?? null;
  const [ad, setAd] = useState<Map<string, number | null> | null>(null);

  useEffect(() => {
    if (!dati) return;
    const gIds = dati.gruppi.map((g) => g.id);
    if (!gIds.length || !maId) { setAd(new Map()); return; }
    let vivo = true;
    (async () => {
      const r = await sb.rpc("aderenza_gruppi", { p_membro: maId });
      if (r.error) throw r.error;
      const perGruppo = new Map(((r.data ?? []) as { gruppo_id: string; aderenza: number | string | null }[]).map((x) => [x.gruppo_id, x.aderenza == null ? null : Math.round(Number(x.aderenza))]));
      if (!vivo) return;
      setAd(new Map(gIds.map((id) => [id, perGruppo.get(id) ?? null])));
    })().catch(() => { if (vivo) setAd(new Map()); }); // errore di rete: l'aderenza è un'informazione in più, la pagina funziona anche senza
    return () => { vivo = false; };
  }, [dati, sb, maId]);

  return ad;
}
