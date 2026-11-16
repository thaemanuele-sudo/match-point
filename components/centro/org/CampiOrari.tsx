"use client";
// C19 · Campi e maestri: griglia campi × orari della settimana, campo abituale per maestro, cambio campo con controllo dei conflitti
// e notifica a maestro, allievi e famiglie (funzione cambia_campo del database).
import { useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Caricamento, Chip, Chips, Errore, Foglio, Ico, Interruttore, Nota, Seg, Tag, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { aggiungiGiorni, fmtData, fmtDataLunga, fmtOra, inizioSettimana, isoGiorno, prossimeLezioni } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import {
  colorePerArea, conflittiPosti, controllaCambio, inManutenzione, maestriDi, nomeBreve, nomeCompleto, postiDelGiorno, sostituisci, useOrg,
  type DatiOrg, type EsitoCambio, type Org,
} from "./dati";
import type { CampoR, GruppoR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Campi e maestri", sopra: "{centro} · settimana {a}-{b} {mese}", giorni: "Giorno della settimana", campo: "Campo {n}", libero: "libero", manut: "Manut.", fondo: "fondo", daC: "da C{n}",
  lCambio: "Cambio campo", lManut: "Manutenzione", lLibero: "Libero", lConf: "Conflitto", nessunaLezione: "Nessuna lezione in questo giorno.", vuotoT: "Nessun campo", vuotoS: "Aggiungi i campi del centro per vedere gli orari.",
  abitT: "Campo abituale per maestro", regola: "regola fissa", abitAiuto: "Tocca un maestro per cambiare il campo dei suoi gruppi.", senzaCampo: "—",
  cambio: "CAMBIO", cambiaBtn: "Cambia campo", cambioDa: "Campo {a} → Campo {b}", motivoDeciso: "{g} · motivo: {m} · deciso da {chi}", nessunCambio: "Nessun cambio campo in programma", nessunCambioS: "Quando un campo non è disponibile, spostalo da qui: avvisiamo tutti.",
  avvisa: "Avvisa con notifica: maestro, allievi e famiglie", anteprimaT: "ANTEPRIMA · MAESTRO, ALLIEVI, FAMIGLIE", anteprimaN: "Nessuna notifica: dovrai avvisare tu maestro, allievi e famiglie.",
  anteprima: "Cambio campo: {g} {d}, {gr} si allena sul Campo {a} ({desc}), non sul Campo {da}.",
  fData: "DATA", fGruppo: "GRUPPO", fCampo: "CAMPO NUOVO", fMotivo: "MOTIVO", conferma: "Conferma e avvisa tutti", confermaSenza: "Conferma senza avvisare", salvo: "Salvo…", chiudi: "Chiudi",
  m_manutenzione: "Manutenzione", m_pioggia: "Pioggia", m_torneo: "Torneo", m_altro: "Altro", mm_manutenzione: "manutenzione del fondo", mm_pioggia: "pioggia", mm_torneo: "torneo", mm_altro: "altro motivo",
  c_noLezione: "{a} non ha lezione quel giorno", c_nonDisponibile: "Campo {a} non disponibile", c_soloMini: "Campo {a} è il mini campo: solo U8 e U10", c_occupato: "Campo {a} occupato da {b} a quell'ora",
  c_stesso: "È il campo abituale: nessun cambio da fare", c_libero: "Campo {a} libero alle {b}", c_nessunCampo: "Scegli gruppo e campo", nessunGruppo: "Nessun gruppo con lezioni in programma.",
  abitT2: "Campo abituale di {n}", abitS: "Imposta il campo dei gruppi di cui è maestro principale.", abitSalva: "Imposta campo", abitConf: "Conflitto: {a} e {b} sullo stesso campo alle {o}.", abitFatto: "Nessun gruppo da spostare.",
  superf_terra: "terra rossa", superf_cemento: "cemento", superf_sintetico: "sintetico", superf_erba: "erba", cop_scoperto: "scoperto", cop_coperto: "coperto", cop_pallone: "con pallone",
  cella: "{g}, {m}", altri: "+{n}",
};
const T = { it: IT, en: { ...IT } };
const MOTIVI = ["manutenzione", "pioggia", "torneo", "altro"] as const;

export default function CentroCampiOrari() {
  const t = useT(T);
  const o = useOrg();
  const { centro, dati: d } = o;
  const r = rotta(centro.slug);
  const lun = useMemo(() => inizioSettimana(), []);
  const settimana = useMemo(() => Array.from({ length: 7 }, (_, i) => isoGiorno(aggiungiGiorni(lun, i))), [lun]);
  const [giorno, setGiorno] = useState(() => (settimana.includes(isoGiorno()) ? isoGiorno() : settimana[0]));
  const [foglio, setFoglio] = useState(false);
  const [abit, setAbit] = useState<string | null>(null);

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="campi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.campi} largo>{corpo}</SchermoCentro>
  );
  if (!d) return schermo(o.errore ? <Errore messaggio={o.errore} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const campi = o.campiVis.length ? o.campiVis : d.campi;
  const gruppiAttivi = o.gruppiVis.filter((g) => g.attivo);
  const posti = postiDelGiorno(gruppiAttivi, d.cambi, giorno);
  const inConflitto = new Set(conflittiPosti(posti, d.gm).filter((c) => c.tipo === "campo").flatMap((c) => [c.a.gruppo.id, c.b.gruppo.id]));
  const ore = [...new Set(posti.map((p) => p.da))].sort((a, b) => a - b);
  const mm = new Date(lun).toLocaleDateString("it-IT", { month: "long" });
  const sopra = sostituisci(t.sopra, { centro: centro.nome, a: lun.getDate(), b: aggiungiGiorni(lun, 6).getDate(), mese: mm });
  const nomeOra = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const puo = o.can("campi") || o.can("gruppi");

  // cambio in evidenza: il prossimo in programma, altrimenti l'ultimo
  const cambiOrd = [...d.cambi].filter((c) => gruppiAttivi.some((g) => g.id === c.gruppo_id)).sort((a, b) => (a.data > b.data ? 1 : -1));
  const ultimo = cambiOrd.find((c) => c.data >= o.oggi) ?? cambiOrd[cambiOrd.length - 1];

  // campo abituale di ogni maestro: quello dei gruppi di cui è principale
  const maestri = d.membri.filter((m) => m.ruolo === "maestro" && d.gm.some((x) => x.membro_id === m.id && gruppiAttivi.some((g) => g.id === x.gruppo_id)));
  const abitualeDi = (id: string) => {
    const gs = gruppiAttivi.filter((g) => d.gm.some((x) => x.membro_id === id && x.gruppo_id === g.id && x.principale));
    const conta = new Map<string, number>();
    gs.forEach((g) => g.campo_id && conta.set(g.campo_id, (conta.get(g.campo_id) ?? 0) + 1));
    const top = [...conta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return d.campi.find((c) => c.id === top);
  };

  return schermo(
    <div className="og-pagina">
      <Seg ariaLabel={t.giorni} valore={giorno} onChange={setGiorno} valori={settimana.map((iso) => ({ id: iso, etichetta: fmtData(iso).split(" ").slice(0, 2).map((x, i) => (i === 0 ? x.charAt(0).toUpperCase() + x.slice(1) : x)).join(" ") }))} />
      {campi.length === 0 ? <Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="grid" /> : (
        <div className="og-split">
          <div className="card" style={{ padding: "8px 10px 9px" }}>
            {ore.length === 0 ? <div className="og-s" style={{ padding: 10 }}>{t.nessunaLezione}</div> : (
              <div className="og-griglia" style={{ gridTemplateColumns: `42px repeat(${campi.length},minmax(0,1fr))` }}>
                <div className="og-testa" />
                {campi.map((c) => <div key={c.id} className="og-testa">{sostituisci(t.campo, { n: c.numero })}</div>)}
                {ore.map((m) => (
                  <Riga key={m} ora={nomeOra(m)} m={m} campi={campi} posti={posti} giorno={giorno} d={d} inConflitto={inConflitto} t={t} />
                ))}
              </div>
            )}
            <div className="og-legenda">
              <span><i style={{ width: 12, height: 10, borderRadius: 3, border: "1px solid #D8F34A", background: "rgba(216,243,74,.16)", display: "inline-block" }} />{t.lCambio}</span>
              <span><i style={{ width: 12, height: 10, borderRadius: 3, background: "repeating-linear-gradient(45deg,#4A3C10 0 3px,#2A2310 3px 6px)", display: "inline-block" }} />{t.lManut}</span>
              <span><i style={{ width: 12, height: 10, borderRadius: 3, border: "1px solid #FF5A5F", background: "rgba(255,90,95,.14)", display: "inline-block" }} />{t.lConf}</span>
              <span><i style={{ width: 12, height: 10, borderRadius: 3, background: "#0E0E10", border: "1px solid #2C2C2E", display: "inline-block" }} />{t.lLibero}</span>
            </div>
          </div>
          <div className="og-pagina">
            <div className="card og-card" style={{ padding: "10px 12px" }}>
              <div className="og-barra-tit"><span className="og-k">{t.abitT}</span><span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>{t.regola}</span></div>
              <div className="og-abit">
                {maestri.map((m) => {
                  const c = abitualeDi(m.id);
                  return (
                    <button key={m.id} type="button" disabled={!o.can("gruppi")} onClick={() => setAbit(m.id)}>
                      <div className="n">{nomeBreve(m)}</div><div className="c">{c ? sostituisci(t.campo, { n: c.numero }) : t.senzaCampo}</div>
                    </button>
                  );
                })}
              </div>
              {o.can("gruppi") && <div className="og-s">{t.abitAiuto}</div>}
            </div>
            <div className="card og-card" style={{ padding: 12, borderColor: "rgba(216,243,74,.45)" }}>
              {ultimo ? <CartaCambio c={ultimo} d={d} t={t} puo={puo} apri={() => setFoglio(true)} /> : (
                <>
                  <div className="og-t">{t.nessunCambio}</div><div className="og-s">{t.nessunCambioS}</div>
                  {puo && <Btn piccolo variante="secondario" onClick={() => setFoglio(true)} icona="swap">{t.cambiaBtn}</Btn>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {foglio && <FoglioCambio o={o} d={d} ultimo={ultimo} onChiudi={() => setFoglio(false)} onFatto={(iso) => { if (settimana.includes(iso)) setGiorno(iso); }} />}
      {abit && <FoglioAbituale o={o} d={d} membroId={abit} onChiudi={() => setAbit(null)} />}
    </div>,
    sopra,
  );
}

type Tt = typeof IT;
function Riga({ ora, m, campi, posti, giorno, d, inConflitto, t }: { ora: string; m: number; campi: CampoR[]; posti: ReturnType<typeof postiDelGiorno>; giorno: string; d: DatiOrg; inConflitto: Set<string>; t: Tt }) {
  return (
    <>
      <div className="og-ora">{ora}</div>
      {campi.map((c) => {
        const qui = posti.filter((p) => p.da === m && p.campoId === c.id);
        const p = qui[0];
        if (p) {
          const mae = maestriDi(d, p.gruppo.id)[0];
          const conf = inConflitto.has(p.gruppo.id);
          const cl = conf ? "conf" : p.cambio ? "cambio" : "l";
          const da = p.cambio ? d.campi.find((x) => x.id === p.cambio?.campo_da)?.numero : null;
          return (
            <div key={c.id} className={`og-cella ${cl}`} style={{ ["--c" as string]: colorePerArea(d, p.gruppo.area_id) }}>
              <div className="og-riga" style={{ justifyContent: "space-between", flexWrap: "nowrap", gap: 2 }}><b>{p.gruppo.nome}</b>{da != null && <em>{sostituisci(t.daC, { n: da })}</em>}{qui.length > 1 && <em>{sostituisci(t.altri, { n: qui.length - 1 })}</em>}</div>
              <span>{mae ? nomeBreve(mae) : ""}</span>
            </div>
          );
        }
        if (inManutenzione(c, d.cambi, giorno)) return <div key={c.id} className="og-cella man"><b>{t.manut}</b><span>{t.fondo}</span></div>;
        return <div key={c.id} className="og-cella vuota"><b>{t.libero}</b></div>;
      })}
    </>
  );
}

function CartaCambio({ c, d, t, puo, apri }: { c: DatiOrg["cambi"][number]; d: DatiOrg; t: Tt; puo: boolean; apri: () => void }) {
  const g = d.gruppi.find((x) => x.id === c.gruppo_id);
  const num = (id: string | null) => d.campi.find((x) => x.id === id)?.numero ?? "?";
  const chi = d.membri.find((m) => m.id === c.deciso_da);
  const mot = (c.motivo ?? "").toLowerCase();
  const motTxt = (t[`mm_${mot}` as keyof Tt] as string | undefined) ?? c.motivo ?? "";
  return (
    <>
      <div className="og-riga" style={{ flexWrap: "nowrap" }}>
        <Tag colore="#0B0B0C" sfondo="#D8F34A">{t.cambio}</Tag>
        <span className="grow" style={{ fontSize: 13, fontWeight: 700 }}>{fmtData(c.data)} · {fmtOra(g?.ora)}</span>
        {puo && <button type="button" className="chip" style={{ height: 30, background: "#232326", color: "#F3F6F1" }} onClick={apri}><Ico nome="edit" size={14} />{t.cambiaBtn}</button>}
      </div>
      <div><span className="disp" style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.1 }}>{sostituisci(t.cambioDa, { a: num(c.campo_da), b: num(c.campo_a) })}</span>
        <div className="og-s">{sostituisci(t.motivoDeciso, { g: g?.nome ?? "", m: motTxt, chi: chi ? nomeCompleto(chi) : "—" })}</div></div>
      <div className="og-riga" style={{ fontSize: 13, fontWeight: 700, color: c.avvisa ? "#4CD07D" : "#A1A1A6" }}><Ico nome={c.avvisa ? "check" : "bell"} size={15} tratto={2.4} />{c.avvisa ? t.avvisa : t.anteprimaN}</div>
    </>
  );
}

function FoglioCambio({ o, d, ultimo, onChiudi, onFatto }: { o: Org; d: DatiOrg; ultimo: DatiOrg["cambi"][number] | undefined; onChiudi: () => void; onFatto: (iso: string) => void }) {
  const t = useT(T);
  const gruppi = o.gruppiVis.filter((g) => g.attivo && g.giorni?.length && g.ora);
  const iniz = ultimo && ultimo.data >= o.oggi ? ultimo : undefined;
  const [gid, setGid] = useState(iniz?.gruppo_id ?? gruppi[0]?.id ?? "");
  const [data, setData] = useState(iniz?.data ?? "");
  const [campoId, setCampoId] = useState(iniz?.campo_a ?? "");
  const [motivo, setMotivo] = useState<(typeof MOTIVI)[number]>(((iniz?.motivo ?? "manutenzione").toLowerCase() as (typeof MOTIVI)[number]) || "manutenzione");
  const [avvisa, setAvvisa] = useState(true);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const g: GruppoR | undefined = gruppi.find((x) => x.id === gid);
  const date = useMemo(() => (g ? prossimeLezioni([g], { giorniAvanti: 35, max: 6, includiOggiPassato: true }).map((p) => p.data) : []), [g]);
  const iso = date.includes(data) ? data : date[0] ?? "";
  const campo = d.campi.find((c) => c.id === campoId);
  const esito = (c: CampoR | undefined): EsitoCambio => controllaCambio({ gruppo: g, iso, campo: c, campi: d.campi, gruppi: d.gruppi, cambi: d.cambi });
  const es = esito(campo);
  const valido = !!g && !!iso && es.ok && es.chiave !== "stesso";
  const desc = (c: CampoR) => `${t[`superf_${c.superficie}` as keyof Tt]}, ${t[`cop_${c.copertura}` as keyof Tt]}`;
  const prev = !avvisa || !g || !campo || !iso ? t.anteprimaN : sostituisci(t.anteprima, { g: fmtDataLunga(iso).split(" ")[0], d: `${fmtDataLunga(iso).split(" ").slice(1).join(" ")}`, gr: g.nome, a: campo.numero, desc: desc(campo), da: d.campi.find((c) => c.id === g.campo_id)?.numero ?? "?" });

  const conferma = async () => {
    if (!g || !valido) return;
    setLavoro(true); setErrore(null);
    const r = await o.sb.rpc("cambia_campo", { gruppo: g.id, data: iso, campo_a: campoId, motivo, avvisa });
    if (r.error) { setErrore(r.error.message); setLavoro(false); return; }
    await o.carica();
    setLavoro(false);
    onFatto(iso);
    onChiudi();
  };

  return (
    <Foglio aperto onChiudi={onChiudi} titolo={t.cambiaBtn}>
      <div className="og-form">
        {gruppi.length === 0 ? <Nota>{t.nessunGruppo}</Nota> : (
          <>
            <div><div className="k" style={{ marginBottom: 4 }}>{t.fGruppo}</div><Chips>{gruppi.map((x) => <Chip key={x.id} on={x.id === gid} onClick={() => { setGid(x.id); setData(""); }}>{x.nome}</Chip>)}</Chips></div>
            <div><div className="k" style={{ marginBottom: 4 }}>{t.fData}</div><Chips>{date.map((x) => <Chip key={x} on={x === iso} onClick={() => setData(x)}>{fmtData(x)}</Chip>)}</Chips></div>
            <div><div className="k" style={{ marginBottom: 4 }}>{t.fCampo}</div>
              <Chips>{d.campi.map((c) => (
                <button key={c.id} type="button" className={`chip${c.id === campoId ? " on" : ""}`} aria-pressed={c.id === campoId}
                  style={c.id !== campoId && !esito(c).ok ? { color: "#FF8A8F", textDecoration: "line-through" } : undefined} onClick={() => setCampoId(c.id)}>{sostituisci(t.campo, { n: c.numero })}</button>
              ))}</Chips></div>
            <div><div className="k" style={{ marginBottom: 4 }}>{t.fMotivo}</div><Chips>{MOTIVI.map((m) => <Chip key={m} on={m === motivo} onClick={() => setMotivo(m)}>{t[`m_${m}` as keyof Tt]}</Chip>)}</Chips></div>
            <div className={`og-avviso ${es.ok ? "ok" : "no"}`}><Ico nome={es.ok ? "check" : "x"} size={16} tratto={2.4} /><span>{sostituisci(t[`c_${es.chiave}` as keyof Tt], { a: es.a ?? "", b: es.b ?? "" })}</span></div>
            <Interruttore valore={avvisa} onChange={setAvvisa} etichetta={t.avvisa} />
            <div className="note" style={{ opacity: avvisa ? 1 : 0.55 }}><span className="og-k" style={{ display: "block" }}>{t.anteprimaT}</span>{prev}</div>
          </>
        )}
        {errore && <Errore messaggio={errore} />}
        <div className="og-azioni"><Btn disabled={!valido || lavoro} onClick={() => void conferma()}>{lavoro ? t.salvo : avvisa ? t.conferma : t.confermaSenza}</Btn></div>
      </div>
    </Foglio>
  );
}

/** Regola fissa: il campo abituale di un maestro è il campo dei gruppi di cui è maestro principale. */
function FoglioAbituale({ o, d, membroId, onChiudi }: { o: Org; d: DatiOrg; membroId: string; onChiudi: () => void }) {
  const t = useT(T);
  const m = d.membri.find((x) => x.id === membroId);
  const miei = o.gruppiVis.filter((g) => g.attivo && o.can("gruppi", g.area_id) && d.gm.some((x) => x.membro_id === membroId && x.gruppo_id === g.id && x.principale));
  const [campoId, setCampoId] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState(false);
  const conflitto = useMemo(() => {
    if (!campoId) return null;
    const nuovi = d.gruppi.map((g) => (miei.some((x) => x.id === g.id) ? { ...g, campo_id: campoId } : g)).filter((g) => g.attivo);
    const lun = inizioSettimana();
    for (let i = 0; i < 7; i++) {
      const c = conflittiPosti(postiDelGiorno(nuovi, [], isoGiorno(aggiungiGiorni(lun, i))), d.gm).find((x) => x.tipo === "campo" && (miei.some((g) => g.id === x.a.gruppo.id) || miei.some((g) => g.id === x.b.gruppo.id)));
      if (c) return c;
    }
    return null;
  }, [campoId, d.gruppi, d.gm, miei]);
  if (!m) return null;
  const salva = async () => {
    setLavoro(true); setErrore(null);
    const r = await o.sb.from("gruppi").update({ campo_id: campoId }).in("id", miei.map((g) => g.id));
    if (r.error) { setErrore(r.error.message); setLavoro(false); return; }
    await o.registra("campo_abituale", nomeCompleto(m), { campo_id: campoId, gruppi: miei.map((g) => g.id) });
    await o.carica();
    setLavoro(false);
    onChiudi();
  };
  return (
    <Foglio aperto onChiudi={onChiudi} titolo={sostituisci(t.abitT2, { n: nomeCompleto(m) })}>
      <div className="og-form">
        <div className="og-s">{t.abitS}</div>
        {miei.length === 0 ? <Nota>{t.abitFatto}</Nota> : (
          <>
            <div className="og-s">{miei.map((g) => g.nome).join(" · ")}</div>
            <Chips>{d.campi.filter((c) => c.stato === "disponibile").map((c) => <Chip key={c.id} on={c.id === campoId} onClick={() => setCampoId(c.id)}>{sostituisci(t.campo, { n: c.numero })}</Chip>)}</Chips>
            {conflitto && <div className="og-avviso no"><Ico nome="x" size={16} tratto={2.4} /><span>{sostituisci(t.abitConf, { a: conflitto.a.gruppo.nome, b: conflitto.b.gruppo.nome, o: fmtOra(conflitto.a.gruppo.ora) })}</span></div>}
          </>
        )}
        {errore && <Errore messaggio={errore} />}
        <div className="og-azioni"><Btn disabled={!campoId || !!conflitto || lavoro || miei.length === 0} onClick={() => void salva()}>{lavoro ? t.salvo : t.abitSalva}</Btn></div>
      </div>
    </Foglio>
  );
}
