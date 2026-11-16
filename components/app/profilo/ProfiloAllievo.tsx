"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { iniziali, useProfilo } from "@/lib/useProfilo";
import { ROTTE } from "@/lib/rotte";
import { FASCE, type Fascia } from "@/lib/types";
import { Schermo } from "@/components/app/Schermo";
import { Testata } from "./comuni";
import c from "./comune.module.css";
import s from "./ProfiloAllievo.module.css";

const T = {
  it: {
    kick: "Passo 3 di 3 · il motore AI parte da qui", titolo: "Profilo di", eta: "Età", anni: "Anni di gioco", anniV: "3",
    fascia: "FASCIA D'ETÀ", livello: "LIVELLO", mano: "MANO DOMINANTE", rov: "ROVESCIO", obiettivi: "OBIETTIVI", disp: "DISPONIBILITÀ SETTIMANALE",
    destra: "Destra", sinistra: "Sinistra", dueMani: "Due mani", unaMano: "Una mano",
    o1: "Servizio sicuro", o2: "Diritto profondo", o3: "Primo torneo", o4: "Gioco a rete",
    l1: "Principiante", l2: "Intermedio", l3: "Avanzato", l4: "Agonista",
    salva: "Salva profilo", salvo: "Salvataggio…", errore: "Non siamo riusciti a salvare il profilo. Riprova.",
    adulti: "Adulti", under: "Under", nomeDemo: "Luca", nomeDemoCompleto: "Luca B.", iniz: "LU", fasciaDi: "fascia {f}",
  },
  en: {
    kick: "Step 3 of 3 · the AI engine starts here", titolo: "Profile of", fasciaDi: "{f} band", eta: "Age", anni: "Years playing", anniV: "3",
    fascia: "AGE BAND", livello: "LEVEL", mano: "DOMINANT HAND", rov: "BACKHAND", obiettivi: "GOALS", disp: "WEEKLY AVAILABILITY",
    destra: "Right", sinistra: "Left", dueMani: "Two-handed", unaMano: "One-handed",
    o1: "Reliable serve", o2: "Deep forehand", o3: "First tournament", o4: "Net play",
    l1: "Beginner", l2: "Intermediate", l3: "Advanced", l4: "Competitive",
    salva: "Save profile", salvo: "Saving…", errore: "We couldn't save the profile. Please try again.",
    adulti: "Adults", under: "Under", nomeDemo: "Luca", nomeDemoCompleto: "Luca B.", iniz: "LU",
  },
  fr: {
    kick: "Étape 3 sur 3 · le moteur IA part d'ici", titolo: "Profil de", fasciaDi: "tranche {f}", eta: "Âge", anni: "Années de jeu", anniV: "3",
    fascia: "TRANCHE D'ÂGE", livello: "NIVEAU", mano: "MAIN DOMINANTE", rov: "REVERS", obiettivi: "OBJECTIFS", disp: "DISPONIBILITÉ HEBDOMADAIRE",
    destra: "Droite", sinistra: "Gauche", dueMani: "Deux mains", unaMano: "Une main",
    o1: "Service sûr", o2: "Coup droit profond", o3: "Premier tournoi", o4: "Jeu au filet",
    l1: "Débutant", l2: "Intermédiaire", l3: "Avancé", l4: "Compétiteur",
    salva: "Enregistrer le profil", salvo: "Enregistrement…", errore: "Impossible d'enregistrer le profil. Réessayez.",
    adulti: "Adultes", under: "Moins de", nomeDemo: "Luca", nomeDemoCompleto: "Luca B.", iniz: "LU",
  },
  de: {
    kick: "Schritt 3 von 3 · Die KI-Engine startet hier", titolo: "Profil von", fasciaDi: "Altersklasse {f}", eta: "Alter", anni: "Spieljahre", anniV: "3",
    fascia: "ALTERSKLASSE", livello: "STUFE", mano: "DOMINANTE HAND", rov: "RÜCKHAND", obiettivi: "ZIELE", disp: "WÖCHENTLICHE VERFÜGBARKEIT",
    destra: "Rechts", sinistra: "Links", dueMani: "Beidhändig", unaMano: "Einhändig",
    o1: "Sicherer Aufschlag", o2: "Tiefe Vorhand", o3: "Erstes Turnier", o4: "Netzspiel",
    l1: "Anfänger", l2: "Mittelstufe", l3: "Fortgeschritten", l4: "Wettkampf",
    salva: "Profil speichern", salvo: "Wird gespeichert…", errore: "Das Profil konnte nicht gespeichert werden. Versuch es erneut.",
    adulti: "Erwachsene", under: "Unter", nomeDemo: "Luca", nomeDemoCompleto: "Luca B.", iniz: "LU",
  },
  es: {
    kick: "Paso 3 de 3 · el motor IA parte de aquí", titolo: "Perfil de", fasciaDi: "franja {f}", eta: "Edad", anni: "Años de juego", anniV: "3",
    fascia: "FRANJA DE EDAD", livello: "NIVEL", mano: "MANO DOMINANTE", rov: "REVÉS", obiettivi: "OBJETIVOS", disp: "DISPONIBILIDAD SEMANAL",
    destra: "Diestra", sinistra: "Zurda", dueMani: "Dos manos", unaMano: "Una mano",
    o1: "Saque seguro", o2: "Derecha profunda", o3: "Primer torneo", o4: "Juego en la red",
    l1: "Principiante", l2: "Intermedio", l3: "Avanzado", l4: "Competidor",
    salva: "Guardar perfil", salvo: "Guardando…", errore: "No hemos podido guardar el perfil. Inténtalo de nuevo.",
    adulti: "Adultos", under: "Sub-", nomeDemo: "Luca", nomeDemoCompleto: "Luca B.", iniz: "LU",
  },
};

