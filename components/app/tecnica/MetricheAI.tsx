"use client";
import Link from "next/link";
import { useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./MetricheAI.module.css";

const T = {
  "it": {
    "back": "Indietro",
    "sog_alta": "≥ 1,45", "sog_media": "1,35-1,45", "sog_bassa": "< 1,35",
    "serve_how_the_ai_measures": "Servizio · come misura l'AI",
    "metrics_and_thresholds": "Metriche e soglie",
    "green": "VERDE",
    "yellow_orange": "GIALLO / ARANCIO",
    "red": "ROSSO",
    "unstable_toss": "Lancio instabile",
    "toss_spread_over_10_serves": "Dispersione del lancio su 10 servizi",
    "low_elbow": "Gomito basso",
    "elbow_shoulder_angle_at_tr": "Angolo gomito/spalla al trophy",
    "stiff_legs": "Gambe rigide",
    "knee_bend_at_trophy": "Flessione ginocchio al trophy",
    "low_contact": "Impatto basso",
    "contact_height_body_height": "Altezza impatto / statura",
    "proposed_thresholds_to_be_": "Soglie proposte, da calibrare con i maestri sul dataset pilota. L'indice tiene conto dell'età."
  },
  "en": {
    "back": "Back",
    "sog_alta": "≥ 1.45", "sog_media": "1.35-1.45", "sog_bassa": "< 1.35",
    "serve_how_the_ai_measures": "Serve · how the AI measures",
    "metrics_and_thresholds": "Metrics and thresholds",
    "green": "GREEN",
    "yellow_orange": "YELLOW / ORANGE",
    "red": "RED",
    "unstable_toss": "Unstable toss",
    "toss_spread_over_10_serves": "Toss spread over 10 serves",
    "low_elbow": "Low elbow",
    "elbow_shoulder_angle_at_tr": "Elbow/shoulder angle at trophy",
    "stiff_legs": "Stiff legs",
    "knee_bend_at_trophy": "Knee bend at trophy",
    "low_contact": "Low contact",
    "contact_height_body_height": "Contact height / body height",
    "proposed_thresholds_to_be_": "Proposed thresholds, to be calibrated with coaches on the pilot dataset. The index accounts for age."
  },
  "fr": {
    "back": "Retour",
    "sog_alta": "≥ 1,45", "sog_media": "1,35-1,45", "sog_bassa": "< 1,35",
    "serve_how_the_ai_measures": "Service · comment l'IA mesure",
    "metrics_and_thresholds": "Métriques et seuils",
    "green": "VERT",
    "yellow_orange": "JAUNE / ORANGE",
    "red": "ROUGE",
    "unstable_toss": "Lancer instable",
    "toss_spread_over_10_serves": "Dispersion du lancer sur 10 services",
    "low_elbow": "Coude bas",
    "elbow_shoulder_angle_at_tr": "Angle coude/épaule en trophy",
    "stiff_legs": "Jambes raides",
    "knee_bend_at_trophy": "Flexion du genou en trophy",
    "low_contact": "Impact bas",
    "contact_height_body_height": "Hauteur d'impact / taille",
    "proposed_thresholds_to_be_": "Seuils proposés, à calibrer avec les entraîneurs sur le jeu de données pilote. L'indice tient compte de l'âge."
  },
  "de": {
    "back": "Zurück",
    "sog_alta": "≥ 1,45", "sog_media": "1,35-1,45", "sog_bassa": "< 1,35",
    "serve_how_the_ai_measures": "Aufschlag · So misst die KI",
    "metrics_and_thresholds": "Metriken und Schwellenwerte",
    "green": "GRÜN",
    "yellow_orange": "GELB / ORANGE",
    "red": "ROT",
    "unstable_toss": "Unsicherer Wurf",
    "toss_spread_over_10_serves": "Streuung des Wurfs bei 10 Aufschlägen",
    "low_elbow": "Ellbogen tief",
    "elbow_shoulder_angle_at_tr": "Winkel Ellbogen/Schulter in Trophy-Position",
    "stiff_legs": "Steife Beine",
    "knee_bend_at_trophy": "Kniebeugung in Trophy-Position",
    "low_contact": "Tiefer Treffpunkt",
    "contact_height_body_height": "Treffpunkthöhe / Körpergröße",
    "proposed_thresholds_to_be_": "Vorgeschlagene Schwellenwerte, mit den Trainern am Pilotdatensatz zu kalibrieren. Der Index berücksichtigt das Alter."
  },
  "es": {
    "back": "Atrás",
    "sog_alta": "≥ 1,45", "sog_media": "1,35-1,45", "sog_bassa": "< 1,35",
    "serve_how_the_ai_measures": "Saque · cómo mide la IA",
    "metrics_and_thresholds": "Métricas y umbrales",
    "green": "VERDE",
    "yellow_orange": "AMARILLO / NARANJA",
    "red": "ROJO",
    "unstable_toss": "Lanzamiento inestable",
    "toss_spread_over_10_serves": "Dispersión del lanzamiento en 10 saques",
    "low_elbow": "Codo bajo",
    "elbow_shoulder_angle_at_tr": "Ángulo codo/hombro en el trophy",
    "stiff_legs": "Piernas rígidas",
    "knee_bend_at_trophy": "Flexión de rodilla en el trophy",
    "low_contact": "Impacto bajo",
    "contact_height_body_height": "Altura de impacto / estatura",
    "proposed_thresholds_to_be_": "Umbrales propuestos, por calibrar con los entrenadores en el dataset piloto. El índice tiene en cuenta la edad."
  }
};

const COLPI_SIGLA = ["SV", "DR", "RV", "BK", "VO", "SM"];

export function MetricheAI() {
  const t = useT(T);
  // sigla del colpo scelto: nel disegno le soglie mostrate sono quelle del servizio
  const [sel, setSel] = useState("SV");
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.ErroriServizio} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.serve_how_the_ai_measures}</div><h1 className={s.h1}>{t.metrics_and_thresholds}</h1></div></header><div className={s.seg} style={{ gridTemplateColumns: "repeat(6,minmax(0,1fr))" }}>{COLPI_SIGLA.map((l) => (<button key={l} type="button" className={l === sel ? [s.sg, s.on].join(" ") : s.sg} aria-pressed={l === sel} onClick={() => setSel(l)}>{l}</button>))}</div><div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "800", padding: "0 4px" }}><span style={{ color: "#4CD07D" }}>{t.green}</span><span style={{ color: "#FFB547" }}>{t.yellow_orange}</span><span style={{ color: "#FF7A7D" }}>{t.red}</span></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.unstable_toss}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.toss_spread_over_10_serves}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 15 cm"}</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>15-30 cm</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"> 30 cm"}</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.low_elbow}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.elbow_shoulder_angle_at_tr}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>≥ 85°</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>70-85°</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 70°"}</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.stiff_legs}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.knee_bend_at_trophy}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>≥ 25°</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>15-25°</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 15°"}</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.low_contact}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.contact_height_body_height}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{t.sog_alta}</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{t.sog_media}</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{t.sog_bassa}</span></div></div><div className={s.note}>{t.proposed_thresholds_to_be_}</div></div>
      </div>
    </Schermo>
  );
}
