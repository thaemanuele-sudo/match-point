"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useState } from "react";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./TimelineColpi.module.css";

const T = {
  it: {
    back: "Indietro",
    practice_22_s_6: "Allenamento · 22 s · 6 colpi",
    recognized_strokes: "Colpi riconosciuti",
    forehand: "Diritto",
    crosscourt: "incrociato",
    backhand: "Rovescio",
    straight: "dritto",
    slice: "Back",
    down_the_line: "lungolinea",
    volley: "Volée",
    overhead: "Smash",
  },
  en: {
    back: "Back",
    practice_22_s_6: "Practice · 22 s · 6 strokes",
    recognized_strokes: "Recognized strokes",
    forehand: "Forehand",
    crosscourt: "crosscourt",
    backhand: "Backhand",
    straight: "straight",
    slice: "Slice",
    down_the_line: "down the line",
    volley: "Volley",
    overhead: "Overhead",
  },
  fr: {
    back: "Retour",
    practice_22_s_6: "Entraînement · 22 s · 6 coups",
    recognized_strokes: "Coups reconnus",
    forehand: "Coup droit",
    crosscourt: "croisé",
    backhand: "Revers",
    straight: "droit",
    slice: "Slice",
    down_the_line: "long de ligne",
    volley: "Volée",
    overhead: "Smash",
  },
  de: {
    back: "Zurück",
    practice_22_s_6: "Training · 22 s · 6 Schläge",
    recognized_strokes: "Erkannte Schläge",
    forehand: "Vorhand",
    crosscourt: "cross",
    backhand: "Rückhand",
    straight: "gerade",
    slice: "Slice",
    down_the_line: "longline",
    volley: "Volley",
    overhead: "Schmetterball",
  },
  es: {
    back: "Atrás",
    practice_22_s_6: "Entrenamiento · 22 s · 6 golpes",
    recognized_strokes: "Golpes reconocidos",
    forehand: "Derecha",
    crosscourt: "cruzado",
    backhand: "Revés",
    straight: "recto",
    slice: "Cortado",
    down_the_line: "paralelo",
    volley: "Volea",
    overhead: "Remate",
  },
};

const VOCI: Record<Lingua, string[]> = {
  it: ["Tutti", "Diritto", "Rovescio", "Rete"],
  en: ["All", "Forehand", "Backhand", "Net"],
  fr: ["Tous", "Coup droit", "Revers", "Filet"],
  de: ["Alle", "Vorhand", "Rückhand", "Netz"],
  es: ["Todos", "Derecha", "Revés", "Red"],
};