const LIVELLI = ["principiante", "intermedio", "avanzato", "agonista"] as const;
const ETA: Record<Fascia, string> = { U10: "≤ 10", U12: "≤ 12", U14: "≤ 14", U16: "≤ 16", U18: "≤ 18", ADULTI: "18+" };
// Chiavi dei giorni (la seconda M è mercoledì) e lettere mostrate in ogni lingua.
const GIORNI = [
  { k: "L", it: "L", en: "M", fr: "L", de: "M", es: "L" }, { k: "M", it: "M", en: "T", fr: "M", de: "D", es: "M" },
  { k: "M2", it: "M", en: "W", fr: "M", de: "M", es: "X" },
  { k: "G", it: "G", en: "T", fr: "J", de: "D", es: "J" }, { k: "V", it: "V", en: "F", fr: "V", de: "F", es: "V" },
  { k: "S", it: "S", en: "S", fr: "S", de: "S", es: "S" }, { k: "D", it: "D", en: "S", fr: "D", de: "S", es: "D" },
] as const;

/** 15 · Profilo allievo. Fascia e livello vanno in profiles; il resto è ancora dimostrativo. */
export default function ProfiloAllievo() {
  const t = useT(T);
  const { lang } = useLang();
  const router = useRouter();
  const { profilo } = useProfilo();
  const [fascia, setFascia] = useState<Fascia>("U12");
  const [livello, setLivello] = useState<(typeof LIVELLI)[number]>("principiante");
  const [mano, setMano] = useState(0);
  const [rov, setRov] = useState(0);
  const [obiettivi, setObiettivi] = useState([true, true, false, false]);
  const [giorni, setGiorni] = useState<string[]>(["L", "G", "S"]);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(false);

  // Parte dai valori già salvati nel profilo.
  useEffect(() => {
    if (profilo?.fascia) setFascia(profilo.fascia);
    const l = LIVELLI.find((x) => x === profilo?.livello);
    if (l) setLivello(l);
  }, [profilo]);

  const etichette: Record<(typeof LIVELLI)[number], string> = { principiante: t.l1, intermedio: t.l2, avanzato: t.l3, agonista: t.l4 };
  const nomeFascia = (f: Fascia) => (f === "ADULTI" ? t.adulti : `${t.under}${t.under.endsWith("-") ? "" : " "}${f.slice(1)}`);

  async function salva() {
    setInvio(true); setErrore(false);
    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (!data.user) { router.replace(ROTTE.Benvenuto); return; }
    const { error } = await sb.from("profiles").update({ fascia, livello }).eq("id", data.user.id);
    if (error) { setInvio(false); setErrore(true); return; }
    router.push(ROTTE.Main);
  }

  const nome = profilo?.nome || t.nomeDemo;
  const nomeCompleto = profilo ? `${profilo.nome} ${profilo.cognome[0] ?? ""}.` : t.nomeDemoCompleto;
  const seg = (n: number, opzioni: string[], val: number, set: (i: number) => void) => (
    <div className={c.seg} style={{ gridTemplateColumns: `repeat(${n},minmax(0,1fr))` }}>
      {opzioni.map((o, i) => <button key={o} type="button" className={i === val ? `${c.sg} ${c.on}` : c.sg} aria-pressed={i === val} onClick={() => set(i)}>{o}</button>)}
    </div>
  );

  return (
    <Schermo tab="coach">
      <div className={c.col}>
        <Testata indietro={ROTTE.Allievi} kick={t.kick} titolo={`${t.titolo} ${nome}`} />
        <div className={s.riga}>
          <div className={s.avatar} aria-hidden="true">{profilo ? iniziali(profilo) : t.iniz}</div>
          <div className={c.grow}><div className={s.nome}>{nomeCompleto}</div><div className={s.sotto}>{t.fasciaDi.replace("{f}", nomeFascia(fascia))}</div></div>
          <span className="chip on" style={{ height: 28 }}>{fascia}</span>
        </div>
        <div className={c.g2}>
          <div className={c.inp}><span>{t.eta}</span><span>{ETA[fascia]}</span></div>
          <div className={c.inp}><span>{t.anni}</span><span>{t.anniV}</span></div>
        </div>
        <div className={c.k}>{t.fascia}</div>
        <div className={s.fasce}>
          {FASCE.map((f) => <button key={f} type="button" className={f === fascia ? "chip on" : "chip"} aria-pressed={f === fascia} onClick={() => setFascia(f)}>{f === "ADULTI" ? "18+" : f}</button>)}
        </div>
        <div className={c.k}>{t.livello}</div>
        <div className={c.seg} style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          {LIVELLI.map((l) => <button key={l} type="button" className={l === livello ? `${c.sg} ${c.on}` : c.sg} aria-pressed={l === livello} onClick={() => setLivello(l)}>{etichette[l]}</button>)}
        </div>
        <div className={c.k}>{t.mano}</div>
        {seg(2, [t.destra, t.sinistra], mano, setMano)}
        <div className={c.k}>{t.rov}</div>
        {seg(2, [t.dueMani, t.unaMano], rov, setRov)}
        <div className={c.k}>{t.obiettivi}</div>
        <div className={c.chips}>
          {[t.o1, t.o2, t.o3, t.o4].map((o, i) => (
            <button key={o} type="button" className={obiettivi[i] ? "chip on" : "chip"} aria-pressed={obiettivi[i]} onClick={() => setObiettivi((p) => p.map((x, j) => (j === i ? !x : x)))}>{o}</button>
          ))}
        </div>
        <div className={c.k}>{t.disp}</div>
        <div className={c.g7}>
          {GIORNI.map((g) => (
            <button key={g.k} type="button" className={giorni.includes(g.k) ? "chip on" : "chip"} style={{ justifyContent: "center", padding: 0 }} aria-pressed={giorni.includes(g.k)} onClick={() => setGiorni((p) => (p.includes(g.k) ? p.filter((x) => x !== g.k) : [...p, g.k]))}>{g[lang]}</button>
          ))}
        </div>
        {errore && <div className={s.errore} role="alert">{t.errore}</div>}
        <button type="button" className="btn" onClick={salva} disabled={invio}>{invio ? t.salvo : t.salva}</button>
      </div>
    </Schermo>
  );
}
