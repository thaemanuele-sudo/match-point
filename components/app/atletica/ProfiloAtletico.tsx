"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Tommaso · U12 · scala 1-10", titolo: "Profilo atletico", oggi: "Oggi", obiettivo: "Obiettivo a 12 settimane", nota1: "L'AI costruisce la scheda partendo dalle due capacità con il divario maggiore:", forza: "forza", e: "ed", equilibrio: "equilibrio", genera: "Genera la scheda", grafico: "Grafico radar delle otto capacità: oggi e obiettivo a 12 settimane" },
  en: { kick: "Tommaso · U12 · 1-10 scale", titolo: "Athletic profile", oggi: "Today", obiettivo: "12-week goal", nota1: "The AI builds the plan starting from the two skills with the largest gap:", forza: "strength", e: "and", equilibrio: "balance", genera: "Generate plan", grafico: "Radar chart of the eight skills: today and 12-week goal" },
};
// Etichette degli otto assi (in ordine orario dall'alto) e posizione del testo; i due assi con il divario maggiore sono arancioni.
const ASSI = {
  it: ["Coordinaz.", "Footwork", "Forza", "Spinta", "Velocità", "Agilità", "Equilibrio", "Mobilità"],
  en: ["Coordin.", "Footwork", "Strength", "Drive", "Speed", "Agility", "Balance", "Mobility"],
};
const POS: [number, number][] = [[178, 32], [267, 68], [304, 154], [267, 240], [178, 276], [89, 240], [52, 154], [89, 68]];
const FINE: [number, number][] = [[178, 46], [252, 76], [282, 150], [252, 224], [178, 254], [104, 224], [74, 150], [104, 76]];
const ANELLI = [
  "178,124 196,132 204,150 196,168 178,176 160,168 152,150 160,132",
  "178,98 215,113 230,150 215,187 178,202 141,187 126,150 141,113",
  "178,72 233,95 256,150 233,205 178,228 123,205 100,150 123,95",
  "178,46 252,76 282,150 252,224 178,254 104,224 74,150 104,76",
];
// Dati dimostrativi della scheda dell'allievo
const OBIETTIVO = "178,67 229,99 251,150 229,201 178,233 127,201 105,150 119,91";
const OGGI = "178,77 222,106 220,150 222,194 178,223 134,194 136,150 127,99";

export function ProfiloAtletico() {
  const t = useT(T);
  const { lang } = useLang();
  return (
    <Schermo tab="atletica">
      <div className={s.r}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.AnalisiAtletica} />
        <div className={s.card} style={{ padding: "6px 0" }}>
          <svg viewBox="0 0 357 300" width="100%" role="img" aria-label={t.grafico} style={{ display: "block" }}>
            {ANELLI.map((p) => <polygon key={p} points={p} fill="none" stroke="#2C2C2E" strokeWidth="1" />)}
            {FINE.map(([x, y], i) => (
              <g key={i}>
                <line x1="178" y1="150" x2={x} y2={y} stroke="#2C2C2E" />
                <text x={POS[i][0]} y={POS[i][1]} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={i === 2 || i === 6 ? "#FF9F43" : "#A1A1A6"} fontFamily="system-ui">{ASSI[lang][i]}</text>
              </g>
            ))}
            <polygon points={OBIETTIVO} fill="rgba(61,139,255,.15)" stroke="#3D8BFF" strokeWidth="2" strokeDasharray="5 4" />
            <polygon points={OGGI} fill="rgba(216,243,74,.25)" stroke="#D8F34A" strokeWidth="2.5" />
          </svg>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12.5, fontWeight: 700 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className={s.dot} style={{ background: "#D8F34A" }} />{t.oggi}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className={s.dot} style={{ background: "#3D8BFF" }} />{t.obiettivo}</span>
        </div>
        <div className={s.note}>{t.nota1} <b style={{ color: "#FF9F43" }}>{t.forza}</b> {t.e} <b style={{ color: "#FF9F43" }}>{t.equilibrio}</b>.</div>
        <Link href={ROTTE.SchedaAtletica} className={s.btn}>{t.genera}</Link>
      </div>
    </Schermo>
  );
}
