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
  fr: {
    kick: "Proposition du Coach IA pour Luca", titolo: "Préparation au rebond", sessioni: "séances", aSessione: "par séance", palle: "balles",
    video: "Vidéo de correction DR-02", modello: "Modèle correct au ralenti", esercizi: "Exercices", libreria: "de la bibliothèque Technique",
    e1: "Préparation au rebond", e1s: 'Dire "prêt !" quand la balle touche le sol', e2: "Impact devant (plot)", e2s: "Plot 30 cm devant la hanche",
    e3: "Split-step réactif", e3s: "Ajouté par l'entraîneur · échelle + signal, 6'", nota: "Nouveau contrôle vidéo conseillé après la séance 3.",
    assegna: "Assigner à Luca", scarta: "Écarter",
  },
  de: {
    kick: "Vorschlag des Coach AI für Luca", titolo: "Ausholen nach dem Aufprall", sessioni: "Einheiten", aSessione: "pro Einheit", palle: "Bälle",
    video: "Korrekturvideo DR-02", modello: "Korrektes Vorbild in Zeitlupe", esercizi: "Übungen", libreria: "aus der Bibliothek Technik",
    e1: "Ausholen nach dem Aufprall", e1s: 'Ruf „Bereit!“, wenn der Ball den Boden berührt', e2: "Treffpunkt vorne (Hütchen)", e2s: "Hütchen 30 cm vor der Hüfte",
    e3: "Reaktiver Split-Step", e3s: "Vom Trainer hinzugefügt · Leiter + Signal, 6'", nota: "Nach Einheit 3 wird eine neue Videokontrolle empfohlen.",
    assegna: "Luca zuweisen", scarta: "Verwerfen",
  },
  es: {
    kick: "Propuesta del Coach AI para Luca", titolo: "Preparación al bote", sessioni: "sesiones", aSessione: "por sesión", palle: "bolas",
    video: "Vídeo de corrección DR-02", modello: "Modelo correcto a cámara lenta", esercizi: "Ejercicios", libreria: "de la biblioteca Técnica",
    e1: "Preparación al bote", e1s: 'Di "¡listo!" cuando la bola toque el suelo', e2: "Impacto delante (cono)", e2s: "Cono 30 cm delante de la cadera",
    e3: "Split step reactivo", e3s: "Añadido por el entrenador · escalera + señal, 6'", nota: "Nueva revisión en vídeo recomendada tras la sesión 3.",
    assegna: "Asignar a Luca", scarta: "Descartar",
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
