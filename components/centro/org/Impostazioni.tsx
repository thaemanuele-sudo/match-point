"use client";
// C15 · Impostazioni del centro: logo e dati, campi e orari, ruoli e inviti con i codici per gruppo, regole della chat,
// conservazione dei messaggi e consensi. Tutto si salva in centri (colonne e `impostazioni`).
import { useEffect, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Avatar, Btn, Campo, Caricamento, Chip, Chips, Errore, Foglio, Ico, Interruttore, Nota, Seg, Sezione, Tag } from "@/components/centro/ui";
import { nomeApp, urlLogo } from "@/lib/centro/brand";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { COL_INVITO, nomeCompleto, sostituisci, useOrg, type Org } from "./dati";
import { InvitoBox, creaInvito, linkInvito } from "./Invito";
import type { InvitoR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Impostazioni centro", sopra: "{centro} · {citta}", tCentro: "Centro", tRuoli: "Ruoli", tChat: "Chat", tDati: "Dati", sezioni: "Sezioni",
  logoT: "Logo visibile a famiglie e maestri", cambia: "Cambia", caricando: "Carico…", logoErr: "Scegli un'immagine fino a 2 MB.", datiT: "Dati del centro", nome: "Nome del centro", nomeApp: "Nome dell'app (es. TC Brera)", citta: "Città", salva: "Salva", salvato: "Salvato",
  campiT: "Campi e orari", nCampi: "{n} campi", cCampo: "CAMPO", cSup: "SUPERFICIE", cOra: "ORARIO", campoN: "Campo {n}", terra: "Terra rossa", cemento: "Cemento", sintetico: "Sintetico", erba: "Erba", coperto: "coperto", pallone: "pallone",
  orarioCampo: "Orario del campo {n}", gestisci: "Gestisci i campi", apFer: "Apertura lunedì-venerdì", apWe: "Sabato e domenica", chiusure: "Chiusure", salvaOrari: "Salva orari",
  ruoliT: "Ruoli e inviti", nPersone: "{n} persone", maestriT: "{n} maestri", tagMaestro: "Maestro", famCodici: "Le famiglie entrano con il codice del gruppo", codiceAiuto: "Il maestro consegna il codice alle famiglie del suo gruppo.", genera: "Crea codice",
  linkSeg: "Link della segreteria", copia: "Copia", copiato: "Copiato", creaLink: "Crea link", inv: "Invita una persona", invT: "Invita nel centro", invRuolo: "Ruolo", invArea: "Area", invCrea: "Crea codice di invito", invCodice: "Codice di invito",
  r_maestro: "Maestro", r_segreteria: "Segreteria", r_responsabile_area: "Responsabile d'area", r_dt: "Direttore tecnico", r_titolare: "Titolare", staffAiuto: "Vede segnalazioni e osservazioni", sospeso: "sospeso",
  chatT: "Regole chat", tutela: "Tutela dei minori", silenzio: "Orari di silenzio", silenzioS: "Nessun messaggio ai minori dopo le {da}", silDa: "Dalle", silA: "Alle", maestroAllievo: "Maestro e allievo", maestroAllievoS: "Visibile ai genitori", sempre: "Sempre attiva", sempreM: "Sempre attivo",
  maestroFam: "Maestro e famiglia", maestroFamS: "Messaggi diretti con i genitori", allieviTra: "Allievi tra loro", allieviTraS: "Nessuna chat tra allievi", disattivata: "Disattivata", nonCanc: "Messaggi non cancellabili", nonCancS: "Restano archiviati per la tutela",
  genFino: "Genitori vedono la chat fino a", anni: "{n} anni", ragazzoDa: "Account personale del ragazzo da", assenzaT: "Avviso di assenza fino a", ore: "{n} ore prima",
  notaChat: "La chat ragazzo-maestro è visibile ai genitori fino a 18 anni. Non esistono chat nascoste tra adulti e minori.",
  datiT2: "Conservazione messaggi", m12: "12 mesi", m24: "2 anni", m36: "3 anni", m60: "5 anni", notaCons: "I messaggi non si possono cancellare: dopo questo periodo vengono archiviati.",
  consT: "Consensi delle famiglie", profili: "{n} profili", cPrivacy: "Privacy e dati", cFoto: "Foto e video", cAi: "Analisi AI dei video", cCert: "Certificato medico", di: "{n} di {t}", chiedi: "Chiedi i consensi mancanti",
};
const T = { it: IT, en: { ...IT } };
type Imp = Record<string, unknown>;
/** Numeri della scheda "Dati": solo conteggi dal database, nessuna riga di allievi o consensi scaricata. */
type NumeriDati = { tot: number; privacy: number; foto_video: number; ai: number; cert: number };
const num = (v: unknown, d: number) => (typeof v === "number" ? v : d);
const txt = (v: unknown) => (typeof v === "string" ? v : "");

