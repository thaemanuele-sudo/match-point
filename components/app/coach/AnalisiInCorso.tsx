"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import type { RisultatoAnalisi } from "@/lib/types";
import { chiaveErrore, ErroreHttp, PERCORSO_ACCESSO, type ChiaveErrore } from "./erroriAI";
import { ROTTE } from "@/lib/rotte";
import s from "./AnalisiInCorso.module.css";

const T = {
  it: {
    back: "Indietro",
    coach_ai_luca_s: "Coach AI",
    analyzing_the_video: "Sto analizzando il video",
    k60_fps_9_s: "FOTOGRAMMI",
    k3d_pose: "POSE 3D",
    under_30_seconds: "meno di 30 secondi",
    upload: "Caricamento",
    k5_15_s_smartphone: "video 5-15 s da smartphone",
    pre_processing: "Pre-elaborazione",
    stroke_cutting_and_stabilization: "taglio dei colpi e stabilizzazione",
    pose_estimation: "Pose estimation",
    k33_keypoints_ball_and: "33 punti chiave, palla e racchetta",
    comparison: "Confronto",
    correct_model_and_error: "modello corretto e catalogo errori",
    proximity_index: "Indice di vicinanza",
    classification_and_priority: "classificazione e priorità",
    see_the_skeleton_in: "Vedi lo scheletro in tempo reale",
    retry: "Riprova",
    login: "Vai all'accesso",
    new_video: "Scegli un altro video",
    err_accesso: "Accedi per analizzare il video.",
    err_budget: "Hai raggiunto il limite di utilizzo AI di questo mese.",
    err_chiave: "L'analisi AI non è ancora configurata. Riprova più tardi.",
    err_limite: "Troppe richieste ravvicinate: attendi qualche secondo.",
    err_generico: "Analisi non riuscita. Controlla la connessione e riprova.",
  },
  en: {
    back: "Back",
    coach_ai_luca_s: "Coach AI",
    analyzing_the_video: "Analyzing the video",
    k60_fps_9_s: "FRAMES",
    k3d_pose: "3D POSE",
    under_30_seconds: "under 30 seconds",
    upload: "Upload",
    k5_15_s_smartphone: "5-15 s smartphone video",
    pre_processing: "Pre-processing",
    stroke_cutting_and_stabilization: "stroke cutting and stabilization",
    pose_estimation: "Pose estimation",
    k33_keypoints_ball_and: "33 keypoints, ball and racket",
    comparison: "Comparison",
    correct_model_and_error: "correct model and error catalog",
    proximity_index: "Proximity index",
    classification_and_priority: "classification and priority",
    see_the_skeleton_in: "See the skeleton in real time",
    retry: "Try again",
    login: "Go to sign in",
    new_video: "Choose another video",
    err_accesso: "Sign in to analyze the video.",
    err_budget: "You have reached this month's AI usage limit.",
    err_chiave: "AI analysis is not set up yet. Try again later.",
    err_limite: "Too many requests in a row: wait a few seconds.",
    err_generico: "Analysis failed. Check your connection and try again.",
  },
  fr: {
    back: "Retour",
    coach_ai_luca_s: "Coach IA",
    analyzing_the_video: "J'analyse la vidéo",
    k60_fps_9_s: "IMAGES",
    k3d_pose: "POSE 3D",
    under_30_seconds: "moins de 30 secondes",
    upload: "Chargement",
    k5_15_s_smartphone: "vidéo de 5-15 s sur smartphone",
    pre_processing: "Prétraitement",
    stroke_cutting_and_stabilization: "découpe des coups et stabilisation",
    pose_estimation: "Estimation de pose",
    k33_keypoints_ball_and: "33 points clés, balle et raquette",
    comparison: "Comparaison",
    correct_model_and_error: "modèle correct et catalogue d'erreurs",
    proximity_index: "Indice de proximité",
    classification_and_priority: "classement et priorités",
    see_the_skeleton_in: "Voir le squelette en temps réel",
    retry: "Réessayer",
    login: "Aller à la connexion",
    new_video: "Choisir une autre vidéo",
    err_accesso: "Connectez-vous pour analyser la vidéo.",
    err_budget: "Vous avez atteint la limite d'utilisation de l'IA de ce mois-ci.",
    err_chiave: "L'analyse IA n'est pas encore configurée. Réessayez plus tard.",
    err_limite: "Trop de requêtes d'affilée : attendez quelques secondes.",
    err_generico: "Échec de l'analyse. Vérifiez votre connexion et réessayez.",
  },
  de: {
    back: "Zurück",
    coach_ai_luca_s: "KI-Coach",
    analyzing_the_video: "Analysiere das Video",
    k60_fps_9_s: "BILDER",
    k3d_pose: "3D-POSE",
    under_30_seconds: "unter 30 Sekunden",
    upload: "Hochladen",
    k5_15_s_smartphone: "Video 5–15 s vom Smartphone",
    pre_processing: "Vorverarbeitung",
    stroke_cutting_and_stabilization: "Zuschnitt der Schläge und Stabilisierung",
    pose_estimation: "Posenerkennung",
    k33_keypoints_ball_and: "33 Schlüsselpunkte, Ball und Schläger",
    comparison: "Vergleich",
    correct_model_and_error: "Korrektes Modell und Fehlerkatalog",
    proximity_index: "Nähe-Index",
    classification_and_priority: "Klassifizierung und Priorität",
    see_the_skeleton_in: "Skelett in Echtzeit ansehen",
    retry: "Erneut versuchen",
    login: "Zur Anmeldung",
    new_video: "Anderes Video wählen",
    err_accesso: "Melde dich an, um das Video zu analysieren.",
    err_budget: "Du hast das monatliche KI-Nutzungslimit erreicht.",
    err_chiave: "Die KI-Analyse ist noch nicht eingerichtet. Versuch es später erneut.",
    err_limite: "Zu viele Anfragen hintereinander: Warte ein paar Sekunden.",
    err_generico: "Analyse fehlgeschlagen. Prüfe deine Verbindung und versuch es erneut.",
  },
  es: {
    back: "Atrás",
    coach_ai_luca_s: "Coach IA",
    analyzing_the_video: "Estoy analizando el vídeo",
    k60_fps_9_s: "FOTOGRAMAS",
    k3d_pose: "POSE 3D",
    under_30_seconds: "menos de 30 segundos",
    upload: "Subiendo",
    k5_15_s_smartphone: "vídeo de 5-15 s desde el móvil",
    pre_processing: "Preprocesado",
    stroke_cutting_and_stabilization: "corte de golpes y estabilización",
    pose_estimation: "Estimación de pose",
    k33_keypoints_ball_and: "33 puntos clave, bola y raqueta",
    comparison: "Comparación",
    correct_model_and_error: "modelo correcto y catálogo de errores",
    proximity_index: "Índice de proximidad",
    classification_and_priority: "clasificación y prioridad",
    see_the_skeleton_in: "Ver el esqueleto en tiempo real",
    retry: "Reintentar",
    login: "Ir al inicio de sesión",
    new_video: "Elegir otro vídeo",
    err_accesso: "Inicia sesión para analizar el vídeo.",
    err_budget: "Has alcanzado el límite de uso de IA de este mes.",
    err_chiave: "El análisis con IA aún no está configurado. Inténtalo más tarde.",
    err_limite: "Demasiadas solicitudes seguidas: espera unos segundos.",
    err_generico: "El análisis no se pudo completar. Revisa tu conexión e inténtalo de nuevo.",
  },
};

