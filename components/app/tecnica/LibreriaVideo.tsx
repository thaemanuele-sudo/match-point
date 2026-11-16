"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { urlContenuto } from "@/lib/contenuti";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { COLPI, type Colpo, type VideoTecnica } from "@/lib/types";
import { COLORE_TIPO, LETTERA_TIPO, NOME_COLPO, hrefVideo } from "./etichette";
import { useVideoTecnica } from "./useVideoTecnica";
import s from "./LibreriaVideo.module.css";

const T = {
  it: {
    back: "Indietro", struttura: "Struttura A/B/C", n_video: "video", video_library: "Libreria video",
    tutti: "Tutti", a_errore: "A · Errore", b_corretto: "B · Corretto", c_esercizio: "C · Esercizio", tutti_colpi: "Tutti i colpi",
    filtro_tipo: "Tipo di video", filtro_colpo: "Colpo", upload_your_own_correction: "Carica un tuo video di correzione",
    caricamento: "Caricamento dei video", vuoto_filtro: "Nessun video con questi filtri.", azzera: "Mostra tutti",
    erroreTitolo: "Non riesco a leggere la libreria", erroreTesto: "Controlla la connessione e riprova.", riprova: "Riprova",
    contact_in_front_of_the_hi: "Impatto davanti all'anca", unstable_toss: "Lancio instabile", correct_racket_drop: "Racket drop corretto",
    lefty_forehand: "Diritto mancino", back_to_the_backdrop: "Schiena al telone", guide_arm: "Braccio guida",
  },
  en: {
    back: "Back", struttura: "A/B/C structure", n_video: "videos", video_library: "Video library",
    tutti: "All", a_errore: "A · Error", b_corretto: "B · Correct", c_esercizio: "C · Drill", tutti_colpi: "All strokes",
    filtro_tipo: "Video type", filtro_colpo: "Stroke", upload_your_own_correction: "Upload your own correction video",
    caricamento: "Loading videos", vuoto_filtro: "No videos match these filters.", azzera: "Show all",
    erroreTitolo: "I can't read the library", erroreTesto: "Check your connection and try again.", riprova: "Try again",
    contact_in_front_of_the_hi: "Contact in front of the hip", unstable_toss: "Unstable toss", correct_racket_drop: "Correct racket drop",
    lefty_forehand: "Lefty forehand", back_to_the_backdrop: "Back to the backdrop", guide_arm: "Guide arm",
  },
};

type Lettera = "A" | "B" | "C";
const COLORE_LETTERA: Record<Lettera, string> = { A: "#FF5A5F", B: "#4CD07D", C: "#3D8BFF" };

// Schede dimostrative del disegno, mostrate solo se l'admin non ha ancora pubblicato video
const DEMO: { codice: string; lettera: Lettera; titolo: "contact_in_front_of_the_hi" | "unstable_toss" | "correct_racket_drop" | "lefty_forehand" | "back_to_the_backdrop" | "guide_arm" }[] = [
  { codice: "DR-02", lettera: "B", titolo: "contact_in_front_of_the_hi" },
  { codice: "SV-01", lettera: "A", titolo: "unstable_toss" },
  { codice: "SV-03", lettera: "B", titolo: "correct_racket_drop" },
  { codice: "RV-01", lettera: "C", titolo: "lefty_forehand" },
  { codice: "VO-01", lettera: "C", titolo: "back_to_the_backdrop" },
  { codice: "SM-02", lettera: "A", titolo: "guide_arm" },
];

/** Una scheda della griglia: copertina (o prato), tasto play, codice e lettera A/B/C. */
function Scheda({ href, codice, lettera, colore, titolo, copertina }: { href: string; codice: string; lettera: string; colore: string; titolo: string; copertina?: string | null }) {
  return (
    <Link href={href} className={s.scheda}>
      <div className={["lawn", s.thumb].join(" ")}>
        {copertina && /* eslint-disable-next-line @next/next/no-img-element */ <img src={copertina} alt="" loading="lazy" className={s.cop} />}
        <span className={s.play}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </span>
        <span className={s.code} style={{ position: "absolute", left: 8, top: 8 }}>{codice}</span>
        <span className={s.lettera} style={{ background: colore }}>{lettera}</span>
      </div>
      <span className={s.titolo}>{titolo}</span>
    </Link>
  );
}

