"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { useCartaAttiva } from "./hooks";
import s from "./pagamenti.module.css";
import {
  PER_IT, aggiungiGiorni, etichettaMetodo, etichettaQuota, euro, fmt, fmtCorto, fmtLungo, giorniGruppo, infoPeriodo, leggiImp,
  oggiISO, scaricaRicevuta, statoEff, titoloPeriodo,
  type AllievoMin, type Corso, type GruppoMin, type Quota,
} from "./util";

const IT = {
  ...PER_IT,
  titolo: "Pagamenti",
  famiglia: "Famiglia {c}",
  scegliFiglio: "Scegli il figlio",
  quotaDi: "QUOTA DI {p}",
  inAttesa: "In attesa",
  scaduta: "Scaduta",
  pagata: "Pagata",
  scade: "Scade",
  saldata: "Saldata",
  scadutaIl: "Scaduta il",
  importo: "Importo {i}",
  lezioni1: "1 lezione a settimana",
  lezioniN: "{n} lezioni a settimana",
  pagaCarta: "Paga con carta",
  pagaPrimaRata: "Paga la 1ª rata ({i})",
  pagaSeconda: "Paga la 2ª rata",
  cartaNonAttiva: "Pagamento con carta non ancora attivo per questo centro",
  inSegreteria: "Nel frattempo puoi pagare in segreteria: la quota risulterà pagata appena il centro registra l'incasso.",
  wallet: "Apple Pay e Google Pay compaiono nella pagina di pagamento quando il telefono li supporta.",
  apro: "Apro il pagamento…",
  pagataTesto: "Pagamento ricevuto il {d}. La ricevuta è pronta.",
  ricevuta: "Ricevuta",
  ricevutaAria: "Scarica la ricevuta: {t}",
  rateTitolo: "Pagamento a rate",
  rateConsentito: "Consentito dal centro",
  rateAria: "Come vuoi pagare",
  unica: "Unica soluzione",
  dueRate: "2 rate",
  rateSaldata: "La quota è già saldata: nessuna rata da pagare.",
  rateUnica: "Paghi tutto adesso. Se preferisci, puoi dividere la quota in 2 rate.",
  rateDue: "Due rate: la prima oggi ({a}), la seconda ({b}) entro il {d}.",
  rataInCorso: "Questa è la {n}ª rata di 2: non si può dividere ancora.",
  ricevuteTitolo: "Ricevute",
  ricevuteSub: "Tutte scaricabili",
  nessunaRicevuta: "Le ricevute compaiono qui dopo ogni pagamento.",
  sicuro: "Pagamenti sicuri con Stripe",
  sicuroSub: "I dati della carta non passano da questa app.",
  nessunaQuota: "Non ci sono quote da pagare. Quando il centro le genera, le trovi qui.",
  nessunFiglio: "Non c'è nessun figlio collegato al tuo profilo.",
  nonSeiGenitore: "Questa pagina è per i genitori.",
  caricamento: "Carico i pagamenti…",
  errore: "Non riesco a caricare i pagamenti: {e}",
  errorePaga: "Non riesco ad aprire il pagamento: {e}",
  esitoOk: "Grazie! Stiamo aspettando la conferma della banca: la quota risulterà pagata tra pochi istanti.",
  esitoAnnullato: "Pagamento annullato: non è stato addebitato nulla.",
  aggiorna: "Aggiorna",
};
const T = { it: IT, en: { ...IT } };

