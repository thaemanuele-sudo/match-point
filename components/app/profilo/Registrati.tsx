"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang, useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Schermo } from "@/components/app/Schermo";
import { LinguaChip } from "@/components/app/LinguaChip";
import { ROTTE } from "@/lib/rotte";
import { EMAIL_RE, PAG_ACCESSO, conDopo, normalizzaTelefono, useDopo } from "./auth";
import { Logo } from "./comuni";
import s from "./auth.module.css";

const T = {
  it: {
    titolo: "Crea account", intro: "Bastano un minuto e pochi dati: il maestro, i genitori e il Coach AI ti riconosceranno da qui.",
    nome: "Nome", cognome: "Cognome", email: "Email", telefono: "Telefono (con prefisso)", telHint: "+39 333 1234567",
    password: "Password (almeno 8 caratteri)", conferma: "Conferma password",
    privacy: "Ho letto l'informativa sulla privacy e acconsento al trattamento dei miei dati (GDPR).",
    crea: "Crea account", invio: "Creazione in corso…", gia: "Hai già un account? Accedi",
    obbl: "Campo obbligatorio.", emailNon: "Inserisci un'email valida.", telNon: "Usa il prefisso internazionale, per esempio +39 333 1234567.",
    passCorta: "Almeno 8 caratteri.", passDiverse: "Le due password non coincidono.", privObbl: "Per continuare serve il consenso alla privacy.",
    esiste: "Esiste già un account con questa email. Prova ad accedere.", generico: "Registrazione non riuscita. Riprova tra poco.",
    postaT: "Controlla la posta", postaD: "Ti abbiamo mandato un'email di conferma. Apri il link per attivare l'account, poi accedi.", vaiAccesso: "Vai all'accesso",
  },
  en: {
    titolo: "Create account", intro: "It takes a minute and a few details: your coach, parents and Coach AI will recognise you from here.",
    nome: "First name", cognome: "Last name", email: "Email", telefono: "Phone (with country code)", telHint: "+1 555 123 4567",
    password: "Password (at least 8 characters)", conferma: "Confirm password",
    privacy: "I have read the privacy notice and consent to the processing of my data (GDPR).",
    crea: "Create account", invio: "Creating account…", gia: "Already have an account? Sign in",
    obbl: "Required field.", emailNon: "Enter a valid email.", telNon: "Use the international prefix, for example +39 333 1234567.",
    passCorta: "At least 8 characters.", passDiverse: "The two passwords don't match.", privObbl: "Privacy consent is required to continue.",
    esiste: "An account with this email already exists. Try signing in.", generico: "Sign-up failed. Please try again shortly.",
    postaT: "Check your inbox", postaD: "We sent you a confirmation email. Open the link to activate your account, then sign in.", vaiAccesso: "Go to sign in",
  },
};

type Campi = { nome: string; cognome: string; email: string; telefono: string; password: string; conferma: string; privacy: boolean };

/** Registrazione: i dati vanno nei metadati, il trigger del database crea la riga in profiles. */
export default function Registrati() {
  const t = useT(T);
  const { lang } = useLang();
  const router = useRouter();
  const dopo = useDopo();
  const [f, setF] = useState<Campi>({ nome: "", cognome: "", email: "", telefono: "+39 ", password: "", conferma: "", privacy: false });
  const [err, setErr] = useState<Partial<Record<keyof Campi, string>>>({});
  const [errGen, setErrGen] = useState("");
  const [invio, setInvio] = useState(false);
  const [posta, setPosta] = useState(false);
  const set = <K extends keyof Campi>(k: K, v: Campi[K]) => setF((p) => ({ ...p, [k]: v }));

  function valida() {
    const e: Partial<Record<keyof Campi, string>> = {};
    if (!f.nome.trim()) e.nome = t.obbl;
    if (!f.cognome.trim()) e.cognome = t.obbl;
    if (!EMAIL_RE.test(f.email.trim())) e.email = t.emailNon;
    if (!normalizzaTelefono(f.telefono)) e.telefono = t.telNon;
    if (f.password.length < 8) e.password = t.passCorta;
    if (f.conferma !== f.password) e.conferma = t.passDiverse;
    if (!f.privacy) e.privacy = t.privObbl;
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function invia(ev: FormEvent) {
    ev.preventDefault();
    setErrGen("");
    if (!valida()) return;
    setInvio(true);
    const { data, error } = await supabaseBrowser().auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: { nome: f.nome.trim(), cognome: f.cognome.trim(), telefono: normalizzaTelefono(f.telefono), lingua: lang },
        emailRedirectTo: location.origin + "/app/accesso",
      },
    });
    setInvio(false);
    if (error) {
      setErrGen(error.message.toLowerCase().includes("already") ? t.esiste : t.generico);
      return;
    }
    // Con la conferma email attiva, un indirizzo già registrato torna senza identità: non si crea nulla.
    if (data.user && data.user.identities && data.user.identities.length === 0) return setErrGen(t.esiste);
    if (data.session) router.replace(ROTTE.SceltaProfilo);
    else setPosta(true);
  }

  const campo = (k: keyof Campi, id: string, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className={s.campo}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="field" value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} aria-invalid={!!err[k]} aria-describedby={err[k] ? id + "-e" : undefined} {...extra} />
      {err[k] && <span id={id + "-e"} className={s.errCampo}>{err[k]}</span>}
    </div>
  );

  if (posta)
    return (
      <Schermo>
        <div className={s.pagina}>
          <div className={s.alto}><Logo size={26} /><LinguaChip /></div>
          <h1 className={s.titolo}>{t.postaT}</h1>
          <div className={s.ok} role="status">{t.postaD}</div>
          <Link href={conDopo(PAG_ACCESSO, dopo)} className="btn">{t.vaiAccesso}</Link>
        </div>
      </Schermo>
    );

  return (
    <Schermo>
      <div className={s.pagina}>
        <div className={s.alto}><Logo size={26} /><LinguaChip /></div>
        <h1 className={s.titolo}>{t.titolo}</h1>
        <p className={s.intro}>{t.intro}</p>
        <form className={s.form} onSubmit={invia} noValidate>
          <div className={s.doppia}>
            {campo("nome", "reg-nome", t.nome, { autoComplete: "given-name" })}
            {campo("cognome", "reg-cognome", t.cognome, { autoComplete: "family-name" })}
          </div>
          {campo("email", "reg-email", t.email, { type: "email", inputMode: "email", autoComplete: "email" })}
          {campo("telefono", "reg-tel", t.telefono, { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: t.telHint })}
          {campo("password", "reg-pass", t.password, { type: "password", autoComplete: "new-password" })}
          {campo("conferma", "reg-conf", t.conferma, { type: "password", autoComplete: "new-password" })}
          <label className={s.privacy}>
            <input type="checkbox" checked={f.privacy} onChange={(e) => set("privacy", e.target.checked)} aria-invalid={!!err.privacy} />
            <span>{t.privacy}{err.privacy && <span className={s.errCampo} style={{ display: "block", marginTop: 4 }}>{err.privacy}</span>}</span>
          </label>
          {errGen && <div className={s.errore} role="alert">{errGen}</div>}
          <button type="submit" className="btn" disabled={invio}>{invio ? t.invio : t.crea}</button>
        </form>
        <Link href={conDopo(PAG_ACCESSO, dopo)} className={s.link}>{t.gia}</Link>
      </div>
    </Schermo>
  );
}