const NOMI_COLPO: Record<string, Record<Lingua, string>> = {
  servizio: { it: "Servizio", en: "Serve", fr: "Service", de: "Aufschlag", es: "Saque" },
  diritto: { it: "Diritto", en: "Forehand", fr: "Coup droit", de: "Vorhand", es: "Derecha" },
  rovescio: { it: "Rovescio", en: "Backhand", fr: "Revers", de: "Rückhand", es: "Revés" },
  back: { it: "Back", en: "Slice", fr: "Slice", de: "Slice", es: "Cortado" },
  volee: { it: "Volée", en: "Volley", fr: "Volée", de: "Volley", es: "Volea" },
  volée: { it: "Volée", en: "Volley", fr: "Volée", de: "Volley", es: "Volea" },
  smash: { it: "Smash", en: "Overhead", fr: "Smash", de: "Schmetterball", es: "Smash" },
  risposta: { it: "Risposta", en: "Return", fr: "Retour", de: "Return", es: "Resto" },
};

// Fasi mostrate come nel disegno; la soglia è la percentuale oltre la quale la fase risulta completata.
const FASI = [
  { soglia: 12, tit: "upload", sub: "k5_15_s_smartphone" },
  { soglia: 30, tit: "pre_processing", sub: "stroke_cutting_and_stabilization" },
  { soglia: 55, tit: "pose_estimation", sub: "k33_keypoints_ball_and" },
  { soglia: 78, tit: "comparison", sub: "correct_model_and_error" },
  { soglia: 101, tit: "proximity_index", sub: "classification_and_priority" },
] as const;

