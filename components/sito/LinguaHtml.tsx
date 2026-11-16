"use client";
// Il layout radice ha lang="it": nella pagina inglese aggiorniamo l'attributo (il contenitore .sito ha già lang corretto nell'HTML).
import { useEffect } from "react";

export function LinguaHtml({ lang }: { lang: string }) {
  useEffect(() => {
    const prima = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prima;
    };
  }, [lang]);
  return null;
}
