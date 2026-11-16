"use client";
// C18 · Mappa dei campi: mappa dall'alto, scheda del campo scelto, aggiunta e modifica di un campo.
import { useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Campo, Caricamento, Chip, Chips, Errore, Foglio, Ico, Interruttore, Nota, Tag, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { fmtDataLunga, fmtGiorni, fmtOra } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { maestriDi, nomeCompleto, sostituisci, useOrg, type DatiOrg, type Org } from "./dati";
import { COLORI_FONDO, MappaCampi, rettangoli } from "./MappaCampi";
import type { CampoR, Copertura, StatoCampo, Superficie } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Mappa dei campi", sopra: "{centro} · {n} campi", aggiungi: "Aggiungi campo", orari: "Orari e maestri", modifica: "Modifica campo", scheda: "Scheda del campo",
  fondo: "Fondo", copertura: "Copertura", luci: "Luci", lezioni: "Lezioni", si: "Sì", no: "No", settimana: "{n} a sett.",
  terra: "Terra rossa", cemento: "Cemento", sintetico: "Sintetico", erba: "Erba", scoperto: "Scoperto", coperto: "Coperto", pallone: "Pallone",
  disponibile: "Disponibile", manutenzione: "In manutenzione", chiuso: "Chiuso", manutProssima: "Manutenzione {d}", campoN: "Campo {n}", sub: "{s} {c}",
  gruppiT: "Gruppi su questo campo", nessunGruppo: "Nessun gruppo ha questo campo come abituale.", noteT: "Note",
  cambioDa: "{d}: {g} si sposta sul Campo {a} ({m}).", cambioA: "{d} alle {o} ospita {g} al posto del Campo {da}.", motivo: "{m}",
  vuotoT: "Nessun campo", vuotoS: "Aggiungi i campi del centro: servono per gli orari e i cambi campo.",
  nuovoT: "Nuovo campo", modT: "Modifica campo", numero: "Numero", nome: "Nome (facoltativo, es. Centrale, Mini)", superficie: "Fondo", cop: "Copertura", stato: "Stato", note: "Note", conLuci: "Illuminato (luci)",
  salva: "Salva", crea: "Aggiungi", annulla: "Annulla", salvo: "Salvo…", numeroOcc: "Esiste già un Campo {n}.", obbl: "Scrivi un numero valido.",
};
const T = { it: IT, en: { ...IT } };

export default function CentroCampi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, dati: d } = o;
  const r = rotta(centro.slug);
  const [sel, setSel] = useState<string | null>(null);
  const [foglio, setFoglio] = useState<{ c: CampoR | null } | null>(null);
  const puo = o.can("campi");

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="campi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base} largo
      azioni={d && puo ? <button type="button" className="icon" aria-label={t.aggiungi} onClick={() => setFoglio({ c: null })}><Ico nome="plus" size={18} tratto={2.4} /></button> : undefined}>
      {corpo}
    </SchermoCentro>
  );
  if (!d) return schermo(o.errore ? <Errore messaggio={o.errore} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const campi = o.campiVis;
  if (campi.length === 0) {
    return schermo(<Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="grid" azione={puo ? <Btn pieno={false} icona="plus" onClick={() => setFoglio({ c: null })}>{t.aggiungi}</Btn> : undefined} />, sostituisci(t.sopra, { centro: centro.nome, n: 0 }));
  }
  const cur = campi.find((c) => c.id === sel) ?? campi[0];
  // manutenzione già programmata (anche solo per una data): il fondo è segnato fermo sulla mappa
  const manutAvanti = (c: CampoR) => d.cambi.filter((x) => x.campo_da === c.id && x.data >= o.oggi && (x.motivo ?? "").toLowerCase().startsWith("manut"));
  const inManut = new Set(campi.filter((c) => manutAvanti(c).length > 0).map((c) => c.id));

  return schermo(
    <div className="og-pagina">
      <div className="og-split">
        <div className="og-pagina">
          <MappaCampi campi={campi} selezionato={cur.id} onSeleziona={setSel} inManut={inManut} />
          <Chips>{campi.map((c) => <Chip key={c.id} on={c.id === cur.id} onClick={() => setSel(c.id)}>{sostituisci(t.campoN, { n: c.numero })}</Chip>)}</Chips>
        </div>
        <Scheda c={cur} d={d} o={o} manutAvanti={manutAvanti(cur)} modifica={puo ? () => setFoglio({ c: cur }) : undefined} />
      </div>
      <div className="og-riga">
        <Btn variante="secondario" href={r.dt.campiOrari} className="grow">{t.orari}</Btn>
        {puo && <Btn onClick={() => setFoglio({ c: null })} icona="plus" className="grow">{t.aggiungi}</Btn>}
      </div>
      {foglio && <FoglioCampo key={foglio.c?.id ?? "nuovo"} o={o} d={d} campo={foglio.c} onChiudi={() => setFoglio(null)} onFatto={(id) => setSel(id)} />}
    </div>,
    sostituisci(t.sopra, { centro: centro.nome, n: campi.length }),
  );
}

