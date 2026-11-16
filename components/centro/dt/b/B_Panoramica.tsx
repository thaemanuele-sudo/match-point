"use client";
// C1 · Panoramica centro (/c/[slug]/dt). Numeri del giorno e della settimana, cose da guardare, aderenza al Metodo.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { aggiungiGiorni, fmtData, fmtOra, inizioSettimana, isoGiorno } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "../../Schermo";
import { Ic } from "./Ic";
import { useDatiMaestri, type Dati } from "./dati";
import { COL, coloreAderenza, fmtOre, mediana, nomeCompleto, rimpiazza, virgola } from "./util";
import "./b.css";

const it = {
  titolo: "Centro", kick: "Direttore tecnico", avvisi: "Avvisi", impostazioni: "Impostazioni del centro",
  oggi: "Oggi", settimana: "Settimana", periodo: "Periodo",
  lezioniSvolte: "Lezioni svolte", daFare: "{n} da fare", presenze: "Presenze", presenzeSub: "{a} su {b}", nessunaPresenza: "nessuna registrata",
  allieviAttivi: "Allievi attivi", nuovi30: "+{n} in 30 giorni", assenzeRipetute: "{n} assenze ripetute", nessunaAssenzaRip: "nessuna assenza ripetuta",
  maestriCampo: "Maestri in campo", tuttiAttivi: "tutti attivi", tuttiInCampo: "tutti in campo", senzaLezioni: "senza lezioni: {nomi}", nSenzaLezioni: "{n} senza lezioni",
  daGuardare: "Da guardare", quandoOggi: "oggi",
  segnApert: "{n} segnalazioni aperte", segnUna: "1 segnalazione aperta", segnNessuna: "Nessuna segnalazione aperta", segnNessunaSub: "Tutto in ordine · visibili solo a te",
  segnAlta: "{n} priorità alta", segnNuove: "{n} nuove", segnVisibili: "visibili solo a te", alta: "Alta",
  msgSenza: "{n} messaggi senza risposta da 48 ore", msgUno: "1 messaggio senza risposta da 48 ore", msgNessuno: "Nessun messaggio in attesa", msgNessunoSub: "Tutte le famiglie hanno avuto risposta",
  osservazione: "Osservazione in campo", nessunaLezione: "Nessuna lezione in programma", scegliLezione: "Scegli una lezione da osservare dalla scheda del maestro",
  aderenza: "Aderenza al Metodo", nessunDato: "nessuna lezione chiusa nel periodo",
  rispostaMediana: "Risposta mediana in chat: {v}", rispostaNd: "Risposta in chat: nessun dato", sempreVisibili: "messaggi sempre visibili ai genitori",
  aderenzaMaestri: "Aderenza per maestro", caricamento: "Carico i numeri del centro…", errore: "Non riesco a caricare la panoramica", riprova: "Riprova",
  sezioni: "Sezioni",
};
const T = { it, en: { ...it } };

type Per = "oggi" | "settimana";

function calcola(d: Dati, per: Per, t: typeof it) {
  const lun = isoGiorno(inizioSettimana(d.oggi));
  const dom = isoGiorno(aggiungiGiorni(lun, 6));
  const nel = (data: string) => (per === "oggi" ? data === d.oggi : data >= lun && data <= dom);
  const ls = d.lezioni.filter((l) => nel(l.data));
  const svolte = ls.filter((l) => l.stato === "chiusa").length;
  const ids = new Set(ls.map((l) => l.id));
  const pres = d.presenze.filter((p) => ids.has(p.lezione_id));
  const presenti = pres.filter((p) => p.presente).length;
  const attivi = new Set(d.iscrizioni.map((i) => i.allievo_id));
  const dal30 = isoGiorno(aggiungiGiorni(d.oggi, -30));
  const nuovi = new Set(d.iscrizioni.filter((i) => i.dal && i.dal >= dal30).map((i) => i.allievo_id)).size;
  const perAllievo = new Map<string, number>();
  for (const a of d.assenze) perAllievo.set(a.allievo_id, (perAllievo.get(a.allievo_id) ?? 0) + 1);
  const ripetute = [...perAllievo.values()].filter((n) => n >= 2).length;
  const inCampo = new Set(ls.map((l) => l.maestro_id).filter((x): x is string => !!x && d.maestri.some((m) => m.m.id === x)));
  const liberi = d.maestri.filter((m) => !inCampo.has(m.m.id));
  const subMaestri = !liberi.length ? (per === "oggi" ? t.tuttiInCampo : t.tuttiAttivi)
    : liberi.length === 1 ? rimpiazza(t.senzaLezioni, { nomi: liberi[0].m.nome }) : rimpiazza(t.nSenzaLezioni, { n: liberi.length });
  return [
    { v: `${svolte}/${ls.length}`, l: t.lezioniSvolte, sub: rimpiazza(t.daFare, { n: ls.length - svolte }), col: COL.palla },
    { v: pres.length ? `${Math.round((presenti / pres.length) * 100)}%` : "—", l: t.presenze, sub: pres.length ? rimpiazza(t.presenzeSub, { a: presenti, b: pres.length }) : t.nessunaPresenza, col: COL.verde },
    { v: String(attivi.size), l: t.allieviAttivi, sub: per === "oggi" ? rimpiazza(t.nuovi30, { n: nuovi }) : ripetute ? rimpiazza(t.assenzeRipetute, { n: ripetute }) : t.nessunaAssenzaRip, col: COL.palla },
    { v: `${inCampo.size}/${d.maestri.length}`, l: t.maestriCampo, sub: subMaestri, col: COL.palla },
  ];
}

