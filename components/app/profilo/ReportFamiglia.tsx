"use client";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Testata } from "./comuni";
import c from "./comune.module.css";

const T = {
  it: {
    kick: "Ottobre · Luca B.", titolo: "Report per la famiglia", mese: "QUESTO MESE", sintesi: "Il diritto è cresciuto molto", dettaglio: "L'apertura ora arriva prima del rimbalzo.",
    lezioni: "lezioni", video: "video analizzati", punti: "punti di errore",
    o1: "Apertura del diritto", o1s: "Obiettivo raggiunto", o2: "Split-step", o2s: "In miglioramento, da allenare a casa",
    nota: "Nota del maestro", notaT: "Luca è più sicuro in partita. Il prossimo mese lavoriamo sul servizio.", condividi: "Condividi", pdf: "Esporta PDF",
  },
  en: {
    kick: "October · Luca B.", titolo: "Family report", mese: "THIS MONTH", sintesi: "The forehand has improved a lot", dettaglio: "Preparation now comes before the bounce.",
    lezioni: "lessons", video: "videos analyzed", punti: "error points",
    o1: "Forehand preparation", o1s: "Goal reached", o2: "Split step", o2s: "Improving, practice at home",
    nota: "Coach's note", notaT: "Luca is more confident in matches. Next month we'll work on the serve.", condividi: "Share", pdf: "Export PDF",
  },
  fr: {
    kick: "Octobre · Luca B.", titolo: "Rapport pour la famille", mese: "CE MOIS-CI", sintesi: "Le coup droit a beaucoup progressé", dettaglio: "La préparation arrive maintenant avant le rebond.",
    lezioni: "cours", video: "vidéos analysées", punti: "points d'erreur",
    o1: "Préparation du coup droit", o1s: "Objectif atteint", o2: "Split-step", o2s: "En progrès, à travailler à la maison",
    nota: "Note de l'entraîneur", notaT: "Luca est plus sûr en match. Le mois prochain, on travaille le service.", condividi: "Partager", pdf: "Exporter en PDF",
  },
  de: {
    kick: "Oktober · Luca B.", titolo: "Bericht für die Familie", mese: "DIESER MONAT", sintesi: "Die Vorhand hat sich stark verbessert", dettaglio: "Die Vorbereitung kommt jetzt vor dem Aufprall.",
    lezioni: "Stunden", video: "analysierte Videos", punti: "Fehlerpunkte",
    o1: "Vorbereitung der Vorhand", o1s: "Ziel erreicht", o2: "Split-Step", o2s: "Verbessert sich, zu Hause weiter üben",
    nota: "Notiz des Trainers", notaT: "Luca ist im Match sicherer. Im nächsten Monat arbeiten wir am Aufschlag.", condividi: "Teilen", pdf: "PDF exportieren",
  },
  es: {
    kick: "Octubre · Luca B.", titolo: "Informe para la familia", mese: "ESTE MES", sintesi: "La derecha ha mejorado mucho", dettaglio: "La preparación ahora llega antes del bote.",
    lezioni: "clases", video: "vídeos analizados", punti: "puntos de error",
    o1: "Preparación de la derecha", o1s: "Objetivo logrado", o2: "Split step", o2s: "Mejorando, a entrenar en casa",
    nota: "Nota del entrenador", notaT: "Luca está más seguro en partido. El próximo mes trabajamos el saque.", condividi: "Compartir", pdf: "Exportar PDF",
  },
};

/** 61 · Report per la famiglia. Dati dimostrativi: condividi ed esporta arrivano più avanti. */
export default function ReportFamiglia() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={`${c.col} ${c.stretto}`}>
        <Testata indietro={ROTTE.Allievi} kick={t.kick} titolo={t.titolo} />
        <div className="lawn" style={{ borderRadius: 24, padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>{t.mese}</div>
          <div className={c.disp} style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.05 }}>{t.sintesi}</div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.dettaglio}</div>
        </div>
        <div className={c.g3}>
          <div className={c.tile}><b>8</b><span>{t.lezioni}</span></div>
          <div className={c.tile}><b>5</b><span>{t.video}</span></div>
          <div className={c.tile}><b style={{ color: "#4CD07D" }}>−36</b><span>{t.punti}</span></div>
        </div>
        <div className={c.li}><span className={c.dot} style={{ background: "#4CD07D" }} /><span className={c.grow}><span className={c.liT}>{t.o1}</span><span className={c.liS}>{t.o1s}</span></span></div>
        <div className={c.li}><span className={c.dot} style={{ background: "#FFD54A" }} /><span className={c.grow}><span className={c.liT}>{t.o2}</span><span className={c.liS}>{t.o2s}</span></span></div>
        <div className={`card ${c.pad}`} style={{ fontSize: 13.5, lineHeight: 1.45 }}><b>{t.nota}</b> · {t.notaT}</div>
        <div className={c.g2}>
          <button type="button" className={c.btn2}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" /></svg>{t.condividi}
          </button>
          <button type="button" className={c.btn2}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>{t.pdf}
          </button>
        </div>
      </div>
    </Schermo>
  );
}
