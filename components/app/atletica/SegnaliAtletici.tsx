"use client";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Dallo stesso video del servizio", titolo: "Segnali da approfondire", nota: "Non è una diagnosi medica: segnali per maestro e preparatore, con percorsi dalla libreria atletica." },
  en: { kick: "From the same serve video", titolo: "Signals to look into", nota: "Not a medical diagnosis: signals for coach and trainer, with programs from the fitness library." },
};
// Dati dimostrativi: [titolo, rilevato da, percorso consigliato, colore gravità]
const SEGNALI = {
  it: [
    ["Ginocchia verso l'interno", "valgismo in atterraggio", "Stabilità anca e gluteo", "#FF5A5F"],
    ["Split-step in ritardo", "sincronia salto e colpo", "Reattività e scaletta", "#FF9F43"],
    ["Spinta gambe ridotta", "flessione ginocchio nel servizio", "Spinta gambe, pliometria", "#FF9F43"],
    ["Base d'appoggio stretta", "distanza piedi / altezza", "Equilibrio dinamico, affondi", "#FFD54A"],
    ["Busto inclinato, spalle chiuse", "angolo del tronco in attesa", "Mobilità toracica e core", "#FFD54A"],
    ["Recupero lento al centro", "passi dopo il colpo", "Passi incrociati, agilità", "#4CD07D"],
  ],
  en: [
    ["Knees caving in", "valgus on landing", "Hip and glute stability", "#FF5A5F"],
    ["Late split step", "jump and stroke timing", "Reactivity and ladder", "#FF9F43"],
    ["Reduced leg drive", "knee bend on serve", "Leg drive, plyometrics", "#FF9F43"],
    ["Narrow base of support", "feet distance / height", "Dynamic balance, lunges", "#FFD54A"],
    ["Torso tilted, shoulders closed", "trunk angle at ready", "Thoracic mobility and core", "#FFD54A"],
    ["Slow recovery to the middle", "steps after the shot", "Crossover steps, agility", "#4CD07D"],
  ],
};
const DA = { it: "Rilevato da", en: "Detected from" };

export function SegnaliAtletici() {
  const t = useT(T);
  const { lang } = useLang();
  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.stretto}`} style={{ gap: 10 }}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.AnalisiAtletica} />
        <div className={s.note} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 1 }}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
          <span>{t.nota}</span>
        </div>
        {SEGNALI[lang].map(([tit, da, perc, col]) => (
          <div key={tit} className={`${s.li} ${s.segn}`}>
            <span className={s.dot} style={{ background: col }} />
            <span className={s.grow}>
              <span className={s.t}>{tit}</span>
              <span className={`${s.s} ${s.blk}`}>{DA[lang]}: {da}</span>
              <span className={`${s.link} ${s.blk}`}>→ {perc}</span>
            </span>
          </div>
        ))}
      </div>
    </Schermo>
  );
}
