"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./PoseEstimation.module.css";

const T = {
  it: {
    back: "Indietro",
    frame_41_contact: "Frame 41 · impatto",
    forehand_skeleton: "Scheletro del diritto",
    k33_points: "33 punti",
    k33_keypoints_3d: "33 PUNTI CHIAVE · 3D",
    frame_41_540: "FRAME 41 / 540",
    elbow_150: "gomito 150°",
    knee_146: "ginocchio 146°",
    hip_151: "anca 151°",
    contact_in_front_of: "Impatto davanti all'anca +28 cm",
    green_over_20_cm: "Verde: oltre 20 cm avanti",
    k60_ms: "+60 ms",
    end_of_preparation_after: "fine apertura dopo il rimbalzo",
    knee_bend: "flessione ginocchio",
    k2d_3d_keypoints_per: "Punti chiave 2D/3D per frame, angoli articolari, velocità e traiettoria della palla. Modello open source affinato su tennis giovanile.",
    see_feedback: "Vedi il feedback",
  },
  en: {
    back: "Back",
    frame_41_contact: "Frame 41 · contact",
    forehand_skeleton: "Forehand skeleton",
    k33_points: "33 points",
    k33_keypoints_3d: "33 KEYPOINTS · 3D",
    frame_41_540: "FRAME 41 / 540",
    elbow_150: "elbow 150°",
    knee_146: "knee 146°",
    hip_151: "hip 151°",
    contact_in_front_of: "Contact in front of the hip +28 cm",
    green_over_20_cm: "Green: over 20 cm in front",
    k60_ms: "+60 ms",
    end_of_preparation_after: "end of preparation after the bounce",
    knee_bend: "knee bend",
    k2d_3d_keypoints_per: "2D/3D keypoints per frame, joint angles, ball speed and trajectory. Open source model fine-tuned on junior tennis.",
    see_feedback: "See feedback",
  },
};

