"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { useProfilo } from "@/lib/useProfilo";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Bersaglio, Play, Stella, Testata } from "./comuni";
import c from "./comune.module.css";
import s from "./FeedbackBambino.module.css";

const T = {
  it: {
    kick: "Coach AI per", titolo: "Il tuo lancio", bravo: "Bravissimo!", msg: "Il tuo lancio sale sempre più dritto. Ancora un pochino e diventa perfetto.",
    oggi: "IL TUO OBIETTIVO DI OGGI", obiettivo: "Fai cadere la palla dentro il cerchio, senza muovere i piedi", lanci: "7 lanci su 10 dentro il cerchio",
    campione: "Guarda come fa il campione · 20 s", sfida: "Accetta la sfida", nomeDemo: "Matteo", stelle: "2 stelle su 3",
  },
  en: {
    kick: "Coach AI for", titolo: "Your toss", bravo: "Awesome!", msg: "Your toss goes up straighter and straighter. Just a little more and it's perfect.",
    oggi: "YOUR GOAL FOR TODAY", obiettivo: "Drop the ball inside the circle without moving your feet", lanci: "7 tosses out of 10 in the circle",
    campione: "Watch how the champion does it · 20 s", sfida: "Accept the challenge", nomeDemo: "Matteo", stelle: "2 stars out of 3",
  },
  fr: {
    kick: "Coach IA pour", titolo: "Ton lancer", bravo: "Bravo !", msg: "Ton lancer monte de plus en plus droit. Encore un petit effort et il sera parfait.",
    oggi: "TON OBJECTIF DU JOUR", obiettivo: "Fais tomber la balle dans le cercle, sans bouger les pieds", lanci: "7 lancers sur 10 dans le cercle",
    campione: "Regarde le champion · 20 s", sfida: "Relever le défi", nomeDemo: "Matteo", stelle: "2 étoiles sur 3",
  },
  de: {
    kick: "Coach AI für", titolo: "Dein Wurf", bravo: "Super gemacht!", msg: "Dein Wurf geht immer gerader nach oben. Noch ein bisschen, und er ist perfekt.",
    oggi: "DEIN ZIEL FÜR HEUTE", obiettivo: "Lass den Ball im Kreis landen, ohne die Füße zu bewegen", lanci: "7 von 10 Würfen im Kreis",
    campione: "Schau, wie der Profi es macht · 20 s", sfida: "Nimm die Herausforderung an", nomeDemo: "Matteo", stelle: "2 von 3 Sternen",
  },
  es: {
    kick: "Coach AI para", titolo: "Tu lanzamiento", bravo: "¡Muy bien!", msg: "Tu lanzamiento sube cada vez más recto. Un poquito más y será perfecto.",
    oggi: "TU OBJETIVO DE HOY", obiettivo: "Haz caer la bola dentro del círculo, sin mover los pies", lanci: "7 lanzamientos de 10 dentro del círculo",
    campione: "Mira cómo lo hace el campeón · 20 s", sfida: "Acepta el reto", nomeDemo: "Matteo", stelle: "2 estrellas de 3",
  },
};

/** 22 · Feedback Modalità Bambino. Dati dimostrativi. */
export default function FeedbackBambino() {
  const t = useT(T);
  const { profilo } = useProfilo();
  return (
    <Schermo tab="coach">
      <div className={c.col}>
        <Testata indietro={ROTTE.HomeAllievo} kick={`${t.kick} ${profilo?.nome || t.nomeDemo}`} titolo={t.titolo} />
        <div className={s.eroe}>
          <div className={s.stelle} role="img" aria-label={t.stelle}><Stella size={34} piena /><Stella size={34} piena /><Stella size={34} /></div>
          <div className={s.brav}>{t.bravo}</div>
          <div className={s.msg}>{t.msg}</div>
        </div>
        <div className={c.k}>{t.oggi}</div>
        <div className={`card ${s.obiettivo}`}>
          <span className={c.ic} style={{ width: 48, height: 48, background: "#3D8BFF", color: "#fff" }}><Bersaglio size={24} /></span>
          <b>{t.obiettivo}</b>
        </div>
        <div className={s.lanci} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={i < 7 ? s.fatto : undefined} />)}
        </div>
        <div className={s.conteggio}>{t.lanci}</div>
        <Link href={ROTTE.TecnicaColpo} className={`lawn ${c.lawnLink}`}>
          <span className={c.playTondo}><Play /></span>
          <span style={{ fontWeight: 800 }}>{t.campione}</span>
        </Link>
        <Link href={ROTTE.SessioneAtletica} className="btn">{t.sfida}</Link>
      </div>
    </Schermo>
  );
}
