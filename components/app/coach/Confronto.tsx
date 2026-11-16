"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./Confronto.module.css";

const T = {
  it: {
    back: "Indietro",
    serve_synced_frames: "Servizio · frame sincronizzati",
    comparison: "Confronto",
    giulia_today: "Giulia · oggi",
    model_b: "Modello B",
    correct_model_ghost: "Fantasma del modello corretto",
    previous_frame: "Frame precedente",
    next_frame: "Frame successivo",
    shoulder_elbow_today: "spalla-gomito oggi",
    model: "modello",
    difference: "differenza",
  },
  en: {
    back: "Back",
    serve_synced_frames: "Serve · synced frames",
    comparison: "Comparison",
    giulia_today: "Giulia · today",
    model_b: "Model B",
    correct_model_ghost: "Correct model ghost",
    previous_frame: "Previous frame",
    next_frame: "Next frame",
    shoulder_elbow_today: "shoulder-elbow today",
    model: "model",
    difference: "difference",
  },
};

const VOCI = {
  it: ["Affiancato", "Sovrapposto", "Prima e dopo"],
  en: ["Side by side", "Overlay", "Before and after"],
};

export function Confronto() {
  const t = useT(T);
  const { lang } = useLang();
  const [sel, setSel] = useState(0);
  // Voci del selettore: il tocco cambia solo l'evidenziazione, come nel disegno.
  const mode = VOCI[lang].map((l, i) => (
    <button type="button" key={l} className={`${s.sg} ${i === sel ? s.on : ""}`} aria-pressed={i === sel} onClick={() => setSel(i)}>
      {l}
    </button>
  ));
  const side = sel !== 1;
  const over = sel === 1;
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.scr}>
        <header className={s.hdr}>
          <Link href={ROTTE.VideoLab} className={`icon ${s.icon}`} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>
              {t.serve_synced_frames}
            </div>
            <h1 className={s.h1}>
              {t.comparison}
            </h1>
          </div>
        </header>
        <div className={`${s.seg} ${s.e1}`}>
          {mode}
        </div>
        {side && (
          <>
          <div className={s.g2}>
            <div className={`${s.lab} ${s.e2}`}>
              <svg className={s.e3} width="170" height="250" viewBox="0 0 170 250" aria-hidden="true">
                <defs>
                  <linearGradient id="l30" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFB3B5" />
                    <stop offset="1" stopColor="#FFB3B5" stopOpacity=".55" />
                  </linearGradient>
                  <radialGradient id="h30" cx=".35" cy=".3" r=".8">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#FFB3B5" stopOpacity=".6" />
                  </radialGradient>
                  <linearGradient id="t30" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                    <stop offset="1" stopColor="#D8F34A" />
                  </linearGradient>
                  <filter id="g30" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="s30" cx=".5" cy=".5" r=".5">
                    <stop offset="0" stopColor="#000" stopOpacity=".55" />
                    <stop offset="1" stopColor="#000" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <line x1="-83" y1="234" x2="-395" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="-55" y1="234" x2="-315" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="-27" y1="234" x2="-235" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="1" y1="234" x2="-155" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="29" y1="234" x2="-75" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="57" y1="234" x2="5" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="85" y1="234" x2="85" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="113" y1="234" x2="165" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="141" y1="234" x2="245" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="169" y1="234" x2="325" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="197" y1="234" x2="405" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="225" y1="234" x2="485" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="253" y1="234" x2="565" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="0" y1="234" x2="170" y2="234" stroke="#4FD1FF" strokeOpacity="0.130" />
                <line x1="0" y1="237" x2="170" y2="237" stroke="#4FD1FF" strokeOpacity="0.118" />
                <line x1="0" y1="246" x2="170" y2="246" stroke="#4FD1FF" strokeOpacity="0.106" />
                <line x1="0" y1="261" x2="170" y2="261" stroke="#4FD1FF" strokeOpacity="0.094" />
                <line x1="0" y1="282" x2="170" y2="282" stroke="#4FD1FF" strokeOpacity="0.082" />
                <line x1="0" y1="309" x2="170" y2="309" stroke="#4FD1FF" strokeOpacity="0.070" />
                <line x1="0" y1="342" x2="170" y2="342" stroke="#4FD1FF" strokeOpacity="0.058" />
                <line x1="0" y1="381" x2="170" y2="381" stroke="#4FD1FF" strokeOpacity="0.046" />
                <line x1="0" y1="426" x2="170" y2="426" stroke="#4FD1FF" strokeOpacity="0.034" />
                <ellipse cx="92" cy="244" rx="49" ry="8" fill="url(#s30)" />
                <polygon points="80.8,85.3 100.4,82.5 99.0,144.4 86.4,144.4" fill="url(#l30)" stroke="url(#l30)" strokeWidth="11.2" strokeLinejoin="round" opacity="1.0" />
                <line x1="90.6" y1="83.9" x2="92.7" y2="144.4" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="1.4" strokeDasharray="2.8 2.8" />
                <line x1="90.6" y1="79.7" x2="92.0" y2="60.0" stroke="#050505" strokeWidth="7.7" strokeLinecap="round" opacity=".6" />
                <line x1="90.6" y1="79.7" x2="92.0" y2="60.0" stroke="url(#l30)" strokeWidth="4.9" strokeLinecap="round" opacity="1.0" />
                <line x1="90.6" y1="79.7" x2="92.0" y2="60.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="80.8" y1="85.3" x2="68.1" y2="99.4" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
                <line x1="80.8" y1="85.3" x2="68.1" y2="99.4" stroke="url(#l30)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
                <line x1="80.8" y1="85.3" x2="68.1" y2="99.4" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="68.1" y1="99.4" x2="70.9" y2="67.1" stroke="#050505" strokeWidth="9.1" strokeLinecap="round" opacity=".6" />
                <line x1="68.1" y1="99.4" x2="70.9" y2="67.1" stroke="url(#l30)" strokeWidth="6.3" strokeLinecap="round" opacity="1.0" />
                <line x1="68.1" y1="99.4" x2="70.9" y2="67.1" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="100.4" y1="82.5" x2="103.2" y2="60.0" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
                <line x1="100.4" y1="82.5" x2="103.2" y2="60.0" stroke="url(#l30)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
                <line x1="100.4" y1="82.5" x2="103.2" y2="60.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="103.2" y1="60.0" x2="106.1" y2="33.3" stroke="#050505" strokeWidth="9.1" strokeLinecap="round" opacity=".6" />
                <line x1="103.2" y1="60.0" x2="106.1" y2="33.3" stroke="url(#l30)" strokeWidth="6.3" strokeLinecap="round" opacity="1.0" />
                <line x1="103.2" y1="60.0" x2="106.1" y2="33.3" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="86.4" y1="144.4" x2="83.6" y2="190.8" stroke="#050505" strokeWidth="13.4" strokeLinecap="round" opacity=".6" />
                <line x1="86.4" y1="144.4" x2="83.6" y2="190.8" stroke="url(#l30)" strokeWidth="10.5" strokeLinecap="round" opacity="1.0" />
                <line x1="86.4" y1="144.4" x2="83.6" y2="190.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.0" strokeLinecap="round" />
                <line x1="83.6" y1="190.8" x2="82.2" y2="240.0" stroke="#050505" strokeWidth="11.2" strokeLinecap="round" opacity=".6" />
                <line x1="83.6" y1="190.8" x2="82.2" y2="240.0" stroke="url(#l30)" strokeWidth="8.4" strokeLinecap="round" opacity="1.0" />
                <line x1="83.6" y1="190.8" x2="82.2" y2="240.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="99.0" y1="144.4" x2="100.4" y2="190.8" stroke="#050505" strokeWidth="13.4" strokeLinecap="round" opacity=".6" />
                <line x1="99.0" y1="144.4" x2="100.4" y2="190.8" stroke="url(#l30)" strokeWidth="10.5" strokeLinecap="round" opacity="1.0" />
                <line x1="99.0" y1="144.4" x2="100.4" y2="190.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.0" strokeLinecap="round" />
                <line x1="100.4" y1="190.8" x2="106.1" y2="240.0" stroke="#050505" strokeWidth="11.2" strokeLinecap="round" opacity=".6" />
                <line x1="100.4" y1="190.8" x2="106.1" y2="240.0" stroke="url(#l30)" strokeWidth="8.4" strokeLinecap="round" opacity="1.0" />
                <line x1="100.4" y1="190.8" x2="106.1" y2="240.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="92.0" cy="60.0" r="9.1" fill="url(#h30)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
                <line x1="70.9" y1="67.1" x2="64.8" y2="39.6" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="3.5" strokeLinecap="round" />
                <ellipse cx="59.9" cy="17.6" rx="22.5" ry="14.8" transform="rotate(-102.5 59.9 17.6)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="2.2" />
                <g transform="rotate(-102.5 59.9 17.6)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
                  <line x1="38.8" y1="9.2" x2="81.0" y2="9.2" />
                  <line x1="38.8" y1="13.4" x2="81.0" y2="13.4" />
                  <line x1="38.8" y1="17.6" x2="81.0" y2="17.6" />
                  <line x1="38.8" y1="21.9" x2="81.0" y2="21.9" />
                  <line x1="38.8" y1="26.1" x2="81.0" y2="26.1" />
                  <line x1="47.3" y1="4.3" x2="47.3" y2="31.0" />
                  <line x1="53.6" y1="4.3" x2="53.6" y2="31.0" />
                  <line x1="59.9" y1="4.3" x2="59.9" y2="31.0" />
                  <line x1="66.3" y1="4.3" x2="66.3" y2="31.0" />
                  <line x1="72.6" y1="4.3" x2="72.6" y2="31.0" />
                </g>
                <ellipse cx="59.9" cy="17.6" rx="22.5" ry="14.8" transform="rotate(-102.5 59.9 17.6)" fill="none" stroke="#F0454A" strokeWidth="1.4" />
                <circle cx="90.6" cy="79.7" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="90.6" cy="79.7" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="80.8" cy="85.3" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="80.8" cy="85.3" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="100.4" cy="82.5" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="100.4" cy="82.5" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="68.1" cy="99.4" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="68.1" cy="99.4" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="103.2" cy="60.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="103.2" cy="60.0" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="70.9" cy="67.1" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="70.9" cy="67.1" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="106.1" cy="33.3" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="106.1" cy="33.3" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="86.4" cy="144.4" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="86.4" cy="144.4" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="99.0" cy="144.4" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="99.0" cy="144.4" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="83.6" cy="190.8" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="83.6" cy="190.8" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="100.4" cy="190.8" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="100.4" cy="190.8" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="82.2" cy="240.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="82.2" cy="240.0" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <circle cx="106.1" cy="240.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="106.1" cy="240.0" r="2.5" fill="#D8F34A" filter="url(#g30)" />
                <path d="M80.8 85.3 L82.8 107.2 A22 22 0 0 1 66.0 101.7 Z" fill="#FF5A5F" fillOpacity=".18" stroke="#FF5A5F" strokeWidth="2" />
                <line x1="80.8" y1="85.3" x2="65.7" y2="127.1" stroke="#FF5A5F" strokeWidth="1" strokeOpacity=".6" />
                <rect x="47.3" y="116.1" width="36.8" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#FF5A5F" strokeOpacity=".7" />
                <text x="65.7" y="131.6" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#FF5A5F">
                  47°
                </text>
                <path d="M10 24V10H24M146 10H160V24M10 226V240H24M146 240H160V226" fill="none" stroke="#D8F34A" strokeOpacity=".7" strokeWidth="2" />
              </svg>
              <span className={s.e4}>
                {t.giulia_today}
              </span>
            </div>
            <div className={`${s.lab} ${s.e2}`}>
              <svg className={s.e3} width="170" height="250" viewBox="0 0 170 250" aria-hidden="true">
                <defs>
                  <linearGradient id="l31" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#F3F6F1" />
                    <stop offset="1" stopColor="#F3F6F1" stopOpacity=".55" />
                  </linearGradient>
                  <radialGradient id="h31" cx=".35" cy=".3" r=".8">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#F3F6F1" stopOpacity=".6" />
                  </radialGradient>
                  <linearGradient id="t31" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                    <stop offset="1" stopColor="#D8F34A" />
                  </linearGradient>
                  <filter id="g31" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="s31" cx=".5" cy=".5" r=".5">
                    <stop offset="0" stopColor="#000" stopOpacity=".55" />
                    <stop offset="1" stopColor="#000" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <line x1="-83" y1="234" x2="-395" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="-55" y1="234" x2="-315" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="-27" y1="234" x2="-235" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="1" y1="234" x2="-155" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="29" y1="234" x2="-75" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="57" y1="234" x2="5" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="85" y1="234" x2="85" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="113" y1="234" x2="165" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="141" y1="234" x2="245" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="169" y1="234" x2="325" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="197" y1="234" x2="405" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="225" y1="234" x2="485" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="253" y1="234" x2="565" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
                <line x1="0" y1="234" x2="170" y2="234" stroke="#4FD1FF" strokeOpacity="0.130" />
                <line x1="0" y1="237" x2="170" y2="237" stroke="#4FD1FF" strokeOpacity="0.118" />
                <line x1="0" y1="246" x2="170" y2="246" stroke="#4FD1FF" strokeOpacity="0.106" />
                <line x1="0" y1="261" x2="170" y2="261" stroke="#4FD1FF" strokeOpacity="0.094" />
                <line x1="0" y1="282" x2="170" y2="282" stroke="#4FD1FF" strokeOpacity="0.082" />
                <line x1="0" y1="309" x2="170" y2="309" stroke="#4FD1FF" strokeOpacity="0.070" />
                <line x1="0" y1="342" x2="170" y2="342" stroke="#4FD1FF" strokeOpacity="0.058" />
                <line x1="0" y1="381" x2="170" y2="381" stroke="#4FD1FF" strokeOpacity="0.046" />
                <line x1="0" y1="426" x2="170" y2="426" stroke="#4FD1FF" strokeOpacity="0.034" />
                <ellipse cx="92" cy="244" rx="49" ry="8" fill="url(#s31)" />
                <polygon points="80.8,89.6 100.4,83.9 100.4,148.6 86.4,150.0" fill="url(#l31)" stroke="url(#l31)" strokeWidth="11.2" strokeLinejoin="round" opacity="1.0" />
                <line x1="90.6" y1="86.7" x2="93.4" y2="149.3" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="1.4" strokeDasharray="2.8 2.8" />
                <line x1="92.0" y1="83.9" x2="94.8" y2="64.2" stroke="#050505" strokeWidth="7.7" strokeLinecap="round" opacity=".6" />
                <line x1="92.0" y1="83.9" x2="94.8" y2="64.2" stroke="url(#l31)" strokeWidth="4.9" strokeLinecap="round" opacity="1.0" />
                <line x1="92.0" y1="83.9" x2="94.8" y2="64.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="80.8" y1="89.6" x2="61.1" y2="88.1" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
                <line x1="80.8" y1="89.6" x2="61.1" y2="88.1" stroke="url(#l31)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
                <line x1="80.8" y1="89.6" x2="61.1" y2="88.1" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="61.1" y1="88.1" x2="55.4" y2="60.0" stroke="#050505" strokeWidth="9.1" strokeLinecap="round" opacity=".6" />
                <line x1="61.1" y1="88.1" x2="55.4" y2="60.0" stroke="url(#l31)" strokeWidth="6.3" strokeLinecap="round" opacity="1.0" />
                <line x1="61.1" y1="88.1" x2="55.4" y2="60.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="100.4" y1="83.9" x2="104.7" y2="55.8" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
                <line x1="100.4" y1="83.9" x2="104.7" y2="55.8" stroke="url(#l31)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
                <line x1="100.4" y1="83.9" x2="104.7" y2="55.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="104.7" y1="55.8" x2="107.5" y2="29.1" stroke="#050505" strokeWidth="9.1" strokeLinecap="round" opacity=".6" />
                <line x1="104.7" y1="55.8" x2="107.5" y2="29.1" stroke="url(#l31)" strokeWidth="6.3" strokeLinecap="round" opacity="1.0" />
                <line x1="104.7" y1="55.8" x2="107.5" y2="29.1" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="86.4" y1="150.0" x2="70.9" y2="192.2" stroke="#050505" strokeWidth="13.4" strokeLinecap="round" opacity=".6" />
                <line x1="86.4" y1="150.0" x2="70.9" y2="192.2" stroke="url(#l31)" strokeWidth="10.5" strokeLinecap="round" opacity="1.0" />
                <line x1="86.4" y1="150.0" x2="70.9" y2="192.2" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.0" strokeLinecap="round" />
                <line x1="70.9" y1="192.2" x2="77.9" y2="240.0" stroke="#050505" strokeWidth="11.2" strokeLinecap="round" opacity=".6" />
                <line x1="70.9" y1="192.2" x2="77.9" y2="240.0" stroke="url(#l31)" strokeWidth="8.4" strokeLinecap="round" opacity="1.0" />
                <line x1="70.9" y1="192.2" x2="77.9" y2="240.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="100.4" y1="148.6" x2="107.5" y2="188.0" stroke="#050505" strokeWidth="13.4" strokeLinecap="round" opacity=".6" />
                <line x1="100.4" y1="148.6" x2="107.5" y2="188.0" stroke="url(#l31)" strokeWidth="10.5" strokeLinecap="round" opacity="1.0" />
                <line x1="100.4" y1="148.6" x2="107.5" y2="188.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.0" strokeLinecap="round" />
                <line x1="107.5" y1="188.0" x2="113.1" y2="240.0" stroke="#050505" strokeWidth="11.2" strokeLinecap="round" opacity=".6" />
                <line x1="107.5" y1="188.0" x2="113.1" y2="240.0" stroke="url(#l31)" strokeWidth="8.4" strokeLinecap="round" opacity="1.0" />
                <line x1="107.5" y1="188.0" x2="113.1" y2="240.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="94.8" cy="64.2" r="9.1" fill="url(#h31)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
                <line x1="55.4" y1="60.0" x2="43.7" y2="34.5" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="3.5" strokeLinecap="round" />
                <ellipse cx="34.4" cy="14.0" rx="22.5" ry="14.8" transform="rotate(-114.6 34.4 14.0)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="2.2" />
                <g transform="rotate(-114.6 34.4 14.0)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
                  <line x1="13.3" y1="5.6" x2="55.4" y2="5.6" />
                  <line x1="13.3" y1="9.8" x2="55.4" y2="9.8" />
                  <line x1="13.3" y1="14.0" x2="55.4" y2="14.0" />
                  <line x1="13.3" y1="18.2" x2="55.4" y2="18.2" />
                  <line x1="13.3" y1="22.4" x2="55.4" y2="22.4" />
                  <line x1="21.7" y1="0.7" x2="21.7" y2="27.4" />
                  <line x1="28.0" y1="0.7" x2="28.0" y2="27.4" />
                  <line x1="34.4" y1="0.7" x2="34.4" y2="27.4" />
                  <line x1="40.7" y1="0.7" x2="40.7" y2="27.4" />
                  <line x1="47.0" y1="0.7" x2="47.0" y2="27.4" />
                </g>
                <ellipse cx="34.4" cy="14.0" rx="22.5" ry="14.8" transform="rotate(-114.6 34.4 14.0)" fill="none" stroke="#F0454A" strokeWidth="1.4" />
                <circle cx="92.0" cy="83.9" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="92.0" cy="83.9" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="80.8" cy="89.6" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="80.8" cy="89.6" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="100.4" cy="83.9" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="100.4" cy="83.9" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="61.1" cy="88.1" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="61.1" cy="88.1" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="104.7" cy="55.8" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="104.7" cy="55.8" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="55.4" cy="60.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="55.4" cy="60.0" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="107.5" cy="29.1" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="107.5" cy="29.1" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="86.4" cy="150.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="86.4" cy="150.0" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="100.4" cy="148.6" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="100.4" cy="148.6" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="70.9" cy="192.2" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="70.9" cy="192.2" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="107.5" cy="188.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="107.5" cy="188.0" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="77.9" cy="240.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="77.9" cy="240.0" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <circle cx="113.1" cy="240.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
                <circle cx="113.1" cy="240.0" r="2.5" fill="#D8F34A" filter="url(#g31)" />
                <path d="M80.8 89.6 L82.8 111.5 A22 22 0 0 1 58.8 88.0 Z" fill="#4CD07D" fillOpacity=".18" stroke="#4CD07D" strokeWidth="2" />
                <line x1="80.8" y1="89.6" x2="47.2" y2="121.0" stroke="#4CD07D" strokeWidth="1" strokeOpacity=".6" />
                <rect x="28.8" y="110.0" width="36.8" height="22" rx="7" fill="#050505" fillOpacity=".88" stroke="#4CD07D" strokeOpacity=".7" />
                <text x="47.2" y="125.5" textAnchor="middle" fontFamily="Barlow Condensed,sans-serif" fontWeight="700" fontSize="15" fill="#4CD07D">
                  99°
                </text>
                <path d="M10 24V10H24M146 10H160V24M10 226V240H24M146 240H160V226" fill="none" stroke="#D8F34A" strokeOpacity=".7" strokeWidth="2" />
              </svg>
              <span className={s.e5}>
                {t.model_b}
              </span>
            </div>
          </div>
          </>
        )}
        {over && (
          <>
          <div className={`${s.lab} ${s.e6}`}>
            <svg className={s.e3} width="357" height="250" viewBox="0 0 357 250" aria-hidden="true">
              <defs>
                <linearGradient id="l32" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFB3B5" />
                  <stop offset="1" stopColor="#FFB3B5" stopOpacity=".55" />
                </linearGradient>
                <radialGradient id="h32" cx=".35" cy=".3" r=".8">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#FFB3B5" stopOpacity=".6" />
                </radialGradient>
                <linearGradient id="t32" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#D8F34A" stopOpacity="0" />
                  <stop offset="1" stopColor="#D8F34A" />
                </linearGradient>
                <filter id="g32" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="s32" cx=".5" cy=".5" r=".5">
                  <stop offset="0" stopColor="#000" stopOpacity=".55" />
                  <stop offset="1" stopColor="#000" stopOpacity="0" />
                </radialGradient>
              </defs>
              <line x1="10" y1="234" x2="-302" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="38" y1="234" x2="-222" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="66" y1="234" x2="-142" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="94" y1="234" x2="-62" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="122" y1="234" x2="18" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="150" y1="234" x2="98" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="178" y1="234" x2="178" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="206" y1="234" x2="258" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="234" y1="234" x2="338" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="262" y1="234" x2="418" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="290" y1="234" x2="498" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="318" y1="234" x2="578" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="346" y1="234" x2="658" y2="250" stroke="#4FD1FF" strokeOpacity=".10" />
              <line x1="0" y1="234" x2="357" y2="234" stroke="#4FD1FF" strokeOpacity="0.130" />
              <line x1="0" y1="237" x2="357" y2="237" stroke="#4FD1FF" strokeOpacity="0.118" />
              <line x1="0" y1="246" x2="357" y2="246" stroke="#4FD1FF" strokeOpacity="0.106" />
              <line x1="0" y1="261" x2="357" y2="261" stroke="#4FD1FF" strokeOpacity="0.094" />
              <line x1="0" y1="282" x2="357" y2="282" stroke="#4FD1FF" strokeOpacity="0.082" />
              <line x1="0" y1="309" x2="357" y2="309" stroke="#4FD1FF" strokeOpacity="0.070" />
              <line x1="0" y1="342" x2="357" y2="342" stroke="#4FD1FF" strokeOpacity="0.058" />
              <line x1="0" y1="381" x2="357" y2="381" stroke="#4FD1FF" strokeOpacity="0.046" />
              <line x1="0" y1="426" x2="357" y2="426" stroke="#4FD1FF" strokeOpacity="0.034" />
              <polygon points="166.8,89.6 186.4,83.9 186.4,148.6 172.4,150.0" fill="#4FD1FF" fillOpacity="0.08" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
              <line x1="178.0" y1="83.9" x2="180.8" y2="64.2" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="166.8" y1="89.6" x2="147.1" y2="88.1" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="147.1" y1="88.1" x2="141.4" y2="60.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="186.4" y1="83.9" x2="190.7" y2="55.8" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="190.7" y1="55.8" x2="193.5" y2="29.1" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.8" strokeLinecap="round" />
              <line x1="172.4" y1="150.0" x2="156.9" y2="192.2" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.7" strokeLinecap="round" />
              <line x1="156.9" y1="192.2" x2="163.9" y2="240.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.8" strokeLinecap="round" />
              <line x1="186.4" y1="148.6" x2="193.5" y2="188.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="4.7" strokeLinecap="round" />
              <line x1="193.5" y1="188.0" x2="199.1" y2="240.0" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="3.8" strokeLinecap="round" />
              <circle cx="180.8" cy="64.2" r="9.1" fill="none" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.6" />
              <line x1="141.4" y1="60.0" x2="129.7" y2="34.5" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="2.0" strokeLinecap="round" />
              <ellipse cx="120.4" cy="14.0" rx="22.5" ry="14.8" transform="rotate(-114.6 120.4 14.0)" fill="#4FD1FF" fillOpacity="0.02" stroke="#4FD1FF" strokeOpacity="0.22" strokeWidth="1.5" />
              <ellipse cx="178" cy="244" rx="49" ry="8" fill="url(#s32)" />
              <polygon points="166.8,85.3 186.4,82.5 185.0,144.4 172.4,144.4" fill="url(#l32)" stroke="url(#l32)" strokeWidth="11.2" strokeLinejoin="round" opacity="1.0" />
              <line x1="176.6" y1="83.9" x2="178.7" y2="144.4" stroke="#0B0B0C" strokeOpacity=".35" strokeWidth="1.4" strokeDasharray="2.8 2.8" />
              <line x1="176.6" y1="79.7" x2="178.0" y2="60.0" stroke="#050505" strokeWidth="7.7" strokeLinecap="round" opacity=".6" />
              <line x1="176.6" y1="79.7" x2="178.0" y2="60.0" stroke="url(#l32)" strokeWidth="4.9" strokeLinecap="round" opacity="1.0" />
              <line x1="176.6" y1="79.7" x2="178.0" y2="60.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="166.8" y1="85.3" x2="154.1" y2="99.4" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
              <line x1="166.8" y1="85.3" x2="154.1" y2="99.4" stroke="url(#l32)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
              <line x1="166.8" y1="85.3" x2="154.1" y2="99.4" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="154.1" y1="99.4" x2="156.9" y2="67.1" stroke="#050505" strokeWidth="9.1" strokeLinecap="round" opacity=".6" />
              <line x1="154.1" y1="99.4" x2="156.9" y2="67.1" stroke="url(#l32)" strokeWidth="6.3" strokeLinecap="round" opacity="1.0" />
              <line x1="154.1" y1="99.4" x2="156.9" y2="67.1" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="186.4" y1="82.5" x2="189.2" y2="60.0" stroke="#050505" strokeWidth="10.5" strokeLinecap="round" opacity=".6" />
              <line x1="186.4" y1="82.5" x2="189.2" y2="60.0" stroke="url(#l32)" strokeWidth="7.7" strokeLinecap="round" opacity="1.0" />
              <line x1="186.4" y1="82.5" x2="189.2" y2="60.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="189.2" y1="60.0" x2="192.1" y2="33.3" stroke="#050505" strokeWidth="9.1" strokeLinecap="round" opacity=".6" />
              <line x1="189.2" y1="60.0" x2="192.1" y2="33.3" stroke="url(#l32)" strokeWidth="6.3" strokeLinecap="round" opacity="1.0" />
              <line x1="189.2" y1="60.0" x2="192.1" y2="33.3" stroke="#ffffff" strokeOpacity=".45" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="172.4" y1="144.4" x2="169.6" y2="190.8" stroke="#050505" strokeWidth="13.4" strokeLinecap="round" opacity=".6" />
              <line x1="172.4" y1="144.4" x2="169.6" y2="190.8" stroke="url(#l32)" strokeWidth="10.5" strokeLinecap="round" opacity="1.0" />
              <line x1="172.4" y1="144.4" x2="169.6" y2="190.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.0" strokeLinecap="round" />
              <line x1="169.6" y1="190.8" x2="168.2" y2="240.0" stroke="#050505" strokeWidth="11.2" strokeLinecap="round" opacity=".6" />
              <line x1="169.6" y1="190.8" x2="168.2" y2="240.0" stroke="url(#l32)" strokeWidth="8.4" strokeLinecap="round" opacity="1.0" />
              <line x1="169.6" y1="190.8" x2="168.2" y2="240.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="185.0" y1="144.4" x2="186.4" y2="190.8" stroke="#050505" strokeWidth="13.4" strokeLinecap="round" opacity=".6" />
              <line x1="185.0" y1="144.4" x2="186.4" y2="190.8" stroke="url(#l32)" strokeWidth="10.5" strokeLinecap="round" opacity="1.0" />
              <line x1="185.0" y1="144.4" x2="186.4" y2="190.8" stroke="#ffffff" strokeOpacity=".45" strokeWidth="3.0" strokeLinecap="round" />
              <line x1="186.4" y1="190.8" x2="192.1" y2="240.0" stroke="#050505" strokeWidth="11.2" strokeLinecap="round" opacity=".6" />
              <line x1="186.4" y1="190.8" x2="192.1" y2="240.0" stroke="url(#l32)" strokeWidth="8.4" strokeLinecap="round" opacity="1.0" />
              <line x1="186.4" y1="190.8" x2="192.1" y2="240.0" stroke="#ffffff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="178.0" cy="60.0" r="9.1" fill="url(#h32)" stroke="#050505" strokeOpacity=".5" strokeWidth="2" />
              <line x1="156.9" y1="67.1" x2="150.8" y2="39.6" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="3.5" strokeLinecap="round" />
              <ellipse cx="145.9" cy="17.6" rx="22.5" ry="14.8" transform="rotate(-102.5 145.9 17.6)" fill="#F3F6F1" fillOpacity="0.10" stroke="#F3F6F1" strokeOpacity="1.00" strokeWidth="2.2" />
              <g transform="rotate(-102.5 145.9 17.6)" stroke="#ffffff" strokeOpacity=".35" strokeWidth="1">
                <line x1="124.8" y1="9.2" x2="167.0" y2="9.2" />
                <line x1="124.8" y1="13.4" x2="167.0" y2="13.4" />
                <line x1="124.8" y1="17.6" x2="167.0" y2="17.6" />
                <line x1="124.8" y1="21.9" x2="167.0" y2="21.9" />
                <line x1="124.8" y1="26.1" x2="167.0" y2="26.1" />
                <line x1="133.3" y1="4.3" x2="133.3" y2="31.0" />
                <line x1="139.6" y1="4.3" x2="139.6" y2="31.0" />
                <line x1="145.9" y1="4.3" x2="145.9" y2="31.0" />
                <line x1="152.3" y1="4.3" x2="152.3" y2="31.0" />
                <line x1="158.6" y1="4.3" x2="158.6" y2="31.0" />
              </g>
              <ellipse cx="145.9" cy="17.6" rx="22.5" ry="14.8" transform="rotate(-102.5 145.9 17.6)" fill="none" stroke="#F0454A" strokeWidth="1.4" />
              <circle cx="176.6" cy="79.7" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="176.6" cy="79.7" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="166.8" cy="85.3" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="166.8" cy="85.3" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="186.4" cy="82.5" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="186.4" cy="82.5" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="154.1" cy="99.4" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="154.1" cy="99.4" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="189.2" cy="60.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="189.2" cy="60.0" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="156.9" cy="67.1" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="156.9" cy="67.1" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="192.1" cy="33.3" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="192.1" cy="33.3" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="172.4" cy="144.4" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="172.4" cy="144.4" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="185.0" cy="144.4" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="185.0" cy="144.4" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="169.6" cy="190.8" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="169.6" cy="190.8" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="186.4" cy="190.8" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="186.4" cy="190.8" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="168.2" cy="240.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="168.2" cy="240.0" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <circle cx="192.1" cy="240.0" r="4.9" fill="none" stroke="#D8F34A" strokeOpacity=".45" strokeWidth="1.2" />
              <circle cx="192.1" cy="240.0" r="2.5" fill="#D8F34A" filter="url(#g32)" />
              <path d="M10 24V10H24M333 10H347V24M10 226V240H24M333 240H347V226" fill="none" stroke="#D8F34A" strokeOpacity=".7" strokeWidth="2" />
            </svg>
            <span className={s.e7}>
              {t.correct_model_ghost}
            </span>
          </div>
          </>
        )}
        <div className={s.e8}>
          <button className={`icon ${s.icon}`} aria-label={t.previous_frame} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div className={`${s.grow} ${s.bar} ${s.e9}`}>
            <i className={s.e10} />
          </div>
          <button className={`icon ${s.icon}`} aria-label={t.next_frame} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <span className={s.tag}>
            0,25×
          </span>
        </div>
        <div className={s.g3}>
          <div className={s.tile}>
            <b className={s.e11}>
              47°
            </b>
            <span>
              {t.shoulder_elbow_today}
            </span>
          </div>
          <div className={s.tile}>
            <b className={s.e12}>
              99°
            </b>
            <span>
              {t.model}
            </span>
          </div>
          <div className={s.tile}>
            <b className={s.e13}>
              -52°
            </b>
            <span>
              {t.difference}
            </span>
          </div>
        </div>
      </div>
      </div>
    </Schermo>
  );
}
