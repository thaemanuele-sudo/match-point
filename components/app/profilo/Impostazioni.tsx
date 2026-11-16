"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useLang, useT, type Lingua } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useProfilo } from "@/lib/useProfilo";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { esci, normalizzaTelefono } from "./auth";
import { Chev, Scudo } from "./comuni";
import c from "./comune.module.css";
import s from "./Impostazioni.module.css";

const T = {
  it: {
    titolo: "Impostazioni", account: "ACCOUNT", nome: "Nome", cognome: "Cognome", email: "Email", telefono: "Telefono (con prefisso)",
    salva: "Salva modifiche", salvo: "Salvataggio…", salvato: "Modifiche salvate.", errNome: "Nome e cognome sono obbligatori.", errTel: "Usa il prefisso internazionale, per esempio +39 333 1234567.", errSalva: "Non siamo riusciti a salvare. Riprova.",
    lingua: "LINGUA E VOCE", voce: "Voce dell'assistente", femm: "Femminile", glossario: "Glossario tecnico", glossarioV: "back · slice · coupé",
    profilo: "PROFILO", modalita: "Modalità", abbonamento: "Abbonamento", gratis: "Free",
    ai: "USO DELL'AI", spesa: "Spesa AI questo mese", spesaNd: "non disponibile",
    privacy: "PRIVACY", consensi: "Consensi dei genitori", consensiV: "12 di 14", dati: "Dati conservati in", datiV: "UE", esci: "Esci",
    maestro: "Maestro", giocatore: "Allievo", genitore: "Genitore", ospite: "Match Point", sottotitolo: "Account",
  },
  en: {
    titolo: "Settings", account: "ACCOUNT", nome: "First name", cognome: "Last name", email: "Email", telefono: "Phone (with country code)",
    salva: "Save changes", salvo: "Saving…", salvato: "Changes saved.", errNome: "First and last name are required.", errTel: "Use the international prefix, for example +39 333 1234567.", errSalva: "We couldn't save. Please try again.",
    lingua: "LANGUAGE AND VOICE", voce: "Assistant voice", femm: "Female", glossario: "Technical glossary", glossarioV: "slice · backspin · coupé",
    profilo: "PROFILE", modalita: "Mode", abbonamento: "Subscription", gratis: "Free",
    ai: "AI USAGE", spesa: "AI spend this month", spesaNd: "not available",
    privacy: "PRIVACY", consensi: "Parental consents", consensiV: "12 of 14", dati: "Data stored in", datiV: "EU", esci: "Sign out",
    maestro: "Coach", giocatore: "Student", genitore: "Parent", ospite: "Match Point", sottotitolo: "Account",
  },
};

const LINGUE: { sigla: string; codice: Lingua | null }[] = [
  { sigla: "EN", codice: "en" }, { sigla: "IT", codice: "it" }, { sigla: "ES", codice: null }, { sigla: "FR", codice: null }, { sigla: "DE", codice: null },
];

