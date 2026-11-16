"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { VideoErroriCorrezioni } from "./VideoErroriCorrezioni";
import s from "./Volee.module.css";
import { SVG } from "./Volee.svg";

const T = {
  "it": {
    "back": "Indietro",
    "technique_net_play": "Tecnica · gioco a rete",
    "volley": "Volée",
    "correct_model_b": "MODELLO CORRETTO · B",
    "split_step": "Split-step",
    "service_line": "linea di servizio",
    "preparation": "Preparazione",
    "short": "corta",
    "contact": "Impatto",
    "crossover_step": "passo incrociato",
    "finish": "Chiusura",
    "compact": "breve",
    "directions": "DIREZIONI",
    "straight": "DRITTO",
    "deep_first_volley": "Prima volée profonda",
    "crosscourt": "INCROCIATO",
    "winner_on_a_high_ball": "Vincente su palla alta",
    "down_the_line": "LUNGOLINEA",
    "approach_volley": "Volée di approccio",
    "cataloged_errors": "Errori catalogati",
    "video": "Video",
    "big_backswing": "Preparazione ampia",
    "forehand_grip": "Presa di diritto",
    "racket_head_dropping": "Testa della racchetta che cade",
    "no_split_step": "Assenza di split-step",
    "side_step_instead_of_forwa": "Passo laterale e non in avanti"
  },
  "en": {
    "back": "Back",
    "technique_net_play": "Technique · net play",
    "volley": "Volley",
    "correct_model_b": "CORRECT MODEL · B",
    "split_step": "Split step",
    "service_line": "service line",
    "preparation": "Preparation",
    "short": "short",
    "contact": "Contact",
    "crossover_step": "crossover step",
    "finish": "Finish",
    "compact": "compact",
    "directions": "DIRECTIONS",
    "straight": "STRAIGHT",
    "deep_first_volley": "Deep first volley",
    "crosscourt": "CROSSCOURT",
    "winner_on_a_high_ball": "Winner on a high ball",
    "down_the_line": "DOWN THE LINE",
    "approach_volley": "Approach volley",
    "cataloged_errors": "Cataloged errors",
    "video": "Video",
    "big_backswing": "Big backswing",
    "forehand_grip": "Forehand grip",
    "racket_head_dropping": "Racket head dropping",
    "no_split_step": "No split step",
    "side_step_instead_of_forwa": "Side step instead of forward"
  },
  "fr": {
    "back": "Retour",
    "technique_net_play": "Technique · jeu au filet",
    "volley": "Volée",
    "correct_model_b": "MODÈLE CORRECT · B",
    "split_step": "Split-step",
    "service_line": "ligne de service",
    "preparation": "Préparation",
    "short": "courte",
    "contact": "Impact",
    "crossover_step": "pas croisé",
    "finish": "Finition",
    "compact": "brève",
    "directions": "DIRECTIONS",
    "straight": "DROIT",
    "deep_first_volley": "Première volée profonde",
    "crosscourt": "CROISÉ",
    "winner_on_a_high_ball": "Gagnant sur balle haute",
    "down_the_line": "LE LONG DE LA LIGNE",
    "approach_volley": "Volée d'approche",
    "cataloged_errors": "Erreurs cataloguées",
    "video": "Vidéo",
    "big_backswing": "Préparation ample",
    "forehand_grip": "Prise de coup droit",
    "racket_head_dropping": "Tête de raquette qui tombe",
    "no_split_step": "Absence de split-step",
    "side_step_instead_of_forwa": "Pas latéral et non vers l'avant"
  },
  "de": {
    "back": "Zurück",
    "technique_net_play": "Technik · Netzspiel",
    "volley": "Volley",
    "correct_model_b": "KORREKTES MODELL · B",
    "split_step": "Split-Step",
    "service_line": "Aufschlaglinie",
    "preparation": "Vorbereitung",
    "short": "kurz",
    "contact": "Kontakt",
    "crossover_step": "Kreuzschritt",
    "finish": "Ausschwung",
    "compact": "kurz",
    "directions": "RICHTUNGEN",
    "straight": "GERADE",
    "deep_first_volley": "Tiefer erster Volley",
    "crosscourt": "CROSS",
    "winner_on_a_high_ball": "Gewinnschlag bei hohem Ball",
    "down_the_line": "LONGLINE",
    "approach_volley": "Approach-Volley",
    "cataloged_errors": "Katalogisierte Fehler",
    "video": "Video",
    "big_backswing": "Großer Ausholschwung",
    "forehand_grip": "Vorhand-Griff",
    "racket_head_dropping": "Schlägerkopf fällt herunter",
    "no_split_step": "Kein Split-Step",
    "side_step_instead_of_forwa": "Seitschritt statt Schritt nach vorn"
  },
  "es": {
    "back": "Atrás",
    "technique_net_play": "Técnica · juego en la red",
    "volley": "Volea",
    "correct_model_b": "MODELO CORRECTO · B",
    "split_step": "Split step",
    "service_line": "línea de saque",
    "preparation": "Preparación",
    "short": "corta",
    "contact": "Impacto",
    "crossover_step": "paso cruzado",
    "finish": "Terminación",
    "compact": "breve",
    "directions": "DIRECCIONES",
    "straight": "RECTO",
    "deep_first_volley": "Primera volea profunda",
    "crosscourt": "CRUZADO",
    "winner_on_a_high_ball": "Winner con bola alta",
    "down_the_line": "PARALELO",
    "approach_volley": "Volea de aproximación",
    "cataloged_errors": "Errores catalogados",
    "video": "Vídeo",
    "big_backswing": "Preparación amplia",
    "forehand_grip": "Empuñadura de derecha",
    "racket_head_dropping": "Cabeza de la raqueta que cae",
    "no_split_step": "Sin split step",
    "side_step_instead_of_forwa": "Paso lateral y no hacia delante"
  }
};

