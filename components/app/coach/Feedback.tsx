"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./Feedback.module.css";

const T = {
  it: {
    back: "Indietro",
    luca_6_forehands_analyzed: "Luca · 6 diritti analizzati",
    late_preparation: "Apertura tardiva",
    dr_01: "DR-01",
    error_in_progress: "Errore in sviluppo",
    correct: "CORRETTO",
    to_monitor: "DA MONITORARE",
    in_progress: "IN SVILUPPO",
    consolidated: "CONSOLIDATO",
    type: "TIPO",
    preparation: "Preparazione",
    source: "ORIGINE",
    technique: "Tecnica",
    priority: "PRIORITÀ",
    k1_high: "1 · alta",
    what_i_see: "COSA VEDO",
    on_average_the_racket: "La racchetta completa l'apertura in media dopo il rimbalzo.",
    why_it_matters: "PERCHÉ CONTA",
    contact_comes_near_the: "L'impatto arriva vicino all'anca: palla corta e attaccabile.",
    what_we_do: "COSA FACCIAMO",
    dr_02_correction_video: "Video di correzione DR-02 e 3 esercizi propedeutici.",
    dr_02: "DR-02",
    late_contact: "Impatto in ritardo",
    k41_to_monitor: "41% · da monitorare",
    approve: "Approva",
    edit: "Correggi",
  },
  en: {
    back: "Back",
    luca_6_forehands_analyzed: "Luca · 6 forehands analyzed",
    late_preparation: "Late preparation",
    dr_01: "DR-01",
    error_in_progress: "Being worked on",
    correct: "CORRECT",
    to_monitor: "TO MONITOR",
    in_progress: "IN PROGRESS",
    consolidated: "CONSOLIDATED",
    type: "TYPE",
    preparation: "Preparation",
    source: "SOURCE",
    technique: "Technique",
    priority: "PRIORITY",
    k1_high: "1 · high",
    what_i_see: "WHAT I SEE",
    on_average_the_racket: "On average the racket completes preparation after the bounce.",
    why_it_matters: "WHY IT MATTERS",
    contact_comes_near_the: "Contact comes near the hip: short, attackable ball.",
    what_we_do: "WHAT WE DO",
    dr_02_correction_video: "DR-02 correction video and 3 lead-up drills.",
    dr_02: "DR-02",
    late_contact: "Late contact",
    k41_to_monitor: "41% · to monitor",
    approve: "Approve",
    edit: "Edit",
  },
  fr: {
    back: "Retour",
    luca_6_forehands_analyzed: "Luca · 6 coups droits analysés",
    late_preparation: "Préparation tardive",
    dr_01: "DR-01",
    error_in_progress: "Erreur en cours",
    correct: "CORRECT",
    to_monitor: "À SURVEILLER",
    in_progress: "EN COURS",
    consolidated: "ACQUIS",
    type: "TYPE",
    preparation: "Préparation",
    source: "ORIGINE",
    technique: "Technique",
    priority: "PRIORITÉ",
    k1_high: "1 · haute",
    what_i_see: "CE QUE JE VOIS",
    on_average_the_racket: "La raquette termine la préparation en moyenne après le rebond.",
    why_it_matters: "POURQUOI C'EST IMPORTANT",
    contact_comes_near_the: "L'impact arrive près de la hanche : balle courte et attaquable.",
    what_we_do: "CE QU'ON FAIT",
    dr_02_correction_video: "Vidéo de correction DR-02 et 3 exercices éducatifs.",
    dr_02: "DR-02",
    late_contact: "Impact en retard",
    k41_to_monitor: "41% · à surveiller",
    approve: "Approuver",
    edit: "Corriger",
  },
  de: {
    back: "Zurück",
    luca_6_forehands_analyzed: "Luca · 6 Vorhände analysiert",
    late_preparation: "Späte Vorbereitung",
    dr_01: "DR-01",
    error_in_progress: "Fehler in Entwicklung",
    correct: "KORREKT",
    to_monitor: "ZU BEOBACHTEN",
    in_progress: "IN ENTWICKLUNG",
    consolidated: "GEFESTIGT",
    type: "ART",
    preparation: "Vorbereitung",
    source: "URSPRUNG",
    technique: "Technik",
    priority: "PRIORITÄT",
    k1_high: "1 · hoch",
    what_i_see: "WAS ICH SEHE",
    on_average_the_racket: "Der Schläger vollendet die Öffnung im Schnitt nach dem Aufspringen.",
    why_it_matters: "WARUM ES ZÄHLT",
    contact_comes_near_the: "Der Treffpunkt liegt nah an der Hüfte: kurzer, angreifbarer Ball.",
    what_we_do: "WAS WIR TUN",
    dr_02_correction_video: "Korrekturvideo DR-02 und 3 Vorübungen.",
    dr_02: "DR-02",
    late_contact: "Verspäteter Kontakt",
    k41_to_monitor: "41% · zu beobachten",
    approve: "Genehmigen",
    edit: "Bearbeiten",
  },
  es: {
    back: "Atrás",
    luca_6_forehands_analyzed: "Luca · 6 derechas analizadas",
    late_preparation: "Preparación tardía",
    dr_01: "DR-01",
    error_in_progress: "Error en desarrollo",
    correct: "CORRECTO",
    to_monitor: "A VIGILAR",
    in_progress: "EN DESARROLLO",
    consolidated: "CONSOLIDADO",
    type: "TIPO",
    preparation: "Preparación",
    source: "ORIGEN",
    technique: "Técnica",
    priority: "PRIORIDAD",
    k1_high: "1 · alta",
    what_i_see: "QUÉ VEO",
    on_average_the_racket: "La raqueta termina la preparación de media después del bote.",
    why_it_matters: "POR QUÉ IMPORTA",
    contact_comes_near_the: "El impacto llega cerca de la cadera: bola corta y atacable.",
    what_we_do: "QUÉ HACEMOS",
    dr_02_correction_video: "Vídeo de corrección DR-02 y 3 ejercicios progresivos.",
    dr_02: "DR-02",
    late_contact: "Impacto tardío",
    k41_to_monitor: "41% · a vigilar",
    approve: "Aprobar",
    edit: "Corregir",
  },
};

