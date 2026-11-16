"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT, useLang } from "@/lib/i18n/lingua";
import { FASCE, type Fascia } from "@/lib/types";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    startingPointOfThe: "Punto di partenza del motore AI",
    titolo: "Scheda {fascia}",
    adulti: "Adulti",
    startPlan: "Avvia la scheda",
  },
  en: {
    back: "Back",
    startingPointOfThe: "Starting point of the AI engine",
    titolo: "{fascia} plan",
    adulti: "Adults",
    startPlan: "Start plan",
  },
  fr: {
    back: "Retour",
    startingPointOfThe: "Point de départ du moteur IA",
    titolo: "Programme {fascia}",
    adulti: "Adultes",
    startPlan: "Lancer le programme",
  },
  de: {
    back: "Zurück",
    startingPointOfThe: "Ausgangspunkt der KI-Engine",
    titolo: "Plan {fascia}",
    adulti: "Erwachsene",
    startPlan: "Plan starten",
  },
  es: {
    back: "Atrás",
    startingPointOfThe: "Punto de partida del motor IA",
    titolo: "Ficha {fascia}",
    adulti: "Adultos",
    startPlan: "Iniciar la ficha",
  },
};

// Schede atletiche per fascia (dimostrative): [sottotitolo, [categoria, esercizio, dosaggio, durata][]]. ADULTI = "PRO" dei disegni.
const DATI = {
  it: {"U10": ["Gioco e coordinazione · 2-3 sessioni da 20-30'", [["Coordinazione", "Prese con palline di colori diversi", "3×10", "6'"], ["Gambe", "Scaletta: due dentro, dentro-fuori", "4 passaggi", "6'"], ["Reattività", "Gioco \"semaforo\": scatto 5 m al verde", "6 partenze", "5'"], ["Equilibrio", "Fenicottero con palleggio", "3×15 s", "4'"], ["Forza", "Percorso animali: orso, granchio, rana", "3 giri", "6'"]]], "U12": ["Coordinazione specifica · 3 sessioni da 30'", [["Coordinazione", "Palleggio alternato camminando", "3×30 s", "6'"], ["Gambe", "Spider drill con racchetta", "3×1 giro", "8'"], ["Spinta", "Salti su mini ostacoli 15 cm", "3×8", "5'"], ["Agilità", "Corsa a T con passi laterali", "4 rip.", "6'"], ["Core", "Plank frontale e laterale", "3×20 s", "6'"]]], "U14": ["Crescita rapida · 3-4 sessioni da 35-40'", [["Gambe", "Recupero al centro, passi incrociati", "4×6", "8'"], ["Spinta", "Squat jump e balzi laterali", "3×6", "6'"], ["Velocità", "Sprint 5-10 m da posizioni diverse", "6×10 m", "6'"], ["Forza", "Affondi, squat, push-up, rematore", "3×10", "12'"], ["Equilibrio", "Colpo su una gamba, palla medica 1 kg", "3×8", "5'"]]], "U16": ["Sovraccarico progressivo · 4 sessioni da 45'", [["Forza", "Goblet squat, stacco rumeno", "4×6-8", "15'"], ["Potenza", "Lanci palla medica 2-3 kg", "4×6 lato", "8'"], ["Spinta", "Pliometria box 30 cm", "3×5", "6'"], ["Agilità", "Spider drill cronometrato", "5 rip.", "8'"], ["Resistenza", "20 s lavoro / 20 s recupero", "2×8", "10'"]]], "U18": ["Preparazione agonistica · 4-5 sessioni da 50-60'", [["Forza", "Squat, stacco, panca, trazioni", "4×4-6", "20'"], ["Potenza", "Palla medica rotazionale", "4×6", "8'"], ["Velocità", "Sprint con cambio di direzione", "8×10 m", "8'"], ["Resistenza", "Simulazione punti 6-10 s", "3×10", "15'"], ["Core", "Pallof press, plank dinamici", "3×10", "8'"]]], "ADULTI": ["Programmi individuali del preparatore", [["Forza", "Cicli periodizzati sui tornei", "personalizz.", "25-30'"], ["Velocità", "Lavori sulla superficie del torneo", "personalizz.", "15'"], ["Resistenza", "Intervalli e aerobico di recupero", "personalizz.", "20-40'"], ["Recupero", "Mobilità, sonno, carico percepito", "quotidiano", "15'"]]]},
  en: {"U10": ["Play and coordination · 2-3 sessions of 20-30'", [["Coordination", "Catches with different colored balls", "3×10", "6'"], ["Legs", "Ladder: two in, in-out", "4 passes", "6'"], ["Reactivity", "\"Traffic light\" game: 5 m sprint on green", "6 starts", "5'"], ["Balance", "Flamingo with bouncing", "3×15 s", "4'"], ["Strength", "Animal course: bear, crab, frog", "3 rounds", "6'"]]], "U12": ["Specific coordination · 3 sessions of 30'", [["Coordination", "Alternating bouncing while walking", "3×30 s", "6'"], ["Legs", "Spider drill with racket", "3×1 round", "8'"], ["Drive", "Jumps over 15 cm mini hurdles", "3×8", "5'"], ["Agility", "T-drill with side steps", "4 reps", "6'"], ["Core", "Front and side plank", "3×20 s", "6'"]]], "U14": ["Rapid growth · 3-4 sessions of 35-40'", [["Legs", "Recovery to the middle, crossover steps", "4×6", "8'"], ["Drive", "Squat jumps and lateral bounds", "3×6", "6'"], ["Speed", "5-10 m sprints from different positions", "6×10 m", "6'"], ["Strength", "Lunges, squats, push-ups, rows", "3×10", "12'"], ["Balance", "One-leg stroke, 1 kg medicine ball", "3×8", "5'"]]], "U16": ["Progressive overload · 4 sessions of 45'", [["Strength", "Goblet squat, Romanian deadlift", "4×6-8", "15'"], ["Power", "2-3 kg medicine ball throws", "4×6 per side", "8'"], ["Drive", "30 cm box plyometrics", "3×5", "6'"], ["Agility", "Timed spider drill", "5 reps", "8'"], ["Endurance", "20 s work / 20 s rest", "2×8", "10'"]]], "U18": ["Competitive preparation · 4-5 sessions of 50-60'", [["Strength", "Squat, deadlift, bench, pull-ups", "4×4-6", "20'"], ["Power", "Rotational medicine ball", "4×6", "8'"], ["Speed", "Sprints with change of direction", "8×10 m", "8'"], ["Endurance", "6-10 s point simulation", "3×10", "15'"], ["Core", "Pallof press, dynamic planks", "3×10", "8'"]]], "ADULTI": ["Individual programs from the trainer", [["Strength", "Periodized cycles around tournaments", "custom", "25-30'"], ["Speed", "Work on the tournament surface", "custom", "15'"], ["Endurance", "Intervals and aerobic recovery", "custom", "20-40'"], ["Recovery", "Mobility, sleep, perceived load", "daily", "15'"]]]},
  fr: {"U10": ["Jeu et coordination · 2-3 séances de 20-30'", [["Coordination", "Prises avec balles de couleurs différentes", "3×10", "6'"], ["Jambes", "Échelle : deux dedans, dedans-dehors", "4 passages", "6'"], ["Réactivité", "Jeu du « feu rouge » : sprint de 5 m au vert", "6 départs", "5'"], ["Équilibre", "Flamant avec rebond", "3×15 s", "4'"], ["Force", "Parcours des animaux : ours, crabe, grenouille", "3 tours", "6'"]]], "U12": ["Coordination spécifique · 3 séances de 30'", [["Coordination", "Rebond alterné en marchant", "3×30 s", "6'"], ["Jambes", "Spider drill avec raquette", "3×1 tour", "8'"], ["Poussée", "Sauts par-dessus mini-haies de 15 cm", "3×8", "5'"], ["Agilité", "Course en T avec pas latéraux", "4 rép.", "6'"], ["Gainage", "Gainage frontal et latéral", "3×20 s", "6'"]]], "U14": ["Croissance rapide · 3-4 séances de 35-40'", [["Jambes", "Retour au centre, pas croisés", "4×6", "8'"], ["Poussée", "Squat jumps et bonds latéraux", "3×6", "6'"], ["Vitesse", "Sprints de 5-10 m depuis différentes positions", "6×10 m", "6'"], ["Force", "Fentes, squats, pompes, rameur", "3×10", "12'"], ["Équilibre", "Frappe sur une jambe, medicine-ball 1 kg", "3×8", "5'"]]], "U16": ["Surcharge progressive · 4 séances de 45'", [["Force", "Goblet squat, soulevé de terre roumain", "4×6-8", "15'"], ["Puissance", "Lancers de medicine-ball 2-3 kg", "4×6 par côté", "8'"], ["Poussée", "Pliométrie sur caisse de 30 cm", "3×5", "6'"], ["Agilité", "Spider drill chronométré", "5 rép.", "8'"], ["Endurance", "20 s d'effort / 20 s de repos", "2×8", "10'"]]], "U18": ["Préparation compétitive · 4-5 séances de 50-60'", [["Force", "Squat, soulevé de terre, développé couché, tractions", "4×4-6", "20'"], ["Puissance", "Medicine-ball rotationnel", "4×6", "8'"], ["Vitesse", "Sprints avec changement de direction", "8×10 m", "8'"], ["Endurance", "Simulation d'échanges de 6-10 s", "3×10", "15'"], ["Gainage", "Pallof press, gainages dynamiques", "3×10", "8'"]]], "ADULTI": ["Programmes individuels du préparateur", [["Force", "Cycles périodisés autour des tournois", "personnalisé", "25-30'"], ["Vitesse", "Travail sur la surface du tournoi", "personnalisé", "15'"], ["Endurance", "Fractionné et aérobie de récupération", "personnalisé", "20-40'"], ["Récupération", "Mobilité, sommeil, charge ressentie", "quotidien", "15'"]]]},
  de: {"U10": ["Spiel und Koordination · 2-3 Einheiten à 20-30'", [["Koordination", "Fangen mit Bällen in verschiedenen Farben", "3×10", "6'"], ["Beine", "Koordinationsleiter: zwei rein, rein-raus", "4 Durchgänge", "6'"], ["Reaktion", "Spiel „Ampel“: 5-m-Sprint bei Grün", "6 Starts", "5'"], ["Gleichgewicht", "Flamingo mit Prellen", "3×15 s", "4'"], ["Kraft", "Tierparcours: Bär, Krebs, Frosch", "3 Runden", "6'"]]], "U12": ["Spezifische Koordination · 3 Einheiten à 30'", [["Koordination", "Wechselndes Prellen beim Gehen", "3×30 s", "6'"], ["Beine", "Spider Drill mit Schläger", "3×1 Runde", "8'"], ["Antritt", "Sprünge über Minihürden 15 cm", "3×8", "5'"], ["Agilität", "T-Lauf mit Seitschritten", "4 Wdh.", "6'"], ["Rumpf", "Unterarmstütz frontal und seitlich", "3×20 s", "6'"]]], "U14": ["Schnelles Wachstum · 3-4 Einheiten à 35-40'", [["Beine", "Rückkehr zur Mitte, Kreuzschritte", "4×6", "8'"], ["Antritt", "Squat Jumps und seitliche Sprünge", "3×6", "6'"], ["Schnelligkeit", "Sprints 5-10 m aus verschiedenen Positionen", "6×10 m", "6'"], ["Kraft", "Ausfallschritte, Kniebeugen, Liegestütze, Rudern", "3×10", "12'"], ["Gleichgewicht", "Schlag auf einem Bein, Medizinball 1 kg", "3×8", "5'"]]], "U16": ["Progressive Belastung · 4 Einheiten à 45'", [["Kraft", "Goblet Squat, rumänisches Kreuzheben", "4×6-8", "15'"], ["Schnellkraft", "Medizinball-Würfe 2-3 kg", "4×6 pro Seite", "8'"], ["Antritt", "Plyometrie auf 30-cm-Kasten", "3×5", "6'"], ["Agilität", "Zeitgemessener Spider Drill", "5 Wdh.", "8'"], ["Ausdauer", "20 s Belastung / 20 s Pause", "2×8", "10'"]]], "U18": ["Wettkampfvorbereitung · 4-5 Einheiten à 50-60'", [["Kraft", "Kniebeuge, Kreuzheben, Bankdrücken, Klimmzüge", "4×4-6", "20'"], ["Schnellkraft", "Rotierender Medizinball", "4×6", "8'"], ["Schnelligkeit", "Sprints mit Richtungswechsel", "8×10 m", "8'"], ["Ausdauer", "Simulation von Ballwechseln 6-10 s", "3×10", "15'"], ["Rumpf", "Pallof Press, dynamische Unterarmstütze", "3×10", "8'"]]], "ADULTI": ["Individuelle Programme des Trainers", [["Kraft", "Periodisierte Zyklen rund um Turniere", "individuell", "25-30'"], ["Schnelligkeit", "Arbeit auf dem Turnierbelag", "individuell", "15'"], ["Ausdauer", "Intervalle und aerobe Erholung", "individuell", "20-40'"], ["Erholung", "Mobilität, Schlaf, empfundene Belastung", "täglich", "15'"]]]},
  es: {"U10": ["Juego y coordinación · 2-3 sesiones de 20-30'", [["Coordinación", "Recogidas con pelotas de colores distintos", "3×10", "6'"], ["Piernas", "Escalera: dos dentro, dentro-fuera", "4 pasos", "6'"], ["Reactividad", "Juego del \"semáforo\": sprint de 5 m con verde", "6 salidas", "5'"], ["Equilibrio", "Flamenco con bote", "3×15 s", "4'"], ["Fuerza", "Circuito de animales: oso, cangrejo, rana", "3 vueltas", "6'"]]], "U12": ["Coordinación específica · 3 sesiones de 30'", [["Coordinación", "Bote alterno caminando", "3×30 s", "6'"], ["Piernas", "Spider drill con raqueta", "3×1 vuelta", "8'"], ["Empuje", "Saltos sobre minivallas de 15 cm", "3×8", "5'"], ["Agilidad", "Carrera en T con pasos laterales", "4 rep.", "6'"], ["Core", "Plancha frontal y lateral", "3×20 s", "6'"]]], "U14": ["Crecimiento rápido · 3-4 sesiones de 35-40'", [["Piernas", "Recuperación al centro, pasos cruzados", "4×6", "8'"], ["Empuje", "Squat jumps y saltos laterales", "3×6", "6'"], ["Velocidad", "Sprints de 5-10 m desde distintas posiciones", "6×10 m", "6'"], ["Fuerza", "Zancadas, sentadillas, flexiones, remo", "3×10", "12'"], ["Equilibrio", "Golpe a una pierna, balón medicinal 1 kg", "3×8", "5'"]]], "U16": ["Sobrecarga progresiva · 4 sesiones de 45'", [["Fuerza", "Goblet squat, peso muerto rumano", "4×6-8", "15'"], ["Potencia", "Lanzamientos de balón medicinal 2-3 kg", "4×6 por lado", "8'"], ["Empuje", "Pliometría en cajón de 30 cm", "3×5", "6'"], ["Agilidad", "Spider drill cronometrado", "5 rep.", "8'"], ["Resistencia", "20 s de trabajo / 20 s de descanso", "2×8", "10'"]]], "U18": ["Preparación competitiva · 4-5 sesiones de 50-60'", [["Fuerza", "Sentadilla, peso muerto, press de banca, dominadas", "4×4-6", "20'"], ["Potencia", "Balón medicinal rotacional", "4×6", "8'"], ["Velocidad", "Sprints con cambio de dirección", "8×10 m", "8'"], ["Resistencia", "Simulación de puntos de 6-10 s", "3×10", "15'"], ["Core", "Pallof press, planchas dinámicas", "3×10", "8'"]]], "ADULTI": ["Programas individuales del preparador", [["Fuerza", "Ciclos periodizados en torneos", "personalizado", "25-30'"], ["Velocidad", "Trabajo sobre la superficie del torneo", "personalizado", "15'"], ["Resistencia", "Intervalos y aeróbico de recuperación", "personalizado", "20-40'"], ["Recuperación", "Movilidad, sueño, carga percibida", "diario", "15'"]]]},
} as const;

