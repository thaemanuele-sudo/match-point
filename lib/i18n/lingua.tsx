"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lingua = "it" | "en" | "fr" | "de" | "es";
export const LINGUE: { codice: Lingua; nome: string }[] = [
  { codice: "it", nome: "Italiano" },
  { codice: "en", nome: "English" },
  { codice: "fr", nome: "Français" },
  { codice: "de", nome: "Deutsch" },
  { codice: "es", nome: "Español" },
];
const valida = (s: unknown): s is Lingua => s === "it" || s === "en" || s === "fr" || s === "de" || s === "es";
const CHIAVE = "mp-lingua";

type Ctx = { lang: Lingua; setLang: (l: Lingua) => void };
const LinguaCtx = createContext<Ctx>({ lang: "it", setLang: () => {} });

/** Lingua dell'app: salvata sul dispositivo (localStorage "mp-lingua"), italiano di partenza. */
export function LinguaProvider({ children, iniziale = "it" }: { children: ReactNode; iniziale?: Lingua }) {
  const [lang, setL] = useState<Lingua>(iniziale);
  useEffect(() => {
    try {
      const s = localStorage.getItem(CHIAVE);
      if (valida(s)) setL(s);
      else {
        const nav = navigator.language?.toLowerCase().slice(0, 2);
        if (valida(nav)) setL(nav);
      }
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
 * Testi di una schermata: ogni schermata dichiara il suo dizionario nelle cinque lingue
 *   const T = { it: { titolo: "Tecnica" }, en: { titolo: "Technique" }, fr: {...}, de: {...}, es: {...} };
 * e lo usa con  const t = useT(T);  →  t.titolo
 */
export type Dizionario<K extends string = string> = Record<Lingua, Record<K, string>>;
export function useT<D extends { it: Record<string, string>; en: Record<string, string> } & Partial<Record<Lingua, Record<string, string>>>>(d: D): D["it"] {
  const { lang } = useLang();
  // se a una schermata manca una lingua si ripiega sull'inglese, poi sull'italiano
  return (d[lang] ?? d.en ?? d.it) as D["it"];
}