export default function PagamentiGenitore() {
  const { centro, membroAttivo, sb } = useCentro();
  const t = useT(T);
  const cartaServer = useCartaAttiva();
  const me = membroAttivo;
  const imp = leggiImp(centro.impostazioni);

  const [figli, setFigli] = useState<(AllievoMin & { fascia: string | null })[]>([]);
  const [quote, setQuote] = useState<Quota[]>([]);
  const [corsi, setCorsi] = useState<Map<string, Corso>>(new Map());
  const [gruppi, setGruppi] = useState<Map<string, GruppoMin>>(new Map());
  const [caricato, setCaricato] = useState(false);
  const [err, setErr] = useState("");
  const [fig, setFig] = useState(0);
  const [rata, setRata] = useState<"U" | "2">("U");
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState<"" | "ok" | "no">("");
  const oggi = oggiISO();

  const carica = useCallback(async () => {
    if (!me) { setCaricato(true); return; }
    const lg = await sb.from("allievi_famiglie").select("allievo_id").eq("membro_id", me.id);
    if (lg.error) { setErr(lg.error.message); setCaricato(true); return; }
    const ids = Array.from(new Set(((lg.data ?? []) as { allievo_id: string }[]).map((x) => x.allievo_id)));
    if (!ids.length) { setFigli([]); setQuote([]); setErr(""); setCaricato(true); return; }
    const [al, qu, co, gr, isc] = await Promise.all([
      sb.from("allievi").select("id,nome,cognome").in("id", ids).order("nome"),
      sb.from("quote").select("*").in("allievo_id", ids).order("scade_il"),
      sb.from("corsi").select("*").eq("centro_id", centro.id),
      sb.from("gruppi").select("id,nome,fascia,giorni,ora").eq("centro_id", centro.id),
      sb.from("iscrizioni").select("allievo_id,gruppo_id,al").in("allievo_id", ids),
    ]);
    const e = al.error ?? qu.error ?? co.error ?? gr.error ?? isc.error;
    if (e) { setErr(e.message); setCaricato(true); return; }
    const gMap = new Map(((gr.data ?? []) as GruppoMin[]).map((g) => [g.id, g]));
    const iscr = (isc.data ?? []) as { allievo_id: string; gruppo_id: string; al: string | null }[];
    setFigli(((al.data ?? []) as AllievoMin[]).map((a) => {
      const att = iscr.find((i) => i.allievo_id === a.id && (!i.al || i.al >= oggi));
      return { ...a, fascia: att ? gMap.get(att.gruppo_id)?.fascia ?? null : null };
    }));
    setQuote((qu.data ?? []) as Quota[]);
    setCorsi(new Map(((co.data ?? []) as Corso[]).map((c) => [c.id, c])));
    setGruppi(gMap);
    setErr("");
    setCaricato(true);
  }, [sb, me, centro.id, oggi]);
  useEffect(() => { carica(); }, [carica]);

  // Ritorno da Stripe: il webhook può arrivare qualche secondo dopo, quindi si riprova a leggere per un po'.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("annullato")) setEsito("no");
    if (!p.get("pagato")) return;
    setEsito("ok");
    let n = 0;
    const id = setInterval(() => { carica(); if (++n >= 6) clearInterval(id); }, 2500);
    return () => clearInterval(id);
  }, [carica]);

  const f = figli[Math.min(fig, Math.max(figli.length - 1, 0))];
  const mie = useMemo(() => quote.filter((q) => f && q.allievo_id === f.id), [quote, f]);
  const aperte = mie.filter((q) => statoEff(q, oggi) !== "P").sort((a, b) => a.scade_il.localeCompare(b.scade_il));
  const pagate = mie.filter((q) => q.stato === "pagata").sort((a, b) => (b.pagata_il ?? "").localeCompare(a.pagata_il ?? ""));
  const q = aperte[0] ?? pagate[0]; // la quota in primo piano: la prossima da pagare, altrimenti l'ultima saldata
  const attesa = !!q && q.stato !== "pagata";
  const corso = q?.corso_id ? corsi.get(q.corso_id) : undefined;
  const gruppo = corso?.gruppo_id ? gruppi.get(corso.gruppo_id) : undefined;
  const st = q ? statoEff(q, oggi) : "A";
  const info = q ? infoPeriodo(q.periodo) : null;
  const titoloQ = info && q ? titoloPeriodo(info, t) : "";
  const nGiorni = gruppo?.giorni?.length ?? 0;
  const descrCorso = corso ? [corso.nome, gruppo ? (nGiorni === 1 ? t.lezioni1 : fmt(t.lezioniN, { n: nGiorni })) : ""].filter(Boolean).join(" · ") : "";

  // Rate: solo se il corso le consente e la quota non è già una rata (la divisione la fa il server al momento del pagamento).
  const rateOk = attesa && !!q && (corso?.rate ?? 1) >= 2 && !info?.rata && q.importo_cent >= 200;
  const due = rateOk && rata === "2";
  const prima = q ? Math.ceil(q.importo_cent / 2) : 0;
  const seconda = q ? q.importo_cent - prima : 0;
  const cartaPossibile = cartaServer === true && imp.auto.carta;

  const paga = async () => {
    if (!q || !cartaPossibile) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/centro/pagamenti/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quota_id: q.id, rate: due ? 2 : 1 }),
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; messaggio?: string };
      if (!r.ok || !j.url) throw new Error(j.messaggio || String(r.status));
      window.location.href = j.url;
    } catch (e) {
      setErr(fmt(t.errorePaga, { e: e instanceof Error ? e.message : String(e) }));
      setBusy(false);
    }
  };

  const ricevuta = (x: Quota) => {
    const a = figli.find((z) => z.id === x.allievo_id);
    scaricaRicevuta({
      centro: centro.nome_app || centro.nome, allievo: a ? `${a.nome} ${a.cognome ?? ""}`.trim() : "", causale: etichettaQuota(x, t),
      importo_cent: x.importo_cent, pagata_il: x.pagata_il, metodo: etichettaMetodo(x.metodo, t), riferimento: x.stripe_id || x.id,
    }, t);
  };

  const cognome = me?.cognome || figli[0]?.cognome || "";
  const stile = st === "P" ? { background: "rgba(76,208,125,.16)", color: "#4CD07D" } : st === "S" ? { background: "rgba(255,90,95,.16)", color: "#FF5A5F" } : { background: "rgba(255,213,74,.16)", color: "#FFD54A" };

  return (
    <SchermoCentro ruolo="genitore" tab="home" titolo={t.titolo} sopra={`${centro.nome_app || centro.nome}${cognome ? ` · ${fmt(t.famiglia, { c: cognome })}` : ""}`} indietro={`/c/${centro.slug}/genitore`}>
      <div className={s.pagina} style={{ maxWidth: 430 }}>
        {!caricato ? <div className="note" role="status">{t.caricamento}</div> : null}
        {err ? <div className={s.msgErr} role="alert">{err.startsWith(t.errorePaga.slice(0, 12)) ? err : fmt(t.errore, { e: err })}</div> : null}
        {esito === "ok" ? <div className={s.msgOk} role="status">{t.esitoOk}</div> : null}
        {esito === "no" ? <div className="note" role="status">{t.esitoAnnullato}</div> : null}
        {caricato && !me ? <div className="note">{t.nonSeiGenitore}</div> : null}
        {caricato && me && !figli.length && !err ? <div className="note">{t.nessunFiglio}</div> : null}

        {figli.length > 1 ? (
          <div className="chips" role="group" aria-label={t.scegliFiglio}>
            {figli.map((x, i) => (
              <button key={x.id} type="button" className={i === fig ? "chip on" : "chip"} aria-pressed={i === fig} onClick={() => { setFig(i); setRata("U"); }}>{x.nome}{x.fascia ? ` · ${x.fascia}` : ""}</button>
            ))}
          </div>
        ) : null}

        {f && !q && caricato && !err ? <div className="note">{t.nessunaQuota}</div> : null}

        {q && info ? (
          <div className="card pad" style={{ padding: "13px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="k">{fmt(t.quotaDi, { p: (titoloQ + (info.rata ? ` · ${fmt(t.rata, { n: info.rata })}` : "")).toUpperCase() })}</span>
              <span className="tag" style={stile}>{st === "P" ? t.pagata : st === "S" ? t.scaduta : t.inAttesa}</span>
            </div>
            {descrCorso ? <div style={{ fontSize: 13, marginTop: 4, color: "#A1A1A6" }}>{descrCorso}</div> : null}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
              <div>
                <div className={s.disp} style={{ fontSize: 42, fontWeight: 800, fontStyle: "italic", lineHeight: 1 }}>{titoloQ}</div>
                <div style={{ fontSize: 13, color: "#A1A1A6", marginTop: 4 }}>{fmt(t.importo, { i: euro(q.importo_cent) })}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12.5, lineHeight: 1.35, color: "#A1A1A6" }}>
                {attesa ? (st === "S" ? t.scadutaIl : t.scade) : t.saldata}<br />
                <b style={{ color: "#F3F6F1" }}>{attesa ? fmtLungo(q.scade_il) : q.pagata_il ? fmtLungo(q.pagata_il) : ""}</b>
              </div>
            </div>

            {attesa ? (
              <>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button type="button" className={`btn ${cartaPossibile ? "" : s.btnOff}`} style={{ flex: 1, height: 46, fontSize: 15, cursor: cartaPossibile && !busy ? "pointer" : "default" }} disabled={!cartaPossibile || busy} onClick={paga}>
                    {cartaPossibile ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15.5h3" /></svg>
                        {busy ? t.apro : due ? fmt(t.pagaPrimaRata, { i: euro(prima) }) : t.pagaCarta}
                      </>
                    ) : cartaServer === null ? t.pagaCarta : t.cartaNonAttiva}
                  </button>
                </div>
                {cartaPossibile ? <div style={{ fontSize: 12, color: "#A1A1A6", marginTop: 8, lineHeight: 1.35 }}>{t.wallet}</div> : cartaServer !== null ? <div style={{ fontSize: 12, color: "#A1A1A6", marginTop: 8, lineHeight: 1.35 }}>{t.inSegreteria}</div> : null}
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "8px 8px 8px 12px", borderRadius: 14, background: "#0E0E10", border: "1px solid #232326" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4CD07D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                <span className="grow" style={{ fontSize: 13, lineHeight: 1.3 }}>{fmt(t.pagataTesto, { d: q.pagata_il ? fmtLungo(q.pagata_il) : "" })}</span>
                <button type="button" className="btn2" style={{ flex: "none", height: 34, padding: "0 14px", fontSize: 13, cursor: "pointer" }} onClick={() => ricevuta(q)}>{t.ricevuta}</button>
              </div>
            )}
          </div>
        ) : null}

        {q && (rateOk || info?.rata) ? (
          <div className="card" style={{ padding: "11px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{t.rateTitolo}</span>
              <span className="tag" style={{ color: "#D8F34A" }}>{t.rateConsentito}</span>
            </div>
            {rateOk ? (
              <>
                <div className="seg" role="group" aria-label={t.rateAria} style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", marginTop: 8 }}>
                  <button type="button" className={rata === "U" ? "sg on" : "sg"} aria-pressed={rata === "U"} onClick={() => setRata("U")}>{t.unica}</button>
                  <button type="button" className={rata === "2" ? "sg on" : "sg"} aria-pressed={rata === "2"} onClick={() => setRata("2")}>{t.dueRate}</button>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.35, color: "#A1A1A6", marginTop: 7 }}>
                  {due ? fmt(t.rateDue, { a: euro(prima), b: euro(seconda), d: fmtCorto(aggiungiGiorni(q.scade_il, 15)) }) : t.rateUnica}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, lineHeight: 1.35, color: "#A1A1A6", marginTop: 7 }}>{fmt(t.rataInCorso, { n: info?.rata ?? 1 })}</div>
            )}
          </div>
        ) : null}

        {f ? (
          <>
            <div className="sec" style={{ marginTop: 2 }}><h2 style={{ fontSize: 16 }}>{t.ricevuteTitolo}</h2><span className="muted" style={{ fontWeight: 600 }}>{t.ricevuteSub}</span></div>
            {!pagate.length ? <div className="note">{t.nessunaRicevuta}</div> : null}
            {pagate.map((x) => (
              <div key={x.id} className="li" style={{ padding: "7px 8px 7px 12px", gap: 10 }}>
                <span className="ic" style={{ width: 32, height: 32, borderRadius: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>
                </span>
                <span className="grow">
                  <div className="t" style={{ fontSize: 14 }}>{etichettaQuota(x, t)}</div>
                  <div className="s" style={{ fontSize: 12, marginTop: 1 }}>{[fmt(t.pagataIl, { d: x.pagata_il ? fmtCorto(x.pagata_il) : "" }), etichettaMetodo(x.metodo, t), euro(x.importo_cent)].filter(Boolean).join(" · ")}</div>
                </span>
                <button type="button" aria-label={fmt(t.ricevutaAria, { t: etichettaQuota(x, t) })} onClick={() => ricevuta(x)} style={{ width: 36, height: 36, flex: "none", borderRadius: "50%", border: 0, background: "#232326", color: "#F3F6F1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
                </button>
              </div>
            ))}
            <div className="li" style={{ padding: "8px 12px", gap: 10 }}>
              <span className="ic" style={{ width: 34, height: 34 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15.5h3" /></svg>
              </span>
              <span className="grow"><div className="t" style={{ fontSize: 14 }}>{t.sicuro}</div><div className="s" style={{ fontSize: 12, marginTop: 1 }}>{t.sicuroSub}</div></span>
            </div>
          </>
        ) : null}
      </div>
    </SchermoCentro>
  );
}
