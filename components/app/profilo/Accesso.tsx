"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Schermo } from "@/components/app/Schermo";
import { LinguaChip } from "@/components/app/LinguaChip";
import { ROTTE } from "@/lib/rotte";
import { EMAIL_RE, PAG_RECUPERO, PAG_REGISTRATI, conDopo, useDopo } from "./auth";
import { Logo } from "./comuni";
import s from "./auth.module.css";

const T = {
  it: {
    titolo: "Accedi", intro: "Bentornato. Entra con la tua email e la tua password.",
    email: "Email", password: "Password", dimenticata: "Password dimenticata?", entra: "Accedi", invio: "Accesso in corso…",
    nuovo: "Non hai un account? Crea account",
    emailNon: "Inserisci un'email valida.", passVuota: "Inserisci la password.",
    credenziali: "Email o password non corrette.", nonConfermata: "Devi prima confermare l'email: controlla la posta.",
    generico: "Accesso non riuscito. Riprova tra poco.",
  },
  en: {
    titolo: "Sign in", intro: "Welcome back. Sign in with your email and password.",
    email: "Email", password: "Password", dimenticata: "Forgot your password?", entra: "Sign in", invio: "Signing in…",
    nuovo: "No account yet? Create account",
    emailNon: "Enter a valid email.", passVuota: "Enter your password.",
    credenziali: "Wrong email or password.", nonConfermata: "Please confirm your email first: check your inbox.",
    generico: "Sign-in failed. Please try again shortly.",
  },
  fr: {
    titolo: "Connexion", intro: "Content de te revoir. Connecte-toi avec ton email et ton mot de passe.",
    email: "Email", password: "Mot de passe", dimenticata: "Mot de passe oublié ?", entra: "Se connecter", invio: "Connexion en cours…",
    nuovo: "Pas encore de compte ? Créer un compte",
    emailNon: "Saisis une adresse email valide.", passVuota: "Saisis ton mot de passe.",
    credenziali: "Email ou mot de passe incorrect.", nonConfermata: "Confirme d'abord ton email : vérifie ta boîte de réception.",
    generico: "Connexion impossible. Réessaie dans un instant.",
  },
  de: {
    titolo: "Anmelden", intro: "Schön, dich wiederzusehen. Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.",
    email: "E-Mail", password: "Passwort", dimenticata: "Passwort vergessen?", entra: "Anmelden", invio: "Anmeldung läuft…",
    nuovo: "Noch kein Konto? Konto erstellen",
    emailNon: "Gib eine gültige E-Mail-Adresse ein.", passVuota: "Gib dein Passwort ein.",
    credenziali: "E-Mail oder Passwort falsch.", nonConfermata: "Bitte bestätige zuerst deine E-Mail: Prüfe dein Postfach.",
    generico: "Anmeldung fehlgeschlagen. Bitte versuche es gleich noch einmal.",
  },
  es: {
    titolo: "Acceder", intro: "Qué bueno verte de nuevo. Entra con tu email y tu contraseña.",
    email: "Email", password: "Contraseña", dimenticata: "¿Olvidaste tu contraseña?", entra: "Acceder", invio: "Accediendo…",
    nuovo: "¿No tienes cuenta? Crear cuenta",
    emailNon: "Introduce un email válido.", passVuota: "Introduce tu contraseña.",
    credenziali: "Email o contraseña incorrectos.", nonConfermata: "Confirma primero tu email: revisa tu bandeja de entrada.",
    generico: "No se pudo acceder. Inténtalo de nuevo en un momento.",
  },
};

/** Accesso con email e password (Supabase Auth). */
export default function Accesso() {
  const t = useT(T);
  const dopo = useDopo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);

  const vai = (d: string) => window.location.assign(d || ROTTE.Main);

  // Già collegato (o appena tornato dal link di conferma email): si prosegue senza chiedere di nuovo la password.
  useEffect(() => {
    const sb = supabaseBrowser();
    const daLink = window.location.search.includes("code=") || window.location.hash.includes("access_token");
    const { data: sub } = sb.auth.onAuthStateChange((ev: string) => {
      if (daLink && ev === "SIGNED_IN") vai(dopo);
    });
    sb.auth.getUser().then(({ data }: { data: { user: unknown } }) => { if (data.user && !daLink) vai(dopo); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dopo]);

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore("");
    if (!EMAIL_RE.test(email.trim())) return setErrore(t.emailNon);
    if (!password) return setErrore(t.passVuota);
    setInvio(true);
    const sb = supabaseBrowser();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setInvio(false);
      const m = (error?.message ?? "").toLowerCase();
      setErrore(m.includes("invalid login") ? t.credenziali : m.includes("not confirmed") ? t.nonConfermata : t.generico);
      return;
    }
    // L'ultimo accesso è solo un'informazione per l'admin: se fallisce non blocca l'ingresso.
    await sb.from("profiles").update({ ultimo_accesso: new Date().toISOString() }).eq("id", data.user.id);
    vai(dopo);
  }

  return (
    <Schermo>
      <div className={s.pagina}>
        <div className={s.alto}><Logo size={26} /><LinguaChip /></div>
        <h1 className={s.titolo}>{t.titolo}</h1>
        <p className={s.intro}>{t.intro}</p>
        <form className={s.form} onSubmit={invia} noValidate>
          <div className={s.campo}>
            <label htmlFor="acc-email">{t.email}</label>
            <input id="acc-email" className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor="acc-pass">{t.password}</label>
            <input id="acc-pass" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Link href={PAG_RECUPERO} className={s.destra}>{t.dimenticata}</Link>
          {errore && <div className={s.errore} role="alert">{errore}</div>}
          <button type="submit" className="btn" disabled={invio}>{invio ? t.invio : t.entra}</button>
        </form>
        <div className={s.spazio} />
        <Link href={conDopo(PAG_REGISTRATI, dopo)} className={s.link}>{t.nuovo}</Link>
      </div>
    </Schermo>
  );
}
