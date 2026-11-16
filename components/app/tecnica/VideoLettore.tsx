"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { urlContenuto } from "@/lib/contenuti";
import { useT, useLang } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import type { VideoTecnica } from "@/lib/types";
import { COLORE_TIPO, NOME_COLPO, NOME_TIPO } from "./etichette";
import { useVideoTecnica } from "./useVideoTecnica";
import s from "./VideoLettore.module.css";

const T = {
  it: {
    indietro: "Indietro", tecnica: "Tecnica", caricamento: "Caricamento del video", nonTrovato: "Video non trovato",
    nonTrovatoTesto: "Il video non esiste più o non è ancora pubblicato.", errore: "Non riesco a leggere i video",
    erroreTesto: "Controlla la connessione e riprova.", riprova: "Riprova", libreria: "Libreria video",
    errore1: "Errore", correzione1: "Correzione", confronta: "Confronta", ferma: "Ferma il confronto",
    confrontaAiuto: "Fa partire insieme l'errore e la correzione", descrizione: "DESCRIZIONE", fasce: "FASCE D'ETÀ",
    nonDisp: "Video non ancora disponibile",
  },
  en: {
    indietro: "Back", tecnica: "Technique", caricamento: "Loading video", nonTrovato: "Video not found",
    nonTrovatoTesto: "This video no longer exists or is not published yet.", errore: "I can't read the videos",
    erroreTesto: "Check your connection and try again.", riprova: "Try again", libreria: "Video library",
    errore1: "Error", correzione1: "Correction", confronta: "Compare", ferma: "Stop comparing",
    confrontaAiuto: "Plays the error and the correction together", descrizione: "DESCRIPTION", fasce: "AGE GROUPS",
    nonDisp: "Video not available yet",
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un lettore con il segno ✕ / ✓ come nel confronto del disegno ErroreDettaglio. */
function Pannello({ v, rif, etichetta, onFine }: { v: VideoTecnica; rif?: React.Ref<HTMLVideoElement>; etichetta: string; onFine?: () => void }) {
  const t = useT(T);
  const url = urlContenuto(v.video_path);
  const poster = urlContenuto(v.copertina_path) ?? undefined;
  const colore = COLORE_TIPO[v.tipo];
  return (
    <div className={s.pannello}>
      <div className={s.schermo} style={{ ["--c" as string]: colore }}>
        {url ? (
          <video ref={rif} controls playsInline preload="metadata" poster={poster} src={url} onEnded={onFine} aria-label={`${v.codice} · ${v.titolo}`} />
        ) : (
          <div className={s.mancante}>{t.nonDisp}</div>
        )}
        <span className={s.segno} aria-hidden="true">{v.tipo === "errore" ? "✕" : "✓"}</span>
      </div>
      <span className={s.didascalia}>{etichetta}</span>
    </div>
  );
}

/** Lettore dei video di tecnica: l'errore e, se collegata, la sua correzione, con "Confronta". */
export function VideoLettore() {
  const t = useT(T);
  const { lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const { tutti, stato, riprova } = useVideoTecnica();

  const principale = useMemo(() => (UUID.test(id ?? "") ? tutti.find((v) => v.id === id) : undefined), [tutti, id]);
  // il gemello può essere indicato da una parte o dall'altra (collegato_a)
  const gemello = useMemo(() => {
    if (!principale) return undefined;
    return tutti.find((v) => v.id === principale.collegato_a) ?? tutti.find((v) => v.collegato_a === principale.id);
  }, [tutti, principale]);

  // in alto sempre l'errore, sotto la correzione
  const [errore, correzione] = useMemo(() => {
    if (!principale) return [undefined, undefined] as const;
    if (!gemello) return principale.tipo === "errore" ? ([principale, undefined] as const) : ([undefined, principale] as const);
    return principale.tipo === "errore" ? ([principale, gemello] as const) : ([gemello, principale] as const);
  }, [principale, gemello]);

  const refE = useRef<HTMLVideoElement>(null);
  const refC = useRef<HTMLVideoElement>(null);
  const [inConfronto, setInConfronto] = useState(false);
  useEffect(() => setInConfronto(false), [id]);

  const confronta = () => {
    const vs = [refE.current, refC.current].filter(Boolean) as HTMLVideoElement[];
    if (inConfronto) {
      vs.forEach((v) => v.pause());
      setInConfronto(false);
      return;
    }
    // partono dallo stesso istante, così i due gesti si leggono in parallelo
    vs.forEach((v) => {
      v.currentTime = 0;
      void v.play().catch(() => {});
    });
    setInConfronto(vs.length > 0);
  };
  const fineUno = () => {
    const vs = [refE.current, refC.current].filter(Boolean) as HTMLVideoElement[];
    if (vs.every((v) => v.ended || v.paused)) setInConfronto(false);
  };

  const mostra = principale;
  const titoloKick = mostra ? `${NOME_COLPO[lang][mostra.colpo]} · ${NOME_TIPO[lang][mostra.tipo].toLowerCase()}` : t.tecnica;

  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <header className={s.hdr}>
          <Link href={ROTTE.LibreriaVideo} className={s.icon} aria-label={t.indietro}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </Link>
          <div className={s.grow}>
            <div className={s.kick}>{titoloKick}</div>
            <h1 className={s.h1}>{mostra ? mostra.titolo : stato === "carica" ? t.caricamento : t.nonTrovato}</h1>
          </div>
          {mostra && <span className={s.code}>{mostra.codice}</span>}
        </header>

        {stato === "carica" && (
          <div role="status" aria-label={t.caricamento} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className={s.scheletro} style={{ aspectRatio: "16/10" }} />
            <div className={s.scheletro} style={{ height: 70 }} />
          </div>
        )}

        {stato === "errore" && (
          <div className={s.vuoto} role="alert">
            <b>{t.errore}</b>
            {t.erroreTesto}
            <button type="button" className={s.btn} style={{ padding: "0 26px" }} onClick={riprova}>{t.riprova}</button>
          </div>
        )}

        {stato === "pronto" && !mostra && (
          <div className={s.vuoto}>
            <b>{t.nonTrovato}</b>
            {t.nonTrovatoTesto}
            <Link href={ROTTE.LibreriaVideo} className={s.btn2} style={{ padding: "0 24px" }}>{t.libreria}</Link>
          </div>
        )}

        {stato === "pronto" && mostra && (
          <>
            {errore && <Pannello v={errore} rif={refE} etichetta={`${t.errore1} · ${errore.codice}`} onFine={fineUno} />}
            {correzione && <Pannello v={correzione} rif={refC} etichetta={`${t.correzione1} · ${correzione.codice}`} onFine={fineUno} />}

            {errore && correzione && (
              <button type="button" className={s.btn} onClick={confronta} aria-pressed={inConfronto} title={t.confrontaAiuto}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {inConfronto ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
                </svg>
                {inConfronto ? t.ferma : t.confronta}
              </button>
            )}

            {mostra.descrizione && (
              <div>
                <div className={s.k}>{t.descrizione}</div>
                <div className={s.v}>{mostra.descrizione}</div>
              </div>
            )}
            {mostra.fasce?.length > 0 && (
              <div>
                <div className={s.k}>{t.fasce}</div>
                <div className={s.chips}>
                  {mostra.fasce.map((f) => <span key={f} className={s.chip}>{f}</span>)}
                </div>
              </div>
            )}
            <Link href={ROTTE.LibreriaVideo} className={s.btn2}>{t.libreria}</Link>
          </>
        )}
      </div>
    </Schermo>
  );
}
