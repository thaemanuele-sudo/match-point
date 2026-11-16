"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { urlContenuto } from "@/lib/contenuti";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { VideoAtletica } from "@/lib/types";
import { ETICHETTE_CAT, formatta, leggiDosaggio } from "./useVideoAtletica";
import s from "./atletica.module.css";

const T = {
  it: {
    kick: "Video esercizio", carico: "Carico il video…", errore: "Non riesco a caricare il video.", nonTrovato: "Questo video non esiste o non è più disponibile.", riprova: "Riprova", tutti: "Tutti i video",
    nessunFile: "Il file del video non è ancora disponibile.", livello: "Livello", dosaggio: "Dosaggio", fasce: "Per le fasce", tutteFasce: "Tutte le età",
    inizia: "Inizia", serie: "serie", di: "di", lavoro: "SERIE IN CORSO", recupero: "RECUPERO", pausa: "Pausa", riprendi: "Riprendi", fatta: "Serie fatta", salta: "Salta il recupero",
    ferma: "Interrompi", fine: "Sessione completata", fineSub: "Tempo totale", ripeti: "Ripeti", sessione: "Sessione", timer: "Tempo",
  },
  en: {
    kick: "Exercise video", carico: "Loading the video…", errore: "I can't load the video.", nonTrovato: "This video doesn't exist or is no longer available.", riprova: "Try again", tutti: "All videos",
    nessunFile: "The video file isn't available yet.", livello: "Level", dosaggio: "Dosage", fasce: "For age groups", tutteFasce: "All ages",
    inizia: "Start", serie: "set", di: "of", lavoro: "SET IN PROGRESS", recupero: "REST", pausa: "Pause", riprendi: "Resume", fatta: "Set done", salta: "Skip rest",
    ferma: "Stop", fine: "Session complete", fineSub: "Total time", ripeti: "Repeat", sessione: "Session", timer: "Time",
  },
};

type Carica = { stato: "caricamento" } | { stato: "errore" } | { stato: "nonTrovato" } | { stato: "ok"; v: VideoAtletica };

