"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useEffect, useState } from "react";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import { LinguaChip } from "../LinguaChip";
import { iniziali, useProfilo } from "@/lib/useProfilo";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RisultatoAnalisi } from "@/lib/types";
import { ROTTE } from "@/lib/rotte";
import s from "./Main.module.css";

const T = {
  it: {
    match_point: "Match Point",
    hi: "Ciao",
    coach: "Coach",
    good_session: "buona sessione",
    upload_a_stroke_the: "Carica un colpo. L'AI lo corregge.",
    record_a_stroke: "Registra un colpo",
    open_video_lab: "Apri Video Lab",
    students: "Allievi",
    all: "Tutti",
    tr: "TR",
    tommaso: "Tommaso",
    gl: "GL",
    giulia: "Giulia",
    mb: "MB",
    matteo: "Matteo",
    add: "Aggiungi",
    latest_analyses: "Ultime analisi",
    see: "Vedi",
    close_to_the_error: "vicino all'errore",
    stroke_quality: "qualità gesto",
    this_week_s_program: "Percorso della settimana",
    k5_of_8_sessions: "5 di 8 sessioni completate",
    open_program: "Apri percorso",
  },
  en: {
    match_point: "Match Point",
    hi: "Hi",
    coach: "Coach",
    good_session: "have a good session",
    upload_a_stroke_the: "Upload a stroke. The AI corrects it.",
    record_a_stroke: "Record a stroke",
    open_video_lab: "Open Video Lab",
    students: "Students",
    all: "All",
    tr: "TR",
    tommaso: "Tommaso",
    gl: "GL",
    giulia: "Giulia",
    mb: "MB",
    matteo: "Matteo",
    add: "Add",
    latest_analyses: "Latest analyses",
    see: "See",
    close_to_the_error: "close to the error",
    stroke_quality: "stroke quality",
    this_week_s_program: "This week's program",
    k5_of_8_sessions: "5 of 8 sessions completed",
    open_program: "Open program",
  },
  fr: {
    match_point: "Match Point",
    hi: "Salut",
    coach: "Coach",
    good_session: "bonne séance",
    upload_a_stroke_the: "Charge un coup. L'IA le corrige.",
    record_a_stroke: "Filmer un coup",
    open_video_lab: "Ouvrir Video Lab",
    students: "Élèves",
    all: "Tous",
    tr: "TR",
    tommaso: "Tommaso",
    gl: "GL",
    giulia: "Giulia",
    mb: "MB",
    matteo: "Matteo",
    add: "Ajouter",
    latest_analyses: "Dernières analyses",
    see: "Voir",
    close_to_the_error: "proche de l'erreur",
    stroke_quality: "qualité du geste",
    this_week_s_program: "Parcours de la semaine",
    k5_of_8_sessions: "5 séances sur 8 terminées",
    open_program: "Ouvrir le parcours",
  },
  de: {
    match_point: "Match Point",
    hi: "Hallo",
    coach: "Coach",
    good_session: "schöne Einheit!",
    upload_a_stroke_the: "Lade einen Schlag hoch. Die KI korrigiert ihn.",
    record_a_stroke: "Schlag aufnehmen",
    open_video_lab: "Video Lab öffnen",
    students: "Schüler",
    all: "Alle",
    tr: "TR",
    tommaso: "Tommaso",
    gl: "GL",
    giulia: "Giulia",
    mb: "MB",
    matteo: "Matteo",
    add: "Hinzufügen",
    latest_analyses: "Neueste Analysen",
    see: "Ansehen",
    close_to_the_error: "nah am Fehler",
    stroke_quality: "Bewegungsqualität",
    this_week_s_program: "Programm der Woche",
    k5_of_8_sessions: "5 von 8 Einheiten abgeschlossen",
    open_program: "Programm öffnen",
  },
  es: {
    match_point: "Match Point",
    hi: "Hola",
    coach: "Coach",
    good_session: "buena sesión",
    upload_a_stroke_the: "Sube un golpe. La IA lo corrige.",
    record_a_stroke: "Graba un golpe",
    open_video_lab: "Abrir Video Lab",
    students: "Alumnos",
    all: "Todos",
    tr: "TR",
    tommaso: "Tommaso",
    gl: "GL",
    giulia: "Giulia",
    mb: "MB",
    matteo: "Matteo",
    add: "Añadir",
    latest_analyses: "Últimos análisis",
    see: "Ver",
    close_to_the_error: "cerca del error",
    stroke_quality: "calidad del gesto",
    this_week_s_program: "Ruta de la semana",
    k5_of_8_sessions: "5 de 8 sesiones completadas",
    open_program: "Abrir ruta",
  },
};

