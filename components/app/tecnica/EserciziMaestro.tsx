"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./EserciziMaestro.module.css";

const T = {
  "it": {
    "back": "Indietro",
    "c_serve": "C · Servizio",
    "drills_for_the_coach": "Esercizi per il maestro",
    "toss_into_the_circle": "Lancio nel cerchio",
    "racket_on_the_ground_the_t": "Racchetta a terra: il lancio ricade sulle corde senza muovere i piedi.",
    "n_10_toss_reps": "10 lanci rip.",
    "n_3_sets": "3 serie",
    "n_6_8_sess": "6-8 sess.",
    "overhead_throw": "Lancio sopra la testa",
    "throw_a_ball_over_the_net_": "Lanciare una palla oltre la rete con il gesto del servizio.",
    "n_8_throw_reps": "8 lanci rip.",
    "n_6_sess": "6 sess.",
    "kneeling_serve": "Servizio in ginocchio",
    "from_the_service_line_isol": "Dalla linea di servizio, isola tronco e pronazione.",
    "n_10_reps": "10 rip.",
    "n_4_6_sess": "4-6 sess.",
    "trophy_pause": "Pausa in trophy",
    "hold_the_trophy_1_second_t": "1 secondo fermo in trophy: il maestro controlla gomito e ginocchia.",
    "n_8_reps": "8 rip.",
    "n_4_sets": "4 serie",
    "kick_over_the_second_net": "Kick sopra la \"seconda rete\"",
    "from_u14": "Da U14",
    "rope_1_m_above_the_net_the": "Corda 1 m sopra la rete, la palla deve superarla.",
    "n_8_sess": "8 sess."
  },
  "en": {
    "back": "Back",
    "c_serve": "C · Serve",
    "drills_for_the_coach": "Drills for the coach",
    "toss_into_the_circle": "Toss into the circle",
    "racket_on_the_ground_the_t": "Racket on the ground: the toss lands on the strings without moving the feet.",
    "n_10_toss_reps": "10 toss reps",
    "n_3_sets": "3 sets",
    "n_6_8_sess": "6-8 sess.",
    "overhead_throw": "Overhead throw",
    "throw_a_ball_over_the_net_": "Throw a ball over the net with the serve motion.",
    "n_8_throw_reps": "8 throw reps",
    "n_6_sess": "6 sess.",
    "kneeling_serve": "Kneeling serve",
    "from_the_service_line_isol": "From the service line, isolates trunk and pronation.",
    "n_10_reps": "10 reps",
    "n_4_6_sess": "4-6 sess.",
    "trophy_pause": "Trophy pause",
    "hold_the_trophy_1_second_t": "Hold the trophy 1 second: the coach checks elbow and knees.",
    "n_8_reps": "8 reps",
    "n_4_sets": "4 sets",
    "kick_over_the_second_net": "Kick over the \"second net\"",
    "from_u14": "From U14",
    "rope_1_m_above_the_net_the": "Rope 1 m above the net, the ball must clear it.",
    "n_8_sess": "8 sess."
  },
  "fr": {
    "back": "Retour",
    "c_serve": "C · Service",
    "drills_for_the_coach": "Exercices pour l'entraîneur",
    "toss_into_the_circle": "Lancer dans le cercle",
    "racket_on_the_ground_the_t": "Raquette au sol : le lancer retombe sur le cordage sans bouger les pieds.",
    "n_10_toss_reps": "10 lancers rép.",
    "n_3_sets": "3 séries",
    "n_6_8_sess": "6-8 séances",
    "overhead_throw": "Lancer au-dessus de la tête",
    "throw_a_ball_over_the_net_": "Lancer une balle par-dessus le filet avec le geste du service.",
    "n_8_throw_reps": "8 lancers rép.",
    "n_6_sess": "6 séances",
    "kneeling_serve": "Service à genoux",
    "from_the_service_line_isol": "Depuis la ligne de service, isole le tronc et la pronation.",
    "n_10_reps": "10 rép.",
    "n_4_6_sess": "4-6 séances",
    "trophy_pause": "Pause en trophy",
    "hold_the_trophy_1_second_t": "1 seconde immobile en trophy : l'entraîneur contrôle coude et genoux.",
    "n_8_reps": "8 rép.",
    "n_4_sets": "4 séries",
    "kick_over_the_second_net": "Kick au-dessus du \"second filet\"",
    "from_u14": "Dès U14",
    "rope_1_m_above_the_net_the": "Corde 1 m au-dessus du filet, la balle doit la passer.",
    "n_8_sess": "8 séances"
  },
  "de": {
    "back": "Zurück",
    "c_serve": "C · Aufschlag",
    "drills_for_the_coach": "Übungen für den Trainer",
    "toss_into_the_circle": "Ballwurf in den Kreis",
    "racket_on_the_ground_the_t": "Schläger auf dem Boden: Der Wurf fällt auf die Saiten, ohne die Füße zu bewegen.",
    "n_10_toss_reps": "10 Würfe Wdh.",
    "n_3_sets": "3 Serien",
    "n_6_8_sess": "6-8 Einh.",
    "overhead_throw": "Überkopfwurf",
    "throw_a_ball_over_the_net_": "Einen Ball mit der Aufschlagbewegung über das Netz werfen.",
    "n_8_throw_reps": "8 Würfe Wdh.",
    "n_6_sess": "6 Einh.",
    "kneeling_serve": "Aufschlag im Kniestand",
    "from_the_service_line_isol": "Von der Aufschlaglinie aus: isoliert Rumpf und Pronation.",
    "n_10_reps": "10 Wdh.",
    "n_4_6_sess": "4-6 Einh.",
    "trophy_pause": "Pause in Trophy-Position",
    "hold_the_trophy_1_second_t": "1 Sekunde still in Trophy-Position: Der Trainer kontrolliert Ellbogen und Knie.",
    "n_8_reps": "8 Wdh.",
    "n_4_sets": "4 Serien",
    "kick_over_the_second_net": "Kick über das „zweite Netz“",
    "from_u14": "Ab U14",
    "rope_1_m_above_the_net_the": "Seil 1 m über dem Netz, der Ball muss darüber fliegen.",
    "n_8_sess": "8 Einh."
  },
  "es": {
    "back": "Atrás",
    "c_serve": "C · Saque",
    "drills_for_the_coach": "Ejercicios para el entrenador",
    "toss_into_the_circle": "Lanzamiento en el círculo",
    "racket_on_the_ground_the_t": "Raqueta en el suelo: el lanzamiento cae sobre el cordaje sin mover los pies.",
    "n_10_toss_reps": "10 lanzam. rep.",
    "n_3_sets": "3 series",
    "n_6_8_sess": "6-8 ses.",
    "overhead_throw": "Lanzamiento por encima de la cabeza",
    "throw_a_ball_over_the_net_": "Lanzar una bola por encima de la red con el gesto del saque.",
    "n_8_throw_reps": "8 lanzam. rep.",
    "n_6_sess": "6 ses.",
    "kneeling_serve": "Saque de rodillas",
    "from_the_service_line_isol": "Desde la línea de saque, aísla tronco y pronación.",
    "n_10_reps": "10 rep.",
    "n_4_6_sess": "4-6 ses.",
    "trophy_pause": "Pausa en trophy",
    "hold_the_trophy_1_second_t": "1 segundo quieto en trophy: el entrenador revisa codo y rodillas.",
    "n_8_reps": "8 rep.",
    "n_4_sets": "4 series",
    "kick_over_the_second_net": "Kick sobre la \"segunda red\"",
    "from_u14": "Desde U14",
    "rope_1_m_above_the_net_the": "Cuerda 1 m sobre la red, la bola debe superarla.",
    "n_8_sess": "8 ses."
  }
};