export function Volee() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "10px" }}><header className={s.hdr}><Link href={ROTTE.Tecnica} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.technique_net_play}</div><h1 className={s.h1}>{t.volley}</h1></div></header><div className={s.lab} style={{ position: "relative", height: "210px", borderRadius: "22px", overflow: "hidden", flex: "none" }}><svg width="357" height="210" viewBox="0 0 357 210" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /><span style={{ position: "absolute", left: "12px", top: "12px", fontSize: "11.5px", fontWeight: "800", color: "#4CD07D", background: "rgba(5,5,5,.78)", border: "1px solid rgba(255,255,255,.12)", padding: "4px 8px", borderRadius: "8px", letterSpacing: ".3px" }}>{t.correct_model_b}</span></div><div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "4px" }}><div style={{ position: "absolute", left: "10%", right: "10%", top: "12px", height: "2px", background: "#2C2C2E" }}></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>1</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.split_step}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.service_line}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>2</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.preparation}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.short}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>3</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.contact}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.crossover_step}</span></div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", textAlign: "center" }}><span className={s.num} style={{ width: "24px", height: "24px", fontSize: "12px" }}>4</span><span style={{ fontSize: "11.5px", fontWeight: "800", lineHeight: "1.15" }}>{t.finish}</span><span className={"muted"} style={{ fontSize: "10.5px", lineHeight: "1.2" }}>{t.compact}</span></div></div><div className={s.k}>{t.directions}</div><div className={s.g3}><div className={s.tile}><span>{t.straight}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.deep_first_volley}</div></div><div className={s.tile}><span>{t.crosscourt}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.winner_on_a_high_ball}</div></div><div className={s.tile}><span>{t.down_the_line}</span><div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px", lineHeight: "1.3" }}>{t.approach_volley}</div></div></div><div className={s.sec}><h2>{t.cataloged_errors}</h2><Link href={ROTTE.LibreriaVideo}>{t.video}</Link></div><div className={s.li}><span className={s.code}>VO-01</span><span className={s.grow}><span className={s.t}>{t.big_backswing}</span></span><span className={s.dot} style={{ background: "#FF5A5F" }}></span></div><div className={s.li}><span className={s.code}>VO-02</span><span className={s.grow}><span className={s.t}>{t.forehand_grip}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>VO-03</span><span className={s.grow}><span className={s.t}>{t.racket_head_dropping}</span></span><span className={s.dot} style={{ background: "#FFD54A" }}></span></div><div className={s.li}><span className={s.code}>VO-04</span><span className={s.grow}><span className={s.t}>{t.no_split_step}</span></span><span className={s.dot} style={{ background: "#FF9F43" }}></span></div><div className={s.li}><span className={s.code}>VO-05</span><span className={s.grow}><span className={s.t}>{t.side_step_instead_of_forwa}</span></span><span className={s.dot} style={{ background: "#4CD07D" }}></span></div><VideoErroriCorrezioni colpo="volee" /></div>
      </div>
    </Schermo>
  );
}
