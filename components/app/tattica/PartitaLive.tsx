"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";
import S from "./PartitaLive.module.css";

const T = {
  it: {
    tommasoR: "Tommaso R.",
    opponent: "Avversario",
    setPoint: "SET POINT",
    topspin: "Topspin",
    forehand: "Diritto",
    pause: "Pausa",
    matchPoint: "Match Point",
    play: "Riproduci",
    chiudi: "Chiudi",
  },
  en: {
    tommasoR: "Tommaso R.",
    opponent: "Opponent",
    setPoint: "SET POINT",
    topspin: "Topspin",
    forehand: "Forehand",
    pause: "Pause",
    matchPoint: "Match Point",
    play: "Play",
    chiudi: "Close",
  },
};

// Il disegno è in orizzontale (852×393): lo scaliamo per stare nello schermo e, se il telefono è in verticale, lo ruotiamo di 90°.
const LARGHEZZA = 852, ALTEZZA = 393;

export function PartitaLive() {
  const t = useT(T);
  const [pausa, setPausa] = useState(false);
  const [vista, setVista] = useState({ scala: 0.45, ruota: true });
  useEffect(() => {
    const adatta = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const ruota = h > w;
      const [W, H] = ruota ? [h, w] : [w, h];
      setVista({ scala: Math.min(W / LARGHEZZA, H / ALTEZZA), ruota });
    };
    adatta();
    window.addEventListener("resize", adatta);
    return () => window.removeEventListener("resize", adatta);
  }, []);
  return (
    <div className={S.fuori}>
      <div className={S.stage} style={{ transform: `rotate(${vista.ruota ? 90 : 0}deg) scale(${vista.scala})` }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#203528 0,#1E5A3A 38%,#2C5A8C 38%,#2F6096 100%)" }}></div>
      <svg width="852" height="393" viewBox="0 0 852 393" aria-hidden="true" style={{ position: "absolute", inset: "0" }}>
        <path d="M120 393 L330 150 L560 150 L770 393Z" fill="#2F6096" stroke="#fff" strokeWidth="3"></path>
        <path d="M190 393 L360 150 M700 393 L530 150 M262 300 L628 300 M340 195 L552 195 M445 195 L445 300" stroke="#fff" strokeWidth="2.5"></path>
        <path d="M300 186 H590" stroke="#fff" strokeWidth="5" opacity=".9"></path>
        <path d="M300 186 V164 M590 186 V164" stroke="#ddd" strokeWidth="3"></path>
        <path d="M440 330 Q 520 40 600 172" fill="none" stroke="#D8F34A" strokeWidth="3"></path>
        <circle cx="600" cy="172" r="7" fill="#D8F34A"></circle>
        <g stroke="#F3F6F1" strokeWidth="7" strokeLinecap="round" fill="none">
          <circle cx="430" cy="260" r="14"></circle>
          <path d="M430 276v52M430 290l34-12 16-22M430 290l-28 16M430 328l-16 46M430 328l20 46"></path>
        </g>
        <g stroke="#F3F6F1" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".9">
          <circle cx="470" cy="128" r="7"></circle>
          <path d="M470 136v24M470 142l-12 10M470 142l12 8M470 160l-7 18M470 160l7 18"></path>
        </g>
      </svg>
      <div style={{ position: "absolute", left: "56px", top: "18px", width: "250px", borderRadius: "16px", background: "rgba(5,5,5,.78)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "6px", border: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "15px" }}>
          <span className={K.grow}>{t.tommasoR}</span>
          <span className={K.dot} style={{ background: "#D8F34A", width: "8px", height: "8px" }}></span>
          <span className={K.disp} style={{ fontSize: "22px", width: "20px", textAlign: "center" }}>5</span>
          <span className={K.disp} style={{ fontSize: "22px", width: "28px", textAlign: "right", color: "#D8F34A" }}>40</span>
        </div>
        <div style={{ height: "1px", background: "rgba(255,255,255,.12)" }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", fontSize: "15px" }}>
          <span className={K.grow}>{t.opponent}</span>
          <span className={K.disp} style={{ fontSize: "22px", width: "20px", textAlign: "center" }}>4</span>
          <span className={K.disp} style={{ fontSize: "22px", width: "28px", textAlign: "right" }}>15</span>
        </div>
        <div style={{ fontSize: "12px", fontWeight: "800", color: "#D8F34A", letterSpacing: ".5px" }}>{t.setPoint}</div>
      </div>
      <div style={{ position: "absolute", right: "190px", top: "120px", borderRadius: "14px", background: "rgba(5,5,5,.78)", padding: "8px 12px", display: "grid", gridTemplateColumns: "auto auto", gap: "2px 14px", fontWeight: "800", fontSize: "14px", border: "1px solid rgba(255,255,255,.1)" }}>
        <span style={{ color: "#4CD07D" }}>{t.topspin}</span>
        <span className={K.disp} style={{ fontSize: "20px", textAlign: "right" }}>104</span>
        <span style={{ color: "#4CD07D" }}>{t.forehand}</span>
        <span style={{ textAlign: "right", fontSize: "12px" }}>km/h</span>
      </div>
      <svg width="130" height="110" viewBox="0 0 130 110" aria-hidden="true" style={{ position: "absolute", right: "30px", top: "18px", borderRadius: "14px", background: "rgba(5,5,5,.78)" }}>
        <g fill="none" stroke="#fff" strokeWidth="1.4">
          <rect x="20" y="12" width="90" height="86"></rect>
          <path d="M20 55h90M38 12v86M92 12v86M65 30v50M38 30h54M38 80h54"></path>
        </g>
        <circle cx="61" cy="59" r="3.5" fill="#3D8BFF"></circle>
        <circle cx="61" cy="81" r="3.5" fill="#FF9F43"></circle>
        <circle cx="39" cy="56" r="3.5" fill="#FF9F43"></circle>
        <circle cx="32" cy="40" r="3.5" fill="#4CD07D"></circle>
        <circle cx="68" cy="84" r="3.5" fill="#4CD07D"></circle>
        <circle cx="73" cy="47" r="3.5" fill="#3D8BFF"></circle>
        <circle cx="78" cy="64" r="3.5" fill="#FF9F43"></circle>
        <circle cx="75" cy="80" r="3.5" fill="#4CD07D"></circle>
        <circle cx="29" cy="32" r="3.5" fill="#FF9F43"></circle>
        <circle cx="73" cy="76" r="3.5" fill="#D8F34A"></circle>
        <circle cx="60" cy="80" r="3.5" fill="#FF9F43"></circle>
        <circle cx="77" cy="55" r="3.5" fill="#4CD07D"></circle>
        <circle cx="62" cy="39" r="3.5" fill="#4CD07D"></circle>
        <circle cx="82" cy="41" r="3.5" fill="#FF9F43"></circle>
        <circle cx="66" cy="20" r="3.5" fill="#4CD07D"></circle>
        <circle cx="57" cy="81" r="3.5" fill="#3D8BFF"></circle>
      </svg>
      <div style={{ position: "absolute", left: "56px", right: "40px", bottom: "18px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button type="button" className={K.icon} aria-label={pausa ? t.play : t.pause} onClick={() => setPausa((p) => !p)} style={{ background: "rgba(5,5,5,.7)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={pausa ? "M8 5v14l11-7z" : "M8 5v14M16 5v14"}></path>
          </svg>
        </button>
        <div className={K.grow} style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,.3)", position: "relative" }}>
          <span style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "72%", background: "#fff", borderRadius: "2px" }}></span>
        </div>
        <span className={K.disp} style={{ fontSize: "16px", fontWeight: "700" }}>1:12:40</span>
        <span style={{ fontFamily: "var(--font-hanken), 'Hanken Grotesk', sans-serif", fontWeight: "800", fontSize: "15px", letterSpacing: "-.5px", background: "rgba(5,5,5,.7)", padding: "5px 10px", borderRadius: "10px" }}>{t.matchPoint}</span>
      </div>
      {/* uscita: torna all'analisi della partita */}
      <Link href={ROTTE.StatPartita} className={K.icon} aria-label={t.chiudi} style={{ position: "absolute", left: 8, top: 18, background: "rgba(5,5,5,.7)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </Link>
      </div>
    </div>
  );
}