type Riga = { id: string | null; titolo: string; sotto: string; valore: number; etichetta: "close" | "quality" };

/** Dati dimostrativi del disegno: si vedono solo se l'utente non ha ancora nessuna analisi. */
const DEMO: Record<Lingua, Riga[]> = {
  it: [
    { id: null, titolo: "Diritto incrociato", sotto: "Tommaso · impatto in ritardo", valore: 72, etichetta: "close" },
    { id: null, titolo: "Servizio kick", sotto: "Giulia · movimento corretto", valore: 91, etichetta: "quality" },
  ],
  en: [
    { id: null, titolo: "Crosscourt forehand", sotto: "Tommaso · late contact", valore: 72, etichetta: "close" },
    { id: null, titolo: "Kick serve", sotto: "Giulia · correct movement", valore: 91, etichetta: "quality" },
  ],
  fr: [
    { id: null, titolo: "Coup droit croisé", sotto: "Tommaso · impact en retard", valore: 72, etichetta: "close" },
    { id: null, titolo: "Service kick", sotto: "Giulia · mouvement correct", valore: 91, etichetta: "quality" },
  ],
  de: [
    { id: null, titolo: "Cross-Vorhand", sotto: "Tommaso · später Treffpunkt", valore: 72, etichetta: "close" },
    { id: null, titolo: "Kick-Aufschlag", sotto: "Giulia · korrekte Bewegung", valore: 91, etichetta: "quality" },
  ],
  es: [
    { id: null, titolo: "Derecha cruzada", sotto: "Tommaso · impacto tardío", valore: 72, etichetta: "close" },
    { id: null, titolo: "Saque kick", sotto: "Giulia · movimiento correcto", valore: 91, etichetta: "quality" },
  ],
};

type RigaDb = { id: string; colpo: string | null; risultato: Partial<RisultatoAnalisi> | null };

