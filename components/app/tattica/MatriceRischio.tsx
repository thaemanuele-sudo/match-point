"use client";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    aiCombinations34: "Combinazioni AI · 3.4",
    scoreRisk: "Punteggio × rischio",
    score: "PUNTEGGIO",
    risk: "RISCHIO",
    combination: "COMBINAZIONE",
    low: "Basso",
    s2OrS5On: "S2 o S5 al servizio; S1 in risposta",
    t3030Deuce: "30/30, parità",
    medium: "Medio",
    s9OnReturnS2: "S9 in risposta; S2 con prima carica",
    t3040OnServe: "30/40 al servizio",
    high: "Alto",
    firstServeToThe: "Prima al corpo o al rovescio, poi S1",
    t4030OnServe: "40/30 al servizio",
    mediumLow: "Medio-basso",
    s5Serve1Or: "S5 servizio + 1, oppure S6",
    t1540BreakPoint: "15/40 palla break",
    s9DeepReturnS8: "S9 risposta profonda, S8 sulla seconda",
    t45ToStay: "4/5 per restare nel set",
    s2AndS9No: "S2 e S9, niente palle corte",
    t54ForThe: "5/4 per il set",
    s5OnOddPoints: "S5 sui punti dispari, S3 per comandare",
    tiebreak66: "Tie-break 6/6",
    bigFirstServeCrosscourt: "Prima carica + diagonale; S9",
    riskCombinesPointImportance: "Il rischio combina importanza del punto, stato fisico, percentuali dell'allievo e profilo dell'avversario.",
  },
  en: {
    back: "Back",
    aiCombinations34: "AI combinations · 3.4",
    scoreRisk: "Score × risk",
    score: "SCORE",
    risk: "RISK",
    combination: "COMBINATION",
    low: "Low",
    s2OrS5On: "S2 or S5 on serve; S1 on return",
    t3030Deuce: "30/30, deuce",
    medium: "Medium",
    s9OnReturnS2: "S9 on return; S2 with a big first serve",
    t3040OnServe: "30/40 on serve",
    high: "High",
    firstServeToThe: "First serve to the body or backhand, then S1",
    t4030OnServe: "40/30 on serve",
    mediumLow: "Medium-low",
    s5Serve1Or: "S5 serve + 1, or S6",
    t1540BreakPoint: "15/40 break point",
    s9DeepReturnS8: "S9 deep return, S8 on the second serve",
    t45ToStay: "4/5 to stay in the set",
    s2AndS9No: "S2 and S9, no drop shots",
    t54ForThe: "5/4 for the set",
    s5OnOddPoints: "S5 on odd points, S3 to dictate",
    tiebreak66: "Tiebreak 6/6",
    bigFirstServeCrosscourt: "Big first serve + crosscourt; S9",
    riskCombinesPointImportance: "Risk combines point importance, physical state, the student's percentages and the opponent's profile.",
  },
};

export function MatriceRischio() {
  const t = useT(T);
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
            <div className={K.kick}>{t.aiCombinations34}</div>
            <h1 className={K.h1}>{t.scoreRisk}</h1>
          </div>
        </header>
        <div className={K.tbl}>
          <div className={`${K.tr} ${K.th}`} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span>{t.score}</span>
            <span>{t.risk}</span>
            <span>{t.combination}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>0/0, 15/0</span>
            <span style={{ color: "#4CD07D", fontWeight: "800", fontSize: "12px" }}>{t.low}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.s2OrS5On}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.t3030Deuce}</span>
            <span style={{ color: "#FFD54A", fontWeight: "800", fontSize: "12px" }}>{t.medium}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.s9OnReturnS2}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.t3040OnServe}</span>
            <span style={{ color: "#FF5A5F", fontWeight: "800", fontSize: "12px" }}>{t.high}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.firstServeToThe}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.t4030OnServe}</span>
            <span style={{ color: "#4CD07D", fontWeight: "800", fontSize: "12px" }}>{t.mediumLow}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.s5Serve1Or}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.t1540BreakPoint}</span>
            <span style={{ color: "#FFD54A", fontWeight: "800", fontSize: "12px" }}>{t.medium}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.s9DeepReturnS8}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.t45ToStay}</span>
            <span style={{ color: "#FF5A5F", fontWeight: "800", fontSize: "12px" }}>{t.high}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.s2AndS9No}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.t54ForThe}</span>
            <span style={{ color: "#FFD54A", fontWeight: "800", fontSize: "12px" }}>{t.medium}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.s5OnOddPoints}</span>
          </div>
          <div className={K.tr} style={{ gridTemplateColumns: "96px 70px 1fr" }}>
            <span style={{ fontWeight: "800" }}>{t.tiebreak66}</span>
            <span style={{ color: "#FF5A5F", fontWeight: "800", fontSize: "12px" }}>{t.high}</span>
            <span style={{ fontSize: "12.5px", lineHeight: "1.3" }}>{t.bigFirstServeCrosscourt}</span>
          </div>
        </div>
        <div className={K.note}>{t.riskCombinesPointImportance}</div>
      </div>

    </Schermo>
  );
}
