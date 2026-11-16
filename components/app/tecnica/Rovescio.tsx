"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { VideoErroriCorrezioni } from "./VideoErroriCorrezioni";
import s from "./Rovescio.module.css";
import { SVG } from "./Rovescio.svg";

const T = {
  "it": {
    "back": "Indietro",
    "technique_27_videos": "Tecnica · 27 video",
    "backhand": "Rovescio",
    "correct_model_b": "MODELLO CORRETTO · B",
    "the_ai_detected_two_handed": "L'AI ha riconosciuto: rovescio a due mani",
    "applying_the_two_hander_er": "Applico il catalogo errori del bimane",
    "two_hander": "Bimane",
    "split_step": "Split-step",
    "double_grip": "presa doppia",
    "preparation": "Apertura",
    "shoulders_turned": "spalle girate",
    "lag": "Lag",
    "head_down": "testa bassa",
    "contact": "Impatto",
    "arms_extended": "braccia distese",
    "finish": "Chiusura",
    "high": "alta",
    "directions": "DIREZIONI",
    "straight": "DRITTO",
    "depth_to_the_middle": "Profondità al centro",
    "crosscourt": "INCROCIATO",
    "long_safe_crosscourt": "Diagonale lunga, sicura",
    "down_the_line": "LUNGOLINEA",
    "break_to_the_forehand": "Rottura sul diritto",
    "cataloged_errors": "Errori catalogati",
    "video": "Video",
    "passive_non_dominant_hand": "Mano non dominante passiva",
    "insufficient_shoulder_turn": "Rotazione spalle insufficiente",
    "weight_on_the_back_foot": "Peso sul piede posteriore",
    "wrong_distance_from_the_ba": "Distanza sbagliata dalla palla"
  },
  "en": {
    "back": "Back",
    "technique_27_videos": "Technique · 27 videos",
    "backhand": "Backhand",
    "correct_model_b": "CORRECT MODEL · B",
    "the_ai_detected_two_handed": "The AI detected: two-handed backhand",
    "applying_the_two_hander_er": "Applying the two-hander error catalog",
    "two_hander": "Two-hander",
    "split_step": "Split step",
    "double_grip": "double grip",
    "preparation": "Preparation",
    "shoulders_turned": "shoulders turned",
    "lag": "Lag",
    "head_down": "head down",
    "contact": "Contact",
    "arms_extended": "arms extended",
    "finish": "Finish",
    "high": "high",
    "directions": "DIRECTIONS",
    "straight": "STRAIGHT",
    "depth_to_the_middle": "Depth to the middle",
    "crosscourt": "CROSSCOURT",
    "long_safe_crosscourt": "Long, safe crosscourt",
    "down_the_line": "DOWN THE LINE",
    "break_to_the_forehand": "Break to the forehand",
    "cataloged_errors": "Cataloged errors",
    "video": "Video",
    "passive_non_dominant_hand": "Passive non-dominant hand",
    "insufficient_shoulder_turn": "Insufficient shoulder turn",
    "weight_on_the_back_foot": "Weight on the back foot",
    "wrong_distance_from_the_ba": "Wrong distance from the ball"
  }
};

export function Rovescio() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.technique_27_videos}</div><h1 className={s.h1}>{t.backhand}</h1></div></header><div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "22px", overflow: "hidden", flex: "none" }}><svg width="357" height="210" viewBox="0 0 357 210" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><span style={{ position: "absolute", left: "12px", top: "12px", fontSize: "11.5px", fontWeight: "800", color: "#4CD07D", background: "rgba(5,5,5,.78)", border: "1px solid rgba(255,255,255,.12)", padding: "4px 8px", borderRadius: "8px", letterSpacing: ".3px" }}>{t.correct_model_b}</span></div><div className={[s.card, s.pad].join(" ")} style={{ display: "flex", alignItems: "center", gap: "12px" }}><span className={s.ic}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"></path></svg></span><div className={s.grow}><div style={{ fontWeight: "800" }}>{t.the_ai_detected_two_handed}</div><div className={"muted"} style={{ fontSize: "12.5px" }}>{t.applying_the_two_hander_er}</div></div><span className={[s.chip, s.on].join(" ")} style={{ height: "28px" }}>{t.two_hander}</span></div><div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "4px" }}><div style={{ position: "absolute", left: "10%", right: "10%", top: "12px", height: "2px", background: "#2C2C2E" }}></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>1</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.split_step}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.double_grip}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>2</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.preparation}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.shoulders_turned}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>3</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.lag}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.head_down}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>4</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.contact}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.arms_extended}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>5</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.finish}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.high}</span></div></div><div className={s.k}>{t.directions}</div><div className={s.g3}><div className={s.tile}><span>{t.straight}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.depth_to_the_middle}</div></div><div className={s.tile}><span>{t.crosscourt}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.long_safe_crosscourt}</div></div><div className={s.tile}><span>{t.down_the_line}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.break_to_the_forehand}</div></div></div><div className={s.sec}><h2>{t.cataloged_errors}</h2><Link href={ROTTE.LibreriaVideo}>{t.video}</Link></div><div className={s.li}><span className={s.code}>RV-01</span><span className={s.grow}><span className={s.t}>{t.passive_non_dominant_hand}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>RV-02</span><span className={s.grow}><span className={s.t}>{t.insufficient_shoulder_turn}</span></span><span className={s.dot} style={{ background: "#FFD54A" }}></span></div><div className={s.li}><span className={s.code}>RV-03</span><span className={s.grow}><span className={s.t}>{t.weight_on_the_back_foot}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>RV-05</span><span className={s.grow}><span className={s.t}>{t.wrong_distance_from_the_ba}</span></span><span className={s.dot} style={{ background: "#4CD07D" }}></span></div><VideoErroriCorrezioni colpo="rovescio" /></div>
      </div>
    </Schermo>
  );
}
