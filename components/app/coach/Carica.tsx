"use client";
import Link from "next/link";
import { Schermo } from "../Schermo";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { estraiFotogrammi } from "./estraiFotogrammi";
import { ROTTE } from "@/lib/rotte";
import s from "./Carica.module.css";

const T = {
  it: {
    match_point: "Match Point",
    new_video: "Nuovo video",
    close: "Chiudi",
    record_video: "Scatta video",
    guided_camera: "Fotocamera con guida",
    upload_video: "Carica video",
    from_gallery: "Dalla galleria",
    filming_tip: "Consiglio di ripresa",
    phone_vertical_beside_the: "Telefono in verticale, di lato al giocatore, corpo intero e palla nell'inquadratura.",
    which_stroke_is_it: "Che colpo è?",
    student: "Allievo",
    tr: "TR",
    tommaso_r: "Tommaso R.",
    under_12_right_handed: "Under 12 · destro",
    analyze_with_coach_ai: "Analizza con Coach AI",
    choose_video_first: "Scegli o registra un video per continuare",
    video_ready: "Video pronto",
    preparing: "Preparo i fotogrammi…",
    video_error: "Non riesco a leggere questo video. Prova con un altro.",
  },
  en: {
    match_point: "Match Point",
    new_video: "New video",
    close: "Close",
    record_video: "Record video",
    guided_camera: "Guided camera",
    upload_video: "Upload video",
    from_gallery: "From gallery",
    filming_tip: "Filming tip",
    phone_vertical_beside_the: "Phone vertical, beside the player, full body and ball in frame.",
    which_stroke_is_it: "Which stroke is it?",
    student: "Student",
    tr: "TR",
    tommaso_r: "Tommaso R.",
    under_12_right_handed: "Under 12 · right-handed",
    analyze_with_coach_ai: "Analyze with Coach AI",
    choose_video_first: "Choose or record a video to continue",
    video_ready: "Video ready",
    preparing: "Preparing the frames…",
    video_error: "I can't read this video. Try another one.",
  },
  fr: {
    match_point: "Match Point",
    new_video: "Nouvelle vidéo",
    close: "Fermer",
    record_video: "Filmer",
    guided_camera: "Caméra guidée",
    upload_video: "Charger une vidéo",
    from_gallery: "Depuis la galerie",
    filming_tip: "Conseil de tournage",
    phone_vertical_beside_the: "Téléphone vertical, sur le côté du joueur, corps entier et balle dans le cadre.",
    which_stroke_is_it: "Quel coup ?",
    student: "Élève",
    tr: "TR",
    tommaso_r: "Tommaso R.",
    under_12_right_handed: "Moins de 12 ans · droitier",
    analyze_with_coach_ai: "Analyser avec Coach IA",
    choose_video_first: "Choisissez ou filmez une vidéo pour continuer",
    video_ready: "Vidéo prête",
    preparing: "Préparation des images…",
    video_error: "Impossible de lire cette vidéo. Essayez-en une autre.",
  },
  de: {
    match_point: "Match Point",
    new_video: "Neues Video",
    close: "Schließen",
    record_video: "Video aufnehmen",
    guided_camera: "Geführte Kamera",
    upload_video: "Video hochladen",
    from_gallery: "Aus der Galerie",
    filming_tip: "Aufnahme-Tipp",
    phone_vertical_beside_the: "Smartphone hochkant, seitlich zum Spieler, ganzer Körper und Ball im Bild.",
    which_stroke_is_it: "Welcher Schlag ist es?",
    student: "Schüler",
    tr: "TR",
    tommaso_r: "Tommaso R.",
    under_12_right_handed: "Unter 12 · Rechtshänder",
    analyze_with_coach_ai: "Mit Coach AI analysieren",
    choose_video_first: "Wähle oder nimm ein Video auf, um fortzufahren",
    video_ready: "Video bereit",
    preparing: "Ich bereite die Bilder vor…",
    video_error: "Dieses Video kann ich nicht lesen. Probier ein anderes.",
  },
  es: {
    match_point: "Match Point",
    new_video: "Nuevo vídeo",
    close: "Cerrar",
    record_video: "Grabar vídeo",
    guided_camera: "Cámara con guía",
    upload_video: "Subir vídeo",
    from_gallery: "Desde la galería",
    filming_tip: "Consejo de grabación",
    phone_vertical_beside_the: "Móvil en vertical, al lado del jugador, cuerpo entero y bola en el encuadre.",
    which_stroke_is_it: "¿Qué golpe es?",
    student: "Alumno",
    tr: "TR",
    tommaso_r: "Tommaso R.",
    under_12_right_handed: "Sub-12 · diestro",
    analyze_with_coach_ai: "Analizar con Coach AI",
    choose_video_first: "Elige o graba un vídeo para continuar",
    video_ready: "Vídeo listo",
    preparing: "Preparo los fotogramas…",
    video_error: "No puedo leer este vídeo. Prueba con otro.",
  },
};

// Colpi nell'ordine del disegno; `id` è il valore inviato all'API (prefisso dei codici errore).
const COLPI_CARICA = [
  { id: "servizio", it: "Servizio", en: "Serve", fr: "Service", de: "Aufschlag", es: "Saque" },
  { id: "diritto", it: "Diritto", en: "Forehand", fr: "Coup droit", de: "Vorhand", es: "Derecha" },
  { id: "rovescio", it: "Rovescio", en: "Backhand", fr: "Revers", de: "Rückhand", es: "Revés" },
  { id: "back", it: "Back", en: "Slice", fr: "Slice", de: "Slice", es: "Cortado" },
  { id: "volee", it: "Volée", en: "Volley", fr: "Volée", de: "Volley", es: "Volea" },
  { id: "smash", it: "Smash", en: "Overhead", fr: "Smash", de: "Schmetterball", es: "Remate" },
];

