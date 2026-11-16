"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RisultatoAnalisi } from "@/lib/types";
import { ROTTE } from "@/lib/rotte";
import s from "./Analisi.module.css";

const T = {
  it: {
    back: "Indietro",
    frame_41_slow_motion: "Frame 41 · rallentatore 0,25×",
    correct_model: "Modello corretto",
    movement_error_crosscourt_forehand: "ERRORE DI MOVIMENTO · DIRITTO INCROCIATO",
    late_contact: "Impatto in ritardo",
    close_to_the_error: "vicino all'errore",
    on_the_ball: "Sulla palla",
    short_high_and_central: "Corta, alta e centrale",
    toward_the_opponent: "Verso l'avversario",
    gives_them_time_to: "Gli dà tempo per attaccare",
    lead_up_drills: "Esercizi propedeutici",
    correction_video: "Video correzione",
    early_contact_from_standstill: "Colpo da fermo in anticipo",
    k15_min_3_sets: "15 min · 3 serie",
    preparation_with_racket_high: "Preparazione con racchetta alta",
    k10_min_4_sets: "10 min · 4 serie",
    frame: "Fotogramma",
    error_label: "ERRORE",
    good_move: "Gesto corretto",
    quality: "qualità gesto",
    what_happens: "Cosa succede",
    how_to_fix: "Come correggere",
    summary: "Sintesi",
    phases: "Fasi del gesto",
    errors: "Errori rilevati",
    corrections: "Correzioni",
    drills: "Esercizi consigliati",
    sev_alta: "alta",
    sev_media: "media",
    sev_bassa: "bassa",
    no_errors: "Nessun errore rilevato.",
    new_analysis: "Nuova analisi",
  },
  en: {
    back: "Back",
    frame_41_slow_motion: "Frame 41 · slow motion 0.25×",
    correct_model: "Correct model",
    movement_error_crosscourt_forehand: "MOVEMENT ERROR · CROSSCOURT FOREHAND",
    late_contact: "Late contact",
    close_to_the_error: "close to the error",
    on_the_ball: "On the ball",
    short_high_and_central: "Short, high and central",
    toward_the_opponent: "Toward the opponent",
    gives_them_time_to: "Gives them time to attack",
    lead_up_drills: "Lead-up drills",
    correction_video: "Correction video",
    early_contact_from_standstill: "Early contact from standstill",
    k15_min_3_sets: "15 min · 3 sets",
    preparation_with_racket_high: "Preparation with racket high",
    k10_min_4_sets: "10 min · 4 sets",
    frame: "Frame",
    error_label: "ERROR",
    good_move: "Correct movement",
    quality: "stroke quality",
    what_happens: "What happens",
    how_to_fix: "How to fix it",
    summary: "Summary",
    phases: "Stroke phases",
    errors: "Detected errors",
    corrections: "Corrections",
    drills: "Recommended drills",
    sev_alta: "high",
    sev_media: "medium",
    sev_bassa: "low",
    no_errors: "No errors detected.",
    new_analysis: "New analysis",
  },
  fr: {
    back: "Retour",
    frame_41_slow_motion: "Image 41 · ralenti 0,25×",
    correct_model: "Modèle correct",
    movement_error_crosscourt_forehand: "ERREUR DE MOUVEMENT · COUP DROIT CROISÉ",
    late_contact: "Impact en retard",
    close_to_the_error: "proche de l'erreur",
    on_the_ball: "Sur la balle",
    short_high_and_central: "Courte, haute et centrale",
    toward_the_opponent: "Vers l'adversaire",
    gives_them_time_to: "Lui laisse le temps d'attaquer",
    lead_up_drills: "Exercices éducatifs",
    correction_video: "Vidéo de correction",
    early_contact_from_standstill: "Frappe à l'arrêt en avance",
    k15_min_3_sets: "15 min · 3 séries",
    preparation_with_racket_high: "Préparation raquette haute",
    k10_min_4_sets: "10 min · 4 séries",
    frame: "Image",
    error_label: "ERREUR",
    good_move: "Geste correct",
    quality: "qualité du geste",
    what_happens: "Ce qui se passe",
    how_to_fix: "Comment corriger",
    summary: "Synthèse",
    phases: "Phases du geste",
    errors: "Erreurs détectées",
    corrections: "Corrections",
    drills: "Exercices recommandés",
    sev_alta: "élevée",
    sev_media: "moyenne",
    sev_bassa: "faible",
    no_errors: "Aucune erreur détectée.",
    new_analysis: "Nouvelle analyse",
  },
  de: {
    back: "Zurück",
    frame_41_slow_motion: "Frame 41 · Zeitlupe 0,25×",
    correct_model: "Korrektes Modell",
    movement_error_crosscourt_forehand: "BEWEGUNGSFEHLER · CROSS-VORHAND",
    late_contact: "Verspäteter Kontakt",
    close_to_the_error: "nah am Fehler",
    on_the_ball: "Auf dem Ball",
    short_high_and_central: "Kurz, hoch und zentral",
    toward_the_opponent: "Zum Gegner hin",
    gives_them_time_to: "Gibt ihm Zeit zum Angreifen",
    lead_up_drills: "Vorbereitende Übungen",
    correction_video: "Korrekturvideo",
    early_contact_from_standstill: "Frühzeitiger Kontakt aus dem Stand",
    k15_min_3_sets: "15 Min. · 3 Serien",
    preparation_with_racket_high: "Vorbereitung mit hohem Schläger",
    k10_min_4_sets: "10 Min. · 4 Serien",
    frame: "Frame",
    error_label: "FEHLER",
    good_move: "Korrekte Bewegung",
    quality: "Schlagqualität",
    what_happens: "Was passiert",
    how_to_fix: "So korrigierst du",
    summary: "Zusammenfassung",
    phases: "Schlagphasen",
    errors: "Erkannte Fehler",
    corrections: "Korrekturen",
    drills: "Empfohlene Übungen",
    sev_alta: "hoch",
    sev_media: "mittel",
    sev_bassa: "niedrig",
    no_errors: "Keine Fehler erkannt.",
    new_analysis: "Neue Analyse",
  },
  es: {
    back: "Atrás",
    frame_41_slow_motion: "Frame 41 · cámara lenta 0,25×",
    correct_model: "Modelo correcto",
    movement_error_crosscourt_forehand: "ERROR DE MOVIMIENTO · DERECHA CRUZADA",
    late_contact: "Impacto tardío",
    close_to_the_error: "cerca del error",
    on_the_ball: "Sobre la bola",
    short_high_and_central: "Corta, alta y centrada",
    toward_the_opponent: "Hacia el rival",
    gives_them_time_to: "Le da tiempo para atacar",
    lead_up_drills: "Ejercicios progresivos",
    correction_video: "Vídeo de corrección",
    early_contact_from_standstill: "Golpe parado con anticipación",
    k15_min_3_sets: "15 min · 3 series",
    preparation_with_racket_high: "Preparación con raqueta alta",
    k10_min_4_sets: "10 min · 4 series",
    frame: "Frame",
    error_label: "ERROR",
    good_move: "Gesto correcto",
    quality: "calidad del gesto",
    what_happens: "Qué pasa",
    how_to_fix: "Cómo corregirlo",
    summary: "Resumen",
    phases: "Fases del golpe",
    errors: "Errores detectados",
    corrections: "Correcciones",
    drills: "Ejercicios recomendados",
    sev_alta: "alta",
    sev_media: "media",
    sev_bassa: "baja",
    no_errors: "No se detectaron errores.",
    new_analysis: "Nuevo análisis",
  },
};

