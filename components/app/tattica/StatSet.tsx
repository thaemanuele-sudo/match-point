"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    under12TournamentSaturday: "Torneo Under 12 · sabato",
    stats: "Statistiche",
    set: "Set",
    tommaso: "Tommaso",
    opponent: "Avversario",
    aces: "Ace",
    doubleFaults: "Doppi falli",
    winners: "Vincenti",
    unforcedErrors: "Errori non forzati",
    firstServesIn: "Prime in campo",
    secondServePointsWon: "Punti vinti sulla seconda",
    breakPointsWon: "Palle break vinte",
    partita: "Partita",
  },
  en: {
    back: "Back",
    under12TournamentSaturday: "Under 12 tournament · Saturday",
    stats: "Stats",
    set: "Set",
    tommaso: "Tommaso",
    opponent: "Opponent",
    aces: "Aces",
    doubleFaults: "Double faults",
    winners: "Winners",
    unforcedErrors: "Unforced errors",
    firstServesIn: "First serves in",
    secondServePointsWon: "Second serve points won",
    breakPointsWon: "Break points won",
    partita: "Match",
  },
};

// [giocatore, avversario] per Partita, Set 1, Set 2, Set 3 (dimostrativi: i set sommano ai totali del disegno).
const RIGHE = [
  ["aces", [[6, 2], [3, 1], [1, 1], [2, 0]]],
  ["doubleFaults", [[3, 5], [1, 2], [1, 2], [1, 1]]],
  ["winners", [[24, 18], [9, 6], [6, 7], [9, 5]]],
  ["unforcedErrors", [[19, 27], [6, 9], [6, 10], [7, 8]]],
  ["firstServesIn", [[64, 58], [22, 19], [18, 20], [24, 19]]],
  ["secondServePointsWon", [[52, 41], [17, 14], [15, 13], [20, 14]]],
  ["breakPointsWon", [[4, 2], [1, 1], [2, 0], [1, 1]]],
] as const;
const SET = ["partita", "set1", "set2", "set3"] as const;

export function StatSet() {
  const t = useT(T);
  const [sel, setSel] = useState(0);
  return (
    <Schermo tab="coach">
      <div className={K.scr} style={{ gap: 12 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.StatPartita} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.under12TournamentSaturday}</div>
            <h1 className={K.h1}>{t.stats}</h1>
          </div>
        </header>
        <div className={`${K.card} ${K.pad}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "8px 14px", alignItems: "center" }}>
          <span style={{ fontWeight: "800", display: "flex", gap: "8px", alignItems: "center" }}>
            <span className={K.dot} style={{ background: "#D8F34A" }}></span>
            {t.tommaso}
          </span>
          <span className={K.disp} style={{ fontSize: "24px", fontWeight: "800", color: "#D8F34A" }}>6</span>
          <span className={K.disp} style={{ fontSize: "24px", fontWeight: "800" }}>4</span>
          <span className={K.disp} style={{ fontSize: "24px", fontWeight: "800", color: "#D8F34A" }}>7</span>
          <span className={K.muted} style={{ fontWeight: "700" }}>{t.opponent}</span>
          <span className={`${K.disp} ${K.muted}`} style={{ fontSize: "24px", fontWeight: "800" }}>4</span>
          <span className={K.disp} style={{ fontSize: "24px", fontWeight: "800" }}>6</span>
          <span className={`${K.disp} ${K.muted}`} style={{ fontSize: "24px", fontWeight: "800" }}>5</span>
        </div>
        <div className={K.seg} style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          {SET.map((k, n) => (
            <button key={k} type="button" className={n === sel ? `${K.sg} ${K.on}` : K.sg} aria-pressed={n === sel} onClick={() => setSel(n)}>{k === "partita" ? t.partita : `${t.set} ${n}`}</button>
          ))}
        </div>
        {RIGHE.map(([k, v]) => {
          const [a, b] = v[sel];
          return (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", gap: "8px", alignItems: "center" }}>
              <span className={K.disp} style={{ fontSize: "18px", fontWeight: "700" }}>{a}</span>
              <div>
                <div className={K.muted} style={{ textAlign: "center", fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>{t[k]}</div>
                <div style={{ display: "flex", gap: "3px", height: "10px" }}>
                  <span style={{ flex: a, background: "#D8F34A", borderRadius: "5px 0 0 5px" }}></span>
                  <span style={{ flex: b, background: "#3A3A3E", borderRadius: "0 5px 5px 0" }}></span>
                </div>
              </div>
              <span className={K.disp} style={{ fontSize: "18px", fontWeight: "700", textAlign: "right" }}>{b}</span>
            </div>
          );
        })}
      </div>
    </Schermo>
  );
}
