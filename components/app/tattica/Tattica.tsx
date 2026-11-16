"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import { LinguaChip } from "@/components/app/LinguaChip";
import { useProfilo } from "@/lib/useProfilo";
import { FASCE, type Fascia } from "@/lib/types";
import S from "./Tattica.module.css";

const T = {
  it: {
    animatedGamePatternsSpoken: "Schemi di gioco animati, a voce e scritti",
    tactics: "Tattica",
    ageBand: "Fascia d'età",
    aiAndSetCombinations: "Combinazioni AI e fisse",
    strategyBasedOnScore: "Strategia in base a punteggio e avversario",
    strategie: "Strategie {fascia}",
    adulti: "Adulti",
    allS1S10: "Tutte S1-S10",
    wideServeAndInside: "Servizio esterno e sventaglio",
    hard: "Cemento",
    vsWeakBackhand: "vs Rovescio debole",
    wrongFootAttack: "Attacco in controtempo",
    clay: "Terra",
    adSide: "Vantaggi",
    vsPusher: "vs Pallettaro",
    dropShotAndPass: "Palla corta e passante",
    grass: "Erba",
    vsBigServer: "vs Battitore",
  },
  en: {
    animatedGamePatternsSpoken: "Animated game patterns, spoken and written",
    tactics: "Tactics",
    ageBand: "Age band",
    aiAndSetCombinations: "AI and set combinations",
    strategyBasedOnScore: "Strategy based on score and opponent",
    strategie: "{fascia} strategies",
    adulti: "Adults",
    allS1S10: "All S1-S10",
    wideServeAndInside: "Wide serve and inside-out forehand",
    hard: "Hard",
    vsWeakBackhand: "vs Weak backhand",
    wrongFootAttack: "Wrong-foot attack",
    clay: "Clay",
    adSide: "Ad side",
    vsPusher: "vs Pusher",
    dropShotAndPass: "Drop shot and pass",
    grass: "Grass",
    vsBigServer: "vs Big server",
  },
  fr: {
    animatedGamePatternsSpoken: "Schémas de jeu animés, à l'oral et à l'écrit",
    tactics: "Tactique",
    ageBand: "Tranches d'âge",
    aiAndSetCombinations: "Combinaisons IA et fixes",
    strategyBasedOnScore: "Stratégie selon le score et l'adversaire",
    strategie: "Stratégies {fascia}",
    adulti: "Adultes",
    allS1S10: "Toutes S1-S10",
    wideServeAndInside: "Service extérieur et coup droit décalé",
    hard: "Dur",
    vsWeakBackhand: "vs Revers faible",
    wrongFootAttack: "Attaque à contre-pied",
    clay: "Terre",
    adSide: "Avantage",
    vsPusher: "vs Défenseur",
    dropShotAndPass: "Amortie et passing",
    grass: "Gazon",
    vsBigServer: "vs Serveur",
  },
  de: {
    animatedGamePatternsSpoken: "Animierte Spielmuster, gesprochen und geschrieben",
    tactics: "Taktik",
    ageBand: "Altersgruppen",
    aiAndSetCombinations: "KI- und feste Kombinationen",
    strategyBasedOnScore: "Strategie nach Spielstand und Gegner",
    strategie: "Strategien {fascia}",
    adulti: "Erwachsene",
    allS1S10: "Alle S1-S10",
    wideServeAndInside: "Außenaufschlag und Vorhand-Inside-out",
    hard: "Hartplatz",
    vsWeakBackhand: "vs. schwache Rückhand",
    wrongFootAttack: "Angriff im Gegenrhythmus",
    clay: "Sand",
    adSide: "Vorteilseite",
    vsPusher: "vs. Ballschieber",
    dropShotAndPass: "Stopp und Passierball",
    grass: "Rasen",
    vsBigServer: "vs. Aufschläger",
  },
  es: {
    animatedGamePatternsSpoken: "Patrones de juego animados, por voz y escritos",
    tactics: "Táctica",
    ageBand: "Franjas de edad",
    aiAndSetCombinations: "Combinaciones IA y fijas",
    strategyBasedOnScore: "Estrategia según marcador y rival",
    strategie: "Estrategias {fascia}",
    adulti: "Adultos",
    allS1S10: "Todas S1-S10",
    wideServeAndInside: "Saque abierto y derecha invertida",
    hard: "Pista dura",
    vsWeakBackhand: "vs Revés débil",
    wrongFootAttack: "Ataque a contrapié",
    clay: "Tierra",
    adSide: "Ventaja",
    vsPusher: "vs Pasabolas",
    dropShotAndPass: "Dejada y passing",
    grass: "Hierba",
    vsBigServer: "vs Sacador",
  },
};

// Nome della fascia per il titolo "Strategie Under 12" (Adulti usa il testo del dizionario), nelle cinque lingue.
const NOME_FASCIA: Record<Lingua, Record<Exclude<Fascia, "ADULTI">, string>> = {
  it: { U10: "Under 10", U12: "Under 12", U14: "Under 14", U16: "Under 16", U18: "Under 18" },
  en: { U10: "Under 10", U12: "Under 12", U14: "Under 14", U16: "Under 16", U18: "Under 18" },
  fr: { U10: "Moins de 10 ans", U12: "Moins de 12 ans", U14: "Moins de 14 ans", U16: "Moins de 16 ans", U18: "Moins de 18 ans" },
  de: { U10: "U10", U12: "U12", U14: "U14", U16: "U16", U18: "U18" },
  es: { U10: "Sub-10", U12: "Sub-12", U14: "Sub-14", U16: "Sub-16", U18: "Sub-18" },
};

