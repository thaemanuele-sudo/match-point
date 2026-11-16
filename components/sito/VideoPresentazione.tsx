"use client";
// Video di presentazione in una cornice arrotondata, con un grande pulsante play sopra il poster.
// Il video ha comunque i comandi nativi; il pulsante serve a far capire subito che si può guardare.
import { useRef, useState } from "react";

export function VideoPresentazione({
  src,
  poster,
  titolo,
  durata,
  play,
  etichetta,
}: {
  src: string;
  poster: string;
  titolo: string;
  durata: string;
  play: string;
  etichetta: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [inCorso, setInCorso] = useState(false);

  function avvia() {
    // play() è una promessa: può essere rifiutata (es. risparmio dati), in quel caso restano i comandi nativi
    void ref.current?.play().catch(() => setInCorso(true));
  }

  return (
    <div className={`s-video${inCorso ? " s-in-corso" : ""}`} id="video">
      <video
        ref={ref}
        controls
        playsInline
        preload="none"
        poster={poster}
        aria-label={etichetta}
        onPlay={() => setInCorso(true)}
        onEnded={() => setInCorso(false)}
      >
        <source src={src} type="video/mp4" />
      </video>
      {!inCorso && (
        <button type="button" className="s-play" onClick={avvia} aria-label={play}>
          <span className="s-play-pill" aria-hidden="true">
            <span className="s-play-cerchio">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M8 5.4v13.2a1 1 0 0 0 1.5.86l10.6-6.6a1 1 0 0 0 0-1.72L9.5 4.54A1 1 0 0 0 8 5.4Z" fill="currentColor" />
              </svg>
            </span>
            <span className="s-play-testo">
              <strong>{titolo}</strong>
              <span>{durata}</span>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
