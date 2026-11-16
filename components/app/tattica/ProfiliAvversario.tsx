"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT, useLang, type Lingua } from "@/lib/i18n/lingua";
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
  fr: {
    back: "Retour",
    setCombinations4Strategies: "Combinaisons fixes · 4 stratégies",
    opponentProfile: "Profil adversaire",
    your4StrategiesTo: "TES 4 STRATÉGIES À RETENIR",
    tiebreakPlan: "Plan pour le tie-break",
  },
  de: {
    back: "Zurück",
    setCombinations4Strategies: "Feste Kombinationen · 4 Strategien",
    opponentProfile: "Gegnerprofil",
    your4StrategiesTo: "DEINE 4 STRATEGIEN ZUM MERKEN",
    tiebreakPlan: "Plan für den Tiebreak",
  },
  es: {
    back: "Atrás",
    setCombinations4Strategies: "Combinaciones fijas · 4 estrategias",
    opponentProfile: "Perfil del rival",
    your4StrategiesTo: "TUS 4 ESTRATEGIAS PARA MEMORIZAR",
    tiebreakPlan: "Plan para el tie-break",
  },
};

type Profilo = [string, string, string[]];

// Profili d'avversario (dimostrativi): nome, descrizione, 4 strategie da memorizzare.
const PROFILI: Record<Lingua, Profilo[]> = {
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
  fr: [
    ["Pousseur", "Haut et lent, rate peu", ["S7 amorti après 3 balles profondes", "S6 approche et filet", "S3 inside-out", "S1 patience"]],
    ["Gros serveur", "Service puissant, échanges courts", ["S9 retour au centre", "Balle basse en slice", "S2 sur le revers", "Tie-break sans risque"]],
    ["Revers faible", "Coup droit fort, revers passif", ["S2 service au revers", "S3 inside-out", "S4 lifté haut", "Long de ligne pour ouvrir"]],
    ["Attaquant au filet", "Monte souvent, bonnes volées", ["Passant bas aux pieds", "Lob sur le revers", "S9 contre le service-volée", "Balle longue et chargée"]],
    ["Gaucher", "Slice écarté côté avantage", ["Position de retour plus large à gauche", "Coup droit long de ligne", "S9 sur les balles de break", "Éviter sa diagonale"]],
    ["Défenseur rapide", "Remet tout, contre-attaque", ["Changer de rythme : slice et balle haute", "S6 filet sur balle courte", "Même angle deux fois", "S7 quand il est au fond"]],
  ],
  de: [
    ["Pusher", "Hoch und langsam, macht selten Fehler", ["S7 Stopp nach 3 tiefen Bällen", "S6 Annäherung und Netz", "S3 Inside-out", "S1 Geduld"]],
    ["Starker Aufschläger", "Harter Aufschlag, kurze Ballwechsel", ["S9 Return in die Mitte", "Niedriger Slice-Ball", "S2 auf die Rückhand", "Risikofreier Tiebreak"]],
    ["Schwache Rückhand", "Starke Vorhand, passive Rückhand", ["S2 Aufschlag auf die Rückhand", "S3 Inside-out", "S4 hoher Topspin", "Longline zum Öffnen"]],
    ["Netzspieler", "Kommt oft ans Netz, gute Volleys", ["Tiefer Passierball auf die Füße", "Lob über die Rückhand", "S9 gegen Serve & Volley", "Lange, schwere Bälle"]],
    ["Linkshänder", "Weiter Slice auf der Vorteilsseite", ["Rückschlagposition weiter links", "Longline-Vorhand", "S9 bei Breakbällen", "Seine Diagonale meiden"]],
    ["Schneller Verteidiger", "Holt alles zurück, kontert", ["Tempo wechseln: Slice und hoher Ball", "S6 Netz auf kurzen Ball", "Gleiche Ecke zweimal", "S7, wenn er hinten steht"]],
  ],
  es: [
    ["Muro", "Alto y lento, falla poco", ["S7 dejada tras 3 bolas profundas", "S6 aproximación y red", "S3 inside-out", "S1 paciencia"]],
    ["Gran sacador", "Saque potente, intercambios cortos", ["S9 resto al centro", "Bola baja cortada", "S2 al revés", "Tie-break sin riesgos"]],
    ["Revés débil", "Derecha fuerte, revés pasivo", ["S2 saque al revés", "S3 inside-out", "S4 liftado alto", "Paralelo para abrir"]],
    ["Atacante de red", "Sube a menudo, buenas voleas", ["Passing bajo a los pies", "Globo sobre el revés", "S9 contra saque y volea", "Bola larga y cargada"]],
    ["Zurdo", "Cortado abierto en el lado de ventaja", ["Resto más abierto a la izquierda", "Derecha paralela", "S9 en bolas de break", "Evita su diagonal"]],
    ["Defensor rápido", "Recupera todo, contraataca", ["Cambia el ritmo: cortado y bola alta", "S6 red en bola corta", "Misma esquina dos veces", "S7 cuando está atrás"]],
  ],
};

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
