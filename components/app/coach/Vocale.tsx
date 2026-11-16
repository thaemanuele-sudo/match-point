"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { LinguaChip } from "../LinguaChip";
import { chiaveErrore, ErroreHttp, PERCORSO_ACCESSO, type ChiaveErrore } from "./erroriAI";
import { ROTTE } from "@/lib/rotte";
import s from "./Vocale.module.css";

const T = {
  it: {
    english: "Italiano",
    close: "Chiudi",
    listening: "Sto ascoltando",
    add_some_split_step: "\"Aggiungi un lavoro di split-step, Luca arriva sempre fermo sulla palla\"",
    coach_ai: "Coach AI",
    added_reactive_split_step: " · Aggiunto \"Split-step reattivo\" a inizio lezione: 2 serie da 8, 6 minuti.",
    pause: "Pausa",
    end: "Termina",
    idle: "Tocca il microfono e parla",
    thinking: "Sto pensando",
    speaking: "Ti rispondo",
    speak: "Parla",
    send: "Invia",
    placeholder: "Scrivi qui la tua domanda…",
    no_voice: "Il riconoscimento vocale non è disponibile su questo browser: scrivi la domanda.",
    err_mic: "Non posso usare il microfono: controlla i permessi del browser.",
    err_accesso: "Accedi per parlare con il Coach AI.",
    err_budget: "Hai raggiunto il limite di utilizzo AI di questo mese.",
    err_chiave: "Il Coach AI non è ancora configurato. Riprova più tardi.",
    err_limite: "Troppe richieste ravvicinate: attendi qualche secondo.",
    err_generico: "Non sono riuscito a rispondere. Riprova.",
    login: "Vai all'accesso",
  },
  en: {
    english: "English",
    close: "Close",
    listening: "Listening",
    add_some_split_step: "\"Add some split step work, Luca always arrives flat-footed on the ball\"",
    coach_ai: "Coach AI",
    added_reactive_split_step: " · Added \"Reactive split step\" at the start of the lesson: 2 sets of 8, 6 minutes.",
    pause: "Pause",
    end: "End",
    idle: "Tap the microphone and speak",
    thinking: "Thinking",
    speaking: "Answering",
    speak: "Speak",
    send: "Send",
    placeholder: "Type your question here…",
    no_voice: "Speech recognition is not available in this browser: type your question.",
    err_mic: "I can't use the microphone: check the browser permissions.",
    err_accesso: "Sign in to talk to the AI Coach.",
    err_budget: "You have reached this month's AI usage limit.",
    err_chiave: "The AI Coach is not set up yet. Try again later.",
    err_limite: "Too many requests in a row: wait a few seconds.",
    err_generico: "I couldn't answer. Try again.",
    login: "Go to sign in",
  },
};

