"use client";
// C10 · Allievi del centro: lista con ricerca e filtri "in ritardo" e "assenze ripetute", scheda con iscrizioni e famiglia,
// aggiunta di un allievo con la sua famiglia e invito con codice.
import { useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Campo, Caricamento, Chip, Chips, Errore, Foglio, Ico, Nota, Sezione, Tile, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { fmtData } from "@/lib/centro/date";
import { aggiungiGiorni, isoGiorno } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { coloreNome, iniziali, meseProgramma, nomeAllievo, nomeCompleto, sostituisci, maestriDi, useOrg, type DatiOrg, type Org } from "./dati";
import { InvitoBox, creaInvito } from "./Invito";
import type { AllievoR, LezioneR, PresenzaR, ValutazioneR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Allievi del centro", sopra: "{centro} · {mese}", attivi: "allievi attivi", presenze: "presenze del mese", ritardo: "in ritardo", cerca: "Cerca per nome, gruppo o maestro",
  allievi: "Allievi", progresso: "{c} · progresso del mese", fTutti: "Tutti {n}", fRitardo: "In ritardo {n}", fAssenze: "Assenze ripetute {n}", mostraAltri: "Altri {n} allievi · mostra tutti", vuotoT: "Nessun allievo", vuotoS: "Aggiungi il primo allievo con la sua famiglia.",
  inLinea: "In linea", inRitardo: "In ritardo", assenze: "{a} assenze su {n}", senzaVal: "Nessuna valutazione", aggiungi: "Aggiungi allievo", senzaGruppo: "Senza gruppo", nessunaPres: "Nessuna presenza registrata",
  // nuovo allievo
  nuovoT: "Nuovo allievo", nome: "Nome", cognome: "Cognome", nascita: "Data di nascita", gruppo: "Gruppo", nessuno: "Nessun gruppo ancora", famiglia: "Famiglia", famAiuto: "Il genitore entrerà con il codice che ti diamo dopo.",
  gNome: "Nome del genitore", gCognome: "Cognome del genitore", gEmail: "Email", gTel: "Telefono", relazione: "Relazione", mamma: "Mamma", papa: "Papà", tutore: "Tutore", crea: "Crea allievo", creo: "Creo…", annulla: "Annulla", obbl: "Servono nome e cognome dell'allievo.",
  fatto: "Allievo creato", codiceFam: "Codice per la famiglia", chiudi: "Fine", altroAllievo: "Aggiungi un altro",
  // scheda
  scheda: "Scheda allievo", iscrizioni: "Gruppi", rimuovi: "Rimuovi", iscrivi: "Iscrivi a un gruppo", scegli: "Scegli un gruppo", ok: "Iscrivi", famigliaT: "Famiglia", nessunaFam: "Nessun genitore collegato.", aggGen: "Aggiungi genitore",
  invita: "Invita la famiglia con un codice", certificato: "Il certificato medico scade il", salvaCert: "Salva certificato", salvato: "Salvato", aggiungiGen: "Collega genitore",
  mamma2: "mamma", relazioneEtichetta: "{r}",
};
const T = { it: IT, en: { ...IT } };

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

type Riga = { a: AllievoR; gruppi: string[]; maestri: string[]; perc: number | null; ritardo: boolean; assenti: number; su: number };

export default function CentroAllievi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, sb, dati: d } = o;
  const r = rotta(centro.slug);
  const [extra, setExtra] = useState<{ val: ValutazioneR[]; lez: LezioneR[]; pres: PresenzaR[] } | null>(null);
  const [errExtra, setErrExtra] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"tutti" | "ritardo" | "assenze">("tutti");
  const [q, setQ] = useState("");
  const [tutti, setTutti] = useState(false);
  const [nuovo, setNuovo] = useState(false);
  const [scheda, setScheda] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const da = isoGiorno(aggiungiGiorni(new Date(), -42));
      const [v, l] = await Promise.all([
        sb.from("valutazioni").select("*").eq("centro_id", centro.id),
        sb.from("lezioni").select("id,gruppo_id,data,stato").eq("centro_id", centro.id).gte("data", da).eq("stato", "chiusa"),
      ]);
      if (!vivo) return;
      if (v.error || l.error) { setErrExtra((v.error ?? l.error)?.message ?? "?"); return; }
      const lez = (l.data ?? []) as LezioneR[];
      let pres: PresenzaR[] = [];
      // gli identificativi vanno a blocchi: l'indirizzo della richiesta non deve diventare troppo lungo
      for (let i = 0; i < lez.length; i += 60) {
        const p = await sb.from("presenze").select("id,lezione_id,allievo_id,presente").in("lezione_id", lez.slice(i, i + 60).map((x) => x.id));
        if (p.error) { if (vivo) setErrExtra(p.error.message); return; }
        pres = pres.concat((p.data ?? []) as PresenzaR[]);
      }
      if (vivo) setExtra({ val: (v.data ?? []) as ValutazioneR[], lez, pres });
    })();
    return () => { vivo = false; };
  }, [sb, centro.id]);

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="allievi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base}
      azioni={d && o.can("iscrizioni") ? <button type="button" className="icon" aria-label={t.aggiungi} onClick={() => setNuovo(true)}><Ico nome="plus" size={18} tratto={2.4} /></button> : undefined}>
      {corpo}
    </SchermoCentro>
  );
  if (!d || !extra) return schermo(o.errore || errExtra ? <Errore messaggio={o.errore ?? errExtra} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const adesso = new Date();
  const mese = adesso.toLocaleDateString("it-IT", { month: "long" });
  const colpo = colpoDelMese(d, o);
  const v = extra.val.filter((x) => norm(x.colpo).includes(colpo === "gambe" ? "gamb" : colpo));

  // livello raggiunto: media dei voti (1-5) dell'ultimo test dell'allievo sul colpo del mese, in percentuale
  const livelloAllievo = (id: string) => {
    const mie = v.filter((x) => x.allievo_id === id && x.voto != null && (x.data || x.test));
    const chiavi = [...new Set(mie.map((x) => x.data ?? x.test ?? ""))].sort().reverse();
    const di = (k: string | undefined) => (k === undefined ? null : media(mie.filter((x) => (x.data ?? x.test ?? "") === k).map((x) => x.voto as number)));
    const ora = di(chiavi[0]), prima = di(chiavi[1]);
    return { ora: ora === null ? null : (ora / 5) * 100, prima: prima === null ? null : (prima / 5) * 100 };
  };

  const lezData = new Map(extra.lez.map((l) => [l.id, l]));
  const righe: Riga[] = o.allieviVis.map((a) => {
    const gid = [...new Set(o.iscrAttive.filter((i) => i.allievo_id === a.id).map((i) => i.gruppo_id))];
    const gr = d.gruppi.filter((g) => gid.includes(g.id));
    const mie = extra.pres.filter((p) => p.allievo_id === a.id && lezData.has(p.lezione_id)).sort((x, y) => (lezData.get(y.lezione_id)!.data > lezData.get(x.lezione_id)!.data ? 1 : -1)).slice(0, 6);
    const assenti = mie.filter((p) => !p.presente).length;
    const lv = livelloAllievo(a.id);
    return { a, gruppi: gr.map((g) => g.nome), maestri: [...new Set(gr.flatMap((g) => maestriDi(d, g.id).map((m) => nomeCompleto(m))))], perc: lv.ora === null ? null : Math.round(lv.ora), ritardo: false, assenti, su: mie.length, _prima: lv.prima } as Riga & { _prima: number | null };
  });
  // "in ritardo": 10 punti sotto la media del suo gruppo, oppure in calo di 5 punti rispetto al test precedente
  const mediaGruppo = new Map<string, number>();
  d.gruppi.forEach((g) => {
    const m = media(righe.filter((x) => x.gruppi.includes(g.nome) && x.perc !== null).map((x) => x.perc as number));
    if (m !== null) mediaGruppo.set(g.nome, m);
  });
  righe.forEach((x) => {
    const prima = (x as Riga & { _prima: number | null })._prima;
    const sotto = x.perc !== null && x.gruppi.some((g) => mediaGruppo.has(g) && x.perc! < (mediaGruppo.get(g) as number) - 10);
    const calo = x.perc !== null && prima !== null && x.perc < prima - 5;
    x.ritardo = sotto || calo;
  });
  const ripetute = (x: Riga) => x.assenti >= 3;

  // presenze del mese
  const mm = isoGiorno(adesso).slice(0, 7);
  const lezMese = new Set(extra.lez.filter((l) => l.data.startsWith(mm)).map((l) => l.id));
  const visibili = new Set(o.allieviVis.map((a) => a.id));
  const pm = extra.pres.filter((p) => lezMese.has(p.lezione_id) && visibili.has(p.allievo_id));
  const percPres = pm.length ? Math.round((pm.filter((p) => p.presente).length / pm.length) * 100) : null;

  const nRit = righe.filter((x) => x.ritardo).length;
  const nAss = righe.filter(ripetute).length;
  const ql = norm(q);
  let lista = righe.filter((x) => filtro === "tutti" || (filtro === "ritardo" && x.ritardo) || (filtro === "assenze" && ripetute(x)));
  if (ql) lista = lista.filter((x) => norm(`${nomeCompleto(x.a)} ${x.gruppi.join(" ")} ${x.maestri.join(" ")}`).includes(ql));
  lista.sort((x, y) => (x.a.cognome ?? "").localeCompare(y.a.cognome ?? "") || x.a.nome.localeCompare(y.a.nome));
  const LIM = 12;
  const mostrati = tutti || filtro !== "tutti" || ql ? lista : lista.slice(0, LIM);
  const col = (p: number) => (p >= 70 ? "#4CD07D" : p >= 55 ? "#FFD54A" : "#FF9F43");
  const etCol = (x: Riga) => (x.ritardo ? "rgba(255,159,67,.16);color:#FF9F43" : ripetute(x) ? "rgba(255,90,95,.16);color:#FF7A7E" : "rgba(76,208,125,.14);color:#4CD07D");

  return schermo(
    <div className="og-pagina">
      <div className="og-dash c3" style={{ gap: 8 }}>
        <div className="g3 og-tutta" style={{ gap: 8 }}>
          <Tile valore={righe.length} etichetta={t.attivi} />
          <Tile valore={percPres === null ? "—" : `${percPres}%`} etichetta={t.presenze} colore="#4CD07D" />
          <Tile valore={nRit} etichetta={t.ritardo} colore="#FF9F43" />
        </div>
      </div>
      <input className="og-inp" type="search" aria-label={t.cerca} placeholder={t.cerca} value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips>
        <Chip on={filtro === "tutti"} onClick={() => setFiltro("tutti")}>{sostituisci(t.fTutti, { n: righe.length })}</Chip>
        <Chip on={filtro === "ritardo"} onClick={() => setFiltro("ritardo")}>{sostituisci(t.fRitardo, { n: nRit })}</Chip>
        <Chip on={filtro === "assenze"} onClick={() => setFiltro("assenze")}>{sostituisci(t.fAssenze, { n: nAss })}</Chip>
      </Chips>
      <Sezione titolo={t.allievi} azione={<span className="muted">{sostituisci(t.progresso, { c: colpo.charAt(0).toUpperCase() + colpo.slice(1) })}</span>} />
      {righe.length === 0 ? <Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="user" /> : (
        <div className="og-dash c2" style={{ gap: 7 }}>
          {mostrati.map((x) => (
            <button key={x.a.id} type="button" className="li" style={{ padding: "8px 12px", textAlign: "left", font: "inherit" }} onClick={() => setScheda(x.a.id)}>
              <span className="og-av" style={{ background: coloreNome(nomeCompleto(x.a)) }} aria-hidden="true">{iniziali(x.a)}</span>
              <span className="grow"><span className="t" style={{ display: "block", fontSize: 14.5 }}>{nomeAllievo(x.a)}</span>
                <span className="s og-ell" style={{ display: "block", fontSize: 12 }}>{x.gruppi.length ? `${x.gruppi.join(", ")}${x.maestri[0] ? ` · ${x.maestri[0]}` : ""}` : t.senzaGruppo}</span></span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span className="disp" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: x.perc === null ? "#8E8E93" : col(x.perc) }}>{x.perc === null ? "—" : `${x.perc}%`}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 7, whiteSpace: "nowrap", background: etCol(x).split(";")[0], color: etCol(x).split("color:")[1] }}>
                  {x.ritardo ? t.inRitardo : ripetute(x) ? sostituisci(t.assenze, { a: x.assenti, n: x.su }) : x.perc === null ? t.senzaVal : t.inLinea}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!tutti && filtro === "tutti" && !ql && lista.length > LIM && (
        <button type="button" className="chip" style={{ alignSelf: "center", background: "none", color: "#D8F34A" }} onClick={() => setTutti(true)}>{sostituisci(t.mostraAltri, { n: lista.length - LIM })}</button>
      )}
      {o.can("iscrizioni") && <Btn onClick={() => setNuovo(true)} icona="plus">{t.aggiungi}</Btn>}
      {nuovo && <FoglioNuovo o={o} d={d} onChiudi={() => setNuovo(false)} />}
      {scheda && <FoglioScheda o={o} d={d} id={scheda} onChiudi={() => setScheda(null)} />}
    </div>,
    sostituisci(t.sopra, { centro: centro.nome, mese: mese.charAt(0).toUpperCase() + mese.slice(1) }),
  );
}

