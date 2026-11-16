"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCentro } from "./contesto";
import type { Notifica } from "./tipi-base";

// Colonne esplicite: `notifiche` ha centinaia di migliaia di righe per centro
const COLONNE = "id,centro_id,membro_id,tipo,titolo,testo,link,mittente,letta_il,created_at";

/** Segna una notifica come letta (RLS: solo le proprie). Il realtime aggiorna le liste aperte. */
export async function segnaLetta(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("notifiche").update({ letta_il: new Date().toISOString() }).eq("id", id).is("letta_il", null);
  if (error) throw new Error(error.message);
}

/** Blocco di notifiche: come ogni lista lunga del centro si legge a blocchi di 50 con .range(). */
const BLOCCO = 50;
// Il conteggio da mostrare sul campanello arriva dal database (count head), non dalle righe caricate
const ATTESA_CONTEGGIO_MS = 300;

/**
 * Notifiche del membro attivo (anche in "vedi come"). Carica le ultime 50 più le non lette (indice membro, letta_il, data)
 * e resta in ascolto su Supabase realtime filtrando per membro: nuove e lette arrivano senza ricaricare.
 * `conteggio` = non lette in totale (count lato database); `altre()` aggiunge il blocco successivo.
 */
export function useNotifiche() {
  const { membroAttivo, sb } = useCentro();
  const membroId = membroAttivo?.id ?? null;
  const [lista, setLista] = useState<Notifica[]>([]);
  const [conteggio, setConteggio] = useState(0);
  const [haAltre, setHaAltre] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const caricate = useRef(0);
  const listaRef = useRef<Notifica[]>([]);
  listaRef.current = lista;
  const timerConteggio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contaNonLette = useCallback(async () => {
    if (!membroId) { setConteggio(0); return; }
    const { count, error } = await sb.from("notifiche").select("id", { count: "exact", head: true }).eq("membro_id", membroId).is("letta_il", null);
    if (!error && count !== null) setConteggio(count);
  }, [sb, membroId]);

  // dopo una raffica di eventi realtime si rilegge il conteggio una volta sola
  const contaPresto = useCallback(() => {
    if (timerConteggio.current) clearTimeout(timerConteggio.current);
    timerConteggio.current = setTimeout(() => { void contaNonLette(); }, ATTESA_CONTEGGIO_MS);
  }, [contaNonLette]);

  const ricarica = useCallback(async () => {
    if (!membroId) { setLista([]); setConteggio(0); setHaAltre(false); setCaricamento(false); return; }
    // le ultime 50 e le non lette (anche vecchie) in parallelo: chi mostra solo le non lette non perde nulla
    const [recenti, nonLette] = await Promise.all([
      sb.from("notifiche").select(COLONNE).eq("membro_id", membroId).order("created_at", { ascending: false }).range(0, BLOCCO - 1),
      sb.from("notifiche").select(COLONNE).eq("membro_id", membroId).is("letta_il", null).order("created_at", { ascending: false }).range(0, BLOCCO - 1),
      contaNonLette(),
    ]);
    const err = recenti.error ?? nonLette.error;
    if (err) setErrore(err.message);
    else {
      setErrore(null);
      const rec = (recenti.data ?? []) as Notifica[];
      const per = new Map<string, Notifica>();
      for (const n of [...rec, ...((nonLette.data ?? []) as Notifica[])]) per.set(n.id, n);
      caricate.current = rec.length;
      setHaAltre(rec.length === BLOCCO);
      setLista([...per.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    setCaricamento(false);
  }, [sb, membroId, contaNonLette]);

  useEffect(() => {
    setCaricamento(true);
    void ricarica();
    if (!membroId) return;
    const canale = sb
      .channel(`notifiche:${membroId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifiche", filter: `membro_id=eq.${membroId}` }, (ev: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const nuova = ev.new as unknown as Notifica | undefined;
        const vecchia = ev.old as Partial<Notifica> | undefined;
        setLista((att) => {
          if (ev.eventType === "DELETE") return att.filter((n) => n.id !== vecchia?.id);
          if (!nuova?.id) return att;
          const senza = att.filter((n) => n.id !== nuova.id);
          // si ordina solo se la riga arriva "fuori posto": di norma una nuova notifica va in testa
          return [nuova, ...senza].sort((a, b) => b.created_at.localeCompare(a.created_at));
        });
        contaPresto();
      })
      .subscribe();
    return () => {
      if (timerConteggio.current) clearTimeout(timerConteggio.current);
      void sb.removeChannel(canale);
    };
  }, [sb, membroId, ricarica, contaPresto]);

  /** Carica il blocco successivo (da 50 a 100, ...) in fondo alla lista. */
  const altre = useCallback(async () => {
    if (!membroId) return;
    const da = caricate.current;
    const { data, error } = await sb.from("notifiche").select(COLONNE).eq("membro_id", membroId).order("created_at", { ascending: false }).range(da, da + BLOCCO - 1);
    if (error) { setErrore(error.message); return; }
    const blocco = (data ?? []) as Notifica[];
    caricate.current = da + blocco.length;
    setHaAltre(blocco.length === BLOCCO);
    setLista((att) => {
      const ids = new Set(att.map((n) => n.id));
      return [...att, ...blocco.filter((n) => !ids.has(n.id))].sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
  }, [sb, membroId]);

  const letta = useCallback(async (id: string) => {
    // aggiorna subito la lista e il campanello (ottimismo), poi il database
    const prima = listaRef.current.find((n) => n.id === id);
    const ora = new Date().toISOString();
    setLista((att) => att.map((n) => (n.id === id && !n.letta_il ? { ...n, letta_il: ora } : n)));
    if (prima && !prima.letta_il) setConteggio((c) => Math.max(0, c - 1));
    try { await segnaLetta(id); } catch (e) { setErrore(e instanceof Error ? e.message : String(e)); void ricarica(); }
  }, [ricarica]);

  const segnaTutte = useCallback(async () => {
    if (!membroId) return;
    const ora = new Date().toISOString();
    setLista((att) => att.map((n) => (n.letta_il ? n : { ...n, letta_il: ora })));
    setConteggio(0);
    const { error } = await sb.from("notifiche").update({ letta_il: ora }).eq("membro_id", membroId).is("letta_il", null);
    if (error) { setErrore(error.message); void ricarica(); }
  }, [sb, membroId, ricarica]);

  return { lista, conteggio, caricamento, errore, haAltre, altre, segnaLetta: letta, segnaTutte, ricarica };
}
