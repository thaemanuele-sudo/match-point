"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Fulmine, Play, Testata } from "./comuni";
import c from "./comune.module.css";

const T = {
  it: {
    kick: "Proposta del Coach AI per Luca", titolo: "Apertura al rimbalzo", sessioni: "sessioni", aSessione: "a sessione", palle: "palle",
    video: "Video di correzione DR-02", modello: "Modello corretto al rallentatore", esercizi: "Esercizi", libreria: "dalla libreria Tecnica",
    e1: "Apertura al rimbalzo", e1s: 'Chiama "pronto!" quando la palla tocca terra', e2: "Impatto davanti (cono)", e2s: "Cono 30 cm davanti all'anca",
    e3: "Split-step reattivo", e3s: "Aggiunto dal maestro · scaletta + segnale, 6'", nota: "Nuova verifica video consigliata dopo la sessione 3.",
    assegna: "Assegna a Luca", scarta: "Scarta",
  },
  en: {
    kick: "Coach AI proposal for Luca", titolo: "Prep on the bounce", sessioni: "sessions", aSessione: "per session", palle: "balls",
    video: "DR-02 correction video", modello: "Correct model in slow motion", esercizi: "Drills", libreria: "from the Technique library",
    e1: "Prep on the bounce", e1s: 'Call "ready!" when the ball hits the ground', e2: "Contact in front (cone)", e2s: "Cone 30 cm in front of the hip",
    e3: "Reactive split step", e3s: "Added by the coach · ladder + signal, 6'", nota: "New video check recommended after session 3.",
    assegna: "Assign to Luca", scarta: "Discard",
  },
};

/** 21 · Piano proposto dal Coach AI. Dati dimostrativi. */
export default function PianoProposto() {
  const t = useT(T);
  const riga = (n: number, nome: string, sotto: string, dose: string) => (
    <div className={c.li} key={n}>
      <span className={c.num}>{n}</span>
      <span className={c.grow}><span className={c.liT}>{nome}</span><span className={c.liS}>{sotto}</span></span>
      <span className={c.disp} style={{ fontWeight: 700, fontSize: 18 }}>{dose}</span>
    </div>
  );
  return (
    <Schermo tab="coach">
      <div className={c.col}>
        <Testata indietro={ROTTE.Feedback} kick={t.kick} titolo={t.titolo} />
        <div className={c.g3}>
          <div className={c.tile}><b>6</b><span>{t.sessioni}</span></div>
          <div className={c.tile}><b>10&apos;</b><span>{t.aSessione}</span></div>
          <div className={c.tile}><b>3×12</b><span>{t.palle}</span></div>
        </div>
        <Link href={ROTTE.TecnicaColpo} className={`lawn ${c.lawnLink}`}>
          <span className={c.playTondo}><Play /></span>
          <span className={c.grow}><span style={{ fontWeight: 800, display: "block" }}>{t.video}</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{t.modello}</span></span>
          <span className={c.code}>DR-02</span>
        </Link>
        <div className={c.sezione}><h2>{t.esercizi}</h2><span className="muted">{t.libreria}</span></div>
        {riga(1, t.e1, t.e1s, "3×12")}
        {riga(2, t.e2, t.e2s, "4×10")}
        <div className={c.li} style={{ borderColor: "rgba(216,243,74,.4)" }}>
          <span className={c.ic}><Fulmine /></span>
          <span className={c.grow}><span className={c.liT}>{t.e3}</span><span className={c.liS}>{t.e3s}</span></span>
          <span className={c.disp} style={{ fontWeight: 700, fontSize: 18 }}>2×8</span>
        </div>
        <div className={c.note}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>{t.nota}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={ROTTE.Progressi} className="btn" style={{ flex: 1 }}>{t.assegna}</Link>
          <Link href={ROTTE.Allievi} className={c.btn2} style={{ flex: "none", width: 90 }}>{t.scarta}</Link>
        </div>
      </div>
    </Schermo>
  );
}
