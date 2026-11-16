"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./Strumenti.module.css";

const T = {
  it: {
    back: "Indietro",
    luca_s_forehand_frame: "Diritto di Luca · frame 41",
    draw_and_measure: "Disegna e misura",
    angle: "Angolo",
    line: "Linea",
    circle: "Cerchio",
    stopwatch: "Cronometro",
    voice_over: "Voce sul video",
    send_to_student: "Invia all'allievo",
  },
  en: {
    back: "Back",
    luca_s_forehand_frame: "Luca's forehand · frame 41",
    draw_and_measure: "Draw and measure",
    angle: "Angle",
    line: "Line",
    circle: "Circle",
    stopwatch: "Stopwatch",
    voice_over: "Voice-over",
    send_to_student: "Send to student",
  },
  fr: {
    back: "Retour",
    luca_s_forehand_frame: "Coup droit de Luca · image 41",
    draw_and_measure: "Dessiner et mesurer",
    angle: "Angle",
    line: "Ligne",
    circle: "Cercle",
    stopwatch: "Chronomètre",
    voice_over: "Voix off",
    send_to_student: "Envoyer à l'élève",
  },
  de: {
    back: "Zurück",
    luca_s_forehand_frame: "Luca Vorhand · Frame 41",
    draw_and_measure: "Zeichnen und messen",
    angle: "Winkel",
    line: "Linie",
    circle: "Kreis",
    stopwatch: "Stoppuhr",
    voice_over: "Sprechertext",
    send_to_student: "An den Schüler senden",
  },
  es: {
    back: "Atrás",
    luca_s_forehand_frame: "Derecha de Luca · frame 41",
    draw_and_measure: "Dibuja y mide",
    angle: "Ángulo",
    line: "Línea",
    circle: "Círculo",
    stopwatch: "Cronómetro",
    voice_over: "Voz sobre el vídeo",
    send_to_student: "Enviar al alumno",
  },
};

