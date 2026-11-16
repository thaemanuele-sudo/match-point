"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { FoglioLocale, Interruttore } from "./FoglioLocale";
import { useCartaAttiva } from "./hooks";
import s from "./pagamenti.module.css";
import {
  COLORE_STATO, PER_IT, csv, daIso, etichettaMetodo, etichettaQuota, euro, fineMese, fmt, fmtCorto, fmtMese, importoCSV,
  inizioMese, iso, leggiImp, oggiISO, scaricaFile, scaricaRicevuta, statoEff,
  type AllievoMin, type Corso, type GruppoMin, type ImpPagamenti, type LegameFamiglia, type MembroMin, type MetodoQuota, type Quota, type StatoEff,
} from "./util";

const IT = {
  ...PER_IT,
  titolo: "Pagamenti e incassi",
  corsiAria: "Corsi e quote",
  incassi: "INCASSI DEL MESE",
  pagato: "pagato",
  incassatiSu: "{inc} incassati",
  attesiSu: "su {att} attesi",
  pagati: "Pagati",
  inAttesa: "In attesa",
  scaduti: "Scaduti",
  famiglia1: "1 famiglia",
  famiglieN: "{n} famiglie",
  famiglie: "Famiglie",
  registra: "Registra incasso in segreteria",
  filtroAria: "Filtra per stato",
  fTutte: "Tutte",
  fScadute: "Scadute",
  fAttesa: "In attesa",
  fPagate: "Pagate",
  sPagato: "Pagato",
  sAttesa: "In attesa",
  sScaduto: "Scaduto",
  scade: "scade {d}",
  scaduta: "scaduta {d}",
  pagataIlD: "{d}",
  famigliaDi: "Famiglia {c}",
  arretrato: "arretrato",
  vuotoMese: "Per questo mese non ci sono quote. Imposta le quote dei corsi e generale per gli iscritti.",
  vaiCorsi: "Vai a corsi e quote",
  vuotoFiltro: "Nessuna quota con questo stato.",
  autoPromemoria: "Promemoria automatici",
  autoPromemoriaSub: "3 giorni prima, alla scadenza e 7 giorni dopo",
  autoCarta: "Carta online con Stripe",
  autoCartaSub: "Le famiglie pagano da app, anche con Apple Pay",
  autoCartaNonAttiva: "Non ancora attiva: mancano le chiavi Stripe sul server.",
  autoRicevute: "Ricevute automatiche",
  autoRicevuteSub: "Inviate alla famiglia a ogni pagamento",
  autoNota: "Gli invii automatici partono quando saranno collegati; intanto puoi mandare i promemoria a mano.",
  esporta: "Esporta per il commercialista",
  esportaVuoto: "Non ci sono quote da esportare.",
  promemoriaTutti: "Invia promemoria ({n})",
  promemoriaInviati: "Promemoria inviati a {n} famiglie.",
  promemoriaNessuno: "Nessun genitore collegato a queste quote: nessun promemoria inviato.",
  promTitolo: "Quota da pagare",
  promTesto: "{allievo}: {quota} di {importo}, {scadenza}.",
  promScade: "scade il {d}",
  promScaduta: "era scaduta il {d}",
  mesePrec: "Mese precedente",
  meseSucc: "Mese successivo",
  incassoTitolo: "Registra incasso",
  incassoQuota: "QUOTA",
  incassoMetodo: "COME HA PAGATO",
  mSegreteria: "In segreteria",
  mBonifico: "Bonifico",
  mCarta: "Carta",
  incassoNessuna: "Non ci sono quote da incassare.",
  incassoConferma: "Registra incasso",
  incassoOk: "Incasso registrato.",
  dettaglio: "Dettaglio quota",
  importo: "Importo",
  corso: "Corso",
  scadenza: "Scadenza",
  stato: "Stato",
  pagataIlDett: "Pagata il {d}",
  annullaIncasso: "Annulla incasso",
  annullaOk: "Incasso annullato.",
  mandaPromemoria: "Invia promemoria",
  ricevuta: "Ricevuta",
  chiudi: "Chiudi",
  annulla: "Annulla",
  salvataggio: "Salvo…",
  erroreSalva: "Non sono riuscito a salvare: {e}",
  errore: "Non riesco a caricare i pagamenti: {e}",
  caricamento: "Carico i pagamenti…",
  ruolo: "Novembre",
  nonAttivoCarta: "Pagamento con carta non ancora attivo per questo centro",
  cartaSpenta: "carta spenta",
};
const T = { it: IT, en: { ...IT } };

