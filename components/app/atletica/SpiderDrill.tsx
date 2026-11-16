"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Movimento gambe · U12", titolo: "Spider drill", nota: "5 coni, partenza dal centro e ritorno al centro dopo ogni cono.", giri: "giri", tempo: "tempo", record: "record personale", video: "Video", crono: "Cronometra", schema: "Schema dello spider drill: cinque coni intorno al giocatore al centro" },
  en: { kick: "Leg movement · U12", titolo: "Spider drill", nota: "5 cones, start from the middle and return to the middle after each cone.", giri: "rounds", tempo: "time", record: "personal best", video: "Video", crono: "Time it", schema: "Spider drill layout: five cones around the player in the middle" },
};
// Coni: [x della punta, y della punta, etichetta]; le linee partono dal centro (178,200).
const CONI: [number, number, number][] = [[70, 236, 1], [70, 76, 2], [178, 46, 3], [286, 76, 4], [286, 236, 5]];
const FINI: [number, number][] = [[70, 250], [70, 90], [178, 60], [286, 90], [286, 250]];

export function SpiderDrill() {
  const t = useT(T);
  return (
    <Schermo tab="atletica">
      <div className={s.r}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.Atletica} />
        <div className={s.campo}>
          <svg viewBox="0 0 357 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label={t.schema}>
            <rect x="40" y="30" width="277" height="250" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M40 140h277M178 140v140" stroke="#fff" strokeWidth="2" opacity=".8" />
            {FINI.map(([x, y]) => <path key={`${x}-${y}`} d={`M178 200 L${x} ${y}`} stroke="#D8F34A" strokeWidth="2.5" strokeDasharray="6 5" fill="none" />)}
            {CONI.map(([x, y, n]) => (
              <g key={n}>
                <path d={`M${x - 11} ${y + 24} L${x} ${y} L${x + 11} ${y + 24}Z`} fill="#FF9F43" />
                <text x={x} y={y + 44} textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="17" fill="#fff">{n}</text>
              </g>
            ))}
            <circle cx="178" cy="205" r="11" fill="#3D8BFF" stroke="#fff" strokeWidth="2" />
            <text x="178" y="210" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="14" fill="#fff">A</text>
          </svg>
        </div>
        <div className={s.note}>{t.nota}</div>
        <div className={s.g3}>
          <div className={s.tile}><b>3</b><span>{t.giri}</span></div>
          <div className={s.tile}><b>8&apos;</b><span>{t.tempo}</span></div>
          <div className={s.tile}><b style={{ color: "#4CD07D" }}>17,4 s</b><span>{t.record}</span></div>
        </div>
        <div className={s.g2}>
          <Link href={ROTTE.TecnicaColpo} className={s.btn2}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{t.video}
          </Link>
          <Link href={ROTTE.SessioneAtletica} className={s.btn} style={{ flex: 1 }}>{t.crono}</Link>
        </div>
      </div>
    </Schermo>
  );
}
