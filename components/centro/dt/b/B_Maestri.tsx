"use client";
// C2 · Maestri (/c/[slug]/dt/maestri). Lista con aderenza al Metodo, lezioni, allievi, progressi, valutazioni da fare,
// tempo di risposta in chat e formazione. Ordinabile per aderenza, risposta o valutazioni.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "../../Schermo";
import { Ic } from "./Ic";
import { useDatiMaestri, type MaestroStat } from "./dati";
import { COL, coloreAderenza, coloreAvatar, fmtOre, iniziali, nomeCompleto, rimpiazza } from "./util";
import "./b.css";

const it = {
  titolo: "Maestri", kick: "Direttore tecnico · {n} maestri", formazione: "Formazione dei maestri", ordina: "ORDINA PER",
  aderenza: "Aderenza", risposta: "Risposta", valutazioni: "Da valutare",
  aderenzaK: "ADERENZA", lezioni: "lezioni", allievi: "allievi", progressi: "progressi", daValutare: "da valutare",
  rispostaTag: "Risposta {v}", formazioneTag: "Formazione {a}/{b}", scheda: "Scheda di {nome}",
  vuoto: "Nessun maestro attivo nel centro. Inviti e ruoli si gestiscono dall'organizzazione.", caricamento: "Carico i maestri…",
  errore: "Non riesco a caricare i maestri", riprova: "Riprova",
};
const T = { it, en: { ...it } };

type Ord = "aderenza" | "risposta" | "valutazioni";

const ordina = (m: MaestroStat[], o: Ord) =>
  [...m].sort((a, b) => {
    // i valori mancanti vanno in fondo: un maestro senza dati non deve sembrare il migliore
    if (o === "aderenza") return (b.aderenza ?? -1) - (a.aderenza ?? -1);
    if (o === "risposta") return (a.rispostaOre ?? 1e9) - (b.rispostaOre ?? 1e9);
    return b.mancanti - a.mancanti;
  });

export default function BMaestri() {
  const t = useT(T);
  const { centro } = useCentro();
  const R = rotta(centro.slug);
  const { dati, carica, errore, ricarica } = useDatiMaestri();
  const [ord, setOrd] = useState<Ord>("aderenza");
  const lista = useMemo(() => (dati ? ordina(dati.maestri, ord) : []), [dati, ord]);

  return (
    <SchermoCentro
      ruolo="dt"
      tab="maestri"
      titolo={t.titolo}
      sopra={rimpiazza(t.kick, { n: dati?.maestri.length ?? 0 })}
      azioni={<Link href={R.dt.formazione} className="icon" aria-label={t.formazione}><Ic n="doc" s={18} /></Link>}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="k" style={{ flex: "none" }}>{t.ordina}</span>
        <div className="chips" role="group" aria-label={t.ordina}>
          {(["aderenza", "risposta", "valutazioni"] as const).map((o) => (
            <button key={o} className={o === ord ? "chip on" : "chip"} aria-pressed={o === ord} onClick={() => setOrd(o)} style={{ height: 30, padding: "0 11px" }}>{t[o]}</button>
          ))}
        </div>
      </div>
      {carica && !dati ? <div className="note" role="status">{t.caricamento}</div> : null}
      {errore ? <div className="note" role="alert">{t.errore}: {errore} <button className="chip" onClick={ricarica}>{t.riprova}</button></div> : null}
      {dati && !lista.length ? <div className="note">{t.vuoto}</div> : null}
      <div className="b-lista">
        {lista.map((m) => {
          const colA = coloreAderenza(m.aderenza);
          const lento = m.rispostaOre != null && m.rispostaOre > 24;
          const nome = nomeCompleto(m.m);
          return (
            <Link key={m.m.id} href={R.dt.maestro(m.m.id)} className="li" style={{ display: "block", padding: "10px 12px" }} aria-label={rimpiazza(t.scheda, { nome })}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 42, height: 42, borderRadius: "50%", background: coloreAvatar(m.m.id), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" }}>{iniziali(m.m)}</span>
                <span className="grow"><span className="t" style={{ display: "block" }}>{nome}</span><span className="s" style={{ display: "block", marginTop: 0 }}>{m.etichetta}</span></span>
                <span style={{ textAlign: "right" }}>
                  <span className="disp" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: colA }}>{m.aderenza == null ? "—" : `${m.aderenza}%`}</span>
                  <span className="k" style={{ display: "block", marginTop: -1 }}>{t.aderenzaK}</span>
                </span>
              </div>
              <div className="bar" style={{ margin: "7px 0", height: 6 }}><i style={{ width: `${m.aderenza ?? 0}%`, background: colA }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4, fontSize: 11.5, color: COL.muto }}>
                <span><b style={{ color: "#F3F6F1", fontSize: 14 }}>{m.lezioniChiuse}</b> {t.lezioni}</span>
                <span><b style={{ color: "#F3F6F1", fontSize: 14 }}>{m.nAllievi}</b> {t.allievi}</span>
                <span><b style={{ color: COL.verde, fontSize: 14 }}>{m.progressi == null ? "—" : `${m.progressi > 0 ? "+" : ""}${m.progressi}%`}</b> {t.progressi}</span>
                <span><b style={{ fontSize: 14, color: m.mancanti >= 3 ? COL.arancio : m.mancanti > 0 ? COL.giallo : COL.verde }}>{m.mancanti}</b> {t.daValutare}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span className="tag" style={lento ? { background: "rgba(255,159,67,.18)", color: "#FFB36B" } : undefined}>{rimpiazza(t.rispostaTag, { v: fmtOre(m.rispostaOre) })}</span>
                <span className="tag">{rimpiazza(t.formazioneTag, { a: m.formFatti, b: m.formTot })}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </SchermoCentro>
  );
}
