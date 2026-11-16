"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./BaseComune.module.css";
import { SVG } from "./BaseComune.svg";

const T = {
  "it": {
    "back": "Indietro",
    "common_base_of_all_strokes": "Base comune di tutti i colpi",
    "preparation_and_backswing": "Apertura e preparazione",
    "ready": "Attesa",
    "heels_up": "talloni su",
    "split_step": "Split-step",
    "at_contact": "all'impatto",
    "unit_turn": "Unit turn",
    "shoulders_racket": "spalle+racchetta",
    "preparation": "Apertura",
    "guide_hand": "mano guida",
    "the_ai_measures_the_time_b": "L'AI misura il tempo tra colpo avversario, split-step e fine apertura: la metrica che spiega più errori d'impatto nei bambini.",
    "ready_position": "Posizione d'attesa",
    "heels_down_racket_low": "Talloni a terra, racchetta bassa",
    "ready_to_spring_small_hops": "\"Pronti a scattare\", saltelli",
    "jump_too_early_or_missing": "Salto in anticipo o assente",
    "call_hop_on_the_opponent_s": "Chiama \"hop\" sull'impatto avversario",
    "arm_only_going_back": "Solo braccio indietro",
    "free_hand_on_the_racket": "Mano libera sulla racchetta",
    "after_the_bounce": "Dopo il rimbalzo",
    "say_ready_on_the_bounce": "Dire \"pronto\" al rimbalzo"
  },
  "en": {
    "back": "Back",
    "common_base_of_all_strokes": "Common base of all strokes",
    "preparation_and_backswing": "Preparation and backswing",
    "ready": "Ready",
    "heels_up": "heels up",
    "split_step": "Split step",
    "at_contact": "at contact",
    "unit_turn": "Unit turn",
    "shoulders_racket": "shoulders+racket",
    "preparation": "Preparation",
    "guide_hand": "guide hand",
    "the_ai_measures_the_time_b": "The AI measures the time between the opponent's shot, split step and end of preparation: the metric that explains most contact errors in kids.",
    "ready_position": "Ready position",
    "heels_down_racket_low": "Heels down, racket low",
    "ready_to_spring_small_hops": "\"Ready to spring\", small hops",
    "jump_too_early_or_missing": "Jump too early or missing",
    "call_hop_on_the_opponent_s": "Call \"hop\" on the opponent's contact",
    "arm_only_going_back": "Arm only going back",
    "free_hand_on_the_racket": "Free hand on the racket",
    "after_the_bounce": "After the bounce",
    "say_ready_on_the_bounce": "Say \"ready\" on the bounce"
  }
};

export function BaseComune() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.common_base_of_all_strokes}</div><h1 className={s.h1}>{t.preparation_and_backswing}</h1></div></header><div className={s.lab} style={{ position: "relative", height: "190px", borderRadius: "22px", overflow: "hidden", flex: "none" }}><svg width="357" height="190" viewBox="0 0 357 190" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /></div><div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "4px" }}><div style={{ position: "absolute", left: "10%", right: "10%", top: "12px", height: "2px", background: "#2C2C2E" }}></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>1</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.ready}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.heels_up}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>2</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.split_step}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.at_contact}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>3</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.unit_turn}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.shoulders_racket}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>4</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.preparation}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.guide_hand}</span></div></div><div className={s.note}>{t.the_ai_measures_the_time_b}</div><div className={s.li} style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}><span className={s.t}>{t.ready_position}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#FF5A5F", fontWeight: "800" }}>✕</span>{t.heels_down_racket_low}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#4CD07D", fontWeight: "800" }}>✓</span>{t.ready_to_spring_small_hops}</span></div><div className={s.li} style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}><span className={s.t}>{t.split_step}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#FF5A5F", fontWeight: "800" }}>✕</span>{t.jump_too_early_or_missing}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#4CD07D", fontWeight: "800" }}>✓</span>{t.call_hop_on_the_opponent_s}</span></div><div className={s.li} style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}><span className={s.t}>{t.unit_turn}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#FF5A5F", fontWeight: "800" }}>✕</span>{t.arm_only_going_back}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#4CD07D", fontWeight: "800" }}>✓</span>{t.free_hand_on_the_racket}</span></div><div className={s.li} style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}><span className={s.t}>{t.preparation}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#FF5A5F", fontWeight: "800" }}>✕</span>{t.after_the_bounce}</span><span style={{ fontSize: "13px", display: "flex", gap: "6px" }}><span style={{ color: "#4CD07D", fontWeight: "800" }}>✓</span>{t.say_ready_on_the_bounce}</span></div></div>
      </div>
    </Schermo>
  );
}
