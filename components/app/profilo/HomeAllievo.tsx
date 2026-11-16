"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { useProfilo } from "@/lib/useProfilo";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { Bersaglio, Fiamma, Play, Stella } from "./comuni";
import c from "./comune.module.css";
import s from "./HomeAllievo.module.css";

const T = {
  it: {
    kick: "Modalità Bambino", ciao: "Ciao", giorni: "5 giorni", missione: "LA TUA MISSIONE", obiettivo: "Lancia la palla sempre nello stesso punto", esito: "7 lanci perfetti su 10!",
    badge: "I tuoi badge", badgeN: "6 di 20", casa: "Gioca a casa", minuti: "10 minuti",
    e1: "Fenicottero con palleggio", e1s: "15 secondi per gamba · 3 volte", e2: "Prese con palline colorate", e2s: "3 giri da 10 prese", stella: "+1 stella",
    lucchetto: "Badge ancora bloccato", nomeDemo: "Matteo", fine: "!",
  },
  en: {
    kick: "Kid Mode", ciao: "Hi", giorni: "5 days", missione: "YOUR MISSION", obiettivo: "Toss the ball to the same spot every time", esito: "7 perfect tosses out of 10!",
    badge: "Your badges", badgeN: "6 of 20", casa: "Play at home", minuti: "10 minutes",
    e1: "Flamingo with bouncing", e1s: "15 seconds per leg · 3 times", e2: "Catches with colored balls", e2s: "3 rounds of 10 catches", stella: "+1 star",
    lucchetto: "Badge still locked", nomeDemo: "Matteo", fine: "!",
  },
  fr: {
    kick: "Mode Enfant", ciao: "Salut", giorni: "5 jours", missione: "TA MISSION", obiettivo: "Lance la balle toujours au même endroit", esito: "7 lancers parfaits sur 10 !",
    badge: "Tes badges", badgeN: "6 sur 20", casa: "Joue à la maison", minuti: "10 minutes",
    e1: "Flamant rose avec jonglage", e1s: "15 secondes par jambe · 3 fois", e2: "Attrapes de balles colorées", e2s: "3 tours de 10 attrapes", stella: "+1 étoile",
    lucchetto: "Badge encore verrouillé", nomeDemo: "Matteo", fine: " !",
  },
  de: {
    kick: "Kids-Modus", ciao: "Hallo", giorni: "5 Tage", missione: "DEINE MISSION", obiettivo: "Wirf den Ball immer an dieselbe Stelle", esito: "7 perfekte Würfe von 10!",
    badge: "Deine Abzeichen", badgeN: "6 von 20", casa: "Zu Hause spielen", minuti: "10 Minuten",
    e1: "Flamingo mit Dribbeln", e1s: "15 Sekunden pro Bein · 3-mal", e2: "Fangen mit bunten Bällen", e2s: "3 Runden à 10 Fänge", stella: "+1 Stern",
    lucchetto: "Abzeichen noch gesperrt", nomeDemo: "Matteo", fine: "!",
  },
  es: {
    kick: "Modo Niño", ciao: "¡Hola,", giorni: "5 días", missione: "TU MISIÓN", obiettivo: "Lanza la bola siempre al mismo punto", esito: "¡7 lanzamientos perfectos de 10!",
    badge: "Tus insignias", badgeN: "6 de 20", casa: "Juega en casa", minuti: "10 minutos",
    e1: "Flamenco con bote", e1s: "15 segundos por pierna · 3 veces", e2: "Atrapar bolas de colores", e2s: "3 rondas de 10 atrapadas", stella: "+1 estrella",
    lucchetto: "Insignia aún bloqueada", nomeDemo: "Matteo", fine: "!",
  },
};

/** 17 · Home allievo (Modalità Bambino). Dati dimostrativi, il nome è quello vero se c'è. */
export default function HomeAllievo() {
  const t = useT(T);
  const { profilo } = useProfilo();
  const nome = profilo?.nome || t.nomeDemo;
  return (
    <Schermo tab="coach">
      <div className={c.col}>
        <div className={s.top}>
          <div><div className={c.kick}>{t.kick}</div><h1 className={c.big} style={{ fontSize: 40 }}>{t.ciao} {nome}{t.fine}</h1></div>
          <div className={s.striscia}><Fiamma />{t.giorni}</div>
        </div>
        <div className={`lawn ${s.missione}`}>
          <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true" style={{ flex: "none" }}>
            <circle cx="52" cy="52" r="44" stroke="rgba(0,0,0,.25)" strokeWidth="12" fill="none" />
            <circle cx="52" cy="52" r="44" stroke="#D8F34A" strokeWidth="12" fill="none" strokeDasharray="276" strokeDashoffset="96" strokeLinecap="round" transform="rotate(-90 52 52)" />
            <circle cx="52" cy="52" r="22" fill="#D8F34A" />
            <path d="M38 40c8 6 8 18 0 24M66 40c-8 6-8 18 0 24" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
          <div className={c.grow}><small className={s.k}>{t.missione}</small><div className={s.tit}>{t.obiettivo}</div><div className={s.sub}>{t.esito}</div></div>
        </div>
        <div className={c.sezione}><h2>{t.badge}</h2><span className="muted">{t.badgeN}</span></div>
        <div className={s.badges}>
          <span className={s.badge} style={{ background: "#D8F34A", color: "#0B0B0C" }}><Stella size={28} /></span>
          <span className={s.badge} style={{ background: "#3D8BFF", color: "#fff" }}><Bersaglio size={28} /></span>
          <span className={s.badge} style={{ background: "#FF9F43", color: "#fff" }}><Fiamma size={28} /></span>
          <span className={`${s.badge} ${s.bloccato}`} role="img" aria-label={t.lucchetto}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
          </span>
        </div>
        <div className={c.sezione}><h2>{t.casa}</h2><span className="muted">{t.minuti}</span></div>
        {[["#3D8BFF", t.e1, t.e1s], ["#FF9F43", t.e2, t.e2s]].map(([col, nomeEs, sotto]) => (
          <Link key={nomeEs} href={ROTTE.SessioneAtletica} className={c.li}>
            <span className={c.ic} style={{ background: col, color: "#fff" }}><Play size={18} colore="currentColor" /></span>
            <span className={c.grow}><span className={c.liT}>{nomeEs}</span><span className={c.liS}>{sotto}</span></span>
            <span className={`${c.tag} ${s.stella}`}>{t.stella}</span>
          </Link>
        ))}
      </div>
    </Schermo>
  );
}
