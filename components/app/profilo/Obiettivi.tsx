"use client";
import Link from "next/link";
import { useLang, useT } from "@/lib/i18n/lingua";
import { iniziali, useProfilo } from "@/lib/useProfilo";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import c from "./comune.module.css";
import s from "./Obiettivi.module.css";

const T = {
  it: {
    sotto: "Under 14 · classifica 4.3", impostazioni: "Impostazioni", anni: "anni", sessioni: "sessioni", video: "video", badge: "badge",
    settimana: "Obiettivi della settimana", storico: "Storico", mesi: "ULTIMI 6 MESI", nomeDemo: "Giulia M.", iniz: "GL",
  },
  en: {
    sotto: "Under 14 · ranking 4.3", impostazioni: "Settings", anni: "years", sessioni: "sessions", video: "videos", badge: "badges",
    settimana: "This week's goals", storico: "History", mesi: "LAST 6 MONTHS", nomeDemo: "Giulia M.", iniz: "GL",
  },
  fr: {
    sotto: "Moins de 14 ans · classement 4.3", impostazioni: "Paramètres", anni: "ans", sessioni: "séances", video: "vidéos", badge: "badges",
    settimana: "Objectifs de la semaine", storico: "Historique", mesi: "6 DERNIERS MOIS", nomeDemo: "Giulia M.", iniz: "GL",
  },
  de: {
    sotto: "Unter 14 · Rangliste 4.3", impostazioni: "Einstellungen", anni: "Jahre", sessioni: "Einheiten", video: "Videos", badge: "Badges",
    settimana: "Ziele der Woche", storico: "Verlauf", mesi: "LETZTE 6 MONATE", nomeDemo: "Giulia M.", iniz: "GL",
  },
  es: {
    sotto: "Sub-14 · ranking 4.3", impostazioni: "Ajustes", anni: "años", sessioni: "sesiones", video: "vídeos", badge: "insignias",
    settimana: "Objetivos de la semana", storico: "Historial", mesi: "ÚLTIMOS 6 MESES",nomeDemo: "Giulia M.", iniz: "GL",
  },
};
const ANELLI = {
  it: [["+17%", "126/200", "servizi sopra 90 km/h", "#4CD07D", 79], ["+2%", "345/500", "diritti oltre la linea", "#FF9F43", 66], ["+8%", "140/300", "rovesci in topspin", "#FF5A5F", 113]],
  en: [["+17%", "126/200", "serves over 90 km/h", "#4CD07D", 79], ["+2%", "345/500", "forehands past the line", "#FF9F43", 66], ["+8%", "140/300", "topspin backhands", "#FF5A5F", 113]],
  fr: [["+17%", "126/200", "services au-dessus de 90 km/h", "#4CD07D", 79], ["+2%", "345/500", "coups droits au-delà de la ligne", "#FF9F43", 66], ["+8%", "140/300", "revers liftés", "#FF5A5F", 113]],
  de: [["+17%", "126/200", "Aufschläge über 90 km/h", "#4CD07D", 79], ["+2%", "345/500", "Vorhand-Winner über die Linie", "#FF9F43", 66], ["+8%", "140/300", "Rückhände mit Topspin", "#FF5A5F", 113]],
  es: [["+17%", "126/200", "saques de más de 90 km/h", "#4CD07D", 79], ["+2%", "345/500", "derechas más allá de la línea", "#FF9F43", 66], ["+8%", "140/300", "reveses liftados", "#FF5A5F", 113]],
} as const;
// Altezze (px) delle barre degli ultimi 6 mesi, una riga per obiettivo; ogni quinta barra è evidenziata.
const BARRE: [string, number[]][] = [
  ["#4CD07D", [12, 26, 33, 32, 10, 16, 11, 23, 32, 22, 23, 28, 20, 33, 14, 11, 23, 8, 34, 20, 21, 27, 32, 32, 8, 30, 22, 16, 31, 33]],
  ["#FF9F43", [9, 10, 10, 19, 34, 13, 31, 33, 29, 17, 16, 27, 14, 27, 9, 26, 29, 13, 21, 28, 20, 33, 31, 24, 19, 25, 22, 24, 16, 9]],
  ["#FF5A5F", [15, 26, 25, 12, 19, 27, 23, 28, 26, 10, 27, 8, 34, 23, 16, 25, 15, 14, 30, 23, 25, 34, 25, 23, 20, 28, 12, 15, 28, 12]],
];

/** 69 · Obiettivi settimanali (profilo del giocatore). Nome e iniziali veri, numeri dimostrativi. */
export default function Obiettivi() {
  const t = useT(T);
  const { lang } = useLang();
  const { profilo } = useProfilo();
  const nome = profilo ? `${profilo.nome} ${profilo.cognome[0] ?? ""}.` : t.nomeDemo;
  return (
    <Schermo tab="coach">
      <div className={`${c.col} ${c.stretto}`}>
        <div className={s.riga}>
          <div className={s.avatar} aria-hidden="true">{profilo ? iniziali(profilo) : t.iniz}</div>
          <div className={c.grow}><div className={s.nome}>{nome}</div><div className={s.sotto}>{t.sotto}</div></div>
          <Link href={ROTTE.Impostazioni} className="icon" aria-label={t.impostazioni}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
          </Link>
        </div>
        <div className={c.g4}>
          {[["14", t.anni], ["38", t.sessioni], ["212", t.video], ["9", t.badge]].map(([n, l]) => (
            <div key={l} className={`${c.tile} ${c.centro}`}><b>{n}</b><span>{l}</span></div>
          ))}
        </div>
        <div className={c.sezione}><h2>{t.settimana}</h2><Link href={ROTTE.Progressi} className={c.piccolo}>{t.storico}</Link></div>
        <div className={c.g3}>
          {ANELLI[lang].map(([delta, valore, etichetta, col, off]) => (
            <div key={etichetta} className={s.anello}>
              <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true">
                <circle cx="43" cy="43" r="34" stroke="#232326" strokeWidth="8" fill="none" />
                <circle cx="43" cy="43" r="34" stroke={col} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="214" strokeDashoffset={off} transform="rotate(-90 43 43)" />
                <text x="43" y="48" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="17" fill={col}>{delta}</text>
              </svg>
              <span className={s.valore} style={{ color: col }}>{valore}</span>
              <span className={s.etichetta}>{etichetta}</span>
            </div>
          ))}
        </div>
        <div className={c.k}>{t.mesi}</div>
        {BARRE.map(([col, alt]) => (
          <div key={col} className={s.barre} aria-hidden="true">
            {alt.map((h, i) => <span key={i} className={i % 5 === 0 ? s.forte : undefined} style={{ height: h, background: col }} />)}
          </div>
        ))}
      </div>
    </Schermo>
  );
}
