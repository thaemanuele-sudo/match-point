"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Testata } from "./comuni";
import c from "./comune.module.css";
import s from "./Progressi.module.css";

const T = {
  it: {
    kick: "Luca · esempio simulato", titolo: "Progressi", p1: "Errori", p2: "Atletica", p3: "Partite",
    errore: "Apertura tardiva", delta: "−36 punti", indice: "indice attuale · corretto", sessioni: "sessioni completate", altri: "Altri errori",
    a1: "Impatto in ritardo", a2: "Appoggi statici",
    grafico: "Andamento dell'errore Apertura tardiva nelle sei sessioni: da 58% a 22%",
  },
  en: {
    kick: "Luca · simulated example", titolo: "Progress", p1: "Errors", p2: "Fitness", p3: "Matches",
    errore: "Late preparation", delta: "−36 points", indice: "current index · correct", sessioni: "sessions completed", altri: "Other errors",
    a1: "Late contact", a2: "Static footing",
    grafico: "Trend of the Late preparation error over six sessions: from 58% to 22%",
  },
};

const PUNTI: [number, number][] = [[30, 87], [85, 97], [140, 105], [195, 118], [250, 132], [305, 145]];
const FASCE_COLORE: [number, number, string, number][] = [[20, 48, "#FF5A5F", 0.12], [68, 40, "#FF9F43", 0.12], [108, 32, "#FFD54A", 0.12], [140, 40, "#4CD07D", 0.14]];

/** 23 · Monitoraggio progressi. Dati dimostrativi. */
export default function Progressi() {
  const t = useT(T);
  const [per, setPer] = useState(0);
  return (
    <Schermo tab="coach">
      <div className={`${c.col}`}>
        <Testata indietro={ROTTE.PianoProposto} kick={t.kick} titolo={t.titolo} />
        <div className={c.seg} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {[t.p1, t.p2, t.p3].map((v, i) => <button key={v} type="button" className={i === per ? `${c.sg} ${c.on}` : c.sg} aria-pressed={i === per} onClick={() => setPer(i)}>{v}</button>)}
        </div>
        <div className={`card ${c.pad}`}>
          <div className={s.titoloGrafico}><h2>{t.errore} <span className={c.code}>DR-01</span></h2><span className={s.delta}>{t.delta}</span></div>
          <svg className={s.grafico} viewBox="0 0 330 206" role="img" aria-label={t.grafico}>
            {FASCE_COLORE.map(([y, h, col, op]) => <rect key={y} x="0" y={y} width="330" height={h} fill={col} opacity={op} />)}
            <polyline points={PUNTI.map((p) => p.join(",")).join(" ")} fill="none" stroke="#D8F34A" strokeWidth="3.5" strokeLinejoin="round" />
            {PUNTI.map(([x, y], i) => (
              <g key={x}>
                <circle cx={x} cy={y} r="5" fill="#F3F6F1" />
                <text x={x} y="198" textAnchor="middle" fontSize="11" fill="#8E8E93" fontWeight="700" fontFamily="system-ui">{`S${i + 1}`}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className={c.g2}>
          <div className={c.tile}><b style={{ color: "#4CD07D" }}>22%</b><span>{t.indice}</span></div>
          <div className={c.tile}><b>6/6</b><span>{t.sessioni}</span></div>
        </div>
        <div className={c.sezione}><h2>{t.altri}</h2></div>
        <div className={c.li}><span className={c.code}>DR-02</span><span className={c.grow}><span className={c.liT}>{t.a1}</span></span><span className={s.valore} style={{ color: "#4CD07D" }}>41 → 19%</span></div>
        <div className={c.li}><span className={c.code}>DR-05</span><span className={c.grow}><span className={c.liT}>{t.a2}</span></span><span className={s.valore} style={{ color: "#FFD54A" }}>44 → 33%</span></div>
      </div>
    </Schermo>
  );
}
