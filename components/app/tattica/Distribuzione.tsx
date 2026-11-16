"use client";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    lastMonthSensorAnd: "Ultimo mese · sensore e video",
    yourStrokes: "I tuoi colpi",
    strokes: "colpi",
    t13Km: "1,3 km",
    covered: "percorsi",
    great: "Ottima",
    feeling: "sensazione",
    forehand: "Diritto",
    backhand: "Rovescio",
    bhVolley: "Volée di rov.",
    fhVolley: "Volée di dir.",
    serve: "Servizio",
    volley: "Volée",
  },
  en: {
    back: "Back",
    lastMonthSensorAnd: "Last month · sensor and video",
    yourStrokes: "Your strokes",
    strokes: "strokes",
    t13Km: "1.3 km",
    covered: "covered",
    great: "Great",
    feeling: "feeling",
    forehand: "Forehand",
    backhand: "Backhand",
    bhVolley: "BH volley",
    fhVolley: "FH volley",
    serve: "Serve",
    volley: "Volley",
  },
};

export function Distribuzione() {
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
            <div className={K.kick}>{t.lastMonthSensorAnd}</div>
            <h1 className={K.h1}>{t.yourStrokes}</h1>
          </div>
        </header>
        <div className={K.g3}>
          <div className={K.tile}>
            <b>6.700</b>
            <span>{t.strokes}</span>
          </div>
          <div className={K.tile}>
            <b>{t.t13Km}</b>
            <span>{t.covered}</span>
          </div>
          <div className={K.tile}>
            <b style={{ color: "#4CD07D" }}>{t.great}</b>
            <span>{t.feeling}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className={K.card} style={{ padding: "4px" }}>
            <svg width="200" height="190" viewBox="0 0 200 190" aria-hidden="true">
              <polygon points="100,70 121,85 113,110 87,110 79,85" fill="none" stroke="#2C2C2E"></polygon>
              <polygon points="100,48 141,79 126,127 74,127 59,79" fill="none" stroke="#2C2C2E"></polygon>
              <polygon points="100,26 163,72 139,145 61,145 37,72" fill="none" stroke="#2C2C2E"></polygon>
              <polygon points="100,33 138,80 110,105 86,111 65,81" fill="rgba(216,243,74,.3)" stroke="#D8F34A" strokeWidth="2.5"></polygon>
              <text x="100" y="15" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.forehand}</text>
              <text x="180" y="71" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.backhand}</text>
              <text x="150" y="161" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.bhVolley}</text>
              <text x="50" y="161" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.fhVolley}</text>
              <text x="20" y="71" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.serve}</text>
            </svg>
          </div>
          <div style={{ flex: "1", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gridTemplateRows: "repeat(3,48px)", gap: "3px", borderRadius: "12px", overflow: "hidden", background: "#1E6A44" }}>
            <span style={{ background: "rgba(216,243,74,0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}></span>
            <span style={{ background: "rgba(216,243,74,0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}></span>
            <span style={{ background: "rgba(216,243,74,0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}></span>
            <span style={{ background: "rgba(216,243,74,0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}></span>
            <span style={{ background: "rgba(216,243,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}>6%</span>
            <span style={{ background: "rgba(216,243,74,0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}></span>
            <span style={{ background: "rgba(216,243,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}>6%</span>
            <span style={{ background: "rgba(216,243,74,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#fff" }}>4%</span>
            <span style={{ background: "rgba(216,243,74,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", color: "#0B0B0C" }}>86%</span>
          </div>
        </div>
        <div className={K.g4}>
          <div className={K.tile} style={{ textAlign: "center", borderColor: "#F3F6F1" }}>
            <b style={{ color: "#F3F6F1", fontSize: "22px" }}>45%</b>
            <span>{t.backhand}</span>
          </div>
          <div className={K.tile} style={{ textAlign: "center", borderColor: "#D8F34A" }}>
            <b style={{ color: "#D8F34A", fontSize: "22px" }}>35%</b>
            <span>{t.forehand}</span>
          </div>
          <div className={K.tile} style={{ textAlign: "center", borderColor: "#D8F34A" }}>
            <b style={{ color: "#D8F34A", fontSize: "22px" }}>15%</b>
            <span>{t.serve}</span>
          </div>
          <div className={K.tile} style={{ textAlign: "center", borderColor: "#F3F6F1" }}>
            <b style={{ color: "#F3F6F1", fontSize: "22px" }}>5%</b>
            <span>{t.volley}</span>
          </div>
        </div>
      </div>
    </Schermo>
  );
}