export function Tattica() {
  const t = useT(T);
  const { lang } = useLang();
  const { profilo } = useProfilo();
  const [fascia, setFascia] = useState<Fascia>("U12");
  // la fascia del profilo, appena disponibile, è quella preselezionata
  useEffect(() => { if (profilo?.fascia) setFascia(profilo.fascia); }, [profilo?.fascia]);
  const nomeFascia = fascia === "ADULTI" ? t.adulti : NOME_FASCIA[lang][fascia];
  return (
    <Schermo tab="tattica">
      <div className={S.scr}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className={S.muted} style={{ fontSize: "13px", fontWeight: "600" }}>{t.animatedGamePatternsSpoken}</div>
            <h1 className={S.disp} style={{ margin: "0", fontSize: "44px", lineHeight: "1", fontWeight: "800", fontStyle: "italic" }}>{t.tactics}</h1>
          </div>
          <LinguaChip />
        </div>
        <div role="group" aria-label={t.ageBand} style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          {FASCE.map((f) => (
            <button key={f} type="button" className={f === fascia ? `${S.age} ${S.on}` : S.age} aria-pressed={f === fascia} onClick={() => setFascia(f)}>{f === "ADULTI" ? t.adulti : f}</button>
          ))}
        </div>
        <Link href={ROTTE.Combinazioni} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px", borderRadius: "22px", background: "#D8F34A", color: "#0B0B0C", textDecoration: "none" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: "#0B0B0C", color: "#D8F34A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"></path>
            </svg>
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ fontWeight: "800", fontSize: "16px" }}>{t.aiAndSetCombinations}</div>
            <div style={{ fontSize: "13px", fontWeight: "600", opacity: ".75" }}>{t.strategyBasedOnScore}</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M9 6l6 6-6 6"></path>
          </svg>
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: "0", fontSize: "19px" }}>{t.strategie.replace("{fascia}", nomeFascia)}</h2>
          <Link href={ROTTE.CatalogoStrategie} style={{ fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>{t.allS1S10}</Link>
        </div>
        <Link href={ROTTE.TatticaStrategia} className={S.str}>
          <svg className={`${S.mini} ${S.lawn}`} viewBox="0 0 64 84" aria-hidden="true">
            <rect x="8" y="6" width="48" height="72" fill="none" stroke="#fff" strokeWidth="1.5"></rect>
            <path d="M8 42h48M14 6v72M50 6v72M14 24h36M14 60h36M32 24v36" stroke="#fff" strokeWidth="1" fill="none" opacity=".8"></path>
            <path d="M44 70 L18 14" stroke="#D8F34A" strokeWidth="2" strokeDasharray="3 3"></path>
            <circle cx="18" cy="14" r="3.5" fill="#D8F34A"></circle>
          </svg>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px" }}>
            <b style={{ fontSize: "16px" }}>{t.wideServeAndInside}</b>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              <span className={S.tag}>{t.hard}</span>
              <span className={S.tag}>30/40</span>
              <span className={S.tag} style={{ background: "#3A1416", color: "#FF9A9C" }}>{t.vsWeakBackhand}</span>
            </div>
          </div>
        </Link>
        <Link href={ROTTE.TatticaStrategia} className={S.str}>
          <svg className={`${S.mini} ${S.lawn}`} viewBox="0 0 64 84" aria-hidden="true">
            <rect x="8" y="6" width="48" height="72" fill="none" stroke="#fff" strokeWidth="1.5"></rect>
            <path d="M8 42h48M14 6v72M50 6v72M14 24h36M14 60h36M32 24v36" stroke="#fff" strokeWidth="1" fill="none" opacity=".8"></path>
            <path d="M20 72 L46 16" stroke="#D8F34A" strokeWidth="2" strokeDasharray="3 3"></path>
            <circle cx="46" cy="16" r="3.5" fill="#D8F34A"></circle>
          </svg>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px" }}>
            <b style={{ fontSize: "16px" }}>{t.wrongFootAttack}</b>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              <span className={S.tag}>{t.clay}</span>
              <span className={S.tag}>{t.adSide}</span>
              <span className={S.tag} style={{ background: "#3A1416", color: "#FF9A9C" }}>{t.vsPusher}</span>
            </div>
          </div>
        </Link>
        <Link href={ROTTE.TatticaStrategia} className={S.str}>
          <svg className={`${S.mini} ${S.lawn}`} viewBox="0 0 64 84" aria-hidden="true">
            <rect x="8" y="6" width="48" height="72" fill="none" stroke="#fff" strokeWidth="1.5"></rect>
            <path d="M8 42h48M14 6v72M50 6v72M14 24h36M14 60h36M32 24v36" stroke="#fff" strokeWidth="1" fill="none" opacity=".8"></path>
            <path d="M32 72 L32 36" stroke="#D8F34A" strokeWidth="2" strokeDasharray="3 3"></path>
            <circle cx="32" cy="36" r="3.5" fill="#D8F34A"></circle>
          </svg>
          <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "6px" }}>
            <b style={{ fontSize: "16px" }}>{t.dropShotAndPass}</b>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              <span className={S.tag}>{t.grass}</span>
              <span className={S.tag}>15/30</span>
              <span className={S.tag} style={{ background: "#3A1416", color: "#FF9A9C" }}>{t.vsBigServer}</span>
            </div>
          </div>
        </Link>
      </div>
    </Schermo>
  );
}
