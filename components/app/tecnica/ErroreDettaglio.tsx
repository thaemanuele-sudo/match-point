"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useSearchParams } from "next/navigation";
import { urlContenuto } from "@/lib/contenuti";
import { useLang, useT } from "@/lib/i18n/lingua";
import type { VideoTecnica } from "@/lib/types";
import { COLORE_TIPO, NOME_TIPO, hrefVideo } from "./etichette";
import { useVideoTecnica } from "./useVideoTecnica";
import { ROTTE } from "@/lib/rotte";
import s from "./ErroreDettaglio.module.css";
import { SVG } from "./ErroreDettaglio.svg";

const T = {
  "it": {
    "back": "Indietro",
    "serve_label": "Servizio",
    "serve_error": "Servizio · errore",
    "low_elbow": "Gomito basso",
    "low_elbow_stiff_legs": "Gomito basso, gambe rigide",
    "elbow_at_shoulder_height": "Gomito all'altezza spalle",
    "explanation_and_reasons": "SPIEGAZIONE E MOTIVAZIONI",
    "the_arm_stays_below_the_sh": "Il braccio resta sotto la linea delle spalle, come un lancio di freccette: manca la caduta della racchetta dietro la schiena.",
    "effect_on_ball_and_opponen": "EFFETTO SU PALLA E AVVERSARIO",
    "less_speed_low_contact_and": "Meno velocità, impatto basso e palla in rete. Più stress su spalla e gomito.",
    "why_fix_it": "PERCHÉ CORREGGERLO",
    "the_kinetic_chain_doesn_t_": "La catena cinetica non trasferisce energia e il rischio di sovraccarico cresce con il gioco.",
    "sv_03_video": "Video SV-03",
    "drills": "Esercizi",
    "descrizione": "DESCRIZIONE",
    "fasce": "FASCE D'ETÀ",
    "video_btn": "Video",
    "gemello_assente": "Correzione non ancora disponibile",
    "senza_video": "Video non ancora disponibile",
    "caricamento": "Caricamento"
  },
  "en": {
    "back": "Back",
    "serve_label": "Serve",
    "serve_error": "Serve · error",
    "low_elbow": "Low elbow",
    "low_elbow_stiff_legs": "Low elbow, stiff legs",
    "elbow_at_shoulder_height": "Elbow at shoulder height",
    "explanation_and_reasons": "EXPLANATION AND REASONS",
    "the_arm_stays_below_the_sh": "The arm stays below the shoulder line, like throwing a dart: the racket doesn't drop behind the back.",
    "effect_on_ball_and_opponen": "EFFECT ON BALL AND OPPONENT",
    "less_speed_low_contact_and": "Less speed, low contact and ball into the net. More stress on shoulder and elbow.",
    "why_fix_it": "WHY FIX IT",
    "the_kinetic_chain_doesn_t_": "The kinetic chain doesn't transfer energy and overload risk grows with play.",
    "sv_03_video": "SV-03 video",
    "drills": "Drills",
    "descrizione": "DESCRIPTION",
    "fasce": "AGE GROUPS",
    "video_btn": "Video",
    "gemello_assente": "Correction not available yet",
    "senza_video": "Video not available yet",
    "caricamento": "Loading"
  }
};

/** Un riquadro del confronto con la copertina vera (o il prato) e il segno ✕ / ✓. */
function Riquadro({ v, vuoto }: { v?: VideoTecnica; vuoto: string }) {
  const t = useT(T);
  const colore = v ? COLORE_TIPO[v.tipo] : "#2C2C2E";
  const cop = urlContenuto(v?.copertina_path);
  const inner = (
    <>
      <div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "20px", overflow: "hidden", border: `1.5px solid ${colore}` }}>
        {cop && /* eslint-disable-next-line @next/next/no-img-element */ <img src={cop} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        {v ? (
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        ) : (
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 12, fontSize: 13, fontWeight: 600, color: "#A1A1A6" }}>{vuoto}</span>
        )}
        {v && <span style={{ position: "absolute", left: "10px", top: "8px", fontWeight: "900", color: colore, fontSize: "20px", textShadow: "0 1px 6px rgba(0,0,0,.7)" }} aria-hidden="true">{v.tipo === "errore" ? "✕" : "✓"}</span>}
      </div>
      <span style={{ fontSize: "12px", fontWeight: "700", textAlign: "center" }}>{v ? v.titolo : t.gemello_assente}</span>
    </>
  );
  const stile = { display: "flex", flexDirection: "column", gap: "6px", color: "#F3F6F1", textDecoration: "none" } as const;
  return v ? <Link href={hrefVideo(v.id)} style={stile} aria-label={`${v.codice} · ${v.titolo}`}>{inner}</Link> : <div style={stile}>{inner}</div>;
}