type Risultato = RisultatoAnalisi & { id?: string | null };

/** Rende affidabile un risultato letto da sessionStorage o dal database (campi mancanti → vuoti). */
function normalizza(o: Partial<RisultatoAnalisi> | null | undefined, id?: string | null): Risultato | null {
  if (!o || typeof o !== "object" || typeof o.punteggio !== "number") return null;
  return {
    id,
    colpo: o.colpo ?? "",
    punteggio: Math.round(o.punteggio),
    sintesi: o.sintesi ?? "",
    fasi: o.fasi ?? [],
    errori: o.errori ?? [],
    correzioni: o.correzioni ?? [],
    esercizi: o.esercizi ?? [],
  };
}

const leggiJson = <T,>(chiave: string): T | null => {
  try {
    const g = sessionStorage.getItem(chiave);
    return g ? (JSON.parse(g) as T) : null;
  } catch {
    return null;
  }
};

const maiuscola = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function Analisi() {
  const t = useT(T);
  const { lang } = useLang();
  const [R, setR] = useState<Risultato | null>(null);
  const [foto, setFoto] = useState<string[]>([]);
  const [sel, setSel] = useState(0); // errore mostrato nell'immagine in alto

  // Risultato: prima da sessionStorage ("mp-ultima-analisi"), altrimenti da Supabase con ?id=<uuid>.
  useEffect(() => {
    let vivo = true;
    const id = new URLSearchParams(window.location.search).get("id");
    const locale = leggiJson<Risultato>("mp-ultima-analisi");
    const rl = locale && (!id || locale.id === id) ? normalizza(locale, locale.id) : null;
    if (rl) {
      setR(rl);
      // I fotogrammi in sessione appartengono solo all'analisi appena eseguita.
      const st = leggiJson<{ fotogrammi?: string[] }>("mp-analisi-in-corso");
      if (st?.fotogrammi) setFoto(st.fotogrammi);
    } else if (id) {
      supabaseBrowser()
        .from("analyses")
        .select("id,colpo,risultato")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }: { data: { id: string; colpo: string | null; risultato: Partial<RisultatoAnalisi> } | null }) => {
          if (!vivo) return;
          if (data) setR(normalizza({ colpo: data.colpo ?? "", ...data.risultato }, data.id));
            });
    } else {
    }
    return () => { vivo = false; };
  }, []);

  // Errori ordinati per gravità: il primo è quello in evidenza.
  const peso = { alta: 0, media: 1, bassa: 2 } as const;
  const errori = R ? [...R.errori].sort((a, b) => peso[a.gravita] - peso[b.gravita]) : [];
  const err = errori[sel] ?? errori[0];
  const img = R && err ? foto[err.fotogramma - 1] : undefined;
  const bene = !!R && R.punteggio >= 80;
  const coloreScore = bene ? s.ok : "";
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.e1}>
        <div className={s.e2}>
          {img && <img className={s.foto} src={img} alt={`${t.frame} ${err?.fotogramma}`} />}
          {!img && (
          <svg className={s.e3} width="100%" height="330" viewBox="0 0 393 330" aria-hidden="true">
            <defs>
              <linearGradient id="l1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F3F6F1" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
              </linearGradient>
              <radialGradient id="h1" cx=".35" cy=".3" r=".8">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
              </radialGradient>
              <linearGradient id="t1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                <stop offset="1" stopColor="#D8F34A" />
              </linearGradient>
              <filter id="g1" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="s1" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#000" stopOpacity=".55" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line x1="28" y1="310" x2="-284" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="56" y1="310" x2="-204" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="84" y1="310" x2="-124" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="112" y1="310" x2="-44" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="140" y1="310" x2="36" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="168" y1="310" x2="116" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="196" y1="310" x2="196" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="224" y1="310" x2="276" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="252" y1="310" x2="356" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="280" y1="310" x2="436" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="308" y1="310" x2="516" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="336" y1="310" x2="596" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="364" y1="310" x2="676" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="0" y1="310" x2="393" y2="310" stroke="#4FD1FF" strokeOpacity="0.130" />
            <line x1="0" y1="313" x2="393" y2="313" stroke="#4FD1FF" strokeOpacity="0.118" />
            <line x1="0" y1="322" x2="393" y2="322" stroke="#4FD1FF" strokeOpacity="0.106" />
            <line x1="0" y1="337" x2="393" y2="337" stroke="#4FD1FF" strokeOpacity="0.094" />
            <line x1="0" y1="358" x2="393" y2="358" stroke="#4FD1FF" strokeOpacity="0.082" />
            <line x1="0" y1="385" x2="393" y2="385" stroke="#4FD1FF" strokeOpacity="0.070" />
            <line x1="0" y1="418" x2="393" y2="418" stroke="#4FD1FF" strokeOpacity="0.058" />
            <line x1="0" y1="457" x2="393" y2="457" stroke="#4FD1FF" strokeOpacity="0.046" />
            <line x1="0" y1="502" x2="393" y2="502" stroke="#4FD1FF" strokeOpacity="0.034" />
            <polygon points="215.5,186.5 198.9,184.1 197.7,236.4 208.4,236.4" fill="#4FD1FF" fillOpacity="0.08" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
            <line x1="209.0" y1="181.8" x2="210.8" y2="164.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="215.5" y1="186.5" x2="227.4" y2="206.7" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.9" strokeLinecap="round" />
            <line x1="227.4" y1="206.7" x2="244.0" y2="216.2" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="198.9" y1="184.1" x2="188.2" y2="203.2" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.9" strokeLinecap="round" />
            <line x1="188.2" y1="203.2" x2="181.1" y2="215.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="208.4" y1="236.4" x2="227.4" y2="272.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.0" strokeLinecap="round" />
            <line x1="227.4" y1="272.0" x2="222.6" y2="316.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="197.7" y1="236.4" x2="200.1" y2="274.4" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.0" strokeLinecap="round" />
            <line x1="200.1" y1="274.4" x2="187.0" y2="316.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="210.8" cy="164.0" r="7.7" fill="none" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.6" />
            <line x1="244.0" y1="216.2" x2="267.7" y2="214.2" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.0" strokeLinecap="round" />
            <ellipse cx="286.6" cy="212.7" rx="19.0" ry="12.5" transform="rotate(-4.8 286.6 212.7)" fill="#4FD1FF" fillOpacity="0.02" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.5" />
            <ellipse cx="180" cy="320" rx="42" ry="7" fill="url(#s1)" />
            <polygon points="169.3,183.0 183.6,184.1 185.9,232.8 174.1,232.8" fill="url(#l1)" stroke="url(#l1)" strokeWidth="9.5" strokeLinejoin="round" opacity="1.0" />
            <line x1="176.4" y1="183.6" x2="180.0" y2="232.8" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="1.2" strokeDasharray="2.4 2.4" />
            <line x1="176.4" y1="178.2" x2="176.4" y2="160.4" stroke="#050505" strokeWidth="6.5" strokeLinecap="round" opacity=".6" />
            <line x1="176.4" y1="178.2" x2="176.4" y2="160.4" stroke="url(#l1)" strokeWidth="4.2" strokeLinecap="round" opacity="1.0" />
            <line x1="176.4" y1="178.2" x2="176.4" y2="160.4" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="169.3" y1="183.0" x2="164.6" y2="203.2" stroke="#050505" strokeWidth="8.9" strokeLinecap="round" opacity=".6" />
            <line x1="169.3" y1="183.0" x2="164.6" y2="203.2" stroke="url(#l1)" strokeWidth="6.5" strokeLinecap="round" opacity="1.0" />
            <line x1="169.3" y1="183.0" x2="164.6" y2="203.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="164.6" y1="203.2" x2="172.9" y2="222.2" stroke="#050505" strokeWidth="7.7" strokeLinecap="round" opacity=".6" />
            <line x1="164.6" y1="203.2" x2="172.9" y2="222.2" stroke="url(#l1)" strokeWidth="5.3" strokeLinecap="round" opacity="1.0" />
            <line x1="164.6" y1="203.2" x2="172.9" y2="222.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="183.6" y1="184.1" x2="191.9" y2="199.6" stroke="#050505" strokeWidth="8.9" strokeLinecap="round" opacity=".6" />
            <line x1="183.6" y1="184.1" x2="191.9" y2="199.6" stroke="url(#l1)" strokeWidth="6.5" strokeLinecap="round" opacity="1.0" />
            <line x1="183.6" y1="184.1" x2="191.9" y2="199.6" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="191.9" y1="199.6" x2="197.8" y2="209.1" stroke="#050505" strokeWidth="7.7" strokeLinecap="round" opacity=".6" />
            <line x1="191.9" y1="199.6" x2="197.8" y2="209.1" stroke="url(#l1)" strokeWidth="5.3" strokeLinecap="round" opacity="1.0" />
            <line x1="191.9" y1="199.6" x2="197.8" y2="209.1" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="174.1" y1="232.8" x2="172.9" y2="273.2" stroke="#050505" strokeWidth="11.3" strokeLinecap="round" opacity=".6" />
            <line x1="174.1" y1="232.8" x2="172.9" y2="273.2" stroke="url(#l1)" strokeWidth="8.9" strokeLinecap="round" opacity="1.0" />
            <line x1="174.1" y1="232.8" x2="172.9" y2="273.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="172.9" y1="273.2" x2="170.5" y2="316.0" stroke="#050505" strokeWidth="9.5" strokeLinecap="round" opacity=".6" />
            <line x1="172.9" y1="273.2" x2="170.5" y2="316.0" stroke="url(#l1)" strokeWidth="7.1" strokeLinecap="round" opacity="1.0" />
            <line x1="172.9" y1="273.2" x2="170.5" y2="316.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.0" strokeLinecap="round" />
            <line x1="185.9" y1="232.8" x2="188.3" y2="273.2" stroke="#050505" strokeWidth="11.3" strokeLinecap="round" opacity=".6" />
            <line x1="185.9" y1="232.8" x2="188.3" y2="273.2" stroke="url(#l1)" strokeWidth="8.9" strokeLinecap="round" opacity="1.0" />
            <line x1="185.9" y1="232.8" x2="188.3" y2="273.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="188.3" y1="273.2" x2="190.7" y2="316.0" stroke="#050505" strokeWidth="9.5" strokeLinecap="round" opacity=".6" />
            <line x1="188.3" y1="273.2" x2="190.7" y2="316.0" stroke="url(#l1)" strokeWidth="7.1" strokeLinecap="round" opacity="1.0" />
            <line x1="188.3" y1="273.2" x2="190.7" y2="316.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.0" strokeLinecap="round" />
            <circle cx="176.4" cy="160.4" r="7.7" fill="url(#h1)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
            <line x1="172.9" y1="222.2" x2="193.9" y2="233.2" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="3.0" strokeLinecap="round" />
            <ellipse cx="210.8" cy="242.0" rx="19.0" ry="12.5" transform="rotate(27.6 210.8 242.0)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.9" />
            <g transform="rotate(27.6 210.8 242.0)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
              <line x1="192.9" y1="234.9" x2="228.6" y2="234.9" />
              <line x1="192.9" y1="238.4" x2="228.6" y2="238.4" />
              <line x1="192.9" y1="242.0" x2="228.6" y2="242.0" />
              <line x1="192.9" y1="245.6" x2="228.6" y2="245.6" />
              <line x1="192.9" y1="249.1" x2="228.6" y2="249.1" />
              <line x1="200.1" y1="230.7" x2="200.1" y2="253.3" />
              <line x1="205.4" y1="230.7" x2="205.4" y2="253.3" />
              <line x1="210.8" y1="230.7" x2="210.8" y2="253.3" />
              <line x1="216.1" y1="230.7" x2="216.1" y2="253.3" />
              <line x1="221.4" y1="230.7" x2="221.4" y2="253.3" />
            </g>
            <ellipse cx="210.8" cy="242.0" rx="19.0" ry="12.5" transform="rotate(27.6 210.8 242.0)" fill="none" stroke="#F0454A" strokeWidth="1.2" />
            <circle cx="176.4" cy="178.2" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="176.4" cy="178.2" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="169.3" cy="183.0" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="169.3" cy="183.0" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="183.6" cy="184.1" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="183.6" cy="184.1" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="164.6" cy="203.2" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="164.6" cy="203.2" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="191.9" cy="199.6" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="191.9" cy="199.6" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="172.9" cy="222.2" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="172.9" cy="222.2" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="197.8" cy="209.1" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="197.8" cy="209.1" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="174.1" cy="232.8" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="174.1" cy="232.8" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="185.9" cy="232.8" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="185.9" cy="232.8" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="172.9" cy="273.2" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="172.9" cy="273.2" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="188.3" cy="273.2" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="188.3" cy="273.2" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="170.5" cy="316.0" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="170.5" cy="316.0" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="190.7" cy="316.0" r="4.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="190.7" cy="316.0" r="2.1" fill="#D8F34A" filter="url(#g1)" />
            <circle cx="269.1" cy="212.7" r="4.8" fill="#D8F34A" filter="url(#g1)" />
            <path d="M265.5 209.7c1.8 1.8 1.8 4.2 0 5.9M272.7 209.7c-1.8 1.8 -1.8 4.2 0 5.9" fill="none" stroke="#fff" strokeWidth="1.2" />
            <path d="M164.6 203.2 L170.1 179.8 A24 24 0 0 1 174.2 225.1 Z" fill="#FF5A5F" fillOpacity=".18" stroke="#FF5A5F" strokeWidth="2" />
            <line x1="164.6" y1="203.2" x2="214.4" y2="199.0" stroke="#FF5A5F" strokeWidth="1" strokeOpacity=".6" />
            <rect x="192.2" y="188.0" width="44.4" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#FF5A5F" strokeOpacity=".7" />
            <text x="214.4" y="203.5" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#FF5A5F">
              143°
            </text>
            <path d="M10 24V10H24M369 10H383V24M10 306V320H24M369 320H383V306" fill="none" stroke="#D8F34A" strokeOpacity=".7" strokeWidth="2" />
          </svg>
          )}
          <div className={s.e4}>
            <Link href={ROTTE.ChatAI} className={`icon ${s.icon}`} aria-label={t.back}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <span className={s.e5}>
              {R ? (err ? `${t.frame} ${err.fotogramma}` : t.good_move) : t.frame_41_slow_motion}
            </span>
          </div>
          {!R && (
            <div className={s.e6}>
              {t.correct_model}
            </div>
          )}
          <div className={s.e7}>
            <div className={s.e8}>
              {R && foto.length
                ? foto.map((_, i) => <span key={i} className={errori.some((e) => e.fotogramma === i + 1) ? s.e10 : s.e9} />)
                : [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <span key={i} className={i === 3 || i === 4 ? s.e10 : s.e9} />)}
            </div>
          </div>
        </div>
        <div className={s.e11}>
          <div className={s.e12}>
            <div>
              <span className={s.e13}>
                {R ? `${t.error_label} · ${(R.colpo || "").toUpperCase()}` : t.movement_error_crosscourt_forehand}
              </span>
              <h1 className={`disp ${s.disp} ${s.e14}`}>
                {R ? (err ? err.titolo : t.good_move) : t.late_contact}
              </h1>
            </div>
            <div className={s.e15}>
              <div className={`disp ${s.disp} ${s.e16} ${coloreScore}`}>
                {R ? `${R.punteggio}%` : "72%"}
              </div>
              <div className={`muted ${s.muted} ${s.e17}`}>
                {R ? t.quality : t.close_to_the_error}
              </div>
            </div>
          </div>
          <div className={s.e18}>
            <span className={s.e19} style={R ? { left: `${100 - R.punteggio}%` } : undefined} />
          </div>
          <div className={`card ${s.card} ${s.e20}`}>
            <div>
              <div className={`muted ${s.muted} ${s.e21}`}>
                {R ? t.what_happens : t.on_the_ball}
              </div>
              <div className={s.e22}>
                {R ? (err?.descrizione || R.sintesi) : t.short_high_and_central}
              </div>
            </div>
            <div>
              <div className={`muted ${s.muted} ${s.e21}`}>
                {R ? t.how_to_fix : t.toward_the_opponent}
              </div>
              <div className={s.e22}>
                {R ? (R.correzioni[0]?.descrizione || R.correzioni[0]?.titolo || "—") : t.gives_them_time_to}
              </div>
            </div>
          </div>
          <div className={s.e23}>
            <h2 className={s.e24}>
              {R ? t.drills : t.lead_up_drills}
            </h2>
            <Link href={ROTTE.TecnicaColpo} className={s.e25}>
              {t.correction_video}
            </Link>
          </div>
          {R ? (
            <>
              {R.esercizi.map((x, i) => (
                <div key={i} className={s.ex}>
                  <div className={`lawn ${s.lawn} ${s.e26}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className={s.e27}>
                    <b>{x.titolo}</b>
                    <div className={`muted ${s.muted} ${s.e28}`}>{x.dosaggio}</div>
                  </div>
                </div>
              ))}

              {R.sintesi && (
                <section className={s.sez}>
                  <h2 className={s.e24}>{t.summary}</h2>
                  <div className={`card ${s.card} ${s.testo}`}>{R.sintesi}</div>
                </section>
              )}

              {R.fasi.length > 0 && (
                <section className={s.sez}>
                  <h2 className={s.e24}>{t.phases}</h2>
                  {R.fasi.map((f, i) => (
                    <div key={i} className={`card ${s.card} ${s.fase}`}>
                      <div className={s.faseTesta}>
                        <b>{f.nome}</b>
                        <span className={`disp ${s.disp} ${s.voto}`}>{f.voto}/10</span>
                      </div>
                      <div className={s.fasebar} role="img" aria-label={`${f.voto}/10`}>
                        <i style={{ width: `${Math.max(0, Math.min(10, f.voto)) * 10}%` }} />
                      </div>
                      {f.nota && <div className={`muted ${s.muted} ${s.nota}`}>{f.nota}</div>}
                    </div>
                  ))}
                </section>
              )}

              <section className={s.sez}>
                <h2 className={s.e24}>{t.errors}</h2>
                {errori.length === 0 && <div className={`muted ${s.muted} ${s.nota}`}>{t.no_errors}</div>}
                {errori.map((e, i) => (
                  <button type="button" key={i} className={`card ${s.card} ${s.errore} ${i === sel ? s.attivo : ""}`} onClick={() => setSel(i)} aria-pressed={i === sel}>
                    {foto[e.fotogramma - 1] && <img className={s.mini} src={foto[e.fotogramma - 1]} alt="" />}
                    <div className={s.errTesto}>
                      <div className={s.errTesta}>
                        <b>{e.titolo}</b>
                        <span className={s.pill}>{t[`sev_${e.gravita}` as "sev_alta"]}</span>
                      </div>
                      <div className={`muted ${s.muted} ${s.nota}`}>{e.codice} · {t.frame} {e.fotogramma}</div>
                      <div className={s.nota}>{e.descrizione}</div>
                    </div>
                  </button>
                ))}
              </section>

              {R.correzioni.length > 0 && (
                <section className={s.sez}>
                  <h2 className={s.e24}>{t.corrections}</h2>
                  {R.correzioni.map((c, i) => (
                    <div key={i} className={`card ${s.card} ${s.fase}`}>
                      <b>{c.titolo}</b>
                      <div className={`muted ${s.muted} ${s.nota}`}>{c.descrizione}</div>
                    </div>
                  ))}
                </section>
              )}
              <Link href={ROTTE.Carica} className={`btn ${s.btnNuova}`}>{t.new_analysis}</Link>
            </>
          ) : (
            <>
          <div className={s.ex}>
            <div className={`lawn ${s.lawn} ${s.e26}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className={s.e27}>
              <b>
                {t.early_contact_from_standstill}
              </b>
              <div className={`muted ${s.muted} ${s.e28}`}>
                {t.k15_min_3_sets}
              </div>
            </div>
            <span className={s.pill}>
              ×12
            </span>
          </div>
          <div className={s.ex}>
            <div className={`lawn ${s.lawn} ${s.e26}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className={s.e27}>
              <b>
                {t.preparation_with_racket_high}
              </b>
              <div className={`muted ${s.muted} ${s.e28}`}>
                {t.k10_min_4_sets}
              </div>
            </div>
            <span className={s.pill}>
              ×10
            </span>
          </div>
            </>
          )}
        </div>
      </div>
      </div>
    </Schermo>
  );
}
