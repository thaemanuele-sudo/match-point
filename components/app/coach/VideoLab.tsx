"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./VideoLab.module.css";

const T = {
  it: {
    computer_vision_on_your: "Visione artificiale sui tuoi video",
    video_lab: "Video Lab",
    k104_km_h: "104 km/h",
    ball_tracking: "Tracciamento palla",
    trajectory_bounces_and_court: "Traiettoria, rimbalzi e minimappa del campo",
    heatmap: "Heatmap",
    where_the_ball_bounces: "Dove rimbalza la palla e dove si muove il giocatore",
    side_by_side_comparison: "Confronto affiancato",
    student_vs_model_before: "Allievo vs modello, prima vs dopo, in sovrapposizione",
    draw_and_measure: "Disegna e misura",
    angles_lines_stopwatch_frame: "Angoli, linee, cronometro, frame per frame",
    recognized_strokes: "Colpi riconosciuti",
    the_ai_labels_every: "L'AI etichetta ogni colpo nel video",
    speed: "Velocità",
    ball_and_racket_stroke: "Palla e racchetta, colpo per colpo",
    match_and_highlights: "Partita e highlight",
    automatic_stats_and_key: "Statistiche e momenti chiave automatici",
  },
  en: {
    computer_vision_on_your: "Computer vision on your videos",
    video_lab: "Video Lab",
    k104_km_h: "104 km/h",
    ball_tracking: "Ball tracking",
    trajectory_bounces_and_court: "Trajectory, bounces and court minimap",
    heatmap: "Heatmap",
    where_the_ball_bounces: "Where the ball bounces and where the player moves",
    side_by_side_comparison: "Side-by-side comparison",
    student_vs_model_before: "Student vs model, before vs after, overlaid",
    draw_and_measure: "Draw and measure",
    angles_lines_stopwatch_frame: "Angles, lines, stopwatch, frame by frame",
    recognized_strokes: "Recognized strokes",
    the_ai_labels_every: "The AI labels every stroke in the video",
    speed: "Speed",
    ball_and_racket_stroke: "Ball and racket, stroke by stroke",
    match_and_highlights: "Match and highlights",
    automatic_stats_and_key: "Automatic stats and key moments",
  },
  fr: {
    computer_vision_on_your: "Vision artificielle sur tes vidéos",
    video_lab: "Video Lab",
    k104_km_h: "104 km/h",
    ball_tracking: "Suivi de balle",
    trajectory_bounces_and_court: "Trajectoire, rebonds et mini-carte du court",
    heatmap: "Heatmap",
    where_the_ball_bounces: "Où rebondit la balle et où se déplace le joueur",
    side_by_side_comparison: "Comparaison côte à côte",
    student_vs_model_before: "Élève vs modèle, avant vs après, en superposition",
    draw_and_measure: "Dessiner et mesurer",
    angles_lines_stopwatch_frame: "Angles, lignes, chrono, image par image",
    recognized_strokes: "Coups reconnus",
    the_ai_labels_every: "L'IA étiquette chaque coup de la vidéo",
    speed: "Vitesse",
    ball_and_racket_stroke: "Balle et raquette, coup par coup",
    match_and_highlights: "Match et temps forts",
    automatic_stats_and_key: "Statistiques et moments clés automatiques",
  },
  de: {
    computer_vision_on_your: "Computer Vision auf deinen Videos",
    video_lab: "Video Lab",
    k104_km_h: "104 km/h",
    ball_tracking: "Ballverfolgung",
    trajectory_bounces_and_court: "Flugbahn, Absprünge und Minikarte des Felds",
    heatmap: "Heatmap",
    where_the_ball_bounces: "Wo der Ball aufspringt und wohin sich der Spieler bewegt",
    side_by_side_comparison: "Nebeneinander-Vergleich",
    student_vs_model_before: "Schüler vs. Modell, vorher vs. nachher, übereinandergelegt",
    draw_and_measure: "Zeichnen und messen",
    angles_lines_stopwatch_frame: "Winkel, Linien, Stoppuhr, Bild für Bild",
    recognized_strokes: "Erkannte Schläge",
    the_ai_labels_every: "Die KI kennzeichnet jeden Schlag im Video",
    speed: "Schnelligkeit",
    ball_and_racket_stroke: "Ball und Schläger, Schlag für Schlag",
    match_and_highlights: "Spiel und Highlights",
    automatic_stats_and_key: "Automatische Statistiken und Schlüsselmomente",
  },
  es: {
    computer_vision_on_your: "Visión artificial en tus vídeos",
    video_lab: "Video Lab",
    k104_km_h: "104 km/h",
    ball_tracking: "Seguimiento de bola",
    trajectory_bounces_and_court: "Trayectoria, botes y minimapa de la pista",
    heatmap: "Heatmap",
    where_the_ball_bounces: "Dónde bota la bola y dónde se mueve el jugador",
    side_by_side_comparison: "Comparación lado a lado",
    student_vs_model_before: "Alumno vs modelo, antes vs después, superpuestos",
    draw_and_measure: "Dibuja y mide",
    angles_lines_stopwatch_frame: "Ángulos, líneas, cronómetro, frame a frame",
    recognized_strokes: "Golpes reconocidos",
    the_ai_labels_every: "La IA etiqueta cada golpe del vídeo",
    speed: "Velocidad",
    ball_and_racket_stroke: "Bola y raqueta, golpe a golpe",
    match_and_highlights: "Partido y highlights",
    automatic_stats_and_key: "Estadísticas y momentos clave automáticos",
  },
};