/** Dettaglio di un errore del servizio preso dai video veri dell'admin (errore + correzione gemella). */
function ErroreReale({ principale, tutti }: { principale: VideoTecnica; tutti: VideoTecnica[] }) {
  const t = useT(T);
  const { lang } = useLang();
  const gemello = tutti.find((v) => v.id === principale.collegato_a) ?? tutti.find((v) => v.collegato_a === principale.id);
  const errore = principale.tipo === "errore" ? principale : gemello;
  const correzione = principale.tipo === "correzione" ? principale : gemello;
  return (
    <div className={s.scr} style={{ gap: "12px" }}>
      <header className={s.hdr}>
        <Link href={ROTTE.ErroriServizio} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link>
        <div className={s.grow}><div className={s.kick}>{`${t.serve_label} · ${NOME_TIPO[lang][principale.tipo].toLowerCase()}`}</div><h1 className={s.h1}>{principale.titolo}</h1></div>
        <span className={s.code}>{principale.codice}</span>
      </header>
      <div className={s.g2}>
        <Riquadro v={errore} vuoto={t.senza_video} />
        <Riquadro v={correzione} vuoto={t.gemello_assente} />
      </div>
      {principale.descrizione && <div><div className={s.k}>{t.descrizione}</div><div className={s.v}>{principale.descrizione}</div></div>}
      {principale.fasce?.length > 0 && <div><div className={s.k}>{t.fasce}</div><div className={s.v}>{principale.fasce.join(" · ")}</div></div>}
      <div className={s.g2}>
        <Link href={hrefVideo(principale.id)} className={s.btn2}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>{`${t.video_btn} ${principale.codice}`}</Link>
        <Link href={ROTTE.EserciziMaestro} className={s.btn2}>{t.drills}</Link>
      </div>
    </div>
  );
}

export function ErroreDettaglio() {
  const t = useT(T);
  const { video, tutti, stato } = useVideoTecnica("servizio");
  const id = useSearchParams().get("id");
  // errore scelto dall'indirizzo (?id=) oppure il primo errore del servizio
  const principale = video.find((v) => v.id === id) ?? video.find((v) => v.tipo === "errore") ?? video[0];
  if (stato === "carica")
    return (
      <Schermo tab="tecnica">
        <div className={s.r} role="status" aria-label={t.caricamento} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className={s.sk} style={{ height: 44, borderRadius: 14 }} />
          <span className={s.sk} style={{ height: 230, borderRadius: 20 }} />
          <span className={s.sk} style={{ height: 90, borderRadius: 14 }} />
        </div>
      </Schermo>
    );
  if (stato === "pronto" && principale)
    return (
      <Schermo tab="tecnica">
        <div className={s.r}><ErroreReale principale={principale} tutti={tutti} /></div>
      </Schermo>
    );
  return <ErroreDemo />;
}

function ErroreDemo() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "12px" }}><header className={s.hdr}><Link href={ROTTE.ErroriServizio} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.serve_error}</div><h1 className={s.h1}>{t.low_elbow}</h1></div><span className={s.code}>SV-03</span></header><div className={s.g2}><div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "20px", overflow: "hidden", border: "1.5px solid #FF5A5F" }}><svg width="170" height="210" viewBox="0 0 170 210" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><span style={{ position: "absolute", left: "10px", top: "8px", fontWeight: "900", color: "#FF5A5F", fontSize: "20px" }}>✕</span></div><span style={{ fontSize: "12px", fontWeight: "700", textAlign: "center" }}>{t.low_elbow_stiff_legs}</span></div><div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "20px", overflow: "hidden", border: "1.5px solid #4CD07D" }}><svg width="170" height="210" viewBox="0 0 170 210" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[1] }} /><span style={{ position: "absolute", left: "10px", top: "8px", fontWeight: "900", color: "#4CD07D", fontSize: "20px" }}>✓</span></div><span style={{ fontSize: "12px", fontWeight: "700", textAlign: "center" }}>{t.elbow_at_shoulder_height}</span></div></div><div><div className={s.k}>{t.explanation_and_reasons}</div><div className={s.v}>{t.the_arm_stays_below_the_sh}</div></div><div><div className={s.k}>{t.effect_on_ball_and_opponen}</div><div className={s.v}>{t.less_speed_low_contact_and}</div></div><div><div className={s.k}>{t.why_fix_it}</div><div className={s.v}>{t.the_kinetic_chain_doesn_t_}</div></div><div className={s.g2}><Link href={ROTTE.TecnicaColpo} className={s.btn2}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>{t.sv_03_video}</Link><Link href={ROTTE.EserciziMaestro} className={s.btn2}>{t.drills}</Link></div></div>
      </div>
    </Schermo>
  );
}