/** 63 · Impostazioni: dati dell'account veri, lingua, spesa AI del mese e uscita. */
export default function Impostazioni() {
  const t = useT(T);
  const { lang, setLang } = useLang();
  const { profilo } = useProfilo();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [esito, setEsito] = useState<"ok" | "nome" | "tel" | "errore" | null>(null);
  const [invio, setInvio] = useState(false);
  const [spesa, setSpesa] = useState<number | null | "nd">(null);

  useEffect(() => {
    if (!profilo) return;
    setNome(profilo.nome); setCognome(profilo.cognome); setTelefono(profilo.telefono);
    // Spesa AI del mese in corso: la RLS lascia leggere solo le righe dell'utente.
    const ora = new Date();
    const inizio = new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth(), 1)).toISOString();
    supabaseBrowser().from("ai_usage").select("costo_usd").eq("user_id", profilo.id).gte("creato_il", inizio)
      .then(({ data, error }: { data: { costo_usd: number | string }[] | null; error: unknown }) => {
        if (error) return setSpesa("nd");
        setSpesa((data ?? []).reduce((somma, r) => somma + (Number(r.costo_usd) || 0), 0));
      });
  }, [profilo]);

  async function salva(e: FormEvent) {
    e.preventDefault();
    if (!profilo) return;
    setEsito(null);
    const tel = normalizzaTelefono(telefono);
    if (!nome.trim() || !cognome.trim()) return setEsito("nome");
    if (!tel) return setEsito("tel");
    setInvio(true);
    const { error } = await supabaseBrowser().from("profiles").update({ nome: nome.trim(), cognome: cognome.trim(), telefono: tel }).eq("id", profilo.id);
    setInvio(false);
    setEsito(error ? "errore" : "ok");
    if (!error) setTelefono(tel);
  }

  // Cambio lingua: subito nell'app e, se collegato, anche nel profilo.
  function cambiaLingua(l: Lingua) {
    setLang(l);
    if (profilo) void supabaseBrowser().from("profiles").update({ lingua: l }).eq("id", profilo.id);
  }

  const fmt = new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const spesaTesto = spesa === null ? "…" : spesa === "nd" ? t.spesaNd : fmt.format(spesa);
  const tipo = profilo ? t[profilo.tipo_utente] : "—";
  const msg = { ok: t.salvato, nome: t.errNome, tel: t.errTel, errore: t.errSalva };

  const riga = (icona: React.ReactNode, titolo: string, valore: string, href?: string) => {
    const dentro = (<><span className={c.ic}>{icona}</span><span className={`${c.grow} ${c.liT}`}>{titolo}</span><span className={s.valore}>{valore}</span>{href && <Chev />}</>);
    return href ? <Link href={href} className={c.li}>{dentro}</Link> : <div className={c.li}>{dentro}</div>;
  };
  const ico = (d: React.ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

  return (
    <Schermo tab="coach">
      <div className={`${c.col} ${c.fitto}`}>
        <div><div className={c.kick}>{profilo ? `${profilo.nome} ${profilo.cognome} · ${tipo}` : t.sottotitolo}</div><h1 className={c.big}>{t.titolo}</h1></div>

        <div className={c.k} style={{ marginTop: 6 }}>{t.account}</div>
        <form className={`card ${s.form}`} onSubmit={salva} noValidate>
          <div className={s.doppia}>
            <div className={s.campo}><label htmlFor="imp-nome">{t.nome}</label><input id="imp-nome" className="field" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" /></div>
            <div className={s.campo}><label htmlFor="imp-cognome">{t.cognome}</label><input id="imp-cognome" className="field" value={cognome} onChange={(e) => setCognome(e.target.value)} autoComplete="family-name" /></div>
          </div>
          <div className={s.campo}><label htmlFor="imp-email">{t.email}</label><input id="imp-email" className="field" value={profilo?.email ?? ""} disabled readOnly /></div>
          <div className={s.campo}><label htmlFor="imp-tel">{t.telefono}</label><input id="imp-tel" className="field" type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" /></div>
          {esito && <div className={esito === "ok" ? s.ok : s.errore} role={esito === "ok" ? "status" : "alert"}>{msg[esito]}</div>}
          <button type="submit" className="btn" disabled={invio || !profilo}>{invio ? t.salvo : t.salva}</button>
        </form>

        <div className={c.k} style={{ marginTop: 6 }}>{t.lingua}</div>
        <div className={c.g5}>
          {LINGUE.map((l) =>
            l.codice ? (
              <button key={l.sigla} type="button" className={l.codice === lang ? "chip on" : "chip"} style={{ justifyContent: "center", padding: 0 }} aria-pressed={l.codice === lang} onClick={() => cambiaLingua(l.codice!)}>{l.sigla}</button>
            ) : (
              <button key={l.sigla} type="button" className={`chip ${s.off}`} style={{ justifyContent: "center", padding: 0 }} disabled>{l.sigla}</button>
            ),
          )}
        </div>
        {riga(ico(<><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></>), t.voce, t.femm)}
        {riga(ico(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>), t.glossario, t.glossarioV)}

        <div className={c.k} style={{ marginTop: 6 }}>{t.profilo}</div>
        {riga(ico(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>), t.modalita, tipo, ROTTE.SceltaProfilo)}
        {riga(ico(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />), t.abbonamento, t.gratis, ROTTE.Abbonamenti)}

        <div className={c.k} style={{ marginTop: 6 }}>{t.ai}</div>
        <div className={`card ${s.spesa}`}><span>{t.spesa}</span><b>{spesaTesto}</b></div>

        <div className={c.k} style={{ marginTop: 6 }}>{t.privacy}</div>
        {riga(<Scudo size={18} />, t.consensi, t.consensiV)}
        {riga(ico(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>), t.dati, t.datiV)}

        <button type="button" className={`btn ghost ${s.esci}`} style={{ marginTop: 10 }} onClick={() => void esci()}>{t.esci}</button>
      </div>
    </Schermo>
  );
}
