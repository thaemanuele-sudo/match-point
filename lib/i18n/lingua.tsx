"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lingua = "it" | "en";
const CHIAVE = "mp-lingua";

type Ctx = { lang: Lingua; setLang: (l: Lingua) => void };
const LinguaCtx = createContext<Ctx>({ lang: "it", setLang: () => {} });

/** Lingua dell'app: salvata sul dispositivo (localStorage "mp-lingua"), italiano di partenza. */
export function LinguaProvider({ children, iniziale = "it" }: { children: ReactNode; iniziale?: Lingua }) {
  const [lang, setL] = useState<Lingua>(iniziale);
  useEffect(() => {
    try {
      const s = localStorage.getItem(CHIAVE);
      if (s === "it" || s === "en") setL(s);
      else if (navigator.language?.toLowerCase().startsWith("en")) setL("en");
    } catch {
      /* storage non disponibile: resta l'italiano */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lingua) => {
    setL(l);
    try {
      localStorage.setItem(CHIAVE, l);
    } catch {}
  }, []);
  return <LinguaCtx.Provider value={{ lang, setLang }}>{children}</LinguaCtx.Provider>;
}

export const useLang = () => useContext(LinguaCtx);

/**
 * Testi di una schermata: ogni schermata dichiara il suo dizionario
 *   const T = { it: { titolo: "Tecnica" }, en: { titolo: "Technique" } } satisfies Dizionario;
 * e lo usa con  const t = useT(T);  →  t.titolo
 */
export type Dizionario<K extends string = string> = { it: Record<K, string>; en: Record<K, string> };
export function useT<D extends { it: Record<string, string>; en: Record<string, string> }>(d: D): D["it"] {
  const { lang } = useLang();
  return (d[lang] ?? d.it) as D["it"];
}
