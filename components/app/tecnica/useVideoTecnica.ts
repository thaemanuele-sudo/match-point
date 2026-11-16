"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Colpo, VideoTecnica } from "@/lib/types";

export type StatoVideo = "carica" | "pronto" | "errore";

/**
 * Video di tecnica caricati dal super admin (tabella technique_videos, solo pubblicati, in ordine).
 * Scarica tutto il catalogo in una volta (poche decine di righe) e filtra per colpo in locale:
 * così gli errori e le correzioni gemelle si ritrovano anche senza una seconda richiesta.
 */
export function useVideoTecnica(colpo?: Colpo) {
  const [tutti, setTutti] = useState<VideoTecnica[]>([]);
  const [stato, setStato] = useState<StatoVideo>("carica");
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    let vivo = true;
    setStato("carica");
    (async () => {
      try {
        // se la rete non risponde non resto in caricamento per sempre: dopo 10 s vale come errore
        const lettura = supabaseBrowser()
          .from("technique_videos")
          .select("*")
          .eq("pubblicato", true)
          .order("ordine", { ascending: true });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const scaduto = new Promise<never>((_, no) => {
          timer = setTimeout(() => no(new Error("timeout")), 10000);
        });
        try {
          const { data, error } = await Promise.race([lettura, scaduto]);
          if (!vivo) return;
          if (error) throw error;
          setTutti((data as VideoTecnica[]) ?? []);
          setStato("pronto");
        } finally {
          // la richiesta è arrivata (o è fallita): il timer di 10 s non serve più
          clearTimeout(timer);
        }
      } catch {
        if (vivo) setStato("errore");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [giro]);

  const video = useMemo(() => (colpo ? tutti.filter((v) => v.colpo === colpo) : tutti), [tutti, colpo]);
  const riprova = useCallback(() => setGiro((g) => g + 1), []);
  return { video, tutti, stato, riprova };
}