export default function BPanoramica() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const R = rotta(centro.slug);
  const { dati, carica, errore, ricarica } = useDatiMaestri();
  const [per, setPer] = useState<Per>("oggi");
  void sb;

  const numeri = useMemo(() => (dati ? calcola(dati, per, t) : []), [dati, per, t]);

  // aderenza del centro: media delle aderenze dei maestri pesata sulle lezioni considerate
  const aderenza = useMemo(() => {
    if (!dati) return null;
    const v = dati.maestri.filter((m) => m.aderenza != null && m.ultime.length);
    const pesi = v.reduce((s, m) => s + m.ultime.length, 0);
    return pesi ? Math.round(v.reduce((s, m) => s + (m.aderenza as number) * m.ultime.length, 0) / pesi) : null;
  }, [dati]);

  const guarda = useMemo(() => {
    if (!dati) return null;
    const segn = dati.segnalazioni;
    const alta = segn.filter((s) => s.priorita === "alta").length;
    const nuove = segn.filter((s) => s.stato === "nuova").length;
    const senza = dati.maestri.filter((m) => m.senzaRisposta > 0).sort((a, b) => b.senzaRisposta - a.senzaRisposta);
    const totSenza = senza.reduce((s, m) => s + m.senzaRisposta, 0);
    // prossima lezione ancora da fare (oggi dall'ora attuale in poi, altrimenti la successiva)
    const ora = fmtOra(new Date());
    const prossima = dati.lezioni
      .filter((l) => l.stato !== "chiusa" && (l.data > dati.oggi || (l.data === dati.oggi && (fmtOra(l.ora) >= ora || l.stato === "in_corso"))))
      .sort((a, b) => (a.data + fmtOra(a.ora)).localeCompare(b.data + fmtOra(b.ora)))[0];
    return { segn, alta, nuove, senza, totSenza, prossima };
  }, [dati]);

  const mediaRisposta = dati ? mediana(dati.risposteOre) : null;
  const nomeDi = (id: string | null) => nomeCompleto(dati?.membri.find((m) => m.id === id));

  return (
    <SchermoCentro
      ruolo="dt"
      tab="centro"
      titolo={t.titolo}
      sopra={`${t.kick} · ${centro.nome}`}
      azioni={
        <>
          <Link href={R.dt.avvisi} className="icon" aria-label={t.avvisi}><Ic n="bell" s={18} /></Link>
          <Link href={R.dt.impostazioni} className="icon" aria-label={t.impostazioni}><Ic n="gear" s={18} /></Link>
        </>
      }
    >
      {carica && !dati ? <div className="note" role="status">{t.caricamento}</div> : null}
      {errore ? (
        <div className="note" role="alert">
          {t.errore}: {errore} <button className="chip" onClick={ricarica}>{t.riprova}</button>
        </div>
      ) : null}
      {dati && guarda ? (
        <div className="b-pan">
          <div className="b-pan-num">
            <div className="seg b-pan-seg" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }} role="group" aria-label={t.periodo}>
              {(["oggi", "settimana"] as const).map((p) => (
                <button key={p} className={p === per ? "sg on" : "sg"} aria-pressed={p === per} onClick={() => setPer(p)}>{p === "oggi" ? t.oggi : t.settimana}</button>
              ))}
            </div>
            <div className="g2 b-pan-tiles">
              {numeri.map((n) => (
                <div key={n.l} className="tile" style={{ padding: "10px 12px 11px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                    <b style={{ color: n.col }}>{n.v}</b>
                    <span style={{ fontSize: 11 }}>{n.sub}</span>
                  </div>
                  <span style={{ display: "block", marginTop: 3 }}>{n.l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="b-col">
            <div className="sec" style={{ marginTop: 2 }}><h2>{t.daGuardare}</h2><span className="muted">{t.quandoOggi}</span></div>

            {guarda.segn.length ? (
              <Link href={R.dt.segnalazioni} className="li" style={{ borderColor: "rgba(255,90,95,.45)", padding: "10px 12px" }}>
                <span className="ic" style={{ background: "rgba(255,90,95,.16)", color: COL.rosso }}><Ic n="shield" /></span>
                <span className="grow">
                  <span className="t" style={{ display: "block" }}>{guarda.segn.length === 1 ? t.segnUna : rimpiazza(t.segnApert, { n: guarda.segn.length })}</span>
                  <span className="s" style={{ display: "block" }}>
                    {[guarda.alta ? rimpiazza(t.segnAlta, { n: guarda.alta }) : "", guarda.nuove ? rimpiazza(t.segnNuove, { n: guarda.nuove }) : "", t.segnVisibili].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {guarda.alta ? <span className="tag" style={{ background: "rgba(255,90,95,.18)", color: "#FF8A8E" }}>{t.alta}</span> : null}
              </Link>
            ) : (
              <Link href={R.dt.segnalazioni} className="li" style={{ padding: "10px 12px" }}>
                <span className="ic" style={{ color: COL.verde }}><Ic n="shield" /></span>
                <span className="grow"><span className="t" style={{ display: "block" }}>{t.segnNessuna}</span><span className="s" style={{ display: "block" }}>{t.segnNessunaSub}</span></span>
              </Link>
            )}

            <Link href={R.dt.maestri} className="li" style={{ padding: "10px 12px" }}>
              <span className="ic" style={{ background: "rgba(255,159,67,.16)", color: COL.arancio }}><Ic n="chat" /></span>
              <span className="grow">
                <span className="t" style={{ display: "block" }}>
                  {guarda.totSenza === 0 ? t.msgNessuno : guarda.totSenza === 1 ? t.msgUno : rimpiazza(t.msgSenza, { n: guarda.totSenza })}
                </span>
                <span className="s" style={{ display: "block" }}>
                  {guarda.totSenza === 0 ? t.msgNessunoSub : guarda.senza.map((m) => `${nomeCompleto(m.m)} ${m.senzaRisposta}`).join(" · ")}
                </span>
              </span>
              <Ic n="next" s={16} w={2.4} />
            </Link>

            {guarda.prossima ? (
              <Link href={R.dt.osservazione(guarda.prossima.id)} className="li" style={{ padding: "10px 12px" }}>
                <span className="ic"><Ic n="eye" /></span>
                <span className="grow">
                  <span className="t" style={{ display: "block" }}>{t.osservazione}</span>
                  <span className="s" style={{ display: "block" }}>
                    {guarda.prossima.data === dati.oggi ? t.oggi : fmtData(guarda.prossima.data)} {fmtOra(guarda.prossima.ora)} · {nomeDi(guarda.prossima.maestro_id)} · {dati.gruppi.find((g) => g.id === guarda.prossima!.gruppo_id)?.nome ?? ""}
                  </span>
                </span>
                <Ic n="next" s={16} w={2.4} />
              </Link>
            ) : (
              <div className="li" style={{ padding: "10px 12px" }}>
                <span className="ic"><Ic n="eye" /></span>
                <span className="grow"><span className="t" style={{ display: "block" }}>{t.osservazione}</span><span className="s" style={{ display: "block" }}>{t.nessunaLezione}</span></span>
              </div>
            )}
          </div>

          <div className="b-col">
            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <div className="sec"><h2 style={{ fontSize: 15 }}>{t.aderenza}</h2><span className="muted" style={{ fontSize: 12 }}>{dati.programmaLabel}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="disp" style={{ fontSize: 34, fontWeight: 800, color: coloreAderenza(aderenza), lineHeight: 1 }}>{aderenza == null ? "—" : `${aderenza}%`}</span>
                <div className="grow"><div className="bar" style={{ height: 10 }}><i style={{ width: `${aderenza ?? 0}%`, background: coloreAderenza(aderenza) }} /></div></div>
              </div>
              <div className="kick">
                {(mediaRisposta == null ? t.rispostaNd : rimpiazza(t.rispostaMediana, { v: fmtOre(mediaRisposta).replace(" h", " ore") })) + " · " + t.sempreVisibili}
              </div>
              {aderenza == null ? <div className="kick">{t.nessunDato}</div> : null}
            </div>

            <div className="card pad b-desk" style={{ flexDirection: "column", gap: 8 }}>
              <div className="sec"><h2 style={{ fontSize: 15 }}>{t.aderenzaMaestri}</h2></div>
              {dati.maestri.map((m) => (
                <Link key={m.m.id} href={R.dt.maestro(m.m.id)} style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr) 44px", gap: 10, alignItems: "center", color: "inherit", textDecoration: "none", fontSize: 13 }}>
                  <span>{nomeCompleto(m.m)}</span>
                  <span className="bar"><i style={{ width: `${m.aderenza ?? 0}%`, background: coloreAderenza(m.aderenza) }} /></span>
                  <b className="disp" style={{ fontSize: 16, textAlign: "right", color: coloreAderenza(m.aderenza) }}>{m.aderenza == null ? "—" : `${m.aderenza}%`}</b>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </SchermoCentro>
  );
}

void virgola;
