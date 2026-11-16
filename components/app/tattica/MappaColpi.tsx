"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    saturdaySMatch236: "Partita di sabato · 236 colpi",
    whereTheShotsLand: "Dove finiscono i colpi",
    forehand: "Diritto",
    backhand: "Rovescio",
    volley: "Volée",
    overhead: "Smash",
    shotsPerHour: "COLPI ALL'ORA",
    shotsIn: "COLPI DENTRO",
    averageSpeed: "VELOCITÀ MEDIA",
    pastTheServiceLine: "OLTRE LA LINEA DI SERVIZIO",
    longestRally: "SCAMBIO PIÙ LUNGO",
    ralliesOver8Shots: "SCAMBI OLTRE 8 COLPI",
    tStat: "Statistiche",
    tAi: "Consigli AI",
    tNote: "Note",
    tip1: "Il rovescio atterra spesso corto: cerca più profondità, oltre la linea di servizio.",
    tip2: "Il 76% dei colpi parte sul lato del diritto: variare con il lungolinea di rovescio.",
    tip3: "Gli scambi lunghi calano: allena 10 colpi di fila a ritmo medio.",
    nessunaNota: "Nessuna nota per questa partita.",
    aggiungiNota: "Aggiungi una nota",
  },
  en: {
    back: "Back",
    saturdaySMatch236: "Saturday's match · 236 strokes",
    whereTheShotsLand: "Where the shots land",
    forehand: "Forehand",
    backhand: "Backhand",
    volley: "Volley",
    overhead: "Overhead",
    shotsPerHour: "SHOTS PER HOUR",
    shotsIn: "SHOTS IN",
    averageSpeed: "AVERAGE SPEED",
    pastTheServiceLine: "PAST THE SERVICE LINE",
    longestRally: "LONGEST RALLY",
    ralliesOver8Shots: "RALLIES OVER 8 SHOTS",
    tStat: "Stats",
    tAi: "AI tips",
    tNote: "Notes",
    tip1: "The backhand often lands short: aim for more depth, past the service line.",
    tip2: "76% of shots start on the forehand side: mix in the down-the-line backhand.",
    tip3: "Long rallies are dropping: train 10 shots in a row at medium pace.",
    nessunaNota: "No notes for this match.",
    aggiungiNota: "Add a note",
  },
};

