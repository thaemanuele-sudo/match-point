"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./Velocita.module.css";

const T = {
  it: {
    back: "Indietro",
    giri_valore: "2.180",
    giulia_s_serve_last: "Servizio di Giulia · ultime 7 prime",
    speed: "Velocità",
    km_h: "km/h",
    top_speed: "punta massima",
    avg_km_h: "media km/h",
    kick_rpm: "giri/min kick",
    in_4_weeks: "in 4 settimane",
    estimated_from_the_ball: "Stima dalla traiettoria della palla nel video a 60 fps; per il servizio sono consigliati 120 fps.",
  },
  en: {
    back: "Back",
    giri_valore: "2,180",
    giulia_s_serve_last: "Giulia's serve · last 7 first serves",
    speed: "Speed",
    km_h: "km/h",
    top_speed: "top speed",
    avg_km_h: "avg km/h",
    kick_rpm: "kick rpm",
    in_4_weeks: "in 4 weeks",
    estimated_from_the_ball: "Estimated from the ball trajectory in 60 fps video; 120 fps recommended for the serve.",
  },
};

const VOCI = {
  it: ["Palla", "Racchetta", "Rotazione"],
  en: ["Ball", "Racket", "Spin"],
};

export function Velocita() {
  const t = useT(T);
  const { lang } = useLang();
  const [sel, setSel] = useState(0);
  // Voci del selettore: il tocco cambia solo l'evidenziazione, come nel disegno.
  const vk = VOCI[lang].map((l, i) => (
    <button type="button" key={l} className={`${s.sg} ${i === sel ? s.on : ""}`} aria-pressed={i === sel} onClick={() => setSel(i)}>
      {l}
    </button>
  ));
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.scr}>
        <header className={s.hdr}>
          <Link href={ROTTE.VideoLab} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.giulia_s_serve_last}
            </div>
            <h1 className={s.h1}>
              {t.speed}
            </h1>
          </div>
        </header>
        <div className={s.e1}>
          <span className={`disp ${s.disp} ${s.e2}`}>
            118
          </span>
          <span className={s.e3}>
            {t.km_h}
          </span>
          <span className={`muted ${s.muted} ${s.e4}`}>
            {t.top_speed}
          </span>
        </div>
        <div className={`${s.seg} ${s.e5}`}>
          {vk}
        </div>
        <div className={`card ${s.card} ${s.e6}`}>
          <svg width="345" height="180" viewBox="0 0 345 180" aria-hidden="true">
            <rect x="14" y="84" width="30" height="86" rx="8" fill="#3A3A3E" />
            <text x="29" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              96
            </text>
            <rect x="60" y="64" width="30" height="106" rx="8" fill="#3A3A3E" />
            <text x="75" y="56" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              104
            </text>
            <rect x="106" y="103" width="30" height="67" rx="8" fill="#3A3A3E" />
            <text x="121" y="95" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              88
            </text>
            <rect x="152" y="45" width="30" height="125" rx="8" fill="#3A3A3E" />
            <text x="167" y="37" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              112
            </text>
            <rect x="198" y="76" width="30" height="94" rx="8" fill="#3A3A3E" />
            <text x="213" y="68" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              99
            </text>
            <rect x="244" y="31" width="30" height="139" rx="8" fill="#D8F34A" />
            <text x="259" y="23" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              118
            </text>
            <rect x="290" y="57" width="30" height="113" rx="8" fill="#3A3A3E" />
            <text x="305" y="49" textAnchor="middle" fontSize="11" fontWeight="800" fill="#A1A1A6" fontFamily="system-ui">
              107
            </text>
          </svg>
        </div>
        <div className={s.g3}>
          <div className={s.tile}>
            <b>
              103
            </b>
            <span>
              {t.avg_km_h}
            </span>
          </div>
          <div className={s.tile}>
            <b>
              {t.giri_valore}
            </b>
            <span>
              {t.kick_rpm}
            </span>
          </div>
          <div className={s.tile}>
            <b className={s.e7}>
              +9%
            </b>
            <span>
              {t.in_4_weeks}
            </span>
          </div>
        </div>
        <div className={s.note}>
          {t.estimated_from_the_ball}
        </div>
      </div>
      </div>
    </Schermo>
  );
}