type Riga = {
  q: Quota; st: StatoEff; allievo: AllievoMin | undefined; corso: Corso | undefined; gruppo: GruppoMin | undefined;
  famiglia: string; chiave: string; genitori: string[];
};

export default function PagamentiCentro() {
  const { centro, membroAttivo, sb, ricarica } = useCentro();
  const t = useT(T);
  const cartaServer = useCartaAttiva();
  const attivo = membroAttivo;
  const [mese, setMese] = useState(() => inizioMese(new Date()));
  const [filtro, setFiltro] = useState<"T" | StatoEff>("T");
  const [righe, setRighe] = useState<Riga[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [imp, setImp] = useState<ImpPagamenti>(() => leggiImp(centro.impostazioni));
  const [foglio, setFoglio] = useState<null | { tipo: "incasso"; quota: Quota | null } | { tipo: "dettaglio"; riga: Riga }>(null);
  const oggi = oggiISO();

  useEffect(() => { setImp(leggiImp(centro.impostazioni)); }, [centro.impostazioni]);

  const carica = useCallback(async () => {
    const da = iso(inizioMese(mese));
    const a = iso(fineMese(mese));
    // quote del mese, più gli arretrati: quelle non pagate di mesi precedenti restano visibili finché non si incassano
    const [dMese, dArr] = await Promise.all([
      sb.from("quote").select("*").eq("centro_id", centro.id).gte("scade_il", da).lte("scade_il", a),
      sb.from("quote").select("*").eq("centro_id", centro.id).lt("scade_il", da).neq("stato", "pagata"),
    ]);
    const e0 = dMese.error ?? dArr.error;
    if (e0) { setErr(e0.message); setCaricato(true); return; }
    const quote = [...((dMese.data ?? []) as Quota[]), ...((dArr.data ?? []) as Quota[])];
    const ids = Array.from(new Set(quote.map((q) => q.allievo_id)));
    const [al, lg, co, gr] = await Promise.all([
      ids.length ? sb.from("allievi").select("id,nome,cognome").in("id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? sb.from("allievi_famiglie").select("allievo_id,membro_id").in("allievo_id", ids) : Promise.resolve({ data: [], error: null }),
      sb.from("corsi").select("*").eq("centro_id", centro.id),
      sb.from("gruppi").select("id,nome,fascia,giorni,ora").eq("centro_id", centro.id),
    ]);
    const e1 = al.error ?? lg.error ?? co.error ?? gr.error;
    if (e1) { setErr(e1.message); setCaricato(true); return; }
    const legami = (lg.data ?? []) as LegameFamiglia[];
    const gids = Array.from(new Set(legami.map((l) => l.membro_id)));
    const me = gids.length ? await sb.from("membri").select("id,nome,cognome").in("id", gids) : { data: [], error: null };
    if (me.error) { setErr(me.error.message); setCaricato(true); return; }
    const membri = new Map(((me.data ?? []) as MembroMin[]).map((m) => [m.id, m]));
    const allievi = new Map(((al.data ?? []) as AllievoMin[]).map((x) => [x.id, x]));
    const corsi = new Map(((co.data ?? []) as Corso[]).map((x) => [x.id, x]));
    const gruppi = new Map(((gr.data ?? []) as GruppoMin[]).map((x) => [x.id, x]));
    const out: Riga[] = quote.map((q) => {
      const al1 = allievi.get(q.allievo_id);
      const gen = legami.filter((l) => l.allievo_id === q.allievo_id).map((l) => l.membro_id);
      const m0 = gen.length ? membri.get(gen[0]) : undefined;
      const corso = q.corso_id ? corsi.get(q.corso_id) : undefined;
      return {
        q, st: statoEff(q, oggi), allievo: al1, corso, gruppo: corso?.gruppo_id ? gruppi.get(corso.gruppo_id) : undefined,
        famiglia: m0?.cognome || al1?.cognome || "",
        // le famiglie si contano per genitore; senza genitore collegato vale l'allievo stesso
        chiave: gen.length ? [...gen].sort()[0] : q.allievo_id,
        genitori: gen,
      };
    });
    out.sort((x, y) => x.q.scade_il.localeCompare(y.q.scade_il) || (x.allievo?.cognome ?? "").localeCompare(y.allievo?.cognome ?? ""));
    setErr("");
    setRighe(out);
    setCaricato(true);
  }, [sb, centro.id, mese, oggi]);
  useEffect(() => { setCaricato(false); carica(); }, [carica]);

  // ---------- riepilogo ----------
  const riep = useMemo(() => {
    const somma = (st: StatoEff) => righe.filter((r) => r.st === st).reduce((a, r) => a + r.q.importo_cent, 0);
    const P = somma("P"), A = somma("A"), S = somma("S");
    const tot = P + A + S;
    const pct = (x: number) => (tot ? (x / tot) * 100 : 0);
    // la famiglia prende lo stato peggiore tra le sue quote: scaduta > in attesa > pagata
    const peggio = new Map<string, StatoEff>();
    const peso = { P: 0, A: 1, S: 2 };
    righe.forEach((r) => {
      const c = peggio.get(r.chiave);
      if (!c || peso[r.st] > peso[c]) peggio.set(r.chiave, r.st);
    });
    const fam = { P: 0, A: 0, S: 0 };
    peggio.forEach((v) => fam[v]++);
    return { P, A, S, tot, pP: pct(P), pA: pct(A), pS: pct(S), fam };
  }, [righe]);

  const visibili = righe.filter((r) => filtro === "T" || r.st === filtro);
  const nomeStato = (st: StatoEff) => (st === "P" ? t.sPagato : st === "A" ? t.sAttesa : t.sScaduto);
  const quando = (r: Riga) => (r.st === "P" ? fmtCorto(r.q.pagata_il ?? r.q.scade_il) : r.st === "S" ? fmt(t.scaduta, { d: fmtCorto(r.q.scade_il) }) : fmt(t.scade, { d: fmtCorto(r.q.scade_il) }));
  const sub = (r: Riga) => [r.gruppo?.nome, r.famiglia ? fmt(t.famigliaDi, { c: r.famiglia }) : "", r.st === "P" ? etichettaMetodo(r.q.metodo, t) : etichettaQuota(r.q, t), r.q.scade_il < iso(inizioMese(mese)) && r.st !== "P" ? t.arretrato : ""].filter(Boolean).join(" · ");
  const nomeAllievo = (r: Riga) => (r.allievo ? `${r.allievo.nome}${r.allievo.cognome ? " " + r.allievo.cognome.charAt(0) + "." : ""}` : "");
  const famN = (n: number) => (n === 1 ? t.famiglia1 : fmt(t.famiglieN, { n }));
  const aperte = righe.filter((r) => r.st !== "P");

  // ---------- azioni ----------
  const salvaAuto = async (k: keyof ImpPagamenti["auto"], v: boolean) => {
    const nuovo = { ...imp, auto: { ...imp.auto, [k]: v } };
    const base = (centro.impostazioni ?? {}) as Record<string, unknown>;
    const { error } = await sb.from("centri").update({ impostazioni: { ...base, pagamenti: nuovo } }).eq("id", centro.id);
    if (error) return setErr(fmt(t.erroreSalva, { e: error.message }));
    setImp(nuovo);
    ricarica();
  };

  const inviaPromemoria = async (lista: Riga[]) => {
    setMsg("");
    // una notifica per genitore e per quota: il testo dice quale allievo e quanto
    const righeNot = lista.flatMap((r) =>
      r.genitori.map((g) => ({
        centro_id: centro.id,
        membro_id: g,
        tipo: "pagamento",
        titolo: t.promTitolo,
        testo: fmt(t.promTesto, {
          allievo: r.allievo?.nome ?? "",
          quota: etichettaQuota(r.q, t),
          importo: euro(r.q.importo_cent),
          scadenza: r.st === "S" ? fmt(t.promScaduta, { d: fmtCorto(r.q.scade_il) }) : fmt(t.promScade, { d: fmtCorto(r.q.scade_il) }),
        }),
        link: `/c/${centro.slug}/genitore/pagamenti`,
        mittente: attivo?.id ?? null,
      })),
    );
    if (!righeNot.length) return setMsg(t.promemoriaNessuno);
    const { error } = await sb.from("notifiche").insert(righeNot);
    if (error) return setErr(fmt(t.erroreSalva, { e: error.message }));
    setErr("");
    setMsg(fmt(t.promemoriaInviati, { n: new Set(lista.filter((r) => r.genitori.length).map((r) => r.chiave)).size }));
  };

  const esporta = () => {
    if (!righe.length) return setMsg(t.esportaVuoto);
    const intest = ["Famiglia", "Allievo", "Gruppo", "Corso", "Periodo", "Importo (EUR)", "Scadenza", "Stato", "Pagata il", "Metodo", "Riferimento Stripe"];
    const dati = righe.map((r) => [
      r.famiglia, `${r.allievo?.nome ?? ""} ${r.allievo?.cognome ?? ""}`.trim(), r.gruppo?.nome ?? "", r.corso?.nome ?? "", etichettaQuota(r.q, t),
      importoCSV(r.q.importo_cent), r.q.scade_il, nomeStato(r.st), r.q.pagata_il ?? "", etichettaMetodo(r.q.metodo, t), r.q.stripe_id ?? "",
    ]);
    scaricaFile(`incassi-${centro.slug}-${iso(mese).slice(0, 7)}.csv`, csv([intest, ...dati]), "text/csv;charset=utf-8");
  };

  const ricevuta = (r: Riga) =>
    scaricaRicevuta({
      centro: centro.nome_app || centro.nome, allievo: `${r.allievo?.nome ?? ""} ${r.allievo?.cognome ?? ""}`.trim(), causale: etichettaQuota(r.q, t),
      importo_cent: r.q.importo_cent, pagata_il: r.q.pagata_il, metodo: etichettaMetodo(r.q.metodo, t), riferimento: r.q.stripe_id || r.q.id,
    }, t);

  const cartaOn = cartaServer === true;
  const base = `/c/${centro.slug}/dt`;
  const mesePrec = () => setMese(new Date(mese.getFullYear(), mese.getMonth() - 1, 1));
  const meseSucc = () => setMese(new Date(mese.getFullYear(), mese.getMonth() + 1, 1));

  const filtri: ["T" | StatoEff, string][] = [["T", t.fTutte], ["S", t.fScadute], ["A", t.fAttesa], ["P", t.fPagate]];

  return (
    <SchermoCentro
      ruolo="dt"
      tab="pagamenti"
      titolo={t.titolo}
      sopra={`${centro.nome} · ${fmtMese(mese)}`}
      indietro={base}
      azioni={
        <Link href={`${base}/corsi`} className="icon" aria-label={t.corsiAria}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>
        </Link>
      }
      largo
    >
      <div className={`${s.pagina} ${s.due}`}>
        <div className={s.colonna}>
          <div className={s.mese}>
            <button type="button" className={s.meseBtn} aria-label={t.mesePrec} onClick={mesePrec}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 120, textAlign: "center" }}>{fmtMese(mese)}</span>
            <button type="button" className={s.meseBtn} aria-label={t.meseSucc} onClick={meseSucc}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>
          </div>

          {err ? <div className={s.msgErr} role="alert">{fmt(t.errore, { e: err })}</div> : null}
          {!caricato ? <div className="note" role="status">{t.caricamento}</div> : null}

          <div className="card pad" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <div>
                <span className="k">{t.incassi}</span>
                <div className={s.disp} style={{ fontSize: 40, fontWeight: 800, fontStyle: "italic", lineHeight: 1, marginTop: 2, color: "#D8F34A" }}>
                  {riep.tot ? Math.round(riep.pP) : 0}% <span style={{ fontSize: 16, fontStyle: "normal", fontWeight: 700, color: "#A1A1A6" }}>{t.pagato}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "#A1A1A6", lineHeight: 1.35 }}>
                {fmt(t.incassatiSu, { inc: euro(riep.P) || euro(0) })}<br />{fmt(t.attesiSu, { att: euro(riep.tot) || euro(0) })}
              </div>
            </div>
            <div className={s.stati} role="img" aria-label={`${t.pagati} ${Math.round(riep.pP)}%, ${t.inAttesa} ${Math.round(riep.pA)}%, ${t.scaduti} ${Math.round(riep.pS)}%`}>
              <i style={{ width: `${riep.pP}%`, background: COLORE_STATO.P }} />
              <i style={{ width: `${riep.pA}%`, background: COLORE_STATO.A }} />
              <i style={{ width: `${riep.pS}%`, background: COLORE_STATO.S }} />
            </div>
            <div className={s.legenda}>
              {([["P", t.pagati, riep.pP], ["A", t.inAttesa, riep.pA], ["S", t.scaduti, riep.pS]] as [StatoEff, string, number][]).map(([k, l, p]) => (
                <div key={k}>
                  <b><span className={s.punto} style={{ background: COLORE_STATO[k] }} />{l}</b>
                  <span className="m">{Math.round(p)}% · {famN(riep.fam[k])}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "2px 14px" }}>
            {([
              ["promemoria", t.autoPromemoria, t.autoPromemoriaSub],
              ["carta", t.autoCarta, cartaServer === false ? t.autoCartaNonAttiva : t.autoCartaSub],
              ["ricevute", t.autoRicevute, t.autoRicevuteSub],
            ] as [keyof ImpPagamenti["auto"], string, string][]).map(([k, titolo, sottotitolo]) => (
              <div key={k} className={s.riga} style={{ padding: "7px 0" }}>
                <span className="grow"><div className={s.rigaT}>{titolo}</div><div className={s.rigaS}>{sottotitolo}</div></span>
                <Interruttore on={imp.auto[k]} etichetta={titolo} onChange={(v) => salvaAuto(k, v)} />
              </div>
            ))}
          </div>
          <div className="note">{t.autoNota}</div>

          <button type="button" className="btn" style={{ height: 48, fontSize: 15, cursor: "pointer" }} onClick={esporta}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" /></svg>{t.esporta}
          </button>
        </div>

        <div className={s.colonna}>
          <div className="sec"><h2 style={{ fontSize: 16 }}>{t.famiglie}</h2><button type="button" className={s.testoBtn} onClick={() => setFoglio({ tipo: "incasso", quota: null })}>{t.registra}</button></div>
          <div className="chips" role="group" aria-label={t.filtroAria}>
            {filtri.map(([k, l]) => <button key={k} type="button" className={k === filtro ? "chip on" : "chip"} aria-pressed={k === filtro} onClick={() => setFiltro(k)}>{l}</button>)}
          </div>
          {filtro !== "T" && filtro !== "P" && visibili.length ? (
            <button type="button" className={s.testoBtn} style={{ alignSelf: "flex-start" }} onClick={() => inviaPromemoria(visibili)}>{fmt(t.promemoriaTutti, { n: visibili.length })}</button>
          ) : null}
          {msg ? <div className={s.msgOk} role="status">{msg}</div> : null}

          {caricato && !righe.length && !err ? (
            <div className="note">{t.vuotoMese} <Link href={`${base}/corsi`} style={{ fontWeight: 700 }}>{t.vaiCorsi}</Link></div>
          ) : null}
          {caricato && righe.length && !visibili.length ? <div className="note">{t.vuotoFiltro}</div> : null}

          {visibili.map((r) => (
            <button key={r.q.id} type="button" className={`li ${s.listaBtn}`} style={{ padding: "8px 12px", gap: 10 }} onClick={() => setFoglio({ tipo: "dettaglio", riga: r })}>
              <span className="dot" style={{ background: COLORE_STATO[r.st] }} aria-hidden="true" />
              <span className="grow">
                <div className="t" style={{ fontSize: 14 }}>{nomeAllievo(r)}</div>
                <div className="s" style={{ fontSize: 12, marginTop: 1 }}>{sub(r)}</div>
              </span>
              <span style={{ textAlign: "right", flex: "none" }}>
                <div className={s.statoTesto} style={{ color: COLORE_STATO[r.st] }}>{nomeStato(r.st)}</div>
                <div style={{ fontSize: 11.5, color: "#A1A1A6", marginTop: 2 }}>{euro(r.q.importo_cent)} · {quando(r)}</div>
              </span>
            </button>
          ))}
        </div>
      </div>

      {foglio?.tipo === "incasso" ? (
        <FoglioIncasso t={t} aperte={aperte} iniziale={foglio.quota} nomeAllievo={nomeAllievo} chiudi={() => setFoglio(null)} cartaOn={cartaOn}
          registra={async (id, metodo) => {
            const { error } = await sb.from("quote").update({ stato: "pagata", pagata_il: oggiISO(), metodo }).eq("id", id);
            if (error) return error.message;
            setMsg(t.incassoOk);
            await carica();
            return "";
          }} />
      ) : null}

      {foglio?.tipo === "dettaglio" ? (
        <FoglioLocale titolo={nomeAllievo(foglio.riga)} chiudi={() => setFoglio(null)}>
          <div className="card" style={{ padding: "4px 14px" }}>
            {([
              [t.importo, euro(foglio.riga.q.importo_cent)],
              [t.corso, foglio.riga.corso?.nome ?? ""],
              [etichettaQuota(foglio.riga.q, t), ""],
              [t.scadenza, fmtCorto(foglio.riga.q.scade_il)],
              [t.stato, foglio.riga.st === "P" ? fmt(t.pagataIlDett, { d: foglio.riga.q.pagata_il ? fmtCorto(foglio.riga.q.pagata_il) : "" }) + (foglio.riga.q.metodo ? ` · ${etichettaMetodo(foglio.riga.q.metodo, t)}` : "") : nomeStato(foglio.riga.st)],
            ] as [string, string][]).filter(([, v], i) => v || i === 2).map(([k, v], i) => (
              <div key={i} className={s.riga} style={{ justifyContent: "space-between" }}><span className={s.rigaS}>{k}</span><b style={{ fontSize: 14 }}>{v}</b></div>
            ))}
          </div>
          <div className={s.azioni} style={{ flexWrap: "wrap" }}>
            {foglio.riga.st !== "P" ? (
              <>
                <button type="button" className="btn" style={{ flex: 1, height: 48, fontSize: 14 }} onClick={() => setFoglio({ tipo: "incasso", quota: foglio.riga.q })}>{t.incassoConferma}</button>
                <button type="button" className="btn2" onClick={() => { inviaPromemoria([foglio.riga]); setFoglio(null); }}>{t.mandaPromemoria}</button>
              </>
            ) : (
              <>
                <button type="button" className="btn2" onClick={() => ricevuta(foglio.riga)}>{t.ricevuta}</button>
                <button type="button" className="btn2" onClick={async () => {
                  const { error } = await sb.from("quote").update({ stato: "attesa", pagata_il: null, metodo: null, stripe_id: null }).eq("id", foglio.riga.q.id);
                  if (error) return setErr(fmt(t.erroreSalva, { e: error.message }));
                  setMsg(t.annullaOk);
                  setFoglio(null);
                  carica();
                }}>{t.annullaIncasso}</button>
              </>
            )}
          </div>
          <button type="button" className="btn2" style={{ flex: "none" }} onClick={() => setFoglio(null)}>{t.chiudi}</button>
        </FoglioLocale>
      ) : null}
    </SchermoCentro>
  );
}

