"use client";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    againstBigServer: "Contro: Battitore",
    tiebreakPlan: "Piano del tie-break",
    tommaso: "Tommaso",
    opponent: "Avversario",
    highRisk: "rischio alto",
    points12: "Punti 1-2",
    s9DeepReturnTo: "S9 risposta profonda al centro",
    points34: "Punti 3-4",
    lowSliceBallExtend: "Palla bassa in back, allunga lo scambio",
    points56: "Punti 5-6",
    s2ServeToThe: "S2 servizio sul rovescio",
    keyPoints: "Punti decisivi",
    blockedReturnNoRisk: "Risposta bloccata, nessun rischio",
    youKnowWhatTo: "Sai già cosa giocare prima di servire: ogni strategia viene dalla combinazione fissa per il Battitore.",
  },
  en: {
    back: "Back",
    againstBigServer: "Against: Big server",
    tiebreakPlan: "Tiebreak plan",
    tommaso: "Tommaso",
    opponent: "Opponent",
    highRisk: "high risk",
    points12: "Points 1-2",
    s9DeepReturnTo: "S9 deep return to the middle",
    points34: "Points 3-4",
    lowSliceBallExtend: "Low slice ball, extend the rally",
    points56: "Points 5-6",
    s2ServeToThe: "S2 serve to the backhand",
    keyPoints: "Key points",
    blockedReturnNoRisk: "Blocked return, no risk",
    youKnowWhatTo: "You know what to play before serving: each strategy comes from the set combination for the Big server.",
  },
};

export function TieBreak() {
  const t = useT(T);
  return (
    <Schermo tab="tattica">
      <div className={K.scr}>
        <header className={K.hdr}>
          <Link href={ROTTE.ProfiliAvversario} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.againstBigServer}</div>
            <h1 className={K.h1}>{t.tiebreakPlan}</h1>
          </div>
        </header>
        <div className={`${K.card} ${K.pad}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", alignItems: "center", background: "#0F3D27", borderColor: "#1E6A44" }}>
          <span style={{ fontWeight: "800" }}>{t.tommaso}</span>
          <span className={K.disp} style={{ fontSize: "30px", fontWeight: "800", color: "#D8F34A" }}>5</span>
          <span></span>
          <span style={{ fontWeight: "800" }}>{t.opponent}</span>
          <span className={K.disp} style={{ fontSize: "30px", fontWeight: "800" }}>5</span>
          <span className={K.tag} style={{ background: "#FF5A5F", color: "#fff" }}>{t.highRisk}</span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
          <div className={K.disp} style={{ width: "86px", flex: "none", borderRadius: "16px", background: "#0F3D27", border: "1px solid #1E6A44", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "19px", fontWeight: "700", lineHeight: "1.05", padding: "8px" }}>{t.points12}</div>
          <div className={`${K.card} ${K.grow}`} style={{ padding: "12px", fontWeight: "700", fontSize: "15px", display: "flex", alignItems: "center" }}>{t.s9DeepReturnTo}</div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
          <div className={K.disp} style={{ width: "86px", flex: "none", borderRadius: "16px", background: "#0F3D27", border: "1px solid #1E6A44", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "19px", fontWeight: "700", lineHeight: "1.05", padding: "8px" }}>{t.points34}</div>
          <div className={`${K.card} ${K.grow}`} style={{ padding: "12px", fontWeight: "700", fontSize: "15px", display: "flex", alignItems: "center" }}>{t.lowSliceBallExtend}</div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
          <div className={K.disp} style={{ width: "86px", flex: "none", borderRadius: "16px", background: "#0F3D27", border: "1px solid #1E6A44", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "19px", fontWeight: "700", lineHeight: "1.05", padding: "8px" }}>{t.points56}</div>
          <div className={`${K.card} ${K.grow}`} style={{ padding: "12px", fontWeight: "700", fontSize: "15px", display: "flex", alignItems: "center" }}>{t.s2ServeToThe}</div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
          <div className={K.disp} style={{ width: "86px", flex: "none", borderRadius: "16px", background: "#0F3D27", border: "1px solid #1E6A44", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "19px", fontWeight: "700", lineHeight: "1.05", padding: "8px" }}>{t.keyPoints}</div>
          <div className={`${K.card} ${K.grow}`} style={{ padding: "12px", fontWeight: "700", fontSize: "15px", display: "flex", alignItems: "center" }}>{t.blockedReturnNoRisk}</div>
        </div>
        <div className={K.note}>{t.youKnowWhatTo}</div>
      </div>

    </Schermo>
  );
}
