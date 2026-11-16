"use client";
import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Chev, Scudo, Testata } from "./comuni";
import c from "./comune.module.css";
import s from "./Consenso.module.css";

const T = {
  it: {
    kick: "Passo 2 di 3", titolo: "Consenso del genitore",
    gdpr: "Dati di minori trattati con il tuo consenso, conservati in UE e cancellabili in ogni momento (GDPR).",
    v1: "Analisi dei video di mio figlio", v1s: "Necessario per il Coach AI",
    v2: "Volti sfocati nei dati di addestramento", v2s: "Anonimizzazione automatica",
    v3: "Condividere i progressi con il maestro", v3s: "Report, video e piani",
    v4: "Usare i video per migliorare l'AI", v4s: "Facoltativo, sempre anonimi",
    canc: "Diritto di cancellazione", cancs: "Elimina dati e video quando vuoi", ok: "Acconsento e continuo",
  },
  en: {
    kick: "Step 2 of 3", titolo: "Parental consent",
    gdpr: "Minors' data processed with your consent, stored in the EU and deletable at any time (GDPR).",
    v1: "Analysis of my child's videos", v1s: "Required for Coach AI",
    v2: "Faces blurred in training data", v2s: "Automatic anonymization",
    v3: "Share progress with the coach", v3s: "Reports, videos and plans",
    v4: "Use videos to improve the AI", v4s: "Optional, always anonymous",
    canc: "Right to erasure", cancs: "Delete data and videos anytime", ok: "I agree and continue",
  },
  fr: {
    kick: "Étape 2 sur 3", titolo: "Consentement du parent",
    gdpr: "Données de mineurs traitées avec ton consentement, stockées dans l'UE et supprimables à tout moment (RGPD).",
    v1: "Analyse des vidéos de mon enfant", v1s: "Nécessaire pour le Coach IA",
    v2: "Visages floutés dans les données d'entraînement", v2s: "Anonymisation automatique",
    v3: "Partager les progrès avec l'entraîneur", v3s: "Rapports, vidéos et plans",
    v4: "Utiliser les vidéos pour améliorer l'IA", v4s: "Facultatif, toujours anonyme",
    canc: "Droit à l'effacement", cancs: "Supprime données et vidéos quand tu veux", ok: "J'accepte et je continue",
  },
  de: {
    kick: "Schritt 2 von 3", titolo: "Einwilligung der Eltern",
    gdpr: "Daten von Minderjährigen werden mit deiner Einwilligung verarbeitet, in der EU gespeichert und können jederzeit gelöscht werden (DSGVO).",
    v1: "Analyse der Videos meines Kindes", v1s: "Für Coach AI erforderlich",
    v2: "Gesichter in Trainingsdaten verwischt", v2s: "Automatische Anonymisierung",
    v3: "Fortschritte mit dem Trainer teilen", v3s: "Berichte, Videos und Pläne",
    v4: "Videos zur Verbesserung der KI nutzen", v4s: "Optional, immer anonym",
    canc: "Recht auf Löschung", cancs: "Lösche Daten und Videos, wann du willst", ok: "Ich stimme zu und fahre fort",
  },
  es: {
    kick: "Paso 2 de 3", titolo: "Consentimiento del padre/madre",
    gdpr: "Datos de menores tratados con tu consentimiento, guardados en la UE y eliminables en cualquier momento (RGPD).",
    v1: "Análisis de los vídeos de mi hijo", v1s: "Necesario para el Coach AI",
    v2: "Caras difuminadas en los datos de entrenamiento", v2s: "Anonimización automática",
    v3: "Compartir los progresos con el entrenador", v3s: "Informes, vídeos y planes",
    v4: "Usar los vídeos para mejorar la IA", v4s: "Opcional, siempre anónimos",
    canc: "Derecho de supresión", cancs: "Borra datos y vídeos cuando quieras", ok: "Acepto y continúo",
  },
};

/** 14 · Consenso del genitore. Per ora le scelte restano nella schermata (nessuna tabella dei consensi nel database). */
export default function Consenso() {
  const t = useT(T);
  const [v, setV] = useState([true, true, true, false]);
  const voci = [[t.v1, t.v1s], [t.v2, t.v2s], [t.v3, t.v3s], [t.v4, t.v4s]];
  return (
    <Schermo>
      <div className={`${c.col} ${c.pieno}`}>
        <Testata indietro={ROTTE.SceltaProfilo} kick={t.kick} titolo={t.titolo} />
        <div className={`card ${s.scudo}`}><span className={c.ic}><Scudo /></span><span>{t.gdpr}</span></div>
        {voci.map(([titolo, sotto], i) => (
          <label key={i} className={s.voce}>
            <span className={c.grow}><b>{titolo}</b><small>{sotto}</small></span>
            {/* il primo consenso è indispensabile per il Coach AI: si può solo leggere */}
            <input type="checkbox" checked={v[i]} disabled={i === 0} onChange={(e) => setV((p) => p.map((x, j) => (j === i ? e.target.checked : x)))} />
          </label>
        ))}
        <div className={c.li}>
          <span className={c.ic}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
          </span>
          <span className={c.grow}><span className={c.liT}>{t.canc}</span><span className={c.liS}>{t.cancs}</span></span>
          <Chev />
        </div>
        <div className={s.spazio} />
        <Link href={ROTTE.ProfiloAllievo} className="btn">{t.ok}</Link>
      </div>
    </Schermo>
  );
}