export function VideoLab() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={`${s.scr} ${s.e1}`}>
        <div>
          <div className={s.kick}>
            {t.computer_vision_on_your}
          </div>
          <h1 className={s.big}>
            {t.video_lab}
          </h1>
        </div>
        <div className={`lawn ${s.lawn} ${s.e2}`}>
          <svg className={s.e3} width="357" height="120" viewBox="0 0 357 120" aria-hidden="true">
            <path d="M20 100 Q 150 -10 300 70" fill="none" stroke="#D8F34A" strokeWidth="3" strokeDasharray="6 5" />
            <circle cx="300" cy="70" r="8" fill="#D8F34A" />
            <circle cx="160" cy="34" r="4" fill="#fff" />
            <circle cx="230" cy="40" r="4" fill="#fff" />
            <rect x="250" y="12" width="92" height="24" rx="8" fill="#0B0B0C" opacity=".85" />
            <text x="296" y="29" textAnchor="middle" fontSize="13" fontWeight="800" fill="#D8F34A" fontFamily="system-ui">
              {t.k104_km_h}
            </text>
          </svg>
        </div>
        <Link href={ROTTE.BallTracking} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1.5" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.ball_tracking}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.trajectory_bounces_and_court}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href={ROTTE.Heatmap} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l9 5-9 5-9-5z" />
              <path d="M3 13l9 5 9-5" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.heatmap}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.where_the_ball_bounces}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href={ROTTE.Confronto} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5" />
              <path d="M16 4.5a3.5 3.5 0 010 7M18 15c2 .6 3.2 2.2 3.5 5" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.side_by_side_comparison}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.student_vs_model_before}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href={ROTTE.Strumenti} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.draw_and_measure}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.angles_lines_stopwatch_frame}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href={ROTTE.TimelineColpi} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.recognized_strokes}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.the_ai_labels_every}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href={ROTTE.Velocita} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13 2L5 13h6l-1 9 8-11h-6z" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.speed}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.ball_and_racket_stroke}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <Link href={ROTTE.PartitaLive} className={s.li}>
          <span className={s.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.match_and_highlights}
            </span>
            <span className={`${s.s} ${s.e4}`}>
              {t.automatic_stats_and_key}
            </span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
      </div>
    </Schermo>
  );
}
