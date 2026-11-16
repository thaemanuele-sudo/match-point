"use client";
// Dati e operazioni dell'area E (maestro). Ogni query usa membroAttivo.id (mai auth.uid()):
// così il titolare può "vedere come" un maestro e vede le stesse cose che vede lui.
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, isoGiorno } from "@/lib/centro/date";
import {
  campoEffettivo, pianoDaModello, pianoLibero, situazioneProgramma, svoltoDaPiano,
  type Blocco, type RAllievo, type RCambio, type RCampo, type REsercizio, type RGruppo, type RIscrizione, type RLezione, type RModello, type RPresenza, type RProgramma,
} from "./util";

export type DatiMaestro = {
  gruppi: RGruppo[];
  campi: Map<string, RCampo>;
  programmi: Map<string, RProgramma>;
  modelli: RModello[];
  esercizi: Map<string, REsercizio>;
  allievi: Map<string, RAllievo>;
  /** gruppo_id → allievi iscritti oggi (ordinati per cognome). */
  iscritti: Map<string, RAllievo[]>;
  /** Cambi di campo da ieri a 30 giorni avanti, per i miei gruppi. */
  cambi: RCambio[];
};

/** Colonne lette: mai select("*") (regola "Scala" di docs/CENTRI.md). note_mediche non serve al maestro e non si scarica. */
export const COL = {
  gruppi: "id,nome,fascia,livello,giorni,ora,durata_min,campo_id,programma_id,attivo,area_id",
  campi: "id,numero,nome,superficie,copertura,luci,stato",
  programmi: "id,nome,fascia,schema,anno,mesi,settimane_test",
  modelli: "id,nome,durata_min,blocchi",
  esercizi: "id,titolo,colpo,fasce,durata_min,materiale,descrizione,stato",
  cambi: "id,gruppo_id,data,campo_da,campo_a,motivo,deciso_da",
  allievi: "id,nome,cognome,data_nascita,membro_id,certificato_scade",
  lezioni: "id,gruppo_id,data,ora,campo_id,maestro_id,modello_id,piano,svolto,stato,riassunto,riassunto_ok,compito,motivi_scostamento",
  presenze: "id,lezione_id,allievo_id,presente,voto_rapido,nota,nota_audio_path",
  valutazioni: "id,allievo_id,maestro_id,test,colpo,competenza,voto,data",
} as const;

type Pagina<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
/**
 * Legge tutte le righe di una query a blocchi con .range(): PostgREST taglia a 1000 righe e una sola richiesta enorme
 * rallenterebbe tutto. Pagine in sequenza (non è un N+1: è la stessa query a pezzi), con un tetto di sicurezza.
 */
export async function leggiPagine<T>(pagina: (da: number, a: number) => Pagina<T>, blocco = 1000, massimo = 8): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < massimo; i++) {
    const r = await pagina(i * blocco, (i + 1) * blocco - 1);
    if (r.error) throw new Error(r.error.message);
    const righe = r.data ?? [];
    out.push(...righe);
    if (righe.length < blocco) break;
  }
  return out;
}

const msg = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e));
const ordinaAllievi = (a: RAllievo, b: RAllievo) => (a.cognome ?? "").localeCompare(b.cognome ?? "", "it") || a.nome.localeCompare(b.nome, "it");

