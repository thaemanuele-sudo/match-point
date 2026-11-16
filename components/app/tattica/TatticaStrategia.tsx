"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useLang, useT } from "@/lib/i18n/lingua";
import { useProfilo } from "@/lib/useProfilo";
import { useVoce } from "./voce";
import S from "./TatticaStrategia.module.css";

const T = {
  it: {
    back: "Indietro",
    kicker: "{fascia} · Strategia",
    adulti: "Adulti",
    wideServeAndInside: "Servizio esterno e sventaglio",
    animation: "Animazione",
    voiceExplanation: "Spiegazione a voce",
    aBExplanationAnd: "A · B · SPIEGAZIONE E OBIETTIVO",
    wideSliceServeTo: "Servizio slice esterno per aprire il campo, poi diritto a sventaglio nell'angolo opposto: obiettivo, chiudere in tre colpi.",
    cWhen: "C · QUANDO",
    t3040AndAd: "30/40 e vantaggi",
    dAgainstWhom: "D · CONTRO CHI",
    weakBackhand: "Rovescio debole",
    eWhyItWorks: "E · PERCHÉ FUNZIONA",
    youPullThemWide: "Lo porti fuori e resta il campo vuoto",
    fSurface: "F · SUPERFICIE",
    hardGrass: "Cemento · Erba",
    gHowOften: "G · OGNI QUANTO",
    t1ServeIn3: "1 servizio su 3",
    hProsWhoUse: "H · PRO CHE LA USANO",
    proNames: "[Nomi PRO]",
    trainTheStrategy: "Allenare la strategia",
    drillVideo: "Video esercizio",
    perSession: "a sessione",
    reps: "ripetizioni",
    sets: "serie",
  },
  en: {
    back: "Back",
    kicker: "{fascia} · Strategy",
    adulti: "Adults",
    wideServeAndInside: "Wide serve and inside-out forehand",
    animation: "Animation",
    voiceExplanation: "Voice explanation",
    aBExplanationAnd: "A · B · EXPLANATION AND GOAL",
    wideSliceServeTo: "Wide slice serve to open the court, then inside-out forehand into the opposite corner: goal, finish in three shots.",
    cWhen: "C · WHEN",
    t3040AndAd: "30/40 and ad",
    dAgainstWhom: "D · AGAINST WHOM",
    weakBackhand: "Weak backhand",
    eWhyItWorks: "E · WHY IT WORKS",
    youPullThemWide: "You pull them wide and the court is open",
    fSurface: "F · SURFACE",
    hardGrass: "Hard · Grass",
    gHowOften: "G · HOW OFTEN",
    t1ServeIn3: "1 serve in 3",
    hProsWhoUse: "H · PROS WHO USE IT",
    proNames: "[PRO names]",
    trainTheStrategy: "Train the strategy",
    drillVideo: "Drill video",
    perSession: "per session",
    reps: "reps",
    sets: "sets",
  },
  fr: {
    back: "Retour",
    kicker: "{fascia} · Stratégie",
    adulti: "Adultes",
    wideServeAndInside: "Service extérieur et coup droit décalé",
    animation: "Animation",
    voiceExplanation: "Explication vocale",
    aBExplanationAnd: "A · B · EXPLICATION ET OBJECTIF",
    wideSliceServeTo: "Service slicé extérieur pour ouvrir le court, puis coup droit décalé dans l'angle opposé : objectif, conclure en trois coups.",
    cWhen: "C · QUAND",
    t3040AndAd: "30/40 et avantage",
    dAgainstWhom: "D · CONTRE QUI",
    weakBackhand: "Revers faible",
    eWhyItWorks: "E · POURQUOI ÇA MARCHE",
    youPullThemWide: "Tu le sors du court et le terrain reste vide",
    fSurface: "F · SURFACE",
    hardGrass: "Dur · Gazon",
    gHowOften: "G · FRÉQUENCE",
    t1ServeIn3: "1 service sur 3",
    hProsWhoUse: "H · PROS QUI L'UTILISENT",
    proNames: "[Noms PRO]",
    trainTheStrategy: "Travailler la stratégie",
    drillVideo: "Vidéo de l'exercice",
    perSession: "par séance",
    reps: "répétitions",
    sets: "séries",
  },
  de: {
    back: "Zurück",
    kicker: "{fascia} · Strategie",
    adulti: "Erwachsene",
    wideServeAndInside: "Außenaufschlag und Vorhand-Inside-out",
    animation: "Animation",
    voiceExplanation: "Sprachliche Erklärung",
    aBExplanationAnd: "A · B · ERKLÄRUNG UND ZIEL",
    wideSliceServeTo: "Außen-Slice-Aufschlag, um das Feld zu öffnen, dann Vorhand-Inside-out in die gegenüberliegende Ecke: Ziel ist, in drei Schlägen abzuschließen.",
    cWhen: "C · WANN",
    t3040AndAd: "30/40 und Vorteil",
    dAgainstWhom: "D · GEGEN WEN",
    weakBackhand: "Schwache Rückhand",
    eWhyItWorks: "E · WARUM ES FUNKTIONIERT",
    youPullThemWide: "Du bringst ihn nach außen, und das Feld bleibt frei",
    fSurface: "F · BELAG",
    hardGrass: "Hartplatz · Rasen",
    gHowOften: "G · WIE OFT",
    t1ServeIn3: "1 Aufschlag von 3",
    hProsWhoUse: "H · PROFIS, DIE ES NUTZEN",
    proNames: "[Profi-Namen]",
    trainTheStrategy: "Strategie trainieren",
    drillVideo: "Übungsvideo",
    perSession: "pro Einheit",
    reps: "Wiederholungen",
    sets: "Sätze",
  },
  es: {
    back: "Atrás",
    kicker: "{fascia} · Estrategia",
    adulti: "Adultos",
    wideServeAndInside: "Saque abierto y derecha invertida",
    animation: "Animación",
    voiceExplanation: "Explicación por voz",
    aBExplanationAnd: "A · B · EXPLICACIÓN Y OBJETIVO",
    wideSliceServeTo: "Saque con slice abierto para abrir la pista, luego derecha invertida al ángulo opuesto: objetivo, cerrar en tres golpes.",
    cWhen: "C · CUÁNDO",
    t3040AndAd: "30/40 y ventaja",
    dAgainstWhom: "D · CONTRA QUIÉN",
    weakBackhand: "Revés débil",
    eWhyItWorks: "E · POR QUÉ FUNCIONA",
    youPullThemWide: "Lo sacas fuera y queda la pista vacía",
    fSurface: "F · SUPERFICIE",
    hardGrass: "Pista dura · Hierba",
    gHowOften: "G · CADA CUÁNTO",
    t1ServeIn3: "1 saque de cada 3",
    hProsWhoUse: "H · PROS QUE LA USAN",
    proNames: "[Nombres PRO]",
    trainTheStrategy: "Entrenar la estrategia",
    drillVideo: "Vídeo del ejercicio",
    perSession: "por sesión",
    reps: "repeticiones",
    sets: "series",
  },
};

