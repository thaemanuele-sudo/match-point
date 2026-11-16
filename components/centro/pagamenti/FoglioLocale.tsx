"use client";
import { useEffect, useRef, type ReactNode } from "react";
import s from "./pagamenti.module.css";

/** Pannello dal basso (modale): si chiude con Esc o toccando fuori. Il focus parte dal primo campo. */
export function FoglioLocale({ titolo, chiudi, children }: { titolo: string; chiudi: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const primo = el?.querySelector<HTMLElement>("input,select,button");
    primo?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && chiudi();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [chiudi]);
  return (
    <div className={s.velo} onMouseDown={(e) => e.target === e.currentTarget && chiudi()}>
      <div className={s.foglio} role="dialog" aria-modal="true" aria-label={titolo} ref={ref}>
        <h2 className={s.foglioT}>{titolo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Interruttore({ on, onChange, etichetta }: { on: boolean; onChange: (v: boolean) => void; etichetta: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={etichetta} className={`${s.sw} ${on ? s.on : ""}`} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}
