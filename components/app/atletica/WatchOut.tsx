"use client";
import { useT } from "@/lib/i18n/lingua";
import { Quadrante } from "./Quadrante";
import s from "./atletica.module.css";

const T = {
  it: { chiamata: "CHIAMATA", out: "OUT!", fuori: "fuori di 4 cm", nome: "Chiamata OUT sul quadrante dello smartwatch" },
  en: { chiamata: "CALL", out: "OUT!", fuori: "out by 4 cm", nome: "OUT call on the smartwatch face" },
  fr: { chiamata: "ANNONCE", out: "OUT!", fuori: "dehors de 4 cm", nome: "Annonce OUT sur le cadran de la montre" },
  de: { chiamata: "ENTSCHEIDUNG", out: "OUT!", fuori: "4 cm im Aus", nome: "OUT-Entscheidung auf dem Smartwatch-Display" },
  es: { chiamata: "CANTO", out: "¡OUT!", fuori: "fuera por 4 cm", nome: "Canto OUT en la esfera del smartwatch" },
};

export function WatchOut() {
  const t = useT(T);
  return (
    <Quadrante etichetta={t.nome}>
      <div style={{ position: "absolute", inset: 0, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4CD07D", fontWeight: 800, fontSize: 13, letterSpacing: ".5px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>{t.chiamata}
        </div>
        <div style={{ width: 174, height: 96, borderRadius: 14, background: "repeating-linear-gradient(-20deg,#B65A33 0 14px,#BE6239 14px 28px)", position: "relative", overflow: "hidden" }}>
          <svg width="174" height="96" viewBox="0 0 174 96" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            <path d="M-10 70 L190 22" stroke="#fff" strokeWidth="6" />
            <path d="M20 30 Q 80 34 128 52" fill="none" stroke="#D8F34A" strokeWidth="2" strokeDasharray="3 4" />
            <circle cx="128" cy="52" r="6" fill="#D8F34A" />
          </svg>
        </div>
        <div className={s.hanken} style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-1px", color: "#FF5A5F", lineHeight: 1 }}>{t.out}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#A1A1A6" }}>{t.fuori}</div>
      </div>
    </Quadrante>
  );
}
