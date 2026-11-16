"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Schermo } from "@/components/app/Schermo";
import { LinguaChip } from "@/components/app/LinguaChip";
import { ROTTE } from "@/lib/rotte";
import { EMAIL_RE, PAG_ACCESSO, PAG_RECUPERO } from "./auth";
import { Logo } from "./comuni";
import s from "./auth.module.css";

const T = {
  it: {
    titolo: "Password dimenticata", intro: "Scrivi la tua email: ti mandiamo un link per scegliere una nuova password.",
    email: "Email", manda: "Invia il link", invio: "Invio in corso…", inviata: "Se l'email è registrata, tra poco troverai il link nella posta.",
    emailNon: "Inserisci un'email valida.", generico: "Non siamo riusciti a inviare l'email. Riprova tra poco.", torna: "Torna all'accesso",
    nuovaT: "Nuova password", nuovaI: "Scegli la nuova password per il tuo account.", nuova: "Nuova password (almeno 8 caratteri)", conferma: "Conferma password",
    salva: "Salva password", salvo: "Salvataggio…", corta: "Almeno 8 caratteri.", diverse: "Le due password non coincidono.",
    fatto: "Password aggiornata. Ti portiamo nell'app…", errSalva: "Non siamo riusciti ad aggiornare la password. Il link potrebbe essere scaduto: richiedine uno nuovo.",
  },
  en: {
    titolo: "Forgot password", intro: "Enter your email and we'll send you a link to choose a new password.",
    email: "Email", manda: "Send the link", invio: "Sending…", inviata: "If the email is registered, you'll find the link in your inbox shortly.",
    emailNon: "Enter a valid email.", generico: "We couldn't send the email. Please try again shortly.", torna: "Back to sign in",
    nuovaT: "New password", nuovaI: "Choose the new password for your account.", nuova: "New password (at least 8 characters)", conferma: "Confirm password",
    salva: "Save password", salvo: "Saving…", corta: "At least 8 characters.", diverse: "The two passwords don't match.",
    fatto: "Password updated. Taking you to the app…", errSalva: "We couldn't update the password. The link may have expired: request a new one.",
  },
};

/** Recupero password: richiesta del link e, quando si torna dal link, form della nuova password. */
export default function Recupero() {
  const t = useT(T);
  const [modo, setModo] = useState<"richiesta" | "nuova">("richiesta");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; testo: string } | null>(null);
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState(false);

  // Il link della posta riporta qui con il token di recupero (nell'hash o come ?code=).
  useEffect(() => {
    const sb = supabaseBrowser();
    const h = window.location.hash, q = window.location.search;
    if (h.includes("type=recovery") || q.includes("code=")) setModo("nuova");
    const { data: sub } = sb.auth.onAuthStateChange((ev: string) => { if (ev === "PASSWORD_RECOVERY") setModo("nuova"); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function richiedi(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!EMAIL_RE.test(email.trim())) return setMsg({ tipo: "err", testo: t.emailNon });
    setInvio(true);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + PAG_RECUPERO });
    setInvio(false);
    setMsg(error ? { tipo: "err", testo: t.generico } : { tipo: "ok", testo: t.inviata });
  }

  async function salva(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pass.length < 8) return setMsg({ tipo: "err", testo: t.corta });
    if (pass !== conf) return setMsg({ tipo: "err", testo: t.diverse });
    setInvio(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pass });
    setInvio(false);
    if (error) return setMsg({ tipo: "err", testo: t.errSalva });
    setFatto(true);
    setMsg({ tipo: "ok", testo: t.fatto });
    setTimeout(() => window.location.assign(ROTTE.Main), 1500);
  }

  const nuova = modo === "nuova";
  return (
    <Schermo>
      <div className={s.pagina}>
        <div className={s.alto}><Logo size={26} /><LinguaChip /></div>
        <h1 className={s.titolo}>{nuova ? t.nuovaT : t.titolo}</h1>
        <p className={s.intro}>{nuova ? t.nuovaI : t.intro}</p>
        {nuova ? (
          <form className={s.form} onSubmit={salva} noValidate>
            <div className={s.campo}>
              <label htmlFor="rec-pass">{t.nuova}</label>
              <input id="rec-pass" className="field" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </div>
            <div className={s.campo}>
              <label htmlFor="rec-conf">{t.conferma}</label>
              <input id="rec-conf" className="field" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
            </div>
            {msg && <div className={msg.tipo === "ok" ? s.ok : s.errore} role={msg.tipo === "ok" ? "status" : "alert"}>{msg.testo}</div>}
            <button type="submit" className="btn" disabled={invio || fatto}>{invio ? t.salvo : t.salva}</button>
          </form>
        ) : (
          <form className={s.form} onSubmit={richiedi} noValidate>
            <div className={s.campo}>
              <label htmlFor="rec-email">{t.email}</label>
              <input id="rec-email" className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {msg && <div className={msg.tipo === "ok" ? s.ok : s.errore} role={msg.tipo === "ok" ? "status" : "alert"}>{msg.testo}</div>}
            <button type="submit" className="btn" disabled={invio}>{invio ? t.invio : t.manda}</button>
          </form>
        )}
        <div className={s.spazio} />
        <Link href={PAG_ACCESSO} className={s.link}>{t.torna}</Link>
      </div>
    </Schermo>
  );
}
