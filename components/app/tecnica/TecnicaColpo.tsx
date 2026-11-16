"use client";
import Link from "next/link";
import { useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./TecnicaColpo.module.css";
import { SVG } from "./TecnicaColpo.svg";
import { VideoErroriCorrezioni } from "./VideoErroriCorrezioni";

const T = {
  "it": {
    "back": "Indietro",
    "play_video": "Riproduci video",
    "forehand": "Diritto",
    "direction": "Direzione",
    "dritto": "Dritto", "incrociato": "Incrociato", "lungolinea": "Lungolinea", "errore": "Errore", "corretto": "Corretto", "esercizio": "Esercizio",
    "error_and_reasons": "ERRORE E MOTIVAZIONI",
    "late_preparation_the_racke": "Preparazione tardiva: la racchetta arriva dietro quando la palla ha già rimbalzato, l'impatto avviene dietro l'anca.",
    "what_it_does_to_the_ball_a": "COSA PRODUCE SULLA PALLA E VERSO L'AVVERSARIO",
    "short_ball_with_no_angle_t": "Palla corta e senza angolo: l'avversario entra e attacca.",
    "why_fix_it": "PERCHÉ CORREGGERLO",
    "direction_control_is_lost_": "Si perde controllo della direzione e il colpo diventa difensivo.",
    "movement_and_reasons": "MOVIMENTO E MOTIVAZIONI",
    "shoulders_turned_on_the_fi": "Spalle girate al primo passo, racchetta alta, impatto davanti al piede sinistro con il peso in avanti.",
    "deep_angled_crosscourt_bal": "Palla profonda e angolata incrociata, l'avversario è spinto fuori dal campo.",
    "why_change": "PERCHÉ CAMBIARE",
    "more_time_to_choose_direct": "Più tempo per scegliere la direzione e più velocità senza sforzo.",
    "how_to_fix_it": "COME MODIFICARLO",
    "the_coach_hand_feeds_the_s": "Il maestro lancia a mano, l'allievo prepara al \"via\" e colpisce davanti a un cono.",
    "which_drills_to_do": "CHE ESERCIZI FARE",
    "early_contact_from_standst": "Colpo da fermo in anticipo · cesto incrociato · palleggio a ritmo.",
    "reps": "ripetizioni",
    "sessions": "sessioni",
    "time": "tempo"
  },
  "en": {
    "back": "Back",
    "play_video": "Play video",
    "forehand": "Forehand",
    "direction": "Direction",
    "dritto": "Straight", "incrociato": "Crosscourt", "lungolinea": "Down the line", "errore": "Error", "corretto": "Correct", "esercizio": "Drill",
    "error_and_reasons": "ERROR AND REASONS",
    "late_preparation_the_racke": "Late preparation: the racket gets back when the ball has already bounced, contact happens behind the hip.",
    "what_it_does_to_the_ball_a": "WHAT IT DOES TO THE BALL AND OPPONENT",
    "short_ball_with_no_angle_t": "Short ball with no angle: the opponent moves in and attacks.",
    "why_fix_it": "WHY FIX IT",
    "direction_control_is_lost_": "Direction control is lost and the shot becomes defensive.",
    "movement_and_reasons": "MOVEMENT AND REASONS",
    "shoulders_turned_on_the_fi": "Shoulders turned on the first step, racket high, contact in front of the left foot with weight forward.",
    "deep_angled_crosscourt_bal": "Deep, angled crosscourt ball, the opponent is pushed off the court.",
    "why_change": "WHY CHANGE",
    "more_time_to_choose_direct": "More time to choose direction and more speed with less effort.",
    "how_to_fix_it": "HOW TO FIX IT",
    "the_coach_hand_feeds_the_s": "The coach hand-feeds, the student prepares on \"go\" and hits in front of a cone.",
    "which_drills_to_do": "WHICH DRILLS TO DO",
    "early_contact_from_standst": "Early contact from standstill · crosscourt basket feed · rhythm rally.",
    "reps": "reps",
    "sessions": "sessions",
    "time": "time"
  }
};

type Dir = "dritto" | "incrociato" | "lungolinea";
const DIREZIONI: Dir[] = ["dritto", "incrociato", "lungolinea"];
const CATEGORIE = [
  { k: "A", nome: "errore", colore: "#FF8A6B" },
  { k: "B", nome: "corretto", colore: "#D8F34A" },
  { k: "C", nome: "esercizio", colore: "#7FD3FF" },
] as const;

export function TecnicaColpo() {
  const t = useT(T);
  // come nel disegno: direzione (incrociato) e categoria (A errore) di partenza
  const [dir, setDir] = useState<Dir>("incrociato");
  const [cat, setCat] = useState<"A" | "B" | "C">("A");
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.hero} style={{ background: "radial-gradient(ellipse at 50% 28%,#12352A 0%,#07140F 55%,#030504 100%)" }}><svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 393 250" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><div className={s.eroe}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><button type="button" className={s.icon} aria-label={t.play_video} onClick={() => document.getElementById("video-colpo")?.scrollIntoView({ behavior: "smooth" })}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></button></div><h1 className={["disp", s.titolo].join(" ")}>{t.forehand}</h1></div>
        <div className={s.corpo}>
          <div className={s.seg} role="group" aria-label={t.direction}>{DIREZIONI.map((d) => (<button key={d} type="button" className={d === dir ? [s.sg, s.on].join(" ") : s.sg} aria-pressed={d === dir} onClick={() => setDir(d)}>{t[d]}</button>))}</div><div className={s.tabs}>{CATEGORIE.map((c) => (<button key={c.k} type="button" className={c.k === cat ? [s.tb, s.on].join(" ") : s.tb} style={{ ["--c" as string]: c.colore }} aria-pressed={c.k === cat} onClick={() => setCat(c.k)}><b>{c.k}</b><span>{t[c.nome]}</span></button>))}</div>{cat === "A" && (<><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}><div className={s.fld}><span className={s.k}>{t.error_and_reasons}</span><span className={s.v}>{t.late_preparation_the_racke}</span></div><div className={s.fld}><span className={s.k}>{t.what_it_does_to_the_ball_a}</span><span className={s.v}>{t.short_ball_with_no_angle_t}</span></div><div className={s.fld}><span className={s.k}>{t.why_fix_it}</span><span className={s.v}>{t.direction_control_is_lost_}</span></div></div></>)}{cat === "B" && (<><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}><div className={s.fld}><span className={s.k}>{t.movement_and_reasons}</span><span className={s.v}>{t.shoulders_turned_on_the_fi}</span></div><div className={s.fld}><span className={s.k}>{t.what_it_does_to_the_ball_a}</span><span className={s.v}>{t.deep_angled_crosscourt_bal}</span></div><div className={s.fld}><span className={s.k}>{t.why_change}</span><span className={s.v}>{t.more_time_to_choose_direct}</span></div></div></>)}{cat === "C" && (<><div style={{ display: "flex", flexDirection: "column", gap: "12px" }}><div className={s.fld}><span className={s.k}>{t.how_to_fix_it}</span><span className={s.v}>{t.the_coach_hand_feeds_the_s}</span></div><div className={s.fld}><span className={s.k}>{t.which_drills_to_do}</span><span className={s.v}>{t.early_contact_from_standst}</span></div><div style={{ display: "flex", gap: "8px" }}><div className={s.stat}><b>3×12</b><span>{t.reps}</span></div><div className={s.stat}><b>6</b><span>{t.sessions}</span></div><div className={s.stat}><b>15'</b><span>{t.time}</span></div></div></div></>)}
          <div id="video-colpo"><VideoErroriCorrezioni colpo="diritto" /></div>
        </div>
      </div>
    </Schermo>
  );
}
