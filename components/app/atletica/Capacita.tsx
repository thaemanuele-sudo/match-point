"use client";
import Link from "next/link";
import { useState } from "react";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import type { CategoriaAtletica } from "@/lib/types";
import { CHIP_ETA, fasciaDaChip, primoVideo, useVideoAtletica } from "./useVideoAtletica";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Priorità di sviluppo per età", titolo: "Le 8 capacità", fascia: "Fascia d'età", livello: "livello", guarda: "Guarda il video" },
  en: { kick: "Development priorities by age", titolo: "The 8 skills", fascia: "Age group", livello: "level", guarda: "Watch the video" },
};
// [nome, esercizi, priorità 0-10 per U10…PRO] (dimostrativo) e categorie dei video dell'admin che la illustrano.
const CAPS = {
  it: [["Coordinazione oculo-manuale", "Prese con palline colorate, giocoliere"], ["Footwork", "Scaletta, spider drill, passi tra coni"], ["Forza", "Corpo libero, elastici, palla medica"], ["Spinta gambe", "Salti, balzi laterali, squat jump"], ["Velocità e reattività", "Partenze, sprint 5-10 m"], ["Agilità", "Corsa a T, a stella, hexagon"], ["Equilibrio", "Monopodalico, affondi, colpi su una gamba"], ["Mobilità e prevenzione", "Riscaldamento dinamico, cuffia rotatori"]],
  en: [["Hand-eye coordination", "Catches with colored balls, juggling"], ["Footwork", "Ladder, spider drill, steps between cones"], ["Strength", "Bodyweight, bands, medicine ball"], ["Leg drive", "Jumps, lateral bounds, squat jumps"], ["Speed and reactivity", "Starts, 5-10 m sprints"], ["Agility", "T-drill, star drill, hexagon"], ["Balance", "Single-leg, lunges, one-leg strokes"], ["Mobility and prevention", "Dynamic warm-up, rotator cuff"]],
};
const PRIORITA = [[9, 8, 7, 6, 5, 5], [8, 9, 8, 7, 7, 7], [3, 4, 6, 8, 9, 9], [4, 5, 7, 8, 9, 9], [8, 8, 8, 8, 8, 9], [7, 8, 8, 8, 8, 8], [7, 7, 7, 6, 6, 6], [6, 6, 8, 8, 9, 9]];
const CATEGORIE: CategoriaAtletica[][] = [["coordinazione"], ["agilita", "coordinazione"], ["forza"], ["forza", "velocita"], ["velocita"], ["agilita"], ["coordinazione"], ["mobilita", "prevenzione"]];

export function Capacita() {
  const t = useT(T);
  const { lang } = useLang();
  const { video } = useVideoAtletica();
  const [eta, setEta] = useState<(typeof CHIP_ETA)[number]>("U12");
  const ai = CHIP_ETA.indexOf(eta);
  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.stretto}`}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.Atletica} />
        <div className={s.seg} style={{ gridTemplateColumns: "repeat(6,minmax(0,1fr))" }} role="group" aria-label={t.fascia}>
          {CHIP_ETA.map((l) => (
            <button key={l} type="button" className={l === eta ? `${s.sg} ${s.on}` : s.sg} aria-pressed={l === eta} onClick={() => setEta(l)}>{l}</button>
          ))}
        </div>
        {CAPS[lang].map(([nome, desc], i) => {
          const lv = Math.round(PRIORITA[i][ai] / 2);
          const v = primoVideo(video, CATEGORIE[i], fasciaDaChip(eta));
          return (
            <div key={nome} className={s.li} style={{ padding: "9px 12px" }}>
              <span className={s.grow}>
                <span className={s.t} style={{ fontSize: 14 }}>{nome}</span>
                <span className={`${s.s} ${s.blk}`}>{desc}</span>
                {v && <Link href={`${ROTTE.Atletica}/video/${v.id}`} className={s.vlink}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>{t.guarda}</Link>}
              </span>
              <span className={s.stelle} role="img" aria-label={`${t.livello} ${lv}/5`}>
                {[0, 1, 2, 3, 4].map((k) => <span key={k} className={k < lv ? `${s.stella} ${s.on}` : s.stella} />)}
              </span>
            </div>
          );
        })}
      </div>
    </Schermo>
  );
}