const NOME_FASCIA = {
  it: { U10: "Under 10", U12: "Under 12", U14: "Under 14", U16: "Under 16", U18: "Under 18" },
  en: { U10: "Under 10", U12: "Under 12", U14: "Under 14", U16: "Under 16", U18: "Under 18" },
  fr: { U10: "Moins de 10 ans", U12: "Moins de 12 ans", U14: "Moins de 14 ans", U16: "Moins de 16 ans", U18: "Moins de 18 ans" },
  de: { U10: "Under 10", U12: "Under 12", U14: "Under 14", U16: "Under 16", U18: "Under 18" },
  es: { U10: "Sub-10", U12: "Sub-12", U14: "Sub-14", U16: "Sub-16", U18: "Sub-18" },
} as const;

export function TatticaStrategia() {
  const t = useT(T);
  const { profilo } = useProfilo();
  const { lang } = useLang();
  const { inLettura, leggi } = useVoce();
  // chiave che rimonta il disegno animato: "Animazione" lo fa ripartire da capo
  const [giro, setGiro] = useState(0);
  const f = profilo?.fascia ?? "U12";
  const nomeFascia = f === "ADULTI" ? t.adulti : NOME_FASCIA[lang][f];
  return (
    <Schermo tab="tattica">
      <div className={S.scr}>
        <header style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href={ROTTE.Tattica} className={S.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div style={{ flex: "1" }}>
            <div className={S.muted} style={{ fontSize: "12px", fontWeight: "600" }}>{t.kicker.replace("{fascia}", nomeFascia)}</div>
            <h1 className={S.disp} style={{ margin: "0", fontSize: "26px", lineHeight: "1.05", fontWeight: "700" }}>{t.wideServeAndInside}</h1>
          </div>
        </header>
        <div style={{ position: "relative", borderRadius: "24px", overflow: "hidden", aspectRatio: "358 / 236", background: "repeating-linear-gradient(0deg,#1E6A44 0 22px,#24764C 22px 44px)", flex: "none" }}>
          <svg width="100%" height="100%" viewBox="0 0 358 236" aria-hidden="true" style={{ position: "absolute", inset: "0" }}>
            <g fill="none" stroke="#fff" strokeWidth="2">
              <rect x="74" y="12" width="210" height="212"></rect>
              <path d="M74 118h210M100 12v212M258 12v212M100 62h158M100 174h158M179 62v112"></path>
            </g>
            <path d="M60 118h238" stroke="#fff" strokeWidth="3" opacity=".5"></path>
            <g key={giro}>
            <path className={S.trail} d="M232 214 Q 200 160 112 74 Q 180 120 248 196 Q 230 120 238 40" fill="none" stroke="#D8F34A" strokeWidth="3" strokeLinecap="round"></path>
            <circle r="7" fill="#D8F34A" stroke="#fff" strokeWidth="1.5">
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.55;1" calcMode="linear" path="M232 214 Q 200 160 112 74 Q 180 120 248 196 Q 230 120 238 40"></animateMotion>
            </circle>
            </g>
            <g fontWeight="700" fontSize="15" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif" }}>
              <circle cx="232" cy="214" r="11" fill="#F0454A"></circle>
              <text x="232" y="219" textAnchor="middle" fill="#fff">1</text>
              <circle cx="112" cy="74" r="11" fill="#0B0B0C"></circle>
              <text x="112" y="79" textAnchor="middle" fill="#fff">2</text>
              <circle cx="238" cy="40" r="11" fill="#F0454A"></circle>
              <text x="238" y="45" textAnchor="middle" fill="#fff">3</text>
            </g>
          </svg>
          <div style={{ position: "absolute", left: "10px", bottom: "10px", display: "flex", gap: "6px" }}>
            <button type="button" onClick={() => setGiro((g) => g + 1)} style={{ display: "flex", alignItems: "center", gap: "6px", height: "34px", padding: "0 12px", borderRadius: "999px", border: "0", background: "#D8F34A", color: "#0B0B0C", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z"></path>
              </svg>
              {t.animation}
            </button>
            <button type="button" onClick={() => leggi(`${t.wideServeAndInside}. ${t.wideSliceServeTo}`)} aria-pressed={inLettura} style={{ display: "flex", alignItems: "center", gap: "6px", height: "34px", padding: "0 12px", borderRadius: "999px", border: "0", background: "rgba(0,0,0,.65)", color: "#F3F6F1", fontWeight: "700", fontSize: "13px", fontFamily: "inherit" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9z"></path>
                <path d="M16 9a4 4 0 010 6"></path>
              </svg>
              {t.voiceExplanation}
            </button>
          </div>
        </div>
        <div className={S.it} style={{ gap: "4px" }}>
          <span className={S.k}>{t.aBExplanationAnd}</span>
          <span className={S.v}>{t.wideSliceServeTo}</span>
        </div>
        <div className={S.g}>
          <div className={S.it}>
            <span className={S.k}>{t.cWhen}</span>
            <span className={S.v}>{t.t3040AndAd}</span>
          </div>
          <div className={S.it}>
            <span className={S.k}>{t.dAgainstWhom}</span>
            <span className={S.v}>{t.weakBackhand}</span>
          </div>
          <div className={S.it}>
            <span className={S.k}>{t.eWhyItWorks}</span>
            <span className={S.v}>{t.youPullThemWide}</span>
          </div>
          <div className={S.it}>
            <span className={S.k}>{t.fSurface}</span>
            <span className={S.v}>{t.hardGrass}</span>
          </div>
          <div className={S.it}>
            <span className={S.k}>{t.gHowOften}</span>
            <span className={S.v}>{t.t1ServeIn3}</span>
          </div>
          <div className={S.it}>
            <span className={S.k}>{t.hProsWhoUse}</span>
            <span className={S.v}>{t.proNames}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: "0", fontSize: "17px" }}>{t.trainTheStrategy}</h2>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#D8F34A" }}>{t.drillVideo}</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className={S.sb}>
            <b>{"20'"}</b>
            <span>{t.perSession}</span>
          </div>
          <div className={S.sb}>
            <b>6</b>
            <span>{t.reps}</span>
          </div>
          <div className={S.sb}>
            <b>4</b>
            <span>{t.sets}</span>
          </div>
        </div>
      </div>
    </Schermo>
  );
}