function FoglioIncasso({ t, aperte, iniziale, nomeAllievo, chiudi, registra, cartaOn }: {
  t: typeof IT; aperte: Riga[]; iniziale: Quota | null; nomeAllievo: (r: Riga) => string; chiudi: () => void; cartaOn: boolean;
  registra: (id: string, metodo: MetodoQuota) => Promise<string>;
}) {
  const [id, setId] = useState(iniziale?.id ?? aperte[0]?.q.id ?? "");
  const [metodo, setMetodo] = useState<MetodoQuota>("segreteria");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const metodi: [MetodoQuota, string][] = [["segreteria", t.mSegreteria], ["bonifico", t.mBonifico], ["carta", t.mCarta]];
  void cartaOn;
  const invia = async () => {
    if (!id) return;
    setBusy(true);
    const e = await registra(id, metodo);
    setBusy(false);
    if (e) setMsg(fmt(t.erroreSalva, { e }));
    else chiudi();
  };
  return (
    <FoglioLocale titolo={t.incassoTitolo} chiudi={chiudi}>
      {!aperte.length ? <div className="note">{t.incassoNessuna}</div> : (
        <>
          <div className={s.campo}>
            <label htmlFor="i-q">{t.incassoQuota}</label>
            <select id="i-q" value={id} onChange={(e) => setId(e.target.value)}>
              {aperte.map((r) => <option key={r.q.id} value={r.q.id}>{`${nomeAllievo(r)} · ${etichettaQuota(r.q, t)} · ${euro(r.q.importo_cent)}`}</option>)}
            </select>
          </div>
          <div>
            <div className={s.etich} style={{ marginBottom: 5 }}>{t.incassoMetodo}</div>
            <div className="seg" role="group" aria-label={t.incassoMetodo} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
              {metodi.map(([k, l]) => <button key={k} type="button" className={k === metodo ? "sg on" : "sg"} aria-pressed={k === metodo} onClick={() => setMetodo(k)}>{l}</button>)}
            </div>
          </div>
        </>
      )}
      {msg ? <div className={s.msgErr} role="alert">{msg}</div> : null}
      <div className={s.azioni}>
        <button type="button" className="btn2" onClick={chiudi}>{t.annulla}</button>
        {aperte.length ? <button type="button" className="btn" style={{ flex: 1, height: 48 }} disabled={busy || !id} onClick={invia}>{busy ? t.salvataggio : t.incassoConferma}</button> : null}
      </div>
    </FoglioLocale>
  );
}
