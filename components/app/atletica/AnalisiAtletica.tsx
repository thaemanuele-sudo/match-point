"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { FIGURA_ANALISI } from "./figure";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Coach AI · dal video del diritto", titolo: "Analisi atletica", scheda: "Scheda proposta", fascia: "Under 12", sess: "sessioni a settimana", sett: "settimane", per: "per sessione", assegna: "Assegna a Tommaso" },
  en: { kick: "Coach AI · from the forehand video", titolo: "Fitness analysis", scheda: "Proposed plan", fascia: "Under 12", sess: "sessions per week", sett: "weeks", per: "per session", assegna: "Assign to Tommaso" },
};
// Dati dimostrativi: a regime arrivano dall'analisi AI del video.
const SEGNALI = {
  it: ["Spinta gambe debole", "Split step in ritardo", "Busto poco ruotato", "Postura corretta", "Equilibrio buono"],
  en: ["Weak leg drive", "Late split step", "Limited torso rotation", "Correct posture", "Good balance"],
};
const COLORI = ["#F0454A", "#F0454A", "#FFC44D", "#D8F34A", "#D8F34A"];
const ESERCIZI = {
  it: [["Salti a ostacolini", "Spinta gambe", "3×10"], ["Split step al segnale", "Reattività", "4×8"], ["Rotazioni con palla medica", "Busto e core", "3×12"]],
  en: [["Mini-hurdle jumps", "Leg drive", "3×10"], ["Split step on signal", "Reactivity", "4×8"], ["Medicine ball rotations", "Torso and core", "3×12"]],
};

export function AnalisiAtletica() {
  const t = useT(T);
  const { lang } = useLang();
  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.largo}`}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.ChatAI} />
        <div style={{ display: "flex", gap: 14 }}>
          <div className={`${s.figBox} ${s.lab}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: FIGURA_ANALISI }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "4px 0" }}>
            {SEGNALI[lang].map((x, i) => (
              <div key={x} className={s.f}><span className={s.st} style={{ background: COLORI[i] }} />{x}</div>
            ))}
          </div>
        </div>
        <div className={s.sec}><h2 className={s.h2}>{t.scheda}</h2><span className={s.muted} style={{ fontSize: 13, fontWeight: 600 }}>{t.fascia}</span></div>
        <div className={s.g3} style={{ gap: 10 }}>
          <div className={s.tileA}><b>3</b><span>{t.sess}</span></div>
          <div className={s.tileA}><b>4</b><span>{t.sett}</span></div>
          <div className={s.tileA}><b>35&apos;</b><span>{t.per}</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ESERCIZI[lang].map(([n, d, r], i, a) => (
            <div key={n} className={i === a.length - 1 ? `${s.ex} ${s.ultimo}` : s.ex}>
              <span className={`${s.disp} ${s.exN}`}>{i + 1}</span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{n}</div><div className={s.muted} style={{ fontSize: 13 }}>{d}</div></div>
              <span className={`${s.disp} ${s.exR}`}>{r}</span>
            </div>
          ))}
        </div>
        <Link href={ROTTE.Atletica} className={s.btnLink}>{t.assegna}</Link>
      </div>
    </Schermo>
  );
}
