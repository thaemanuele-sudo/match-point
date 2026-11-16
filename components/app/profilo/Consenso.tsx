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
