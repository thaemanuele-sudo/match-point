"use client";
import Link from "next/link";
import { useState } from "react";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { useProfilo } from "@/lib/useProfilo";
import type { CategoriaAtletica } from "@/lib/types";
import { primoVideo, useVideoAtletica } from "./useVideoAtletica";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Equilibrio e forza · U12", titolo: "Scheda di 6 settimane", sess: "sessioni / settimana", sett: "settimane", parte: "parte atletica", settimane: "SETTIMANE", sett1: "Sett.", inizia: "Inizia sessione 1", guarda: "Guarda il video" },
  en: { kick: "Balance and strength · U12", titolo: "6-week plan", sess: "sessions / week", sett: "weeks", parte: "fitness part", settimane: "WEEKS", sett1: "Wk", inizia: "Start session 1", guarda: "Watch the video" },
  fr: { kick: "Équilibre et force · U12", titolo: "Programme de 6 semaines", sess: "séances / semaine", sett: "semaines", parte: "partie physique", settimane: "SEMAINES", sett1: "Sem.", inizia: "Commencer la séance 1", guarda: "Regarder la vidéo" },
  de: { kick: "Gleichgewicht und Kraft · U12", titolo: "6-Wochen-Plan", sess: "Einheiten / Woche", sett: "Wochen", parte: "Athletikteil", settimane: "WOCHEN", sett1: "Wo.", inizia: "Einheit 1 starten", guarda: "Video ansehen" },
  es: { kick: "Equilibrio y fuerza · U12", titolo: "Ficha de 6 semanas", sess: "sesiones / semana", sett: "semanas", parte: "parte física", settimane: "SEMANAS", sett1: "Sem.", inizia: "Empezar sesión 1", guarda: "Ver el vídeo" },
};
// Dati dimostrativi. L'ultimo campo è la categoria dei video dell'admin che si adatta all'esercizio (null = nessuna).
type Riga = [string, string, string, string, CategoriaAtletica | null];
const W: Record<Lingua, Record<string, Riga[]>> = {
  it: {
    "1-2": [["Equilibrio monopodalico su linea", "occhi aperti poi chiusi", "3×20 s", "6'", "coordinazione"], ["Squat con bastone sopra la testa", "recupero 45 s", "3×10", "5'", "forza"]],
    "3-4": [["Affondi avanti e laterali", "con racchetta", "3×8", "8'", "forza"], ["Atterraggio da gradino 20 cm", "ginocchia allineate", "3×6", "5'", "prevenzione"]],
    "5-6": [["Mini salti laterali con stop", "sopra la linea", "3×10", "6'", "agilita"], ["Ponte glutei e plank laterale", "recupero 30 s", "3×12", "8'", "forza"], ["Retest video", "split-step e servizio", "1 video", "5'", null]],
  },
  en: {
    "1-2": [["Single-leg balance on a line", "eyes open, then closed", "3×20 s", "6'", "coordinazione"], ["Overhead stick squat", "45 s rest", "3×10", "5'", "forza"]],
    "3-4": [["Forward and lateral lunges", "with racket", "3×8", "8'", "forza"], ["Landing from a 20 cm step", "knees aligned", "3×6", "5'", "prevenzione"]],
    "5-6": [["Mini lateral hops with stop", "over the line", "3×10", "6'", "agilita"], ["Glute bridge and side plank", "30 s rest", "3×12", "8'", "forza"], ["Video retest", "split step and serve", "1 video", "5'", null]],
  },
  fr: {
    "1-2": [["Équilibre sur un pied sur une ligne", "yeux ouverts puis fermés", "3×20 s", "6'", "coordinazione"], ["Squat bâton au-dessus de la tête", "repos 45 s", "3×10", "5'", "forza"]],
    "3-4": [["Fentes avant et latérales", "avec raquette", "3×8", "8'", "forza"], ["Réception d'une marche de 20 cm", "genoux alignés", "3×6", "5'", "prevenzione"]],
    "5-6": [["Mini sauts latéraux avec arrêt", "au-dessus de la ligne", "3×10", "6'", "agilita"], ["Pont fessier et gainage latéral", "repos 30 s", "3×12", "8'", "forza"], ["Nouveau test vidéo", "split-step et service", "1 vidéo", "5'", null]],
  },
  de: {
    "1-2": [["Einbeinstand auf einer Linie", "Augen offen, dann geschlossen", "3×20 s", "6'", "coordinazione"], ["Kniebeuge mit Stab über dem Kopf", "Pause 45 s", "3×10", "5'", "forza"]],
    "3-4": [["Ausfallschritte vor und seitlich", "mit Schläger", "3×8", "8'", "forza"], ["Landung von 20-cm-Stufe", "Knie in einer Linie", "3×6", "5'", "prevenzione"]],
    "5-6": [["Seitliche Mini-Sprünge mit Stopp", "über der Linie", "3×10", "6'", "agilita"], ["Glute-Bridge und Seitstütz", "Pause 30 s", "3×12", "8'", "forza"], ["Video-Wiederholungstest", "Split-Step und Aufschlag", "1 Video", "5'", null]],
  },
  es: {
    "1-2": [["Equilibrio a una pierna sobre una línea", "ojos abiertos, luego cerrados", "3×20 s", "6'", "coordinazione"], ["Sentadilla con palo sobre la cabeza", "descanso 45 s", "3×10", "5'", "forza"]],
    "3-4": [["Zancadas hacia delante y laterales", "con raqueta", "3×8", "8'", "forza"], ["Aterrizaje desde un escalón de 20 cm", "rodillas alineadas", "3×6", "5'", "prevenzione"]],
    "5-6": [["Mini saltos laterales con parada", "sobre la línea", "3×10", "6'", "agilita"], ["Puente de glúteos y plancha lateral", "descanso 30 s", "3×12", "8'", "forza"], ["Repetición del vídeo", "split-step y saque", "1 vídeo", "5'", null]],
  },
};

