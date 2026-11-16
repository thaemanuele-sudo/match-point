"use client";
import { useState } from "react";
import Link from "next/link";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import c from "./comune.module.css";

const T = {
  it: {
    kick: "Modalità Maestro · 14 allievi", titolo: "Allievi", nuovo: "Nuovo allievo",
    v1: "Allievi", v2: "Gruppi", v3: "Tornei",
    t1: "video questa settimana", t2: "errori in sviluppo", t3: "obiettivi raggiunti",
    principale: "Errore principale", gruppo: "Confronta gruppo",
  },
  en: {
    kick: "Coach mode · 14 students", titolo: "Students", nuovo: "New student",
    v1: "Students", v2: "Groups", v3: "Tournaments",
    t1: "videos this week", t2: "errors in progress", t3: "goals reached",
    principale: "Main error", gruppo: "Compare group",
  },
};

// Dati dimostrativi (nome, fascia, iniziali, colore avatar, errore, codice, percentuale, colore percentuale)
const ALLIEVI = {
  it: [
    ["Luca B.", "U12", "LU", "#3E5D8A", "Apertura tardiva", "DR-01", "58%", "#FF9F43"],
    ["Tommaso R.", "U12", "TR", "#2A6C4C", "Impatto dietro il corpo", "DR-02", "72%", "#FF5A5F"],
    ["Giulia M.", "U14", "GL", "#8A3E6C", "Gambe rigide al servizio", "SV-04", "38%", "#FFD54A"],
    ["Matteo B.", "U10", "MB", "#8A4E3E", "Lancio di palla instabile", "SV-01", "49%", "#FF9F43"],
    ["Sofia L.", "U16", "SF", "#5A4E8A", "Mano non dominante passiva", "RV-01", "21%", "#4CD07D"],
  ],
  en: [
    ["Luca B.", "U12", "LU", "#3E5D8A", "Late preparation", "DR-01", "58%", "#FF9F43"],
    ["Tommaso R.", "U12", "TR", "#2A6C4C", "Contact behind the body", "DR-02", "72%", "#FF5A5F"],
    ["Giulia M.", "U14", "GL", "#8A3E6C", "Stiff legs on serve", "SV-04", "38%", "#FFD54A"],
    ["Matteo B.", "U10", "MB", "#8A4E3E", "Unstable ball toss", "SV-01", "49%", "#FF9F43"],
    ["Sofia L.", "U16", "SF", "#5A4E8A", "Passive non-dominant hand", "RV-01", "21%", "#4CD07D"],
  ],
};

/** 16 · I miei allievi (Modalità Maestro). Dati dimostrativi. */
export default function Allievi() {
  const t = useT(T);
  const { lang } = useLang();
  const [vista, setVista] = useState(0);
  return (
    <Schermo tab="coach">
      <div className={c.col}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div><div className={c.kick}>{t.kick}</div><h1 className={c.big}>{t.titolo}</h1></div>
          <Link href={ROTTE.ProfiloAllievo} className="icon" aria-label={t.nuovo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </Link>
        </div>
        <div className={c.seg} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {[t.v1, t.v2, t.v3].map((v, i) => <button key={v} type="button" className={i === vista ? `${c.sg} ${c.on}` : c.sg} aria-pressed={i === vista} onClick={() => setVista(i)}>{v}</button>)}
        </div>
        <div className={c.g3}>
          <div className={c.tile}><b>9</b><span>{t.t1}</span></div>
          <div className={c.tile}><b style={{ color: "#FF9F43" }}>4</b><span>{t.t2}</span></div>
          <div className={c.tile}><b style={{ color: "#4CD07D" }}>6</b><span>{t.t3}</span></div>
        </div>
        <div className={c.sezione}><h2>{t.principale}</h2><Link href={ROTTE.DashboardClub} className={c.piccolo}>{t.gruppo}</Link></div>
        {ALLIEVI[lang].map(([nome, fascia, ini, col, errore, codice, perc, colPerc]) => (
          <Link key={codice + nome} href={ROTTE.Feedback} className={c.li}>
            <span className={c.avatar} style={{ width: 44, height: 44, background: col }}>{ini}</span>
            <span className={c.grow}><span className={c.liT}>{nome} · {fascia}</span><span className={c.liS}>{errore}</span></span>
            <span className={c.destra}><span className={c.code}>{codice}</span><span className={c.disp} style={{ fontSize: 18, fontWeight: 700, color: colPerc }}>{perc}</span></span>
          </Link>
        ))}
      </div>
    </Schermo>
  );
}
