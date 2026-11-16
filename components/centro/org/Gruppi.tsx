"use client";
// C9 · Gruppi e orari: elenco dei gruppi con maestri, campo abituale e programma; vista settimana con i conflitti di campo;
// crea e modifica un gruppo (giorni, ora, campo abituale, maestri, allievi iscritti).
import { useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Campo, Caricamento, Chip, Chips, Errore, Foglio, Ico, Interruttore, Nota, Seg, Tag, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { aggiungiGiorni, fmtData, fmtGiorni, fmtOra, inizioSettimana, isoGiorno } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import {
  COL_ALLIEVO_LISTA, FASCE, PAGINA, colorePerArea, conflittiPosti, maestriDi, nomeAllievo, nomeBreve, postiDelGiorno, pulisciRicerca, settimanaProgramma, sostituisci, allieviDelGruppo,
  useDebounce, useOrg, type DatiOrg, type Org,
} from "./dati";
import type { AllievoL, GruppoMaestroR, GruppoR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Gruppi e orari", sopra: "{centro} · {g} gruppi · {a} allievi", nuovo: "Nuovo gruppo", elenco: "Elenco", settimana: "Settimana", viste: "Vista",
  tutti: "Tutti", allievi: "{n} allievi", campo: "Campo {n}", senzaCampo: "Senza campo", nessunMaestro: "Nessun maestro", nessunProgramma: "Nessun programma",
  sett: "{p} · sett. {n} di {tot}", vuotoT: "Nessun gruppo", vuotoS: "Crea il primo gruppo: giorni, ora, campo e maestri.", soloLettura: "Puoi consultare gruppi e orari. Per modificarli serve il permesso della direzione tecnica.",
  nessunaLezione: "Nessuna lezione", noConflitti: "Nessun conflitto di campo nella settimana.", conflittoCampo: "{d} · {a} e {b} sullo stesso campo alle {o}", conflittoMaestro: "{d} · maestro in due gruppi insieme: {a} e {b} alle {o}",
  gg: "Lun|Mar|Mer|Gio|Ven|Sab|Dom", daCampo: "da C{n}",
  // foglio
  modifica: "Modifica gruppo", crea: "Nuovo gruppo", nome: "Nome del gruppo", area: "Area", fascia: "Fascia", livello: "Livello", giorni: "Giorni", ora: "Ora", durata: "Durata in minuti",
  campoAb: "Campo abituale", maestri: "Maestri", maestriAiuto: "Il primo scelto è il maestro principale.", principale: "principale", programma: "Programma", nessuno: "Nessuno", attivo: "Gruppo attivo",
  salva: "Salva", crea2: "Crea gruppo", annulla: "Annulla", salvataggio: "Salvo…", iscritti: "Allievi iscritti", nessunIscritto: "Nessun allievo iscritto.", rimuovi: "Rimuovi", aggiungi: "Aggiungi allievo", scegli: "Scegli un allievo", cercaAllievo: "Cerca un allievo per nome",
  aggiungiBtn: "Iscrivi", obbligatorio: "Scrivi il nome e scegli almeno un giorno e l'ora.", scegliArea: "Scegli l'area", rimuoviA: "Rimuovi {n} dal gruppo",
  libero: "Orario libero: nessun conflitto.", warnMaestro: "Attenzione: {m} ha già un altro gruppo in quell'orario.",
};
const T = { it: IT, en: { ...IT } };

export default function CentroGruppi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, dati: d } = o;
  const r = rotta(centro.slug);
  const [vista, setVista] = useState<"elenco" | "settimana">("elenco");
  const [fascia, setFascia] = useState("tutti");
  const [foglio, setFoglio] = useState<{ g: GruppoR | null } | null>(null);
  const puoCreare = o.can("gruppi");

  const giorniSett = useMemo(() => {
    const lun = inizioSettimana();
    return Array.from({ length: 7 }, (_, i) => isoGiorno(aggiungiGiorni(lun, i)));
  }, []);

  const gruppi = useMemo(() => o.gruppiVis.filter((g) => g.attivo || fascia === "tutti").filter((g) => fascia === "tutti" || g.fascia === fascia), [o.gruppiVis, fascia]);
  const fasceDisponibili = useMemo(() => [...new Set(o.gruppiVis.map((g) => g.fascia).filter((f): f is string => !!f))], [o.gruppiVis]);

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="gruppi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base}
      azioni={puoCreare && d ? <button type="button" className="icon" aria-label={t.nuovo} onClick={() => setFoglio({ g: null })}><Ico nome="plus" size={18} tratto={2.4} /></button> : undefined}>
      {corpo}
    </SchermoCentro>
  );
  if (!d) return schermo(o.errore ? <Errore messaggio={o.errore} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const nAllievi = new Set(o.iscrAttive.map((i) => i.allievo_id)).size;
  const conflitti = giorniSett.flatMap((iso) => {
    const posti = postiDelGiorno(gruppi, d.cambi, iso);
    return conflittiPosti(posti, d.gm).map((c) => ({ iso, c }));
  });

  return schermo(
    <div className="og-pagina">
      {!puoCreare && o.eResp && <Nota icona="lock">{t.soloLettura}</Nota>}
      <Seg ariaLabel={t.viste} valore={vista} onChange={setVista} valori={[{ id: "elenco", etichetta: t.elenco }, { id: "settimana", etichetta: t.settimana }]} />
      <Chips>
        <Chip on={fascia === "tutti"} onClick={() => setFascia("tutti")}>{t.tutti}</Chip>
        {fasceDisponibili.map((f) => <Chip key={f} on={fascia === f} onClick={() => setFascia(f)}>{f}</Chip>)}
      </Chips>

      {vista === "elenco" && (gruppi.length === 0 ? (
        <Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="users" azione={puoCreare ? <Btn pieno={false} onClick={() => setFoglio({ g: null })} icona="plus">{t.nuovo}</Btn> : undefined} />
      ) : (
        <div className="og-dash c2">
          {gruppi.map((g) => <SchedaGruppo key={g.id} g={g} d={d} o={o} modifica={o.can("gruppi", g.area_id) ? () => setFoglio({ g }) : undefined} />)}
        </div>
      ))}

      {vista === "settimana" && (
        <div className="og-dash c2">
          {giorniSett.map((iso) => {
            const posti = postiDelGiorno(gruppi, d.cambi, iso);
            const nome = fmtData(iso).split(" ")[0];
            return (
              <div key={iso} className="li" style={{ alignItems: "flex-start", padding: "10px 12px" }}>
                <span className="disp" style={{ width: 40, flex: "none", fontSize: 22, fontWeight: 800, color: "#D8F34A", lineHeight: 1.1, textTransform: "capitalize" }}>{nome}</span>
                <span className="grow og-colonna" style={{ gap: 5, fontSize: 13 }}>
                  {posti.length === 0 && <span style={{ color: "#6E6E73" }}>{t.nessunaLezione}</span>}
                  {posti.map((p) => {
                    const campo = d.campi.find((c) => c.id === p.campoId);
                    return (
                      <span key={p.gruppo.id} style={{ display: "block", borderLeft: `3px solid ${colorePerArea(d, p.gruppo.area_id)}`, paddingLeft: 8 }}>
                        {fmtOra(p.gruppo.ora)} · {p.gruppo.nome} · {campo ? sostituisci(t.campo, { n: campo.numero }) : t.senzaCampo}
                        {p.cambio && <b style={{ color: "#D8F34A" }}> ({sostituisci(t.daCampo, { n: d.campi.find((c) => c.id === p.cambio?.campo_da)?.numero ?? "?" })})</b>}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
          <div className="og-tutta og-colonna">
            {conflitti.length === 0 ? (
              <div className="note og-riga" style={{ gap: 8 }}><Ico nome="check" size={16} tratto={2.4} /><span>{t.noConflitti}</span></div>
            ) : conflitti.map(({ iso, c }, i) => (
              <div key={i} className="og-avviso no"><Ico nome="x" size={16} tratto={2.4} />
                <span>{sostituisci(c.tipo === "campo" ? t.conflittoCampo : t.conflittoMaestro, { d: fmtData(iso), a: c.a.gruppo.nome, b: c.b.gruppo.nome, o: fmtOra(c.a.gruppo.ora) })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {foglio && <FoglioGruppo key={foglio.g?.id ?? "nuovo"} o={o} d={d} gruppo={foglio.g} onChiudi={() => setFoglio(null)} />}
    </div>,
    sostituisci(t.sopra, { centro: centro.nome, g: o.gruppiVis.filter((g) => g.attivo).length, a: nAllievi }),
  );
}

function SchedaGruppo({ g, d, o, modifica }: { g: GruppoR; d: DatiOrg; o: Org; modifica?: () => void }) {
  const t = useT(T);
  const campo = d.campi.find((c) => c.id === g.campo_id);
  const maestri = maestriDi(d, g.id);
  const prog = d.programmi.find((p) => p.id === g.programma_id);
  const sett = settimanaProgramma(prog);
  const n = allieviDelGruppo(o.iscrAttive, g.id).length;
  const corpo = (
    <>
      <div className="og-riga" style={{ flexWrap: "nowrap" }}>
        <span className="dot" style={{ background: colorePerArea(d, g.area_id) }} />
        <span className="grow"><span className="og-t" style={{ display: "block" }}>{g.nome}{!g.attivo && <> · <span className="muted">—</span></>}</span><span className="og-s" style={{ display: "block" }}>{fmtGiorni(g.giorni)} · {fmtOra(g.ora)}</span></span>
        <Tag>{campo ? sostituisci(t.campo, { n: campo.numero }) : t.senzaCampo}</Tag>
      </div>
      <div className="og-riga" style={{ justifyContent: "space-between", fontSize: 12.5, flexWrap: "nowrap" }}>
        <span className="muted og-ell">{maestri.length ? maestri.map((m) => [m.nome, m.cognome].filter(Boolean).join(" ")).join(" · ") : t.nessunMaestro}</span>
        <b style={{ whiteSpace: "nowrap" }}>{sostituisci(t.allievi, { n })}</b>
      </div>
      <div className="og-riga" style={{ justifyContent: "space-between", fontSize: 12.5, flexWrap: "nowrap" }}>
        <span className="og-ell">{prog ? (sett ? sostituisci(t.sett, { p: prog.nome, n: sett.n, tot: sett.tot }) : prog.nome) : t.nessunProgramma}</span>
        {sett && <span className="og-pips" aria-hidden="true">{Array.from({ length: sett.tot }, (_, i) => <i key={i} className={i < sett.n ? "on" : ""} />)}</span>}
      </div>
    </>
  );
  return modifica
    ? <button type="button" className="card og-card cliccabile" onClick={modifica}>{corpo}</button>
    : <div className="card og-card">{corpo}</div>;
}

function FoglioGruppo({ o, d, gruppo, onChiudi }: { o: Org; d: DatiOrg; gruppo: GruppoR | null; onChiudi: () => void }) {
  const t = useT(T);
  const { sb, centro, oggi } = o;
  const areePossibili = d.aree.filter((a) => o.can("gruppi", a.id));
  const [nome, setNome] = useState(gruppo?.nome ?? "");
  const [areaId, setAreaId] = useState(gruppo?.area_id ?? (o.areaPrincipale && areePossibili.some((a) => a.id === o.areaPrincipale) ? o.areaPrincipale : areePossibili[0]?.id ?? ""));
  const [fascia, setFascia] = useState(gruppo?.fascia ?? "U10");
  const [livello, setLivello] = useState(gruppo?.livello ?? "");
  const [giorni, setGiorni] = useState<number[]>(gruppo?.giorni ?? []);
  const [ora, setOra] = useState(fmtOra(gruppo?.ora ?? "17:00"));
  const [durata, setDurata] = useState(String(gruppo?.durata_min ?? 60));
  const [campoId, setCampoId] = useState(gruppo?.campo_id ?? "");
  const [maestri, setMaestri] = useState<string[]>(gruppo ? maestriDi(d, gruppo.id).map((m) => m.id) : []);
  const [programmaId, setProgrammaId] = useState(gruppo?.programma_id ?? "");
  const [attivo, setAttivo] = useState(gruppo?.attivo ?? true);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [nuovoAllievo, setNuovoAllievo] = useState("");
  const gg = t.gg.split("|");
  const puoMaestri = o.can("maestri", areaId || null);

  // Conflitti di campo e di maestro dell'orario che si sta scrivendo, controllati su una settimana qualsiasi (le regole sono fisse)
  const problemi = useMemo(() => {
    const ipo: GruppoR = { id: gruppo?.id ?? "nuovo", centro_id: centro.id, area_id: areaId || null, nome, fascia, livello, giorni, ora, durata_min: Number(durata) || 60, campo_id: campoId || null, programma_id: null, attivo: true };
    const altri = d.gruppi.filter((g) => g.id !== ipo.id && g.attivo);
    const gmIpo: GruppoMaestroR[] = [...d.gm.filter((r) => r.gruppo_id !== ipo.id), ...maestri.map((m) => ({ id: m, centro_id: centro.id, gruppo_id: ipo.id, membro_id: m, principale: false }))];
    const lun = inizioSettimana();
    const out: { tipo: "campo" | "maestro"; altro: string; membro?: string }[] = [];
    for (const dow of giorni) {
      const iso = isoGiorno(aggiungiGiorni(lun, dow - 1));
      for (const c of conflittiPosti(postiDelGiorno([...altri, ipo], [], iso), gmIpo)) {
        const io = c.a.gruppo.id === ipo.id ? c.a : c.b.gruppo.id === ipo.id ? c.b : null;
        if (!io) continue;
        const altro = io === c.a ? c.b : c.a;
        out.push({ tipo: c.tipo, altro: altro.gruppo.nome });
      }
    }
    return out;
  }, [d.gruppi, d.gm, gruppo?.id, centro.id, areaId, nome, fascia, livello, giorni, ora, durata, campoId, maestri]);
  const bloccante = problemi.some((p) => p.tipo === "campo");
  const valido = nome.trim() && areaId && giorni.length > 0 && ora && !bloccante;

  const salva = async () => {
    setLavoro(true); setErrore(null);
    const campi = { area_id: areaId, nome: nome.trim(), fascia, livello: livello.trim() || null, giorni: [...giorni].sort(), ora, durata_min: Number(durata) || 60, campo_id: campoId || null, programma_id: programmaId || null, attivo };
    let id = gruppo?.id;
    if (gruppo) {
      const r = await sb.from("gruppi").update(campi).eq("id", gruppo.id);
      if (r.error) { setErrore(r.error.message); setLavoro(false); return; }
    } else {
      const r = await sb.from("gruppi").insert({ ...campi, centro_id: centro.id }).select("id").single();
      if (r.error || !r.data) { setErrore(r.error?.message ?? "?"); setLavoro(false); return; }
      id = r.data.id as string;
    }
    if (id && (puoMaestri || !gruppo)) {
      const del = await sb.from("gruppi_maestri").delete().eq("gruppo_id", id);
      if (del.error) { setErrore(del.error.message); setLavoro(false); return; }
      if (maestri.length) {
        const ins = await sb.from("gruppi_maestri").insert(maestri.map((m, i) => ({ centro_id: centro.id, gruppo_id: id, membro_id: m, principale: i === 0 })));
        if (ins.error) { setErrore(ins.error.message); setLavoro(false); return; }
      }
    }
    await o.registra(gruppo ? "gruppo_modificato" : "gruppo_creato", campi.nome, { gruppo_id: id, giorni: campi.giorni, ora, campo_id: campi.campo_id });
    await o.carica();
    setLavoro(false);
    onChiudi();
  };

  const iscritti = gruppo ? allieviDelGruppo(o.iscrAttive, gruppo.id) : [];
  // nomi degli iscritti: una sola lettura per id (un gruppo ne ha poche decine); la ricerca di chi aggiungere va sul server a blocchi di 50
  const [nomiIscritti, setNomiIscritti] = useState<Map<string, AllievoL>>(new Map());
  const [cercaAll, setCercaAll] = useState("");
  const cercaDeb = useDebounce(cercaAll);
  const [liberi, setLiberi] = useState<AllievoL[]>([]);
  const chiaveIscritti = iscritti.join(",");
  useEffect(() => {
    if (!chiaveIscritti) { setNomiIscritti(new Map()); return; }
    let vivo = true;
    void sb.from("allievi").select(COL_ALLIEVO_LISTA).in("id", chiaveIscritti.split(",")).then((x: { data: unknown }) => {
      if (vivo) setNomiIscritti(new Map(((x.data ?? []) as AllievoL[]).map((a) => [a.id, a])));
    });
    return () => { vivo = false; };
  }, [sb, chiaveIscritti]);
  const mostraIscrizione = !!gruppo && o.can("iscrizioni", gruppo.area_id);
  useEffect(() => {
    if (!mostraIscrizione) return;
    let vivo = true;
    let query = sb.from("allievi").select(COL_ALLIEVO_LISTA).eq("centro_id", centro.id);
    if (chiaveIscritti) query = query.not("id", "in", `(${chiaveIscritti})`);
    for (const tok of pulisciRicerca(cercaDeb).split(" ").filter(Boolean)) query = query.or(`nome.ilike.%${tok}%,cognome.ilike.%${tok}%`);
    void query.order("cognome").order("nome").order("id").limit(PAGINA).then((x: { data: unknown }) => { if (vivo) setLiberi((x.data ?? []) as AllievoL[]); });
    return () => { vivo = false; };
  }, [sb, centro.id, mostraIscrizione, chiaveIscritti, cercaDeb]);
  const iscrivi = async () => {
    if (!gruppo || !nuovoAllievo) return;
    const r = await sb.from("iscrizioni").insert({ centro_id: centro.id, allievo_id: nuovoAllievo, gruppo_id: gruppo.id, dal: oggi });
    if (r.error) { setErrore(r.error.message); return; }
    setNuovoAllievo("");
    await o.registra("iscrizione", gruppo.nome, { allievo_id: nuovoAllievo });
    await o.carica();
  };
  const togli = async (allievoId: string) => {
    if (!gruppo) return;
    const ids = d.iscrizioni.filter((i) => i.gruppo_id === gruppo.id && i.allievo_id === allievoId && (!i.al || i.al >= oggi)).map((i) => i.id);
    // non si cancella la storia: l'iscrizione si chiude con la data di oggi
    const r = await sb.from("iscrizioni").update({ al: oggi }).in("id", ids);
    if (r.error) { setErrore(r.error.message); return; }
    await o.registra("iscrizione_chiusa", gruppo.nome, { allievo_id: allievoId });
    await o.carica();
  };

  const tutti = [...maestri];
  const candidati = d.membri.filter((m) => m.ruolo === "maestro" && m.stato !== "sospeso");
  const mAltro = problemi.find((p) => p.tipo === "maestro");
  const nomeMaestriAltro = mAltro ? candidati.filter((m) => maestri.includes(m.id)).map((m) => nomeBreve(m)).join(", ") : "";

  return (
    <Foglio aperto onChiudi={onChiudi} titolo={gruppo ? t.modifica : t.crea}>
      <div className="og-form">
        <Campo etichetta={t.nome} valore={nome} onChange={setNome} />
        {areePossibili.length > 1 || !gruppo ? <Campo etichetta={t.area} valore={areaId} onChange={setAreaId} opzioni={[{ valore: "", etichetta: t.scegliArea }, ...areePossibili.map((a) => ({ valore: a.id, etichetta: a.nome }))]} /> : null}
        <div className="og-dash c2" style={{ gap: 10 }}>
          <Campo etichetta={t.fascia} valore={fascia} onChange={setFascia} opzioni={FASCE.map((f) => ({ valore: f, etichetta: f }))} />
          <Campo etichetta={t.livello} valore={livello} onChange={setLivello} />
        </div>
        <div><div className="k" style={{ marginBottom: 4 }}>{t.giorni}</div>
          <Chips>{gg.map((n, i) => <Chip key={n} on={giorni.includes(i + 1)} onClick={() => setGiorni((x) => (x.includes(i + 1) ? x.filter((y) => y !== i + 1) : [...x, i + 1]))}>{n}</Chip>)}</Chips>
        </div>
        <div className="og-dash c2" style={{ gap: 10 }}>
          <Campo etichetta={t.ora} tipo="time" valore={ora} onChange={setOra} />
          <Campo etichetta={t.durata} tipo="number" valore={durata} onChange={setDurata} />
        </div>
        <div><div className="k" style={{ marginBottom: 4 }}>{t.campoAb}</div>
          <Chips>
            <Chip on={campoId === ""} onClick={() => setCampoId("")}>{t.senzaCampo}</Chip>
            {d.campi.map((c) => <Chip key={c.id} on={campoId === c.id} onClick={() => setCampoId(c.id)}>{sostituisci(t.campo, { n: c.numero })}</Chip>)}
          </Chips>
        </div>
        {puoMaestri && (
          <div><div className="k" style={{ marginBottom: 4 }}>{t.maestri}</div>
            <Chips>
              {candidati.map((m) => {
                const pos = tutti.indexOf(m.id);
                return <Chip key={m.id} on={pos >= 0} onClick={() => setMaestri((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id]))}>{nomeBreve(m)}{pos === 0 ? ` · ${t.principale}` : ""}</Chip>;
              })}
            </Chips>
            <div className="og-s">{t.maestriAiuto}</div>
          </div>
        )}
        <Campo etichetta={t.programma} valore={programmaId} onChange={setProgrammaId} opzioni={[{ valore: "", etichetta: t.nessuno }, ...d.programmi.map((p) => ({ valore: p.id, etichetta: p.nome }))]} />
        <Interruttore valore={attivo} onChange={setAttivo} etichetta={t.attivo} />
        {problemi.filter((p) => p.tipo === "campo").slice(0, 3).map((p, i) => <div key={i} className="og-avviso no"><Ico nome="x" size={16} tratto={2.4} /><span>{sostituisci(t.conflittoCampo, { d: "", a: nome || t.crea, b: p.altro, o: ora }).replace(/^ · /, "")}</span></div>)}
        {mAltro && <div className="og-avviso att"><Ico nome="bell" size={16} /><span>{sostituisci(t.warnMaestro, { m: nomeMaestriAltro })}</span></div>}
        {!problemi.length && giorni.length > 0 && <div className="og-avviso ok"><Ico nome="check" size={16} tratto={2.4} /><span>{t.libero}</span></div>}
        {!valido && !bloccante && <div className="og-s">{t.obbligatorio}</div>}
        {errore && <Errore messaggio={errore} />}
        <div className="og-azioni">
          <Btn variante="secondario" onClick={onChiudi}>{t.annulla}</Btn>
          <Btn disabled={!valido || lavoro} onClick={() => void salva()}>{lavoro ? t.salvataggio : gruppo ? t.salva : t.crea2}</Btn>
        </div>

        {gruppo && o.can("iscrizioni", gruppo.area_id) && (
          <div className="og-colonna" style={{ marginTop: 6 }}>
            <div className="og-k">{t.iscritti} · {iscritti.length}</div>
            {iscritti.length === 0 && <div className="og-s">{t.nessunIscritto}</div>}
            {iscritti.map((id) => {
              const a = nomiIscritti.get(id);
              return a ? (
                <div key={id} className="li" style={{ padding: "8px 12px" }}>
                  <span className="grow og-t">{nomeAllievo(a)}</span>
                  <button type="button" className="chip" aria-label={sostituisci(t.rimuoviA, { n: nomeAllievo(a) })} onClick={() => void togli(id)}>{t.rimuovi}</button>
                </div>
              ) : null;
            })}
            <input className="og-inp" type="search" aria-label={t.cercaAllievo} placeholder={t.cercaAllievo} value={cercaAll} onChange={(e) => setCercaAll(e.target.value)} />
            <div className="og-riga">
              <div className="grow"><Campo etichetta={t.aggiungi} valore={nuovoAllievo} onChange={setNuovoAllievo} opzioni={[{ valore: "", etichetta: t.scegli }, ...liberi.map((a) => ({ valore: a.id, etichetta: [a.nome, a.cognome].filter(Boolean).join(" ") }))]} /></div>
              <Btn pieno={false} variante="secondario" disabled={!nuovoAllievo} onClick={() => void iscrivi()}>{t.aggiungiBtn}</Btn>
            </div>
          </div>
        )}
      </div>
    </Foglio>
  );
}