export function LibreriaVideo() {
  const t = useT(T);
  const { lang } = useLang();
  const { tutti, stato, riprova } = useVideoTecnica();
  const [tipo, setTipo] = useState<"tutti" | VideoTecnica["tipo"]>("tutti");
  const [colpo, setColpo] = useState<"tutti" | Colpo>("tutti");
  const [lettera, setLettera] = useState<"tutti" | Lettera>("tutti"); // filtro del solo disegno dimostrativo

  const reali = stato === "pronto" && tutti.length > 0;
  // i chip dei colpi: solo quelli per cui c'è almeno un video
  const colpiPresenti = useMemo(() => COLPI.filter((c) => tutti.some((v) => v.colpo === c)), [tutti]);
  const visibili = useMemo(
    () => tutti.filter((v) => (tipo === "tutti" || v.tipo === tipo) && (colpo === "tutti" || v.colpo === colpo)),
    [tutti, tipo, colpo],
  );
  const demo = DEMO.filter((d) => lettera === "tutti" || d.lettera === lettera);
  const conteggio = reali ? tutti.length : 127;

  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr}>
          <header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.struttura} · {conteggio} {t.n_video}</div><h1 className={s.h1}>{t.video_library}</h1></div></header>
          {stato === "carica" && (
            <div role="status" aria-label={t.caricamento}>
              <div className={s.chips}>{[0, 1, 2, 3].map((i) => <span key={i} className={s.sk} style={{ width: 70, height: 32, borderRadius: 999 }} />)}</div>
              <div className={s.g2} style={{ gap: 12, marginTop: 14 }}>
                {[0, 1, 2, 3].map((i) => <span key={i} className={s.sk} style={{ height: 124, borderRadius: 16 }} />)}
              </div>
            </div>
          )}

          {stato === "errore" && (
            <div className={s.vuoto} role="alert">
              <b>{t.erroreTitolo}</b>
              {t.erroreTesto}
              <button type="button" className={s.chip} onClick={riprova}>{t.riprova}</button>
            </div>
          )}

          {stato === "pronto" && reali && (
            <>
              <div className={s.chips} role="group" aria-label={t.filtro_tipo}>
                {([["tutti", t.tutti], ["errore", t.a_errore], ["correzione", t.b_corretto]] as const).map(([k, l]) => (
                  <button key={k} type="button" className={k === tipo ? [s.chip, s.on].join(" ") : s.chip} aria-pressed={k === tipo} onClick={() => setTipo(k)}>{l}</button>
                ))}
              </div>
              <div className={s.chips} role="group" aria-label={t.filtro_colpo}>
                <button type="button" className={colpo === "tutti" ? [s.chip, s.on].join(" ") : s.chip} aria-pressed={colpo === "tutti"} onClick={() => setColpo("tutti")}>{t.tutti_colpi}</button>
                {colpiPresenti.map((c) => (
                  <button key={c} type="button" className={colpo === c ? [s.chip, s.on].join(" ") : s.chip} aria-pressed={colpo === c} onClick={() => setColpo(c)}>{NOME_COLPO[lang][c]}</button>
                ))}
              </div>
              {visibili.length === 0 ? (
                <div className={s.vuoto}>
                  {t.vuoto_filtro}
                  <button type="button" className={s.chip} onClick={() => { setTipo("tutti"); setColpo("tutti"); }}>{t.azzera}</button>
                </div>
              ) : (
                <div className={s.g2} style={{ gap: 12 }}>
                  {visibili.map((v) => (
                    <Scheda key={v.id} href={hrefVideo(v.id)} codice={v.codice} lettera={LETTERA_TIPO[v.tipo]} colore={COLORE_TIPO[v.tipo]} titolo={v.titolo} copertina={urlContenuto(v.copertina_path)} />
                  ))}
                </div>
              )}
            </>
          )}

          {stato === "pronto" && !reali && (
            <>
              <div className={s.chips} role="group" aria-label={t.filtro_tipo}>
                {([["tutti", t.tutti], ["A", t.a_errore], ["B", t.b_corretto], ["C", t.c_esercizio]] as const).map(([k, l]) => (
                  <button key={k} type="button" className={k === lettera ? [s.chip, s.on].join(" ") : s.chip} aria-pressed={k === lettera} onClick={() => setLettera(k)}>{l}</button>
                ))}
              </div>
              <div className={s.g2} style={{ gap: 12 }}>
                {demo.map((d) => (
                  <Scheda key={d.codice} href={ROTTE.TecnicaColpo} codice={d.codice} lettera={d.lettera} colore={COLORE_LETTERA[d.lettera]} titolo={t[d.titolo]} />
                ))}
              </div>
            </>
          )}

          <Link href={ROTTE.Carica} className={s.btn2} style={{ flex: "none" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"></rect><path d="M16 10l5-3v10l-5-3z"></path></svg>{t.upload_your_own_correction}</Link>
        </div>
      </div>
    </Schermo>
  );
}
