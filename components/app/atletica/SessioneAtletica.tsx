"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Schermo } from "../Schermo";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { formatta } from "./useVideoAtletica";
import { FIGURA_SESSIONE } from "./figure";
import s from "./atletica.module.css";

const T = {
  it: {
    chiudi: "Chiudi", esercizio: "Esercizio", di: "di", voce: "Voce", guida: "Video guida", serie: "serie", pausa: "Pausa", riprendi: "Riprendi", fatta: "Serie fatta",
    dolore: "Sento dolore", nota: "In caso di dolore l'AI sospende l'esercizio e consiglia un professionista.",
    sospeso: "Esercizio sospeso. Se il dolore continua fermati e parlane con il maestro o con un professionista della salute.", esci: "Esci", fine: "Sessione completata", fineSub: "Bravo! Hai chiuso tutti gli esercizi.", torna: "Torna all'atletica",
    timer: "Tempo rimasto della serie",
  },
  en: {
    chiudi: "Close", esercizio: "Drill", di: "of", voce: "Voice", guida: "Guide video", serie: "set", pausa: "Pause", riprendi: "Resume", fatta: "Set done",
    dolore: "I feel pain", nota: "If there's pain, the AI stops the drill and recommends a professional.",
    sospeso: "Drill stopped. If the pain continues, stop and talk to your coach or a health professional.", esci: "Leave", fine: "Session complete", fineSub: "Well done! You finished every drill.", torna: "Back to fitness",
    timer: "Time left in the set",
  },
};
// Esercizi dimostrativi della sessione di oggi: [nome, area, ripetizioni, unità]
const ESERCIZI = {
  it: [["Skip e calciata", "RISCALDAMENTO", 20, "passi"], ["Salti su mini ostacoli", "SPINTA GAMBE", 8, "salti"], ["Split step al segnale", "REATTIVITÀ", 10, "ripetizioni"], ["Balzi laterali", "SPINTA GAMBE", 8, "balzi"], ["Partenze in 5 metri", "VELOCITÀ", 6, "scatti"], ["Rotazioni con palla medica", "BUSTO E CORE", 12, "rotazioni"]],
  en: [["Skips and butt kicks", "WARM-UP", 20, "steps"], ["Mini-hurdle jumps", "LEG DRIVE", 8, "jumps"], ["Split step on signal", "REACTIVITY", 10, "reps"], ["Lateral bounds", "LEG DRIVE", 8, "bounds"], ["5-meter starts", "SPEED", 6, "sprints"], ["Medicine ball rotations", "TORSO AND CORE", 12, "rotations"]],
} as const;
const SERIE = 3;
const DURATA = 60; // secondi a disposizione per ogni serie
const CIRC = 465; // circonferenza dell'anello (2π·74)

export function SessioneAtletica() {
  const t = useT(T);
  const { lang } = useLang();
  const lista = ESERCIZI[lang];
  const [ex, setEx] = useState(0);
  const [serie, setSerie] = useState(1);
  const [rim, setRim] = useState(DURATA);
  const [inCorso, setInCorso] = useState(true);
  const [dolore, setDolore] = useState(false);
  const [finito, setFinito] = useState(false);
  const [voce, setVoce] = useState(false);

  // Conto alla rovescia della serie, un secondo alla volta.
  useEffect(() => {
    if (!inCorso || dolore || finito || rim <= 0) return;
    const id = setTimeout(() => setRim((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [inCorso, dolore, finito, rim]);

  // Voce: legge il nome dell'esercizio quando cambia (sintesi vocale del browser, se c'è).
  useEffect(() => {
    if (!voce || finito || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(lista[ex][0]);
    u.lang = lang === "it" ? "it-IT" : "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [voce, ex, finito, lang, lista]);

  const serieFatta = () => {
    setRim(DURATA);
    setInCorso(true);
    if (serie < SERIE) return setSerie(serie + 1);
    if (ex < lista.length - 1) { setEx(ex + 1); return setSerie(1); }
    setFinito(true);
  };

  const [nome, area, rip, unita] = lista[ex];

  if (finito) {
    return (
      <Schermo senzaBarra>
        <div className={`${s.r} ${s.largo}`}>
          <div className={s.fine}>
            <span className={s.ic} style={{ width: 54, height: 54, borderRadius: 18, color: "#4CD07D" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
            </span>
            <h2 className={s.disp}>{t.fine}</h2>
            <div className={s.muted}>{t.fineSub}</div>
            <Link href={ROTTE.Atletica} className={s.btn} style={{ alignSelf: "stretch" }}>{t.torna}</Link>
          </div>
        </div>
      </Schermo>
    );
  }

  return (
    <Schermo senzaBarra>
      <div className={`${s.r} ${s.largo}`}>
        <div className={s.sessTop}>
          <Link href={ROTTE.Atletica} className={s.icon} aria-label={t.chiudi}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </Link>
          <span className={s.chipS}>{t.esercizio} {ex + 1} {t.di} {lista.length}</span>
          <button type="button" className={voce ? `${s.chipS} ${s.on}` : s.chipS} aria-pressed={voce} onClick={() => setVoce((v) => !v)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></svg>{t.voce}
          </button>
        </div>
        <div className={`${s.sessLab} ${s.lab}`}>
          <span className={s.sessFig} aria-hidden="true" dangerouslySetInnerHTML={{ __html: FIGURA_SESSIONE }} />
          <span className={`${s.tag} ${s.sessTag}`}>{t.guida}</span>
        </div>
        <div className={s.sessCenter}>
          <div className={s.kick}>{area}</div>
          <div className={`${s.disp} ${s.sessNome}`}>{nome}</div>
        </div>
        <div className={s.anello}>
          <svg width="170" height="170" viewBox="0 0 170 170" role="timer" aria-label={`${t.timer}: ${formatta(rim)}`}>
            <circle cx="85" cy="85" r="74" stroke="#232326" strokeWidth="12" fill="none" />
            <circle cx="85" cy="85" r="74" stroke="#D8F34A" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - rim / DURATA)} transform="rotate(-90 85 85)" style={{ transition: "stroke-dashoffset .9s linear" }} />
            <text x="85" y="92" textAnchor="middle" fontFamily="var(--font-barlow), Barlow Condensed" fontWeight="800" fontSize="46" fill="#F3F6F1">{formatta(rim)}</text>
            <text x="85" y="116" textAnchor="middle" fontSize="12" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.serie} {serie} {t.di} {SERIE} · {rip} {unita}</text>
          </svg>
        </div>
        {dolore ? (
          <div className={s.avviso} role="alert">
            <span>{t.sospeso}</span>
            <div className={s.righe}>
              <button type="button" className={s.btn2} onClick={() => setDolore(false)}>{t.riprendi}</button>
              <Link href={ROTTE.Atletica} className={s.btn2}>{t.esci}</Link>
            </div>
          </div>
        ) : (
          <>
            <div className={s.righe}>
              <button type="button" className={s.btn2} onClick={() => setInCorso((v) => !v)}>
                {inCorso
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
                {inCorso ? t.pausa : t.riprendi}
              </button>
              <button type="button" className={s.btn} style={{ flex: 1 }} onClick={serieFatta}>{t.fatta}</button>
            </div>
            <button type="button" className={`${s.btn2} ${s.dolore}`} onClick={() => { setDolore(true); setInCorso(false); }}>{t.dolore}</button>
            <div className={s.note} style={{ textAlign: "center" }}>{t.nota}</div>
          </>
        )}
      </div>
    </Schermo>
  );
}
