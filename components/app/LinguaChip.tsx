"use client";
import { useLang } from "@/lib/i18n/lingua";

/** Chip IT/EN dell'intestazione: un tocco cambia lingua. */
export function LinguaChip() {
  const { lang, setLang } = useLang();
  const altra = lang === "it" ? "en" : "it";
  return (
    <button type="button" className="chip" onClick={() => setLang(altra)} aria-label={lang === "it" ? "Lingua: italiano. Passa all'inglese" : "Language: English. Switch to Italian"}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
      {lang.toUpperCase()}
    </button>
  );
}
