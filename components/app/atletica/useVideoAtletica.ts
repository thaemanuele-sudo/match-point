"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Lingua } from "@/lib/i18n/lingua";
import type { CategoriaAtletica, Fascia, VideoAtletica } from "@/lib/types";

export type StatoVideo = "caricamento" | "ok" | "errore";

/** Nomi delle categorie nelle cinque lingue (filtri, etichette, lettore). */
export const ETICHETTE_CAT: Record<Lingua, Record<CategoriaAtletica, string>> = {
  it: { velocita: "Velocità", forza: "Forza", resistenza: "Resistenza", coordinazione: "Coordinazione", mobilita: "Mobilità", agilita: "Agilità", prevenzione: "Prevenzione" },
  en: { velocita: "Speed", forza: "Strength", resistenza: "Endurance", coordinazione: "Coordination", mobilita: "Mobility", agilita: "Agility", prevenzione: "Prevention" },
  fr: { velocita: "Vitesse", forza: "Force", resistenza: "Endurance", coordinazione: "Coordination", mobilita: "Mobilité", agilita: "Agilité", prevenzione: "Prévention" },
  de: { velocita: "Schnelligkeit", forza: "Kraft", resistenza: "Ausdauer", coordinazione: "Koordination", mobilita: "Mobilität", agilita: "Agilität", prevenzione: "Prävention" },
  es: { velocita: "Rapidez", forza: "Fuerza", resistenza: "Resistencia", coordinazione: "Coordinación", mobilita: "Movilidad", agilita: "Agilidad", prevenzione: "Prevención" },
};

/** Le chip d'età dei disegni (U10…PRO) e la fascia del database (PRO = ADULTI). */
export const CHIP_ETA = ["U10", "U12", "U14", "U16", "U18", "PRO"] as const;
export type ChipEta = (typeof CHIP_ETA)[number];
export const fasciaDaChip = (c: ChipEta): Fascia => (c === "PRO" ? "ADULTI" : c);
export const chipDaFascia = (f: Fascia | null | undefined): ChipEta | null => (!f ? null : f === "ADULTI" ? "PRO" : (f as ChipEta));

/** Un video senza fasce indicate vale per tutte le età. */
export const perFascia = (v: VideoAtletica, f: Fascia | null) => !f || v.fasce.length === 0 || v.fasce.includes(f);

/** Prima i video della fascia preferita, poi gli altri; l'ordine dell'admin resta dentro i due gruppi. */
export function preferisciFascia(lista: VideoAtletica[], f: Fascia | null): VideoAtletica[] {
  if (!f) return lista;
  return [...lista.filter((v) => perFascia(v, f)), ...lista.filter((v) => !perFascia(v, f))];
}

/** Primo video (con file) di una delle categorie date, preferendo la fascia. */
export function primoVideo(lista: VideoAtletica[], cats: CategoriaAtletica[], f: Fascia | null): VideoAtletica | null {
  const pool = preferisciFascia(lista.filter((v) => v.video_path), f);
  for (const c of cats) {
    const v = pool.find((x) => x.categoria === c);
    if (v) return v;
  }
  return null;
}

// Piccola cache in memoria: passando da una schermata all'altra non si rifà la richiesta ogni volta.
let cache: { t: number; dati: VideoAtletica[] } | null = null;
const VALIDITA_MS = 60_000;

/** Video di atletica pubblicati dal super admin (tabella fitness_videos), nell'ordine scelto da lui. */
export function useVideoAtletica() {
  const fresca = cache && Date.now() - cache.t < VALIDITA_MS ? cache.dati : null;
  const [video, setVideo] = useState<VideoAtletica[]>(fresca ?? []);
  const [stato, setStato] = useState<StatoVideo>(fresca ? "ok" : "caricamento");

  const carica = useCallback(async () => {
    setStato("caricamento");
    try {
      const { data, error } = await supabaseBrowser()
        .from("fitness_videos")
        .select("*")
        .eq("pubblicato", true)
        .order("ordine", { ascending: true });
      if (error) throw error;
      const dati = (data ?? []) as VideoAtletica[];
      cache = { t: Date.now(), dati };
      setVideo(dati);
      setStato("ok");
    } catch {
      setStato("errore");
    }
  }, []);

  useEffect(() => {
    if (!fresca) void carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { video, stato, ricarica: carica };
}

/** "3 × 10, recupero 60s" → { serie: 3, recupero: 60 }. Se non si capisce: serie 3, nessun recupero. */
export function leggiDosaggio(d: string): { serie: number; recupero: number } {
  const m = d.match(/(\d+)\s*[×xX*]\s*\d+/);
  const r = d.match(/(?:recupero|rest|rec\.?)\s*(\d+)/i);
  return { serie: m ? Math.min(Math.max(parseInt(m[1], 10), 1), 12) : 3, recupero: r ? Math.min(parseInt(r[1], 10), 300) : 0 };
}

export const formatta = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;
