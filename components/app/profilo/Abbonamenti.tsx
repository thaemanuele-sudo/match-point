"use client";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Testata } from "./comuni";
import c from "./comune.module.css";
import s from "./Abbonamenti.module.css";

const T = {
  it: { kick: "Prezzi indicativi, da validare", titolo: "Scegli il piano", prova: "Prova Maestro Pro", presto: "Disponibile a breve" },
  en: { kick: "Indicative prices, to be validated", titolo: "Choose your plan", prova: "Try Coach Pro", presto: "Coming soon" },
  fr: { kick: "Prix indicatifs, à valider", titolo: "Choisis ton offre", prova: "Essayer Entraîneur Pro", presto: "Bientôt disponible" },
  de: { kick: "Richtpreise, noch zu prüfen", titolo: "Wähle deinen Tarif", prova: "Trainer Pro testen", presto: "Demnächst verfügbar" },
  es: { kick: "Precios orientativos, por validar", titolo: "Elige el plan", prova: "Probar Entrenador Pro", presto: "Disponible próximamente" },
};
const PIANI = {
  it: [
    ["Free", "0 €", ["3 analisi video al mese", "Libreria esercizi base", "1 lingua"]],
    ["Allievo / Famiglia", "6-9 € al mese", ["Analisi illimitate", "Piani personalizzati", "Esercizi a casa e progressi"]],
    ["Maestro Pro", "25-35 € al mese", ["Fino a 40 allievi", "Video di correzione propri", "Tattica, matrice e report"]],
    ["Club e Accademie", "licenza annuale", ["Più maestri, metodo condiviso", "Dashboard per gruppi", "Integrazione gestionale"]],
  ],
  en: [
    ["Free", "€0", ["3 video analyses per month", "Basic drill library", "1 language"]],
    ["Student / Family", "€6-9 per month", ["Unlimited analyses", "Personalized plans", "Home drills and progress"]],
    ["Coach Pro", "€25-35 per month", ["Up to 40 students", "Your own correction videos", "Tactics, matrix and reports"]],
    ["Clubs and Academies", "annual license", ["Multiple coaches, shared method", "Group dashboards", "Management software integration"]],
  ],
  fr: [
    ["Gratuit", "0 €", ["3 analyses vidéo par mois", "Bibliothèque d'exercices de base", "1 langue"]],
    ["Élève / Famille", "6-9 € par mois", ["Analyses illimitées", "Plans personnalisés", "Exercices à la maison et progrès"]],
    ["Entraîneur Pro", "25-35 € par mois", ["Jusqu'à 40 élèves", "Vos propres vidéos de correction", "Tactique, matrice et rapports"]],
    ["Clubs et Académies", "licence annuelle", ["Plusieurs entraîneurs, méthode partagée", "Tableau de bord par groupe", "Intégration logiciel de gestion"]],
  ],
  de: [
    ["Free", "0 €", ["3 Videoanalysen pro Monat", "Basis-Übungsbibliothek", "1 Sprache"]],
    ["Schüler / Familie", "6–9 € pro Monat", ["Unbegrenzte Analysen", "Personalisierte Pläne", "Übungen zu Hause und Fortschritte"]],
    ["Trainer Pro", "25–35 € pro Monat", ["Bis zu 40 Schüler", "Eigene Korrekturvideos", "Taktik, Matrix und Berichte"]],
    ["Vereine und Akademien", "Jahreslizenz", ["Mehrere Trainer, gemeinsame Methode", "Dashboards für Gruppen", "Integration in Verwaltungssoftware"]],
  ],
  es: [
    ["Free", "0 €", ["3 análisis de vídeo al mes", "Biblioteca de ejercicios básica", "1 idioma"]],
    ["Alumno / Familia", "6-9 € al mes", ["Análisis ilimitados", "Planes personalizados", "Ejercicios en casa y progresos"]],
    ["Entrenador Pro", "25-35 € al mes", ["Hasta 40 alumnos", "Vídeos de corrección propios", "Táctica, matriz e informes"]],
    ["Clubes y Academias", "licencia anual", ["Varios entrenadores, método común", "Panel para grupos", "Integración con software de gestión"]],
  ],
} as const;

/** 62 · Abbonamenti. Solo grafica: nessun pagamento vero, il pulsante dice "Disponibile a breve". */
export default function Abbonamenti() {
  const t = useT(T);
  const { lang } = useLang();
  const [presto, setPresto] = useState(false);
  return (
    <Schermo>
      <div className={`${c.col} ${c.fitto}`}>
        <Testata indietro={ROTTE.Impostazioni} kick={t.kick} titolo={t.titolo} />
        {PIANI[lang].map(([nome, prezzo, voci], i) => (
          <div key={nome} className={i === 2 ? `${s.piano} ${s.pro}` : s.piano}>
            <div className={s.testa}><b>{nome}</b><span>{prezzo}</span></div>
            <div className={s.voci}>{voci.map((v) => <span key={v}>· {v}</span>)}</div>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setPresto(true)} aria-live="polite">{presto ? t.presto : t.prova}</button>
      </div>
    </Schermo>
  );
}
