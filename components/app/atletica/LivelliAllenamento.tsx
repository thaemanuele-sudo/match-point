"use client";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "S5 · Uno-due · Sofia", titolo: "Progressione", nota: "L'AI propone il livello successivo in base ai risultati registrati.", fatto: "Livello completato", corso: "Livello in corso" },
  en: { kick: "S5 · One-two · Sofia", titolo: "Progression", nota: "The AI suggests the next level based on recorded results.", fatto: "Level completed", corso: "Current level" },
};
// Dati dimostrativi: [nome, descrizione, condizione per salire]. Stato: 2 livelli fatti, il 3° in corso al 62%, il 4° ancora chiuso.
const LIVELLI = {
  it: [
    ["Alimentato", "Il maestro alimenta con il cesto", "Per salire: 8 sequenze su 10 corrette"],
    ["Cooperativo", "Scambio con compagno che collabora", "Per salire: Schema completato 7 volte su 10"],
    ["Situazionale", "Punto giocato partendo dallo schema", "Per salire: Punti vinti oltre il 50%"],
    ["Partita", "Set con punteggio, uso libero", "Per salire: Uso coerente con la matrice"],
  ],
  en: [
    ["Fed", "The coach feeds from the basket", "To level up: 8 of 10 sequences correct"],
    ["Cooperative", "Rally with a cooperative partner", "To level up: Pattern completed 7 of 10 times"],
    ["Situational", "Point played starting from the pattern", "To level up: Over 50% of points won"],
    ["Match", "Scored set, free use", "To level up: Use consistent with the matrix"],
  ],
};
const ATTUALE = 2; // indice del livello in corso
const AVANZAMENTO = 62;

export function LivelliAllenamento() {
  const t = useT(T);
  const { lang } = useLang();
  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.stretto}`}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.TatticaStrategia} />
        <ol style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
          {LIVELLI[lang].map(([nome, desc, cond], i) => {
            const fatto = i < ATTUALE, corso = i === ATTUALE;
            const col = fatto ? "#4CD07D" : corso ? "#D8F34A" : "#3A3A3E";
            return (
              <li key={nome} className={s.tl} aria-current={corso ? "step" : undefined}>
                <div className={s.tlCol}>
                  <span className={`${s.num} ${s.tlNum}`} style={{ background: col }} role={fatto || corso ? "img" : undefined} aria-label={fatto ? t.fatto : corso ? t.corso : undefined}>
                    {fatto ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg> : i + 1}
                  </span>
                  <span className={s.tlLine} style={{ background: col }} />
                </div>
                <div className={`${s.card} ${s.tlCard}`} style={corso ? { borderColor: "rgba(216,243,74,.5)" } : undefined}>
                  <div className={s.tlT}>{nome}</div>
                  <div className={`${s.muted} ${s.tlD}`}>{desc}</div>
                  <div className={s.tlP} style={{ color: fatto ? "#4CD07D" : corso ? "#D8F34A" : "#A1A1A6" }}>{cond}</div>
                  {corso && <div className={s.bar} style={{ marginTop: 8 }}><i style={{ width: `${AVANZAMENTO}%`, background: "#D8F34A" }} /></div>}
                </div>
              </li>
            );
          })}
        </ol>
        <div className={s.note}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-2px" }}><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" /></svg> {t.nota}
        </div>
      </div>
    </Schermo>
  );
}
