"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCentro } from "./contesto";
import type { Notifica } from "./tipi-base";

/** Segna una notifica come letta (RLS: solo le proprie). Il realtime aggiorna le liste aperte. */
export async function segnaLetta(id: string): Promise<void> {
  const { error } = await supabaseBrowser().from("notifiche").update({ letta_il: new Date().toISOString() }).eq("id", id).is("letta_il", null);
  if (error) throw new Error(error.message);
}

const LIMITE = 100;

/**
 * Notifiche del membro attivo (anche in "vedi come"). Carica le ultime 100 e resta in ascolto su Supabase realtime
 * filtrando per membro: nuove e lette arrivano senza ricaricare. `conteggio` = quelle non lette tra le caricate.
 */
export function useNotifiche() {
  const { membroAttivo, sb } = useCentro();
  const membroId = membroAttivo?.id ?? null;
  const [lista, setLista] = useState<Notifica[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const ricarica = useCallback(async () => {
    if (!membroId) { setLista([]); setCaricamento(false); return; }
    const { data, error } = await sb.from("notifiche").select("*").eq("membro_id", membroId).order("created_at", { ascending: false }).limit(LIMITE);
    if (error) setErrore(error.message);
    else { setErrore(null); setLista((data ?? []) as Notifica[]); }
    setCaricamento(false);
  }, [sb, membroId]);

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
          return [nuova, ...senza].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, LIMITE);
        });
      })
      .subscribe();
    return () => { void sb.removeChannel(canale); };
  }, [sb, membroId, ricarica]);

  const conteggio = useMemo(() => lista.reduce((n, x) => n + (x.letta_il ? 0 : 1), 0), [lista]);

  const letta = useCallback(async (id: string) => {
    // aggiorna subito la lista (ottimismo), poi il database
    setLista((att) => att.map((n) => (n.id === id && !n.letta_il ? { ...n, letta_il: new Date().toISOString() } : n)));
    try { await segnaLetta(id); } catch (e) { setErrore(e instanceof Error ? e.message : String(e)); void ricarica(); }
  }, [ricarica]);

  const segnaTutte = useCallback(async () => {
    if (!membroId) return;
    const ora = new Date().toISOString();
    setLista((att) => att.map((n) => (n.letta_il ? n : { ...n, letta_il: ora })));
    const { error } = await sb.from("notifiche").update({ letta_il: ora }).eq("membro_id", membroId).is("letta_il", null);
    if (error) { setErrore(error.message); void ricarica(); }
  }, [sb, membroId, ricarica]);

  return { lista, conteggio, caricamento, errore, segnaLetta: letta, segnaTutte, ricarica };
}
