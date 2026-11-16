"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";

const T = {
  it: { coach: "Coach AI", tecnica: "Tecnica", tattica: "Tattica", atletica: "Atletica", carica: "Carica o registra un video", sezioni: "Sezioni" },
  en: { coach: "AI Coach", tecnica: "Technique", tattica: "Tactics", atletica: "Fitness", carica: "Upload or record a video", sezioni: "Sections" },
};

export type Scheda = "coach" | "tecnica" | "tattica" | "atletica";

/** Barra delle cinque schede (Coach AI, Tecnica, +, Tattica, Atletica) come nei disegni. */
export function TabBar({ attiva }: { attiva?: Scheda }) {
  const t = useT(T);
  const p = usePathname();
  const on = (s: Scheda, path: string) => (attiva ? attiva === s : p === path) ? "mp-tab on" : "mp-tab";
  return (
    <nav className="mp-tabbar" aria-label={t.sezioni}>
      <Link className={on("coach", ROTTE.Main)} href={ROTTE.Main}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" /><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" /></svg>
        <span>{t.coach}</span>
      </Link>
      <Link className={on("tecnica", ROTTE.Tecnica)} href={ROTTE.Tecnica}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><ellipse cx="14.5" cy="8.5" rx="5.5" ry="6.2" transform="rotate(40 14.5 8.5)" /><path d="M10.2 12.8L3.5 20.5" /></svg>
        <span>{t.tecnica}</span>
      </Link>
      <Link className="mp-plus" href={ROTTE.Carica} aria-label={t.carica}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </Link>
      <Link className={on("tattica", ROTTE.Tattica)} href={ROTTE.Tattica}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M4 12h16M7 3v18M17 3v18M7 7.5h10M7 16.5h10M12 7.5v9" /></svg>
        <span>{t.tattica}</span>
      </Link>
      <Link className={on("atletica", ROTTE.Atletica)} href={ROTTE.Atletica}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></svg>
        <span>{t.atletica}</span>
      </Link>
    </nav>
  );
}
