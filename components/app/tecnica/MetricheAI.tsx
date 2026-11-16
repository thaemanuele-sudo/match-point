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
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.ErroriServizio} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.serve_how_the_ai_measures}</div><h1 className={s.h1}>{t.metrics_and_thresholds}</h1></div></header><div className={s.seg} style={{ gridTemplateColumns: "repeat(6,minmax(0,1fr))" }}>{COLPI_SIGLA.map((l) => (<button key={l} type="button" className={l === sel ? [s.sg, s.on].join(" ") : s.sg} aria-pressed={l === sel} onClick={() => setSel(l)}>{l}</button>))}</div><div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "800", padding: "0 4px" }}><span style={{ color: "#4CD07D" }}>{t.green}</span><span style={{ color: "#FFB547" }}>{t.yellow_orange}</span><span style={{ color: "#FF7A7D" }}>{t.red}</span></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.unstable_toss}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.toss_spread_over_10_serves}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 15 cm"}</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>15-30 cm</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"> 30 cm"}</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.low_elbow}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.elbow_shoulder_angle_at_tr}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>≥ 85°</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>70-85°</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 70°"}</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.stiff_legs}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.knee_bend_at_trophy}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>≥ 25°</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>15-25°</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 15°"}</span></div></div><div className={s.card} style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}><div><div style={{ fontWeight: "800" }}>{t.low_contact}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.contact_height_body_height}</div></div><div className={s.g3} style={{ gap: "6px" }}><span style={{ background: "#12301E", color: "#4CD07D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>≥ 1,45</span><span style={{ background: "#2E2410", color: "#FFB547", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>1,35-1,45</span><span style={{ background: "#2A1214", color: "#FF7A7D", borderRadius: "10px", padding: "6px", textAlign: "center", fontWeight: "800", fontSize: "13px" }}>{"< 1,35"}</span></div></div><div className={s.note}>{t.proposed_thresholds_to_be_}</div></div>
      </div>
    </Schermo>
  );
}
