"use client";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    under12TournamentSaturday: "Torneo Under 12 · sabato",
    matchAnalysis: "Analisi della partita",
    tommaso: "Tommaso",
    vsPusherOpponent: "vs avversario Pallettaro",
    firstServes: "Prime di servizio",
    secondServePointsWon: "Punti vinti sulla seconda",
    backhandUnforcedErrors: "Errori non forzati di rovescio",
    netPointsWon: "Punti vinti a rete",
    shotMap: "Mappa colpi",
    bySet: "Per set",
    improve: "Migliorare",
    autoHighlights: "Highlight automatici",
    all: "Tutti",
    setPoint: "Set point",
    dropShot: "Palla corta",
    volley: "Volée",
    compareWithTheTactical: "Confronta con la matrice tattica",
  },
  en: {
    back: "Back",
    under12TournamentSaturday: "Under 12 tournament · Saturday",
    matchAnalysis: "Match analysis",
    tommaso: "Tommaso",
    vsPusherOpponent: "vs Pusher opponent",
    firstServes: "First serves",
    secondServePointsWon: "Second serve points won",
    backhandUnforcedErrors: "Backhand unforced errors",
    netPointsWon: "Net points won",
    shotMap: "Shot map",
    bySet: "By set",
    improve: "Improve",
    autoHighlights: "Auto highlights",
    all: "All",
    setPoint: "Set point",
    dropShot: "Drop shot",
    volley: "Volley",
    compareWithTheTactical: "Compare with the tactical matrix",
  },
};

export function StatPartita() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={K.scr} style={{ gap: 12 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.VideoLab} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.under12TournamentSaturday}</div>
            <h1 className={K.h1}>{t.matchAnalysis}</h1>
          </div>
        </header>
        <div className={`${K.card} ${K.pad}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: "800" }}>{t.tommaso}</div>
            <div className={K.muted} style={{ fontSize: "12.5px" }}>{t.vsPusherOpponent}</div>
          </div>
          <div className={K.disp} style={{ fontSize: "30px", fontWeight: "800", color: "#D8F34A" }}>6-4 · 7-5</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "5px" }}>
              <span>{t.firstServes}</span>
              <span>62%</span>
            </div>
            <div className={K.bar}>
              <i style={{ width: "62%", background: "#D8F34A" }}></i>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "5px" }}>
              <span>{t.secondServePointsWon}</span>
              <span>48%</span>
            </div>
            <div className={K.bar}>
              <i style={{ width: "48%", background: "#FFD54A" }}></i>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "5px" }}>
              <span>{t.backhandUnforcedErrors}</span>
              <span>31%</span>
            </div>
            <div className={K.bar}>
              <i style={{ width: "31%", background: "#FF9F43" }}></i>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700", marginBottom: "5px" }}>
              <span>{t.netPointsWon}</span>
              <span>71%</span>
            </div>
            <div className={K.bar}>
              <i style={{ width: "71%", background: "#4CD07D" }}></i>
            </div>
          </div>
        </div>
        <div className={K.g3}>
          <Link href={ROTTE.MappaColpi} className={K.btn2} style={{ fontSize: "13px", height: "42px" }}>{t.shotMap}</Link>
          <Link href={ROTTE.StatSet} className={K.btn2} style={{ fontSize: "13px", height: "42px" }}>{t.bySet}</Link>
          <Link href={ROTTE.DaMigliorare} className={K.btn2} style={{ fontSize: "13px", height: "42px" }}>{t.improve}</Link>
        </div>
        <div className={K.sec}>
          <h2>{t.autoHighlights}</h2>
          <Link href={ROTTE.Highlight}>{t.all}</Link>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href={ROTTE.TimelineColpi} className="lawn" style={{ flex: "1", height: "96px", borderRadius: "16px", position: "relative", textDecoration: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 5v14l11-7z"></path>
            </svg>
            <span style={{ position: "absolute", left: "6px", bottom: "6px", fontSize: "11px", fontWeight: "800", background: "rgba(0,0,0,.6)", padding: "2px 6px", borderRadius: "6px" }}>{t.setPoint}</span>
          </Link>
          <Link href={ROTTE.TimelineColpi} className="lawn" style={{ flex: "1", height: "96px", borderRadius: "16px", position: "relative", textDecoration: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 5v14l11-7z"></path>
            </svg>
            <span style={{ position: "absolute", left: "6px", bottom: "6px", fontSize: "11px", fontWeight: "800", background: "rgba(0,0,0,.6)", padding: "2px 6px", borderRadius: "6px" }}>{t.dropShot}</span>
          </Link>
          <Link href={ROTTE.TimelineColpi} className="lawn" style={{ flex: "1", height: "96px", borderRadius: "16px", position: "relative", textDecoration: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 5v14l11-7z"></path>
            </svg>
            <span style={{ position: "absolute", left: "6px", bottom: "6px", fontSize: "11px", fontWeight: "800", background: "rgba(0,0,0,.6)", padding: "2px 6px", borderRadius: "6px" }}>{t.volley}</span>
          </Link>
        </div>
        <Link href={ROTTE.Combinazioni} className={K.btn2} style={{ flex: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"></path>
          </svg>
          {t.compareWithTheTactical}
        </Link>
      </div>
    </Schermo>
  );
}
