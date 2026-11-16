"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { VideoErroriCorrezioni } from "./VideoErroriCorrezioni";
import s from "./Back.module.css";
import { SVG } from "./Back.svg";

const T = {
  "it": {
    "back": "Indietro",
    "technique_variation_and_de": "Tecnica · variazione e difesa",
    "slice": "Back (slice)",
    "correct_model_b": "MODELLO CORRETTO · B",
    "split_step": "Split-step",
    "continental": "continental",
    "preparation": "Apertura",
    "racket_high": "racchetta alta",
    "contact": "Impatto",
    "open_face": "piatto aperto",
    "follow_through": "Accompagno",
    "high_to_low": "alto verso basso",
    "directions": "DIREZIONI",
    "straight": "DRITTO",
    "breaks_the_rhythm": "Rompe il ritmo",
    "crosscourt": "INCROCIATO",
    "defense_and_change": "Difesa e cambio",
    "down_the_line": "LUNGOLINEA",
    "chip_and_charge": "Chip and charge",
    "cataloged_errors": "Errori catalogati",
    "video": "Video",
    "racket_starting_from_below": "Racchetta che parte dal basso",
    "racket_face_too_open": "Piatto troppo aperto",
    "wrist_stroke_chop": "Colpo di polso (chop)",
    "stiff_knees": "Ginocchia rigide",
    "torso_opening_up": "Busto che si apre"
  },
  "en": {
    "back": "Back",
    "technique_variation_and_de": "Technique · variation and defense",
    "slice": "Slice",
    "correct_model_b": "CORRECT MODEL · B",
    "split_step": "Split step",
    "continental": "continental",
    "preparation": "Preparation",
    "racket_high": "racket high",
    "contact": "Contact",
    "open_face": "open face",
    "follow_through": "Follow-through",
    "high_to_low": "high to low",
    "directions": "DIRECTIONS",
    "straight": "STRAIGHT",
    "breaks_the_rhythm": "Breaks the rhythm",
    "crosscourt": "CROSSCOURT",
    "defense_and_change": "Defense and change",
    "down_the_line": "DOWN THE LINE",
    "chip_and_charge": "Chip and charge",
    "cataloged_errors": "Cataloged errors",
    "video": "Video",
    "racket_starting_from_below": "Racket starting from below",
    "racket_face_too_open": "Racket face too open",
    "wrist_stroke_chop": "Wrist stroke (chop)",
    "stiff_knees": "Stiff knees",
    "torso_opening_up": "Torso opening up"
  },
  "fr": {
    "back": "Retour",
    "technique_variation_and_de": "Technique · variation et défense",
    "slice": "Slice (revers coupé)",
    "correct_model_b": "MODÈLE CORRECT · B",
    "split_step": "Split-step",
    "continental": "continentale",
    "preparation": "Préparation",
    "racket_high": "raquette haute",
    "contact": "Impact",
    "open_face": "tamis ouvert",
    "follow_through": "Accompagnement",
    "high_to_low": "de haut en bas",
    "directions": "DIRECTIONS",
    "straight": "DROIT",
    "breaks_the_rhythm": "Casse le rythme",
    "crosscourt": "CROISÉ",
    "defense_and_change": "Défense et changement",
    "down_the_line": "LE LONG DE LA LIGNE",
    "chip_and_charge": "Chip and charge",
    "cataloged_errors": "Erreurs cataloguées",
    "video": "Vidéo",
    "racket_starting_from_below": "Raquette qui part du bas",
    "racket_face_too_open": "Tamis trop ouvert",
    "wrist_stroke_chop": "Coup de poignet (chop)",
    "stiff_knees": "Genoux raides",
    "torso_opening_up": "Buste qui s'ouvre"
  },
  "de": {
    "back": "Zurück",
    "technique_variation_and_de": "Technik · Variation und Verteidigung",
    "slice": "Slice",
    "correct_model_b": "KORREKTES MODELL · B",
    "split_step": "Split-Step",
    "continental": "Kontinental",
    "preparation": "Vorbereitung",
    "racket_high": "Schläger hoch",
    "contact": "Kontakt",
    "open_face": "offenes Schlägerblatt",
    "follow_through": "Ausschwung",
    "high_to_low": "von oben nach unten",
    "directions": "RICHTUNGEN",
    "straight": "GERADE",
    "breaks_the_rhythm": "Bricht den Rhythmus",
    "crosscourt": "CROSS",
    "defense_and_change": "Verteidigung und Wechsel",
    "down_the_line": "LONGLINE",
    "chip_and_charge": "Chip and Charge",
    "cataloged_errors": "Katalogisierte Fehler",
    "video": "Video",
    "racket_starting_from_below": "Schläger kommt von unten",
    "racket_face_too_open": "Schlägerblatt zu offen",
    "wrist_stroke_chop": "Handgelenkschlag (Chop)",
    "stiff_knees": "Steife Knie",
    "torso_opening_up": "Oberkörper öffnet sich"
  },
  "es": {
    "back": "Atrás",
    "technique_variation_and_de": "Técnica · variación y defensa",
    "slice": "Cortado (slice)",
    "correct_model_b": "MODELO CORRECTO · B",
    "split_step": "Split step",
    "continental": "continental",
    "preparation": "Preparación",
    "racket_high": "raqueta alta",
    "contact": "Impacto",
    "open_face": "cordaje abierto",
    "follow_through": "Acompañamiento",
    "high_to_low": "de arriba abajo",
    "directions": "DIRECCIONES",
    "straight": "RECTO",
    "breaks_the_rhythm": "Rompe el ritmo",
    "crosscourt": "CRUZADO",
    "defense_and_change": "Defensa y cambio",
    "down_the_line": "PARALELO",
    "chip_and_charge": "Chip and charge",
    "cataloged_errors": "Errores catalogados",
    "video": "Vídeo",
    "racket_starting_from_below": "Raqueta que sale desde abajo",
    "racket_face_too_open": "Cordaje demasiado abierto",
    "wrist_stroke_chop": "Golpe de muñeca (chop)",
    "stiff_knees": "Rodillas rígidas",
    "torso_opening_up": "Tronco que se abre"
  }
};