/** Pagina di un video di atletica: lettore, dettagli e un timer di sessione semplice per contare le serie. */
export function VideoEsercizio({ id }: { id: string }) {
  const t = useT(T);
  const { lang } = useLang();
  const [c, setC] = useState<Carica>({ stato: "caricamento" });

  const carica = useCallback(async () => {
    setC({ stato: "caricamento" });
    try {
      const { data, error } = await supabaseBrowser().from("fitness_videos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      setC(data ? { stato: "ok", v: data as VideoAtletica } : { stato: "nonTrovato" });
    } catch {
      setC({ stato: "errore" });
    }
  }, [id]);
  useEffect(() => { void carica(); }, [carica]);

  if (c.stato !== "ok") {
    return (
      <Schermo tab="atletica">
        <div className={s.r}>
          <Testata kick={t.kick} titolo={c.stato === "caricamento" ? "…" : "—"} indietro={ROTTE.Atletica} />
          {c.stato === "caricamento" && <div className={s.skel} role="status" aria-label={t.carico} />}
          {c.stato === "errore" && <div className={s.vuoto} role="alert">{t.errore}<br /><button type="button" className={s.riprova} onClick={() => void carica()}>{t.riprova}</button></div>}
          {c.stato === "nonTrovato" && <div className={s.vuoto}>{t.nonTrovato}<br /><Link href={ROTTE.Atletica} className={s.vlink}>{t.tutti}</Link></div>}
        </div>
      </Schermo>
    );
  }

  const v = c.v;
  const file = urlContenuto(v.video_path);
  const cop = urlContenuto(v.copertina_path);
  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.largo}`}>
        <Testata kick={`${ETICHETTE_CAT[lang][v.categoria]} · ${t.livello} ${v.livello}`} titolo={v.titolo} indietro={ROTTE.Atletica} />
        {file ? (
          // key: cambiando video il lettore riparte da zero
          <video key={file} className={s.player} src={file} poster={cop ?? undefined} controls playsInline preload="metadata" />
        ) : (
          <div className={`${s.playerVuoto} ${s.lab}`}>{t.nessunFile}</div>
        )}
        <div className={s.metaRiga}>
          <span className={`${s.pill} ${s.acc}`}>{ETICHETTE_CAT[lang][v.categoria]}</span>
          <span className={s.pill}>{t.livello} {v.livello}/5</span>
          {v.durata_sec ? <span className={s.pill}>{formatta(v.durata_sec)}</span> : null}
        </div>
        {v.dosaggio && (
          <div className={s.dosaggio}>
            <span className={s.k}>{t.dosaggio.toUpperCase()}</span>
            <b>{v.dosaggio}</b>
          </div>
        )}
        {v.descrizione && <p className={s.descr}>{v.descrizione}</p>}
        <div>
          <div className={s.k} style={{ marginBottom: 6 }}>{t.fasce.toUpperCase()}</div>
          <div className={s.metaRiga}>
            {v.fasce.length ? v.fasce.map((f) => <span key={f} className={s.pill}>{f === "ADULTI" ? "PRO" : f}</span>) : <span className={s.pill}>{t.tutteFasce}</span>}
          </div>
        </div>
        <TimerSerie dosaggio={v.dosaggio} />
      </div>
    </Schermo>
  );
}

/** Timer di sessione semplice: conta le serie, con recupero a conto alla rovescia se il dosaggio lo indica. */
function TimerSerie({ dosaggio }: { dosaggio: string }) {
  const t = useT(T);
  const { serie: N, recupero } = leggiDosaggio(dosaggio);
  const [fase, setFase] = useState<"fermo" | "lavoro" | "recupero" | "fine">("fermo");
  const [serie, setSerie] = useState(1);
  const [sec, setSec] = useState(0); // secondi della serie in corso
  const [rec, setRec] = useState(0); // secondi di recupero rimasti
  const [totale, setTotale] = useState(0);
  const [pausa, setPausa] = useState(false);

  const prossima = useCallback(() => { setSerie((x) => x + 1); setSec(0); setFase("lavoro"); }, []);

  useEffect(() => {
    if (pausa || (fase !== "lavoro" && fase !== "recupero")) return;
    const id = setTimeout(() => {
      setTotale((x) => x + 1);
      if (fase === "lavoro") setSec((x) => x + 1);
      else if (rec <= 1) prossima();
      else setRec((x) => x - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [fase, pausa, sec, rec, prossima]);

  const parti = () => { setSerie(1); setSec(0); setTotale(0); setPausa(false); setFase("lavoro"); };
  const fatta = () => {
    if (serie >= N) return setFase("fine");
    if (recupero > 0) { setRec(recupero); setFase("recupero"); } else prossima();
  };

  if (fase === "fermo") {
    return (
      <button type="button" className={s.btn} onClick={parti}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{t.inizia}
      </button>
    );
  }
  if (fase === "fine") {
    return (
      <div className={s.fine}>
        <h2 className={s.disp}>{t.fine}</h2>
        <div className={s.muted}>{t.fineSub}: <b style={{ color: "#F3F6F1" }}>{formatta(totale)}</b> · {N} {t.serie}</div>
        <div className={s.righe} style={{ alignSelf: "stretch" }}>
          <button type="button" className={s.btn2} onClick={() => setFase("fermo")}>{t.ripeti}</button>
        </div>
      </div>
    );
  }
  const inRecupero = fase === "recupero";
  const mostra = inRecupero ? rec : sec;
  // L'anello mostra quante serie sono già fatte (durante il recupero conta anche quella appena chiusa).
  const fatte = inRecupero ? serie : serie - 1;
  return (
    <div className={s.fine} aria-label={t.sessione}>
      <div className={s.fase}>{inRecupero ? t.recupero : t.lavoro}</div>
      <svg width="170" height="170" viewBox="0 0 170 170" role="timer" aria-label={`${t.timer}: ${formatta(mostra)}`}>
        <circle cx="85" cy="85" r="74" stroke="#232326" strokeWidth="12" fill="none" />
        <circle cx="85" cy="85" r="74" stroke={inRecupero ? "#3D8BFF" : "#D8F34A"} strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={465} strokeDashoffset={465 * (1 - fatte / N)} transform="rotate(-90 85 85)" />
        <text x="85" y="92" textAnchor="middle" fontFamily="var(--font-barlow), Barlow Condensed" fontWeight="800" fontSize="46" fill="#F3F6F1">{formatta(mostra)}</text>
        <text x="85" y="116" textAnchor="middle" fontSize="12" fontWeight="700" fill="#A1A1A6" fontFamily="system-ui">{t.serie} {serie} {t.di} {N}</text>
      </svg>
      <div className={s.righe} style={{ alignSelf: "stretch" }}>
        <button type="button" className={s.btn2} onClick={() => setPausa((p) => !p)}>{pausa ? t.riprendi : t.pausa}</button>
        {inRecupero
          ? <button type="button" className={s.btn} style={{ flex: 1 }} onClick={prossima}>{t.salta}</button>
          : <button type="button" className={s.btn} style={{ flex: 1 }} onClick={fatta}>{t.fatta}</button>}
      </div>
      <button type="button" className={s.riprova} onClick={() => setFase("fermo")}>{t.ferma}</button>
    </div>
  );
}
