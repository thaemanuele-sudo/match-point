"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./BallTracking.module.css";

const T = {
  it: {
    back: "Indietro",
    altezza_rete: "1,9 m",
    video_lab_neural_network: "Video Lab · rete neurale per la palla",
    ball_tracking: "Tracciamento palla",
    court_detected: "campo rilevato",
    bounces_in: "rimbalzi in campo",
    in: "IN",
    last_bounce_38_cm: "ultimo rimbalzo · 38 cm dalla linea",
    height_over_the_net: "altezza sopra la rete",
    student: "Allievo",
    opponent: "Avversario",
    student_s_stroke: "Colpo allievo",
  },
  fr: {
    back: "Retour",
    altezza_rete: "1,9 m",
    video_lab_neural_network: "Video Lab · réseau neuronal pour la balle",
    ball_tracking: "Suivi de balle",
    court_detected: "court détecté",
    bounces_in: "rebonds sur le court",
    in: "IN",
    last_bounce_38_cm: "dernier rebond · 38 cm de la ligne",
    height_over_the_net: "hauteur au-dessus du filet",
    student: "Élève",
    opponent: "Adversaire",
    student_s_stroke: "Coup de l'élève",
  },
  de: {
    back: "Zurück",
    altezza_rete: "1,9 m",
    video_lab_neural_network: "Video Lab · neuronales Netz für den Ball",
    ball_tracking: "Ballverfolgung",
    court_detected: "Feld erkannt",
    bounces_in: "Aufsprünge im Feld",
    in: "IN",
    last_bounce_38_cm: "letzter Aufsprung · 38 cm von der Linie",
    height_over_the_net: "Höhe über dem Netz",
    student: "Schüler",
    opponent: "Gegner",
    student_s_stroke: "Schlag des Schülers",
  },
  es: {
    back: "Atrás",
    altezza_rete: "1,9 m",
    video_lab_neural_network: "Video Lab · red neuronal para la bola",
    ball_tracking: "Seguimiento de bola",
    court_detected: "pista detectada",
    bounces_in: "botes en pista",
    in: "IN",
    last_bounce_38_cm: "último bote · 38 cm de la línea",
    height_over_the_net: "altura sobre la red",
    student: "Alumno",
    opponent: "Rival",
    student_s_stroke: "Golpe del alumno",
  },
  en: {
    back: "Back",
    altezza_rete: "1.9 m",
    video_lab_neural_network: "Video Lab · neural network for the ball",
    ball_tracking: "Ball tracking",
    court_detected: "court detected",
    bounces_in: "bounces in court",
    in: "IN",
    last_bounce_38_cm: "last bounce · 38 cm from the line",
    height_over_the_net: "height over the net",
    student: "Student",
    opponent: "Opponent",
    student_s_stroke: "Student's stroke",
  },
};

export function BallTracking() {
  const t = useT(T);
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
              {t.video_lab_neural_network}
            </div>
            <h1 className={s.h1}>
              {t.ball_tracking}
            </h1>
          </div>
        </header>
        <div className={`lawn ${s.lawn} ${s.e1}`}>
          <svg className={s.e2} width="357" height="200" viewBox="0 0 357 200" aria-hidden="true">
            <path d="M30 190 L130 40 L230 40 L330 190Z" fill="none" stroke="#fff" strokeWidth="2" opacity=".85" />
            <path d="M70 130 L290 130 M108 70 L250 70 M180 70 L180 130" stroke="#fff" strokeWidth="1.5" opacity=".7" />
            <path d="M60 105 H300" stroke="#fff" strokeWidth="3" opacity=".6" />
            <path d="M190 180 Q 160 60 150 60" fill="none" stroke="#D8F34A" strokeWidth="3" strokeDasharray="6 5" />
            <circle cx="186" cy="160" r="4" fill="#D8F34A" opacity="0.4" />
            <circle cx="178" cy="128" r="4.5" fill="#D8F34A" opacity="0.55" />
            <circle cx="168" cy="96" r="5" fill="#D8F34A" opacity="0.7" />
            <circle cx="156" cy="70" r="6" fill="#D8F34A" opacity="1" />
            <rect x="12" y="12" width="82" height="22" rx="7" fill="#0B0B0C" opacity=".85" />
            <text x="53" y="27" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4CD07D" fontFamily="system-ui">
              {t.court_detected}
            </text>
          </svg>
        </div>
        <div className={s.e3}>
          <svg className={s.e4} width="150" height="230" viewBox="0 0 150 230" aria-hidden="true">
            <g fill="none" stroke="#fff" strokeWidth="1.6">
              <rect x="20" y="12" width="110" height="206" />
              <path d="M34 12v206M116 12v206M34 63h82M34 167h82M75 63v104" />
            </g>
            <path d="M8 115h134" stroke="#fff" strokeWidth="2.5" opacity=".7" />
            <path d="M75 205 Q 60 120 52 50" fill="none" stroke="#D8F34A" strokeWidth="2.5" strokeDasharray="5 4" />
            <path d="M52 50 Q 85 120 104 196" fill="none" stroke="#FF9F43" strokeWidth="2.5" strokeDasharray="5 4" />
            <circle cx="52" cy="50" r="5" fill="#D8F34A" stroke="#fff" strokeWidth="1.5" />
            <circle cx="104" cy="196" r="5" fill="#FF9F43" stroke="#fff" strokeWidth="1.5" />
            <circle cx="46" cy="38" r="5" fill="#D8F34A" stroke="#fff" strokeWidth="1.5" />
            <circle cx="98" cy="30" r="5" fill="#D8F34A" stroke="#fff" strokeWidth="1.5" />
            <circle cx="75" cy="212" r="7" fill="#3D8BFF" stroke="#fff" strokeWidth="2" />
            <circle cx="80" cy="18" r="7" fill="#FF5A5F" stroke="#fff" strokeWidth="2" />
          </svg>
          <div className={s.e5}>
            <div className={s.tile}>
              <b>
                2
              </b>
              <span>
                {t.bounces_in}
              </span>
            </div>
            <div className={s.tile}>
              <b className={s.e6}>
                {t.in}
              </b>
              <span>
                {t.last_bounce_38_cm}
              </span>
            </div>
            <div className={s.tile}>
              <b>
                {t.altezza_rete}
              </b>
              <span>
                {t.height_over_the_net}
              </span>
            </div>
          </div>
        </div>
        <div className={s.e7}>
          <span className={s.e8}>
            <span className={`${s.dot} ${s.e9}`} />
            {t.student}
          </span>
          <span className={s.e8}>
            <span className={`${s.dot} ${s.e10}`} />
            {t.opponent}
          </span>
          <span className={s.e8}>
            <span className={`${s.dot} ${s.e11}`} />
            {t.student_s_stroke}
          </span>
        </div>
      </div>
      </div>
    </Schermo>
  );
}
