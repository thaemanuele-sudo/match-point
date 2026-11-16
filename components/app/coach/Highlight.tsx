"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./Highlight.module.css";

const T = {
  it: {
    back: "Indietro",
    tv_quality_video_point: "Video in qualità TV, punto per punto",
    highlights: "Highlight",
    topspin_backhand_98_km: "Topspin · Rovescio · 98 km/h",
    rallies_over_5_shots: "Scambi oltre 5 colpi",
    k35_rallies: "35 SCAMBI",
    the_5_longest_rallies: "I 5 scambi più lunghi",
    k5_rallies: "5 SCAMBI",
    all_winners: "Tutti i vincenti",
    k24_points: "24 PUNTI",
    break_points: "Palle break",
    k6_points: "6 PUNTI",
    favorite: "Preferito",
    share: "Condividi",
  },
  en: {
    back: "Back",
    tv_quality_video_point: "TV-quality video, point by point",
    highlights: "Highlights",
    topspin_backhand_98_km: "Topspin · Backhand · 98 km/h",
    rallies_over_5_shots: "Rallies over 5 shots",
    k35_rallies: "35 RALLIES",
    the_5_longest_rallies: "The 5 longest rallies",
    k5_rallies: "5 RALLIES",
    all_winners: "All winners",
    k24_points: "24 POINTS",
    break_points: "Break points",
    k6_points: "6 POINTS",
    favorite: "Favorite",
    share: "Share",
  },
  fr: {
    back: "Retour",
    tv_quality_video_point: "Vidéo qualité TV, point par point",
    highlights: "Temps forts",
    topspin_backhand_98_km: "Lifté · Revers · 98 km/h",
    rallies_over_5_shots: "Échanges de plus de 5 coups",
    k35_rallies: "35 ÉCHANGES",
    the_5_longest_rallies: "Les 5 échanges les plus longs",
    k5_rallies: "5 ÉCHANGES",
    all_winners: "Tous les coups gagnants",
    k24_points: "24 POINTS",
    break_points: "Balles de break",
    k6_points: "6 POINTS",
    favorite: "Favori",
    share: "Partager",
  },
  de: {
    back: "Zurück",
    tv_quality_video_point: "Videos in TV-Qualität, Punkt für Punkt",
    highlights: "Highlights",
    topspin_backhand_98_km: "Topspin · Rückhand · 98 km/h",
    rallies_over_5_shots: "Ballwechsel über 5 Schläge",
    k35_rallies: "35 BALLWECHSEL",
    the_5_longest_rallies: "Die 5 längsten Ballwechsel",
    k5_rallies: "5 BALLWECHSEL",
    all_winners: "Alle Gewinnschläge",
    k24_points: "24 PUNKTE",
    break_points: "Break-Bälle",
    k6_points: "6 PUNKTE",
    favorite: "Favorit",
    share: "Teilen",
  },
  es: {
    back: "Atrás",
    tv_quality_video_point: "Vídeo en calidad TV, punto a punto",
    highlights: "Highlights",
    topspin_backhand_98_km: "Liftado · Revés · 98 km/h",
    rallies_over_5_shots: "Puntos de más de 5 golpes",
    k35_rallies: "35 PUNTOS",
    the_5_longest_rallies: "Los 5 puntos más largos",
    k5_rallies: "5 PUNTOS",
    all_winners: "Todos los winners",
    k24_points: "24 PUNTOS",
    break_points: "Bolas de break",
    k6_points: "6 PUNTOS",
    favorite: "Favorito",
    share: "Compartir",
  },
};

