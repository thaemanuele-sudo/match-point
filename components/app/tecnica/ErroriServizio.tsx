"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { COLORE_TIPO, hrefVideo } from "./etichette";
import { useVideoTecnica } from "./useVideoTecnica";
import { ROTTE } from "@/lib/rotte";
import s from "./ErroriServizio.module.css";

const T = {
  "it": {
    "back": "Indietro",
    "a_movement_errors": "A · Errori di movimento",
    "serve_errors": "Errori del servizio",
    "carica": "Caricamento dei video",
    "nota_corretto": "Apri un errore per vedere la versione corretta accanto a quella sbagliata.",
    "nota_esercizi": "Gli esercizi si aprono dal dettaglio di ogni errore.",
    "esercizi_btn": "Esercizi per il maestro",
    "nessun_video_tipo": "Nessun video in questa sezione.",
    "a_errors": "A · Errori",
    "b_correct": "B · Corretto",
    "c_drills": "C · Esercizi",
    "unstable_ball_toss": "Lancio di palla instabile",
    "u10_and_u12_priority": "priorità U10 e U12",
    "toss": "Lancio",
    "forehand_grip_frying_pan": "Presa di diritto (\"a padella\")",
    "no_slice_or_kick": "niente slice e kick",
    "grip": "Presa",
    "low_elbow_no_racket_drop": "Gomito basso, senza racket drop",
    "stress_on_shoulder_and_elb": "stress su spalla e gomito",
    "preparation": "Preparazione",
    "stiff_legs_no_leg_drive": "Gambe rigide, nessuna spinta",
    "lower_contact": "impatto più basso",
    "feet_balance": "Piedi/equilibrio",
    "early_torso_opening": "Apertura anticipata del busto",
    "ball_in_the_alley": "palla nel corridoio",
    "timing": "Timing",
    "consolidated": "consolidato",
    "in_progress": "in sviluppo",
    "to_monitor": "da monitorare",
    "color_shows_the_under_12_g": "Il colore mostra lo stato del gruppo Under 12. Ogni errore ha il suo video di correzione con lo stesso codice.",
    "ai_metrics_and_thresholds": "Metriche AI e soglie"
  },
  "en": {
    "back": "Back",
    "a_movement_errors": "A · Movement errors",
    "serve_errors": "Serve errors",
    "carica": "Loading videos",
    "nota_corretto": "Open an error to see the correct version next to the wrong one.",
    "nota_esercizi": "Drills open from the detail of each error.",
    "esercizi_btn": "Drills for the coach",
    "nessun_video_tipo": "No videos in this section.",
    "a_errors": "A · Errors",
    "b_correct": "B · Correct",
    "c_drills": "C · Drills",
    "unstable_ball_toss": "Unstable ball toss",
    "u10_and_u12_priority": "U10 and U12 priority",
    "toss": "Toss",
    "forehand_grip_frying_pan": "Forehand grip (\"frying pan\")",
    "no_slice_or_kick": "no slice or kick",
    "grip": "Grip",
    "low_elbow_no_racket_drop": "Low elbow, no racket drop",
    "stress_on_shoulder_and_elb": "stress on shoulder and elbow",
    "preparation": "Preparation",
    "stiff_legs_no_leg_drive": "Stiff legs, no leg drive",
    "lower_contact": "lower contact",
    "feet_balance": "Feet/balance",
    "early_torso_opening": "Early torso opening",
    "ball_in_the_alley": "ball in the alley",
    "timing": "Timing",
    "consolidated": "consolidated",
    "in_progress": "in progress",
    "to_monitor": "to monitor",
    "color_shows_the_under_12_g": "Color shows the Under 12 group status. Each error has its correction video with the same code.",
    "ai_metrics_and_thresholds": "AI metrics and thresholds"
  }
};

