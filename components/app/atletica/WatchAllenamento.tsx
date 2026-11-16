"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { Quadrante, useOra } from "./Quadrante";
import s from "./atletica.module.css";

const T = {
  it: { nome: "Allenamento sul quadrante dello smartwatch", titolo: "Allenamento", salva: "Salva lo scambio", salvato: "Scambio salvato", kcal: " KCAL", km: " KM", distanza: "2,7", bpm: "BPM", cuore: "Battito" },
  en: { nome: "Practice on the smartwatch face", titolo: "Practice", salva: "Save the rally", salvato: "Rally saved", kcal: " KCAL", km: " KM", distanza: "2.7", bpm: "BPM", cuore: "Heart rate" },
  fr: { nome: "Entraînement sur le cadran de la montre connectée", titolo: "Entraînement", salva: "Enregistrer l'échange", salvato: "Échange enregistré", kcal: " KCAL", km: " KM", distanza: "2,7", bpm: "BPM", cuore: "Fréquence cardiaque" },
  de: { nome: "Training auf dem Display der Smartwatch", titolo: "Training", salva: "Ballwechsel speichern", salvato: "Ballwechsel gespeichert", kcal: " KCAL", km: " KM", distanza: "2,7", bpm: "BPM", cuore: "Herzfrequenz" },
  es: { nome: "Entrenamiento en la esfera del smartwatch", titolo: "Entrenamiento", salva: "Guardar el punto", salvato: "Punto guardado", kcal: " KCAL", km: " KM", distanza: "2,7", bpm: "BPM", cuore: "Frecuencia cardíaca" },
};

export function WatchAllenamento() {
  const t = useT(T);
  const ora = useOra();
  const [salvato, setSalvato] = useState(false);
  // Il messaggio di conferma sparisce da solo dopo un attimo.
  useEffect(() => {
    if (!salvato) return;
    const id = setTimeout(() => setSalvato(false), 1800);
    return () => clearTimeout(id);
  }, [salvato]);
  // Valori dimostrativi: a regime li dà il sensore dello smartwatch.
  return (
    <Quadrante etichetta={t.nome}>
      <div style={{ position: "absolute", inset: 0, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}><span style={{ color: "#D8F34A" }}>{t.titolo}</span><span className={s.muted}>{ora}</span></div>
        <div className={s.disp} style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>105<span style={{ fontSize: 15, color: "#FF5A5F" }}>{t.kcal}</span></div>
        <div className={s.disp} style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{t.distanza}<span style={{ fontSize: 14, color: "#3D8BFF" }}>{t.km}</span></div>
        <div className={s.disp} style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", gap: 6 }}>154<span style={{ fontSize: 14, color: "#FF5A5F" }}>{t.bpm}</span>
          <span style={{ color: "#FF5A5F" }} role="img" aria-label={t.cuore}><svg width="16" height="16" viewBox="0 0 24 24" fill="#FF5A5F" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" /></svg></span>
        </div>
        <button type="button" className={s.wBtn} onClick={() => setSalvato(true)} aria-live="polite"
          style={{ marginTop: "auto", height: 40, borderRadius: 20, background: "#D8F34A", color: "#0B0B0C", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>{salvato ? t.salvato : t.salva}
        </button>
      </div>
    </Quadrante>
  );
}
