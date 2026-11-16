"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "@/components/centro/Schermo";
import { BarraMattoni, kickMattone } from "./Barra";
import { Pannello, useToast } from "./Pannello";
import { Ico } from "./ico";
import { comune, fmt } from "./testi";
import { annoCorrente, etichettaGruppo, FASCE, leggiGruppo, ordFascia, type Gruppo } from "./dati";
import { generaMesi, leggiMesi, leggiTest, SCHEMA_PER_FASCIA, SCHEMI, settimanaCorrente, statoSett, TH, TH_ORDINE, type Mese, type Schema } from "./programmaLogica";
import { useMetodo } from "./useMetodo";
import "./metodo.css";

const it = {
  ...comune,
  titolo: "Programmi",
  schema_lab: "Schema di partenza",
  consigliato: "Consigliato per {f}: {s}",
  sch_mensile: "Focus mensile",
  sch_settimanale: "Focus settimanale",
  sch_blocchi: "Lezione a blocchi",
  sch_periodizzazione: "Periodizzazione agonistica",
  sch_libero: "Libero guidato",
  schd_mensile: "Un colpo al mese: tutte le lezioni del gruppo ruotano attorno allo stesso tema.",
  schd_settimanale: "Un colpo diverso ogni settimana: più varietà, adatto ai più piccoli.",
  schd_blocchi: "Il tema segue il Modello di lezione scelto per ogni settimana.",
  schd_periodizzazione: "Fasi di carico crescente con settimana di scarico, per i gruppi agonisti.",
  schd_libero: "Restano fissi solo i test: il maestro sceglie tra i temi approvati dal DT.",
  calendario_aria: "Calendario annuale, da settembre ad agosto",
  ora: "ORA",
  con_test: ", con settimana di test",
  stato_corso: "{w} di 4 · in corso",
  stato_concluso: "concluso",
  stato_da_svolgere: "da svolgere",
  main_mensile: "{c}",
  main_settimanale: "un colpo a settimana",
  main_blocchi: "a blocchi",
  main_libero: "libero guidato",
  w_test: "Test · bloccata",
  w_corso: "In corso",
  w_svolta: "Svolta",
  w_fare: "Da fare",
  bozza_non_salvata: "Bozza non ancora salvata",
  salvato_stato: "Programma salvato",
  modificato: "Modifiche non salvate",
  salva: "Salva il programma",
  salvato_ok: "Programma salvato",
  assegna: "Assegna a {g}",
  assegna_gruppo: "Assegna a un gruppo",
  assegna_titolo: "Assegna il programma",
  assegna_testo: "Scegli i gruppi {f} che seguono questo programma. Il maestro vedrà ogni settimana il tema e il modello di lezione.",
  assegna_nessuno: "Non ci sono gruppi {f}. Creali nella pagina Gruppi e poi assegna il programma.",
  assegna_vai: "Vai ai Gruppi",
  assegna_conferma: "Conferma",
  assegnato_ok: "Programma assegnato",
  sostituisce: "Ora segue un altro programma",
  anno_lab: "Anno {a}/{b}",
  modifica_mese: "Modifica {m}",
  mese_tema: "Tema del mese",
  mese_sett: "Settimane",
  sett_modello: "Modello di lezione",
  sett_nessun_modello: "Scelto dal maestro",
  sett_tema: "Tema",
  sett_test_sw: "Settimana di test (bloccata)",
  conferma_schema: "Cambiando schema il calendario viene rigenerato e le modifiche non salvate si perdono. Continuare?",
  fascia_bozza: "Nessun programma salvato per {f}: questa è la bozza dello schema consigliato.",
  nome_prog: "Programma {f} {a}/{b}",
  th_pal: "Palleggio", th_gam: "Gambe", th_dri: "Dritto", th_rov: "Rovescio", th_ser: "Servizio", th_ris: "Risposta", th_vol: "Volée", th_tat: "Tattica", th_rip: "Ripasso", th_tor: "Torneo", th_cam: "Camp", th_pau: "Pausa",
  th_test_ab: "T",
  sett_test: "Settimana di test",
  sett_test_corto: "Test",
  sett_di: "Settimana di {c}",
  sett_nessuna: "Nessuna lezione",
  sett_carico: "Carico {l}% · {f}",
  sett_picco: "picco",
  sett_scarico: "scarico",
  sett_crescita: "in crescita",
  sett_libero: "Libero",
  sett_scelto: "Tema scelto dal maestro",
  mo_multi: "Multicolpo",
  mo_uno: "Un colpo",
  mo_gio: "Tec.+gioco",
  mo_pausa: "Pausa",
  mod_multi: "Multicolpo a quarti",
  mod_uno: "Un colpo a fondo",
  mod_gio: "Tecnica + gioco",
  ph_base: "Base",
  ph_spec: "Specifica",
  ph_pre: "Pre-gara",
  ph_gara: "Gara",
  ph_scarico: "Scarico",
  ph_camp: "Camp",
  ph_rec: "Recupero",
  wk_dri_1: "Impugnatura e preparazione", wk_dri_2: "Punto di impatto", wk_dri_3: "Direzione e chiusura", wk_dri_4: "Dritto in partita",
  wk_rov_1: "Presa a due mani", wk_rov_2: "Rotazione delle spalle", wk_rov_3: "Impatto e spinta", wk_rov_4: "Rovescio in partita",
  wk_ser_1: "Lancio di palla", wk_ser_2: "Trophy e gambe", wk_ser_3: "Impatto alto", wk_ser_4: "Servizio a punti",
  wk_gen_1: "Posizione e preparazione", wk_gen_2: "Impatto e controllo", wk_gen_3: "Direzione e continuità", wk_gen_4: "Dal gesto al gioco",
};
const T = { it, en: { ...it } };

