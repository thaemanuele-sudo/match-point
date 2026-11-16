"use client";
// C20 · Organizzazione del centro: la direzione tecnica sopra le aree; ogni area ha uno o più responsabili.
// Si aggiungono e si tolgono responsabili, si creano e si modificano le aree. Metodo e tutela restano della direzione.
import Link from "next/link";
import { useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Avatar, Btn, Campo, Caricamento, Chip, Chips, Errore, Foglio, Ico, Nota, Tag, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { FASCE, PERMESSI_BASE, allieviDelGruppo, colorePerArea, fasceTesto, nomeCompleto, sostituisci, useOrg, type DatiOrg, type Org } from "./dati";
import { InvitoBox, creaInvito } from "./Invito";
import type { AreaR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Organizzazione del centro", sopra: "{centro} · {n} aree", nuovaArea: "Nuova area", dt: "Direttore tecnico · sopra tutte le aree", dtTag: "DT", nessunDt: "Nessun direttore tecnico",
  gruppi: "{g} gruppi · {a} allievi", resp: "+ Responsabile", respDi: "Aggiungi responsabile a {a}", nessunResp: "Nessun responsabile", togli: "Togli {n} da {a}",
  nota: "I responsabili organizzano gruppi, orari, campi e avvisi della loro area. Metodo e tutela restano della direzione tecnica.", permessi: "Vedi i permessi",
  vuotoT: "Nessuna area", vuotoS: "Crea le aree del centro (per esempio SAT, Accademia, Adulti) e assegna i responsabili.", modArea: "Modifica area {n}",
  // foglio responsabile
  addT: "Responsabile di {a}", scegli: "Persona del centro", scegliOpz: "Scegli una persona", aggiungi: "Aggiungi come responsabile", oppure: "Oppure invita una persona nuova con un codice", genera: "Crea codice di invito", altroCodice: "Codice per il nuovo responsabile",
  nessunaPersona: "Non ci sono altre persone da aggiungere: invita qualcuno con il codice.",
  // area
  nuovaT: "Nuova area", modT: "Modifica area", nome: "Nome dell'area", sigla: "Sigla (es. SAT)", fasce: "Fasce", salva: "Salva", crea: "Crea area", annulla: "Annulla", salvo: "Salvo…", obbl: "Scrivi il nome dell'area.",
  confT: "Togli il responsabile", confS: "{n} non organizzerà più {a}. Il suo ruolo di maestro non cambia.", conferma: "Togli", solo: "Solo la direzione tecnica può cambiare l'organizzazione.",
};
const T = { it: IT, en: { ...IT } };

export default function CentroOrganigramma() {
  const t = useT(T);
  const o = useOrg();
  const { centro, dati: d } = o;
  const r = rotta(centro.slug);
  const [respDi, setRespDi] = useState<AreaR | null>(null);
  const [areaF, setAreaF] = useState<{ a: AreaR | null } | null>(null);
  const [togli, setTogli] = useState<{ id: string; nome: string; area: string } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const puo = o.isDT;

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="organizzazione" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base}
      azioni={puo && d ? <button type="button" className="icon" aria-label={t.nuovaArea} onClick={() => setAreaF({ a: null })}><Ico nome="plus" size={18} tratto={2.4} /></button> : undefined}>
      {corpo}
    </SchermoCentro>
  );
  if (!d) return schermo(o.errore ? <Errore messaggio={o.errore} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const dts = d.membri.filter((m) => m.ruolo === "dt");
  const direzione = dts.length ? dts : d.membri.filter((m) => m.ruolo === "titolare");
  const rimuovi = async () => {
    if (!togli) return;
    const x = await o.sb.from("membri").delete().eq("id", togli.id).eq("ruolo", "responsabile_area");
    if (x.error) { setErrore(x.error.message); return; }
    await o.registra("responsabile_tolto", togli.area, { membro: togli.nome });
    setTogli(null);
    await o.carica();
  };

  return schermo(
    <div className="og-pagina">
      {errore && <Errore messaggio={errore} />}
      {!puo && <Nota icona="lock">{t.solo}</Nota>}
      <div className="card og-card" style={{ flexDirection: "row", alignItems: "center", gap: 10, borderColor: "rgba(216,243,74,.45)", padding: "10px 12px" }}>
        {direzione[0] ? <Avatar nome={direzione[0].nome} cognome={direzione[0].cognome} size={38} /> : <span className="ic"><Ico nome="star" size={18} /></span>}
        <span className="grow"><span className="og-t" style={{ display: "block", fontWeight: 800 }}>{direzione.length ? direzione.map(nomeCompleto).join(" · ") : t.nessunDt}</span><span className="og-s" style={{ display: "block" }}>{t.dt}</span></span>
        <Tag colore="#D8F34A" sfondo="#0B0B0C">{t.dtTag}</Tag>
      </div>
      <div aria-hidden="true" style={{ height: 10, margin: "-3px 0", display: "flex", justifyContent: "center" }}><span style={{ width: 2, background: "#3A3A3C" }} /></div>

      {d.aree.length === 0 ? <Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="star" azione={puo ? <Btn pieno={false} icona="plus" onClick={() => setAreaF({ a: null })}>{t.nuovaArea}</Btn> : undefined} /> : (
        <div className="og-dash c2" style={{ gap: 6 }}>
          {d.aree.map((a) => {
            const gs = d.gruppi.filter((g) => g.area_id === a.id && g.attivo);
            const n = new Set(gs.flatMap((g) => allieviDelGruppo(d.iscrizioni.filter((i) => !i.al || i.al >= o.oggi), g.id))).size;
            const rs = d.membri.filter((m) => m.ruolo === "responsabile_area" && m.area_id === a.id);
            return (
              <div key={a.id} className="card og-card og-fascia-card" style={{ ["--c" as string]: colorePerArea(d, a.id), padding: "9px 12px", gap: 6 }}>
                <div className="og-riga" style={{ flexWrap: "nowrap", alignItems: "baseline" }}>
                  {puo ? <button type="button" className="grow og-ell" style={{ background: "none", border: 0, color: "inherit", font: "inherit", fontWeight: 800, fontSize: 15, textAlign: "left", padding: 0, cursor: "pointer" }} aria-label={sostituisci(t.modArea, { n: a.nome })} onClick={() => setAreaF({ a })}>{a.nome}</button>
                    : <span className="grow og-ell og-t" style={{ fontWeight: 800 }}>{a.nome}</span>}
                  {fasceTesto(a.fasce) && <Tag>{fasceTesto(a.fasce)}</Tag>}
                </div>
                <div className="og-s">{sostituisci(t.gruppi, { g: gs.length, a: n })}</div>
                <div className="og-riga" style={{ gap: 6 }}>
                  {rs.length === 0 && <span className="og-s grow">{t.nessunResp}</span>}
                  {rs.map((m) => (
                    <span key={m.id} className="og-pill"><Avatar nome={m.nome} cognome={m.cognome} size={24} />{nomeCompleto(m)}
                      {puo && <button type="button" aria-label={sostituisci(t.togli, { n: nomeCompleto(m), a: a.nome })} onClick={() => setTogli({ id: m.id, nome: nomeCompleto(m), area: a.nome })}><Ico nome="x" size={13} /></button>}
                    </span>
                  ))}
                  {puo && <button type="button" className="og-chipbtn" style={{ marginLeft: "auto" }} aria-label={sostituisci(t.respDi, { a: a.nome })} onClick={() => setRespDi(a)}>{t.resp}</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="note og-riga" style={{ alignItems: "flex-start", flexWrap: "nowrap", fontSize: 12 }}><Ico nome="lock" size={16} /><span>{t.nota} <Link href={r.dt.permessi} style={{ fontWeight: 700, textDecoration: "none" }}>{t.permessi}</Link></span></div>

      {respDi && <FoglioResp o={o} d={d} area={respDi} onChiudi={() => setRespDi(null)} />}
      {areaF && <FoglioArea o={o} d={d} area={areaF.a} onChiudi={() => setAreaF(null)} />}
      {togli && (
        <Foglio aperto onChiudi={() => setTogli(null)} titolo={t.confT}>
          <div className="og-form"><div className="og-s">{sostituisci(t.confS, { n: togli.nome, a: togli.area })}</div>
            <div className="og-azioni"><Btn variante="secondario" onClick={() => setTogli(null)}>{t.annulla}</Btn><Btn onClick={() => void rimuovi()}>{t.conferma}</Btn></div></div>
        </Foglio>
      )}
    </div>,
    sostituisci(t.sopra, { centro: centro.nome, n: d.aree.length }),
  );
}

function FoglioResp({ o, d, area, onChiudi }: { o: Org; d: DatiOrg; area: AreaR; onChiudi: () => void }) {
  const t = useT(T);
  const [pid, setPid] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [codice, setCodice] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState(false);
  const gia = d.membri.filter((m) => m.ruolo === "responsabile_area" && m.area_id === area.id);
  const stessa = (a: { user_id: string | null; nome: string; cognome: string | null }, b: { user_id: string | null; nome: string; cognome: string | null }) => (a.user_id && b.user_id ? a.user_id === b.user_id : a.nome === b.nome && (a.cognome ?? "") === (b.cognome ?? ""));
  // una persona compare una volta sola, anche se ha più righe (maestro e responsabile di un'altra area)
  const candidati = d.membri.filter((m) => ["maestro", "segreteria", "dt"].includes(m.ruolo) && m.stato !== "sospeso" && !gia.some((g) => stessa(g, m)));
  const unici = candidati.filter((m, i) => candidati.findIndex((x) => stessa(x, m)) === i);

  const aggiungi = async () => {
    const p = unici.find((m) => m.id === pid);
    if (!p) return;
    setLavoro(true); setErrore(null);
    const x = await o.sb.from("membri").insert({ centro_id: o.centro.id, user_id: p.user_id, ruolo: "responsabile_area", area_id: area.id, nome: p.nome, cognome: p.cognome, email: p.email, telefono: p.telefono, stato: p.stato === "invitato" ? "invitato" : "attivo" });
    if (x.error) { setErrore(x.error.message); setLavoro(false); return; }
    await o.registra("responsabile_aggiunto", area.nome, { membro: nomeCompleto(p) });
    await o.carica();
    setLavoro(false);
    onChiudi();
  };
  const invita = async () => {
    const r = await creaInvito(o.sb, o.centro.id, { ruolo: "responsabile_area", area_id: area.id });
    if (r.errore) setErrore(r.errore); else setCodice(r.invito?.codice ?? null);
  };
  return (
    <Foglio aperto onChiudi={onChiudi} titolo={sostituisci(t.addT, { a: area.nome })}>
      <div className="og-form">
        {unici.length === 0 ? <Nota>{t.nessunaPersona}</Nota> : (
          <>
            <Campo etichetta={t.scegli} valore={pid} onChange={setPid} opzioni={[{ valore: "", etichetta: t.scegliOpz }, ...unici.map((m) => ({ valore: m.id, etichetta: nomeCompleto(m) }))]} />
            <Btn disabled={!pid || lavoro} onClick={() => void aggiungi()}>{t.aggiungi}</Btn>
          </>
        )}
        <div className="og-s">{t.oppure}</div>
        {codice ? <InvitoBox codice={codice} titolo={t.altroCodice} /> : <Btn variante="secondario" icona="share" onClick={() => void invita()}>{t.genera}</Btn>}
        {errore && <Errore messaggio={errore} />}
      </div>
    </Foglio>
  );
}

function FoglioArea({ o, d, area, onChiudi }: { o: Org; d: DatiOrg; area: AreaR | null; onChiudi: () => void }) {
  const t = useT(T);
  const [nome, setNome] = useState(area?.nome ?? "");
  const [sigla, setSigla] = useState(area?.sigla ?? "");
  const [fasce, setFasce] = useState<string[]>(area?.fasce ?? []);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const salva = async () => {
    setLavoro(true); setErrore(null);
    const v = { nome: nome.trim(), sigla: sigla.trim() || null, fasce: FASCE.filter((f) => fasce.includes(f)) };
    if (area) {
      const x = await o.sb.from("aree").update(v).eq("id", area.id);
      if (x.error) { setErrore(x.error.message); setLavoro(false); return; }
    } else {
      const ordine = Math.max(0, ...d.aree.map((a) => a.ordine ?? 0)) + 1;
      const x = await o.sb.from("aree").insert({ ...v, ordine, centro_id: o.centro.id }).select("id").single();
      if (x.error || !x.data) { setErrore(x.error?.message ?? "?"); setLavoro(false); return; }
      // ogni area nasce con i permessi di base: poi si regolano in "Ruolo e permessi"
      await o.sb.from("permessi_ruolo").insert({ centro_id: o.centro.id, area_id: x.data.id, permessi: { ...PERMESSI_BASE, metodo: "lettura", tutela: false } });
    }
    await o.registra(area ? "area_modificata" : "area_creata", v.nome, v);
    await o.carica();
    setLavoro(false);
    onChiudi();
  };
  return (
    <Foglio aperto onChiudi={onChiudi} titolo={area ? t.modT : t.nuovaT}>
      <div className="og-form">
        <Campo etichetta={t.nome} valore={nome} onChange={setNome} />
        <Campo etichetta={t.sigla} valore={sigla} onChange={setSigla} />
        <div><div className="k" style={{ marginBottom: 4 }}>{t.fasce}</div>
          <Chips>{FASCE.map((f) => <Chip key={f} on={fasce.includes(f)} onClick={() => setFasce((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))}>{f}</Chip>)}</Chips></div>
        {!nome.trim() && <div className="og-s">{t.obbl}</div>}
        {errore && <Errore messaggio={errore} />}
        <div className="og-azioni"><Btn variante="secondario" onClick={onChiudi}>{t.annulla}</Btn><Btn disabled={!nome.trim() || lavoro} onClick={() => void salva()}>{lavoro ? t.salvo : area ? t.salva : t.crea}</Btn></div>
      </div>
    </Foglio>
  );
}