const maiuscola = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function Main() {
  const t = useT(T);
  const { lang } = useLang();
  const { profilo } = useProfilo();
  const [reali, setReali] = useState<Riga[]>([]);

  // Ultime 3 analisi dell'utente (la RLS limita già le righe al proprietario).
  useEffect(() => {
    let vivo = true;
    supabaseBrowser()
      .from("analyses")
      .select("id,colpo,risultato,creato_il")
      .order("creato_il", { ascending: false })
      .limit(3)
      .then(({ data }: { data: RigaDb[] | null }) => {
        if (!vivo || !data) return;
        setReali(
          data.map((r) => {
            const ris = r.risultato ?? {};
            return {
              id: r.id,
              titolo: maiuscola(r.colpo || ris.colpo || "—"),
              sotto: ris.errori?.[0]?.titolo || ris.sintesi || "",
              valore: Math.round(ris.punteggio ?? 0),
              etichetta: "quality" as const,
            };
          }),
        );
      });
    return () => { vivo = false; };
  }, []);

  const righe = reali.length ? reali : DEMO[lang];
  return (
    <Schermo tab="coach">
      <div className={s.app}>
      <div className={s.scroll}>
        <header className={s.e1}>
          <div className={s.e2}>
            <span className={s.e3}>
              {t.match_point}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="#D8F34A" />
              <path d="M4.2 5c4 3.2 4 10.8 0 14M19.8 5c-4 3.2-4 10.8 0 14" fill="none" stroke="#fff" strokeWidth="1.6" />
            </svg>
          </div>
          <div className={s.e4}>
            <LinguaChip />
            <div className={s.e5}>
              {iniziali(profilo)}
            </div>
          </div>
        </header>
        <section className={`lawn ${s.lawn} ${s.e6}`}>
          <svg className={s.e7} viewBox="0 0 350 204" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-10 150 L360 60 M40 210 L330 -10" stroke="#fff" strokeWidth="2" fill="none" />
          </svg>
          <div className={s.e8}>
            <span className={s.e9}>
              {t.hi} {profilo?.nome || t.coach}, {t.good_session}
            </span>
            <h1 className={`disp ${s.disp} ${s.e10}`}>
              {t.upload_a_stroke_the}
            </h1>
          </div>
          <div className={s.e11}>
            <Link href={ROTTE.Carica} className={`btn ${s.btn}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="6" width="13" height="12" rx="3" />
                <path d="M16 10l5-3v10l-5-3z" />
              </svg>
              {t.record_a_stroke}
            </Link>
            <Link href={ROTTE.VideoLab} className={`icon ${s.icon} ${s.e12}`} aria-label={t.open_video_lab}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 5h16v11H9l-5 4z" />
              </svg>
            </Link>
          </div>
        </section>
        <section className={s.e13}>
          <div className={`sec ${s.sec}`}>
            <h2>
              {t.students}
            </h2>
            <Link href={ROTTE.Allievi}>
              {t.all}
            </Link>
          </div>
          <div className={s.e14}>
            <div className={s.e15}>
              <div className={s.e16}>
                {t.tr}
              </div>
              <span className={s.e17}>
                {t.tommaso}
              </span>
              <span className={`chip ${s.chip} ${s.e18}`}>
                U12
              </span>
            </div>
            <div className={s.e15}>
              <div className={s.e19}>
                {t.gl}
              </div>
              <span className={s.e17}>
                {t.giulia}
              </span>
              <span className={`chip ${s.chip} ${s.e18}`}>
                U14
              </span>
            </div>
            <div className={s.e15}>
              <div className={s.e20}>
                {t.mb}
              </div>
              <span className={s.e17}>
                {t.matteo}
              </span>
              <span className={`chip ${s.chip} ${s.e18}`}>
                U10
              </span>
            </div>
            <div className={s.e15}>
              <div className={s.e21}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span className={`muted ${s.muted} ${s.e17}`}>
                {t.add}
              </span>
            </div>
          </div>
        </section>
        <section className={s.e13}>
          <div className={`sec ${s.sec}`}>
            <h2>
              {t.latest_analyses}
            </h2>
            <Link href={ROTTE.Analisi}>
              {t.see}
            </Link>
          </div>
          {righe.map((r, i) => (
            <Link key={r.id ?? i} href={r.id ? `${ROTTE.Analisi}?id=${r.id}` : ROTTE.Analisi} className={`card ${s.card} ${s.e22}`}>
              <div className={`lawn ${s.lawn} ${s.e23}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className={s.e24}>
                <span className={s.e25}>{r.titolo}</span>
                <span className={`muted ${s.muted} ${s.e26}`}>{r.sotto}</span>
              </div>
              <div className={s.e27}>
                <span className={`disp ${s.disp} ${r.valore >= 80 ? s.e30 : s.e28}`}>{r.valore}%</span>
                <span className={`muted ${s.muted} ${s.e29}`}>{r.etichetta === "close" ? t.close_to_the_error : t.stroke_quality}</span>
              </div>
            </Link>
          ))}
        </section>
        <section className={`card ${s.card} ${s.e31}`}>
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r="22" stroke="#2C2C2E" strokeWidth="6" fill="none" />
            <circle cx="26" cy="26" r="22" stroke="#D8F34A" strokeWidth="6" fill="none" strokeDasharray="138" strokeDashoffset="52" strokeLinecap="round" transform="rotate(-90 26 26)" />
          </svg>
          <div className={s.e32}>
            <span className={s.e33}>
              {t.this_week_s_program}
            </span>
            <span className={`muted ${s.muted} ${s.e26}`}>
              {t.k5_of_8_sessions}
            </span>
          </div>
          <Link href={ROTTE.Atletica} className={`icon ${s.icon} ${s.e34}`} aria-label={t.open_program}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </section>
      </div>
      </div>
    </Schermo>
  );
}