export function Back() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.technique_variation_and_de}</div><h1 className={s.h1}>{t.slice}</h1></div></header><div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "22px", overflow: "hidden", flex: "none" }}><svg width="357" height="210" viewBox="0 0 357 210" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><span style={{ position: "absolute", left: "12px", top: "12px", fontSize: "11.5px", fontWeight: "800", color: "#4CD07D", background: "rgba(5,5,5,.78)", border: "1px solid rgba(255,255,255,.12)", padding: "4px 8px", borderRadius: "8px", letterSpacing: ".3px" }}>{t.correct_model_b}</span></div><div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "4px" }}><div style={{ position: "absolute", left: "10%", right: "10%", top: "12px", height: "2px", background: "#2C2C2E" }}></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>1</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.split_step}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.continental}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>2</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.preparation}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.racket_high}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>3</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.contact}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.open_face}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>4</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.follow_through}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.high_to_low}</span></div></div><div className={s.k}>{t.directions}</div><div className={s.g3}><div className={s.tile}><span>{t.straight}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.breaks_the_rhythm}</div></div><div className={s.tile}><span>{t.crosscourt}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.defense_and_change}</div></div><div className={s.tile}><span>{t.down_the_line}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.chip_and_charge}</div></div></div><div className={s.sec}><h2>{t.cataloged_errors}</h2><Link href={ROTTE.LibreriaVideo}>{t.video}</Link></div><div className={s.li}><span className={s.code}>BK-01</span><span className={s.grow}><span className={s.t}>{t.racket_starting_from_below}</span></span><span className={s.dot} style={{ background: "#FF5A5F" }}></span></div><div className={s.li}><span className={s.code}>BK-02</span><span className={s.grow}><span className={s.t}>{t.racket_face_too_open}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>BK-03</span><span className={s.grow}><span className={s.t}>{t.wrist_stroke_chop}</span></span><span className={s.dot} style={{ background: "#FFD54A" }}></span></div><div className={s.li}><span className={s.code}>BK-04</span><span className={s.grow}><span className={s.t}>{t.stiff_knees}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>BK-05</span><span className={s.grow}><span className={s.t}>{t.torso_opening_up}</span></span><span className={s.dot} style={{ background: "#FFD54A" }}></span></div><VideoErroriCorrezioni colpo="back" /></div>
      </div>
    </Schermo>
  );
}