export function TimelineColpi() {
  const t = useT(T);
  const { lang } = useLang();
  const [sel, setSel] = useState(0);
  // Voci del selettore: il tocco cambia solo l'evidenziazione, come nel disegno.
  const fil = VOCI[lang].map((l, i) => (
    <button type="button" key={l} className={`chip ${s.chip} ${i === sel ? `on ${s.on}` : ""}`} aria-pressed={i === sel} onClick={() => setSel(i)}>
      {l}
    </button>
  ));
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={`${s.scr} ${s.e1}`}>
        <header className={s.hdr}>
          <Link href={ROTTE.VideoLab} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.practice_22_s_6}
            </div>
            <h1 className={s.h1}>
              {t.recognized_strokes}
            </h1>
          </div>
        </header>
        <div className={`${s.lab} ${s.e2}`}>
          <span className={s.e3}>
            <svg className={s.e4} width="100" height="120" viewBox="0 0 100 120" aria-hidden="true">
              <defs>
                <linearGradient id="l17" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#F3F6F1" />
                  <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
                </linearGradient>
                <radialGradient id="h17" cx=".35" cy=".3" r=".8">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
                </radialGradient>
                <linearGradient id="t17" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                  <stop offset="1" stopColor="#D8F34A" />
                </linearGradient>
                <filter id="g17" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="s17" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor="#000" stopOpacity=".55" />
                  <stop offset="1" stopColor="#000" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="42" cy="118" rx="22" ry="4" fill="url(#s17)" />
              <polygon points="43.3,45.3 47.8,44.6 45.2,72.2 42.0,72.2" fill="url(#l17)" stroke="url(#l17)" strokeWidth="5.1" strokeLinejoin="round" opacity="1.0" />
              <line x1="45.5" y1="44.9" x2="43.6" y2="72.2" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="0.6" strokeDasharray="1.3 1.3" />
              <line x1="45.2" y1="42.7" x2="46.5" y2="33.7" stroke="#050505" strokeWidth="3.5" strokeLinecap="round" opacity=".6" />
              <line x1="45.2" y1="42.7" x2="46.5" y2="33.7" stroke="url(#l17)" strokeWidth="2.2" strokeLinecap="round" opacity="1.0" />
              <line x1="45.2" y1="42.7" x2="46.5" y2="33.7" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.6" strokeLinecap="round" />
              <line x1="43.3" y1="45.3" x2="36.2" y2="51.0" stroke="#050505" strokeWidth="4.8" strokeLinecap="round" opacity=".6" />
              <line x1="43.3" y1="45.3" x2="36.2" y2="51.0" stroke="url(#l17)" strokeWidth="3.5" strokeLinecap="round" opacity="1.0" />
              <line x1="43.3" y1="45.3" x2="36.2" y2="51.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.0" strokeLinecap="round" />
              <line x1="36.2" y1="51.0" x2="33.6" y2="58.8" stroke="#050505" strokeWidth="4.2" strokeLinecap="round" opacity=".6" />
              <line x1="36.2" y1="51.0" x2="33.6" y2="58.8" stroke="url(#l17)" strokeWidth="2.9" strokeLinecap="round" opacity="1.0" />
              <line x1="36.2" y1="51.0" x2="33.6" y2="58.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="47.8" y1="44.6" x2="53.6" y2="51.0" stroke="#050505" strokeWidth="4.8" strokeLinecap="round" opacity=".6" />
              <line x1="47.8" y1="44.6" x2="53.6" y2="51.0" stroke="url(#l17)" strokeWidth="3.5" strokeLinecap="round" opacity="1.0" />
              <line x1="47.8" y1="44.6" x2="53.6" y2="51.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.0" strokeLinecap="round" />
              <line x1="53.6" y1="51.0" x2="56.1" y2="59.4" stroke="#050505" strokeWidth="4.2" strokeLinecap="round" opacity=".6" />
              <line x1="53.6" y1="51.0" x2="56.1" y2="59.4" stroke="url(#l17)" strokeWidth="2.9" strokeLinecap="round" opacity="1.0" />
              <line x1="53.6" y1="51.0" x2="56.1" y2="59.4" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="42.0" y1="72.2" x2="33.6" y2="90.2" stroke="#050505" strokeWidth="6.1" strokeLinecap="round" opacity=".6" />
              <line x1="42.0" y1="72.2" x2="33.6" y2="90.2" stroke="url(#l17)" strokeWidth="4.8" strokeLinecap="round" opacity="1.0" />
              <line x1="42.0" y1="72.2" x2="33.6" y2="90.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="33.6" y1="90.2" x2="27.9" y2="110.8" stroke="#050505" strokeWidth="5.1" strokeLinecap="round" opacity=".6" />
              <line x1="33.6" y1="90.2" x2="27.9" y2="110.8" stroke="url(#l17)" strokeWidth="3.9" strokeLinecap="round" opacity="1.0" />
              <line x1="33.6" y1="90.2" x2="27.9" y2="110.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="45.2" y1="72.2" x2="53.6" y2="87.0" stroke="#050505" strokeWidth="6.1" strokeLinecap="round" opacity=".6" />
              <line x1="45.2" y1="72.2" x2="53.6" y2="87.0" stroke="url(#l17)" strokeWidth="4.8" strokeLinecap="round" opacity="1.0" />
              <line x1="45.2" y1="72.2" x2="53.6" y2="87.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="53.6" y1="87.0" x2="51.6" y2="109.5" stroke="#050505" strokeWidth="5.1" strokeLinecap="round" opacity=".6" />
              <line x1="53.6" y1="87.0" x2="51.6" y2="109.5" stroke="url(#l17)" strokeWidth="3.9" strokeLinecap="round" opacity="1.0" />
              <line x1="53.6" y1="87.0" x2="51.6" y2="109.5" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
              <circle cx="46.5" cy="33.7" r="4.2" fill="url(#h17)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
              <line x1="33.6" y1="58.8" x2="28.7" y2="46.9" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.6" strokeLinecap="round" />
              <ellipse cx="24.8" cy="37.4" rx="10.3" ry="6.7" transform="rotate(-112.6 24.8 37.4)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.0" />
              <g transform="rotate(-112.6 24.8 37.4)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
                <line x1="15.1" y1="33.5" x2="34.4" y2="33.5" />
                <line x1="15.1" y1="35.5" x2="34.4" y2="35.5" />
                <line x1="15.1" y1="37.4" x2="34.4" y2="37.4" />
                <line x1="15.1" y1="39.3" x2="34.4" y2="39.3" />
                <line x1="15.1" y1="41.3" x2="34.4" y2="41.3" />
                <line x1="19.0" y1="31.3" x2="19.0" y2="43.5" />
                <line x1="21.9" y1="31.3" x2="21.9" y2="43.5" />
                <line x1="24.8" y1="31.3" x2="24.8" y2="43.5" />
                <line x1="27.6" y1="31.3" x2="27.6" y2="43.5" />
                <line x1="30.5" y1="31.3" x2="30.5" y2="43.5" />
              </g>
              <ellipse cx="24.8" cy="37.4" rx="10.3" ry="6.7" transform="rotate(-112.6 24.8 37.4)" fill="none" stroke="#F0454A" strokeWidth="0.6" />
              <circle cx="45.2" cy="42.7" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="45.2" cy="42.7" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="43.3" cy="45.3" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="43.3" cy="45.3" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="47.8" cy="44.6" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="47.8" cy="44.6" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="36.2" cy="51.0" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="36.2" cy="51.0" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="53.6" cy="51.0" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="53.6" cy="51.0" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="33.6" cy="58.8" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="33.6" cy="58.8" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="56.1" cy="59.4" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="56.1" cy="59.4" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="42.0" cy="72.2" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="42.0" cy="72.2" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="45.2" cy="72.2" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="45.2" cy="72.2" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="33.6" cy="90.2" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="33.6" cy="90.2" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="53.6" cy="87.0" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="53.6" cy="87.0" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="27.9" cy="110.8" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="27.9" cy="110.8" r="1.2" fill="#D8F34A" filter="url(#g17)" />
              <circle cx="51.6" cy="109.5" r="2.2" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="51.6" cy="109.5" r="1.2" fill="#D8F34A" filter="url(#g17)" />
            </svg>
          </span>
        </div>
        <div className={s.e5}>
          <span className={s.e6} />
          <span className={s.e7} />
          <span className={s.e8} />
          <span className={s.e9} />
          <span className={s.e10} />
          <span className={s.e11} />
        </div>
        <div className={s.chips}>
          {fil}
        </div>
        <Link href={ROTTE.Feedback} className={s.li}>
          <span className={`disp ${s.disp} ${s.e12}`}>
            0:02
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.forehand}
            </span>
            <span className={`${s.s} ${s.e13}`}>
              {t.crosscourt}
            </span>
          </span>
          <span className={`disp ${s.disp} ${s.e14}`}>
            18%
          </span>
        </Link>
        <Link href={ROTTE.Feedback} className={s.li}>
          <span className={`disp ${s.disp} ${s.e12}`}>
            0:05
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.backhand}
            </span>
            <span className={`${s.s} ${s.e13}`}>
              {t.straight}
            </span>
          </span>
          <span className={`disp ${s.disp} ${s.e15}`}>
            34%
          </span>
        </Link>
        <Link href={ROTTE.Feedback} className={s.li}>
          <span className={`disp ${s.disp} ${s.e12}`}>
            0:08
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.forehand}
            </span>
            <span className={`${s.s} ${s.e13}`}>
              {t.crosscourt}
            </span>
          </span>
          <span className={`disp ${s.disp} ${s.e16}`}>
            58%
          </span>
        </Link>
        <Link href={ROTTE.Feedback} className={s.li}>
          <span className={`disp ${s.disp} ${s.e12}`}>
            0:12
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.slice}
            </span>
            <span className={`${s.s} ${s.e13}`}>
              {t.down_the_line}
            </span>
          </span>
          <span className={`disp ${s.disp} ${s.e14}`}>
            12%
          </span>
        </Link>
        <Link href={ROTTE.Feedback} className={s.li}>
          <span className={`disp ${s.disp} ${s.e12}`}>
            0:15
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.volley}
            </span>
            <span className={`${s.s} ${s.e13}`}>
              {t.crosscourt}
            </span>
          </span>
          <span className={`disp ${s.disp} ${s.e17}`}>
            74%
          </span>
        </Link>
        <Link href={ROTTE.Feedback} className={s.li}>
          <span className={`disp ${s.disp} ${s.e12}`}>
            0:19
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.overhead}
            </span>
            <span className={`${s.s} ${s.e13}`}>
              {t.straight}
            </span>
          </span>
          <span className={`disp ${s.disp} ${s.e14}`}>
            20%
          </span>
        </Link>
      </div>
      </div>
    </Schermo>
  );
}
