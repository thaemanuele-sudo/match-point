"use client";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "S5 · Uno-due · Sofia", titolo: "Progressione", nota: "L'AI propone il livello successivo in base ai risultati registrati.", fatto: "Livello completato", corso: "Livello in corso" },
  en: { kick: "S5 · One-two · Sofia", titolo: "Progression", nota: "The AI suggests the next level based on recorded results.", fatto: "Level completed", corso: "Current level" },
  fr: { kick: "S5 · Un-deux · Sofia", titolo: "Progression", nota: "L'IA propose le niveau suivant selon les résultats enregistrés.", fatto: "Niveau terminé", corso: "Niveau en cours" },
  de: { kick: "S5 · Eins-zwei · Sofia", titolo: "Fortschritt", nota: "Die KI schlägt die nächste Stufe anhand der gespeicherten Ergebnisse vor.", fatto: "Stufe abgeschlossen", corso: "Aktuelle Stufe" },
  es: { kick: "S5 · Uno-dos · Sofia", titolo: "Progresión", nota: "La IA propone el nivel siguiente según los resultados registrados.", fatto: "Nivel completado", corso: "Nivel en curso" },
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
  fr: [
    ["Alimenté", "L'entraîneur alimente au panier", "Pour monter : 8 séquences sur 10 correctes"],
    ["Coopératif", "Échange avec un partenaire qui coopère", "Pour monter : schéma réussi 7 fois sur 10"],
    ["Situationnel", "Point joué à partir du schéma", "Pour monter : plus de 50% de points gagnés"],
    ["Match", "Set avec score, jeu libre", "Pour monter : usage cohérent avec la matrice"],
  ],
  de: [
    ["Zugespielt", "Der Trainer spielt aus dem Ballkorb zu.", "Zum Aufsteigen: 8 von 10 Sequenzen korrekt"],
    ["Kooperativ", "Ballwechsel mit kooperativem Partner", "Zum Aufsteigen: Schema 7 von 10 Mal vollständig"],
    ["Situativ", "Punkt, der aus dem Schema heraus gespielt wird", "Zum Aufsteigen: Mehr als 50% der Punkte gewonnen"],
    ["Spiel", "Satz mit Zählung, freie Nutzung", "Zum Aufsteigen: Einsatz passend zur Matrix"],
  ],
  es: [
    ["Alimentado", "El entrenador alimenta con el cesto", "Para subir: 8 secuencias de 10 correctas"],
    ["Cooperativo", "Peloteo con compañero que colabora", "Para subir: Patrón completado 7 de 10 veces"],
    ["Situacional", "Punto jugado a partir del patrón", "Para subir: Puntos ganados por encima del 50%"],
    ["Partido", "Set con marcador, uso libre", "Para subir: Uso coherente con la matriz"],
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
