"use client";
import { LINGUE, useLang, type Lingua } from "@/lib/i18n/lingua";

const ETICHETTA: Record<Lingua, string> = { it: "Lingua", en: "Language", fr: "Langue", de: "Sprache", es: "Idioma" };

/** Chip della lingua nelle intestazioni: un menu nativo con le cinque lingue (accessibile anche da tastiera e VoiceOver). */
export function LinguaChip() {
  const { lang, setLang } = useLang();
  return (
    <label className="chip" style={{ position: "relative" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
      {lang.toUpperCase()}
      <select
        aria-label={ETICHETTA[lang]}
        value={lang}
        onChange={(e) => setLang(e.target.value as Lingua)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
      >
        {LINGUE.map((l) => <option key={l.codice} value={l.codice}>{l.nome}</option>)}
      </select>
    </label>
  );
}
