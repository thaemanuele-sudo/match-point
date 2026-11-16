"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { chiaveErrore, ErroreHttp, PERCORSO_ACCESSO, type ChiaveErrore } from "./erroriAI";
import { ROTTE } from "@/lib/rotte";
import s from "./ChatAI.module.css";

const T = {
  it: {
    back: "Indietro",
    coach_ai: "Coach AI",
    coach_with_tommaso_u12: "Maestro · con Tommaso, U12",
    talk_by_voice: "Parla a voce",
    forehand_0_08: "Diritto · 0:08",
    look_at_tommaso_s: "Guarda il diritto di Tommaso, cosa sbaglia?",
    i_analyzed_4_crosscourt: "Ho analizzato 4 diritti incrociati. C'è un errore che si ripete:",
    late_contact: "Impatto in ritardo",
    the_ball_is_hit: "La palla viene colpita dietro l'anca",
    shall_i_prepare_3: "Ti preparo 3 esercizi propedeutici e una scheda per le gambe?",
    see_correction: "Vedi correzione",
    fitness_analysis: "Analisi atletica",
    attach_video: "Allega video",
    message: "Messaggio",
    ask_coach_ai: "Chiedi al Coach AI…",
    send: "Invia",
    sug1: "Come miglioro il mio diritto?",
    sug2: "Esercizi per il servizio",
    sug3: "Scheda per le gambe",
    err_accesso: "Accedi per parlare con il Coach AI.",
    err_budget: "Hai raggiunto il limite di utilizzo AI di questo mese.",
    err_chiave: "Il Coach AI non è ancora configurato. Riprova più tardi.",
    err_limite: "Troppe richieste ravvicinate: attendi qualche secondo.",
    err_generico: "Non sono riuscito a rispondere. Riprova.",
    login: "Vai all'accesso",
    retry: "Riprova",
  },
  en: {
    back: "Back",
    coach_ai: "Coach AI",
    coach_with_tommaso_u12: "Coach · with Tommaso, U12",
    talk_by_voice: "Talk by voice",
    forehand_0_08: "Forehand · 0:08",
    look_at_tommaso_s: "Look at Tommaso's forehand, what's he doing wrong?",
    i_analyzed_4_crosscourt: "I've analyzed 4 crosscourt forehands. There's a recurring error:",
    late_contact: "Late contact",
    the_ball_is_hit: "The ball is hit behind the hip",
    shall_i_prepare_3: "Shall I prepare 3 lead-up drills and a leg workout?",
    see_correction: "See correction",
    fitness_analysis: "Fitness analysis",
    attach_video: "Attach video",
    message: "Message",
    ask_coach_ai: "Ask Coach AI…",
    send: "Send",
    sug1: "How do I improve my forehand?",
    sug2: "Serve drills",
    sug3: "Leg workout",
    err_accesso: "Sign in to talk to the AI Coach.",
    err_budget: "You have reached this month's AI usage limit.",
    err_chiave: "The AI Coach is not set up yet. Try again later.",
    err_limite: "Too many requests in a row: wait a few seconds.",
    err_generico: "I couldn't answer. Try again.",
    login: "Go to sign in",
    retry: "Try again",
  },
  fr: {
    back: "Retour",
    coach_ai: "Coach IA",
    coach_with_tommaso_u12: "Entraîneur · avec Tommaso, U12",
    talk_by_voice: "Parler à voix haute",
    forehand_0_08: "Coup droit · 0:08",
    look_at_tommaso_s: "Regarde le coup droit de Tommaso, qu'est-ce qui ne va pas ?",
    i_analyzed_4_crosscourt: "J'ai analysé 4 coups droits croisés. Une erreur se répète :",
    late_contact: "Impact en retard",
    the_ball_is_hit: "La balle est frappée derrière la hanche",
    shall_i_prepare_3: "Je te prépare 3 exercices éducatifs et un programme pour les jambes ?",
    see_correction: "Voir la correction",
    fitness_analysis: "Analyse physique",
    attach_video: "Joindre une vidéo",
    message: "Message",
    ask_coach_ai: "Demande au Coach IA…",
    send: "Envoyer",
    sug1: "Comment améliorer mon coup droit ?",
    sug2: "Exercices pour le service",
    sug3: "Programme pour les jambes",
    err_accesso: "Connecte-toi pour parler au Coach IA.",
    err_budget: "Tu as atteint la limite d'utilisation IA de ce mois-ci.",
    err_chiave: "Le Coach IA n'est pas encore configuré. Réessaie plus tard.",
    err_limite: "Trop de demandes d'affilée : attends quelques secondes.",
    err_generico: "Je n'ai pas pu répondre. Réessaie.",
    login: "Aller à la connexion",
    retry: "Réessayer",
  },
  de: {
    back: "Zurück",
    coach_ai: "Coach AI",
    coach_with_tommaso_u12: "Trainer · mit Tommaso, U12",
    talk_by_voice: "Per Sprache sprechen",
    forehand_0_08: "Vorhand · 0:08",
    look_at_tommaso_s: "Schau dir Tommasos Vorhand an. Was macht er falsch?",
    i_analyzed_4_crosscourt: "Ich habe 4 Cross-Vorhände analysiert. Es gibt einen wiederkehrenden Fehler:",
    late_contact: "Verspäteter Kontakt",
    the_ball_is_hit: "Der Ball wird hinter der Hüfte getroffen",
    shall_i_prepare_3: "Soll ich dir 3 vorbereitende Übungen und einen Beinplan zusammenstellen?",
    see_correction: "Korrektur ansehen",
    fitness_analysis: "Athletikanalyse",
    attach_video: "Video anhängen",
    message: "Nachricht",
    ask_coach_ai: "Frag den Coach AI…",
    send: "Senden",
    sug1: "Wie verbessere ich meine Vorhand?",
    sug2: "Übungen für den Aufschlag",
    sug3: "Beinprogramm",
    err_accesso: "Melde dich an, um mit dem Coach AI zu sprechen.",
    err_budget: "Du hast das KI-Nutzungslimit für diesen Monat erreicht.",
    err_chiave: "Der Coach AI ist noch nicht eingerichtet. Versuch es später erneut.",
    err_limite: "Zu viele Anfragen hintereinander: Warte ein paar Sekunden.",
    err_generico: "Ich konnte nicht antworten. Versuch es noch einmal.",
    login: "Zur Anmeldung",
    retry: "Erneut versuchen",
  },
  es: {
    back: "Atrás",
    coach_ai: "Coach AI",
    coach_with_tommaso_u12: "Entrenador · con Tommaso, U12",
    talk_by_voice: "Hablar por voz",
    forehand_0_08: "Derecha · 0:08",
    look_at_tommaso_s: "Mira la derecha de Tommaso, ¿qué falla?",
    i_analyzed_4_crosscourt: "He analizado 4 derechas cruzadas. Hay un error que se repite:",
    late_contact: "Impacto tardío",
    the_ball_is_hit: "La bola se golpea detrás de la cadera",
    shall_i_prepare_3: "¿Te preparo 3 ejercicios progresivos y una ficha para las piernas?",
    see_correction: "Ver corrección",
    fitness_analysis: "Análisis físico",
    attach_video: "Adjuntar vídeo",
    message: "Mensaje",
    ask_coach_ai: "Pregúntale al Coach AI…",
    send: "Enviar",
    sug1: "¿Cómo mejoro mi derecha?",
    sug2: "Ejercicios para el saque",
    sug3: "Ficha para las piernas",
    err_accesso: "Inicia sesión para hablar con el Coach AI.",
    err_budget: "Has alcanzado el límite de uso de IA de este mes.",
    err_chiave: "El Coach AI todavía no está configurado. Inténtalo más tarde.",
    err_limite: "Demasiadas peticiones seguidas: espera unos segundos.",
    err_generico: "No he podido responder. Inténtalo de nuevo.",
    login: "Ir al inicio de sesión",
    retry: "Reintentar",
  },
};

