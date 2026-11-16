"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useProfilo } from "@/lib/useProfilo";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import type { Profilo } from "@/lib/types";
import { Scudo, Testata } from "./comuni";
import c from "./comune.module.css";
import s from "./SceltaProfilo.module.css";

const T = {
  it: {
    kick: "Passo 1 di 3", titolo: "Chi usa Match Point?", intro: "Ogni profilo ha il suo linguaggio. Puoi aggiungerne altri in seguito.",
    nota: "Per i minori di 14 anni l'accesso avviene tramite l'account del genitore o del maestro.",
    continua: "Continua", salvo: "Salvataggio…", errore: "Non siamo riusciti a salvare la scelta. Riprova.",
  },
  en: {
    kick: "Step 1 of 3", titolo: "Who's using Match Point?", intro: "Each profile has its own language. You can add more later.",
    nota: "Under 14s access the app through a parent's or coach's account.",
    continua: "Continue", salvo: "Saving…", errore: "We couldn't save your choice. Please try again.",
  },
};

type Tipo = Profilo["tipo_utente"];
// Lettera del disegno → tipo_utente nel database e schermata successiva.
const RUOLI: { k: string; tipo: Tipo; dopo: string }[] = [
  { k: "M", tipo: "maestro", dopo: ROTTE.Main },
  { k: "A", tipo: "giocatore", dopo: ROTTE.ProfiloAllievo },
  { k: "G", tipo: "genitore", dopo: ROTTE.Consenso },
];
const DATI = {
  it: { M: ["Maestro", "Linguaggio tecnico, metriche complete, piani e report per le famiglie."], A: ["Allievo", "Modalità Bambino: un obiettivo alla volta, video brevi, giochi e badge."], G: ["Genitore", "Segui i progressi di tuo figlio e gestisci consenso e privacy."] },
  en: { M: ["Coach", "Technical language, full metrics, plans and family reports."], A: ["Student", "Kid Mode: one goal at a time, short videos, games and badges."], G: ["Parent", "Follow your child's progress and manage consent and privacy."] },
} as const;

/** 13 · Chi sei? Salva profiles.tipo_utente e prosegue. */
export default function SceltaProfilo() {
  const t = useT(T);
  const { lang } = useLang();
  const router = useRouter();
  const { profilo } = useProfilo();
  const [sel, setSel] = useState("M");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(false);

  // Se il profilo ha già una scelta, parte da quella.
  useEffect(() => {
    const r = RUOLI.find((x) => x.tipo === profilo?.tipo_utente);
    if (r) setSel(r.k);
  }, [profilo]);

  async function continua() {
    const r = RUOLI.find((x) => x.k === sel)!;
    setInvio(true); setErrore(false);
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (!data.user) { router.replace(ROTTE.Benvenuto); return; }
    const { error } = await sb.from("profiles").update({ tipo_utente: r.tipo }).eq("id", data.user.id);
    if (error) { setInvio(false); setErrore(true); return; }
    router.push(r.dopo);
  }

  return (
    <Schermo>
      <div className={`${c.col} ${c.pieno}`}>
        <Testata indietro={ROTTE.Benvenuto} kick={t.kick} titolo={t.titolo} />
        <p className={c.testoMuted}>{t.intro}</p>
        {RUOLI.map((r) => {
          const [nome, desc] = DATI[lang][r.k as "M"];
          return (
            <button key={r.k} type="button" className={r.k === sel ? `${s.ruolo} ${s.on}` : s.ruolo} aria-pressed={r.k === sel} onClick={() => setSel(r.k)}>
              <span className={s.lettera}>{r.k}</span>
              <span className={s.testi}><b>{nome}</b><span>{desc}</span></span>
            </button>
          );
        })}
        <div className={c.note}><Scudo size={16} /> {t.nota}</div>
        {errore && <div className={s.errore} role="alert">{t.errore}</div>}
        <div className={s.spazio} />
        <button type="button" className="btn" onClick={continua} disabled={invio}>{invio ? t.salvo : t.continua}</button>
      </div>
    </Schermo>
  );
}
