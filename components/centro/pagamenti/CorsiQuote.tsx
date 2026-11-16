"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { FoglioLocale, Interruttore } from "./FoglioLocale";
import { generaQuote, type EsitoGenera } from "./genera";
import s from "./pagamenti.module.css";
import {
  PER_IT, euro, euroInput, fmt, giorniGruppo, leggiImp, parseEuro, periodo,
  type Cadenza, type Corso, type GruppoMin, type ImpPagamenti,
} from "./util";

const IT = {
  ...PER_IT,
  ruolo: "Direttore tecnico",
  titolo: "Corsi e quote",
  vaiPagamenti: "Pagamenti e incassi",
  frequenza: "Frequenza della quota",
  mensile: "Mensile",
  trimestrale: "Trimestrale",
  annuale: "Annuale",
  alMese: "al mese",
  alTrimestre: "al trimestre",
  allAnno: "all'anno",
  aLezione: "a lezione",
  corsiTitolo: "Corsi del centro",
  aggiungi: "+ Aggiungi",
  aggiungiAria: "Aggiungi un corso",
  impostaQuota: "Imposta la quota",
  lezioni1: "1 lezione a settimana",
  lezioniN: "{n} lezioni a settimana",
  nessunGruppo: "Nessun gruppo collegato",
  gruppo: "Gruppo {nome} · {orario}",
  vuotoCorsi: "Non ci sono ancora corsi. Aggiungi il primo e imposta la sua quota.",
  scontoTitolo: "Sconto fratelli",
  scontoSub: "{pct}% dal secondo figlio iscritto",
  scontoNessuno: "Imposta la percentuale per applicarlo",
  scontoAria: "Sconto fratelli attivo",
  iscrizioneTitolo: "Quota di iscrizione",
  iscrizioneSub: "Una volta all'anno, a settembre",
  scadenzaTitolo: "Scadenza della quota",
  scadM: "Il {g} di ogni mese, con promemoria 3 giorni prima",
  scadT: "Il {g} del primo mese del trimestre",
  scadA: "Entro il {g} settembre, in un'unica soluzione",
  promOn: "Promemoria attivi",
  promOff: "Promemoria spenti",
  regole: "Modifica regole",
  genera: "Genera le quote",
  generaSub: "Crea la quota di ogni iscritto per il periodo scelto. Non crea doppioni.",
  generaTitolo: "Genera le quote",
  periodoCorrente: "Periodo in corso",
  periodoSuccessivo: "Periodo successivo",
  periodoScelto: "Periodo",
  scadeIl: "Scade il {d}",
  includiIscrizione: "Includi la quota di iscrizione ({importo})",
  generaOra: "Genera le quote di {periodo}",
  generazione: "Genero…",
  esitoGenera: "Quote create: {create}. Già presenti: {gia}. Famiglie con sconto fratelli: {sc}.",
  esitoSenzaQuota: "Corsi saltati perché senza quota: {n}.",
  esitoSenzaIscritti: "Corsi senza iscritti attivi: {n}.",
  vaiElenco: "Vedi i pagamenti",
  corsoNuovo: "Nuovo corso",
  corsoModifica: "Modifica corso",
  nome: "NOME DEL CORSO",
  gruppoCampo: "GRUPPO COLLEGATO",
  nessunoGruppo: "Nessun gruppo (a lezione)",
  quota: "QUOTA IN EURO",
  quotaAiuto: "Lascia vuoto finché non decidi la quota: non viene inventata.",
  rateCampo: "RATE CONSENTITE",
  rateUna: "Solo unica soluzione",
  rateDue: "Anche in 2 rate",
  scontoCampo: "SCONTO FRATELLI (%)",
  iscrizioneCampo: "QUOTA DI ISCRIZIONE IN EURO",
  giornoCampo: "GIORNO DI SCADENZA (1-28)",
  salva: "Salva",
  annulla: "Annulla",
  salvataggio: "Salvo…",
  nomeObbligatorio: "Scrivi il nome del corso.",
  importoNonValido: "L'importo non è valido.",
  percentualeNonValida: "La percentuale deve essere tra 0 e 100.",
  giornoNonValido: "Il giorno deve essere tra 1 e 28.",
  erroreSalva: "Non sono riuscito a salvare: {e}",
  errore: "Non riesco a caricare i corsi: {e}",
  caricamento: "Carico i corsi…",
  nonAutorizzato: "Non hai accesso a questa pagina.",
  reg: "REGOLE",
};
const T = { it: IT, en: { ...IT } };