export function PoseEstimation() {
  const t = useT(T);
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.scr}>
        <header className={s.hdr}>
          <Link href={ROTTE.AnalisiInCorso} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.frame_41_contact}
            </div>
            <h1 className={s.h1}>
              {t.forehand_skeleton}
            </h1>
          </div>
          <span className={s.tag}>
            {t.k33_points}
          </span>
        </header>
        <div className={`${s.lab} ${s.e1}`}>
          <svg className={s.e2} width="357" height="330" viewBox="0 0 357 330" aria-hidden="true">
            <defs>
              <linearGradient id="l21" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F3F6F1" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
              </linearGradient>
              <radialGradient id="h21" cx=".35" cy=".3" r=".8">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
              </radialGradient>
              <linearGradient id="t21" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                <stop offset="1" stopColor="#D8F34A" />
              </linearGradient>
              <filter id="g21" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="s21" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#000" stopOpacity=".55" />
                <stop offset="1" stopColor="#000" stopOpacity="0" />
              </radialGradient>
            </defs>
            <line x1="10" y1="298" x2="-302" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="38" y1="298" x2="-222" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="66" y1="298" x2="-142" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="94" y1="298" x2="-62" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="122" y1="298" x2="18" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="150" y1="298" x2="98" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="178" y1="298" x2="178" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="206" y1="298" x2="258" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="234" y1="298" x2="338" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="262" y1="298" x2="418" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="290" y1="298" x2="498" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="318" y1="298" x2="578" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="346" y1="298" x2="658" y2="330" stroke="#4FD1FF" strokeOpacity=".10" />
            <line x1="0" y1="298" x2="357" y2="298" stroke="#4FD1FF" strokeOpacity="0.130" />
            <line x1="0" y1="301" x2="357" y2="301" stroke="#4FD1FF" strokeOpacity="0.118" />
            <line x1="0" y1="310" x2="357" y2="310" stroke="#4FD1FF" strokeOpacity="0.106" />
            <line x1="0" y1="325" x2="357" y2="325" stroke="#4FD1FF" strokeOpacity="0.094" />
            <line x1="0" y1="346" x2="357" y2="346" stroke="#4FD1FF" strokeOpacity="0.082" />
            <line x1="0" y1="373" x2="357" y2="373" stroke="#4FD1FF" strokeOpacity="0.070" />
            <line x1="0" y1="406" x2="357" y2="406" stroke="#4FD1FF" strokeOpacity="0.058" />
            <line x1="0" y1="445" x2="357" y2="445" stroke="#4FD1FF" strokeOpacity="0.046" />
            <line x1="0" y1="490" x2="357" y2="490" stroke="#4FD1FF" strokeOpacity="0.034" />
            <polygon points="49.5,119.4 76.8,112.6 78.5,187.8 58.0,189.5" fill="#4FD1FF" fillOpacity="0.08" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
            <line x1="66.6" y1="109.2" x2="66.6" y2="83.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.7" strokeLinecap="round" />
            <line x1="49.5" y1="119.4" x2="23.9" y2="136.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.2" strokeLinecap="round" />
            <line x1="23.9" y1="136.5" x2="6.8" y2="121.1" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="76.8" y1="112.6" x2="93.9" y2="134.8" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.2" strokeLinecap="round" />
            <line x1="93.9" y1="134.8" x2="104.2" y2="148.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="58.0" y1="189.5" x2="51.2" y2="242.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="5.8" strokeLinecap="round" />
            <line x1="51.2" y1="242.5" x2="30.7" y2="304.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.6" strokeLinecap="round" />
            <line x1="78.5" y1="187.8" x2="100.8" y2="240.8" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="5.8" strokeLinecap="round" />
            <line x1="100.8" y1="240.8" x2="97.3" y2="304.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.6" strokeLinecap="round" />
            <circle cx="66.6" cy="83.5" r="11.1" fill="none" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.6" />
            <line x1="6.8" y1="121.1" x2="-22.1" y2="102.8" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.0" strokeLinecap="round" />
            <ellipse cx="-45.1" cy="88.1" rx="27.3" ry="17.9" transform="rotate(-147.5 -45.1 88.1)" fill="#4FD1FF" fillOpacity="0.02" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.5" />
            <polygon points="109.7,117.7 123.4,112.6 126.8,187.8 113.2,189.5" fill="#4FD1FF" fillOpacity="0.14" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="1.4" strokeLinejoin="round" />
            <line x1="119.1" y1="110.9" x2="120.0" y2="85.2" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="2.7" strokeLinecap="round" />
            <line x1="109.7" y1="117.7" x2="90.9" y2="146.8" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="4.2" strokeLinecap="round" />
            <line x1="90.9" y1="146.8" x2="94.4" y2="175.8" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="123.4" y1="112.6" x2="130.3" y2="136.5" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="4.2" strokeLinecap="round" />
            <line x1="130.3" y1="136.5" x2="143.9" y2="143.3" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="113.2" y1="189.5" x2="111.5" y2="242.5" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="5.8" strokeLinecap="round" />
            <line x1="111.5" y1="242.5" x2="90.9" y2="304.0" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="4.6" strokeLinecap="round" />
            <line x1="126.8" y1="187.8" x2="150.8" y2="240.8" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="5.8" strokeLinecap="round" />
            <line x1="150.8" y1="240.8" x2="145.6" y2="304.0" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="4.6" strokeLinecap="round" />
            <circle cx="120.0" cy="85.2" r="11.1" fill="none" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="1.6" />
            <line x1="94.4" y1="175.8" x2="68.5" y2="198.2" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="2.0" strokeLinecap="round" />
            <ellipse cx="47.8" cy="216.0" rx="27.3" ry="17.9" transform="rotate(139.2 47.8 216.0)" fill="#4FD1FF" fillOpacity="0.04" stroke="#4FD1FF" strokeOpacity="0.41" strokeWidth="1.5" />
            <path d="M-45.1 88.1 Q-45.1 88.1 1.3 152.1 Q47.8 216.0 169.4 185.7 L291.0 155.3" fill="none" stroke="url(#t21)" strokeWidth="5" strokeLinecap="round" filter="url(#g21)" />
            <ellipse cx="175" cy="308" rx="60" ry="10" fill="url(#s21)" />
            <polygon points="188.7,117.7 164.7,114.3 163.0,189.5 178.4,189.5" fill="url(#l21)" stroke="url(#l21)" strokeWidth="13.7" strokeLinejoin="round" opacity="1.0" />
            <line x1="176.7" y1="116.0" x2="170.7" y2="189.5" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="1.7" strokeDasharray="3.4 3.4" />
            <line x1="179.3" y1="110.9" x2="181.8" y2="85.2" stroke="#050505" strokeWidth="9.4" strokeLinecap="round" opacity=".6" />
            <line x1="179.3" y1="110.9" x2="181.8" y2="85.2" stroke="url(#l21)" strokeWidth="6.0" strokeLinecap="round" opacity="1.0" />
            <line x1="179.3" y1="110.9" x2="181.8" y2="85.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.7" strokeLinecap="round" />
            <line x1="188.7" y1="117.7" x2="205.8" y2="146.8" stroke="#050505" strokeWidth="12.8" strokeLinecap="round" opacity=".6" />
            <line x1="188.7" y1="117.7" x2="205.8" y2="146.8" stroke="url(#l21)" strokeWidth="9.4" strokeLinecap="round" opacity="1.0" />
            <line x1="188.7" y1="117.7" x2="205.8" y2="146.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.6" strokeLinecap="round" />
            <line x1="205.8" y1="146.8" x2="229.7" y2="160.4" stroke="#050505" strokeWidth="11.1" strokeLinecap="round" opacity=".6" />
            <line x1="205.8" y1="146.8" x2="229.7" y2="160.4" stroke="url(#l21)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
            <line x1="205.8" y1="146.8" x2="229.7" y2="160.4" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="164.7" y1="114.3" x2="149.4" y2="141.6" stroke="#050505" strokeWidth="12.8" strokeLinecap="round" opacity=".6" />
            <line x1="164.7" y1="114.3" x2="149.4" y2="141.6" stroke="url(#l21)" strokeWidth="9.4" strokeLinecap="round" opacity="1.0" />
            <line x1="164.7" y1="114.3" x2="149.4" y2="141.6" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.6" strokeLinecap="round" />
            <line x1="149.4" y1="141.6" x2="139.1" y2="158.7" stroke="#050505" strokeWidth="11.1" strokeLinecap="round" opacity=".6" />
            <line x1="149.4" y1="141.6" x2="139.1" y2="158.7" stroke="url(#l21)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
            <line x1="149.4" y1="141.6" x2="139.1" y2="158.7" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="178.4" y1="189.5" x2="205.8" y2="240.8" stroke="#050505" strokeWidth="16.2" strokeLinecap="round" opacity=".6" />
            <line x1="178.4" y1="189.5" x2="205.8" y2="240.8" stroke="url(#l21)" strokeWidth="12.8" strokeLinecap="round" opacity="1.0" />
            <line x1="178.4" y1="189.5" x2="205.8" y2="240.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.6" strokeLinecap="round" />
            <line x1="205.8" y1="240.8" x2="198.9" y2="304.0" stroke="#050505" strokeWidth="13.7" strokeLinecap="round" opacity=".6" />
            <line x1="205.8" y1="240.8" x2="198.9" y2="304.0" stroke="url(#l21)" strokeWidth="10.3" strokeLinecap="round" opacity="1.0" />
            <line x1="205.8" y1="240.8" x2="198.9" y2="304.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.9" strokeLinecap="round" />
            <line x1="163.0" y1="189.5" x2="166.5" y2="244.2" stroke="#050505" strokeWidth="16.2" strokeLinecap="round" opacity=".6" />
            <line x1="163.0" y1="189.5" x2="166.5" y2="244.2" stroke="url(#l21)" strokeWidth="12.8" strokeLinecap="round" opacity="1.0" />
            <line x1="163.0" y1="189.5" x2="166.5" y2="244.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.6" strokeLinecap="round" />
            <line x1="166.5" y1="244.2" x2="147.7" y2="304.0" stroke="#050505" strokeWidth="13.7" strokeLinecap="round" opacity=".6" />
            <line x1="166.5" y1="244.2" x2="147.7" y2="304.0" stroke="url(#l21)" strokeWidth="10.3" strokeLinecap="round" opacity="1.0" />
            <line x1="166.5" y1="244.2" x2="147.7" y2="304.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.9" strokeLinecap="round" />
            <circle cx="181.8" cy="85.2" r="11.1" fill="url(#h21)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
            <line x1="229.7" y1="160.4" x2="263.8" y2="157.6" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="4.3" strokeLinecap="round" />
            <ellipse cx="291.0" cy="155.3" rx="27.3" ry="17.9" transform="rotate(-4.8 291.0 155.3)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="2.7" />
            <g transform="rotate(-4.8 291.0 155.3)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
              <line x1="265.4" y1="145.1" x2="316.6" y2="145.1" />
              <line x1="265.4" y1="150.2" x2="316.6" y2="150.2" />
              <line x1="265.4" y1="155.3" x2="316.6" y2="155.3" />
              <line x1="265.4" y1="160.5" x2="316.6" y2="160.5" />
              <line x1="265.4" y1="165.6" x2="316.6" y2="165.6" />
              <line x1="275.6" y1="139.1" x2="275.6" y2="171.6" />
              <line x1="283.3" y1="139.1" x2="283.3" y2="171.6" />
              <line x1="291.0" y1="139.1" x2="291.0" y2="171.6" />
              <line x1="298.7" y1="139.1" x2="298.7" y2="171.6" />
              <line x1="306.4" y1="139.1" x2="306.4" y2="171.6" />
            </g>
            <ellipse cx="291.0" cy="155.3" rx="27.3" ry="17.9" transform="rotate(-4.8 291.0 155.3)" fill="none" stroke="#F0454A" strokeWidth="1.7" />
            <circle cx="179.3" cy="110.9" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="179.3" cy="110.9" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="188.7" cy="117.7" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="188.7" cy="117.7" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="164.7" cy="114.3" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="164.7" cy="114.3" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="205.8" cy="146.8" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="205.8" cy="146.8" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="149.4" cy="141.6" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="149.4" cy="141.6" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="229.7" cy="160.4" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="229.7" cy="160.4" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="139.1" cy="158.7" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="139.1" cy="158.7" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="178.4" cy="189.5" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="178.4" cy="189.5" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="163.0" cy="189.5" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="163.0" cy="189.5" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="205.8" cy="240.8" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="205.8" cy="240.8" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="166.5" cy="244.2" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="166.5" cy="244.2" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="198.9" cy="304.0" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="198.9" cy="304.0" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="147.7" cy="304.0" r="6.0" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
            <circle cx="147.7" cy="304.0" r="3.1" fill="#D8F34A" filter="url(#g21)" />
            <circle cx="303.2" cy="155.3" r="6.8" fill="#D8F34A" filter="url(#g21)" />
            <path d="M298.1 151.0c2.6 2.6 2.6 6.0 0 8.5M308.3 151.0c-2.6 2.6 -2.6 6.0 0 8.5" fill="none" stroke="#fff" strokeWidth="1.2" />
            <path d="M205.8 146.8 L193.6 126.1 A24 24 0 0 1 226.6 158.7 Z" fill="#D8F34A" fillOpacity=".18" stroke="#D8F34A" strokeWidth="2" />
            <line x1="205.8" y1="146.8" x2="240.9" y2="114.0" stroke="#D8F34A" strokeWidth="1" strokeOpacity=".6" />
            <rect x="218.7" y="103.0" width="44.4" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#D8F34A" strokeOpacity=".7" />
            <text x="240.9" y="118.5" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#D8F34A">
              150°
            </text>
            <path d="M205.8 240.8 L194.5 219.6 A24 24 0 0 0 203.2 264.6 Z" fill="#4FD1FF" fillOpacity=".18" stroke="#4FD1FF" strokeWidth="2" />
            <line x1="205.8" y1="240.8" x2="156.7" y2="249.5" stroke="#4FD1FF" strokeWidth="1" strokeOpacity=".6" />
            <rect x="134.5" y="238.5" width="44.4" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#4FD1FF" strokeOpacity=".7" />
            <text x="156.7" y="254.0" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#4FD1FF">
              146°
            </text>
            <path d="M178.4 189.5 L178.7 159.5 A30 30 0 0 1 192.5 216.0 Z" fill="#FF9F43" fillOpacity=".18" stroke="#FF9F43" strokeWidth="2" />
            <line x1="178.4" y1="189.5" x2="232.8" y2="177.2" stroke="#FF9F43" strokeWidth="1" strokeOpacity=".6" />
            <rect x="210.6" y="166.2" width="44.4" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#FF9F43" strokeOpacity=".7" />
            <text x="232.8" y="181.7" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#FF9F43">
              151°
            </text>
            <path d="M10 24V10H24M333 10H347V24M10 306V320H24M333 320H347V306" fill="none" stroke="#D8F34A" strokeOpacity=".7" strokeWidth="2" />
          </svg>
          <span className={s.e3}>
            {t.k33_keypoints_3d}
          </span>
          <span className={s.e4}>
            {t.frame_41_540}
          </span>
          <div className={s.e5}>
            <span className={s.e6}>
              {t.elbow_150}
            </span>
            <span className={s.e7}>
              {t.knee_146}
            </span>
            <span className={s.e8}>
              {t.hip_151}
            </span>
          </div>
        </div>
        <div className={`card ${s.card} ${s.pad} ${s.e9}`}>
          <span className={`${s.ic} ${s.e10}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </span>
          <div>
            <div className={s.e11}>
              {t.contact_in_front_of}
            </div>
            <div className={`muted ${s.muted} ${s.e12}`}>
              {t.green_over_20_cm}
            </div>
          </div>
        </div>
        <div className={s.g2}>
          <div className={s.tile}>
            <b className={s.e13}>
              {t.k60_ms}
            </b>
            <span>
              {t.end_of_preparation_after}
            </span>
          </div>
          <div className={s.tile}>
            <b>
              146°
            </b>
            <span>
              {t.knee_bend}
            </span>
          </div>
        </div>
        <div className={s.note}>
          {t.k2d_3d_keypoints_per}
        </div>
        <Link href={ROTTE.Feedback} className={`btn ${s.btn}`}>
          {t.see_feedback}
        </Link>
      </div>
      </div>
    </Schermo>
  );
}