// Rimbalzi della partita (dimostrativi): x, y sul campo del disegno e colore del tipo di colpo.
const PUNTI: [number, number, string][] = [
  [202, 77, "#4CD07D"], [300, 78, "#4CD07D"], [144, 43, "#4CD07D"], [120, 58, "#4CD07D"], [239, 78, "#D8F34A"], [175, 43, "#FF9F43"], [117, 146, "#FF9F43"], [200, 100, "#4CD07D"],
  [182, 136, "#D8F34A"], [170, 136, "#4CD07D"], [162, 40, "#FF9F43"], [173, 123, "#FF9F43"], [229, 73, "#4CD07D"], [176, 70, "#FF9F43"], [133, 56, "#D8F34A"], [132, 79, "#4CD07D"],
  [146, 68, "#4CD07D"], [113, 33, "#FF9F43"], [166, 47, "#4CD07D"], [108, 129, "#4CD07D"], [220, 159, "#FF9F43"], [221, 35, "#FF9F43"], [228, 145, "#4CD07D"], [197, 49, "#4CD07D"],
  [214, 106, "#FF9F43"], [222, 65, "#4CD07D"], [112, 93, "#3D8BFF"], [179, 71, "#4CD07D"], [186, 51, "#4CD07D"], [188, 33, "#4CD07D"], [225, 39, "#3D8BFF"], [157, 35, "#4CD07D"],
  [159, 102, "#D8F34A"], [170, 31, "#FF9F43"], [167, 38, "#4CD07D"], [234, 142, "#4CD07D"], [96, 67, "#FF9F43"], [161, 32, "#4CD07D"], [132, 83, "#3D8BFF"], [110, 40, "#D8F34A"],
  [91, 81, "#FF9F43"], [290, 58, "#FF9F43"], [171, 85, "#4CD07D"], [129, 93, "#4CD07D"], [184, 54, "#4CD07D"], [159, 149, "#4CD07D"], [200, 93, "#4CD07D"], [117, 79, "#FF9F43"],
  [194, 52, "#D8F34A"], [126, 49, "#FF9F43"], [130, 68, "#4CD07D"], [121, 116, "#4CD07D"], [192, 159, "#FF9F43"], [190, 55, "#FF9F43"], [166, 86, "#4CD07D"], [268, 32, "#FF9F43"],
  [239, 132, "#4CD07D"], [146, 88, "#3D8BFF"], [218, 58, "#FF9F43"], [132, 90, "#4CD07D"], [55, 74, "#4CD07D"], [168, 97, "#4CD07D"], [198, 148, "#4CD07D"], [155, 36, "#4CD07D"],
  [163, 156, "#4CD07D"], [268, 33, "#4CD07D"], [208, 49, "#4CD07D"], [149, 32, "#D8F34A"], [40, 92, "#FF9F43"], [217, 76, "#D8F34A"], [131, 135, "#4CD07D"], [73, 87, "#4CD07D"],
  [210, 65, "#FF9F43"], [144, 152, "#FF9F43"], [122, 40, "#FF9F43"], [156, 38, "#FF9F43"], [300, 67, "#4CD07D"], [208, 107, "#FF9F43"], [40, 93, "#4CD07D"], [206, 47, "#FF9F43"],
  [298, 91, "#FF9F43"], [115, 59, "#FF9F43"], [187, 78, "#4CD07D"], [168, 49, "#4CD07D"], [88, 64, "#FF9F43"], [170, 79, "#D8F34A"], [92, 101, "#FF9F43"], [84, 89, "#FF9F43"],
  [91, 45, "#FF9F43"], [148, 138, "#4CD07D"], [202, 71, "#4CD07D"], [144, 37, "#FF9F43"], [120, 36, "#D8F34A"], [213, 78, "#3D8BFF"], [236, 84, "#4CD07D"], [216, 122, "#4CD07D"],
  [287, 53, "#FF9F43"], [169, 32, "#FF9F43"], [130, 92, "#FF9F43"], [175, 41, "#4CD07D"], [232, 69, "#4CD07D"], [240, 57, "#4CD07D"], [109, 44, "#4CD07D"], [233, 58, "#4CD07D"],
  [148, 93, "#4CD07D"], [153, 36, "#FF9F43"], [245, 155, "#D8F34A"], [140, 53, "#4CD07D"], [168, 38, "#FF9F43"], [133, 52, "#3D8BFF"],
];

const SCHEDE = ["tStat", "tAi", "tNote"] as const;