export function Highlight() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={`${s.scr} ${s.e1}`}>
        <header className={s.hdr}>
          <Link href={ROTTE.StatPartita} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.tv_quality_video_point}
            </div>
            <h1 className={s.h1}>
              {t.highlights}
            </h1>
          </div>
        </header>
        <div className={`${s.lab} ${s.e2}`}>
          <span className={s.e3}>
            <svg className={s.e4} width="120" height="160" viewBox="0 0 120 160" aria-hidden="true">
              <defs>
                <linearGradient id="l19" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#F3F6F1" />
                  <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
                </linearGradient>
                <radialGradient id="h19" cx=".35" cy=".3" r=".8">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
                </radialGradient>
                <linearGradient id="t19" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                  <stop offset="1" stopColor="#D8F34A" />
                </linearGradient>
                <filter id="g19" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="s19" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor="#000" stopOpacity=".55" />
                  <stop offset="1" stopColor="#000" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="50" cy="158" rx="31" ry="5" fill="url(#s19)" />
              <polygon points="57.5,57.6 45.1,55.8 44.2,94.7 52.2,94.7" fill="url(#l19)" stroke="url(#l19)" strokeWidth="7.1" strokeLinejoin="round" opacity="1.0" />
              <line x1="51.3" y1="56.7" x2="48.2" y2="94.7" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="0.9" strokeDasharray="1.8 1.8" />
              <line x1="52.6" y1="54.0" x2="53.9" y2="40.7" stroke="#050505" strokeWidth="4.9" strokeLinecap="round" opacity=".6" />
              <line x1="52.6" y1="54.0" x2="53.9" y2="40.7" stroke="url(#l19)" strokeWidth="3.1" strokeLinecap="round" opacity="1.0" />
              <line x1="52.6" y1="54.0" x2="53.9" y2="40.7" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.9" strokeLinecap="round" />
              <line x1="57.5" y1="57.6" x2="66.3" y2="72.6" stroke="#050505" strokeWidth="6.6" strokeLinecap="round" opacity=".6" />
              <line x1="57.5" y1="57.6" x2="66.3" y2="72.6" stroke="url(#l19)" strokeWidth="4.9" strokeLinecap="round" opacity="1.0" />
              <line x1="57.5" y1="57.6" x2="66.3" y2="72.6" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="66.3" y1="72.6" x2="78.7" y2="79.7" stroke="#050505" strokeWidth="5.8" strokeLinecap="round" opacity=".6" />
              <line x1="66.3" y1="72.6" x2="78.7" y2="79.7" stroke="url(#l19)" strokeWidth="4.0" strokeLinecap="round" opacity="1.0" />
              <line x1="66.3" y1="72.6" x2="78.7" y2="79.7" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="45.1" y1="55.8" x2="37.1" y2="69.9" stroke="#050505" strokeWidth="6.6" strokeLinecap="round" opacity=".6" />
              <line x1="45.1" y1="55.8" x2="37.1" y2="69.9" stroke="url(#l19)" strokeWidth="4.9" strokeLinecap="round" opacity="1.0" />
              <line x1="45.1" y1="55.8" x2="37.1" y2="69.9" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="37.1" y1="69.9" x2="31.8" y2="78.8" stroke="#050505" strokeWidth="5.8" strokeLinecap="round" opacity=".6" />
              <line x1="37.1" y1="69.9" x2="31.8" y2="78.8" stroke="url(#l19)" strokeWidth="4.0" strokeLinecap="round" opacity="1.0" />
              <line x1="37.1" y1="69.9" x2="31.8" y2="78.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="52.2" y1="94.7" x2="66.3" y2="121.3" stroke="#050505" strokeWidth="8.4" strokeLinecap="round" opacity=".6" />
              <line x1="52.2" y1="94.7" x2="66.3" y2="121.3" stroke="url(#l19)" strokeWidth="6.6" strokeLinecap="round" opacity="1.0" />
              <line x1="52.2" y1="94.7" x2="66.3" y2="121.3" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.9" strokeLinecap="round" />
              <line x1="66.3" y1="121.3" x2="62.8" y2="154.0" stroke="#050505" strokeWidth="7.1" strokeLinecap="round" opacity=".6" />
              <line x1="66.3" y1="121.3" x2="62.8" y2="154.0" stroke="url(#l19)" strokeWidth="5.3" strokeLinecap="round" opacity="1.0" />
              <line x1="66.3" y1="121.3" x2="62.8" y2="154.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="44.2" y1="94.7" x2="46.0" y2="123.0" stroke="#050505" strokeWidth="8.4" strokeLinecap="round" opacity=".6" />
              <line x1="44.2" y1="94.7" x2="46.0" y2="123.0" stroke="url(#l19)" strokeWidth="6.6" strokeLinecap="round" opacity="1.0" />
              <line x1="44.2" y1="94.7" x2="46.0" y2="123.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.9" strokeLinecap="round" />
              <line x1="46.0" y1="123.0" x2="36.2" y2="154.0" stroke="#050505" strokeWidth="7.1" strokeLinecap="round" opacity=".6" />
              <line x1="46.0" y1="123.0" x2="36.2" y2="154.0" stroke="url(#l19)" strokeWidth="5.3" strokeLinecap="round" opacity="1.0" />
              <line x1="46.0" y1="123.0" x2="36.2" y2="154.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="53.9" cy="40.7" r="5.8" fill="url(#h19)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
              <line x1="78.7" y1="79.7" x2="96.4" y2="78.2" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="2.2" strokeLinecap="round" />
              <ellipse cx="110.5" cy="77.0" rx="14.2" ry="9.3" transform="rotate(-4.8 110.5 77.0)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.4" />
              <g transform="rotate(-4.8 110.5 77.0)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
                <line x1="97.2" y1="71.7" x2="123.7" y2="71.7" />
                <line x1="97.2" y1="74.4" x2="123.7" y2="74.4" />
                <line x1="97.2" y1="77.0" x2="123.7" y2="77.0" />
                <line x1="97.2" y1="79.7" x2="123.7" y2="79.7" />
                <line x1="97.2" y1="82.3" x2="123.7" y2="82.3" />
                <line x1="102.5" y1="68.6" x2="102.5" y2="85.4" />
                <line x1="106.5" y1="68.6" x2="106.5" y2="85.4" />
                <line x1="110.5" y1="68.6" x2="110.5" y2="85.4" />
                <line x1="114.4" y1="68.6" x2="114.4" y2="85.4" />
                <line x1="118.4" y1="68.6" x2="118.4" y2="85.4" />
              </g>
              <ellipse cx="110.5" cy="77.0" rx="14.2" ry="9.3" transform="rotate(-4.8 110.5 77.0)" fill="none" stroke="#F0454A" strokeWidth="0.9" />
              <circle cx="52.6" cy="54.0" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="52.6" cy="54.0" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="57.5" cy="57.6" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="57.5" cy="57.6" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="45.1" cy="55.8" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="45.1" cy="55.8" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="66.3" cy="72.6" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="66.3" cy="72.6" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="37.1" cy="69.9" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="37.1" cy="69.9" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="78.7" cy="79.7" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="78.7" cy="79.7" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="31.8" cy="78.8" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="31.8" cy="78.8" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="52.2" cy="94.7" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="52.2" cy="94.7" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="44.2" cy="94.7" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="44.2" cy="94.7" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="66.3" cy="121.3" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="66.3" cy="121.3" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="46.0" cy="123.0" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="46.0" cy="123.0" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="62.8" cy="154.0" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="62.8" cy="154.0" r="1.6" fill="#D8F34A" filter="url(#g19)" />
              <circle cx="36.2" cy="154.0" r="3.1" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="36.2" cy="154.0" r="1.6" fill="#D8F34A" filter="url(#g19)" />
            </svg>
          </span>
          <span className={s.e5}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className={`${s.tag} ${s.e6}`}>
            {t.topspin_backhand_98_km}
          </span>
        </div>
        <div className={`${s.g2} ${s.e7}`}>
          <Link href={ROTTE.TimelineColpi} className={s.e8}>
            <div className={`lawn ${s.lawn} ${s.e9}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className={s.e10}>
              {t.rallies_over_5_shots}
            </span>
            <span className={`${s.k} ${s.e11}`}>
              {t.k35_rallies}
            </span>
          </Link>
          <Link href={ROTTE.TimelineColpi} className={s.e8}>
            <div className={`lawn ${s.lawn} ${s.e9}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className={s.e10}>
              {t.the_5_longest_rallies}
            </span>
            <span className={`${s.k} ${s.e11}`}>
              {t.k5_rallies}
            </span>
          </Link>
          <Link href={ROTTE.TimelineColpi} className={s.e8}>
            <div className={`lawn ${s.lawn} ${s.e9}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className={s.e10}>
              {t.all_winners}
            </span>
            <span className={`${s.k} ${s.e11}`}>
              {t.k24_points}
            </span>
          </Link>
          <Link href={ROTTE.TimelineColpi} className={s.e8}>
            <div className={`lawn ${s.lawn} ${s.e9}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className={s.e10}>
              {t.break_points}
            </span>
            <span className={`${s.k} ${s.e11}`}>
              {t.k6_points}
            </span>
          </Link>
        </div>
        <div className={s.g2}>
          <button className={s.btn2} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
            </svg>
            {t.favorite}
          </button>
          <button className={s.btn2} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />
            </svg>
            {t.share}
          </button>
        </div>
      </div>
      </div>
    </Schermo>
  );
}