// Tipi minimi del riconoscimento vocale del browser (non sono in lib.dom).
type Riconoscitore = {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type CostruttoreRiconoscitore = new () => Riconoscitore;
const costruttore = (): CostruttoreRiconoscitore | null => {
  const w = window as unknown as { SpeechRecognition?: CostruttoreRiconoscitore; webkitSpeechRecognition?: CostruttoreRiconoscitore };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

type Fase = "idle" | "ascolto" | "penso" | "parlo";
type Msg = { ruolo: "user" | "assistant"; testo: string };

export function Vocale() {
  const t = useT(T);
  const { lang } = useLang();
  const [fase, setFase] = useState<Fase>("idle");
  const [domanda, setDomanda] = useState("");
  const [risposta, setRisposta] = useState("");
  const [errore, setErrore] = useState<ChiaveErrore | "mic" | null>(null);
  const [supportato, setSupportato] = useState(true);
  const [bozza, setBozza] = useState("");
  const rec = useRef<Riconoscitore | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const storico = useRef<Msg[]>([]);
  const annulla = useRef(false); // true quando l'utente interrompe: ignora le risposte in arrivo

  const fermaAudio = () => {
    if (audio.current) {
      audio.current.pause();
      const src = audio.current.src;
      audio.current = null;
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    }
  };

  // Domanda → /api/ai/chat (streaming) → /api/ai/voce (audio/mpeg) → riproduzione.
  const rispondi = useCallback(async (testo: string) => {
    const q = testo.trim();
    if (!q) { setFase("idle"); return; }
    annulla.current = false;
    setDomanda(q);
    setRisposta("");
    setErrore(null);
    setFase("penso");
    const conv: Msg[] = [...storico.current, { ruolo: "user" as const, testo: q }].slice(-12);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messaggi: conv, lingua: lang }),
      });
      if (!r.ok || !r.body) throw new ErroreHttp(r.status || 500);
      const lettore = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await lettore.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        if (annulla.current) { lettore.cancel().catch(() => undefined); return; }
        setRisposta(acc);
      }
      if (annulla.current) return;
      if (!acc.trim()) throw new ErroreHttp(500);
      storico.current = [...conv, { ruolo: "assistant", testo: acc }];

      // Lettura ad alta voce: se la voce non è disponibile il testo resta comunque visibile.
      setFase("parlo");
      try {
        const v = await fetch("/api/ai/voce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testo: acc.slice(0, 1500), lingua: lang }),
        });
        if (!v.ok) throw new ErroreHttp(v.status);
        const blob = await v.blob();
        if (annulla.current) return;
        fermaAudio();
        const a = new Audio(URL.createObjectURL(blob));
        audio.current = a;
        const fine = () => { if (audio.current === a) { fermaAudio(); setFase("idle"); } };
        a.onended = fine;
        a.onerror = fine;
        await a.play();
      } catch {
        if (!annulla.current) setFase("idle");
      }
    } catch (e) {
      if (annulla.current) return;
      setErrore(chiaveErrore(e instanceof ErroreHttp ? e.stato : 500));
      setFase("idle");
    }
  }, [lang]);

  const ascolta = useCallback(() => {
    const C = costruttore();
    if (!C) return;
    fermaAudio();
    annulla.current = true;
    const r = new C();
    rec.current = r;
    r.lang = lang === "it" ? "it-IT" : "en-US";
    r.interimResults = true;
    r.continuous = false;
    let finale = "";
    let provvisorio = "";
    r.onresult = (e) => {
      finale = "";
      provvisorio = "";
      for (let i = 0; i < e.results.length; i++) {
        const parte = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) finale += parte; else provvisorio += parte;
      }
      setDomanda((finale + provvisorio).trim());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setErrore("mic");
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      const testo = (finale || provvisorio).trim();
      if (testo) rispondi(testo); else setFase("idle");
    };
    setErrore(null);
    setDomanda("");
    setRisposta("");
    setFase("ascolto");
    try { r.start(); } catch { setFase("idle"); }
  }, [lang, rispondi]);

  const ferma = () => {
    annulla.current = true;
    const r = rec.current;
    rec.current = null;
    r?.abort();
    fermaAudio();
    setFase("idle");
  };

  // All'apertura parte subito l'ascolto (se il browser lo supporta); all'uscita si spegne tutto.
  useEffect(() => {
    if (costruttore()) ascolta(); else setSupportato(false);
    return () => {
      annulla.current = true;
      rec.current?.abort();
      rec.current = null;
      fermaAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const etichetta = fase === "ascolto" ? t.listening : fase === "penso" ? t.thinking : fase === "parlo" ? t.speaking : supportato ? t.idle : t.no_voice;
  return (
    <Schermo senzaBarra>
      <div className={s.app}>
      <div className={`${s.scr} ${s.full} ${s.e1}`}>
        <div className={s.e2}>
          <LinguaChip />
          <Link href={ROTTE.ChatAI} className={`icon ${s.icon}`} aria-label={t.close}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>
        <div className={s.e3}>
          <div className={s.e4} />
          <div className={s.e5}>
            <span className={s.e6} />
            <span className={s.e7} />
            <span className={s.e8} />
            <span className={s.e9} />
            <span className={s.e10} />
            <span className={s.e11} />
            <span className={s.e12} />
            <span className={s.e13} />
            <span className={s.e14} />
            <span className={s.e15} />
          </div>
          <div className={s.e16}>
            <div className={s.kick}>
              {etichetta}
            </div>
            <div className={s.e17}>
              {domanda}
            </div>
          </div>
        </div>
        {(risposta || errore) && (
        <div className={`card ${s.card} ${s.pad} ${s.e18}`} role={errore ? "alert" : undefined}>
          {errore ? (
            <>
              {t[`err_${errore}` as "err_generico"]}
              {errore === "accesso" && <> <Link href={PERCORSO_ACCESSO}>{t.login}</Link></>}
            </>
          ) : (
            <>
              <b className={s.e19}>{t.coach_ai}</b>
              {" · "}{risposta}
            </>
          )}
        </div>
        )}
        {!supportato && (
          <form className={s.testo} onSubmit={(e) => { e.preventDefault(); const q = bozza; setBozza(""); rispondi(q); }}>
            <input className="field" value={bozza} onChange={(e) => setBozza(e.target.value)} placeholder={t.placeholder} maxLength={1500} aria-label={t.placeholder} />
            <button type="submit" className="btn" disabled={fase === "penso" || !bozza.trim()}>{t.send}</button>
          </form>
        )}
        <div className={s.e20}>
          <button className={`icon ${s.icon} ${s.e21}`} aria-label={fase === "ascolto" ? t.pause : t.speak} type="button" disabled={!supportato} onClick={() => (fase === "ascolto" ? ferma() : ascolta())}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {fase === "ascolto" ? <path d="M8 5v14M16 5v14" /> : <path d="M9 3h6v12H9zM5 11a7 7 0 0014 0M12 18v3" />}
            </svg>
          </button>
          <Link href={ROTTE.ChatAI} className={`icon ${s.icon} ${s.e22}`} aria-label={t.end} onClick={ferma}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>
      </div>
      </div>
    </Schermo>
  );
}
