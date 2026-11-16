"use client";
// Numeri calcolati dai dati veri per M2, M3 e M4: progressi per allievo, assenze ripetute, aderenza al Metodo del gruppo.
import { useEffect, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, isoGiorno } from "@/lib/centro/date";
import { messaggioErrore, type DatiMaestro } from "./dati";
import { leggiPiano, leggiSvolto, ordineTest, pctDaVoto, type RValutazione } from "./util";

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

/** Statistiche di tutti gli allievi dei gruppi del maestro. */
export function useStatAllievi(dati: DatiMaestro | null) {
  const { sb } = useCentro();
  const [stat, setStat] = useState<Map<string, StatAllievo> | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!dati) return;
    const ids = [...dati.allievi.keys()];
    if (!ids.length) { setStat(new Map()); return; }
    let vivo = true;
    (async () => {
      try {
        const da = isoGiorno(aggiungiGiorni(new Date(), -30));
        const [v, p] = await Promise.all([
          sb.from("valutazioni").select("*").in("allievo_id", ids),
          // lezioni!inner: solo le presenze di lezioni degli ultimi 30 giorni
          sb.from("presenze").select("allievo_id,presente,lezioni!inner(data)").in("allievo_id", ids).gte("lezioni.data", da),
        ]);
        if (v.error) throw v.error;
        if (p.error) throw p.error;
        const val = new Map<string, RValutazione[]>();
        for (const x of (v.data ?? []) as RValutazione[]) val.set(x.allievo_id, [...(val.get(x.allievo_id) ?? []), x]);
        const as = new Map<string, number>();
        const pr = new Map<string, number>();
        for (const x of (p.data ?? []) as unknown as { allievo_id: string; presente: boolean | null }[]) {
          if (x.presente === false) as.set(x.allievo_id, (as.get(x.allievo_id) ?? 0) + 1);
          if (x.presente) pr.set(x.allievo_id, (pr.get(x.allievo_id) ?? 0) + 1);
        }
        if (!vivo) return;
        setStat(new Map(ids.map((id) => [id, calcolaStat(val.get(id) ?? [], as.get(id) ?? 0, pr.get(id) ?? 0)])));
        setErrore(null);
      } catch (e) {
        if (vivo) setErrore(messaggioErrore(e));
      }
    })();
    return () => { vivo = false; };
  }, [dati, sb]);

  return { stat, errore };
}

/**
 * Aderenza al Metodo di ogni gruppo: dei blocchi bloccati delle lezioni chiuse nelle ultime sei settimane,
 * quanti sono stati fatti come da piano (fatti e non sostituiti). Stessa regola di aderenza_maestro, ma per gruppo.
 */
export function useAderenza(dati: DatiMaestro | null) {
  const { sb } = useCentro();
  const [ad, setAd] = useState<Map<string, number | null> | null>(null);

  useEffect(() => {
    if (!dati) return;
    const gIds = dati.gruppi.map((g) => g.id);
    if (!gIds.length) { setAd(new Map()); return; }
    let vivo = true;
    (async () => {
      const da = isoGiorno(aggiungiGiorni(new Date(), -42));
      const r = await sb.from("lezioni").select("gruppo_id,piano,svolto").in("gruppo_id", gIds).eq("stato", "chiusa").gte("data", da);
      const conta = new Map<string, { tot: number; ok: number }>();
      for (const l of (r.data ?? []) as { gruppo_id: string; piano: unknown; svolto: unknown }[]) {
        const piano = leggiPiano(l.piano);
        const svolto = leggiSvolto(l.svolto);
        const c = conta.get(l.gruppo_id) ?? { tot: 0, ok: 0 };
        piano.forEach((b, i) => {
          if (b.modo !== "bloccato") return;
          c.tot++;
          const s = svolto.find((x) => x.indice === i);
          if (s && s.fatto && !s.sostituito && !s.saltato) c.ok++;
        });
        conta.set(l.gruppo_id, c);
      }
      if (!vivo) return;
      // errore di rete: l'aderenza è un'informazione in più, la pagina funziona anche senza
      setAd(new Map(gIds.map((id) => { const c = conta.get(id); return [id, c && c.tot ? Math.round((c.ok / c.tot) * 100) : null]; })));
    })().catch(() => { if (vivo) setAd(new Map()); });
    return () => { vivo = false; };
  }, [dati, sb]);

  return ad;
}
