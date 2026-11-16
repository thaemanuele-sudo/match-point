"use client";
import { useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, Interr } from "./stati";
import { useFigli, useNomeDt } from "./famiglia";
import { f, messaggioErrore, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Qualcosa non va?",
  sopra: "Segnalazione riservata",
  info: "La tua segnalazione arriva solo a {dt}, direttore tecnico e responsabile della tutela. Non arriva al maestro e nessuno dello staff vedrà il tuo nome se non lo vuoi. Se riguarda {dt}, arriva al titolare del centro.",
  infoSenzaNome: "La tua segnalazione arriva solo al direttore tecnico, responsabile della tutela. Non arriva al maestro e nessuno dello staff vedrà il tuo nome se non lo vuoi. Se riguarda il direttore tecnico, arriva al titolare del centro.",
  diCosa: "DI COSA SI TRATTA?",
  c_adulto: "Comportamento di un adulto",
  c_sicurezza: "Sicurezza o infortunio",
  c_bullismo: "Problema nel gruppo o bullismo",
  c_chat: "Una chat che mi preoccupa",
  c_altro: "Altro",
  racconta: "Racconta con parole tue cosa è successo, quando e dove…",
  anonima: "Anonima verso il maestro e lo staff",
  anonimaSub: "Solo la responsabile tutela conosce il tuo nome",
  riguardaDt: "Riguarda il direttore tecnico",
  riguardaDtSub: "Arriva solo al titolare del centro",
  invia: "Invia in modo riservato",
  inviando: "Invio…",
  ricevuta: "Segnalazione ricevuta",
  grazie: "Grazie. {dt} la legge oggi stesso e ti risponde entro 24 ore. Se c'è un pericolo immediato chiama subito il 112.",
  grazieSenza: "Grazie. Il direttore tecnico la legge oggi stesso e ti risponde entro 24 ore. Se c'è un pericolo immediato chiama subito il 112.",
  home: "Torna alla home",
  chiama112: "Pericolo immediato? Chiama il 112",
  figlio: "Per quale figlio?",
  caricamento: "Carico…",
  dtGenerico: "il direttore tecnico",
};
const T = { it, en: { ...it } };
const CAT = ["adulto", "sicurezza", "bullismo", "chat", "altro"] as const;

/** G6: segnalazione privata al DT con la RPC `segnala`. Il maestro non la vede mai (RLS). */
export default function GenitoreSegnala() {
  const t = useT(T);
  const { sb, me, base } = useMio();
  const { figli, figlio, setSel } = useFigli("genitore");
  const dt = useNomeDt();
  const [cat, setCat] = useState<(typeof CAT)[number]>("adulto");
  const [testo, setTesto] = useState("");
  const [anon, setAnon] = useState(true);
  const [dtRiguarda, setDtRiguarda] = useState(false);
  const [invio, setInvio] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  async function invia() {
    if (!sb || testo.trim().length < 3 || invio) return;
    setInvio(true);
    setErr(null);
    try {
      const { error } = await sb.rpc("segnala", { categoria: cat, testo: testo.trim(), anonima: anon, per_allievo: figlio?.id ?? null, riguarda_dt: dtRiguarda });
      if (error) throw error;
      setFatto(true);
    } catch (e) {
      setErr(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }

  const cT: Record<string, string> = { adulto: t.c_adulto, sicurezza: t.c_sicurezza, bullismo: t.c_bullismo, chat: t.c_chat, altro: t.c_altro };
  if (!me || figli === null) return <SchermoCentro ruolo="genitore" tab="home" titolo={t.titolo} indietro={base + "/genitore"}><Caric testo={t.caricamento} /></SchermoCentro>;

  return (
    <SchermoCentro ruolo="genitore" tab="home" titolo={t.titolo} sopra={t.sopra} indietro={`${base}/genitore`}>
      <div className="cm-col">
        <div className="card pad" style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#0F1A12", borderColor: "rgba(216,243,74,.25)" }}>
          <span className="ic" style={{ width: 34, height: 34 }}><Ic n="shield" size={18} /></span>
          <div className="v" style={{ fontSize: 13 }}>{dt ? f(t.info, { dt }) : t.infoSenzaNome}</div>
        </div>
        {fatto ? (
          <div className="card pad" style={{ borderColor: "rgba(216,243,74,.3)" }} role="status">
            <div className="disp" style={{ fontSize: 28, fontWeight: 800, fontStyle: "italic", color: "#D8F34A" }}>{t.ricevuta}</div>
            <div className="v" style={{ fontSize: 13.5, marginTop: 6 }}>{dt ? f(t.grazie, { dt }) : t.grazieSenza}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a href={`${base}/genitore`} className="btn2" style={{ height: 42, fontSize: 14 }}>{t.home}</a>
            </div>
          </div>
        ) : (
          <>
            {figli.length > 1 && (
              <div>
                <div className="cm-k" style={{ marginBottom: 6 }}>{t.figlio}</div>
                <div className="chips">
                  {figli.map((x) => (
                    <button key={x.id} type="button" className={x.id === figlio?.id ? "chip on" : "chip"} onClick={() => setSel(x.id)}>{x.nome}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="cm-k" style={{ marginBottom: 6 }}>{t.diCosa}</div>
              <div className="cm-col s">
                {CAT.map((c) => (
                  <button key={c} type="button" className="li" style={{ padding: "9px 12px", width: "100%", cursor: "pointer", fontFamily: "inherit", borderColor: c === cat ? "#D8F34A" : undefined, background: c === cat ? "#1C2210" : undefined }} aria-pressed={c === cat} onClick={() => setCat(c)}>
                    <span className="dot" style={{ background: c === cat ? "#D8F34A" : "#3A3A3C" }} />
                    <span className="grow" style={{ textAlign: "left", fontSize: 14, fontWeight: 700, color: "inherit" }}>{cT[c]}</span>
                  </button>
                ))}
              </div>
            </div>
            <textarea className="cm-ta" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={t.racconta} aria-label={t.racconta} maxLength={2000} />
            <div className="li" style={{ padding: "9px 12px" }}>
              <span className="cm-grow" style={{ fontSize: 13.5, fontWeight: 700 }}>{t.anonima}<span style={{ display: "block", fontWeight: 500, fontSize: 12, color: "#A1A1A6", marginTop: 2 }}>{t.anonimaSub}</span></span>
              <Interr on={anon} onChange={setAnon} label={t.anonima} />
            </div>
            <div className="li" style={{ padding: "9px 12px" }}>
              <span className="cm-grow" style={{ fontSize: 13.5, fontWeight: 700 }}>{t.riguardaDt}<span style={{ display: "block", fontWeight: 500, fontSize: 12, color: "#A1A1A6", marginTop: 2 }}>{t.riguardaDtSub}</span></span>
              <Interr on={dtRiguarda} onChange={setDtRiguarda} label={t.riguardaDt} />
            </div>
            <ErroreC testo={err} />
            <button type="button" className="cm-bt" disabled={invio || testo.trim().length < 3} onClick={invia}>{invio ? t.inviando : t.invia}</button>
            <a href="tel:112" className="cm-bt2" style={{ color: "#FF8A8E" }}><Ic n="phone" size={16} />{t.chiama112}</a>
          </>
        )}
      </div>
    </SchermoCentro>
  );
}
