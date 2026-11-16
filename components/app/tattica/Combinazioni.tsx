"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT, useLang } from "@/lib/i18n/lingua";
import S from "./Combinazioni.module.css";

const T = {
  it: {
    back: "Indietro",
    combinations: "Combinazioni",
    game: "GAME",
    points: "PUNTI",
    set: "SET",
    tommaso: "Tommaso",
    opponent: "Avversario",
    risk: "Rischio",
    highSetPoint: "Alto · set point",
    aiSuggestion: "Suggerimento AI",
    firstServeToThe: "Prima di servizio al corpo, niente rischi",
    deepReturnToThe: "Risposta lunga al centro, poi rovescio",
    finishWithAnAdvancing: "Chiudi con diritto incrociato in avanzamento",
    setCombinations: "Combinazioni fisse",
    t4PerGame: "4 per game",
    opponentProfile: "Profilo avversario",
  },
  en: {
    back: "Back",
    combinations: "Combinations",
    game: "GAME",
    points: "POINTS",
    set: "SET",
    tommaso: "Tommaso",
    opponent: "Opponent",
    risk: "Risk",
    highSetPoint: "High · set point",
    aiSuggestion: "AI suggestion",
    firstServeToThe: "First serve to the body, no risks",
    deepReturnToThe: "Deep return to the middle, then backhand",
    finishWithAnAdvancing: "Finish with an advancing crosscourt forehand",
    setCombinations: "Set combinations",
    t4PerGame: "4 per game",
    opponentProfile: "Opponent profile",
  },
};

// Combinazioni fisse per profilo d'avversario (dimostrative, uguali nei disegni IT/EN).
const PROFILI = ["pallettaro", "battitore", "rovescio", "mancino"] as const;
const DATI = {
  it: {
    profili: ["Pallettaro", "Battitore", "Rovescio debole", "Mancino"],
    set: [
      ["Palla corta", "Attacco a rete", "Cambio ritmo", "Back lungo"],
      ["Risposta bloccata", "Palla bassa", "Gioco al centro", "Passante"],
      ["Servizio esterno", "Sventaglio", "Tutto sul rovescio", "Chiusura al volo"],
      ["Servizio al T", "Diritto lungolinea", "Kick alto", "Smash"],
    ],
  },
  en: {
    profili: ["Pusher", "Big server", "Weak backhand", "Lefty"],
    set: [
      ["Drop shot", "Net attack", "Change of pace", "Deep slice"],
      ["Blocked return", "Low ball", "Play through the middle", "Passing shot"],
      ["Wide serve", "Inside-out forehand", "Everything to the backhand", "Finish at the net"],
      ["Serve down the T", "Down-the-line forehand", "High kick", "Overhead"],
    ],
  },
};

export function Combinazioni() {
  const t = useT(T);
  const { lang } = useLang();
  const D = DATI[lang];
  const [prof, setProf] = useState(0);
  return (
    <Schermo tab="tattica">
      <div className={S.scr}>
        <header style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href={ROTTE.Tattica} className={S.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <h1 className={S.disp} style={{ margin: "0", fontSize: "30px", lineHeight: "1", fontWeight: "700" }}>{t.combinations}</h1>
        </header>
        <div className={S.board}>
          <div className={S.brow} style={{ marginBottom: "6px" }}>
            <span></span>
            <span className={S.muted} style={{ fontSize: "11px", fontWeight: "700", textAlign: "center" }}>{t.set}</span>
            <span className={S.muted} style={{ fontSize: "11px", fontWeight: "700", textAlign: "center" }}>{t.game}</span>
            <span className={S.muted} style={{ fontSize: "11px", fontWeight: "700", textAlign: "center" }}>{t.points}</span>
          </div>
          <div className={S.brow} style={{ marginBottom: "6px" }}>
            <span style={{ fontWeight: "700", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D8F34A" }}></span>
              {t.tommaso}
            </span>
            <span className={S.cell}>1</span>
            <span className={S.cell}>4</span>
            <span className={S.cell} style={{ color: "#D8F34A" }}>30</span>
          </div>
          <div className={S.brow}>
            <span style={{ fontWeight: "700", fontSize: "15px" }}>{t.opponent}</span>
            <span className={S.cell}>0</span>
            <span className={S.cell}>5</span>
            <span className={S.cell}>40</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: "700" }}>{t.risk}</span>
          <div style={{ flex: "1", height: "8px", borderRadius: "4px", background: "linear-gradient(90deg,#D8F34A,#FFC44D 50%,#F0454A)", position: "relative" }}>
            <span style={{ position: "absolute", left: "82%", top: "-5px", width: "4px", height: "18px", borderRadius: "2px", background: "#fff" }}></span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: "800", color: "#FF6B6E" }}>{t.highSetPoint}</span>
        </div>
        <div style={{ background: "#161618", borderRadius: "20px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", border: "1px solid rgba(216,243,74,.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "15px", color: "#D8F34A" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"></path>
            </svg>
            {t.aiSuggestion}
          </div>
          <div className={S.step}>
            <span className={S.n}>1</span>
            <span style={{ fontSize: "14px", lineHeight: "1.35" }}>{t.firstServeToThe}</span>
          </div>
          <div className={S.step}>
            <span className={S.n}>2</span>
            <span style={{ fontSize: "14px", lineHeight: "1.35" }}>{t.deepReturnToThe}</span>
          </div>
          <div className={S.step}>
            <span className={S.n}>3</span>
            <span style={{ fontSize: "14px", lineHeight: "1.35" }}>{t.finishWithAnAdvancing}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: "0", fontSize: "17px" }}>{t.setCombinations}</h2>
          <span className={S.muted} style={{ fontSize: "12px", fontWeight: "600" }}>{t.t4PerGame}</span>
        </div>
        <div role="group" aria-label={t.opponentProfile} style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          {PROFILI.map((p, ip) => (
            <button key={p} type="button" className={ip === prof ? `${S.pr} ${S.on}` : S.pr} aria-pressed={ip === prof} onClick={() => setProf(ip)}>{D.profili[ip]}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "6px" }}>
          {D.set[prof].map((f, n) => (
            <div key={f} className={S.fx}>
              <b>{n + 1}</b>
              {f}
            </div>
          ))}
        </div>
      </div>
    </Schermo>
  );
}
