"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT, useLang } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    setCombinations4Strategies: "Combinazioni fisse · 4 strategie",
    opponentProfile: "Profilo avversario",
    your4StrategiesTo: "LE TUE 4 STRATEGIE DA MEMORIZZARE",
    tiebreakPlan: "Piano per il tie-break",
  },
  en: {
    back: "Back",
    setCombinations4Strategies: "Set combinations · 4 strategies",
    opponentProfile: "Opponent profile",
    your4StrategiesTo: "YOUR 4 STRATEGIES TO MEMORIZE",
    tiebreakPlan: "Tiebreak plan",
  },
};

// Profili d'avversario (dimostrativi): nome, descrizione, 4 strategie da memorizzare.
const PROFILI = {
  it: [
    ["Pallettaro", "Alto e lento, sbaglia poco", ["S7 palla corta dopo 3 profondi", "S6 approccio e rete", "S3 inside-out", "S1 pazienza"]],
    ["Battitore", "Servizio potente, scambi brevi", ["S9 risposta al centro", "Palla bassa in back", "S2 sul rovescio", "Tie-break senza rischi"]],
    ["Rovescio debole", "Diritto forte, rovescio passivo", ["S2 servizio al rovescio", "S3 inside-out", "S4 topspin alto", "Lungolinea per aprire"]],
    ["Attaccante a rete", "Approccia spesso, buone volée", ["Passante basso ai piedi", "Pallonetto sul rovescio", "S9 contro il serve & volley", "Palla lunga e carica"]],
    ["Mancino", "Slice esterno nel lato vantaggi", ["Risposta più larga a sinistra", "Diritto lungolinea", "S9 sulle palle break", "Evita la sua diagonale"]],
    ["Difensore veloce", "Recupera tutto, contrattacca", ["Cambia ritmo: back e palla alta", "S6 rete su palla corta", "Stesso angolo due volte", "S7 quando è dietro"]],
  ],
  en: [
    ["Pusher", "High and slow, rarely misses", ["S7 drop shot after 3 deep balls", "S6 approach and net", "S3 inside-out", "S1 patience"]],
    ["Big server", "Big serve, short rallies", ["S9 return to the middle", "Low slice ball", "S2 to the backhand", "Risk-free tiebreak"]],
    ["Weak backhand", "Strong forehand, passive backhand", ["S2 serve to the backhand", "S3 inside-out", "S4 high topspin", "Down the line to open up"]],
    ["Net rusher", "Approaches often, good volleys", ["Low passing shot at the feet", "Lob over the backhand", "S9 against serve & volley", "Deep, heavy ball"]],
    ["Lefty", "Wide slice on the ad side", ["Wider return position on the left", "Down-the-line forehand", "S9 on break points", "Avoid their diagonal"]],
    ["Fast defender", "Gets everything back, counterattacks", ["Change pace: slice and high ball", "S6 net on a short ball", "Same corner twice", "S7 when they're deep"]],
  ],
} as const;

export function ProfiliAvversario() {
  const t = useT(T);
  const { lang } = useLang();
  const [i, setI] = useState(0);
  const lista = PROFILI[lang];
  const [nome, desc, four] = lista[i];
  return (
    <Schermo tab="tattica">
      <div className={K.scr} style={{ gap: 10 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.Combinazioni} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.setCombinations4Strategies}</div>
            <h1 className={K.h1}>{t.opponentProfile}</h1>
          </div>
        </header>
        <div role="group" aria-label={t.opponentProfile} className={K.g3}>
          {lista.map((c, n) => (
            <button key={c[0]} type="button" className={n === i ? `${K.chip} ${K.on}` : K.chip} aria-pressed={n === i} onClick={() => setI(n)} style={{ justifyContent: "center", padding: "0 6px", fontSize: 12 }}>{c[0]}</button>
          ))}
        </div>
        <div className={K.card} style={{ padding: "16px", borderColor: "rgba(255,90,95,.35)", background: "linear-gradient(160deg,#2A1214,#161618 60%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#FF5A5F", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif", fontWeight: "800", fontSize: "24px" }}>B</span>
            <div>
              <div className={K.disp} style={{ fontSize: "28px", fontWeight: "700", lineHeight: "1" }}>{nome}</div>
              <div className={K.muted} style={{ fontSize: "13px" }}>{desc}</div>
            </div>
          </div>
        </div>
        <div className={K.k}>{t.your4StrategiesTo}</div>
        {four.map((f, n) => (
          <div key={f} className={K.li}>
            <span className={K.num}>{n + 1}</span>
            <span className={K.t}>{f}</span>
          </div>
        ))}
        <Link href={ROTTE.TieBreak} className={K.btn}>{t.tiebreakPlan}</Link>
      </div>
    </Schermo>
  );
}
