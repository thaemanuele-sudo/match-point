"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/lingua";

/**
 * "Spiegazione a voce": legge un testo con la voce dell'app (POST /api/ai/voce, OpenAI TTS lato server).
 * Se il servizio non risponde (chiave mancante, budget finito, offline) ripiega sulla voce del dispositivo,
 * così il pulsante funziona sempre. Un secondo tocco ferma la lettura.
 */
export function useVoce() {
  const { lang } = useLang();
  const [inLettura, setInLettura] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const ferma = useCallback(() => {
    abort.current?.abort();
    audio.current?.pause();
    audio.current = null;
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
    try { window.speechSynthesis?.cancel(); } catch { /* sintesi non disponibile */ }
    setInLettura(false);
  }, []);

  useEffect(() => ferma, [ferma]);

  const leggi = useCallback(async (testo: string) => {
    if (inLettura) { ferma(); return; }
    setInLettura(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const r = await fetch("/api/ai/voce", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ testo: testo.slice(0, 1500), lingua: lang }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const u = URL.createObjectURL(blob);
      url.current = u;
      const a = new Audio(u);
      audio.current = a;
      a.onended = () => ferma();
      await a.play();
    } catch (e) {
      if (ctrl.signal.aborted) return;
      // ripiego: voce del dispositivo
      try {
        const sy = window.speechSynthesis;
        if (!sy) { setInLettura(false); return; }
        const m = new SpeechSynthesisUtterance(testo);
        m.lang = lang === "en" ? "en-US" : "it-IT";
        m.onend = () => setInLettura(false);
        m.onerror = () => setInLettura(false);
        sy.speak(m);
      } catch { setInLettura(false); }
    }
  }, [inLettura, lang, ferma]);

  return { inLettura, leggi, ferma };
}