export function EserciziMaestro() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.ErroreDettaglio} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.c_serve}</div><h1 className={s.h1}>{t.drills_for_the_coach}</h1></div></header><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontWeight: "800", fontSize: "15px" }} className={s.grow}>{t.toss_into_the_circle}</span></div><div className={"muted"} style={{ fontSize: "12.5px", lineHeight: "1.35" }}>{t.racket_on_the_ground_the_t}</div><div className={s.g4}><span className={s.tag} style={{ textAlign: "center" }}>{t.n_10_toss_reps}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_3_sets}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_6_8_sess}</span><span className={s.tag} style={{ textAlign: "center", color: "#D8F34A" }}>8'</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontWeight: "800", fontSize: "15px" }} className={s.grow}>{t.overhead_throw}</span></div><div className={"muted"} style={{ fontSize: "12.5px", lineHeight: "1.35" }}>{t.throw_a_ball_over_the_net_}</div><div className={s.g4}><span className={s.tag} style={{ textAlign: "center" }}>{t.n_8_throw_reps}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_3_sets}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_6_sess}</span><span className={s.tag} style={{ textAlign: "center", color: "#D8F34A" }}>8'</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontWeight: "800", fontSize: "15px" }} className={s.grow}>{t.kneeling_serve}</span></div><div className={"muted"} style={{ fontSize: "12.5px", lineHeight: "1.35" }}>{t.from_the_service_line_isol}</div><div className={s.g4}><span className={s.tag} style={{ textAlign: "center" }}>{t.n_10_reps}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_3_sets}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_4_6_sess}</span><span className={s.tag} style={{ textAlign: "center", color: "#D8F34A" }}>10'</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontWeight: "800", fontSize: "15px" }} className={s.grow}>{t.trophy_pause}</span></div><div className={"muted"} style={{ fontSize: "12.5px", lineHeight: "1.35" }}>{t.hold_the_trophy_1_second_t}</div><div className={s.g4}><span className={s.tag} style={{ textAlign: "center" }}>{t.n_8_reps}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_4_sets}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_6_sess}</span><span className={s.tag} style={{ textAlign: "center", color: "#D8F34A" }}>12'</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontWeight: "800", fontSize: "15px" }} className={s.grow}>{t.kick_over_the_second_net}</span><span className={s.tag} style={{ background: "#2E2410", color: "#FFB547" }}>{t.from_u14}</span></div><div className={"muted"} style={{ fontSize: "12.5px", lineHeight: "1.35" }}>{t.rope_1_m_above_the_net_the}</div><div className={s.g4}><span className={s.tag} style={{ textAlign: "center" }}>{t.n_10_reps}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_4_sets}</span><span className={s.tag} style={{ textAlign: "center" }}>{t.n_8_sess}</span><span className={s.tag} style={{ textAlign: "center", color: "#D8F34A" }}>15'</span></div></div></div>
      </div>
    </Schermo>
  );
}