/** Copia dell'originale nel bucket privato `video-utenti/<user_id>/`: facoltativa, non blocca mai l'analisi. */
async function salvaOriginale(file: File) {
  try {
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (!data.user) return;
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
    await sb.storage.from("video-utenti").upload(`${data.user.id}/${Date.now()}.${ext}`, file, { contentType: file.type || undefined });
  } catch {
    /* il caricamento dell'originale è un extra */
  }
}

export function Carica() {
  const t = useT(T);
  const { lang } = useLang();
  const router = useRouter();
  const [colpo, setColpo] = useState("diritto");
  const [file, setFile] = useState<File | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState(false);
  const galleria = useRef<HTMLInputElement>(null);
  const fotocamera = useRef<HTMLInputElement>(null);

  const scegli = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setErrore(false); }
    e.target.value = ""; // permette di riscegliere lo stesso file
  };

  const analizza = async () => {
    if (!file || occupato) return;
    setOccupato(true);
    setErrore(false);
    try {
      const fotogrammi = await estraiFotogrammi(file, 6, 768);
      sessionStorage.setItem("mp-analisi-in-corso", JSON.stringify({ colpo, fotogrammi }));
      sessionStorage.removeItem("mp-ultima-analisi");
      void salvaOriginale(file);
      router.push(ROTTE.AnalisiInCorso);
    } catch {
      setErrore(true);
      setOccupato(false);
    }
  };

  const shots = COLPI_CARICA.map((c) => (
    <button type="button" key={c.id} className={`chip ${s.chip} ${c.id === colpo ? `on ${s.on}` : ""}`} aria-pressed={c.id === colpo} onClick={() => setColpo(c.id)}>
      {c[lang]}
    </button>
  ));
  return (
    <Schermo senzaBarra>
      <div className={s.app}>
      <div className={s.e1}>
        <span className={s.e2}>
          {t.match_point}
        </span>
        <div className={`lawn ${s.lawn} ${s.e3}`} />
      </div>
      <div className={s.e4} />
      <section className={s.e5} role="dialog" aria-label={t.new_video}>
        <div className={s.e6} />
        <div className={s.e7}>
          <h1 className={`disp ${s.disp} ${s.e8}`}>
            {t.new_video}
          </h1>
          <button className={s.e9} aria-label={t.close} type="button" onClick={() => router.push(ROTTE.Main)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className={s.e10}>
          <button type="button" className={`${s.opt} ${s.e11}`} onClick={() => fotocamera.current?.click()}>
            <div className={s.e12}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="6" width="13" height="12" rx="3" />
                <path d="M16 10l5-3v10l-5-3z" />
                <circle cx="9.5" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className={s.e13}>
                {t.record_video}
              </div>
              <div className={s.e14}>
                {t.guided_camera}
              </div>
            </div>
          </button>
          <button type="button" className={`${s.opt} ${s.e15}`} onClick={() => galleria.current?.click()}>
            <div className={s.e12}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M3 16l5-5 4 4 3-3 6 6" />
                <circle cx="16" cy="9" r="1.6" />
              </svg>
            </div>
            <div>
              <div className={s.e13}>
                {t.upload_video}
              </div>
              <div className={`muted ${s.muted} ${s.e16}`}>
                {t.from_gallery}
              </div>
            </div>
          </button>
        </div>
        <div className={`lawn ${s.lawn} ${s.e17}`}>
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <rect x="9" y="3" width="22" height="34" rx="5" fill="none" stroke="#fff" strokeWidth="2" />
            <circle cx="20" cy="20" r="5" fill="#D8F34A" />
          </svg>
          <div className={s.e18}>
            <b>
              {t.filming_tip}
            </b>
            <br />
            {t.phone_vertical_beside_the}
          </div>
        </div>
        <div className={s.e19}>
          <p className={s.lbl}>
            {t.which_stroke_is_it}
          </p>
          <div className={s.e20}>
            {shots}
          </div>
        </div>
        <div className={s.e19}>
          <p className={s.lbl}>
            {t.student}
          </p>
          <div className={s.e21}>
            <div className={s.e22}>
              {t.tr}
            </div>
            <div className={s.e23}>
              <div className={s.e24}>
                {t.tommaso_r}
              </div>
              <div className={`muted ${s.muted} ${s.e25}`}>
                {t.under_12_right_handed}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1A6" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
        <input ref={galleria} type="file" accept="video/*" hidden onChange={scegli} />
        <input ref={fotocamera} type="file" accept="video/*" capture="environment" hidden onChange={scegli} />
        <p className={`muted ${s.muted} ${s.stato}`} role="status" aria-live="polite">
          {errore ? t.video_error : occupato ? t.preparing : file ? `${t.video_ready}: ${file.name}` : t.choose_video_first}
        </p>
        <button type="button" className={`btn ${s.btn}`} disabled={!file || occupato} onClick={analizza}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />
          </svg>
          {t.analyze_with_coach_ai}
        </button>
      </section>
      </div>
    </Schermo>
  );
}
