"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Schermo } from "../Schermo";
import { LinguaChip } from "../LinguaChip";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { useProfilo } from "@/lib/useProfilo";
import { urlContenuto } from "@/lib/contenuti";
import { CATEGORIE_ATLETICA, type CategoriaAtletica, type VideoAtletica } from "@/lib/types";
import { CHIP_ETA, ETICHETTE_CAT, chipDaFascia, fasciaDaChip, formatta, perFascia, preferisciFascia, useVideoAtletica, type ChipEta } from "./useVideoAtletica";
import { FIGURA_HERO } from "./figure";
import s from "./atletica.module.css";

const T = {
  it: {
    sotto: "Percorsi per età con video ed esercizi", titolo: "Atletica", fascia: "Fascia d'età",
    oggi: "Sessione di oggi · 35'", sess: "Spinta gambe e reattività", inizia: "Inizia", dettaglio: "6 esercizi · 3 serie",
    aree: "Aree di lavoro", coord: "Coordinazione oculo-manuale", gambe: "Movimento gambe", forza: "Forza", spinta: "Spinta gambe", rapidita: "Rapidità", equilibrio: "Equilibrio",
    video: "Video esercizi", filtri: "Categoria dei video", tutti: "Tutti", carico: "Carico i video…", vuoto: "Non ci sono ancora video di atletica.", vuotoCat: "Nessun video in questa categoria.",
    errore: "Non riesco a caricare i video.", riprova: "Riprova", livello: "Liv.", altra: "Altra fascia", guarda: "Guarda il video",
  },
  en: {
    sotto: "Age-based programs with videos and drills", titolo: "Fitness", fascia: "Age group",
    oggi: "Today's session · 35'", sess: "Leg drive and reactivity", inizia: "Start", dettaglio: "6 drills · 3 sets",
    aree: "Training areas", coord: "Hand-eye coordination", gambe: "Leg movement", forza: "Strength", spinta: "Leg drive", rapidita: "Speed", equilibrio: "Balance",
    video: "Exercise videos", filtri: "Video category", tutti: "All", carico: "Loading videos…", vuoto: "There are no fitness videos yet.", vuotoCat: "No videos in this category.",
    errore: "I can't load the videos.", riprova: "Try again", livello: "Lv.", altra: "Other age group", guarda: "Watch the video",
  },
};

const ico = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;