export function Feedback() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.scr}>
        <header className={s.hdr}>
          <Link href={ROTTE.PoseEstimation} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.luca_6_forehands_analyzed}
            </div>
            <h1 className={s.h1}>
              {t.late_preparation}
            </h1>
          </div>
          <span className={s.code}>
            {t.dr_01}
          </span>
        </header>
        <div className={s.e1}>
          <span className={`disp ${s.disp} ${s.e2}`}>
            58%
          </span>
          <span className={s.e3}>
            {t.error_in_progress}
          </span>
        </div>
        <div className={s.bands}>
          <span className={`${s.mk} ${s.e4}`} />
        </div>
        <div className={s.e5}>
          <span>
            {t.correct}
          </span>
          <span>
            {t.to_monitor}
          </span>
          <span>
            {t.in_progress}
          </span>
          <span>
            {t.consolidated}
          </span>
        </div>
        <div className={s.g3}>
          <div className={s.tile}>
            <span>
              {t.type}
            </span>
            <b className={s.e6}>
              {t.preparation}
            </b>
          </div>
          <div className={s.tile}>
            <span>
              {t.source}
            </span>
            <b className={s.e6}>
              {t.technique}
            </b>
          </div>
          <div className={s.tile}>
            <span>
              {t.priority}
            </span>
            <b className={s.e7}>
              {t.k1_high}
            </b>
          </div>
        </div>
        <div className={s.e8}>
          <div className={s.e9}>
            <span className={s.num}>
              1
            </span>
            <div>
              <div className={s.k}>
                {t.what_i_see}
              </div>
              <div className={s.v}>
                {t.on_average_the_racket}
              </div>
            </div>
          </div>
          <div className={s.e9}>
            <span className={s.num}>
              2
            </span>
            <div>
              <div className={s.k}>
                {t.why_it_matters}
              </div>
              <div className={s.v}>
                {t.contact_comes_near_the}
              </div>
            </div>
          </div>
          <div className={s.e9}>
            <span className={s.num}>
              3
            </span>
            <div>
              <div className={s.k}>
                {t.what_we_do}
              </div>
              <div className={s.v}>
                {t.dr_02_correction_video}
              </div>
            </div>
          </div>
        </div>
        <div className={`${s.li} ${s.e10}`}>
          <span className={s.code}>
            {t.dr_02}
          </span>
          <span className={s.grow}>
            <span className={s.t}>
              {t.late_contact}
            </span>
            <span className={`${s.s} ${s.e11}`}>
              {t.k41_to_monitor}
            </span>
          </span>
          <span className={`${s.dot} ${s.e12}`} />
        </div>
        <div className={s.e13}>
          <Link href={ROTTE.PianoProposto} className={`btn ${s.btn} ${s.e14}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
            {t.approve}
          </Link>
          <Link href={ROTTE.ChatAI} className={`${s.btn2} ${s.e15}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16z" />
            </svg>
            {t.edit}
          </Link>
        </div>
      </div>
      </div>
    </Schermo>
  );
}