export default function CorsiQuote() {
  const { centro, sb, ricarica } = useCentro();
  const t = useT(T);
  const [corsi, setCorsi] = useState<Corso[]>([]);
  const [gruppi, setGruppi] = useState<GruppoMin[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [err, setErr] = useState("");
  const [imp, setImp] = useState<ImpPagamenti>(() => leggiImp(centro.impostazioni));
  const [foglio, setFoglio] = useState<null | { tipo: "corso"; corso: Corso | null } | { tipo: "regole" } | { tipo: "genera" }>(null);

  const carica = useCallback(async () => {
    const [c, g] = await Promise.all([
      sb.from("corsi").select("*").eq("centro_id", centro.id).order("created_at"),
      sb.from("gruppi").select("id,nome,fascia,giorni,ora").eq("centro_id", centro.id).order("nome"),
    ]);
    if (c.error || g.error) setErr((c.error ?? g.error)!.message);
    else {
      setErr("");
      setCorsi((c.data ?? []) as Corso[]);
      setGruppi((g.data ?? []) as GruppoMin[]);
    }
    setCaricato(true);
  }, [sb, centro.id]);
  useEffect(() => { carica(); }, [carica]);
  useEffect(() => { setImp(leggiImp(centro.impostazioni)); }, [centro.impostazioni]);

  const gruppoDi = useMemo(() => new Map(gruppi.map((g) => [g.id, g])), [gruppi]);
  const unita = imp.cadenza === "M" ? t.alMese : imp.cadenza === "T" ? t.alTrimestre : t.allAnno;

  /** Salva le impostazioni dei pagamenti dentro centri.impostazioni.pagamenti, senza toccare il resto. */
  const salvaImp = async (patch: Partial<ImpPagamenti>): Promise<string> => {
    const nuovo = { ...imp, ...patch };
    const base = (centro.impostazioni ?? {}) as Record<string, unknown>;
    const { error } = await sb.from("centri").update({ impostazioni: { ...base, pagamenti: nuovo } }).eq("id", centro.id);
    if (error) return error.message;
    setImp(nuovo);
    ricarica();
    return "";
  };

  const pctSconto = corsi.map((c) => c.sconto_fratelli_pct).find((p) => p != null && p > 0) ?? null;
  const base = `/c/${centro.slug}/dt`;
  const scadenzaTesto = fmt(imp.cadenza === "M" ? t.scadM : imp.cadenza === "T" ? t.scadT : t.scadA, { g: imp.giorno_scadenza });

  return (
    <SchermoCentro
      ruolo="dt"
      tab="corsi"
      titolo={t.titolo}
      sopra={`${centro.nome} · ${t.ruolo}`}
      indietro={`${base}/impostazioni`}
      azioni={
        <Link href={`${base}/pagamenti`} className="icon" aria-label={t.vaiPagamenti}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></svg>
        </Link>
      }
      largo
    >
      <div className={s.pagina}>
        {!caricato ? <div className="note" role="status">{t.caricamento}</div> : null}
        {err ? <div className={s.msgErr} role="alert">{fmt(t.errore, { e: err })}</div> : null}

        <div className="seg" role="group" aria-label={t.frequenza} style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {([["M", t.mensile], ["T", t.trimestrale], ["A", t.annuale]] as [Cadenza, string][]).map(([k, l]) => (
            <button key={k} type="button" className={k === imp.cadenza ? "sg on" : "sg"} aria-pressed={k === imp.cadenza} onClick={() => salvaImp({ cadenza: k }).then((e) => e && setErr(fmt(t.erroreSalva, { e })))}>{l}</button>
          ))}
        </div>

        <div className="sec" style={{ marginTop: 2 }}>
          <h2 style={{ fontSize: 16 }}>{t.corsiTitolo}</h2>
          <button type="button" className={s.testoBtn} aria-label={t.aggiungiAria} onClick={() => setFoglio({ tipo: "corso", corso: null })}>{t.aggiungi}</button>
        </div>

        {caricato && !corsi.length && !err ? <div className="note">{t.vuotoCorsi}</div> : null}
        <div className={s.corsiGriglia}>
          {corsi.map((c) => {
            const g = c.gruppo_id ? gruppoDi.get(c.gruppo_id) : undefined;
            const n = g?.giorni?.length ?? 0;
            return (
              <button key={c.id} type="button" className={`li ${s.listaBtn}`} style={{ padding: "8px 12px", gap: 10 }} onClick={() => setFoglio({ tipo: "corso", corso: c })}>
                <span className="ic" style={{ width: 34, height: 34 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                </span>
                <span className="grow">
                  <div className="t" style={{ fontSize: 14, lineHeight: 1.25 }}>{c.nome}</div>
                  <div className="s" style={{ marginTop: 1, fontSize: 12 }}>{g ? (n === 1 ? t.lezioni1 : fmt(t.lezioniN, { n })) : t.nessunGruppo}</div>
                  {g ? <div style={{ marginTop: 1, fontSize: 12, fontWeight: 700, color: "#D8F34A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmt(t.gruppo, { nome: g.nome, orario: giorniGruppo(g) })}</div> : null}
                </span>
                <span style={{ textAlign: "right", flex: "none" }}>
                  {c.quota_cent != null ? (
                    <>
                      <div className={s.quotaVal}>{euro(c.quota_cent)}</div>
                      <div style={{ fontSize: 11, color: "#A1A1A6", marginTop: 3, fontWeight: 600 }}>{g ? unita : t.aLezione}</div>
                    </>
                  ) : (
                    <div className={s.quotaVuota}>{t.impostaQuota}</div>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: "4px 14px" }}>
          <div className={s.riga}>
            <button type="button" className={`${s.rigaBtn} grow`} style={{ textAlign: "left", padding: 0 }} onClick={() => setFoglio({ tipo: "regole" })}>
              <div className={s.rigaT}>{t.scontoTitolo}</div>
              <div className={s.rigaS}>{pctSconto ? fmt(t.scontoSub, { pct: pctSconto }) : t.scontoNessuno}</div>
            </button>
            <Interruttore on={imp.sconto_attivo} etichetta={t.scontoAria} onChange={(v) => salvaImp({ sconto_attivo: v }).then((e) => e && setErr(fmt(t.erroreSalva, { e })))} />
          </div>
          <div className={s.riga}>
            <button type="button" className={`${s.rigaBtn} grow`} style={{ textAlign: "left", padding: 0 }} onClick={() => setFoglio({ tipo: "regole" })}>
              <div className={s.rigaT}>{t.iscrizioneTitolo}</div>
              <div className={s.rigaS}>{t.iscrizioneSub}</div>
            </button>
            {imp.iscrizione_cent != null ? <span className={s.quotaVal}>{euro(imp.iscrizione_cent)}</span> : <button type="button" className={s.testoBtn} onClick={() => setFoglio({ tipo: "regole" })}>{t.impostaQuota}</button>}
          </div>
          <div className={s.riga}>
            <button type="button" className={`${s.rigaBtn} grow`} style={{ textAlign: "left", padding: 0 }} onClick={() => setFoglio({ tipo: "regole" })}>
              <div className={s.rigaT}>{t.scadenzaTitolo}</div>
              <div className={s.rigaS}>{scadenzaTesto}</div>
            </button>
            <span className="tag">{imp.auto.promemoria ? t.promOn : t.promOff}</span>
          </div>
        </div>

        <button type="button" className="btn" style={{ height: 48, fontSize: 15, cursor: "pointer" }} onClick={() => setFoglio({ tipo: "genera" })}>{t.genera}</button>
        <div className="note">{t.generaSub}</div>
      </div>

      {foglio?.tipo === "corso" ? (
        <FoglioCorso t={t} corso={foglio.corso} gruppi={gruppi} chiudi={() => setFoglio(null)}
          salva={async (v) => {
            const riga = { nome: v.nome, gruppo_id: v.gruppo_id || null, quota_cent: v.quota_cent, rate: v.rate, sconto_fratelli_pct: foglio.corso?.sconto_fratelli_pct ?? pctSconto };
            const r = foglio.corso
              ? await sb.from("corsi").update(riga).eq("id", foglio.corso.id)
              : await sb.from("corsi").insert({ ...riga, centro_id: centro.id, scadenze: { giorno: imp.giorno_scadenza } });
            if (r.error) return r.error.message;
            await carica();
            return "";
          }} />
      ) : null}

      {foglio?.tipo === "regole" ? (
        <FoglioRegole t={t} imp={imp} pct={pctSconto} chiudi={() => setFoglio(null)}
          salva={async (v) => {
            const e = await salvaImp({ iscrizione_cent: v.iscrizione_cent, giorno_scadenza: v.giorno });
            if (e) return e;
            // la percentuale sta su ogni corso (colonna sconto_fratelli_pct): si aggiorna per tutti insieme
            const r = await sb.from("corsi").update({ sconto_fratelli_pct: v.pct }).eq("centro_id", centro.id);
            if (r.error) return r.error.message;
            await carica();
            return "";
          }} />
      ) : null}

      {foglio?.tipo === "genera" ? (
        <FoglioGenera t={t} imp={imp} chiudi={() => setFoglio(null)} vaiElenco={`${base}/pagamenti`}
          genera={(offset, conIscrizione) => {
            const per = periodo(imp.cadenza, imp.giorno_scadenza, offset);
            return generaQuote(sb, centro.id, corsi, per, {
              scontoAttivo: imp.sconto_attivo,
              iscrizione: conIscrizione && imp.iscrizione_cent != null ? { codice: `iscrizione-${new Date(per.scade_il).getFullYear()}`, importo_cent: imp.iscrizione_cent } : null,
            });
          }} />
      ) : null}
    </SchermoCentro>
  );
}

type Dz = typeof IT;

function FoglioCorso({ t, corso, gruppi, chiudi, salva }: {
  t: Dz; corso: Corso | null; gruppi: GruppoMin[]; chiudi: () => void;
  salva: (v: { nome: string; gruppo_id: string; quota_cent: number | null; rate: number }) => Promise<string>;
}) {
  const [nome, setNome] = useState(corso?.nome ?? "");
  const [gruppo, setGruppo] = useState(corso?.gruppo_id ?? "");
  const [quota, setQuota] = useState(euroInput(corso?.quota_cent));
  const [rate, setRate] = useState((corso?.rate ?? 1) >= 2 ? 2 : 1);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const invia = async () => {
    if (!nome.trim()) return setMsg(t.nomeObbligatorio);
    const q = quota.trim() ? parseEuro(quota) : null;
    if (quota.trim() && q == null) return setMsg(t.importoNonValido);
    setBusy(true);
    const e = await salva({ nome: nome.trim(), gruppo_id: gruppo, quota_cent: q, rate });
    setBusy(false);
    if (e) setMsg(fmt(t.erroreSalva, { e }));
    else chiudi();
  };
  return (
    <FoglioLocale titolo={corso ? t.corsoModifica : t.corsoNuovo} chiudi={chiudi}>
      <div className={s.campo}><label htmlFor="c-nome">{t.nome}</label><input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div className={s.campo}>
        <label htmlFor="c-gr">{t.gruppoCampo}</label>
        <select id="c-gr" value={gruppo} onChange={(e) => setGruppo(e.target.value)}>
          <option value="">{t.nessunoGruppo}</option>
          {gruppi.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
      </div>
      <div className={s.campo}><label htmlFor="c-q">{t.quota}</label><input id="c-q" inputMode="decimal" value={quota} onChange={(e) => setQuota(e.target.value)} placeholder="0" /><span className="muted" style={{ fontSize: 12 }}>{t.quotaAiuto}</span></div>
      <div>
        <div className={s.etich} style={{ marginBottom: 5 }}>{t.rateCampo}</div>
        <div className="seg" role="group" aria-label={t.rateCampo} style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          <button type="button" className={rate === 1 ? "sg on" : "sg"} aria-pressed={rate === 1} onClick={() => setRate(1)}>{t.rateUna}</button>
          <button type="button" className={rate === 2 ? "sg on" : "sg"} aria-pressed={rate === 2} onClick={() => setRate(2)}>{t.rateDue}</button>
        </div>
      </div>
      {msg ? <div className={s.msgErr} role="alert">{msg}</div> : null}
      <div className={s.azioni}>
        <button type="button" className="btn2" onClick={chiudi}>{t.annulla}</button>
        <button type="button" className="btn" style={{ flex: 1, height: 48 }} disabled={busy} onClick={invia}>{busy ? t.salvataggio : t.salva}</button>
      </div>
    </FoglioLocale>
  );
}

function FoglioRegole({ t, imp, pct, chiudi, salva }: {
  t: Dz; imp: ImpPagamenti; pct: number | null; chiudi: () => void;
  salva: (v: { iscrizione_cent: number | null; giorno: number; pct: number | null }) => Promise<string>;
}) {
  const [sc, setSc] = useState(pct != null ? String(pct) : "");
  const [isc, setIsc] = useState(euroInput(imp.iscrizione_cent));
  const [g, setG] = useState(String(imp.giorno_scadenza));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const invia = async () => {
    const p = sc.trim() ? Number(sc.replace(",", ".")) : null;
    if (p != null && (!Number.isFinite(p) || p < 0 || p > 100)) return setMsg(t.percentualeNonValida);
    const i = isc.trim() ? parseEuro(isc) : null;
    if (isc.trim() && i == null) return setMsg(t.importoNonValido);
    const giorno = Number(g);
    if (!Number.isInteger(giorno) || giorno < 1 || giorno > 28) return setMsg(t.giornoNonValido);
    setBusy(true);
    const e = await salva({ iscrizione_cent: i, giorno, pct: p });
    setBusy(false);
    if (e) setMsg(fmt(t.erroreSalva, { e }));
    else chiudi();
  };
  return (
    <FoglioLocale titolo={t.regole} chiudi={chiudi}>
      <div className={s.campo}><label htmlFor="r-s">{t.scontoCampo}</label><input id="r-s" inputMode="decimal" value={sc} onChange={(e) => setSc(e.target.value)} /></div>
      <div className={s.campo}><label htmlFor="r-i">{t.iscrizioneCampo}</label><input id="r-i" inputMode="decimal" value={isc} onChange={(e) => setIsc(e.target.value)} /></div>
      <div className={s.campo}><label htmlFor="r-g">{t.giornoCampo}</label><input id="r-g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} /></div>
      {msg ? <div className={s.msgErr} role="alert">{msg}</div> : null}
      <div className={s.azioni}>
        <button type="button" className="btn2" onClick={chiudi}>{t.annulla}</button>
        <button type="button" className="btn" style={{ flex: 1, height: 48 }} disabled={busy} onClick={invia}>{busy ? t.salvataggio : t.salva}</button>
      </div>
    </FoglioLocale>
  );
}

function FoglioGenera({ t, imp, chiudi, genera, vaiElenco }: {
  t: Dz; imp: ImpPagamenti; chiudi: () => void; vaiElenco: string;
  genera: (offset: number, conIscrizione: boolean) => Promise<EsitoGenera>;
}) {
  const [offset, setOffset] = useState(0);
  const [conIsc, setConIsc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState<EsitoGenera | null>(null);
  const [msg, setMsg] = useState("");
  const per = periodo(imp.cadenza, imp.giorno_scadenza, offset);
  const vai = async () => {
    setBusy(true);
    setMsg("");
    try { setEsito(await genera(offset, conIsc)); } catch (e) { setMsg(fmt(t.erroreSalva, { e: e instanceof Error ? e.message : String(e) })); }
    setBusy(false);
  };
  return (
    <FoglioLocale titolo={t.generaTitolo} chiudi={chiudi}>
      <div className="seg" role="group" aria-label={t.periodoScelto} style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
        <button type="button" className={offset === 0 ? "sg on" : "sg"} aria-pressed={offset === 0} onClick={() => setOffset(0)}>{t.periodoCorrente}</button>
        <button type="button" className={offset === 1 ? "sg on" : "sg"} aria-pressed={offset === 1} onClick={() => setOffset(1)}>{t.periodoSuccessivo}</button>
      </div>
      <div className="note">{per.titolo} · {fmt(t.scadeIl, { d: new Date(per.scade_il + "T00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) })}</div>
      {imp.iscrizione_cent != null ? (
        <label className={s.check}><input type="checkbox" checked={conIsc} onChange={(e) => setConIsc(e.target.checked)} />{fmt(t.includiIscrizione, { importo: euro(imp.iscrizione_cent) })}</label>
      ) : null}
      {esito ? (
        <div className={s.msgOk} role="status">
          {fmt(t.esitoGenera, { create: esito.create, gia: esito.giaPresenti, sc: esito.scontate })}
          {esito.corsiSenzaQuota ? <div>{fmt(t.esitoSenzaQuota, { n: esito.corsiSenzaQuota })}</div> : null}
          {esito.senzaIscritti ? <div>{fmt(t.esitoSenzaIscritti, { n: esito.senzaIscritti })}</div> : null}
        </div>
      ) : null}
      {msg ? <div className={s.msgErr} role="alert">{msg}</div> : null}
      <div className={s.azioni}>
        <button type="button" className="btn2" onClick={chiudi}>{t.annulla}</button>
        {esito ? (
          <Link href={vaiElenco} className="btn" style={{ flex: 1, height: 48 }}>{t.vaiElenco}</Link>
        ) : (
          <button type="button" className="btn" style={{ flex: 1, height: 48, fontSize: 14 }} disabled={busy} onClick={vai}>{busy ? t.generazione : fmt(t.generaOra, { periodo: per.titolo })}</button>
        )}
      </div>
    </FoglioLocale>
  );
}