export function Atletica() {
  const t = useT(T);
  const { lang } = useLang();
  const { profilo } = useProfilo();
  const { video, stato, ricarica } = useVideoAtletica();
  const [eta, setEta] = useState<ChipEta>("U12");
  const [cat, setCat] = useState<CategoriaAtletica | "tutti">("tutti");
  const scelta = useRef(false); // se l'utente ha già toccato una chip, il profilo non la sovrascrive

  // Preferenza dal profilo: appena arriva la fascia, la chip d'età parte da lì.
  useEffect(() => {
    const c = chipDaFascia(profilo?.fascia);
    if (c && !scelta.current) setEta(c);
  }, [profilo?.fascia]);

  const fascia = fasciaDaChip(eta);
  const categorie = useMemo(() => CATEGORIE_ATLETICA.filter((c) => video.some((v) => v.categoria === c)), [video]);
  // Se la categoria scelta non esiste più (video tolti dall'admin) si torna a "Tutti".
  const catAttiva = cat === "tutti" || categorie.includes(cat) ? cat : "tutti";
  const lista = useMemo(
    () => preferisciFascia(video.filter((v) => catAttiva === "tutti" || v.categoria === catAttiva), fascia),
    [video, catAttiva, fascia],
  );

  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.largo}`}>
        <div className={s.titoloTop}>
          <div>
            <div className={`${s.muted}`} style={{ fontSize: 13, fontWeight: 600 }}>{t.sotto}</div>
            <h1 className={`${s.big}`}>{t.titolo}</h1>
          </div>
          <LinguaChip />
        </div>

        <div className={s.ages} role="group" aria-label={t.fascia}>
          {CHIP_ETA.map((l) => (
            <button key={l} type="button" className={l === eta ? `${s.age} ${s.on}` : s.age} aria-pressed={l === eta}
              onClick={() => { scelta.current = true; setEta(l); }}>{l}</button>
          ))}
        </div>

        <Link href={ROTTE.AnalisiAtletica} className={`${s.hero} ${s.lawn}`}>
          <span className={s.heroFig} aria-hidden="true" dangerouslySetInnerHTML={{ __html: FIGURA_HERO }} />
          <span className={s.heroTag}>{t.oggi}</span>
          <div style={{ position: "relative" }}>
            <div className={`${s.disp} ${s.heroTit}`}>{t.sess}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <span className={s.heroGo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{t.inizia}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t.dettaglio}</span>
            </div>
          </div>
        </Link>

        <h2 className={s.h2}>{t.aree}</h2>
        <div className={s.g3}>
          <Link href={ROTTE.Capacita} className={s.cat}><span className={s.ci}><svg {...ico}><circle cx="8" cy="12" r="3" /><path d="M11 12h4" /><circle cx="18" cy="12" r="3" fill="currentColor" /></svg></span><b>{t.coord}</b></Link>
          <Link href={ROTTE.Scaletta} className={s.cat}><span className={s.ci}><svg {...ico} strokeLinecap="round"><path d="M5 19l4-6 4 3 4-8M17 8h3v3" /></svg></span><b>{t.gambe}</b></Link>
          <Link href={ROTTE.SchedaEta} className={s.cat}><span className={s.ci}><svg {...ico} strokeLinecap="round"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></svg></span><b>{t.forza}</b></Link>
          <Link href={ROTTE.SpiderDrill} className={s.cat}><span className={s.ci}><svg {...ico} strokeLinecap="round"><path d="M12 20V6M6 12l6-6 6 6M5 20h14" /></svg></span><b>{t.spinta}</b></Link>
          <Link href={ROTTE.Microciclo} className={s.cat}><span className={s.ci}><svg {...ico} strokeLinejoin="round"><path d="M13 2L5 13h6l-1 9 8-11h-6z" /></svg></span><b>{t.rapidita}</b></Link>
          <Link href={ROTTE.Capacita} className={s.cat}><span className={s.ci}><svg {...ico} strokeLinecap="round"><path d="M4 16h16M12 16V5M8 9l4-4 4 4" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></svg></span><b>{t.equilibrio}</b></Link>
        </div>

        {/* Video veri caricati dal super admin */}
        <h2 className={s.h2}>{t.video}</h2>
        {categorie.length > 0 && (
          <div className={s.vchips} role="group" aria-label={t.filtri}>
            <button type="button" className={catAttiva === "tutti" ? `${s.vchip} ${s.on}` : s.vchip} aria-pressed={catAttiva === "tutti"} onClick={() => setCat("tutti")}>{t.tutti}</button>
            {categorie.map((c) => (
              <button key={c} type="button" className={catAttiva === c ? `${s.vchip} ${s.on}` : s.vchip} aria-pressed={catAttiva === c} onClick={() => setCat(c)}>{ETICHETTE_CAT[lang][c]}</button>
            ))}
          </div>
        )}
        {stato === "caricamento" && (
          <div className={s.vgrid} role="status" aria-label={t.carico}>
            <div className={s.skel} /><div className={s.skel} /><div className={s.skel} /><div className={s.skel} />
          </div>
        )}
        {stato === "errore" && (
          <div className={s.vuoto} role="alert">{t.errore}<br /><button type="button" className={s.riprova} onClick={() => void ricarica()}>{t.riprova}</button></div>
        )}
        {stato === "ok" && video.length === 0 && <div className={s.vuoto}>{t.vuoto}</div>}
        {stato === "ok" && video.length > 0 && lista.length === 0 && <div className={s.vuoto}>{t.vuotoCat}</div>}
        {stato === "ok" && lista.length > 0 && (
          <div className={s.vgrid}>
            {lista.map((v) => <CardVideo key={v.id} v={v} altra={!perFascia(v, fascia)} />)}
          </div>
        )}
      </div>
    </Schermo>
  );
}

/** Scheda di un video: copertina (o sfondo scuro con play), titolo, categoria e livello. */
function CardVideo({ v, altra }: { v: VideoAtletica; altra: boolean }) {
  const t = useT(T);
  const { lang } = useLang();
  const cop = urlContenuto(v.copertina_path);
  return (
    <Link href={`${ROTTE.Atletica}/video/${v.id}`} className={s.vcard} aria-label={`${t.guarda}: ${v.titolo}`}>
      <span className={s.vthumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cop && <img src={cop} alt="" loading="lazy" />}
        <span className={s.vplay} aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
        {v.durata_sec ? <span className={s.vdur}>{formatta(v.durata_sec)}</span> : null}
        {altra && <span className={s.vfascia}>{t.altra}</span>}
      </span>
      <span className={s.vbody}>
        <span className={s.vtit}>{v.titolo}</span>
        <span className={s.vmeta}>{ETICHETTE_CAT[lang][v.categoria]} · {t.livello} {v.livello}</span>
      </span>
    </Link>
  );
}
