"use client";
// Compiti di un allievo (personali o del suo gruppo) con ciò che ha già fatto e gli esercizi collegati (video).
import { useCallback, useEffect, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import type { Figlio } from "./dati";

export type RCompito = {
  id: string; allievo_id: string | null; gruppo_id: string | null; maestro_id: string | null; titolo: string;
  durata_min: number | null; esercizio_id: string | null; scadenza: string | null; created_at: string;
};
export type RFatto = { id: string; compito_id: string; allievo_id: string; fatto_il: string; media_path: string | null };
export type REsercizio = { id: string; titolo: string; descrizione: string | null; materiale: string | null; video_path: string | null; durata_min: number | null };

export function useCompiti(figlio: Figlio | null) {
  const { centro, sb } = useCentro();
  const [compiti, setCompiti] = useState<RCompito[]>([]);
  const [fatti, setFatti] = useState<RFatto[]>([]);
  const [esercizi, setEsercizi] = useState<REsercizio[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);
  const idAll = figlio?.allievo.id;
  const idGr = figlio?.gruppo?.id;
  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    if (!idAll) { setCompiti([]); setFatti([]); setCaricamento(false); return; }
    let vivo = true;
    (async () => {
      setErrore(null);
      // compiti personali, oppure di gruppo (allievo_id nullo) per il gruppo in cui è iscritto
      const filtro = idGr ? `allievo_id.eq.${idAll},and(allievo_id.is.null,gruppo_id.eq.${idGr})` : `allievo_id.eq.${idAll}`;
      const c = await sb.from("compiti").select("*").eq("centro_id", centro.id).or(filtro).order("created_at", { ascending: false }).limit(40);
      if (c.error) return void (vivo && (setErrore(c.error.message), setCaricamento(false)));
      const lista = (c.data ?? []) as RCompito[];
      const ids = lista.map((x) => x.id);
      const idEs = [...new Set(lista.map((x) => x.esercizio_id).filter(Boolean))] as string[];
      const [f, e] = await Promise.all([
        ids.length ? sb.from("compiti_fatti").select("*").eq("centro_id", centro.id).eq("allievo_id", idAll).in("compito_id", ids) : Promise.resolve({ data: [], error: null }),
        idEs.length ? sb.from("esercizi").select("id,titolo,descrizione,materiale,video_path,durata_min").eq("centro_id", centro.id).in("id", idEs) : Promise.resolve({ data: [], error: null }),
      ]);
      if (!vivo) return;
      setCompiti(lista);
      setFatti((f.data ?? []) as RFatto[]);
      setEsercizi((e.data ?? []) as REsercizio[]);
      setCaricamento(false);
    })().catch((e: unknown) => { if (vivo) { setErrore(e instanceof Error ? e.message : String(e)); setCaricamento(false); } });
    return () => { vivo = false; };
  }, [idAll, idGr, centro.id, sb, giro]);

  return { compiti, fatti, setFatti, esercizi, caricamento, errore, ricarica };
}
