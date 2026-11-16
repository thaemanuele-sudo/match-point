"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    instructCoachAi: "Istruisci il Coach AI",
    coachRules: "Regole del maestro",
    maxRiskByAge: "RISCHIO MASSIMO PER ETÀ",
    noDropShotsUnder: "Niente palla corta sotto pressione",
    recommendedForUnder12: "Consigliato in Under 12",
    max1NewStrategy: "Massimo 1 strategia nuova per partita",
    reducesOnCourtDecisions: "Riduce le decisioni in campo",
    servePriority: "Priorità al servizio",
    otherwiseReturn: "Altrimenti alla risposta",
    favoriteStrategies: "STRATEGIE PREFERITE",
    s8NotAllowed: "S8 vietata",
    saveRules: "Salva regole",
    basso: "Basso",
    medio: "Medio",
    alto: "Alto",
    rischio: "Rischio massimo",
  },
  en: {
    back: "Back",
    instructCoachAi: "Instruct Coach AI",
    coachRules: "Coach rules",
    maxRiskByAge: "MAX RISK BY AGE",
    noDropShotsUnder: "No drop shots under pressure",
    recommendedForUnder12: "Recommended for Under 12",
    max1NewStrategy: "Max 1 new strategy per match",
    reducesOnCourtDecisions: "Reduces on-court decisions",
    servePriority: "Serve priority",
    otherwiseReturn: "Otherwise return",
    favoriteStrategies: "FAVORITE STRATEGIES",
    s8NotAllowed: "S8 not allowed",
    saveRules: "Save rules",
    basso: "Low",
    medio: "Medium",
    alto: "High",
    rischio: "Maximum risk",
  },
};

const RISCHI = ["basso", "medio", "alto"] as const;
const PREFERITE = ["S1", "S2", "S9", "S3"];
const CHIAVE = "mp-regole-maestro";

export function RegoleMaestro() {
  const t = useT(T);
  const router = useRouter();
  const [rischio, setRischio] = useState<(typeof RISCHI)[number]>("medio");
  const [noPalla, setNoPalla] = useState(true);
  const [unaNuova, setUnaNuova] = useState(true);
  const [servizio, setServizio] = useState(false);
  const [pref, setPref] = useState<string[]>(["S1", "S2", "S9"]);
  const alterna = (s: string) => setPref((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  // le regole restano sul dispositivo (dimostrativo: l'AI le leggerà quando sarà collegata)
  const salva = () => {
    try { localStorage.setItem(CHIAVE, JSON.stringify({ rischio, noPalla, unaNuova, servizio, pref })); } catch { /* storage non disponibile */ }
    router.push(ROTTE.Combinazioni);
  };
  return (
    <Schermo tab="tattica">
      <div className={K.scr} style={{ gap: 10 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.Combinazioni} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.instructCoachAi}</div>
            <h1 className={K.h1}>{t.coachRules}</h1>
          </div>
        </header>
        <div className={K.k} id="rischio-lbl">{t.maxRiskByAge}</div>
        <div className={K.seg} role="group" aria-labelledby="rischio-lbl" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {RISCHI.map((r) => (
            <button key={r} type="button" className={r === rischio ? `${K.sg} ${K.on}` : K.sg} aria-pressed={r === rischio} onClick={() => setRischio(r)}>{t[r]}</button>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "16px", background: "#161618" }}>
          <span className={K.grow}>
            <span style={{ display: "block", fontWeight: "700", fontSize: "14.5px" }}>{t.noDropShotsUnder}</span>
            <span className={K.muted} style={{ fontSize: "12.5px" }}>{t.recommendedForUnder12}</span>
          </span>
          <input type="checkbox" checked={noPalla} onChange={(e) => setNoPalla(e.target.checked)} style={{ width: "22px", height: "22px", accentColor: "#D8F34A", flex: "none" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "16px", background: "#161618" }}>
          <span className={K.grow}>
            <span style={{ display: "block", fontWeight: "700", fontSize: "14.5px" }}>{t.max1NewStrategy}</span>
            <span className={K.muted} style={{ fontSize: "12.5px" }}>{t.reducesOnCourtDecisions}</span>
          </span>
          <input type="checkbox" checked={unaNuova} onChange={(e) => setUnaNuova(e.target.checked)} style={{ width: "22px", height: "22px", accentColor: "#D8F34A", flex: "none" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "16px", background: "#161618" }}>
          <span className={K.grow}>
            <span style={{ display: "block", fontWeight: "700", fontSize: "14.5px" }}>{t.servePriority}</span>
            <span className={K.muted} style={{ fontSize: "12.5px" }}>{t.otherwiseReturn}</span>
          </span>
          <input type="checkbox" checked={servizio} onChange={(e) => setServizio(e.target.checked)} style={{ width: "22px", height: "22px", accentColor: "#D8F34A", flex: "none" }} />
        </label>
        <div className={K.k}>{t.favoriteStrategies}</div>
        <div className={K.chips}>
          {PREFERITE.map((c) => (
            <button key={c} type="button" className={pref.includes(c) ? `${K.chip} ${K.on}` : K.chip} aria-pressed={pref.includes(c)} onClick={() => alterna(c)}>{c}</button>
          ))}
          <span className={K.chip} style={{ textDecoration: "line-through", opacity: ".6" }}>{t.s8NotAllowed}</span>
        </div>
        <div style={{ flex: "1" }}></div>
        <button type="button" className={K.btn} onClick={salva}>{t.saveRules}</button>
      </div>
    </Schermo>
  );
}
