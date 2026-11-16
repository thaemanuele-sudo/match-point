"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { FoglioLocale, Interruttore } from "./FoglioLocale";
import { BLOCCO_LETTURA, COL_QUOTA, PAGINA, catalogoCentro, chiaveFamiglia, invalidaCatalogo, leggi, leggiLegami, riepilogoPagamenti, type Riepilogo } from "./dati";
import { useCartaAttiva } from "./hooks";
import s from "./pagamenti.module.css";
import {
  COLORE_STATO, PER_IT, csv, daIso, etichettaMetodo, etichettaQuota, euro, fineMese, fmt, fmtCorto, fmtMese, importoCSV,
  inizioMese, iso, leggiImp, oggiISO, scaricaFile, scaricaRicevuta, statoEff,
  type ImpPagamenti, type MetodoQuota, type Quota, type StatoEff,
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
  altri: "Carica altri",
  esportazione: "Preparo il file…",
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
type Filtro = "T" | StatoEff;

export default function PagamentiCentro() {
  const { centro, membroAttivo, sb, ricarica } = useCentro();
  const t = useT(T);
  const cartaServer = useCartaAttiva();
  const attivo = membroAttivo;
  const [mese, setMese] = useState(() => inizioMese(new Date()));
  const [filtro, setFiltro] = useState<Filtro>("T");
  const [righe, setRighe] = useState<Riga[]>([]);
  const [finito, setFinito] = useState(true);
  const [altri, setAltri] = useState(false);
  const [riepilogo, setRiepilogo] = useState<Riepilogo | null>(null);
  const [nFiltro, setNFiltro] = useState(0);
  const [lavoro, setLavoro] = useState(false);
  const [caricato, setCaricato] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [imp, setImp] = useState<ImpPagamenti>(() => leggiImp(centro.impostazioni));
  const [foglio, setFoglio] = useState<null | { tipo: "incasso"; quota: Quota | null; riga?: Riga } | { tipo: "dettaglio"; riga: Riga }>(null);
  const oggi = oggiISO();
  const da = iso(inizioMese(mese));
  const a = iso(fineMese(mese));
  // quante quote del database sono già state lette per questo filtro (serve al blocco successivo) e quale richiesta è l'ultima
  const letti = useRef(0);
  const richiesta = useRef(0);

  useEffect(() => { setImp(leggiImp(centro.impostazioni)); }, [centro.impostazioni]);

  /**
   * Quote del mese più gli arretrati (non pagate di mesi precedenti), filtrate dal database.
   * `N` = tutte le non pagate, per la finestra dell'incasso. Mai tutta la tabella: sempre un intervallo di date e un blocco.
   */
  const interroga = useCallback((f: Filtro | "N", colonne: string, conta = false) => {
    let q = sb.from("quote").select(colonne, conta ? { count: "exact", head: true } : undefined).eq("centro_id", centro.id)
      .or(`and(scade_il.gte.${da},scade_il.lte.${a}),and(scade_il.lt.${da},stato.neq.pagata)`);
    if (f === "P") q = q.eq("stato", "pagata");
    else if (f === "A") q = q.eq("stato", "attesa").gte("scade_il", oggi);
    else if (f === "S") q = q.or(`stato.eq.scaduta,and(stato.eq.attesa,scade_il.lt.${oggi})`);
    else if (f === "N") q = q.neq("stato", "pagata");
    return q;
  }, [sb, centro.id, da, a, oggi]);

  /** Un blocco di quote con nome dell'allievo, genitori, corso e gruppo: allievi e legami solo per le quote lette. */
  const leggiBlocco = useCallback(async (f: Filtro | "N", x: number, y: number): Promise<{ righe: Riga[]; n: number }> => {
    const quote = await leggi<Quota>(interroga(f, COL_QUOTA).order("scade_il").order("id").range(x, y));
    const [{ corsi, gruppi }, leg] = await Promise.all([catalogoCentro(sb, centro.id), leggiLegami(sb, centro.id, quote.map((q) => q.allievo_id))]);
    const corsoPer = new Map(corsi.map((c) => [c.id, c]));
    const gruppoPer = new Map(gruppi.map((g) => [g.id, g]));
    const out: Riga[] = quote.map((q) => {
      const al1 = leg.allievi.get(q.allievo_id);
      const gen = leg.genitoriDi.get(q.allievo_id) ?? [];
      const m0 = gen.length ? leg.membri.get(gen[0]) : undefined;
      const corso = q.corso_id ? corsoPer.get(q.corso_id) : undefined;
      return {
        q, st: statoEff(q, oggi), allievo: al1, corso, gruppo: corso?.gruppo_id ? gruppoPer.get(corso.gruppo_id) : undefined,
        famiglia: m0?.cognome || al1?.cognome || "",
        chiave: chiaveFamiglia(q.allievo_id, gen),
        genitori: gen,
      };
    });
    // dentro il blocco, a pari scadenza, in ordine di cognome come prima
    out.sort((x1, y1) => x1.q.scade_il.localeCompare(y1.q.scade_il) || (x1.allievo?.cognome ?? "").localeCompare(y1.allievo?.cognome ?? ""));
    return { righe: out, n: quote.length };
  }, [interroga, sb, centro.id, oggi]);

  /** Tutte le righe di un filtro, a blocchi di 1000: solo per l'esportazione e per i promemoria a tutti, mai per la lista. */
  const leggiTutte = useCallback(async (f: Filtro | "N"): Promise<Riga[]> => {
    const out: Riga[] = [];
    for (let x = 0; ; x += BLOCCO_LETTURA) {
      const r = await leggiBlocco(f, x, x + BLOCCO_LETTURA - 1);
      out.push(...r.righe);
      if (r.n < BLOCCO_LETTURA) return out;
    }
  }, [leggiBlocco]);

  // totali del mese (incassi, percentuali, famiglie): calcolati dal database, indipendenti dalla pagina caricata
  const caricaTotali = useCallback(async () => {
    try {
      setRiepilogo(await riepilogoPagamenti(sb, centro.id, da, a, oggi));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }, [sb, centro.id, da, a, oggi]);
  useEffect(() => { void caricaTotali(); }, [caricaTotali]);

  // prima pagina della lista a ogni cambio di mese o di filtro
  const caricaPrimaPagina = useCallback(async () => {
    const mia = ++richiesta.current;
    try {
      const [r, n] = await Promise.all([
        leggiBlocco(filtro, 0, PAGINA - 1),
        // il numero dei promemoria da inviare arriva da un conteggio, non dalle righe caricate
        filtro === "A" || filtro === "S" ? interroga(filtro, "id", true).then((x: { count: number | null }) => x.count ?? 0) : Promise.resolve(0),
      ]);
      if (mia !== richiesta.current) return;
      letti.current = r.n;
      setRighe(r.righe);
      setFinito(r.n < PAGINA);
      setNFiltro(n);
      setErr("");
    } catch (e) {
      if (mia === richiesta.current) setErr(e instanceof Error ? e.message : String(e));
    }
    if (mia === richiesta.current) setCaricato(true);
  }, [filtro, leggiBlocco, interroga]);
  useEffect(() => { setCaricato(false); void caricaPrimaPagina(); }, [caricaPrimaPagina]);

  const caricaAltri = async () => {
    setAltri(true);
    const mia = richiesta.current;
    try {
      const r = await leggiBlocco(filtro, letti.current, letti.current + PAGINA - 1);
      if (mia !== richiesta.current) return;
      letti.current += r.n;
      setRighe((att) => {
        const ids = new Set(att.map((x) => x.q.id));
        return [...att, ...r.righe.filter((x) => !ids.has(x.q.id))];
      });
      setFinito(r.n < PAGINA);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setAltri(false);
  };

  /** Dopo un incasso o un annullo la riga si aggiorna sul posto (e sparisce se non rientra più nel filtro): niente rilettura della lista. */
  const applicaPatch = (id: string, patch: Partial<Quota>) => {
    let tolte = 0;
    const out: Riga[] = [];
    for (const r of righe) {
      if (r.q.id !== id) { out.push(r); continue; }
      const q = { ...r.q, ...patch };
      const st = statoEff(q, oggi);
      // fuori dal filtro, oppure un arretrato ormai pagato (gli arretrati restano visibili solo finché non si incassano)
      if ((filtro !== "T" && st !== filtro) || (q.scade_il < da && st === "P")) { tolte++; continue; }
      out.push({ ...r, q, st });
    }
    letti.current = Math.max(0, letti.current - tolte);
    setRighe(out);
    void caricaTotali();
    if (filtro === "A" || filtro === "S") setNFiltro((n) => Math.max(0, n - tolte));
  };

  // ---------- riepilogo ----------
  const riep = useMemo(() => {
    const r = riepilogo ?? { P: 0, A: 0, S: 0, fam: { P: 0, A: 0, S: 0 } };
    const tot = r.P + r.A + r.S;
    const pct = (x: number) => (tot ? (x / tot) * 100 : 0);
    return { P: r.P, A: r.A, S: r.S, tot, pP: pct(r.P), pA: pct(r.A), pS: pct(r.S), fam: r.fam };
  }, [riepilogo]);

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