export function ErroriServizio() {
  const t = useT(T);
  const [sel, setSel] = useState<"A" | "B" | "C">("A");
  const { video, stato } = useVideoTecnica("servizio");
  // se l'admin ha pubblicato video del servizio mostro quelli veri, altrimenti i dati del disegno
  const reali = stato === "pronto" && video.length > 0;
  const righe = <><Link href={ROTTE.ErroreDettaglio} className={s.li}><span className={s.code}>SV-01</span><span className={s.grow}><span className={s.t}>{t.unstable_ball_toss}</span><span className={s.s} style={{ display: "block" }}>{t.u10_and_u12_priority}</span></span><span className={s.tag}>{t.toss}</span><span className={s.dot} style={{ background: "#FF5A5F" }}></span></Link><Link href={ROTTE.ErroreDettaglio} className={s.li}><span className={s.code}>SV-02</span><span className={s.grow}><span className={s.t}>{t.forehand_grip_frying_pan}</span><span className={s.s} style={{ display: "block" }}>{t.no_slice_or_kick}</span></span><span className={s.tag}>{t.grip}</span><span className={s.dot} style={{ background: "#FF9F43" }}></span></Link><Link href={ROTTE.ErroreDettaglio} className={s.li}><span className={s.code}>SV-03</span><span className={s.grow}><span className={s.t}>{t.low_elbow_no_racket_drop}</span><span className={s.s} style={{ display: "block" }}>{t.stress_on_shoulder_and_elb}</span></span><span className={s.tag}>{t.preparation}</span><span className={s.dot} style={{ background: "#FF9F43" }}></span></Link><Link href={ROTTE.ErroreDettaglio} className={s.li}><span className={s.code}>SV-04</span><span className={s.grow}><span className={s.t}>{t.stiff_legs_no_leg_drive}</span><span className={s.s} style={{ display: "block" }}>{t.lower_contact}</span></span><span className={s.tag}>{t.feet_balance}</span><span className={s.dot} style={{ background: "#FFD54A" }}></span></Link><Link href={ROTTE.ErroreDettaglio} className={s.li}><span className={s.code}>SV-05</span><span className={s.grow}><span className={s.t}>{t.early_torso_opening}</span><span className={s.s} style={{ display: "block" }}>{t.ball_in_the_alley}</span></span><span className={s.tag}>{t.timing}</span><span className={s.dot} style={{ background: "#FFD54A" }}></span></Link></>;
  const veri = video.filter((v) => (sel === "A" ? v.tipo === "errore" : v.tipo === "correzione"));
  const nota = (testo: string, esercizi?: boolean) => (
    <>
      <div className={s.note}>{testo}</div>
      {esercizi && <Link href={ROTTE.EserciziMaestro} className={s.btn2} style={{ flex: "none" }}>{t.esercizi_btn}</Link>}
    </>
  );
  let contenuto: React.ReactNode;
  if (stato === "carica") {
    contenuto = (
      <div role="status" aria-label={t.carica} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={s.sk} style={{ height: 66, borderRadius: 18 }} />)}
      </div>
    );
  } else if (reali) {
    if (sel === "C") contenuto = nota(t.nota_esercizi, true);
    else if (veri.length === 0) contenuto = nota(t.nessun_video_tipo);
    else
      contenuto = veri.map((v) => {
        return (
          <Link key={v.id} href={hrefVideo(v.id)} className={s.li}>
            <span className={s.code}>{v.codice}</span>
            <span className={s.grow}>
              <span className={s.t}>{v.titolo}</span>
              {v.descrizione && <span className={s.s} style={{ display: "block" }}>{v.descrizione}</span>}
            </span>
            {v.fasce?.length > 0 && <span className={s.tag}>{v.fasce.join(" · ")}</span>}
            <span className={s.dot} style={{ background: COLORE_TIPO[v.tipo] }} aria-hidden="true"></span>
          </Link>
        );
      });
  } else if (sel === "A") contenuto = righe;
  else contenuto = nota(sel === "B" ? t.nota_corretto : t.nota_esercizi, sel === "C");
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Servizio} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.a_movement_errors}</div><h1 className={s.h1}>{t.serve_errors}</h1></div></header><div className={s.seg} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>{([["A", t.a_errors], ["B", t.b_correct], ["C", t.c_drills]] as const).map(([k, l]) => (<button key={k} type="button" className={k === sel ? [s.sg, s.on].join(" ") : s.sg} aria-pressed={k === sel} onClick={() => setSel(k)}>{l}</button>))}</div>{contenuto}{!reali && (<div style={{ display: "flex", gap: "12px", fontSize: "12px", fontWeight: "700", flexWrap: "wrap" }}><span style={{ display: "flex", gap: "5px", alignItems: "center" }}><span className={s.dot} style={{ background: "#FF5A5F" }}></span>{t.consolidated}</span><span style={{ display: "flex", gap: "5px", alignItems: "center" }}><span className={s.dot} style={{ background: "#FF9F43" }}></span>{t.in_progress}</span><span style={{ display: "flex", gap: "5px", alignItems: "center" }}><span className={s.dot} style={{ background: "#FFD54A" }}></span>{t.to_monitor}</span></div>)}<div className={s.note}>{t.color_shows_the_under_12_g}</div><Link href={ROTTE.MetricheAI} className={s.btn2} style={{ flex: "none" }}>{t.ai_metrics_and_thresholds}</Link></div>
      </div>
    </Schermo>
  );
}
