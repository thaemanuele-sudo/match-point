"use client";
// C10 · Allievi del centro: lista con ricerca e filtri "in ritardo" e "assenze ripetute", scheda con iscrizioni e famiglia,
// aggiunta di un allievo con la sua famiglia e invito con codice.
import { useCallback, useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Campo, Caricamento, Chip, Chips, Errore, Foglio, Ico, Nota, Sezione, Tile, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { fmtData } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { PAGINA, coloreNome, iniziali, meseProgramma, nomeAllievo, nomeCompleto, sostituisci, useConteggi, useDebounce, useOrg, type DatiOrg, type Org } from "./dati";
import { InvitoBox, creaInvito } from "./Invito";
import type { AllievoL, GruppoR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Allievi del centro", sopra: "{centro} · {mese}", attivi: "allievi attivi", presenze: "presenze del mese", ritardo: "in ritardo", cerca: "Cerca per nome",
  allievi: "Allievi", progresso: "Presenze · ultimi 30 giorni", fTutti: "Tutti {n}", fRitardo: "In ritardo {n}", fAssenze: "Assenze ripetute {n}", mostraAltri: "Carica altri allievi", vuotoT: "Nessun allievo", vuotoS: "Aggiungi il primo allievo con la sua famiglia.",
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

/** Riga di `allievi_stato_lista` (docs/RPC.md): anagrafica più lo stato calcolato dal database sugli ultimi 30 giorni. */
type RigaStato = AllievoL & { gruppi: string[]; maestri: string[]; perc: number | null; assenti: number; su: number; ritardo: boolean; ripetute: boolean; totale: number };
type Pagina = { righe: RigaStato[]; altri: boolean; errore: string | null };
const FILTRO_RPC = { tutti: "tutti", ritardo: "ritardo", assenze: "ripetute" } as const;

export default function CentroAllievi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, sb, dati: d } = o;
  const r = rotta(centro.slug);
  const [filtro, setFiltro] = useState<"tutti" | "ritardo" | "assenze">("tutti");
  const [q, setQ] = useState("");
  const qDeb = useDebounce(q);
  const [nuovo, setNuovo] = useState(false);
  const [scheda, setScheda] = useState<AllievoL | null>(null);
  // la lista corrente (una pagina alla volta, ordinata e filtrata dal database)
  const [lista, setLista] = useState<Pagina | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [versione, setVersione] = useState(0);
  const rinnova = useCallback(() => setVersione((v) => v + 1), []);

  // il colpo del mese decide il livello su cui si misura il "in ritardo"
  const colpo = useMemo(() => (d ? colpoDelMese(d, o.gruppiVis) : null), [d, o.gruppiVis]);
  // un responsabile d'area vede solo la sua area (`ids`); la direzione tutto il centro
  const { riepilogo, errore: errRiepilogo } = useConteggi(sb, centro.id, o.ids, d ? `${versione}` : null, colpo);

  const leggiPagina = useCallback(async (da: number): Promise<Pagina> => {
    const x = await sb.rpc("allievi_stato_lista", {
      p_centro: centro.id, p_aree: o.ids, p_q: qDeb.trim() || null, p_filtro: FILTRO_RPC[filtro], p_colpo: colpo, p_limit: PAGINA, p_offset: da,
    });
    if (x.error) return { righe: [], altri: false, errore: x.error.message };
    const righe = ((x.data ?? []) as RigaStato[]).map((a) => ({ ...a, totale: Number(a.totale) }));
    return { righe, altri: da + righe.length < (righe[0]?.totale ?? 0), errore: null };
  }, [filtro, qDeb, sb, centro.id, o.ids, colpo]);

  // prima pagina: riparte a ogni cambio di filtro, di ricerca (dopo il debounce) o dopo una modifica
  useEffect(() => {
    if (!d) return;
    let vivo = true;
    setCaricando(true);
    void leggiPagina(0).then((p) => { if (vivo) { setLista(p); setCaricando(false); } });
    return () => { vivo = false; };
  }, [d, leggiPagina, versione]);

  const altri = async () => {
    if (!lista || caricando) return;
    setCaricando(true);
    const p = await leggiPagina(lista.righe.length);
    setLista({ righe: [...lista.righe, ...p.righe], altri: p.altri, errore: p.errore });
    setCaricando(false);
  };

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="allievi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base}
      azioni={d && o.can("iscrizioni") ? <button type="button" className="icon" aria-label={t.aggiungi} onClick={() => setNuovo(true)}><Ico nome="plus" size={18} tratto={2.4} /></button> : undefined}>
      {corpo}
    </SchermoCentro>
  );
  if (!d || lista === null || !riepilogo) return schermo(o.errore || errRiepilogo ? <Errore messaggio={o.errore ?? errRiepilogo} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const adesso = new Date();
  const mese = adesso.toLocaleDateString("it-IT", { month: "long" });
  const nRit = riepilogo.in_ritardo;
  const nAss = riepilogo.assenze_ripetute;
  const nTot = riepilogo.attivi;
  const col = (p: number) => (p >= 70 ? "#4CD07D" : p >= 55 ? "#FFD54A" : "#FF9F43");
  const etCol = (x: RigaStato) => (x.ritardo ? "rgba(255,159,67,.16);color:#FF9F43" : x.ripetute ? "rgba(255,90,95,.16);color:#FF7A7E" : "rgba(76,208,125,.14);color:#4CD07D");
  return schermo(
    <div className="og-pagina">
      <div className="og-dash c3" style={{ gap: 8 }}>
        <div className="g3 og-tutta" style={{ gap: 8 }}>
          <Tile valore={nTot} etichetta={t.attivi} />
          <Tile valore={riepilogo.presenze_mese_perc === null ? "—" : `${riepilogo.presenze_mese_perc}%`} etichetta={t.presenze} colore="#4CD07D" />
          <Tile valore={nRit} etichetta={t.ritardo} colore="#FF9F43" />
        </div>
      </div>
      <input className="og-inp" type="search" aria-label={t.cerca} placeholder={t.cerca} value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips>
        <Chip on={filtro === "tutti"} onClick={() => setFiltro("tutti")}>{sostituisci(t.fTutti, { n: nTot })}</Chip>
        <Chip on={filtro === "ritardo"} onClick={() => setFiltro("ritardo")}>{sostituisci(t.fRitardo, { n: nRit })}</Chip>
        <Chip on={filtro === "assenze"} onClick={() => setFiltro("assenze")}>{sostituisci(t.fAssenze, { n: nAss })}</Chip>
      </Chips>
      <Sezione titolo={t.allievi} azione={<span className="muted">{t.progresso}</span>} />
      {lista.errore ? <Errore messaggio={lista.errore} onRiprova={rinnova} /> : nTot === 0 && lista.righe.length === 0 && filtro === "tutti" && !qDeb.trim() ? <Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="user" /> : (
        <div className="og-dash c2" style={{ gap: 7 }}>
          {lista.righe.map((a) => {
            const x = a;
            const gr = a.gruppi;
            const ma = a.maestri;
            return (
              <button key={a.id} type="button" className="li" style={{ padding: "8px 12px", textAlign: "left", font: "inherit" }} onClick={() => setScheda(a)}>
                <span className="og-av" style={{ background: coloreNome(nomeCompleto(a)) }} aria-hidden="true">{iniziali(a)}</span>
                <span className="grow"><span className="t" style={{ display: "block", fontSize: 14.5 }}>{nomeAllievo(a)}</span>
                  <span className="s og-ell" style={{ display: "block", fontSize: 12 }}>{gr.length ? `${gr.join(", ")}${ma[0] ? ` · ${ma[0]}` : ""}` : t.senzaGruppo}</span></span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  <span className="disp" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: x.perc === null ? "#8E8E93" : col(x.perc) }}>{x.perc === null ? "—" : `${x.perc}%`}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 7, whiteSpace: "nowrap", background: etCol(x).split(";")[0], color: etCol(x).split("color:")[1] }}>
                    {x.ritardo ? t.inRitardo : x.ripetute ? sostituisci(t.assenze, { a: x.assenti, n: x.su }) : x.perc === null ? t.nessunaPres : t.inLinea}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {lista.altri && (
        <button type="button" className="chip" disabled={caricando} style={{ alignSelf: "center", background: "none", color: "#D8F34A" }} onClick={() => void altri()}>{t.mostraAltri}</button>
      )}
      {o.can("iscrizioni") && <Btn onClick={() => setNuovo(true)} icona="plus">{t.aggiungi}</Btn>}
      {nuovo && <FoglioNuovo o={o} d={d} onChiudi={() => setNuovo(false)} onCambiato={rinnova} />}
      {scheda && <FoglioScheda o={o} d={d} a={scheda} onChiudi={() => setScheda(null)} onCambiato={rinnova} />}
    </div>,
    sostituisci(t.sopra, { centro: centro.nome, mese: mese.charAt(0).toUpperCase() + mese.slice(1) }),
  );
}

/** Il colpo del mese: quello del programma più usato dai gruppi visibili (scritto come nel database), altrimenti il dritto. */
function colpoDelMese(d: DatiOrg, gruppiVis: GruppoR[]): string {
  const conta = new Map<string, number>();
  gruppiVis.forEach((g) => {
    const c = meseProgramma(d.programmi.find((p) => p.id === g.programma_id))?.colpo;
    if (c) conta.set(c, (conta.get(c) ?? 0) + 1);
  });
  return [...conta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Dritto";
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

function FoglioNuovo({ o, d, onChiudi, onCambiato }: { o: Org; d: DatiOrg; onChiudi: () => void; onCambiato: () => void }) {
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
      if (i.error) { setErrore(i.error.message); setLavoro(false); await o.carica(); onCambiato(); return; }
    }
    if (gen.nome.trim()) {
      const e = await collegaGenitore(o, id, gen);
      if (e) { setErrore(e); setLavoro(false); await o.carica(); onCambiato(); return; }
    }
    const inv = await creaInvito(o.sb, o.centro.id, { ruolo: "genitore", gruppo_id: gruppoId || null, allievo_id: id, usi_max: 2 });
    await o.registra("allievo_creato", `${nome.trim()} ${cognome.trim()}`, { allievo_id: id, gruppo_id: gruppoId || null });
    await o.carica();
    onCambiato();
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

type FamiliareL = { id: string; relazione: string | null; membri: { id: string; nome: string; cognome: string | null; email: string | null; telefono: string | null } | null };

function FoglioScheda({ o, a, onChiudi, onCambiato }: { o: Org; d: DatiOrg; a: AllievoL; onChiudi: () => void; onCambiato: () => void }) {
  const t = useT(T);
  const d = o.dati as DatiOrg;
  const id = a.id;
  const [cert, setCert] = useState(a.certificato_scade ?? "");
  // la famiglia si legge solo per l'allievo aperto (un genitore non è mai nella lettura generale del centro)
  const [famiglia, setFamiglia] = useState<FamiliareL[] | null>(null);
  const caricaFamiglia = useCallback(async () => {
    const x = await o.sb.from("allievi_famiglie").select("id,relazione,membri(id,nome,cognome,email,telefono)").eq("allievo_id", id);
    if (!x.error) setFamiglia((x.data ?? []) as unknown as FamiliareL[]);
  }, [o.sb, id]);
  useEffect(() => { void caricaFamiglia(); }, [caricaFamiglia]);
  const [nuovoG, setNuovoG] = useState("");
  const [gen, setGen] = useState<Genitore | null>(null);
  const [codice, setCodice] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const gid = [...new Set(o.iscrAttive.filter((i) => i.allievo_id === id).map((i) => i.gruppo_id))];
  const fam = (famiglia ?? []).filter((f) => f.membri).map((f) => ({ f, m: f.membri! }));
  const gruppiLiberi = o.gruppiVis.filter((g) => g.attivo && !gid.includes(g.id) && o.can("iscrizioni", g.area_id));
  const puo = o.can("iscrizioni");

  const iscrivi = async () => {
    const r = await o.sb.from("iscrizioni").insert({ centro_id: o.centro.id, allievo_id: id, gruppo_id: nuovoG, dal: o.oggi });
    if (r.error) { setErrore(r.error.message); return; }
    setNuovoG("");
    await o.registra("iscrizione", nomeCompleto(a), { gruppo_id: nuovoG });
    await o.carica();
    onCambiato();
  };
  const togli = async (gruppoId: string) => {
    const ids = d.iscrizioni.filter((i) => i.allievo_id === id && i.gruppo_id === gruppoId && (!i.al || i.al >= o.oggi)).map((i) => i.id);
    const r = await o.sb.from("iscrizioni").update({ al: o.oggi }).in("id", ids);
    if (r.error) { setErrore(r.error.message); return; }
    await o.registra("iscrizione_chiusa", nomeCompleto(a), { gruppo_id: gruppoId });
    await o.carica();
    onCambiato();
  };
  const salvaCert = async () => {
    const r = await o.sb.from("allievi").update({ certificato_scade: cert || null }).eq("id", id);
    if (r.error) { setErrore(r.error.message); return; }
    setMsg(t.salvato);
    onCambiato();
  };
  const aggiungiGen = async () => {
    if (!gen || !gen.nome.trim()) return;
    const e = await collegaGenitore(o, id, gen);
    if (e) { setErrore(e); return; }
    setGen(null);
    await caricaFamiglia();
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
        {famiglia !== null && fam.length === 0 && <Nota>{t.nessunaFam}</Nota>}
        {fam.map(({ f, m }) => <div key={f.id} className="li" style={{ padding: "8px 12px" }}><span className="grow"><span className="og-t" style={{ display: "block" }}>{nomeCompleto(m)}</span><span className="og-s" style={{ display: "block" }}>{[f.relazione, m.email, m.telefono].filter(Boolean).join(" · ")}</span></span></div>)}
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
