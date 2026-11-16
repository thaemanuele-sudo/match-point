"use client";
import Link from "next/link";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import { Schermo } from "@/components/app/Schermo";
import { PAG_ACCESSO, PAG_REGISTRATI, conDopo, useDopo } from "./auth";
import s from "./auth.module.css";

const T = {
  it: {
    slogan: "Tecnica, tattica e atletica guidate dall'AI per maestri, allievi e famiglie.",
    lingua: "Lingua", presto: "altre lingue in arrivo", fase2: "fase 2",
    crea: "Crea account", accedi: "Accedi",
  },
  en: {
    slogan: "AI-guided technique, tactics and fitness for coaches, students and families.",
    lingua: "Language", presto: "more languages coming", fase2: "phase 2",
    crea: "Create account", accedi: "Sign in",
  },
};

// Le lingue del disegno: solo italiano e inglese sono attive, le altre arrivano più avanti.
const LINGUE: { nome: string; codice: Lingua | null }[] = [
  { nome: "English", codice: "en" }, { nome: "Italiano", codice: "it" },
  { nome: "Español", codice: null }, { nome: "Français", codice: null }, { nome: "Deutsch", codice: null },
];

/** 12 · Benvenuto e lingua. Aperta a tutti: porta con sé ?dopo verso accesso e registrazione. */
export default function Benvenuto() {
  const t = useT(T);
  const { lang, setLang } = useLang();
  const dopo = useDopo();
  return (
    <Schermo>
      {/* prato con la pallina */}
      <div className={`lawn ${s.prato}`} aria-hidden="true">
        <svg viewBox="0 0 393 430" preserveAspectRatio="xMidYMid slice">
          <path d="M-20 360 L420 250 M60 440 L360 -20" stroke="#fff" strokeWidth="3" opacity=".5" />
          <circle cx="300" cy="120" r="46" fill="#D8F34A" />
          <path d="M266 92c18 14 18 42 0 58M334 92c-18 14-18 42 0 58" fill="none" stroke="#fff" strokeWidth="4" />
        </svg>
        <div className={s.sfumo} />
      </div>
      <div className={s.benv}>
        <div>
          <h1 className={`brand ${s.marchio}`}>Match<br />Point</h1>
          <p className={s.slogan}>{t.slogan}</p>
        </div>
        <div className={`card ${s.boxLingua}`}>
          <div className={s.riga}><h2>{t.lingua}</h2><span>{t.presto}</span></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LINGUE.map((l) =>
              l.codice ? (
                <button key={l.nome} type="button" className={l.codice === lang ? "chip on" : "chip"} aria-pressed={l.codice === lang} onClick={() => setLang(l.codice!)}>{l.nome}</button>
              ) : (
                <button key={l.nome} type="button" className={`chip ${s.chipOff}`} disabled>{l.nome}</button>
              ),
            )}
          </div>
          <div className={s.fase}><span className={s.tag}>PT · {t.fase2}</span><span className={s.tag}>NL · {t.fase2}</span></div>
        </div>
        <Link href={conDopo(PAG_REGISTRATI, dopo)} className="btn">{t.crea}</Link>
        <Link href={conDopo(PAG_ACCESSO, dopo)} className={s.link}>{t.accedi}</Link>
      </div>
    </Schermo>
  );
}