function Scheda({ c, d, o, manutAvanti, modifica }: { c: CampoR; d: DatiOrg; o: Org; manutAvanti: DatiOrg["cambi"]; modifica?: () => void }) {
  const t = useT(T);
  const gruppi = d.gruppi.filter((g) => g.attivo && g.campo_id === c.id);
  const lezioni = gruppi.reduce((s, g) => s + (g.giorni?.length ?? 0), 0);
  const ok = c.stato === "disponibile";
  const cambi = d.cambi.filter((x) => x.data >= o.oggi && (x.campo_da === c.id || x.campo_a === c.id)).sort((a, b) => (a.data > b.data ? 1 : -1));
  const num = (id: string | null) => d.campi.find((x) => x.id === id)?.numero ?? "?";
  const gNome = (id: string) => d.gruppi.find((g) => g.id === id)?.nome ?? "";
  const sup = t[c.superficie as Superficie], cop = t[c.copertura as Copertura];
  return (
    <div className="card og-card" style={{ padding: 12, gap: 9 }}>
      <div className="og-riga" style={{ flexWrap: "nowrap" }}>
        <span className="ic disp" style={{ background: COLORI_FONDO[c.superficie]?.campo, color: "#fff", fontSize: 22, fontWeight: 800 }}>{c.numero}</span>
        <span className="grow"><span className="og-t" style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{c.nome || sostituisci(t.campoN, { n: c.numero })}</span><span className="og-s" style={{ display: "block" }}>{sostituisci(t.sub, { s: sup, c: cop.toLowerCase() })}</span></span>
        <Tag colore={ok ? "#4CD07D" : "#FFD54A"} sfondo={ok ? "rgba(76,208,125,.16)" : "rgba(255,213,74,.16)"}>{t[c.stato as StatoCampo]}</Tag>
      </div>
      {ok && manutAvanti[0] && <Tag colore="#FFD54A" sfondo="rgba(255,213,74,.16)">{sostituisci(t.manutProssima, { d: fmtDataLunga(manutAvanti[0].data) })}</Tag>}
      <div className="g2" style={{ gap: 6 }}>
        <div className="og-kv"><span className="muted">{t.fondo}</span><b>{sup}</b></div>
        <div className="og-kv"><span className="muted">{t.copertura}</span><b>{cop}</b></div>
        <div className="og-kv"><span className="muted">{t.luci}</span><b>{c.luci ? t.si : t.no}</b></div>
        <div className="og-kv"><span className="muted">{t.lezioni}</span><b>{sostituisci(t.settimana, { n: lezioni })}</b></div>
      </div>
      <div className="og-k">{t.gruppiT}</div>
      {gruppi.length === 0 && <div className="og-s">{t.nessunGruppo}</div>}
      {gruppi.map((g) => (
        <div key={g.id} className="og-riga" style={{ fontSize: 13, flexWrap: "nowrap" }}>
          <Ico nome="users" size={16} />
          <span className="grow"><b>{g.nome}</b> <span className="muted">· {fmtGiorni(g.giorni)} {fmtOra(g.ora)} · {maestriDi(d, g.id).map(nomeCompleto).join(", ")}</span></span>
        </div>
      ))}
      {(c.note || cambi.length > 0) && (
        <Nota>
          {[c.note, ...cambi.map((x) => x.campo_da === c.id
            ? sostituisci(t.cambioDa, { d: fmtDataLunga(x.data), g: gNome(x.gruppo_id), a: num(x.campo_a), m: x.motivo ?? "" })
            : sostituisci(t.cambioA, { d: fmtDataLunga(x.data), o: fmtOra(d.gruppi.find((g) => g.id === x.gruppo_id)?.ora), g: gNome(x.gruppo_id), da: num(x.campo_da) }))].filter(Boolean).join(" ")}
        </Nota>
      )}
      {modifica && <Btn variante="secondario" icona="edit" piccolo onClick={modifica}>{t.modifica}</Btn>}
    </div>
  );
}

