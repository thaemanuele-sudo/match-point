"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { VideoErroriCorrezioni } from "./VideoErroriCorrezioni";
import s from "./Smash.module.css";
import { SVG } from "./Smash.svg";

const T = {
  "it": {
    "back": "Indietro",
    "technique_answer_to_the_lo": "Tecnica · risposta al pallonetto",
    "overhead": "Smash",
    "correct_model_b": "MODELLO CORRETTO · B",
    "recognize": "Riconosci",
    "lob_coming": "lob in arrivo",
    "trophy": "Trophy",
    "guide_arm": "braccio guida",
    "steps": "Passi",
    "shuffle": "scivolati",
    "contact": "Impatto",
    "scissor_kick": "sforbiciata",
    "finish": "Chiusura",
    "recovery": "recupero",
    "directions": "DIREZIONI",
    "straight": "DRITTO",
    "deep_lob": "Lob profondo",
    "crosscourt": "INCROCIATO",
    "short_lob_put_it_away": "Lob corto, chiudi",
    "down_the_line": "LUNGOLINEA",
    "opponent_out_of_position": "Avversario spostato",
    "cataloged_errors": "Errori catalogati",
    "video": "Video",
    "running_back_facing_forwar": "Corsa all'indietro frontale",
    "no_guide_arm": "Braccio guida assente",
    "contact_behind_the_head": "Impatto dietro la testa",
    "flat_feet": "Piedi fermi",
    "late_racket": "Racchetta in ritardo"
  },
  "en": {
    "back": "Back",
    "technique_answer_to_the_lo": "Technique · answer to the lob",
    "overhead": "Overhead",
    "correct_model_b": "CORRECT MODEL · B",
    "recognize": "Recognize",
    "lob_coming": "lob coming",
    "trophy": "Trophy",
    "guide_arm": "guide arm",
    "steps": "Steps",
    "shuffle": "shuffle",
    "contact": "Contact",
    "scissor_kick": "scissor kick",
    "finish": "Finish",
    "recovery": "recovery",
    "directions": "DIRECTIONS",
    "straight": "STRAIGHT",
    "deep_lob": "Deep lob",
    "crosscourt": "CROSSCOURT",
    "short_lob_put_it_away": "Short lob, put it away",
    "down_the_line": "DOWN THE LINE",
    "opponent_out_of_position": "Opponent out of position",
    "cataloged_errors": "Cataloged errors",
    "video": "Video",
    "running_back_facing_forwar": "Running back facing forward",
    "no_guide_arm": "No guide arm",
    "contact_behind_the_head": "Contact behind the head",
    "flat_feet": "Flat feet",
    "late_racket": "Late racket"
  }
};

export function Smash() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.technique_answer_to_the_lo}</div><h1 className={s.h1}>{t.overhead}</h1></div></header><div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "22px", overflow: "hidden", flex: "none" }}><svg width="357" height="210" viewBox="0 0 357 210" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><span style={{ position: "absolute", left: "12px", top: "12px", fontSize: "11.5px", fontWeight: "800", color: "#4CD07D", background: "rgba(5,5,5,.78)", border: "1px solid rgba(255,255,255,.12)", padding: "4px 8px", borderRadius: "8px", letterSpacing: ".3px" }}>{t.correct_model_b}</span></div><div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "4px" }}><div style={{ position: "absolute", left: "10%", right: "10%", top: "12px", height: "2px", background: "#2C2C2E" }}></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>1</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.recognize}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.lob_coming}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>2</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.trophy}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.guide_arm}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>3</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.steps}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.shuffle}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>4</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.contact}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.scissor_kick}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>5</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.finish}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.recovery}</span></div></div><div className={s.k}>{t.directions}</div><div className={s.g3}><div className={s.tile}><span>{t.straight}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.deep_lob}</div></div><div className={s.tile}><span>{t.crosscourt}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.short_lob_put_it_away}</div></div><div className={s.tile}><span>{t.down_the_line}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.opponent_out_of_position}</div></div></div><div className={s.sec}><h2>{t.cataloged_errors}</h2><Link href={ROTTE.LibreriaVideo}>{t.video}</Link></div><div className={s.li}><span className={s.code}>SM-01</span><span className={s.grow}><span className={s.t}>{t.running_back_facing_forwar}</span></span><span className={s.dot} style={{ background: "#FF5A5F" }}></span></div><div className={s.li}><span className={s.code}>SM-02</span><span className={s.grow}><span className={s.t}>{t.no_guide_arm}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>SM-03</span><span className={s.grow}><span className={s.t}>{t.contact_behind_the_head}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>SM-04</span><span className={s.grow}><span className={s.t}>{t.flat_feet}</span></span><span className={s.dot} style={{ background: "#FFD54A" }}></span></div><div className={s.li}><span className={s.code}>SM-05</span><span className={s.grow}><span className={s.t}>{t.late_racket}</span></span><span className={s.dot} style={{ background: "#FFD54A" }}></span></div><VideoErroriCorrezioni colpo="smash" /></div>
      </div>
    </Schermo>
  );
}
