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
  fr: {
    kick: "École de tennis · 3 entraîneurs · 58 élèves", titolo: "Tableau de bord du club", g1: "Tous", g2: "U10", g3: "U12", g4: "U14+",
    video: "vidéos par mois", accordo: "accord IA et entraîneurs", voto: "note des familles", errori: "Erreurs par type · données simulées", accordoV: "0,78", votoV: "4,6",
    nota: 'La préparation est le problème le plus fréquent : propose à tous les groupes U12 le parcours "Préparation au rebond".',
  },
  de: {
    kick: "Tennisschule · 3 Trainer · 58 Schüler", titolo: "Club-Dashboard", g1: "Alle", g2: "U10", g3: "U12", g4: "U14+",
    video: "Videos pro Monat", accordo: "Übereinstimmung KI und Trainer", voto: "Bewertung durch Familien", errori: "Fehler nach Art · simulierte Daten", accordoV: "0,78", votoV: "4,6",
    nota: 'Die Vorbereitung ist das häufigste Problem: Schlag allen U12-Gruppen den Plan „Öffnung nach dem Aufspringen“ vor.',
  },
  es: {
    kick: "Escuela de tenis · 3 entrenadores · 58 alumnos", titolo: "Panel del club", g1: "Todos", g2: "U10", g3: "U12", g4: "U14+",
    video: "vídeos al mes", accordo: "acuerdo IA y entrenadores", voto: "nota de las familias", errori: "Errores por tipo · datos simulados", accordoV: "0,78", votoV: "4,6",
    nota: 'La preparación es el problema más común: propón a todos los grupos U12 la ruta "Preparación al bote".',
  },
};
const ERRORI = {
  it: [["Preparazione", 34, "#FF9F43"], ["Impatto", 24, "#FF5A5F"], ["Piedi / equilibrio", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Presa", 7, "#A1A1A6"], ["Chiusura", 5, "#4CD07D"]],
  en: [["Preparation", 34, "#FF9F43"], ["Contact", 24, "#FF5A5F"], ["Feet / balance", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Grip", 7, "#A1A1A6"], ["Finish", 5, "#4CD07D"]],
  fr: [["Préparation", 34, "#FF9F43"], ["Impact", 24, "#FF5A5F"], ["Pieds / équilibre", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Prise", 7, "#A1A1A6"], ["Finition", 5, "#4CD07D"]],
  de: [["Vorbereitung", 34, "#FF9F43"], ["Kontakt", 24, "#FF5A5F"], ["Füße / Gleichgewicht", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Griff", 7, "#A1A1A6"], ["Ausschwung", 5, "#4CD07D"]],
  es: [["Preparación", 34, "#FF9F43"], ["Impacto", 24, "#FF5A5F"], ["Pies / equilibrio", 18, "#FFD54A"], ["Timing", 12, "#3D8BFF"], ["Empuñadura", 7, "#A1A1A6"], ["Terminación", 5, "#4CD07D"]],
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