function FoglioCampo({ o, d, campo, onChiudi, onFatto }: { o: Org; d: DatiOrg; campo: CampoR | null; onChiudi: () => void; onFatto: (id: string) => void }) {
  const t = useT(T);
  const prossimo = Math.max(0, ...d.campi.map((c) => c.numero)) + 1;
  const [numero, setNumero] = useState(String(campo?.numero ?? prossimo));
  const [nome, setNome] = useState(campo?.nome ?? "");
  const [sup, setSup] = useState<Superficie>(campo?.superficie ?? "terra");
  const [cop, setCop] = useState<Copertura>(campo?.copertura ?? "scoperto");
  const [luci, setLuci] = useState(campo?.luci ?? true);
  const [stato, setStato] = useState<StatoCampo>(campo?.stato ?? "disponibile");
  const [note, setNote] = useState(campo?.note ?? "");
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const n = Number(numero);
  const occupato = d.campi.some((c) => c.numero === n && c.id !== campo?.id);
  const valido = Number.isInteger(n) && n > 0 && !occupato;

  const salva = async () => {
    setLavoro(true); setErrore(null);
    const v = { numero: n, nome: nome.trim() || null, superficie: sup, copertura: cop, luci, stato, note: note.trim() || null };
    let id = campo?.id;
    if (campo) {
      const r = await o.sb.from("campi").update(v).eq("id", campo.id);
      if (r.error) { setErrore(r.error.message); setLavoro(false); return; }
    } else {
      // posizione sulla mappa: prossimo posto della griglia a due colonne, se sta ancora nella mappa
      const i = d.campi.length;
      const pos = i < 4 ? { x: (7 + (i % 2) * 167) / 3.4, y: (18 + Math.floor(i / 2) * 114) / 2.36, w: 160 / 3.4, h: 96 / 2.36 } : { x: null, y: null, w: null, h: null };
      const r = await o.sb.from("campi").insert({ ...v, ...pos, centro_id: o.centro.id }).select("id").single();
      if (r.error || !r.data) { setErrore(r.error?.message ?? "?"); setLavoro(false); return; }
      id = r.data.id as string;
    }
    await o.registra(campo ? "campo_modificato" : "campo_creato", `Campo ${n}`, { campo_id: id, stato, superficie: sup });
    await o.carica();
    setLavoro(false);
    if (id) onFatto(id);
    onChiudi();
  };
  const scelte = <V extends string>(valori: V[], v: V, set: (x: V) => void) => <Chips>{valori.map((x) => <Chip key={x} on={x === v} onClick={() => set(x)}>{t[x as keyof typeof IT]}</Chip>)}</Chips>;
  void rettangoli;
  return (
    <Foglio aperto onChiudi={onChiudi} titolo={campo ? t.modT : t.nuovoT}>
      <div className="og-form">
        <Campo etichetta={t.numero} tipo="number" valore={numero} onChange={setNumero} errore={occupato ? sostituisci(t.numeroOcc, { n }) : null} />
        <Campo etichetta={t.nome} valore={nome} onChange={setNome} />
        <div><div className="k" style={{ marginBottom: 4 }}>{t.superficie}</div>{scelte<Superficie>(["terra", "cemento", "sintetico", "erba"], sup, setSup)}</div>
        <div><div className="k" style={{ marginBottom: 4 }}>{t.cop}</div>{scelte<Copertura>(["scoperto", "coperto", "pallone"], cop, setCop)}</div>
        <Interruttore valore={luci} onChange={setLuci} etichetta={t.conLuci} />
        <div><div className="k" style={{ marginBottom: 4 }}>{t.stato}</div>{scelte<StatoCampo>(["disponibile", "manutenzione", "chiuso"], stato, setStato)}</div>
        <Campo etichetta={t.note} multiriga valore={note} onChange={setNote} />
        {!valido && !occupato && <div className="og-s">{t.obbl}</div>}
        {errore && <Errore messaggio={errore} />}
        <div className="og-azioni">
          <Btn variante="secondario" onClick={onChiudi}>{t.annulla}</Btn>
          <Btn disabled={!valido || lavoro} onClick={() => void salva()}>{lavoro ? t.salvo : campo ? t.salva : t.crea}</Btn>
        </div>
      </div>
    </Foglio>
  );
}