export default function CentroImpostazioni() {
  const t = useT(T);
  const o = useOrg();
  const { centro, sb, dati: d } = o;
  const { ricarica } = useCentro();
  const r = rotta(centro.slug);
  const [tab, setTab] = useState<"centro" | "ruoli" | "chat" | "dati">("centro");
  const [numeri, setNumeri] = useState<NumeriDati | null>(null);
  const [inviti, setInviti] = useState<InvitoR[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    // le sole righe che servono: i codici dei genitori validi (non quelli personali di ogni allievo, che sono migliaia)
    sb.from("inviti").select(COL_INVITO).eq("centro_id", centro.id).eq("ruolo", "genitore").is("allievo_id", null)
      .or(`scade_il.is.null,scade_il.gt.${new Date().toISOString()}`).order("created_at", { ascending: false }).limit(200)
      .then(({ data }: { data: unknown }) => setInviti((data ?? []) as InvitoR[]));
  }, [sb, centro.id, rev]);

  // consensi e certificati: li conta il database (`consensi_riepilogo`), solo quando si apre la scheda "Dati"
  useEffect(() => {
    if (tab !== "dati") return;
    let vivo = true;
    void sb.rpc("consensi_riepilogo", { p_centro: centro.id }).then((x: { data: unknown; error: { message: string } | null }) => {
      if (!vivo) return;
      if (x.error) { setErrore(x.error.message); return; }
      const c = x.data as { allievi: number; privacy: number; foto_video: number; ai: number; certificati_validi: number };
      setNumeri({ tot: Number(c.allievi), privacy: Number(c.privacy), foto_video: Number(c.foto_video), ai: Number(c.ai), cert: Number(c.certificati_validi) });
    });
    return () => { vivo = false; };
  }, [sb, centro.id, tab]);

  const schermo = (corpo: React.ReactNode) => (
    <SchermoCentro ruolo="dt" tab="impostazioni" titolo={t.titolo} sopra={sostituisci(t.sopra, { centro: centro.nome, citta: centro.citta ?? "" }).replace(/ · $/, "")} indietro={r.dt.base}>{corpo}</SchermoCentro>
  );
  if (!d) return schermo(o.errore ? <Errore messaggio={o.errore} onRiprova={() => void o.carica()} /> : <Caricamento />);
  const imp = (centro.impostazioni ?? {}) as Imp;
  const puo = o.isDT;

  return schermo(
    <div className="og-pagina">
      <Seg ariaLabel={t.sezioni} valore={tab} onChange={setTab} valori={[{ id: "centro", etichetta: t.tCentro }, { id: "ruoli", etichetta: t.tRuoli }, { id: "chat", etichetta: t.tChat }, { id: "dati", etichetta: t.tDati }]} />
      {errore && <Errore messaggio={errore} />}
      {tab === "centro" && <TabCentro o={o} imp={imp} puo={puo} setErrore={setErrore} ricarica={ricarica} />}
      {tab === "ruoli" && <TabRuoli o={o} inviti={inviti} puo={puo} setErrore={setErrore} rinnova={() => setRev((x) => x + 1)} />}
      {tab === "chat" && <TabChat imp={imp} puo={puo} salva={(p) => salvaImp(o, ricarica, p, setErrore)} />}
      {tab === "dati" && <TabDati o={o} imp={imp} numeri={numeri} puo={puo} salva={(p) => salvaImp(o, ricarica, p, setErrore)} />}
    </div>,
  );
}

/** Aggiorna solo le chiavi toccate di centri.impostazioni: le altre (anche di altre aree) restano come sono. */
async function salvaImp(o: Org, ricarica: () => Promise<void>, patch: Imp, setErrore: (e: string | null) => void) {
  const { centro, sb } = o;
  setErrore(null);
  const r = await sb.from("centri").update({ impostazioni: { ...(centro.impostazioni ?? {}), ...patch } }).eq("id", centro.id);
  if (r.error) { setErrore(r.error.message); return; }
  await o.registra("impostazioni", centro.nome, patch);
  await ricarica();
}

