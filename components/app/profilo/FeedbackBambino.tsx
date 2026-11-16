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
