"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import "./metodo.css";

/** Finestra dal basso (telefono) o centrata (dashboard). Si chiude con Esc o toccando fuori. */
export function Pannello({ aperto, titolo, onChiudi, children }: { aperto: boolean; titolo: string; onChiudi: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!aperto) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [aperto, onChiudi]);
  if (!aperto) return null;
  return (
    <div className="mm mm-ov" onMouseDown={(e) => e.target === e.currentTarget && onChiudi()}>
      <div className="mm-pn" role="dialog" aria-modal="true" aria-label={titolo}>
        <h3>{titolo}</h3>
        {children}
      </div>
    </div>
  );
}

/** Messaggio breve in basso ("Modello salvato"), senza cambiare pagina. */
export function useToast(): [ReactNode, (testo: string) => void] {
  const [testo, setTesto] = useState<string | null>(null);
  const tm = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostra = useCallback((t: string) => {
    setTesto(t);
    if (tm.current) clearTimeout(tm.current);
    tm.current = setTimeout(() => setTesto(null), 2600);
  }, []);
  useEffect(() => () => {
    if (tm.current) clearTimeout(tm.current);
  }, []);
  const nodo = testo ? (
    <div className="mm mm-toast" role="status" aria-live="polite">
      {testo}
    </div>
  ) : null;
  return [nodo, mostra];
}