export function SchedaAtletica() {
  const t = useT(T);
  const { lang } = useLang();
  const { profilo } = useProfilo();
  const { video } = useVideoAtletica();
  const [wk, setWk] = useState("1-2");
  const righe = W[lang][wk];
  return (
    <Schermo tab="atletica">
      <div className={s.r}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.ProfiloAtletico} />
        <div className={s.g3}>
          <div className={s.tile}><b>3</b><span>{t.sess}</span></div>
          <div className={s.tile}><b>6</b><span>{t.sett}</span></div>
          <div className={s.tile}><b>~25&apos;</b><span>{t.parte}</span></div>
        </div>
        <div className={s.k}>{t.settimane}</div>
        <div className={s.seg} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {Object.keys(W[lang]).map((l) => (
            <button key={l} type="button" className={l === wk ? `${s.sg} ${s.on}` : s.sg} aria-pressed={l === wk} onClick={() => setWk(l)}>{t.sett1} {l}</button>
          ))}
        </div>
        {righe.map(([tit, sub, rip, min, cat]) => {
          const v = cat ? primoVideo(video, [cat], profilo?.fascia ?? null) : null;
          return (
            <div key={tit} className={s.li}>
              <span className={s.ic}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></svg></span>
              <span className={s.grow}>
                <span className={s.t}>{tit}</span>
                <span className={`${s.s} ${s.blk}`}>{sub}</span>
                {v && <Link href={`${ROTTE.Atletica}/video/${v.id}`} className={s.vlink}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{t.guarda}</Link>}
              </span>
              <span style={{ textAlign: "right" }}>
                <span className={`${s.disp} ${s.blk}`} style={{ fontSize: 19, fontWeight: 700 }}>{rip}</span>
                <span className={s.muted} style={{ fontSize: 12, fontWeight: 700 }}>{min}</span>
              </span>
            </div>
          );
        })}
        <Link href={ROTTE.SessioneAtletica} className={s.btn} style={{ marginTop: 8 }}>{t.inizia}</Link>
      </div>
    </Schermo>
  );
}
