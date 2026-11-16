"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { LinguaChip } from "../LinguaChip";
import s from "./atletica.module.css";

const T = { it: { indietro: "Indietro" }, en: { indietro: "Back" } };

/** Intestazione dei disegni: freccia indietro, riga piccola sopra e titolo; a destra il cambio lingua. */
export function Testata({ kick, titolo, indietro }: { kick: string; titolo: string; indietro: string }) {
  const t = useT(T);
  return (
    <header className={s.hdr}>
      <Link href={indietro} className={s.icon} aria-label={t.indietro}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      </Link>
      <div className={s.grow}>
        <div className={s.kick}>{kick}</div>
        <h1 className={s.h1}>{titolo}</h1>
      </div>
      <span className={s.testaDx}><LinguaChip /></span>
    </header>
  );
}
