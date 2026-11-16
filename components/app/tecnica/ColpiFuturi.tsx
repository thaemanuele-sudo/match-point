"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./ColpiFuturi.module.css";

const T = {
  "it": {
    "back": "Indietro",
    "avviso_attivo": "Ti avviseremo",
    "same_a_b_c_structure_and_m": "Stessa struttura A/B/C e metriche",
    "strokes_coming_soon": "Colpi in arrivo",
    "swinging_volley": "Schiaffo al volo",
    "topspin_forehand_on_the_fl": "Diritto in topspin al volo da metà campo su palla alta e lenta.",
    "inside_out": "Inside-out",
    "forehand_from_the_backhand": "Diritto dal lato del rovescio verso il rovescio avversario.",
    "inside_in": "Inside-in",
    "forehand_running_around_th": "Diritto girando intorno al rovescio, lungolinea: colpo di rottura.",
    "drop_shot": "Palla corta",
    "backspin_that_bounces_near": "Backspin che rimbalza vicino alla rete, ottima su terra rossa.",
    "net_play": "Gioco sotto rete",
    "drop_volley_half_volley_an": "Volée smorzata, demi-volée e contro-smash, singolo e doppio.",
    "notify_me_when_they_re_out": "Avvisami quando escono"
  },
  "en": {
    "back": "Back",
    "avviso_attivo": "We will let you know",
    "same_a_b_c_structure_and_m": "Same A/B/C structure and metrics",
    "strokes_coming_soon": "Strokes coming soon",
    "swinging_volley": "Swinging volley",
    "topspin_forehand_on_the_fl": "Topspin forehand on the fly from mid-court on a high, slow ball.",
    "inside_out": "Inside-out",
    "forehand_from_the_backhand": "Forehand from the backhand side to the opponent's backhand.",
    "inside_in": "Inside-in",
    "forehand_running_around_th": "Forehand running around the backhand, down the line: a breakthrough shot.",
    "drop_shot": "Drop shot",
    "backspin_that_bounces_near": "Backspin that bounces near the net, great on clay.",
    "net_play": "Net play",
    "drop_volley_half_volley_an": "Drop volley, half volley and counter-overhead, singles and doubles.",
    "notify_me_when_they_re_out": "Notify me when they're out"
  }
};

export function ColpiFuturi() {
  const t = useT(T);
  // "Avvisami": preferenza di questo dispositivo (finché non c'è un canale di notifica vero)
  const [avviso, setAvviso] = useState(false);
  useEffect(() => {
    try { setAvviso(localStorage.getItem("mp-avviso-colpi") === "1"); } catch { /* storage non disponibile */ }
  }, []);
  const cambiaAvviso = () => {
    const v = !avviso;
    setAvviso(v);
    try { localStorage.setItem("mp-avviso-colpi", v ? "1" : "0"); } catch { /* ignora */ }
  };
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.same_a_b_c_structure_and_m}</div><h1 className={s.h1}>{t.strokes_coming_soon}</h1></div></header><div className={s.li} style={{ alignItems: "flex-start" }}><span className={s.ic}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg></span><span className={s.grow}><span className={s.t}>{t.swinging_volley}</span><span className={s.s} style={{ display: "block", lineHeight: "1.35" }}>{t.topspin_forehand_on_the_fl}</span></span><span className={s.tag}>U14+</span></div><div className={s.li} style={{ alignItems: "flex-start" }}><span className={s.ic}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg></span><span className={s.grow}><span className={s.t}>{t.inside_out}</span><span className={s.s} style={{ display: "block", lineHeight: "1.35" }}>{t.forehand_from_the_backhand}</span></span><span className={s.tag}>U14+</span></div><div className={s.li} style={{ alignItems: "flex-start" }}><span className={s.ic}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg></span><span className={s.grow}><span className={s.t}>{t.inside_in}</span><span className={s.s} style={{ display: "block", lineHeight: "1.35" }}>{t.forehand_running_around_th}</span></span><span className={s.tag}>U14+</span></div><div className={s.li} style={{ alignItems: "flex-start" }}><span className={s.ic}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg></span><span className={s.grow}><span className={s.t}>{t.drop_shot}</span><span className={s.s} style={{ display: "block", lineHeight: "1.35" }}>{t.backspin_that_bounces_near}</span></span><span className={s.tag}>U14+</span></div><div className={s.li} style={{ alignItems: "flex-start" }}><span className={s.ic}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg></span><span className={s.grow}><span className={s.t}>{t.net_play}</span><span className={s.s} style={{ display: "block", lineHeight: "1.35" }}>{t.drop_volley_half_volley_an}</span></span><span className={s.tag}>U14+</span></div><button type="button" className={s.btn} style={{ opacity: avviso ? 0.75 : 1 }} aria-pressed={avviso} onClick={cambiaAvviso}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"></path><path d="M10 21h4"></path></svg>{avviso ? t.avviso_attivo : t.notify_me_when_they_re_out}</button></div>
      </div>
    </Schermo>
  );
}