/** Il colpo del mese: quello del programma più usato dai gruppi visibili, altrimenti il dritto. */
function colpoDelMese(d: DatiOrg, o: Org): string {
  const conta = new Map<string, number>();
  o.gruppiVis.forEach((g) => {
    const c = meseProgramma(d.programmi.find((p) => p.id === g.programma_id))?.colpo;
    if (c) conta.set(norm(c), (conta.get(norm(c)) ?? 0) + 1);
  });
  return [...conta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "dritto";
}

type Genitore = { nome: string; cognome: string; email: string; telefono: string; relazione: string };
const GEN0: Genitore = { nome: "", cognome: "", email: "", telefono: "", relazione: "mamma" };

/** Crea il genitore (membro senza account finché non entra con il codice) e lo collega all'allievo. */
async function collegaGenitore(o: Org, allievoId: string, g: Genitore): Promise<string | null> {
  const m = await o.sb.from("membri").insert({ centro_id: o.centro.id, ruolo: "genitore", nome: g.nome.trim(), cognome: g.cognome.trim() || null, email: g.email.trim() || null, telefono: g.telefono.trim() || null, stato: "invitato" }).select("id").single();
  if (m.error || !m.data) return m.error?.message ?? "?";
  const f = await o.sb.from("allievi_famiglie").insert({ centro_id: o.centro.id, allievo_id: allievoId, membro_id: m.data.id, relazione: g.relazione });
  return f.error?.message ?? null;
}

function FormGenitore({ g, set }: { g: Genitore; set: (g: Genitore) => void }) {
  const t = useT(T);
  return (
    <>
      <div className="og-dash c2" style={{ gap: 10 }}>
        <Campo etichetta={t.gNome} valore={g.nome} onChange={(v) => set({ ...g, nome: v })} />
        <Campo etichetta={t.gCognome} valore={g.cognome} onChange={(v) => set({ ...g, cognome: v })} />
        <Campo etichetta={t.gEmail} tipo="email" valore={g.email} onChange={(v) => set({ ...g, email: v })} />
        <Campo etichetta={t.gTel} tipo="tel" valore={g.telefono} onChange={(v) => set({ ...g, telefono: v })} />
      </div>
      <Campo etichetta={t.relazione} valore={g.relazione} onChange={(v) => set({ ...g, relazione: v })} opzioni={[{ valore: "mamma", etichetta: t.mamma }, { valore: "papà", etichetta: t.papa }, { valore: "tutore", etichetta: t.tutore }]} />
    </>
  );
}

function FoglioNuovo({ o, d, onChiudi }: { o: Org; d: DatiOrg; onChiudi: () => void }) {
  const t = useT(T);
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [nascita, setNascita] = useState("");
  const [gruppoId, setGruppoId] = useState("");
  const [gen, setGen] = useState<Genitore>(GEN0);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [codice, setCodice] = useState<string | null>(null);
  const gruppi = o.gruppiVis.filter((g) => g.attivo && o.can("iscrizioni", g.area_id));
  const valido = nome.trim() && cognome.trim();

  const crea = async () => {
    setLavoro(true); setErrore(null);
    const a = await o.sb.from("allievi").insert({ centro_id: o.centro.id, nome: nome.trim(), cognome: cognome.trim(), data_nascita: nascita || null }).select("id").single();
    if (a.error || !a.data) { setErrore(a.error?.message ?? "?"); setLavoro(false); return; }
    const id = a.data.id as string;
    if (gruppoId) {
      const i = await o.sb.from("iscrizioni").insert({ centro_id: o.centro.id, allievo_id: id, gruppo_id: gruppoId, dal: o.oggi });
      if (i.error) { setErrore(i.error.message); setLavoro(false); await o.carica(); return; }
    }
    if (gen.nome.trim()) {
      const e = await collegaGenitore(o, id, gen);
      if (e) { setErrore(e); setLavoro(false); await o.carica(); return; }
    }
    const inv = await creaInvito(o.sb, o.centro.id, { ruolo: "genitore", gruppo_id: gruppoId || null, allievo_id: id, usi_max: 2 });
    await o.registra("allievo_creato", `${nome.trim()} ${cognome.trim()}`, { allievo_id: id, gruppo_id: gruppoId || null });
    await o.carica();
    setLavoro(false);
    if (inv.errore) setErrore(inv.errore); else setCodice(inv.invito?.codice ?? null);
  };

  if (codice) {
    return (
      <Foglio aperto onChiudi={onChiudi} titolo={t.fatto}>
        <div className="og-form">
          <InvitoBox codice={codice} titolo={t.codiceFam} />
          <div className="og-azioni">
            <Btn variante="secondario" onClick={() => { setCodice(null); setNome(""); setCognome(""); setNascita(""); setGen(GEN0); }}>{t.altroAllievo}</Btn>
            <Btn onClick={onChiudi}>{t.chiudi}</Btn>
          </div>
        </div>
      </Foglio>
    );
  }
  return (
    <Foglio aperto onChiudi={onChiudi} titolo={t.nuovoT}>
      <div className="og-form">
        <div className="og-dash c2" style={{ gap: 10 }}>
          <Campo etichetta={t.nome} valore={nome} onChange={setNome} />
          <Campo etichetta={t.cognome} valore={cognome} onChange={setCognome} />
        </div>
        <Campo etichetta={t.nascita} tipo="date" valore={nascita} onChange={setNascita} />
        <Campo etichetta={t.gruppo} valore={gruppoId} onChange={setGruppoId} opzioni={[{ valore: "", etichetta: t.nessuno }, ...gruppi.map((g) => ({ valore: g.id, etichetta: g.nome }))]} />
        <div className="og-k">{t.famiglia}</div>
        <FormGenitore g={gen} set={setGen} />
        <div className="og-s">{t.famAiuto}</div>
        {!valido && <div className="og-s">{t.obbl}</div>}
        {errore && <Errore messaggio={errore} />}
        <div className="og-azioni">
          <Btn variante="secondario" onClick={onChiudi}>{t.annulla}</Btn>
          <Btn disabled={!valido || lavoro} onClick={() => void crea()}>{lavoro ? t.creo : t.crea}</Btn>
        </div>
      </div>
    </Foglio>
  );
}

function FoglioScheda({ o, d, id, onChiudi }: { o: Org; d: DatiOrg; id: string; onChiudi: () => void }) {
  const t = useT(T);
  const a = d.allievi.find((x) => x.id === id);
  const [cert, setCert] = useState(a?.certificato_scade ?? "");
  const [nuovoG, setNuovoG] = useState("");
  const [gen, setGen] = useState<Genitore | null>(null);
  const [codice, setCodice] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  if (!a) return null;
  const gid = [...new Set(o.iscrAttive.filter((i) => i.allievo_id === id).map((i) => i.gruppo_id))];
  const fam = d.famiglie.filter((f) => f.allievo_id === id).map((f) => ({ f, m: d.membri.find((m) => m.id === f.membro_id) })).filter((x) => x.m);
  const gruppiLiberi = o.gruppiVis.filter((g) => g.attivo && !gid.includes(g.id) && o.can("iscrizioni", g.area_id));
  const puo = o.can("iscrizioni");

  const iscrivi = async () => {
    const r = await o.sb.from("iscrizioni").insert({ centro_id: o.centro.id, allievo_id: id, gruppo_id: nuovoG, dal: o.oggi });
    if (r.error) { setErrore(r.error.message); return; }
    setNuovoG("");
    await o.registra("iscrizione", nomeCompleto(a), { gruppo_id: nuovoG });
    await o.carica();
  };
  const togli = async (gruppoId: string) => {
    const ids = d.iscrizioni.filter((i) => i.allievo_id === id && i.gruppo_id === gruppoId && (!i.al || i.al >= o.oggi)).map((i) => i.id);
    const r = await o.sb.from("iscrizioni").update({ al: o.oggi }).in("id", ids);
    if (r.error) { setErrore(r.error.message); return; }
    await o.registra("iscrizione_chiusa", nomeCompleto(a), { gruppo_id: gruppoId });
    await o.carica();
  };
  const salvaCert = async () => {
    const r = await o.sb.from("allievi").update({ certificato_scade: cert || null }).eq("id", id);
    if (r.error) { setErrore(r.error.message); return; }
    setMsg(t.salvato);
    await o.carica();
  };
  const aggiungiGen = async () => {
    if (!gen || !gen.nome.trim()) return;
    const e = await collegaGenitore(o, id, gen);
    if (e) { setErrore(e); return; }
    setGen(null);
    await o.carica();
  };
  const invita = async () => {
    const inv = await creaInvito(o.sb, o.centro.id, { ruolo: "genitore", allievo_id: id, gruppo_id: gid[0] ?? null, usi_max: 2 });
    if (inv.errore) setErrore(inv.errore); else setCodice(inv.invito?.codice ?? null);
  };

  return (
    <Foglio aperto onChiudi={onChiudi} titolo={`${t.scheda} · ${nomeCompleto(a)}`}>
      <div className="og-form">
        <div className="og-k">{t.iscrizioni}</div>
        {gid.length === 0 && <div className="og-s">{t.senzaGruppo}</div>}
        {gid.map((g) => (
          <div key={g} className="li" style={{ padding: "8px 12px" }}>
            <span className="grow og-t">{d.gruppi.find((x) => x.id === g)?.nome}</span>
            {puo && <button type="button" className="chip" onClick={() => void togli(g)}>{t.rimuovi}</button>}
          </div>
        ))}
        {puo && gruppiLiberi.length > 0 && (
          <div className="og-riga">
            <div className="grow"><Campo etichetta={t.iscrivi} valore={nuovoG} onChange={setNuovoG} opzioni={[{ valore: "", etichetta: t.scegli }, ...gruppiLiberi.map((g) => ({ valore: g.id, etichetta: g.nome }))]} /></div>
            <Btn pieno={false} variante="secondario" disabled={!nuovoG} onClick={() => void iscrivi()}>{t.ok}</Btn>
          </div>
        )}
        <div className="og-k">{t.famigliaT}</div>
        {fam.length === 0 && <Nota>{t.nessunaFam}</Nota>}
        {fam.map(({ f, m }) => <div key={f.id} className="li" style={{ padding: "8px 12px" }}><span className="grow"><span className="og-t" style={{ display: "block" }}>{nomeCompleto(m!)}</span><span className="og-s" style={{ display: "block" }}>{[f.relazione, m!.email, m!.telefono].filter(Boolean).join(" · ")}</span></span></div>)}
        {puo && (gen ? (
          <>
            <FormGenitore g={gen} set={setGen} />
            <div className="og-azioni"><Btn variante="secondario" onClick={() => setGen(null)}>{t.annulla}</Btn><Btn disabled={!gen.nome.trim()} onClick={() => void aggiungiGen()}>{t.aggiungiGen}</Btn></div>
          </>
        ) : <Btn variante="secondario" icona="plus" onClick={() => setGen(GEN0)}>{t.aggGen}</Btn>)}
        {puo && (codice ? <InvitoBox codice={codice} titolo={t.codiceFam} /> : <Btn variante="secondario" icona="share" onClick={() => void invita()}>{t.invita}</Btn>)}
        <Campo etichetta={t.certificato} tipo="date" valore={cert} onChange={(v) => { setCert(v); setMsg(null); }} />
        {puo && <Btn variante="secondario" onClick={() => void salvaCert()}>{msg ?? t.salvaCert}</Btn>}
        {errore && <Errore messaggio={errore} />}
        <div className="og-s">{a.data_nascita ? fmtData(a.data_nascita) : ""}</div>
      </div>
    </Foglio>
  );
}