export function SchedaEta() {
  const t = useT(T);
  const { lang } = useLang();
  const [fascia, setFascia] = useState<Fascia>("U14");
  const [sub, rows] = DATI[lang][fascia];
  return (
    <Schermo tab="atletica">
      <div className={K.scr} style={{ gap: 8 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.Atletica} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.startingPointOfThe}</div>
            <h1 className={K.h1}>{t.titolo.replace("{fascia}", fascia === "ADULTI" ? t.adulti : fascia)}</h1>
          </div>
        </header>
        <div className={K.seg} style={{ gridTemplateColumns: "repeat(6,minmax(0,1fr))" }}>
          {FASCE.map((f) => (
            <button key={f} type="button" className={f === fascia ? `${K.sg} ${K.on}` : K.sg} aria-pressed={f === fascia} onClick={() => setFascia(f)}>{f === "ADULTI" ? t.adulti : f}</button>
          ))}
        </div>
        <div className={K.note} style={{ color: "#E5E5EA" }}>{sub}</div>
        {rows.map((r) => (
          <div key={r[0] + r[1]} className={K.li} style={{ padding: "9px 12px" }}>
            <span className={K.tag} style={{ width: "74px", textAlign: "center", flex: "none" }}>{r[0]}</span>
            <span className={K.grow} style={{ fontSize: "13.5px", fontWeight: "600", lineHeight: "1.3" }}>{r[1]}</span>
            <span style={{ textAlign: "right", flex: "none" }}>
              <span className={K.disp} style={{ display: "block", fontSize: "17px", fontWeight: "700" }}>{r[2]}</span>
              <span className={K.muted} style={{ fontSize: "12px", fontWeight: "700" }}>{r[3]}</span>
            </span>
          </div>
        ))}
        <Link href={ROTTE.SessioneAtletica} className={K.btn} style={{ marginTop: "4px" }}>{t.startPlan}</Link>
      </div>
    </Schermo>
  );
}
