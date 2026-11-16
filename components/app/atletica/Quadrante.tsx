"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/lingua";
import s from "./atletica.module.css";

const T = { it: { indietro: "Indietro", nota: "Vista dello smartwatch" }, en: { indietro: "Back", nota: "Smartwatch view" } };

/** Le schermate Watch: il quadrante (198×246 nei disegni) ingrandito e centrato su nero, senza barra delle schede. */
export function Quadrante({ children, etichetta }: { children: ReactNode; etichetta: string }) {
  const t = useT(T);
  const router = useRouter();
  return (
    <div className="mp-screen" style={{ background: "#000" }}>
      <div className={s.watchPag}>
        <button type="button" className={`${s.icon} ${s.watchBack}`} aria-label={t.indietro} onClick={() => router.back()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className={s.watchBox}>
          <div className={s.watchDial} role="group" aria-label={etichetta}>{children}</div>
        </div>
        <div className={s.watchHint}>{t.nota}</div>
      </div>
    </div>
  );
}

/** Ora corrente "HH:MM" per il quadrante. Parte vuota per non differire tra server e browser, poi si aggiorna. */
export function useOra() {
  const [ora, setOra] = useState("");
  useEffect(() => {
    const f = () => setOra(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    f();
    const id = setInterval(f, 15_000);
    return () => clearInterval(id);
  }, []);
  return ora;
}