export function Strumenti() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={`${s.scr} ${s.e1}`}>
        <div className={s.e2}>
          <header className={s.hdr}>
            <Link href={ROTTE.VideoLab} className={`icon ${s.icon}`} aria-label={t.back}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <div className={s.grow}>
              <div className={s.kick}>
                {t.luca_s_forehand_frame}
              </div>
              <h1 className={s.h1}>
                {t.draw_and_measure}
              </h1>
            </div>
          </header>
        </div>
        <div className={`${s.lab} ${s.e3}`}>
          <svg className={s.e4} width="100%" height="420" viewBox="0 0 393 420" aria-hidden="true">
            <defs>
              <linearGradient id="l33" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F3F6F1" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
              </linearGradient>
              <radialGradient id="h33" cx=".35" cy=".3" r=".8">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
              </radialGradient>
              <linearGradient id="t33" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                <stop offset="1" stopColor="#D8F34A" />
              </linearGradient>
              <filter id="g33" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="s33" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#000" stopOpacity=".55" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line x1="28" y1="394" x2="-284" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="56" y1="394" x2="-204" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="84" y1="394" x2="-124" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="112" y1="394" x2="-44" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="140" y1="394" x2="36" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="168" y1="394" x2="116" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="196" y1="394" x2="196" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="224" y1="394" x2="276" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="252" y1="394" x2="356" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="280" y1="394" x2="436" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="308" y1="394" x2="516" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="336" y1="394" x2="596" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="364" y1="394" x2="676" y2="420" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="0" y1="394" x2="393" y2="394" stroke="#4FD1FF" strokeOpacity="0.130" />
            <line x1="0" y1="397" x2="393" y2="397" stroke="#4FD1FF" strokeOpacity="0.118" />
            <line x1="0" y1="406" x2="393" y2="406" stroke="#4FD1FF" strokeOpacity="0.106" />
            <line x1="0" y1="421" x2="393" y2="421" stroke="#4FD1FF" strokeOpacity="0.094" />
            <line x1="0" y1="442" x2="393" y2="442" stroke="#4FD1FF" strokeOpacity="0.082" />
            <line x1="0" y1="469" x2="393" y2="469" stroke="#4FD1FF" strokeOpacity="0.070" />
            <line x1="0" y1="502" x2="393" y2="502" stroke="#4FD1FF" strokeOpacity="0.058" />
            <line x1="0" y1="541" x2="393" y2="541" stroke="#4FD1FF" strokeOpacity="0.046" />
            <line x1="0" y1="586" x2="393" y2="586" stroke="#4FD1FF" strokeOpacity="0.034" />
            <ellipse cx="175" cy="404" rx="78" ry="13" fill="url(#s33)" />
            <polygon points="192.9,155.6 161.5,151.1 159.3,249.8 179.5,249.8" fill="url(#l33)" stroke="url(#l33)" strokeWidth="17.9" strokeLinejoin="round" opacity="1.0" />
            <line x1="177.2" y1="153.3" x2="169.4" y2="249.8" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="2.2" strokeDasharray="4.5 4.5" />
            <line x1="180.6" y1="146.6" x2="184.0" y2="113.0" stroke="#050505" strokeWidth="12.3" strokeLinecap="round" opacity=".6" />
            <line x1="180.6" y1="146.6" x2="184.0" y2="113.0" stroke="url(#l33)" strokeWidth="7.8" strokeLinecap="round" opacity="1.0" />
            <line x1="180.6" y1="146.6" x2="184.0" y2="113.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="192.9" y1="155.6" x2="215.4" y2="193.7" stroke="#050505" strokeWidth="16.8" strokeLinecap="round" opacity=".6" />
            <line x1="192.9" y1="155.6" x2="215.4" y2="193.7" stroke="url(#l33)" strokeWidth="12.3" strokeLinecap="round" opacity="1.0" />
            <line x1="192.9" y1="155.6" x2="215.4" y2="193.7" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="215.4" y1="193.7" x2="246.8" y2="211.6" stroke="#050505" strokeWidth="14.6" strokeLinecap="round" opacity=".6" />
            <line x1="215.4" y1="193.7" x2="246.8" y2="211.6" stroke="url(#l33)" strokeWidth="10.1" strokeLinecap="round" opacity="1.0" />
            <line x1="215.4" y1="193.7" x2="246.8" y2="211.6" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="161.5" y1="151.1" x2="141.4" y2="187.0" stroke="#050505" strokeWidth="16.8" strokeLinecap="round" opacity=".6" />
            <line x1="161.5" y1="151.1" x2="141.4" y2="187.0" stroke="url(#l33)" strokeWidth="12.3" strokeLinecap="round" opacity="1.0" />
            <line x1="161.5" y1="151.1" x2="141.4" y2="187.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="141.4" y1="187.0" x2="127.9" y2="209.4" stroke="#050505" strokeWidth="14.6" strokeLinecap="round" opacity=".6" />
            <line x1="141.4" y1="187.0" x2="127.9" y2="209.4" stroke="url(#l33)" strokeWidth="10.1" strokeLinecap="round" opacity="1.0" />
            <line x1="141.4" y1="187.0" x2="127.9" y2="209.4" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="179.5" y1="249.8" x2="215.4" y2="317.0" stroke="#050505" strokeWidth="21.3" strokeLinecap="round" opacity=".6" />
            <line x1="179.5" y1="249.8" x2="215.4" y2="317.0" stroke="url(#l33)" strokeWidth="16.8" strokeLinecap="round" opacity="1.0" />
            <line x1="179.5" y1="249.8" x2="215.4" y2="317.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="4.7" strokeLinecap="round" />
            <line x1="215.4" y1="317.0" x2="206.4" y2="400.0" stroke="#050505" strokeWidth="17.9" strokeLinecap="round" opacity=".6" />
            <line x1="215.4" y1="317.0" x2="206.4" y2="400.0" stroke="url(#l33)" strokeWidth="13.5" strokeLinecap="round" opacity="1.0" />
            <line x1="215.4" y1="317.0" x2="206.4" y2="400.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.8" strokeLinecap="round" />
            <line x1="159.3" y1="249.8" x2="163.8" y2="321.5" stroke="#050505" strokeWidth="21.3" strokeLinecap="round" opacity=".6" />
            <line x1="159.3" y1="249.8" x2="163.8" y2="321.5" stroke="url(#l33)" strokeWidth="16.8" strokeLinecap="round" opacity="1.0" />
            <line x1="159.3" y1="249.8" x2="163.8" y2="321.5" stroke="#ffffff" strokeOpacity=".45" strokeWidth="4.7" strokeLinecap="round" />
            <line x1="163.8" y1="321.5" x2="139.1" y2="400.0" stroke="#050505" strokeWidth="17.9" strokeLinecap="round" opacity=".6" />
            <line x1="163.8" y1="321.5" x2="139.1" y2="400.0" stroke="url(#l33)" strokeWidth="13.5" strokeLinecap="round" opacity="1.0" />
            <line x1="163.8" y1="321.5" x2="139.1" y2="400.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.8" strokeLinecap="round" />
            <circle cx="184.0" cy="113.0" r="14.6" fill="url(#h33)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
            <line x1="246.8" y1="211.6" x2="291.5" y2="207.9" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="5.6" strokeLinecap="round" />
            <ellipse cx="327.2" cy="204.9" rx="35.9" ry="23.5" transform="rotate(-4.8 327.2 204.9)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="3.6" />
            <g transform="rotate(-4.8 327.2 204.9)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
              <line x1="293.6" y1="191.5" x2="360.8" y2="191.5" />
              <line x1="293.6" y1="198.2" x2="360.8" y2="198.2" />
              <line x1="293.6" y1="204.9" x2="360.8" y2="204.9" />
              <line x1="293.6" y1="211.7" x2="360.8" y2="211.7" />
              <line x1="293.6" y1="218.4" x2="360.8" y2="218.4" />
              <line x1="307.0" y1="183.6" x2="307.0" y2="226.2" />
              <line x1="317.1" y1="183.6" x2="317.1" y2="226.2" />
              <line x1="327.2" y1="183.6" x2="327.2" y2="226.2" />
              <line x1="337.3" y1="183.6" x2="337.3" y2="226.2" />
              <line x1="347.4" y1="183.6" x2="347.4" y2="226.2" />
            </g>
            <ellipse cx="327.2" cy="204.9" rx="35.9" ry="23.5" transform="rotate(-4.8 327.2 204.9)" fill="none" stroke="#F0454A" strokeWidth="2.2" />
            <circle cx="180.6" cy="146.6" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="180.6" cy="146.6" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="192.9" cy="155.6" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="192.9" cy="155.6" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="161.5" cy="151.1" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="161.5" cy="151.1" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="215.4" cy="193.7" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="215.4" cy="193.7" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="141.4" cy="187.0" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="141.4" cy="187.0" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="246.8" cy="211.6" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="246.8" cy="211.6" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="127.9" cy="209.4" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="127.9" cy="209.4" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="179.5" cy="249.8" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="179.5" cy="249.8" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="159.3" cy="249.8" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="159.3" cy="249.8" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="215.4" cy="317.0" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="215.4" cy="317.0" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="163.8" cy="321.5" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="163.8" cy="321.5" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="206.4" cy="400.0" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="206.4" cy="400.0" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="139.1" cy="400.0" r="7.8" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="139.1" cy="400.0" r="4.0" fill="#D8F34A" filter="url(#g33)" />
            <circle cx="343.2" cy="204.9" r="9.0" fill="#D8F34A" filter="url(#g33)" />
            <path d="M336.5 199.3c3.4 3.4 3.4 7.8 0 11.2M349.9 199.3c-3.4 3.4 -3.4 7.8 0 11.2" fill="none" stroke="#fff" strokeWidth="1.2" />
            <path d="M215.4 193.7 L200.2 167.8 A30 30 0 0 1 241.4 208.6 Z" fill="#FF5A5F" fillOpacity=".18" stroke="#FF5A5F" strokeWidth="2" />
            <line x1="215.4" y1="193.7" x2="254.7" y2="156.7" stroke="#FF5A5F" strokeWidth="1" strokeOpacity=".6" />
            <rect x="232.5" y="145.7" width="44.4" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#FF5A5F" strokeOpacity=".7" />
            <text x="254.7" y="161.2" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#FF5A5F">
              150°
            </text>
            <path d="M60 392 L340 392" stroke="#4FD1FF" strokeWidth="3" strokeDasharray="8 5" />
            <circle cx="343" cy="205" r="30" fill="none" stroke="#D8F34A" strokeWidth="3" />
            <rect x="16" y="16" width="92" height="28" rx="9" fill="#050505" opacity=".85" />
            <text x="62" y="35" textAnchor="middle" fontSize="15" fontWeight="800" fill="#D8F34A" fontFamily="Barlow Condensed">
              00:04.18
            </text>
          </svg>
        </div>
        <div className={s.e5}>
          <button className={`icon ${s.icon} ${s.e6}`} aria-label={t.angle} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h16M4 20L16 6" />
            </svg>
          </button>
          <button className={`icon ${s.icon} ${s.e7}`} aria-label={t.line} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20L20 4" />
            </svg>
          </button>
          <button className={`icon ${s.icon} ${s.e7}`} aria-label={t.circle} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
            </svg>
          </button>
          <button className={`icon ${s.icon} ${s.e7}`} aria-label={t.stopwatch} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
          <button className={`icon ${s.icon} ${s.e7}`} aria-label={t.voice_over} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
          </button>
          <button className={`icon ${s.icon} ${s.e8}`} aria-label={t.send_to_student} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </Schermo>
  );
}
