"use client";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Testata } from "./comuni";
import c from "./comune.module.css";

const T = {
  it: {
    kick: "Scuola tennis · 3 maestri · 58 allievi", titolo: "Dashboard del club", g1: "Tutti", g2: "U10", g3: "U12", g4: "U14+",
    video: "video al mese", accordo: "accordo AI e maestri", voto: "voto famiglie", errori: "Errori per tipo · dati simulati", accordoV: "0,78", votoV: "4,6",
    nota: 'La preparazione è il problema più comune: proponi a tutti i gruppi U12 il percorso "Apertura al rimbalzo".',
  },
  en: {
    kick: "Tennis school · 3 coaches · 58 students", titolo: "Club dashboard", g1: "All", g2: "U10", g3: "U12", g4: "U14+",
    video: "videos per month", accordo: "AI-coach agreement", voto: "family rating", errori: "Errors by type · simulated data", accordoV: "0.78", votoV: "4.6",
    nota: 'Preparation is the most common issue: suggest the "Prep on the bounce" program to all U12 groups.',
  },
};
const ERRORI = {
  it: [["Preparazione", 34, "#FF9F43"], ["Impatto", 24, "#FF5A5F"], ["Piedi / equilibrio", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Presa", 7, "#A1A1A6"], ["Chiusura", 5, "#4CD07D"]],
  en: [["Preparation", 34, "#FF9F43"], ["Contact", 24, "#FF5A5F"], ["Feet / balance", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Grip", 7, "#A1A1A6"], ["Finish", 5, "#4CD07D"]],
} as const;

/** 64 · Dashboard club e gruppi. Dati dimostrativi. */
export default function DashboardClub() {
  const t = useT(T);
  const { lang } = useLang();
  const [g, setG] = useState(2);
  return (
    <Schermo tab="coach">
      <div className={`${c.col} ${c.stretto}`}>
        <Testata indietro={ROTTE.Allievi} kick={t.kick} titolo={t.titolo} />
        <div className={c.seg} style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          {[t.g1, t.g2, t.g3, t.g4].map((v, i) => <button key={v} type="button" className={i === g ? `${c.sg} ${c.on}` : c.sg} aria-pressed={i === g} onClick={() => setG(i)}>{v}</button>)}
        </div>
        <div className={c.g3}>
          <div className={c.tile}><b>142</b><span>{t.video}</span></div>
          <div className={c.tile}><b style={{ color: "#4CD07D" }}>{t.accordoV}</b><span>{t.accordo}</span></div>
          <div className={c.tile}><b>{t.votoV}</b><span>{t.voto}</span></div>
        </div>
        <div className={`card ${c.pad}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>{t.errori}</div>
          {ERRORI[lang].map(([nome, perc, col]) => (
            <div key={nome}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}><span>{nome}</span><span>{perc}%</span></div>
              {/* la barra più lunga (34%) occupa l'85% della larghezza, come nel disegno */}
              <div className={c.bar}><i style={{ width: `${perc * 2.5}%`, background: col }} /></div>
            </div>
          ))}
        </div>
        <div className={c.note}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" /></svg>{t.nota}
        </div>
      </div>
    </Schermo>
  );
}