type Bozza = { id: string | null; nome: string; schema: Schema; mesi: Mese[]; test: string[]; salvato: boolean };

/** C8 · Programmi: calendario annuale per fascia, mesi a tema, schemi di partenza, settimane di test, assegnazione ai gruppi. */
export default function Programmi() {
  const t = useT(T) as Record<string, string>;
  const { sb, centro, puoModificare, reg } = useMetodo();
  const oggi = useMemo(() => new Date(), []);
  const anno = annoCorrente(oggi);
  const cur = useMemo(() => settimanaCorrente(oggi), [oggi]);
  const [progs, setProgs] = useState<Record<string, unknown>[]>([]);
  const [modelli, setModelli] = useState<{ id: string; nome: string; durata: number }[]>([]);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [carica, setCarica] = useState(true);
  const [ko, setKo] = useState(false);
  const [fascia, setFascia] = useState<string>("U12");
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [sporco, setSporco] = useState(false);
  const [m, setM] = useState(cur.m);
  const [modMese, setModMese] = useState(false);
  const [assegna, setAssegna] = useState(false);
  const [scelti, setScelti] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const [toast, mostra] = useToast();

  const leggi = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      sb.from("programmi").select("*").eq("centro_id", centro.id),
      sb.from("modelli_lezione").select("id,nome,durata_min").eq("centro_id", centro.id),
      sb.from("gruppi").select("*").eq("centro_id", centro.id),
    ]);
    if (a.error) {
      setKo(true);
      setCarica(false);
      return;
    }
    setProgs((a.data ?? []) as Record<string, unknown>[]);
    setModelli((b.data ?? []).map((r: Record<string, unknown>) => ({ id: String(r.id), nome: String(r.nome ?? ""), durata: Number(r.durata_min) || 60 })));
    setGruppi((c.data ?? []).map((r: Record<string, unknown>) => leggiGruppo(r)).filter((g: Gruppo) => g.attivo));
    setKo(false);
    setCarica(false);
  }, [sb, centro.id]);
  useEffect(() => {
    leggi();
  }, [leggi]);

  const modelloId = useCallback(
    (nome: string) => {
      const l = modelli.filter((x) => x.nome === nome);
      return (l.find((x) => x.durata === 60) ?? l[0])?.id ?? null;
    },
    [modelli],
  );

  // Fasce disponibili: quelle standard più eventuali fasce già usate da gruppi o programmi del centro
  const fasce = useMemo(() => {
    const s = new Set<string>(FASCE);
    gruppi.forEach((g) => g.fascia && s.add(g.fascia));
    progs.forEach((p) => p.fascia && s.add(String(p.fascia)));
    return [...s].sort((a, b) => ordFascia(a) - ordFascia(b));
  }, [gruppi, progs]);
  const nomeFascia = (f: string) => t[`fascia_${f}`] ?? f;

  const genera = useCallback((schema: Schema, test: string[]) => generaMesi(schema, t, test, modelloId), [t, modelloId]);

  // Quando cambia fascia o arrivano i dati si carica il programma salvato, oppure si prepara la bozza consigliata
  useEffect(() => {
    if (carica) return;
    const p = progs.find((x) => String(x.fascia) === fascia && (Number(x.anno) || anno) === anno);
    if (p) {
      const schema = (SCHEMI as string[]).includes(String(p.schema)) ? (String(p.schema) as Schema) : SCHEMA_PER_FASCIA[fascia] ?? "mensile";
      const test = leggiTest(p.settimane_test);
      setBozza({ id: String(p.id), nome: String(p.nome ?? ""), schema, test, mesi: leggiMesi(p.mesi, genera(schema, test), t), salvato: true });
    } else {
      const schema = SCHEMA_PER_FASCIA[fascia] ?? "mensile";
      const test = leggiTest(undefined);
      setBozza({ id: null, nome: fmt(t.nome_prog, { f: fascia, a: anno, b: anno + 1 }), schema, test, mesi: genera(schema, test), salvato: false });
    }
    setSporco(false);
  }, [carica, progs, fascia, anno, genera, t]);

  const gruppiFascia = gruppi.filter((g) => g.fascia === fascia);
  const gruppoLabel = gruppiFascia[0] ? etichettaGruppo(gruppiFascia[0], t) : nomeFascia(fascia);

  function cambiaSchema(s: Schema) {
    if (!bozza || s === bozza.schema) return;
    if ((sporco || bozza.salvato) && !window.confirm(t.conferma_schema)) return;
    setBozza({ ...bozza, schema: s, mesi: genera(s, bozza.test) });
    setSporco(true);
  }
  const aggiorna = (mesi: Mese[]) => {
    if (!bozza) return;
    const test = mesi.flatMap((x) => x.settimane.map((s, w) => (s.test ? `${x.mese}-${w + 1}` : "")).filter(Boolean));
    setBozza({ ...bozza, mesi, test });
    setSporco(true);
  };
  const mutaMese = (i: number, fn: (x: Mese) => Mese) => bozza && aggiorna(bozza.mesi.map((x, j) => (j === i ? fn({ ...x, settimane: x.settimane.map((s) => ({ ...s })) }) : x)));

  function scegliTemaMese(i: number, k: string) {
    const [lk, , col] = TH[k];
    mutaMese(i, (x) => ({
      ...x,
      tema: t[lk],
      colpo: t[lk],
      colore: col,
      settimane: x.settimane.map((s, w) =>
        s.test ? s : { ...s, colore: col, tema: ["dri", "rov", "ser"].includes(k) ? t[`wk_${k}_${w + 1}`] : t[`wk_gen_${w + 1}`] },
      ),
    }));
  }
  function scegliTemaSett(i: number, w: number, k: string) {
    const [lk, , col] = TH[k];
    mutaMese(i, (x) => ({ ...x, settimane: x.settimane.map((s, j) => (j === w ? { ...s, test: undefined, tema: fmt(t.sett_di, { c: t[lk].toLowerCase() }), colore: col } : s)) }));
  }
  function toggleTest(i: number, w: number) {
    mutaMese(i, (x) => ({
      ...x,
      settimane: x.settimane.map((s, j) => {
        if (j !== w) return s;
        return s.test ? { tema: t.sett_scelto, colore: x.colore, modello_id: null } : { tema: t.sett_test, colore: "#FFFFFF", modello_id: null, test: true };
      }),
    }));
  }

  async function salva(): Promise<string | null> {
    if (!bozza) return null;
    setBusy(true);
    setErrore("");
    const payload = { centro_id: centro.id, nome: bozza.nome, fascia, schema: bozza.schema, anno, mesi: bozza.mesi, settimane_test: bozza.test };
    let id = bozza.id;
    let err: unknown = null;
    if (id) {
      err = (await sb.from("programmi").update(payload).eq("id", id)).error;
    } else {
      const r = await sb.from("programmi").insert(payload).select("id").single();
      err = r.error;
      id = r.data ? String((r.data as Record<string, unknown>).id) : null;
    }
    setBusy(false);
    if (err || !id) {
      setErrore(t.errore);
      return null;
    }
    await reg(bozza.id ? "metodo.programma.modifica" : "metodo.programma.crea", bozza.nome, { fascia, schema: bozza.schema, anno, test: bozza.test });
    setSporco(false);
    mostra(t.salvato_ok);
    await leggi();
    return id;
  }

  async function confermaAssegna() {
    if (!bozza) return;
    let id = bozza.id;
    if (!id || sporco) id = await salva();
    if (!id) return;
    setBusy(true);
    const prima = gruppiFascia.filter((g) => g.programma_id === id).map((g) => g.id);
    const aggiungi = scelti.filter((x) => !prima.includes(x));
    const togli = prima.filter((x) => !scelti.includes(x));
    let ko2 = false;
    if (aggiungi.length) ko2 = !!(await sb.from("gruppi").update({ programma_id: id }).in("id", aggiungi)).error || ko2;
    if (togli.length) ko2 = !!(await sb.from("gruppi").update({ programma_id: null }).in("id", togli)).error || ko2;
    setBusy(false);
    if (ko2) return setErrore(t.errore);
    await reg("metodo.programma.assegna", bozza.nome, { programma_id: id, gruppi: scelti, tolti: togli });
    setAssegna(false);
    mostra(t.assegnato_ok);
    leggi();
  }

  if (carica || !bozza) {
    return (
      <SchermoCentro ruolo="dt" tab="metodo" titolo={t.titolo} largo>
        <div className="mm">{ko ? <div className="mm-err">{t.errore_lettura}</div> : <div className="mm-load">{t.caricamento}</div>}</div>
      </SchermoCentro>
    );
  }

  const mese = bozza.mesi[m];
  const stato = (i: number, w: number) => statoSett(anno, annoCorrente(), i, w, cur);
  const consigliato = SCHEMA_PER_FASCIA[fascia] ?? "mensile";
  const mainName = bozza.schema === "mensile" ? mese.tema : bozza.schema === "settimanale" ? t.main_settimanale : bozza.schema === "blocchi" ? t.main_blocchi : bozza.schema === "periodizzazione" ? mese.tema.toLowerCase() : t.main_libero;
  const mCorrente = anno === annoCorrente() && m === cur.m;
  const mStato = anno < annoCorrente() || (anno === annoCorrente() && m < cur.m) ? t.stato_concluso : mCorrente ? fmt(t.stato_corso, { w: cur.w + 1 }) : t.stato_da_svolgere;

  const tile = (x: Mese, i: number) => {
    const test = x.settimane.some((s) => s.test);
    const libero = bozza.schema === "libero" && !test;
    const neutro = bozza.schema === "settimanale";
    const bg = neutro ? "#161618" : libero ? "transparent" : `${x.colore}26`;
    const bd = libero ? "1.5px dashed #3A3A3C" : neutro ? "1px solid #2C2C2E" : `1px solid ${x.colore}66`;
    return (
      <button
        key={x.mese}
        type="button"
        className={`mm-mese${i === m ? " sel" : ""}`}
        style={{ background: bg, border: bd }}
        aria-label={`${t[`mf${i}`]}: ${x.tema}${test ? t.con_test : ""}`}
        onClick={() => setM(i)}
      >
        <span className="m"><span>{anno === annoCorrente() && i === cur.m ? `${t[`m${i}`].toUpperCase()} · ${t.ora}` : t[`m${i}`].toUpperCase()}</span>{test ? <Ico n="flag" s={11} w={2.4} /> : null}</span>
        <span className="n" style={{ color: libero ? "#8E8E93" : "#F3F6F1" }}>{x.tema}</span>
        <span className="mm-ticks">
          {x.settimane.map((s, w) => {
            const st = stato(i, w);
            const h = s.carico ? Math.max(3, Math.round(s.carico * 0.12)) : 6;
            const base = bozza.schema === "libero" && !s.test ? "#2C2C2E" : s.colore;
            const bgc = s.test ? "transparent" : st === "c" ? "#fff" : st === "p" ? base : `${base}55`;
            return <i key={w} style={{ height: h, background: bgc, border: s.test ? "1.5px solid #fff" : undefined }} />;
          })}
        </span>
      </button>
    );
  };

  return (
    <SchermoCentro ruolo="dt" tab="metodo" titolo={t.titolo} sopra={`${kickMattone(t, 4, centro.nome)} · ${fmt(t.anno_lab, { a: anno, b: anno + 1 })}`} largo>
      <div className="mm">
        <BarraMattoni slug={centro.slug} attiva="prog" />
        <div className="mm-scroll" role="group" aria-label={t.fascia_aria.replace("{f}", "")}>
          {fasce.map((f) => (
            <button key={f} type="button" className={`mm-chip${f === fascia ? " on" : ""}`} aria-label={fmt(t.fascia_aria, { f: nomeFascia(f) })} aria-pressed={f === fascia} onClick={() => setFascia(f)}>{f}</button>
          ))}
        </div>
        {!bozza.salvato ? <div className="mm-note">{fmt(t.fascia_bozza, { f: nomeFascia(fascia) })}</div> : null}
        <div className="mm-prcols mm-cols">
          <div className="mm-cols">
            <div className="mm-cols" style={{ gap: 5 }}>
              <div className="mm-sec"><span className="mm-k">{t.schema_lab}</span><span style={{ fontSize: 11, fontWeight: 700, color: "#D8F34A" }}>{fmt(t.consigliato, { f: fascia, s: t[`sch_${consigliato}`] })}</span></div>
              <div className="mm-scroll">
                {SCHEMI.map((s) => (
                  <button key={s} type="button" className={`mm-chip${s === bozza.schema ? " on" : ""}`} disabled={!puoModificare} onClick={() => cambiaSchema(s)}>{t[`sch_${s}`]}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.35, color: "#A1A1A6" }}>{t[`schd_${bozza.schema}`]}</div>
            </div>
            <div className="mm-cal" role="group" aria-label={t.calendario_aria}>
              {bozza.mesi.map((x, i) => tile(x, i))}
            </div>
          </div>

          <div className="mm-cols">
            <div className="mm-card" style={{ gap: 4 }}>
              <div className="mm-sec">
                <h2 className="mm-disp mm-ell" style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{t[`mf${m}`]} · {mainName}</h2>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#D8F34A", whiteSpace: "nowrap" }}>{mStato}</span>
              </div>
              {mese.settimane.map((s, w) => {
                const st = stato(m, w);
                return (
                  <div key={w} className={`mm-wk${st === "c" ? " cur" : ""}`}>
                    <span className="w">S{w + 1}</span>
                    <span className="mm-grow mm-ell" style={{ fontSize: 12.5, fontWeight: 600 }}>{s.tema}</span>
                    <span className="mm-tag" style={s.test ? { background: "#232326", color: "#F3F6F1" } : st === "c" ? { background: "#D8F34A", color: "#0B0B0C" } : st === "p" ? { background: "#17301F", color: "#4CD07D" } : undefined}>
                      {s.test ? t.w_test : st === "c" ? t.w_corso : st === "p" ? t.w_svolta : t.w_fare}
                    </span>
                  </div>
                );
              })}
              {puoModificare ? (
                <button type="button" className="mm-btn2 sm" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => setModMese(true)}><Ico n="edit" s={14} />{fmt(t.modifica_mese, { m: t[`mf${m}`] })}</button>
              ) : null}
            </div>
            {errore ? <div className="mm-err">{errore}</div> : null}
            {puoModificare ? (
              <div className="mm-row" style={{ flexWrap: "wrap" }}>
                {sporco || !bozza.salvato ? (
                  <button type="button" className="mm-btn" style={{ flex: 1 }} disabled={busy} onClick={() => salva()}>{t.salva}</button>
                ) : null}
                <button type="button" className={sporco || !bozza.salvato ? "mm-btn2" : "mm-btn"} style={{ flex: 1 }} disabled={busy} onClick={() => { setScelti(gruppiFascia.filter((g) => g.programma_id && g.programma_id === bozza.id).map((g) => g.id)); setAssegna(true); }}>
                  {gruppiFascia.length === 1 ? fmt(t.assegna, { g: gruppoLabel }) : t.assegna_gruppo}
                </button>
              </div>
            ) : (
              <div className="mm-note">{t.sola_lettura}</div>
            )}
            {sporco ? <span className="mm-tag wa" style={{ alignSelf: "flex-start" }}>{t.modificato}</span> : null}
          </div>
        </div>
      </div>

      <Pannello aperto={modMese} titolo={fmt(t.modifica_mese, { m: t[`mf${m}`] })} onChiudi={() => setModMese(false)}>
        {bozza.schema === "mensile" ? (
          <div className="mm-fld">
            <span className="mm-lab">{t.mese_tema.toUpperCase()}</span>
            <div className="mm-chips">
              {TH_ORDINE.map((k) => (
                <button key={k} type="button" className={`mm-chip${mese.tema === t[TH[k][0]] ? " on" : ""}`} onClick={() => scegliTemaMese(m, k)}>{t[TH[k][0]]}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mm-fld">
          <span className="mm-lab">{t.mese_sett.toUpperCase()}</span>
          {mese.settimane.map((s, w) => (
            <div key={w} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 14, background: "#0E0E10" }}>
              <div className="mm-row">
                <span className="mm-disp" style={{ fontSize: 17, fontWeight: 800, color: "#A1A1A6", width: 26 }}>S{w + 1}</span>
                <span className="mm-grow mm-ell" style={{ fontSize: 13, fontWeight: 700 }}>{s.tema}</span>
                <span className="mm-mu" style={{ fontSize: 11.5 }}>{t.sett_test_sw}</span>
                <button type="button" className={`mm-sw${s.test ? " on" : ""}`} role="switch" aria-checked={!!s.test} aria-label={`S${w + 1} ${t.sett_test_sw}`} onClick={() => toggleTest(m, w)}><i /></button>
              </div>
              {!s.test ? (
                <>
                  <select className="mm-sel" aria-label={`${t.sett_tema} S${w + 1}`} value="" onChange={(e) => e.target.value && scegliTemaSett(m, w, e.target.value)}>
                    <option value="">{t.sett_tema}…</option>
                    {TH_ORDINE.map((k) => (
                      <option key={k} value={k}>{t[TH[k][0]]}</option>
                    ))}
                  </select>
                  <select className="mm-sel" aria-label={`${t.sett_modello} S${w + 1}`} value={s.modello_id ?? ""} onChange={(e) => mutaMese(m, (x) => ({ ...x, settimane: x.settimane.map((y, j) => (j === w ? { ...y, modello_id: e.target.value || null } : y)) }))}>
                    <option value="">{t.sett_nessun_modello}</option>
                    {modelli.map((md) => (
                      <option key={md.id} value={md.id}>{md.nome} · {fmt(t.min_ab, { n: md.durata })}</option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
          ))}
        </div>
        <button type="button" className="mm-btn" onClick={() => setModMese(false)}>{t.chiudi}</button>
      </Pannello>

      <Pannello aperto={assegna} titolo={t.assegna_titolo} onChiudi={() => setAssegna(false)}>
        {gruppiFascia.length === 0 ? (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.4, color: "#A1A1A6" }}>{fmt(t.assegna_nessuno, { f: nomeFascia(fascia) })}</div>
            <Link href={`/c/${centro.slug}/dt/gruppi`} className="mm-btn">{t.assegna_vai}</Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13.5, lineHeight: 1.4, color: "#A1A1A6" }}>{fmt(t.assegna_testo, { f: nomeFascia(fascia) })}</div>
            <div className="mm-cards">
              {gruppiFascia.map((g) => {
                const on = scelti.includes(g.id);
                const altro = !!g.programma_id && g.programma_id !== bozza.id;
                return (
                  <button key={g.id} type="button" className="mm-li" role="checkbox" aria-checked={on} onClick={() => setScelti((p) => (on ? p.filter((x) => x !== g.id) : [...p, g.id]))}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, border: "2px solid #636366", background: on ? "#D8F34A" : "transparent", color: "#0B0B0C", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{on ? <Ico n="check" s={14} w={3} /> : null}</span>
                    <span className="mm-grow"><span className="t mm-ell" style={{ display: "block" }}>{etichettaGruppo(g, t)}</span>{altro ? <span className="s" style={{ display: "block" }}>{t.sostituisce}</span> : null}</span>
                  </button>
                );
              })}
            </div>
            {errore ? <div className="mm-err">{errore}</div> : null}
            <div className="mm-row" style={{ flexWrap: "wrap" }}>
              <button type="button" className="mm-btn" disabled={busy} onClick={confermaAssegna}>{t.assegna_conferma}</button>
              <button type="button" className="mm-btn2" onClick={() => setAssegna(false)}>{t.annulla}</button>
            </div>
          </>
        )}
      </Pannello>
      {toast}
    </SchermoCentro>
  );
}
