"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./Heatmap.module.css";

const T = {
  it: {
    back: "Indietro",
    tommaso_tuesday_practice: "Tommaso · allenamento di martedì",
    heatmap: "Heatmap",
    balls_past_the_service: "palle oltre la linea di servizio",
    short_balls_in_the: "palle corte al centro",
    average_behind_the_baseline: "media dietro la linea di fondo",
    ai_reading: "Lettura AI",
    plays_the_forehand_diagonal: " · gioca bene la diagonale di diritto ma resta lontano dalla linea: l'avversario può usare la palla corta (S7).",
    open_the_linked_strategy: "Apri la strategia collegata",
  },
  en: {
    back: "Back",
    tommaso_tuesday_practice: "Tommaso · Tuesday practice",
    heatmap: "Heatmap",
    balls_past_the_service: "balls past the service line",
    short_balls_in_the: "short balls in the middle",
    average_behind_the_baseline: "average behind the baseline",
    ai_reading: "AI reading",
    plays_the_forehand_diagonal: " · plays the forehand diagonal well but stays far from the line: the opponent can use the drop shot (S7).",
    open_the_linked_strategy: "Open the linked strategy",
  },
};

const VOCI = {
  it: ["Rimbalzi", "Posizioni", "Entrambi"],
  en: ["Bounces", "Positions", "Both"],
};

export function Heatmap() {
  const t = useT(T);
  const { lang } = useLang();
  const [sel, setSel] = useState(2);
  // Voci del selettore: il tocco cambia solo l'evidenziazione, come nel disegno.
  const hm = VOCI[lang].map((l, i) => (
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
              {t.tommaso_tuesday_practice}
            </div>
            <h1 className={s.h1}>
              {t.heatmap}
            </h1>
          </div>
        </header>
        <div className={`${s.seg} ${s.e1}`}>
          {hm}
        </div>
        <div className={s.e2}>
          <svg className={s.e3} width="150" height="230" viewBox="0 0 150 230" aria-hidden="true">
            <g fill="none" stroke="#fff" strokeWidth="1.6">
              <rect x="20" y="12" width="110" height="206" />
              <path d="M34 12v206M116 12v206M34 63h82M34 167h82M75 63v104" />
            </g>
            <path d="M8 115h134" stroke="#fff" strokeWidth="2.5" opacity=".7" />
            <circle cx="56" cy="46" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="58" cy="44" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="72" cy="28" r="11" fill="#D8F34A" opacity=".35" />
            <circle cx="58" cy="56" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="58" cy="45" r="7" fill="#D8F34A" opacity=".35" />
            <circle cx="73" cy="29" r="11" fill="#D8F34A" opacity=".35" />
            <circle cx="58" cy="32" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="45" cy="25" r="11" fill="#D8F34A" opacity=".35" />
            <circle cx="59" cy="36" r="10" fill="#D8F34A" opacity=".35" />
            <circle cx="50" cy="26" r="7" fill="#D8F34A" opacity=".35" />
            <circle cx="52" cy="41" r="12" fill="#D8F34A" opacity=".35" />
            <circle cx="64" cy="28" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="67" cy="31" r="11" fill="#D8F34A" opacity=".35" />
            <circle cx="63" cy="27" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="87" cy="45" r="7" fill="#D8F34A" opacity=".35" />
            <circle cx="89" cy="72" r="6" fill="#D8F34A" opacity=".35" />
            <circle cx="107" cy="57" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="85" cy="49" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="101" cy="52" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="99" cy="68" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="86" cy="67" r="8" fill="#D8F34A" opacity=".35" />
            <circle cx="77" cy="43" r="7" fill="#D8F34A" opacity=".35" />
            <circle cx="83" cy="95" r="11" fill="#FF9F43" opacity=".35" />
            <circle cx="74" cy="87" r="8" fill="#FF9F43" opacity=".35" />
            <circle cx="82" cy="102" r="6" fill="#FF9F43" opacity=".35" />
            <circle cx="72" cy="71" r="12" fill="#FF9F43" opacity=".35" />
            <circle cx="76" cy="66" r="6" fill="#FF9F43" opacity=".35" />
            <circle cx="60" cy="247" r="11" fill="#3D8BFF" opacity=".35" />
            <circle cx="46" cy="231" r="10" fill="#3D8BFF" opacity=".35" />
            <circle cx="69" cy="204" r="7" fill="#3D8BFF" opacity=".35" />
            <circle cx="61" cy="216" r="8" fill="#3D8BFF" opacity=".35" />
            <circle cx="75" cy="211" r="6" fill="#3D8BFF" opacity=".35" />
            <circle cx="72" cy="216" r="11" fill="#3D8BFF" opacity=".35" />
            <circle cx="61" cy="222" r="7" fill="#3D8BFF" opacity=".35" />
            <circle cx="76" cy="212" r="7" fill="#3D8BFF" opacity=".35" />
            <circle cx="69" cy="216" r="7" fill="#3D8BFF" opacity=".35" />
            <circle cx="63" cy="207" r="6" fill="#3D8BFF" opacity=".35" />
            <circle cx="58" cy="215" r="12" fill="#3D8BFF" opacity=".35" />
            <circle cx="75" cy="225" r="11" fill="#3D8BFF" opacity=".35" />
            <circle cx="41" cy="235" r="9" fill="#3D8BFF" opacity=".35" />
            <circle cx="67" cy="227" r="6" fill="#3D8BFF" opacity=".35" />
            <circle cx="59" cy="219" r="11" fill="#3D8BFF" opacity=".35" />
            <circle cx="72" cy="201" r="6" fill="#3D8BFF" opacity=".35" />
            <circle cx="96" cy="213" r="7" fill="#3D8BFF" opacity=".35" />
            <circle cx="98" cy="226" r="7" fill="#3D8BFF" opacity=".35" />
            <circle cx="113" cy="213" r="9" fill="#3D8BFF" opacity=".35" />
            <circle cx="104" cy="204" r="11" fill="#3D8BFF" opacity=".35" />
            <circle cx="88" cy="190" r="10" fill="#3D8BFF" opacity=".35" />
            <circle cx="92" cy="205" r="7" fill="#3D8BFF" opacity=".35" />
          </svg>
          <div className={s.e4}>
            <div className={s.tile}>
              <b>
                64%
              </b>
              <span>
                {t.balls_past_the_service}
              </span>
            </div>
            <div className={s.tile}>
              <b className={s.e5}>
                18%
              </b>
              <span>
                {t.short_balls_in_the}
              </span>
            </div>
            <div className={s.tile}>
              <b>
                1,8 m
              </b>
              <span>
                {t.average_behind_the_baseline}
              </span>
            </div>
          </div>
        </div>
        <div className={`card ${s.card} ${s.pad} ${s.e6}`}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
            </svg>
          </span>
          <div className={s.e7}>
            <b>
              {t.ai_reading}
            </b>
            {t.plays_the_forehand_diagonal}
          </div>
        </div>
        <Link href={ROTTE.TatticaStrategia} className={`${s.btn2} ${s.e8}`}>
          {t.open_the_linked_strategy}
        </Link>
      </div>
      </div>
    </Schermo>
  );
}