function TabCentro({ o, imp, puo, setErrore, ricarica }: { o: Org; imp: Imp; puo: boolean; setErrore: (e: string | null) => void; ricarica: () => Promise<void> }) {
  const t = useT(T);
  const { centro, sb, dati: d } = o;
  const r = rotta(centro.slug);
  const [nome, setNome] = useState(centro.nome);
  const [app, setApp] = useState(centro.nome_app ?? "");
  const [citta, setCitta] = useState(centro.citta ?? "");
  const [fer, setFer] = useState(txt(imp.apertura_feriali));
  const [we, setWe] = useState(txt(imp.apertura_weekend));
  const [chiu, setChiu] = useState(txt(imp.chiusure));
  const [orari, setOrari] = useState<Record<string, string>>((imp.orari_campi as Record<string, string> | undefined) ?? {});
  const [msg, setMsg] = useState("");
  const [logoLav, setLogoLav] = useState(false);
  const logo = urlLogo(centro.logo_path);
  const campi = d?.campi ?? [];

  const salvaDati = async () => {
    const x = await sb.from("centri").update({ nome: nome.trim() || centro.nome, nome_app: app.trim() || null, citta: citta.trim() || null }).eq("id", centro.id);
    if (x.error) { setErrore(x.error.message); return; }
    await o.registra("centro_modificato", nome, { nome_app: app, citta });
    await ricarica(); setMsg("dati");
  };
  const salvaOrari = async () => {
    await salvaImp(o, ricarica, { apertura_feriali: fer, apertura_weekend: we, chiusure: chiu, orari_campi: orari }, setErrore);
    setMsg("orari");
  };
  const caricaLogo = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 2 * 1024 * 1024) { setErrore(t.logoErr); return; }
    setLogoLav(true); setErrore(null);
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const percorso = `${centro.id}/logo-${Date.now()}.${ext}`;
    const up = await sb.storage.from("centri-pubblico").upload(percorso, f, { contentType: f.type, upsert: true });
    if (up.error) { setErrore(up.error.message); setLogoLav(false); return; }
    const x = await sb.from("centri").update({ logo_path: percorso }).eq("id", centro.id);
    if (x.error) setErrore(x.error.message); else { await o.registra("logo_cambiato", centro.nome, { percorso }); await ricarica(); }
    setLogoLav(false);
  };

  return (
    <div className="og-dash c2">
      <div className="og-colonna">
        <div className="card og-card" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="" width={56} height={56} style={{ borderRadius: 16, objectFit: "cover" }} /> :
            <span className="disp" style={{ width: 56, height: 56, borderRadius: 16, background: "var(--brand,#D8F34A)", color: "var(--brand-ink,#0B0B0C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, fontStyle: "italic", flex: "none" }}>{nomeApp(centro).slice(0, 3).toUpperCase()}</span>}
          <span className="grow"><span className="og-t" style={{ display: "block" }}>{centro.nome}</span><span className="og-s" style={{ display: "block" }}>{t.logoT}</span></span>
          {puo && <label className="btn2" style={{ flex: "none", height: 36, padding: "0 14px", fontSize: 13, cursor: "pointer" }}>{logoLav ? t.caricando : t.cambia}<input type="file" accept="image/*" hidden disabled={logoLav} onChange={(e) => void caricaLogo(e.target.files?.[0])} /></label>}
        </div>
        <div className="card og-card">
          <div className="og-k">{t.datiT}</div>
          <Campo etichetta={t.nome} valore={nome} onChange={setNome} disabled={!puo} />
          <Campo etichetta={t.nomeApp} valore={app} onChange={setApp} disabled={!puo} />
          <Campo etichetta={t.citta} valore={citta} onChange={setCitta} disabled={!puo} />
          {puo && <Btn variante="secondario" onClick={() => void salvaDati()}>{msg === "dati" ? t.salvato : t.salva}</Btn>}
        </div>
      </div>
      <div className="og-colonna">
        <Sezione titolo={t.campiT} azione={<span className="muted">{sostituisci(t.nCampi, { n: campi.length })}</span>} />
        <div className="tbl">
          <div className="og-tr og-th" style={{ gridTemplateColumns: "64px 1fr 110px" }}><span>{t.cCampo}</span><span>{t.cSup}</span><span>{t.cOra}</span></div>
          {campi.map((c) => (
            <div key={c.id} className="og-tr" style={{ gridTemplateColumns: "64px 1fr 110px" }}>
              <b>{sostituisci(t.campoN, { n: c.numero })}</b>
              <span className="muted">{t[c.superficie as "terra"]}{c.copertura !== "scoperto" ? ` ${t[c.copertura as "coperto"]}` : ""}</span>
              <input className="og-inp" style={{ height: 34, borderRadius: 10, fontSize: 13, padding: "0 8px" }} aria-label={sostituisci(t.orarioCampo, { n: c.numero })} placeholder={fer} disabled={!puo} value={orari[c.id] ?? ""} onChange={(e) => setOrari({ ...orari, [c.id]: e.target.value })} />
            </div>
          ))}
        </div>
        <Campo etichetta={t.apFer} valore={fer} onChange={setFer} disabled={!puo} />
        <Campo etichetta={t.apWe} valore={we} onChange={setWe} disabled={!puo} />
        <Campo etichetta={t.chiusure} valore={chiu} onChange={setChiu} disabled={!puo} />
        <div className="og-riga">
          <Btn variante="secondario" href={r.dt.campi} className="grow">{t.gestisci}</Btn>
          {puo && <Btn onClick={() => void salvaOrari()} className="grow">{msg === "orari" ? t.salvato : t.salvaOrari}</Btn>}
        </div>
      </div>
    </div>
  );
}


function TabRuoli({ o, inviti, puo, setErrore, rinnova }: { o: Org; inviti: InvitoR[]; puo: boolean; setErrore: (e: string | null) => void; rinnova: () => void }) {
  const t = useT(T);
  const { centro, sb, dati: d } = o;
  const [foglio, setFoglio] = useState(false);
  const [copiato, setCopiato] = useState(false);
  if (!d) return null;
  const valido = (i: InvitoR) => (!i.scade_il || i.scade_il > new Date().toISOString()) && (i.usi_max == null || (i.usi ?? 0) < i.usi_max);
  const perGruppo = (id: string) => inviti.find((i) => i.ruolo === "genitore" && i.gruppo_id === id && !i.allievo_id && valido(i));
  const segreteria = inviti.find((i) => i.ruolo === "genitore" && !i.gruppo_id && !i.allievo_id && !i.area_id && valido(i));
  const crea = async (v: { gruppo_id?: string | null }) => {
    const x = await creaInvito(sb, centro.id, { ruolo: "genitore", gruppo_id: v.gruppo_id ?? null, usi_max: 200 });
    if (x.errore) setErrore(x.errore); else rinnova();
  };
  const gruppi = o.gruppiVis.filter((g) => g.attivo);
  const staff = d.membri.filter((m) => ["titolare", "dt", "segreteria"].includes(m.ruolo));
  const maestri = d.membri.filter((m) => m.ruolo === "maestro");
  const copiaLink = async () => {
    if (!segreteria) return;
    try { await navigator.clipboard.writeText(linkInvito(segreteria.codice)); setCopiato(true); setTimeout(() => setCopiato(false), 1800); } catch { /* appunti non disponibili */ }
  };
  const nPers = staff.length + maestri.length + d.membri.filter((m) => m.ruolo === "responsabile_area").length;
  return (
    <div className="og-dash c2">
      <div className="og-colonna">
        <Sezione titolo={t.ruoliT} azione={<span className="muted">{sostituisci(t.nPersone, { n: nPers })}</span>} />
        {staff.map((m) => (
          <div key={m.id} className="li" style={{ padding: "9px 12px" }}>
            <Avatar nome={m.nome} cognome={m.cognome} size={38} />
            <span className="grow"><span className="t" style={{ display: "block", fontSize: 14.5 }}>{nomeCompleto(m)}</span><span className="s" style={{ display: "block" }}>{m.stato === "sospeso" ? t.sospeso : t.staffAiuto}</span></span>
            <Tag colore="#D8F34A" sfondo="rgba(216,243,74,.16)">{t[`r_${m.ruolo}` as "r_dt"]}</Tag>
          </div>
        ))}
        <div className="li" style={{ padding: "9px 12px" }}>
          <span className="ic" style={{ borderRadius: "50%" }}><Ico nome="users" size={18} /></span>
          <span className="grow"><span className="t" style={{ display: "block", fontSize: 14.5 }}>{sostituisci(t.maestriT, { n: maestri.length })}</span><span className="s og-ell" style={{ display: "block" }}>{maestri.map((m) => m.nome).join(", ")}</span></span>
          <Tag>{t.tagMaestro}</Tag>
        </div>
        {puo && <Btn variante="secondario" icona="plus" onClick={() => setFoglio(true)}>{t.inv}</Btn>}
      </div>
      <div className="og-colonna">
        <div className="og-k">{t.famCodici}</div>
        <div className="g2">
          {gruppi.map((g) => {
            const i = perGruppo(g.id);
            return (
              <div key={g.id} className="tile" style={{ padding: "8px 12px" }}>
                <span style={{ display: "block" }}>{g.nome}</span>
                {i ? <span className="code" style={{ marginTop: 4 }}>{i.codice}</span> : puo ? <button type="button" className="og-chipbtn" style={{ marginTop: 4 }} onClick={() => void crea({ gruppo_id: g.id })}>{t.genera}</button> : null}
              </div>
            );
          })}
        </div>
        <Nota>{t.codiceAiuto}</Nota>
        <div className="card og-card" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <span className="grow"><span className="og-k" style={{ display: "block" }}>{t.linkSeg}</span>
            <span className="og-ell" style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>{segreteria ? linkInvito(segreteria.codice) : "—"}</span></span>
          {segreteria ? <Btn variante="secondario" piccolo pieno={false} onClick={() => void copiaLink()}>{copiato ? t.copiato : t.copia}</Btn>
            : puo ? <Btn variante="secondario" piccolo pieno={false} onClick={() => void crea({})}>{t.creaLink}</Btn> : null}
        </div>
      </div>
      {foglio && <FoglioInvitaPersona o={o} onChiudi={() => setFoglio(false)} setErrore={setErrore} />}
    </div>
  );
}

function FoglioInvitaPersona({ o, onChiudi, setErrore }: { o: Org; onChiudi: () => void; setErrore: (e: string | null) => void }) {
  const t = useT(T);
  const [ruolo, setRuolo] = useState<"maestro" | "segreteria" | "responsabile_area" | "dt">("maestro");
  const [area, setArea] = useState(o.dati?.aree[0]?.id ?? "");
  const [codice, setCodice] = useState<string | null>(null);
  const crea = async () => {
    const x = await creaInvito(o.sb, o.centro.id, { ruolo, area_id: ruolo === "responsabile_area" ? area : null });
    if (x.errore) setErrore(x.errore); else { setCodice(x.invito?.codice ?? null); await o.registra("invito", ruolo, { ruolo }); }
  };
  return (
    <Foglio aperto onChiudi={onChiudi} titolo={t.invT}>
      <div className="og-form">
        <div><div className="k" style={{ marginBottom: 4 }}>{t.invRuolo}</div>
          <Chips>{(["maestro", "segreteria", "responsabile_area", "dt"] as const).map((r) => <Chip key={r} on={r === ruolo} onClick={() => setRuolo(r)}>{t[`r_${r}` as "r_dt"]}</Chip>)}</Chips></div>
        {ruolo === "responsabile_area" && <Campo etichetta={t.invArea} valore={area} onChange={setArea} opzioni={(o.dati?.aree ?? []).map((a) => ({ valore: a.id, etichetta: a.nome }))} />}
        {codice ? <InvitoBox codice={codice} titolo={t.invCodice} /> : <Btn icona="share" onClick={() => void crea()}>{t.invCrea}</Btn>}
      </div>
    </Foglio>
  );
}

function TabChat({ imp, puo, salva }: { imp: Imp; puo: boolean; salva: (p: Imp) => Promise<void> }) {
  const t = useT(T);
  const sil = imp.silenzio_attivo !== false;
  const fam = imp.chat_famiglie !== false;
  const da = txt(imp.silenzio_da) || "21:00", a = txt(imp.silenzio_a) || "08:00";
  const fisse = (titolo: string, sotto: string, tag: string) => (
    <div className="li" style={{ padding: "9px 12px" }}><span className="grow"><span className="t" style={{ display: "block", fontSize: 14 }}>{titolo}</span><span className="s" style={{ display: "block" }}>{sotto}</span></span><Tag>{tag}</Tag></div>
  );
  const scelta = (k: string, valori: number[], def: number, fmt: string) => (
    <Chips>{valori.map((v) => <Chip key={v} on={num(imp[k], def) === v} onClick={() => puo && void salva({ [k]: v })}>{sostituisci(fmt, { n: v })}</Chip>)}</Chips>
  );
  return (
    <div className="og-dash c2">
      <div className="og-colonna">
        <Sezione titolo={t.chatT} azione={<span className="muted">{t.tutela}</span>} />
        <div className="card og-card"><Interruttore valore={sil} disabled={!puo} onChange={(v) => void salva({ silenzio_attivo: v })} etichetta={t.silenzio} descrizione={sostituisci(t.silenzioS, { da })} />
          <div className="og-dash c2" style={{ gap: 10 }}><Campo etichetta={t.silDa} tipo="time" valore={da} disabled={!puo || !sil} onChange={(v) => void salva({ silenzio_da: v })} /><Campo etichetta={t.silA} tipo="time" valore={a} disabled={!puo || !sil} onChange={(v) => void salva({ silenzio_a: v })} /></div></div>
        {fisse(t.maestroAllievo, t.maestroAllievoS, t.sempre)}
        <div className="card og-card"><Interruttore valore={fam} disabled={!puo} onChange={(v) => void salva({ chat_famiglie: v })} etichetta={t.maestroFam} descrizione={t.maestroFamS} /></div>
        {fisse(t.allieviTra, t.allieviTraS, t.disattivata)}
        {fisse(t.nonCanc, t.nonCancS, t.sempreM)}
        <Nota>{t.notaChat}</Nota>
      </div>
      <div className="og-colonna">
        <div className="og-k">{t.genFino}</div>{scelta("chat_genitori_fino", [16, 18], 18, t.anni)}
        <div className="og-k">{t.ragazzoDa}</div>{scelta("account_ragazzo_da", [13, 14, 16], 14, t.anni)}
        <div className="og-k">{t.assenzaT}</div>{scelta("assenza_entro_ore", [1, 2, 3], 2, t.ore)}
      </div>
    </div>
  );
}

function TabDati({ o, imp, numeri, puo, salva }: { o: Org; imp: Imp; numeri: NumeriDati | null; puo: boolean; salva: (p: Imp) => Promise<void> }) {
  const t = useT(T);
  const r = rotta(o.centro.slug);
  if (!numeri) return <Caricamento />;
  const tot = numeri.tot;
  const mesi = num(imp.conservazione_mesi, 24);
  const righe = [[t.cPrivacy, numeri.privacy], [t.cFoto, numeri.foto_video], [t.cAi, numeri.ai], [t.cCert, numeri.cert]] as [string, number][];
  const opz: [number, string][] = [[12, t.m12], [24, t.m24], [36, t.m36], [60, t.m60]];
  return (
    <div className="og-dash c2">
      <div className="og-colonna">
        <Sezione titolo={t.datiT2} />
        <Chips>{opz.map(([m, l]) => <Chip key={m} on={mesi === m} onClick={() => puo && void salva({ conservazione_mesi: m })}>{l}</Chip>)}</Chips>
        <Nota>{t.notaCons}</Nota>
      </div>
      <div className="og-colonna">
        <Sezione titolo={t.consT} azione={<span className="muted">{sostituisci(t.profili, { n: tot })}</span>} />
        {righe.map(([l, n]) => (
          <div key={l} className="card og-card" style={{ padding: "9px 12px", gap: 6 }}>
            <div className="og-riga" style={{ justifyContent: "space-between", flexWrap: "nowrap", fontSize: 13.5 }}><b>{l}</b><b>{sostituisci(t.di, { n, t: tot })}</b></div>
            <div className="bar"><i style={{ width: `${tot ? Math.round((n / tot) * 100) : 0}%`, background: tot && n / tot >= 0.9 ? "#4CD07D" : "#D8F34A" }} /></div>
          </div>
        ))}
        <Btn variante="secondario" href={r.dt.avvisi}>{t.chiedi}</Btn>
      </div>
    </div>
  );
}