export function MappaColpi() {
  const t = useT(T);
  const [scheda, setScheda] = useState<(typeof SCHEDE)[number]>("tStat");
  const [nota, setNota] = useState("");
  return (
    <Schermo tab="tattica">
      <div className={K.scr} style={{ gap: 10 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.StatPartita} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.saturdaySMatch236}</div>
            <h1 className={K.h1}>{t.whereTheShotsLand}</h1>
          </div>
        </header>
        <div className={K.card} style={{ padding: "8px 6px 4px", position: "relative" }}>
          <svg width="100%" viewBox="0 0 345 200" aria-hidden="true" style={{ display: "block", height: "auto" }}>
            <rect x="30" y="20" width="285" height="170" fill="#1F4E7D" rx="2"></rect>
            <g fill="none" stroke="#fff" strokeWidth="2">
              <rect x="30" y="20" width="285" height="170"></rect>
              <path d="M30 99h285M172 99v91"></path>
            </g>
            <path d="M20 190H325" stroke="#fff" strokeWidth="3.5"></path>
            {PUNTI.map(([cx, cy, fill], n) => (
              <circle key={n} cx={cx} cy={cy} r="5" fill={fill} stroke="#050505" strokeWidth="1"></circle>
            ))}
            <g fontWeight="700" fontSize="16" fill="#F3F6F1" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif" }}>
              <text x="2" y="62">76%</text>
              <text x="2" y="150">24%</text>
              <text x="76" y="14">31%</text>
              <text x="160" y="14">27%</text>
              <text x="248" y="14">42%</text>
            </g>
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", fontWeight: "700" }}>
            <span style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <span className={K.dot} style={{ background: "#4CD07D" }}></span>
              {t.forehand}
            </span>
            <span style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <span className={K.dot} style={{ background: "#FF9F43" }}></span>
              {t.backhand}
            </span>
            <span style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <span className={K.dot} style={{ background: "#D8F34A" }}></span>
              {t.volley}
            </span>
            <span style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              <span className={K.dot} style={{ background: "#3D8BFF" }}></span>
              {t.overhead}
            </span>
          </div>
        </div>
        <div className={K.seg} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {SCHEDE.map((k) => (
            <button key={k} type="button" className={k === scheda ? `${K.sg} ${K.on}` : K.sg} aria-pressed={k === scheda} onClick={() => setScheda(k)}>{t[k]}</button>
          ))}
        </div>
        {scheda === "tStat" && (
          <div className={K.g2} style={{ gap: "12px 16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className={K.disp} style={{ fontSize: "28px", fontWeight: "700" }}>482</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#4CD07D" }}>+6%</span>
              </div>
              <div className={K.k} style={{ fontSize: "10.5px" }}>{t.shotsPerHour}</div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className={K.disp} style={{ fontSize: "28px", fontWeight: "700" }}>68%</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#FF5A5F" }}>−2%</span>
              </div>
              <div className={K.k} style={{ fontSize: "10.5px" }}>{t.shotsIn}</div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className={K.disp} style={{ fontSize: "28px", fontWeight: "700" }}>92 km/h</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#4CD07D" }}>+5%</span>
              </div>
              <div className={K.k} style={{ fontSize: "10.5px" }}>{t.averageSpeed}</div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className={K.disp} style={{ fontSize: "28px", fontWeight: "700" }}>72%</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#4CD07D" }}>+3%</span>
              </div>
              <div className={K.k} style={{ fontSize: "10.5px" }}>{t.pastTheServiceLine}</div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className={K.disp} style={{ fontSize: "28px", fontWeight: "700" }}>15</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#FF5A5F" }}>−3%</span>
              </div>
              <div className={K.k} style={{ fontSize: "10.5px" }}>{t.longestRally}</div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className={K.disp} style={{ fontSize: "28px", fontWeight: "700" }}>13%</span>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#4CD07D" }}>+6%</span>
              </div>
              <div className={K.k} style={{ fontSize: "10.5px" }}>{t.ralliesOver8Shots}</div>
            </div>
          </div>
        )}
        {scheda === "tAi" && (
          <div className={K.scr} style={{ gap: 8 }}>
            {[t.tip1, t.tip2, t.tip3].map((x, n) => (
              <div key={x} className={K.li}>
                <span className={K.num}>{n + 1}</span>
                <span className={K.v}>{x}</span>
              </div>
            ))}
          </div>
        )}
        {scheda === "tNote" && (
          <div className={K.scr} style={{ gap: 8 }}>
            <textarea className={K.note} rows={4} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={t.aggiungiNota} aria-label={t.aggiungiNota} style={{ width: "100%", resize: "vertical", font: "inherit", color: "#F3F6F1", boxSizing: "border-box" }} />
            {!nota && <span className={K.muted} style={{ fontSize: 12.5 }}>{t.nessunaNota}</span>}
          </div>
        )}
      </div>
    </Schermo>
  );
}