/** Gruppi del maestro con tutto ciò che serve alle sue schermate: campi, programmi, modelli, libreria, allievi, cambi di campo. */
export function useMaestroDati() {
  const { centro, membroAttivo: ma, sb } = useCentro();
  const [dati, setDati] = useState<DatiMaestro | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);
  const maId = ma?.id ?? null;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!maId) { if (vivo) setDati({ gruppi: [], campi: new Map(), programmi: new Map(), modelli: [], esercizi: new Map(), allievi: new Map(), iscritti: new Map(), cambi: [] }); return; }
        const gm = await sb.from("gruppi_maestri").select("gruppo_id").eq("membro_id", maId);
        if (gm.error) throw gm.error;
        const ids = [...new Set((gm.data ?? []).map((r: { gruppo_id: string }) => r.gruppo_id))];
        const gr = ids.length ? await sb.from("gruppi").select(COL.gruppi).in("id", ids).eq("centro_id", centro.id) : { data: [], error: null };
        if (gr.error) throw gr.error;
        const gruppi = ((gr.data ?? []) as RGruppo[]).filter((g) => g.attivo !== false).sort((a, b) => (a.ora ?? "").localeCompare(b.ora ?? "") || a.nome.localeCompare(b.nome, "it"));
        const gIds = gruppi.map((g) => g.id);
        const progIds = [...new Set(gruppi.map((g) => g.programma_id).filter((x): x is string => !!x))];
        const oggi = isoGiorno();
        const fasce = [...new Set(gruppi.map((g) => g.fascia).filter((f): f is string => !!f))];
        const [campiR, progR, modR, esR, iscR, cambR] = await Promise.all([
          sb.from("campi").select(COL.campi).eq("centro_id", centro.id),
          progIds.length ? sb.from("programmi").select(COL.programmi).in("id", progIds) : Promise.resolve({ data: [], error: null }),
          sb.from("modelli_lezione").select(COL.modelli).eq("centro_id", centro.id),
          // solo la libreria delle fasce dei miei gruppi: la libreria di un grande centro può avere migliaia di esercizi
          fasce.length ? sb.from("esercizi").select(COL.esercizi).eq("centro_id", centro.id).eq("stato", "approvato").overlaps("fasce", fasce).limit(400) : Promise.resolve({ data: [], error: null }),
          gIds.length ? sb.from("iscrizioni").select("allievo_id,gruppo_id,dal,al").in("gruppo_id", gIds) : Promise.resolve({ data: [], error: null }),
          gIds.length ? sb.from("cambi_campo").select(COL.cambi).in("gruppo_id", gIds).gte("data", isoGiorno(aggiungiGiorni(oggi, -1))).lte("data", isoGiorno(aggiungiGiorni(oggi, 30))) : Promise.resolve({ data: [], error: null }),
        ]);
        for (const r of [campiR, progR, modR, esR, iscR, cambR]) if (r.error) throw r.error;
        // iscrizione valida oggi: iniziata e non terminata
        const isc = ((iscR.data ?? []) as RIscrizione[]).filter((i) => (!i.dal || i.dal <= oggi) && (!i.al || i.al >= oggi));
        const aIds = [...new Set(isc.map((i) => i.allievo_id))];
        const alR = aIds.length ? await sb.from("allievi").select(COL.allievi).in("id", aIds) : { data: [], error: null };
        if (alR.error) throw alR.error;
        const allievi = new Map<string, RAllievo>(((alR.data ?? []) as RAllievo[]).map((a) => [a.id, a]));
        const iscritti = new Map<string, RAllievo[]>();
        for (const g of gruppi) {
          iscritti.set(g.id, isc.filter((i) => i.gruppo_id === g.id).map((i) => allievi.get(i.allievo_id)).filter((a): a is RAllievo => !!a).sort(ordinaAllievi));
        }
        if (!vivo) return;
        setDati({
          gruppi, iscritti, allievi,
          campi: new Map(((campiR.data ?? []) as RCampo[]).map((c) => [c.id, c])),
          programmi: new Map(((progR.data ?? []) as RProgramma[]).map((p) => [p.id, p])),
          modelli: (modR.data ?? []) as RModello[],
          esercizi: new Map(((esR.data ?? []) as REsercizio[]).map((e) => [e.id, e])),
          cambi: (cambR.data ?? []) as RCambio[],
        });
        setErrore(null);
      } catch (e) {
        if (vivo) setErrore(msg(e));
      }
    })();
    return () => { vivo = false; };
  }, [sb, centro.id, maId, giro]);

  return { dati, errore, ricarica, caricamento: !dati && !errore };
}

/** Scrive una riga nel registro del centro (modifiche del Metodo, sostituzioni di blocco). Restituisce il messaggio d'errore, se c'è. */
export async function scriviRegistro(sb: SupabaseClient, centroId: string, membroId: string, azione: string, oggetto: string, dettagli: Record<string, unknown>): Promise<string | null> {
  const { error } = await sb.from("registro").insert({ centro_id: centroId, membro_id: membroId, azione, oggetto, dettagli });
  return error ? error.message : null;
}

/**
 * Trova la lezione di un gruppo in una data, o la crea dal programma e dal modello della settimana.
 * Il piano nasce dal modello: modello della settimana del programma, poi un modello di pari durata, poi un blocco libero.
 */