type Msg = { ruolo: "user" | "assistant"; testo: string };

export function ChatAI() {
  const t = useT(T);
  const { lang } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<{ chiave: ChiaveErrore; domanda: string } | null>(null);
  const lista = useRef<HTMLDivElement>(null);

  // Storico: ultime 30 righe di chat_messages (il server le salva a ogni risposta).
  useEffect(() => {
    let vivo = true;
    supabaseBrowser()
      .from("chat_messages")
      .select("ruolo,testo,creato_il")
      .order("creato_il", { ascending: false })
      .limit(30)
      .then(({ data }: { data: Msg[] | null }) => {
        if (!vivo) return;
        if (data) setMsgs((cur) => (cur.length ? cur : [...data].reverse().map((m) => ({ ruolo: m.ruolo, testo: m.testo }))));
        setCaricato(true);
      });
    return () => { vivo = false; };
  }, []);

  // Scorre in fondo a ogni nuovo testo (anche durante lo streaming).
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [msgs, errore]);

  async function invia(domanda: string, base: Msg[] = msgs) {
    const q = domanda.trim();
    if (!q || invio) return;
    const conv: Msg[] = [...base, { ruolo: "user", testo: q }];
    setMsgs([...conv, { ruolo: "assistant", testo: "" }]);
    setTesto("");
    setInvio(true);
    setErrore(null);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messaggi: conv.slice(-20), lingua: lang }),
      });
      if (!r.ok || !r.body) throw new ErroreHttp(r.status || 500);
      // Risposta in streaming text/plain: si accoda ogni pezzo al messaggio del Coach.
      const lettore = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await lettore.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const corrente = acc;
        setMsgs([...conv, { ruolo: "assistant", testo: corrente }]);
      }
      if (!acc.trim()) throw new ErroreHttp(500);
    } catch (e) {
      setMsgs(conv);
      setErrore({ chiave: chiaveErrore(e instanceof ErroreHttp ? e.stato : 500), domanda: q });
    } finally {
      setInvio(false);
    }
  }

  const ultimoVuoto = msgs.length > 0 && msgs[msgs.length - 1].ruolo === "assistant" && msgs[msgs.length - 1].testo === "";
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <header className={s.e1}>
        <Link href={ROTTE.Main} className={`icon ${s.icon}`} aria-label={t.back}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <div className={s.e2}>
          <div className={s.e3}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
            </svg>
          </div>
          <div>
            <div className={s.e4}>
              {t.coach_ai}
            </div>
            <div className={`muted ${s.muted} ${s.e5}`}>
              {t.coach_with_tommaso_u12}
            </div>
          </div>
        </div>
        <Link href={ROTTE.Vocale} className={`icon ${s.icon}`} aria-label={t.talk_by_voice}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" />
          </svg>
        </Link>
      </header>
      <div className={s.e6} ref={lista} aria-live="polite">
        {caricato && msgs.length === 0 && (
          <>
        <div className={s.e7}>
          <div className={s.e8}>
            <svg className={s.e9} width="220" height="140" viewBox="0 0 220 140" aria-hidden="true">
              <defs>
                <linearGradient id="l4" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#F3F6F1" />
                  <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
                </linearGradient>
                <radialGradient id="h4" cx=".35" cy=".3" r=".8">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
                </radialGradient>
                <linearGradient id="t4" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                  <stop offset="1" stopColor="#D8F34A" />
                </linearGradient>
                <filter id="g4" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="s4" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor="#000" stopOpacity=".55" />
                  <stop offset="1" stopColor="#000" stopOpacity="0" />
                </radialGradient>
              </defs>
              <line x1="-58" y1="128" x2="-370" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="-30" y1="128" x2="-290" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="-2" y1="128" x2="-210" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="26" y1="128" x2="-130" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="54" y1="128" x2="-50" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="82" y1="128" x2="30" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="110" y1="128" x2="110" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="138" y1="128" x2="190" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="166" y1="128" x2="270" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="194" y1="128" x2="350" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="222" y1="128" x2="430" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="250" y1="128" x2="510" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="278" y1="128" x2="590" y2="140" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="0" y1="128" x2="220" y2="128" stroke="#4FD1FF" strokeOpacity="0.130" />
              <line x1="0" y1="131" x2="220" y2="131" stroke="#4FD1FF" strokeOpacity="0.118" />
              <line x1="0" y1="140" x2="220" y2="140" stroke="#4FD1FF" strokeOpacity="0.106" />
              <line x1="0" y1="155" x2="220" y2="155" stroke="#4FD1FF" strokeOpacity="0.094" />
              <line x1="0" y1="176" x2="220" y2="176" stroke="#4FD1FF" strokeOpacity="0.082" />
              <line x1="0" y1="203" x2="220" y2="203" stroke="#4FD1FF" strokeOpacity="0.070" />
              <line x1="0" y1="236" x2="220" y2="236" stroke="#4FD1FF" strokeOpacity="0.058" />
              <line x1="0" y1="275" x2="220" y2="275" stroke="#4FD1FF" strokeOpacity="0.046" />
              <line x1="0" y1="320" x2="220" y2="320" stroke="#4FD1FF" strokeOpacity="0.034" />
              <polygon points="61.4,56.8 72.9,53.9 73.6,85.4 65.0,86.1" fill="#4FD1FF" fillOpacity="0.08" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
              <line x1="68.6" y1="52.5" x2="68.6" y2="41.7" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="61.4" y1="56.8" x2="50.7" y2="63.9" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="50.7" y1="63.9" x2="43.5" y2="57.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="72.9" y1="53.9" x2="80.0" y2="63.2" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="80.0" y1="63.2" x2="84.3" y2="68.9" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="65.0" y1="86.1" x2="62.1" y2="108.3" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="62.1" y1="108.3" x2="53.6" y2="134.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="73.6" y1="85.4" x2="82.9" y2="107.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="82.9" y1="107.5" x2="81.4" y2="134.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="68.6" cy="41.7" r="4.6" fill="none" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.6" />
              <line x1="43.5" y1="57.5" x2="31.5" y2="49.8" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.0" strokeLinecap="round" />
              <ellipse cx="21.8" cy="43.7" rx="11.4" ry="7.5" transform="rotate(-147.5 21.8 43.7)" fill="#4FD1FF" fillOpacity="0.02" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.5" />
              <ellipse cx="120" cy="138" rx="25" ry="4" fill="url(#s4)" />
              <polygon points="125.7,56.0 115.7,54.6 115.0,86.1 121.4,86.1" fill="url(#l4)" stroke="url(#l4)" strokeWidth="5.7" strokeLinejoin="round" opacity="1.0" />
              <line x1="120.7" y1="55.3" x2="118.2" y2="86.1" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="0.7" strokeDasharray="1.4 1.4" />
              <line x1="121.8" y1="53.2" x2="122.9" y2="42.5" stroke="#050505" strokeWidth="3.9" strokeLinecap="round" opacity=".6" />
              <line x1="121.8" y1="53.2" x2="122.9" y2="42.5" stroke="url(#l4)" strokeWidth="2.5" strokeLinecap="round" opacity="1.0" />
              <line x1="121.8" y1="53.2" x2="122.9" y2="42.5" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.7" strokeLinecap="round" />
              <line x1="125.7" y1="56.0" x2="132.9" y2="68.2" stroke="#050505" strokeWidth="5.4" strokeLinecap="round" opacity=".6" />
              <line x1="125.7" y1="56.0" x2="132.9" y2="68.2" stroke="url(#l4)" strokeWidth="3.9" strokeLinecap="round" opacity="1.0" />
              <line x1="125.7" y1="56.0" x2="132.9" y2="68.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="132.9" y1="68.2" x2="142.9" y2="73.9" stroke="#050505" strokeWidth="4.6" strokeLinecap="round" opacity=".6" />
              <line x1="132.9" y1="68.2" x2="142.9" y2="73.9" stroke="url(#l4)" strokeWidth="3.2" strokeLinecap="round" opacity="1.0" />
              <line x1="132.9" y1="68.2" x2="142.9" y2="73.9" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.9" strokeLinecap="round" />
              <line x1="115.7" y1="54.6" x2="109.3" y2="66.1" stroke="#050505" strokeWidth="5.4" strokeLinecap="round" opacity=".6" />
              <line x1="115.7" y1="54.6" x2="109.3" y2="66.1" stroke="url(#l4)" strokeWidth="3.9" strokeLinecap="round" opacity="1.0" />
              <line x1="115.7" y1="54.6" x2="109.3" y2="66.1" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
              <line x1="109.3" y1="66.1" x2="105.0" y2="73.2" stroke="#050505" strokeWidth="4.6" strokeLinecap="round" opacity=".6" />
              <line x1="109.3" y1="66.1" x2="105.0" y2="73.2" stroke="url(#l4)" strokeWidth="3.2" strokeLinecap="round" opacity="1.0" />
              <line x1="109.3" y1="66.1" x2="105.0" y2="73.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="0.9" strokeLinecap="round" />
              <line x1="121.4" y1="86.1" x2="132.9" y2="107.5" stroke="#050505" strokeWidth="6.8" strokeLinecap="round" opacity=".6" />
              <line x1="121.4" y1="86.1" x2="132.9" y2="107.5" stroke="url(#l4)" strokeWidth="5.4" strokeLinecap="round" opacity="1.0" />
              <line x1="121.4" y1="86.1" x2="132.9" y2="107.5" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="132.9" y1="107.5" x2="130.0" y2="134.0" stroke="#050505" strokeWidth="5.7" strokeLinecap="round" opacity=".6" />
              <line x1="132.9" y1="107.5" x2="130.0" y2="134.0" stroke="url(#l4)" strokeWidth="4.3" strokeLinecap="round" opacity="1.0" />
              <line x1="132.9" y1="107.5" x2="130.0" y2="134.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="115.0" y1="86.1" x2="116.4" y2="109.0" stroke="#050505" strokeWidth="6.8" strokeLinecap="round" opacity=".6" />
              <line x1="115.0" y1="86.1" x2="116.4" y2="109.0" stroke="url(#l4)" strokeWidth="5.4" strokeLinecap="round" opacity="1.0" />
              <line x1="115.0" y1="86.1" x2="116.4" y2="109.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="116.4" y1="109.0" x2="108.6" y2="134.0" stroke="#050505" strokeWidth="5.7" strokeLinecap="round" opacity=".6" />
              <line x1="116.4" y1="109.0" x2="108.6" y2="134.0" stroke="url(#l4)" strokeWidth="4.3" strokeLinecap="round" opacity="1.0" />
              <line x1="116.4" y1="109.0" x2="108.6" y2="134.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="122.9" cy="42.5" r="4.6" fill="url(#h4)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
              <line x1="142.9" y1="73.9" x2="157.1" y2="72.7" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.8" strokeLinecap="round" />
              <ellipse cx="168.5" cy="71.8" rx="11.4" ry="7.5" transform="rotate(-4.8 168.5 71.8)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.1" />
              <g transform="rotate(-4.8 168.5 71.8)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
                <line x1="157.8" y1="67.5" x2="179.3" y2="67.5" />
                <line x1="157.8" y1="69.6" x2="179.3" y2="69.6" />
                <line x1="157.8" y1="71.8" x2="179.3" y2="71.8" />
                <line x1="157.8" y1="73.9" x2="179.3" y2="73.9" />
                <line x1="157.8" y1="76.1" x2="179.3" y2="76.1" />
                <line x1="162.1" y1="65.0" x2="162.1" y2="78.6" />
                <line x1="165.3" y1="65.0" x2="165.3" y2="78.6" />
                <line x1="168.5" y1="65.0" x2="168.5" y2="78.6" />
                <line x1="171.8" y1="65.0" x2="171.8" y2="78.6" />
                <line x1="175.0" y1="65.0" x2="175.0" y2="78.6" />
              </g>
              <ellipse cx="168.5" cy="71.8" rx="11.4" ry="7.5" transform="rotate(-4.8 168.5 71.8)" fill="none" stroke="#F0454A" strokeWidth="0.7" />
              <circle cx="121.8" cy="53.2" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="121.8" cy="53.2" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="125.7" cy="56.0" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="125.7" cy="56.0" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="115.7" cy="54.6" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="115.7" cy="54.6" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="132.9" cy="68.2" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="132.9" cy="68.2" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="109.3" cy="66.1" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="109.3" cy="66.1" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="142.9" cy="73.9" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="142.9" cy="73.9" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="105.0" cy="73.2" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="105.0" cy="73.2" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="121.4" cy="86.1" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="121.4" cy="86.1" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="115.0" cy="86.1" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="115.0" cy="86.1" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="132.9" cy="107.5" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="132.9" cy="107.5" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="116.4" cy="109.0" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="116.4" cy="109.0" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="130.0" cy="134.0" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="130.0" cy="134.0" r="1.3" fill="#D8F34A" filter="url(#g4)" />
              <circle cx="108.6" cy="134.0" r="2.5" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="108.6" cy="134.0" r="1.3" fill="#D8F34A" filter="url(#g4)" />
            </svg>
            <div className={s.e10}>
              <div className={s.e11}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <span className={s.e12}>
              {t.forehand_0_08}
            </span>
          </div>
          <div className={s.e13}>
            {t.look_at_tommaso_s}
          </div>
        </div>
        <div className={s.ai}>
          <span>
            {t.i_analyzed_4_crosscourt}
          </span>
          <Link href={ROTTE.Analisi} className={s.e14}>
            <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="23" stroke="#3A2A22" strokeWidth="6" fill="none" />
              <circle cx="28" cy="28" r="23" stroke="#FF8A6B" strokeWidth="6" fill="none" strokeDasharray="144.5" strokeDashoffset="40" strokeLinecap="round" transform="rotate(-90 28 28)" />
              <text x="28" y="33" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="17" fill="#F3F6F1">
                72%
              </text>
            </svg>
            <div className={s.e15}>
              <div className={s.e16}>
                {t.late_contact}
              </div>
              <div className={`muted ${s.muted} ${s.e17}`}>
                {t.the_ball_is_hit}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1A6" strokeWidth="2" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
          <span>
            {t.shall_i_prepare_3}
          </span>
          <div className={s.e18}>
            <Link href={ROTTE.Analisi} className={`chip ${s.chip}`}>
              {t.see_correction}
            </Link>
            <Link href={ROTTE.AnalisiAtletica} className={`chip ${s.chip}`}>
              {t.fitness_analysis}
            </Link>
          </div>
        </div>
            <div className={s.e18}>
              {[t.sug1, t.sug2, t.sug3].map((q) => (
                <button type="button" key={q} className={`chip ${s.chip}`} onClick={() => invia(q)}>
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {msgs.map((m, i) =>
          m.ruolo === "user" ? (
            <div key={i} className={`${s.e13} ${s.mio}`}>{m.testo}</div>
          ) : m.testo ? (
            <div key={i} className={`${s.ai} ${s.bot}`}>{m.testo}</div>
          ) : null,
        )}
        {invio && ultimoVuoto && (
          <div className={`${s.ai} ${s.e19}`} aria-label="…">
            <span className={s.dot} />
            <span className={`${s.dot} ${s.e20}`} />
            <span className={`${s.dot} ${s.e21}`} />
          </div>
        )}
        {errore && (
          <div className={`${s.ai} ${s.bot}`} role="alert">
            <span>{t[`err_${errore.chiave}` as "err_generico"]}</span>
            <div className={s.e18}>
              {errore.chiave === "accesso" ? (
                <Link href={PERCORSO_ACCESSO} className={`chip ${s.chip}`}>{t.login}</Link>
              ) : (
                <button type="button" className={`chip ${s.chip}`} onClick={() => invia(errore.domanda, msgs)}>{t.retry}</button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className={s.e22}>
        <Link href={ROTTE.Carica} className={`icon ${s.icon} ${s.e23}`} aria-label={t.attach_video}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
        <form className={s.e24} onSubmit={(e) => { e.preventDefault(); invia(testo); }}>
          <span className={s.e25}>
            {t.message}
          </span>
          <input className={s.e26} placeholder={t.ask_coach_ai} aria-label={t.ask_coach_ai} value={testo} onChange={(e) => setTesto(e.target.value)} maxLength={2000} />
          <button className={s.e27} aria-label={t.send} type="submit" disabled={invio || !testo.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
      </div>
    </Schermo>
  );
}
