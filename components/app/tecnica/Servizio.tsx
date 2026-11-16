"use client";
import Link from "next/link";
import { useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { VideoErroriCorrezioni } from "./VideoErroriCorrezioni";
import s from "./Servizio.module.css";
import { SVG } from "./Servizio.svg";

const T = {
  "it": {
    "back": "Indietro",
    "technique_24_videos": "Tecnica · 24 video",
    "serve": "Servizio",
    "n_120_fps_sequence": "SEQUENZA A 120 FPS",
    "stance": "Posizione",
    "feet_and_shoulders": "piedi e spalle",
    "trophy": "Trophy",
    "knees_bent": "ginocchia flesse",
    "upload": "Caricamento",
    "racket_drop": "racket drop",
    "contact": "Impatto",
    "extension": "estensione",
    "finish": "Chiusura",
    "landing": "atterraggio",
    "variant": "VARIANTE",
    "execution": "ESECUZIONE",
    "effect_on_the_ball": "EFFETTO SULLA PALLA",
    "when": "QUANDO",
    "serve_errors": "Errori del servizio"
  },
  "en": {
    "back": "Back",
    "technique_24_videos": "Technique · 24 videos",
    "serve": "Serve",
    "n_120_fps_sequence": "120 FPS SEQUENCE",
    "stance": "Stance",
    "feet_and_shoulders": "feet and shoulders",
    "trophy": "Trophy",
    "knees_bent": "knees bent",
    "upload": "Upload",
    "racket_drop": "racket drop",
    "contact": "Contact",
    "extension": "extension",
    "finish": "Finish",
    "landing": "landing",
    "variant": "VARIANT",
    "execution": "EXECUTION",
    "effect_on_the_ball": "EFFECT ON THE BALL",
    "when": "WHEN",
    "serve_errors": "Serve errors"
  },
  "fr": {
    "back": "Retour",
    "technique_24_videos": "Technique · 24 vidéos",
    "serve": "Service",
    "n_120_fps_sequence": "SÉQUENCE À 120 FPS",
    "stance": "Position",
    "feet_and_shoulders": "pieds et épaules",
    "trophy": "Trophy",
    "knees_bent": "genoux fléchis",
    "upload": "Chargement",
    "racket_drop": "racket drop",
    "contact": "Impact",
    "extension": "extension",
    "finish": "Finition",
    "landing": "réception",
    "variant": "VARIANTE",
    "execution": "EXÉCUTION",
    "effect_on_the_ball": "EFFET SUR LA BALLE",
    "when": "QUAND",
    "serve_errors": "Erreurs au service"
  },
  "de": {
    "back": "Zurück",
    "technique_24_videos": "Technik · 24 Videos",
    "serve": "Aufschlag",
    "n_120_fps_sequence": "SEQUENZ MIT 120 FPS",
    "stance": "Ausgangsposition",
    "feet_and_shoulders": "Füße und Schultern",
    "trophy": "Trophy",
    "knees_bent": "Knie gebeugt",
    "upload": "Hochladen",
    "racket_drop": "Racket Drop",
    "contact": "Kontakt",
    "extension": "Streckung",
    "finish": "Ausschwung",
    "landing": "Landung",
    "variant": "VARIANTE",
    "execution": "AUSFÜHRUNG",
    "effect_on_the_ball": "WIRKUNG AUF DEN BALL",
    "when": "WANN",
    "serve_errors": "Aufschlagfehler"
  },
  "es": {
    "back": "Atrás",
    "technique_24_videos": "Técnica · 24 vídeos",
    "serve": "Saque",
    "n_120_fps_sequence": "SECUENCIA A 120 FPS",
    "stance": "Posición",
    "feet_and_shoulders": "pies y hombros",
    "trophy": "Trophy",
    "knees_bent": "rodillas flexionadas",
    "upload": "Subiendo",
    "racket_drop": "racket drop",
    "contact": "Impacto",
    "extension": "extensión",
    "finish": "Terminación",
    "landing": "caída",
    "variant": "VARIANTE",
    "execution": "EJECUCIÓN",
    "effect_on_the_ball": "EFECTO EN LA BOLA",
    "when": "CUÁNDO",
    "serve_errors": "Errores del saque"
  }
};

type Variante = "piatto" | "slice" | "kick";
// Dati dimostrativi delle tre varianti; tx è la posizione (in x) della palla nel quadrato di battuta
const VARIANTI = [
  {
    k: "piatto" as Variante, tx: 56,
    it: { label: "Piatto", e: "Impatto dietro la palla (ore 12), lancio avanti e a destra", f: "Massima velocità, rimbalzo basso", q: "Prima di servizio, campi veloci" },
    en: { label: "Flat", e: "Contact behind the ball (12 o'clock), toss forward and right", f: "Max speed, low bounce", q: "First serve, fast courts" },
    fr: { label: "Plat", e: "Impact derrière la balle (12 h), lancer devant et à droite", f: "Vitesse maximale, rebond bas", q: "Première balle, surfaces rapides" },
    de: { label: "Flach", e: "Treffpunkt hinter dem Ball (12 Uhr), Ballwurf nach vorn und rechts", f: "Maximales Tempo, niedriger Absprung", q: "Erster Aufschlag, schnelle Plätze" },
    es: { label: "Plano", e: "Impacto detrás de la bola (las 12), lanzamiento adelante y a la derecha", f: "Máxima velocidad, bote bajo", q: "Primer saque, pistas rápidas" },
  },
  {
    k: "slice" as Variante, tx: 92,
    it: { label: "Slice", e: "Impatto sul lato esterno (ore 3), lancio più a destra", f: "Curva laterale, esce dal campo", q: "Esterno lato parità" },
    en: { label: "Slice", e: "Contact on the outer side (3 o'clock), toss further right", f: "Sideways curve, pulls out wide", q: "Wide on the deuce side" },
    fr: { label: "Slice", e: "Impact sur le côté extérieur (3 h), lancer plus à droite", f: "Courbe latérale, sort du court", q: "Extérieur côté égalité" },
    de: { label: "Slice", e: "Treffpunkt an der Außenseite (3 Uhr), Ballwurf weiter rechts", f: "Seitliche Kurve, läuft aus dem Feld", q: "Außen, Deuce-Seite" },
    es: { label: "Slice", e: "Impacto en el lado exterior (las 3), lanzamiento más a la derecha", f: "Curva lateral, sale de la pista", q: "Abierto lado de iguales" },
  },
  {
    k: "kick" as Variante, tx: 74,
    it: { label: "Kick", e: "Spazzolata da ore 7 a ore 1, schiena inarcata", f: "Parabola alta, rimbalzo alto sul rovescio", q: "Seconda di servizio, terra rossa" },
    en: { label: "Kick", e: "Brush from 7 to 1 o'clock, arched back", f: "High arc, high bounce to the backhand", q: "Second serve, clay" },
    fr: { label: "Kick", e: "Brossage de 7 h à 1 h, dos cambré", f: "Trajectoire haute, rebond haut sur le revers", q: "Seconde balle, terre battue" },
    de: { label: "Kick", e: "Bürstenschlag von 7 bis 1 Uhr, Rücken durchgebogen", f: "Hoher Bogen, hoher Absprung zur Rückhand", q: "Zweiter Aufschlag, Sand" },
    es: { label: "Kick", e: "Cepillado de las 7 a la 1, espalda arqueada", f: "Parábola alta, bote alto al revés", q: "Segundo saque, tierra batida" },
  },
];

export function Servizio() {
  const t = useT(T);
  const { lang } = useLang();
  const [v, setV] = useState<Variante>("piatto");
  const dati = VARIANTI.find((x) => x.k === v) ?? VARIANTI[0];
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "12px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.technique_24_videos}</div><h1 className={s.h1}>{t.serve}</h1></div></header><div className={s.lab} style={{ position: "relative", height: "200px", borderRadius: "22px", overflow: "hidden", flex: "none" }}><svg width="357" height="200" viewBox="0 0 357 200" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><span style={{ position: "absolute", left: "12px", top: "12px", fontSize: "11.5px", fontWeight: "800", color: "#F3F6F1", background: "rgba(5,5,5,.78)", border: "1px solid rgba(255,255,255,.12)", padding: "4px 8px", borderRadius: "8px", letterSpacing: ".3px" }}>{t.n_120_fps_sequence}</span></div><div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "4px" }}><div style={{ position: "absolute", left: "10%", right: "10%", top: "12px", height: "2px", background: "#2C2C2E" }}></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>1</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.stance}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.feet_and_shoulders}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>2</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.trophy}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.knees_bent}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>3</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.upload}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.racket_drop}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>4</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.contact}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.extension}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>5</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.finish}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.landing}</span></div></div><div className={s.k}>{t.variant}</div><div className={s.seg} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>{VARIANTI.map((c) => (<button key={c.k} type="button" className={c.k === v ? [s.sg, s.on].join(" ") : s.sg} aria-pressed={c.k === v} onClick={() => setV(c.k)}>{c[lang].label}</button>))}</div><div style={{ display: "flex", gap: "12px" }}><svg width="110" height="150" viewBox="0 0 110 150" aria-hidden="true" style={{ flex: "none", borderRadius: "14px", background: "repeating-linear-gradient(0deg,#1E6A44 0 18px,#24764C 18px 36px)" }}><rect x="10" y="10" width="90" height="130" fill="none" stroke="#fff" strokeWidth="2"></rect><path d="M55 10v130M10 75h90" stroke="#fff" strokeWidth="2"></path><circle cx={dati.tx} cy="48" r="11" fill="#D8F34A"></circle></svg><div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "0" }}><div><div className={s.k}>{t.execution}</div><div className={s.v}>{dati[lang].e}</div></div><div><div className={s.k}>{t.effect_on_the_ball}</div><div className={s.v}>{dati[lang].f}</div></div><div><div className={s.k}>{t.when}</div><div className={s.v}>{dati[lang].q}</div></div></div></div><Link href={ROTTE.ErroriServizio} className={s.btn}>{t.serve_errors}</Link><VideoErroriCorrezioni colpo="servizio" /></div>
      </div>
    </Schermo>
  );
}