export async function assicuraLezione(
  sb: SupabaseClient, centroId: string, maestroId: string, g: RGruppo, data: string, d: DatiMaestro,
): Promise<string> {
  const es = await sb.from("lezioni").select("id").eq("centro_id", centroId).eq("gruppo_id", g.id).eq("data", data).limit(1);
  if (es.error) throw es.error;
  if (es.data?.[0]) return String(es.data[0].id);

  const sit = situazioneProgramma(g.programma_id ? d.programmi.get(g.programma_id) : null, data);
  const durata = g.durata_min ?? 60;
  const modello =
    (sit?.modello_id ? d.modelli.find((m) => m.id === sit.modello_id) : undefined) ??
    d.modelli.find((m) => m.durata_min === durata) ??
    null;
  const piano: Blocco[] = modello ? pianoDaModello(modello.blocchi, d.esercizi) : pianoLibero(durata, g.nome);
  const { campo } = campoEffettivo(g, data, d.cambi, d.campi, null);
  const ins = await sb
    .from("lezioni")
    .insert({
      centro_id: centroId, gruppo_id: g.id, data, ora: g.ora, campo_id: campo?.id ?? g.campo_id, maestro_id: maestroId,
      modello_id: modello?.id ?? null, piano, svolto: svoltoDaPiano(piano), stato: "programmata", motivi_scostamento: {},
    })
    .select("id")
    .single();
  if (ins.error) throw ins.error;
  return String(ins.data.id);
}

/** Salva piano e svolto (parallelo al piano, nella forma concordata con l'area B). */
export async function salvaPiano(sb: SupabaseClient, lezioneId: string, piano: Blocco[], svoltoPrima: Parameters<typeof svoltoDaPiano>[1]): Promise<string | null> {
  const { error } = await sb.from("lezioni").update({ piano, svolto: svoltoDaPiano(piano, svoltoPrima) }).eq("id", lezioneId);
  return error ? error.message : null;
}

export type DatiLezione = {
  lezione: RLezione;
  gruppo: RGruppo | null;
  allievi: RAllievo[];
  presenze: RPresenza[];
  /** Allievi che hanno già avvisato l'assenza per quel giorno. */
  assenti: Set<string>;
};

/** Una lezione con il suo gruppo, gli allievi e le presenze già registrate. */
export function useLezione(id: string, dati: DatiMaestro | null) {
  const { centro, sb } = useCentro();
  const [d, setD] = useState<DatiLezione | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    if (!dati || id === "nuova") return;
    let vivo = true;
    (async () => {
      try {
        const lr = await sb.from("lezioni").select(COL.lezioni).eq("id", id).maybeSingle();
        if (lr.error) throw lr.error;
        const lezione = lr.data as RLezione | null;
        if (!lezione) { if (vivo) setErrore("nonTrovata"); return; }
        const gruppo = lezione.gruppo_id ? dati.gruppi.find((g) => g.id === lezione.gruppo_id) ?? null : null;
        const [pr, ar] = await Promise.all([
          sb.from("presenze").select(COL.presenze).eq("lezione_id", id),
          sb.from("assenze").select("allievo_id").eq("centro_id", centro.id).eq("data", lezione.data),
        ]);
        if (pr.error) throw pr.error;
        const presenze = (pr.data ?? []) as RPresenza[];
        // gruppo: gli iscritti; lezione individuale (senza gruppo): gli allievi che hanno una riga di presenza
        let allievi = gruppo ? dati.iscritti.get(gruppo.id) ?? [] : [];
        const mancanti = presenze.map((p) => p.allievo_id).filter((x) => !allievi.some((a) => a.id === x));
        if (mancanti.length) {
          const extra = await sb.from("allievi").select(COL.allievi).in("id", mancanti);
          if (extra.error) throw extra.error;
          allievi = [...allievi, ...((extra.data ?? []) as RAllievo[])];
        }
        if (!vivo) return;
        setD({ lezione, gruppo, allievi, presenze, assenti: new Set((ar.data ?? []).map((r: { allievo_id: string }) => r.allievo_id)) });
        setErrore(null);
      } catch (e) {
        if (vivo) setErrore(msg(e));
      }
    })();
    return () => { vivo = false; };
  }, [sb, centro.id, id, dati, giro]);

  return { d, errore, ricarica, caricamento: !d && !errore, setD };
}

/** Crea le righe di presenza che mancano (chi ha avvisato l'assenza parte come assente) e restituisce tutte le righe. */
export async function assicuraPresenze(sb: SupabaseClient, centroId: string, d: DatiLezione): Promise<RPresenza[]> {
  const mancanti = d.allievi.filter((a) => !d.presenze.some((p) => p.allievo_id === a.id));
  if (!mancanti.length) return d.presenze;
  const { data, error } = await sb
    .from("presenze")
    .insert(mancanti.map((a) => ({ centro_id: centroId, lezione_id: d.lezione.id, allievo_id: a.id, presente: !d.assenti.has(a.id) })))
    .select(COL.presenze);
  if (error) throw error;
  return [...d.presenze, ...((data ?? []) as RPresenza[])];
}

export { msg as messaggioErrore };
