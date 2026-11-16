"use client";
import { useEffect, useRef, useState } from "react";
import { caricaVideo, MAX_VIDEO_MB, urlVideo } from "./media";
import type { Sb } from "./dati";
import { Ico } from "./ico";
import "./metodo.css";

/** Lettore del video salvato nello storage `centri` (link firmato a tempo). */
export function VideoEsercizio({ sb, path, errore }: { sb: Sb; path: string; errore: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [ko, setKo] = useState(false);
  useEffect(() => {
    let vivo = true;
    urlVideo(sb, path).then((u) => {
      if (!vivo) return;
      if (u) setUrl(u);
      else setKo(true);
    });
    return () => {
      vivo = false;
    };
  }, [sb, path]);
  if (ko) return <div className="mm-err">{errore}</div>;
  if (!url) return <div className="mm-load">…</div>;
  return <video className="mm-vid" src={url} controls playsInline preload="metadata" />;
}

/** Scelta del file video: lo carica subito nello storage e restituisce il percorso. */
export function CampoVideo({
  sb, centroId, cartella, path, onPath, testi,
}: {
  sb: Sb; centroId: string; cartella: string; path: string | null; onPath: (p: string | null) => void;
  testi: { allega: string; cambia: string; rimuovi: string; caricamento: string; troppo: string; errore: string; allegato: string };
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function scelto(f: File | undefined) {
    if (!f) return;
    setErr("");
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      setErr(testi.troppo);
      return;
    }
    setBusy(true);
    try {
      onPath(await caricaVideo(sb, centroId, cartella, f));
    } catch {
      setErr(testi.errore);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="mm-row" style={{ flexWrap: "wrap" }}>
        <input ref={ref} type="file" accept="video/*" hidden onChange={(e) => scelto(e.target.files?.[0])} />
        <button type="button" className="mm-btn2 sm" disabled={busy} onClick={() => ref.current?.click()}>
          <Ico n="video" s={14} />
          {busy ? testi.caricamento : path ? testi.cambia : testi.allega}
        </button>
        {path && !busy ? (
          <>
            <span className="mm-tag ok">{testi.allegato}</span>
            <button type="button" className="mm-btn2 sm" onClick={() => onPath(null)}>
              {testi.rimuovi}
            </button>
          </>
        ) : null}
      </div>
      {err ? <div className="mm-err">{err}</div> : null}
    </div>
  );
}
