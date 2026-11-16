"use client";
import { useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC } from "./stati";
import { useFigli, useNomeDt } from "./famiglia";
import { f, messaggioErrore, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Qualcosa non va?",
  sopra: "Qui puoi dirci tutto",
  nonSbagliato: "Non hai fatto niente di sbagliato.",
  info: "Se qualcosa ti preoccupa, dillo qui. Il messaggio arriva a {nome}, responsabile del centro. Il maestro non lo vede.",
  infoSenza: "Se qualcosa ti preoccupa, dillo qui. Il messaggio arriva al responsabile del centro. Il maestro non lo vede.",
  cosa: "COSA È SUCCESSO?",
  o_disagio: "Mi sento a disagio",
  o_infortunio: "Mi sono fatto male",
  o_gruppo: "Problema con il gruppo",
  o_altro: "Altro",
  manda: "Manda a {nome}",
  mandaSenza: "Manda al responsabile",
  riguarda: "Riguarda {nome}?",
  riguardaSenza: "Riguarda il responsabile?",
  riguardaNota: "Se riguarda {nome}, il messaggio non va a {nome}: va al capo del centro.",
  riguardaNotaSenza: "Se riguarda il responsabile, il messaggio va al capo del centro.",
  inviando: "Invio…",
  urgente: "Se è urgente, vai subito da un adulto di cui ti fidi o chiama il 112.",
  chiama: "Chiama il 112",
  grazie: "Grazie per avercelo detto!",
  ok: "{nome} ha ricevuto il tuo messaggio e ti scriverà presto. Sei stato coraggioso.",
  okSenza: "Il responsabile ha ricevuto il tuo messaggio e ti scriverà presto. Sei stato coraggioso.",
  mamma: "Nel frattempo puoi parlarne con mamma o papà.",
  torna: "Torna al percorso",
  caricamento: "Carico…",
};
const T = { it, en: { ...it } };
const OPZ = [
  { k: "disagio", p: "heart" },
  { k: "infortunio", p: "plus" },
  { k: "gruppo", p: "users" },
  { k: "altro", p: "chat" },
] as const;

/** A4: pulsanti grandi per il bambino. Arriva al DT, mai al maestro; per le urgenze c'è il 112. */
export default function AllievoSegnala() {
  const t = useT(T);
  const { sb, me, base, centro } = useMio();
  const { figlio } = useFigli("allievo");
  const dt = useNomeDt();
  const primo = dt.split(" ")[0];
  const [sel, setSel] = useState<number>(-1);
  const [invio, setInvio] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const [riguardaDt, setRiguardaDt] = useState(false);
  const lab: Record<string, string> = { disagio: t.o_disagio, infortunio: t.o_infortunio, gruppo: t.o_gruppo, altro: t.o_altro };

  async function invia() {
    if (!sb || sel < 0 || invio) return;
    setInvio(true);
    setErr(null);
    try {
      const k = OPZ[sel].k;
      // il bambino non scrive un testo: la categoria scelta è il messaggio. Non è anonima (il DT deve poter rispondere) ma il maestro non la vede mai.
      const { error } = await sb.rpc("segnala", { categoria: k, testo: lab[k], anonima: false, per_allievo: figlio?.id ?? null, riguarda_dt: riguardaDt, centro: centro?.id ?? null });
      if (error) throw error;
      setFatto(true);
    } catch (e) {
      setErr(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }

  if (!me) return <SchermoCentro ruolo="allievo" tab="aiuto" titolo={t.titolo}><Caric testo={t.caricamento} /></SchermoCentro>;
  return (
    <SchermoCentro ruolo="allievo" tab="aiuto" titolo={t.titolo} sopra={t.sopra}>
      <div className="cm-col">
        <div className="card pad" style={{ background: "#0F1A12", borderColor: "rgba(216,243,74,.25)" }}>
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{t.nonSbagliato}</div>
          <div className="v" style={{ fontSize: 13.5, marginTop: 5, color: "#E5E5EA" }}>{primo ? f(t.info, { nome: primo }) : t.infoSenza}</div>
        </div>
        {fatto ? (
          <div className="card pad" style={{ borderColor: "rgba(216,243,74,.4)" }} role="status">
            <div className="disp" style={{ fontSize: 32, fontWeight: 800, fontStyle: "italic", color: "#D8F34A", lineHeight: 1.05 }}>{t.grazie}</div>
            <div className="v" style={{ fontSize: 14, marginTop: 8, color: "#F3F6F1" }}>{primo ? f(t.ok, { nome: primo }) : t.okSenza}</div>
            <div className="v" style={{ fontSize: 13, marginTop: 6, color: "#A1A1A6" }}>{t.mamma}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <a href={`${base}/allievo`} className="btn2" style={{ height: 44, fontSize: 14 }}>{t.torna}</a>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="cm-k" style={{ marginBottom: 7 }}>{t.cosa}</div>
              <div className="cm-grandi">
                {OPZ.map((o, i) => (
                  <button key={o.k} type="button" className="cm-grande" aria-pressed={i === sel} onClick={() => setSel(i)}>
                    <Ic n={o.p} size={30} />
                    <span>{lab[o.k]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button type="button" className="cm-grande" style={{ width: "100%" }} aria-pressed={riguardaDt} onClick={() => setRiguardaDt((v) => !v)}>
                <Ic n="users" size={30} />
                <span>{primo ? f(t.riguarda, { nome: primo }) : t.riguardaSenza}</span>
              </button>
              {riguardaDt && <div className="v" style={{ fontSize: 13, marginTop: 6, color: "#A1A1A6" }}>{primo ? f(t.riguardaNota, { nome: primo }) : t.riguardaNotaSenza}</div>}
            </div>
            <ErroreC testo={err} />
            <button type="button" className="cm-bt" style={{ height: 56, fontSize: 17 }} disabled={sel < 0 || invio} onClick={invia}>
              {invio ? t.inviando : primo ? f(t.manda, { nome: primo }) : t.mandaSenza}
            </button>
            <div style={{ fontSize: 12, color: "#A1A1A6", textAlign: "center" }}>{t.urgente}</div>
            <a href="tel:112" className="cm-bt2" style={{ color: "#FF8A8E", alignSelf: "center" }}><Ic n="phone" size={16} />{t.chiama}</a>
          </>
        )}
      </div>
    </SchermoCentro>
  );
}