export function AnalisiInCorso() {
  const t = useT(T);
  const { lang } = useLang();
  const router = useRouter();
  const [progresso, setProgresso] = useState(4);
  const [errore, setErrore] = useState<ChiaveErrore | null>(null);
  const [colpo, setColpo] = useState("");
  const [nFoto, setNFoto] = useState(0);
  const [tentativo, setTentativo] = useState(0);
  const partito = useRef(-1);

  // Barra di avanzamento: la richiesta è una sola, quindi si avvicina piano al 92% e salta a 100% a risposta arrivata.
  useEffect(() => {
    if (errore) return;
    const id = setInterval(() => setProgresso((p) => (p < 92 ? p + (92 - p) * 0.045 : p)), 400);
    return () => clearInterval(id);
  }, [errore, tentativo]);

  const avvia = useCallback(async () => {
    let stato: { colpo: string; fotogrammi: string[] } | null = null;
    try {
      const grezzo = sessionStorage.getItem("mp-analisi-in-corso");
      stato = grezzo ? JSON.parse(grezzo) : null;
    } catch { /* stato illeggibile: si torna al caricamento */ }
    if (!stato || !Array.isArray(stato.fotogrammi) || !stato.fotogrammi.length) {
      router.replace(ROTTE.Carica);
      return;
    }
    setColpo(stato.colpo);
    setNFoto(stato.fotogrammi.length);
    try {
      const r = await fetch("/api/ai/analizza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colpo: stato.colpo, fotogrammi: stato.fotogrammi, lingua: lang }),
      });
      if (!r.ok) throw new ErroreHttp(r.status);
      const dati = (await r.json()) as RisultatoAnalisi & { id: string | null };
      try { sessionStorage.setItem("mp-ultima-analisi", JSON.stringify(dati)); } catch { /* quota piena: Analisi la rilegge da Supabase */ }
      setProgresso(100);
      router.replace(dati.id ? `${ROTTE.Analisi}?id=${dati.id}` : ROTTE.Analisi);
    } catch (e) {
      setErrore(chiaveErrore(e instanceof ErroreHttp ? e.stato : 500));
    }
  }, [lang, router]);

  // Un solo invio per tentativo (la modalità strict di React monta due volte in sviluppo).
  useEffect(() => {
    if (partito.current === tentativo) return;
    partito.current = tentativo;
    avvia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativo]);

  const riprova = () => { setErrore(null); setProgresso(4); setTentativo((n) => n + 1); };
  const pct = Math.round(progresso);
  const nomeColpo = NOMI_COLPO[colpo]?.[lang] ?? colpo;
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.scr}>
        <header className={s.hdr}>
          <Link href={ROTTE.Carica} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.coach_ai_luca_s}{nomeColpo ? ` · ${nomeColpo}` : ""}
            </div>
            <h1 className={s.h1}>
              {t.analyzing_the_video}
            </h1>
          </div>
        </header>
        <div className={`${s.lab} ${s.e1}`}>
          <svg className={s.e2} width="357" height="230" viewBox="0 0 357 230" aria-hidden="true">
            <defs>
              <linearGradient id="l20" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F3F6F1" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
              </linearGradient>
              <radialGradient id="h20" cx=".35" cy=".3" r=".8">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
              </radialGradient>
              <linearGradient id="t20" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                <stop offset="1" stopColor="#D8F34A" />
              </linearGradient>
              <filter id="g20" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="s20" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#000" stopOpacity=".55" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line x1="10" y1="198" x2="-302" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="38" y1="198" x2="-222" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="66" y1="198" x2="-142" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="94" y1="198" x2="-62" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="122" y1="198" x2="18" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="150" y1="198" x2="98" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="178" y1="198" x2="178" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="206" y1="198" x2="258" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="234" y1="198" x2="338" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="262" y1="198" x2="418" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="290" y1="198" x2="498" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="318" y1="198" x2="578" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="346" y1="198" x2="658" y2="230" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="0" y1="198" x2="357" y2="198" stroke="#4FD1FF" strokeOpacity="0.130" />
            <line x1="0" y1="201" x2="357" y2="201" stroke="#4FD1FF" strokeOpacity="0.118" />
            <line x1="0" y1="210" x2="357" y2="210" stroke="#4FD1FF" strokeOpacity="0.106" />
            <line x1="0" y1="225" x2="357" y2="225" stroke="#4FD1FF" strokeOpacity="0.094" />
            <line x1="0" y1="246" x2="357" y2="246" stroke="#4FD1FF" strokeOpacity="0.082" />
            <line x1="0" y1="273" x2="357" y2="273" stroke="#4FD1FF" strokeOpacity="0.070" />
            <line x1="0" y1="306" x2="357" y2="306" stroke="#4FD1FF" strokeOpacity="0.058" />
            <line x1="0" y1="345" x2="357" y2="345" stroke="#4FD1FF" strokeOpacity="0.046" />
            <line x1="0" y1="390" x2="357" y2="390" stroke="#4FD1FF" strokeOpacity="0.034" />
            <ellipse cx="180" cy="208" rx="39" ry="7" fill="url(#s20)" />
            <polygon points="170.1,80.5 183.3,81.6 185.5,126.8 174.5,126.8" fill="url(#l20)" stroke="url(#l20)" strokeWidth="8.8" strokeLinejoin="round" opacity="1.0" />
            <line x1="176.7" y1="81.0" x2="180.0" y2="126.8" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="1.1" strokeDasharray="2.2 2.2" />
            <line x1="176.7" y1="76.0" x2="176.7" y2="59.5" stroke="#050505" strokeWidth="6.1" strokeLinecap="round" opacity=".6" />
            <line x1="176.7" y1="76.0" x2="176.7" y2="59.5" stroke="url(#l20)" strokeWidth="3.9" strokeLinecap="round" opacity="1.0" />
            <line x1="176.7" y1="76.0" x2="176.7" y2="59.5" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="170.1" y1="80.5" x2="165.7" y2="99.2" stroke="#050505" strokeWidth="8.3" strokeLinecap="round" opacity=".6" />
            <line x1="170.1" y1="80.5" x2="165.7" y2="99.2" stroke="url(#l20)" strokeWidth="6.1" strokeLinecap="round" opacity="1.0" />
            <line x1="170.1" y1="80.5" x2="165.7" y2="99.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="165.7" y1="99.2" x2="173.4" y2="116.9" stroke="#050505" strokeWidth="7.2" strokeLinecap="round" opacity=".6" />
            <line x1="165.7" y1="99.2" x2="173.4" y2="116.9" stroke="url(#l20)" strokeWidth="5.0" strokeLinecap="round" opacity="1.0" />
            <line x1="165.7" y1="99.2" x2="173.4" y2="116.9" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="183.3" y1="81.6" x2="191.0" y2="95.9" stroke="#050505" strokeWidth="8.3" strokeLinecap="round" opacity=".6" />
            <line x1="183.3" y1="81.6" x2="191.0" y2="95.9" stroke="url(#l20)" strokeWidth="6.1" strokeLinecap="round" opacity="1.0" />
            <line x1="183.3" y1="81.6" x2="191.0" y2="95.9" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="191.0" y1="95.9" x2="196.5" y2="104.7" stroke="#050505" strokeWidth="7.2" strokeLinecap="round" opacity=".6" />
            <line x1="191.0" y1="95.9" x2="196.5" y2="104.7" stroke="url(#l20)" strokeWidth="5.0" strokeLinecap="round" opacity="1.0" />
            <line x1="191.0" y1="95.9" x2="196.5" y2="104.7" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="174.5" y1="126.8" x2="173.4" y2="164.3" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
            <line x1="174.5" y1="126.8" x2="173.4" y2="164.3" stroke="url(#l20)" strokeWidth="8.3" strokeLinecap="round" opacity="1.0" />
            <line x1="174.5" y1="126.8" x2="173.4" y2="164.3" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.3" strokeLinecap="round" />
            <line x1="173.4" y1="164.3" x2="171.2" y2="204.0" stroke="#050505" strokeWidth="8.8" strokeLinecap="round" opacity=".6" />
            <line x1="173.4" y1="164.3" x2="171.2" y2="204.0" stroke="url(#l20)" strokeWidth="6.6" strokeLinecap="round" opacity="1.0" />
            <line x1="173.4" y1="164.3" x2="171.2" y2="204.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.9" strokeLinecap="round" />
            <line x1="185.5" y1="126.8" x2="187.7" y2="164.3" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
            <line x1="185.5" y1="126.8" x2="187.7" y2="164.3" stroke="url(#l20)" strokeWidth="8.3" strokeLinecap="round" opacity="1.0" />
            <line x1="185.5" y1="126.8" x2="187.7" y2="164.3" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.3" strokeLinecap="round" />
            <line x1="187.7" y1="164.3" x2="189.9" y2="204.0" stroke="#050505" strokeWidth="8.8" strokeLinecap="round" opacity=".6" />
            <line x1="187.7" y1="164.3" x2="189.9" y2="204.0" stroke="url(#l20)" strokeWidth="6.6" strokeLinecap="round" opacity="1.0" />
            <line x1="187.7" y1="164.3" x2="189.9" y2="204.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.9" strokeLinecap="round" />
            <circle cx="176.7" cy="59.5" r="7.2" fill="url(#h20)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
            <line x1="173.4" y1="116.9" x2="192.9" y2="127.1" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="208.6" cy="135.3" rx="17.6" ry="11.6" transform="rotate(27.6 208.6 135.3)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="1.8" />
            <g transform="rotate(27.6 208.6 135.3)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
              <line x1="192.0" y1="128.7" x2="225.1" y2="128.7" />
              <line x1="192.0" y1="132.0" x2="225.1" y2="132.0" />
              <line x1="192.0" y1="135.3" x2="225.1" y2="135.3" />
              <line x1="192.0" y1="138.6" x2="225.1" y2="138.6" />
              <line x1="192.0" y1="141.9" x2="225.1" y2="141.9" />
              <line x1="198.6" y1="124.8" x2="198.6" y2="145.8" />
              <line x1="203.6" y1="124.8" x2="203.6" y2="145.8" />
              <line x1="208.6" y1="124.8" x2="208.6" y2="145.8" />
              <line x1="213.5" y1="124.8" x2="213.5" y2="145.8" />
              <line x1="218.5" y1="124.8" x2="218.5" y2="145.8" />
            </g>
            <ellipse cx="208.6" cy="135.3" rx="17.6" ry="11.6" transform="rotate(27.6 208.6 135.3)" fill="none" stroke="#F0454A" strokeWidth="1.1" />
            <circle cx="176.7" cy="76.0" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="176.7" cy="76.0" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="170.1" cy="80.5" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="170.1" cy="80.5" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="183.3" cy="81.6" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="183.3" cy="81.6" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="165.7" cy="99.2" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="165.7" cy="99.2" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="191.0" cy="95.9" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="191.0" cy="95.9" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="173.4" cy="116.9" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="173.4" cy="116.9" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="196.5" cy="104.7" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="196.5" cy="104.7" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="174.5" cy="126.8" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="174.5" cy="126.8" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="185.5" cy="126.8" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="185.5" cy="126.8" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="173.4" cy="164.3" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="173.4" cy="164.3" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="187.7" cy="164.3" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="187.7" cy="164.3" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="171.2" cy="204.0" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="171.2" cy="204.0" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <circle cx="189.9" cy="204.0" r="3.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="189.9" cy="204.0" r="2.0" fill="#D8F34A" filter="url(#g20)" />
            <path d="M10 24V10H24M333 10H347V24M10 206V220H24M333 220H347V206" fill="none" stroke="#D8F34A" strokeOpacity=".7" strokeWidth="2" />
          </svg>
          <div className={s.e3} />
          <span className={s.e4}>
            {nFoto ? `${nFoto} ` : ""}{t.k60_fps_9_s}
          </span>
          <span className={s.e5}>
            {t.k3d_pose}
          </span>
        </div>
        <div className={`${s.bar} ${s.e6}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i className={s.e7} style={{ width: `${pct}%` }} />
        </div>
        <div className={s.e8}>
          <span>
            {pct}%
          </span>
          <span className={`muted ${s.muted}`}>
            {t.under_30_seconds}
          </span>
        </div>
        <div className={`card ${s.card} ${s.pad} ${s.e9}`}>
          {FASI.map((f, i) => {
            const fatta = pct >= f.soglia;
            const attiva = !fatta && (i === 0 || pct >= FASI[i - 1].soglia);
            return (
              <div key={f.tit} className={fatta || attiva ? s.e10 : s.e15}>
                <span className={`${s.num} ${fatta ? s.e11 : attiva ? s.e14 : s.e16}`}>
                  {fatta ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <div className={s.grow}>
                  <div className={s.e12}>{t[f.tit]}</div>
                  <div className={`muted ${s.muted} ${s.e13}`}>{t[f.sub]}</div>
                </div>
              </div>
            );
          })}
        </div>
        {errore ? (
          <div className={`card ${s.card} ${s.pad} ${s.err}`} role="alert">
            <span>{t[`err_${errore}` as "err_generico"]}</span>
            <div className={s.azioni}>
              {errore === "accesso" ? (
                <Link href={PERCORSO_ACCESSO} className={`btn ${s.btn}`}>{t.login}</Link>
              ) : (
                <button type="button" className={`btn ${s.btn}`} onClick={riprova}>{t.retry}</button>
              )}
              <Link href={ROTTE.Carica} className={s.btn2}>{t.new_video}</Link>
            </div>
          </div>
        ) : null}
        <Link href={ROTTE.PoseEstimation} className={`${s.btn2} ${s.e17}`}>
          {t.see_the_skeleton_in}
        </Link>
      </div>
      </div>
    </Schermo>
  );
}
