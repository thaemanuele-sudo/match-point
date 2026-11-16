"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/lingua";
import s from "./comune.module.css";

const T = {
  it: { indietro: "Indietro" },
  en: { indietro: "Back" },
  fr: { indietro: "Retour" },
  de: { indietro: "Zurück" },
  es: { indietro: "Atrás" },
};

/** Logo "Match Point" con la pallina, come nella Home (font .brand). */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span className="brand" style={{ fontSize: size, fontWeight: 800, letterSpacing: -size * 0.04, color: "#fff", lineHeight: 1.1 }}>Match Point</span>
      <svg width={size * 0.67} height={size * 0.67} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#D8F34A" />
        <path d="M4.2 5c4 3.2 4 10.8 0 14M19.8 5c-4 3.2-4 10.8 0 14" fill="none" stroke="#fff" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

export const Freccia = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
);
export const Chev = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
export const Scudo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const Play = ({ size = 18, colore = "#fff" }: { size?: number; colore?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={colore} stroke="none" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
export const Stella = ({ size = 24, piena = false }: { size?: number; piena?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={piena ? "#D8F34A" : "none"} stroke={piena ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
);
export const Fiamma = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c3 4 6 6 6 11a6 6 0 01-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-5 1-8z" /></svg>
);
export const Bersaglio = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>
);
export const Fulmine = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></svg>
);

/** Intestazione delle schermate dei disegni: freccia indietro, riga piccola e titolo. */
export function Testata({ indietro, kick, titolo }: { indietro: string; kick?: ReactNode; titolo: ReactNode }) {
  const t = useT(T);
  return (
    <header className={s.hdr}>
      <Link href={indietro} className="icon" aria-label={t.indietro}><Freccia /></Link>
      <div className={s.grow}>
        {kick && <div className={s.kick}>{kick}</div>}
        <h1 className={s.h1}>{titolo}</h1>
      </div>
    </header>
  );
}
