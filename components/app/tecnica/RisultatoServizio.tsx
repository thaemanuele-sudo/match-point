"use client";
import Link from "next/link";
import { useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./RisultatoServizio.module.css";
import { SVG } from "./RisultatoServizio.svg";

const T = {
  "it": {
    "back": "Indietro",
    "serve_no_15_giulia": "Servizio n. 15 · Giulia",
    "great_serve": "Ottimo servizio",
    "angle": "angolo",
    "cm_over_the_net": "cm sopra la rete",
    "voice_tutorial": "Tutorial voce",
    "stats": "Statistiche",
    "next_serve": "Servizio successivo"
  },
  "en": {
    "back": "Back",
    "serve_no_15_giulia": "Serve no. 15 · Giulia",
    "great_serve": "Great serve",
    "angle": "angle",
    "cm_over_the_net": "cm over the net",
    "voice_tutorial": "Voice tutorial",
    "stats": "Stats",
    "next_serve": "Next serve"
  },
  "fr": {
    "back": "Retour",
    "serve_no_15_giulia": "Service n° 15 · Giulia",
    "great_serve": "Excellent service",
    "angle": "angle",
    "cm_over_the_net": "cm au-dessus du filet",
    "voice_tutorial": "Tutoriel vocal",
    "stats": "Statistiques",
    "next_serve": "Service suivant"
  },
  "de": {
    "back": "Zurück",
    "serve_no_15_giulia": "Aufschlag Nr. 15 · Giulia",
    "great_serve": "Super Aufschlag",
    "angle": "Winkel",
    "cm_over_the_net": "cm über dem Netz",
    "voice_tutorial": "Sprach-Tutorial",
    "stats": "Statistiken",
    "next_serve": "Nächster Aufschlag"
  },
  "es": {
    "back": "Atrás",
    "serve_no_15_giulia": "Saque n.º 15 · Giulia",
    "great_serve": "Excelente saque",
    "angle": "ángulo",
    "cm_over_the_net": "cm sobre la red",
    "voice_tutorial": "Tutorial de voz",
    "stats": "Estadísticas",
    "next_serve": "Saque siguiente"
  }
};

export function RisultatoServizio() {
  const t = useT(T);
  // 3D / 2D: nel disegno è solo il selettore della vista
  const [vista, setVista] = useState<"3D" | "2D">("3D");
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "12px" }}><header className={s.hdr}><Link href={ROTTE.Velocita} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.serve_no_15_giulia}</div><h1 className={s.h1}>{t.great_serve}</h1></div><span style={{ color: "#D8F34A" }}><svg width="26" height="26" viewBox="0 0 24 24" fill="#D8F34A" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"></path></svg></span></header><div style={{ borderRadius: "24px", height: "230px", background: "radial-gradient(circle at 50% 0,#173A2A,#050505 75%)", position: "relative", overflow: "hidden" }}><svg width="357" height="230" viewBox="0 0 357 230" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><div style={{ position: "absolute", right: "10px", bottom: "10px" }} className={s.seg}>{(["3D", "2D"] as const).map((v) => (<button key={v} type="button" className={v === vista ? [s.sg, s.on].join(" ") : s.sg} style={{ padding: "0 12px" }} aria-pressed={v === vista} onClick={() => setVista(v)}>{v}</button>))}</div></div><div className={s.g3}><div className={s.tile} style={{ textAlign: "center" }}><b style={{ fontSize: "40px" }}>136</b><span>km/h</span></div><div className={s.tile} style={{ textAlign: "center" }}><b style={{ fontSize: "40px", color: "#F3F6F1" }}>13°</b><span>{t.angle}</span></div><div className={s.tile} style={{ textAlign: "center" }}><b style={{ fontSize: "40px", color: "#F3F6F1" }}>84</b><span>{t.cm_over_the_net}</span></div></div><div className={s.g2}><Link href={ROTTE.Vocale} className={s.btn2}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"></path><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"></path></svg>{t.voice_tutorial}</Link><Link href={ROTTE.Velocita} className={s.btn2}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path></svg>{t.stats}</Link></div><button type="button" className={s.btn}>{t.next_serve}</button></div>
      </div>
    </Schermo>
  );
}
