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
    error_in_progress: "Error in progress",
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
