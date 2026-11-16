"use client";
// C12 · Formazione maestri (/c/[slug]/dt/formazione). Corsi del Metodo, stato di ogni maestro, certificazione,
// assegnazione di un corso (esistente o nuovo) e promemoria dei corsi obbligatori.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { fmtGiornoMese } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "../../Schermo";
import {
  COL, coloreAvatar, corsoCompletato, iniziali, nomeCompleto, rimpiazza, tipoCorso,
  type CorsoB, type FormazioneB, type MembroB, type TipoCorso,
} from "./util";
import { leggiPagine } from "./dati";
import "./b.css";

const it = {
  kick: "{centro} · Corsi del Metodo", titolo: "Formazione maestri",
  conBase: "con il Metodo base", corsiMetodo: "corsi del Metodo", completati: "corsi completati", obbligoMancante: "obblighi mancanti",
  vista: "Vista", corsi: "Corsi", maestri: "Maestri",
  tCertificazione: "Certificazione", tObbligatorio: "Obbligatorio", tFacoltativo: "Facoltativo", moduli: "{n} moduli", nessunModulo: "moduli da definire",
  fattiDi: "{a} di {b}", assegna: "Assegna un corso", ricordaA: "Ricorda il corso a {nome}", ricordaN: "Ricorda i corsi obbligatori a {n} maestri", ricordato: "Promemoria inviato a {n}.",
  certificato: "Certificato: {corso}", inCertificazione: "Certificazione in corso", corsiDi: "{a} di {b} corsi", daCompletare: "Da completare: {corso}", entro: " (entro il {d})", prossimo: "Prossimo corso: {corso}", percorsoCompleto: "Percorso completato",
  vuotoCorsi: "Nessun corso del Metodo creato. Con \"Assegna un corso\" puoi crearne uno nuovo.", vuotoMaestri: "Nessun maestro attivo nel centro.",
  // pannello
  fTitolo: "Assegna un corso", fCorso: "CORSO", fNuovo: "Nuovo corso", fNome: "Titolo del corso", fModuli: "Numero di moduli", fObbl: "Corso obbligatorio",
  fMaestri: "MAESTRI", fScadenza: "SCADENZA (FACOLTATIVA)", fAnnulla: "Annulla", fConferma: "Assegna", fSalvo: "Assegno…",
  fServe: "Scegli un corso (o scrivi il titolo di uno nuovo) e almeno un maestro.", fFatto: "Corso assegnato a {n}.", fGia: "{n} lo avevano già.", fGiaTag: "già assegnato", chiudi: "Chiudi",
  notificaTitolo: "Nuovo corso assegnato", notificaTesto: "Il direttore tecnico ti ha assegnato: {corso}.", promTitolo: "Promemoria corso obbligatorio", promTesto: "Completa il corso obbligatorio: {corso}.",
  caricamento: "Carico la formazione…", errore: "Errore: {e}", riprova: "Riprova",
};
const T = { it, en: { ...it } };

const tagTipo: Record<TipoCorso, string> = {
  certificazione: "background:color-mix(in srgb, var(--brand,#D8F34A) 16%, transparent);color:var(--brand,#D8F34A)",
  obbligatorio: "background:rgba(255,159,67,.16);color:#FF9F43",
  facoltativo: "background:#232326;color:#E5E5EA",
};
const css = (s: string) => Object.fromEntries(s.split(";").filter(Boolean).map((x) => x.split(":") as [string, string]));

export default function BFormazione() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const R = rotta(centro.slug);
  const [maestri, setMaestri] = useState<MembroB[]>([]);
  const [corsi, setCorsi] = useState<CorsoB[]>([]);
  const [forma, setForma] = useState<FormazioneB[]>([]);
  const [carica, setCarica] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [vista, setVista] = useState<"corsi" | "maestri">("corsi");
  const [aperto, setAperto] = useState(false);

  const leggi = useCallback(async () => {
    const errori: string[] = [];
    const [m, c, f] = await Promise.all([
      sb.from("membri").select("id,nome,cognome,ruolo,stato").eq("centro_id", centro.id).eq("ruolo", "maestro").eq("stato", "attivo").order("nome"),
      sb.from("corsi_formazione").select("id,titolo,obbligatorio,moduli").eq("centro_id", centro.id).order("created_at", { ascending: true }),
      // corsi per maestri: può superare le 1000 righe che PostgREST restituisce in una volta
      leggiPagine((x, y) => sb.from("formazione").select("id,corso_id,membro_id,moduli_fatti,certificato_il,scadenza").eq("centro_id", centro.id).order("id").range(x, y), errori, "formazione"),
    ]);
    const e = m.error?.message ?? c.error?.message ?? errori[0];
    if (e) { setErr(e); } else { setErr(""); }
    setMaestri((m.data as MembroB[]) ?? []);
    setCorsi((c.data as CorsoB[]) ?? []);
    setForma(f as FormazioneB[]);
    setCarica(false);
  }, [sb, centro.id]);
  useEffect(() => { void leggi(); }, [leggi]);

  // indice corso+maestro: i controlli sono corsi × maestri × (ogni render), con `find` su tutta la lista diventano migliaia di giri
  const indice = useMemo(() => {
    const mp = new Map<string, FormazioneB>();
    for (const x of forma) if (!mp.has(`${x.corso_id}|${x.membro_id}`)) mp.set(`${x.corso_id}|${x.membro_id}`, x);
    return mp;
  }, [forma]);
  const fDi = useCallback((corso: string, membro: string) => indice.get(`${corso}|${membro}`), [indice]);
  const fatto = useCallback((c: CorsoB, m: MembroB) => corsoCompletato(c, fDi(c.id, m.id)), [fDi]);

  const riepilogo = useMemo(() => {
    const coppie = corsi.length * maestri.length;
    const ok = corsi.reduce((s, c) => s + maestri.filter((m) => fatto(c, m)).length, 0);
    const cert = corsi.find((c) => tipoCorso(c) === "certificazione");
    const conBase = cert ? maestri.filter((m) => fatto(cert, m)).length : null;
    const obblighi = corsi.filter((c) => c.obbligatorio).reduce((s, c) => s + maestri.filter((m) => !fatto(c, m)).length, 0);
    return { perc: coppie ? Math.round((ok / coppie) * 100) : 0, conBase, obblighi, cert };
  }, [corsi, maestri, fatto]);

  // maestri con almeno un corso obbligatorio non completato (con il primo di questi corsi)
  const inRitardo = useMemo(
    () => maestri.map((m) => ({ m, corso: corsi.find((c) => c.obbligatorio && !fatto(c, m)) })).filter((x): x is { m: MembroB; corso: CorsoB } => !!x.corso),
    [maestri, corsi, fatto],
  );

  async function ricorda() {
    setMsg("");
    const righe = inRitardo.map(({ m, corso }) => ({
      centro_id: centro.id, membro_id: m.id, tipo: "sistema", titolo: t.promTitolo, testo: rimpiazza(t.promTesto, { corso: corso.titolo }), link: R.maestro.formazione,
    }));
    const r = await sb.from("notifiche").insert(righe);
    setMsg(r.error ? rimpiazza(t.errore, { e: r.error.message }) : rimpiazza(t.ricordato, { n: righe.length }));
  }

  const nomeInRitardo = inRitardo.length === 1 ? rimpiazza(t.ricordaA, { nome: nomeCompleto(inRitardo[0].m) }) : rimpiazza(t.ricordaN, { n: inRitardo.length });

  return (
    <SchermoCentro ruolo="dt" tab="maestri" titolo={t.titolo} sopra={rimpiazza(t.kick, { centro: centro.nome })} indietro={R.dt.maestri}>
      {carica ? <div className="note" role="status">{t.caricamento}</div> : null}
      {err ? <div className="note" role="alert">{rimpiazza(t.errore, { e: err })} <button className="chip" onClick={() => void leggi()}>{t.riprova}</button></div> : null}
      {!carica ? (
        <>
          <div className="g3">
            <div className="tile"><b>{riepilogo.conBase == null ? corsi.length : `${riepilogo.conBase}/${maestri.length}`}</b><span>{riepilogo.conBase == null ? t.corsiMetodo : t.conBase}</span></div>
            <div className="tile"><b style={{ color: COL.verde }}>{riepilogo.perc}%</b><span>{t.completati}</span></div>
            <div className="tile"><b style={{ color: riepilogo.obblighi ? COL.arancio : COL.verde }}>{riepilogo.obblighi}</b><span>{t.obbligoMancante}</span></div>
          </div>
          <div className="seg" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }} role="group" aria-label={t.vista}>
            {(["corsi", "maestri"] as const).map((v) => <button key={v} className={v === vista ? "sg on" : "sg"} aria-pressed={v === vista} onClick={() => setVista(v)}>{t[v]}</button>)}
          </div>

          {vista === "corsi" ? (
            <>
              {!corsi.length ? <div className="note">{t.vuotoCorsi}</div> : null}
              <div className="b-lista">
                {corsi.map((c) => {
                  const tipo = tipoCorso(c);
                  const n = maestri.filter((m) => fatto(c, m)).length;
                  const pieno = maestri.length > 0 && n === maestri.length;
                  return (
                    <div key={c.id} className="li" style={{ padding: "10px 12px" }}>
                      <span className="grow">
                        <span className="t" style={{ display: "block", fontSize: 14.5 }}>{c.titolo}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 7, whiteSpace: "nowrap", ...css(tagTipo[tipo]) }}>{{ certificazione: t.tCertificazione, obbligatorio: t.tObbligatorio, facoltativo: t.tFacoltativo }[tipo]}</span>
                          <span style={{ fontSize: 12, color: COL.muto }}>{c.moduli ? rimpiazza(t.moduli, { n: c.moduli }) : t.nessunModulo}</span>
                        </span>
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, width: 78 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800 }}>{rimpiazza(t.fattiDi, { a: n, b: maestri.length })}</span>
                        <span className="bar" style={{ width: 78 }}><i style={{ width: `${maestri.length ? (n / maestri.length) * 100 : 0}%`, background: pieno ? COL.verde : COL.palla }} /></span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <button className="btn" onClick={() => { setMsg(""); setAperto(true); }}>{t.assegna}</button>
            </>
          ) : (
            <>
              {!maestri.length ? <div className="note">{t.vuotoMaestri}</div> : null}
              <div className="b-lista">
                {maestri.map((m) => {
                  const fatti = corsi.filter((c) => fatto(c, m)).length;
                  const prossimo = corsi.find((c) => !fatto(c, m));
                  const oblig = !!prossimo?.obbligatorio;
                  const sc = prossimo ? fDi(prossimo.id, m.id)?.scadenza : null;
                  const cert = riepilogo.cert;
                  return (
                    <div key={m.id} className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flex: "none", background: coloreAvatar(m.id) }}>{iniziali(m)}</span>
                        <span className="grow">
                          <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{nomeCompleto(m)}</span>
                          <span style={{ display: "block", fontSize: 12, color: COL.muto, marginTop: 1 }}>{cert && fatto(cert, m) ? rimpiazza(t.certificato, { corso: cert.titolo }) : t.inCertificazione}</span>
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 800 }}>{rimpiazza(t.corsiDi, { a: fatti, b: corsi.length })}</span>
                      </div>
                      <div className="bar"><i style={{ width: `${corsi.length ? (fatti / corsi.length) * 100 : 0}%`, background: oblig ? COL.arancio : COL.palla }} /></div>
                      <div style={{ fontSize: 12, fontWeight: oblig ? 800 : 600, color: oblig ? COL.arancio : COL.muto }}>
                        {prossimo
                          ? oblig ? rimpiazza(t.daCompletare, { corso: prossimo.titolo }) + (sc ? rimpiazza(t.entro, { d: fmtGiornoMese(sc) }) : "") : rimpiazza(t.prossimo, { corso: prossimo.titolo })
                          : t.percorsoCompleto}
                      </div>
                    </div>
                  );
                })}
              </div>
              {inRitardo.length ? <button className="btn2" style={{ flex: "none" }} onClick={ricorda}>{nomeInRitardo}</button> : null}
            </>
          )}
          {msg ? <div className="note" role="status">{msg}</div> : null}
        </>
      ) : null}

      {aperto ? <FoglioAssegna corsi={corsi} maestri={maestri} forma={forma} onChiudi={() => setAperto(false)} onFatto={(m) => { setAperto(false); setMsg(m); void leggi(); }} /> : null}
    </SchermoCentro>
  );
}

/** Pannello dal basso: sceglie (o crea) il corso, i maestri e la scadenza, poi scrive in `formazione` e avvisa i maestri. */
function FoglioAssegna({ corsi, maestri, forma, onChiudi, onFatto }: { corsi: CorsoB[]; maestri: MembroB[]; forma: FormazioneB[]; onChiudi: () => void; onFatto: (m: string) => void }) {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const R = rotta(centro.slug);
  const [corso, setCorso] = useState<string>(corsi[0]?.id ?? "nuovo");
  const [titolo, setTitolo] = useState("");
  const [moduli, setModuli] = useState("3");
  const [obbl, setObbl] = useState(false);
  const [scelti, setScelti] = useState<string[]>([]);
  const [scadenza, setScadenza] = useState("");
  const [lavoro, setLavoro] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onChiudi(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onChiudi]);

  const giaAssegnati = useMemo(() => new Set(forma.map((f) => `${f.corso_id}|${f.membro_id}`)), [forma]);
  const valido = scelti.length > 0 && (corso !== "nuovo" || titolo.trim().length > 1);

  async function conferma() {
    if (!valido) { setErr(t.fServe); return; }
    setLavoro(true);
    setErr("");
    let corsoId = corso;
    let nomeCorso = corsi.find((c) => c.id === corso)?.titolo ?? "";
    if (corso === "nuovo") {
      const n = Math.max(1, Math.min(50, parseInt(moduli, 10) || 1));
      const r = await sb.from("corsi_formazione").insert({ centro_id: centro.id, titolo: titolo.trim(), obbligatorio: obbl, moduli: n }).select("id").single();
      if (r.error || !r.data) { setErr(rimpiazza(t.errore, { e: r.error?.message ?? "" })); setLavoro(false); return; }
      corsoId = r.data.id as string;
      nomeCorso = titolo.trim();
    }
    const nuove: Record<string, unknown>[] = [];
    let gia = 0;
    const giaIds: string[] = [];
    for (const mid of scelti) {
      const ex = forma.find((f) => f.corso_id === corsoId && f.membro_id === mid);
      if (ex) {
        gia++;
        giaIds.push(ex.id);
      } else nuove.push({ centro_id: centro.id, corso_id: corsoId, membro_id: mid, moduli_fatti: 0, scadenza: scadenza || null });
    }
    // una sola richiesta per tutti i maestri che avevano già il corso (prima era una per maestro)
    if (scadenza && giaIds.length) await sb.from("formazione").update({ scadenza }).in("id", giaIds);
    if (nuove.length) {
      const r = await sb.from("formazione").insert(nuove);
      if (r.error) { setErr(rimpiazza(t.errore, { e: r.error.message })); setLavoro(false); return; }
      await sb.from("notifiche").insert(nuove.map((n) => ({
        centro_id: centro.id, membro_id: n.membro_id, tipo: "sistema", titolo: t.notificaTitolo, testo: rimpiazza(t.notificaTesto, { corso: nomeCorso }), link: R.maestro.formazione,
      })));
    }
    onFatto(rimpiazza(t.fFatto, { n: nuove.length }) + (gia ? " " + rimpiazza(t.fGia, { n: gia }) : ""));
  }

  return (
    <div className="b-velo" onClick={onChiudi}>
      <div className="b-foglio" role="dialog" aria-modal="true" aria-label={t.fTitolo} onClick={(e) => e.stopPropagation()}>
        <div className="sec"><h2>{t.fTitolo}</h2><button className="chip" onClick={onChiudi}>{t.chiudi}</button></div>

        <div className="k">{t.fCorso}</div>
        <div className="chips">
          {corsi.map((c) => <button key={c.id} className={corso === c.id ? "chip on" : "chip"} aria-pressed={corso === c.id} onClick={() => setCorso(c.id)}>{c.titolo}</button>)}
          <button className={corso === "nuovo" ? "chip on" : "chip"} aria-pressed={corso === "nuovo"} onClick={() => setCorso("nuovo")}>{t.fNuovo}</button>
        </div>
        {corso === "nuovo" ? (
          <div className="b-col">
            <input className="b-input" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder={t.fNome} aria-label={t.fNome} />
            <input className="b-input" type="number" min={1} max={50} value={moduli} onChange={(e) => setModuli(e.target.value)} aria-label={t.fModuli} placeholder={t.fModuli} />
            <label className="b-check"><input type="checkbox" checked={obbl} onChange={(e) => setObbl(e.target.checked)} />{t.fObbl}</label>
          </div>
        ) : null}

        <div className="k">{t.fMaestri}</div>
        <div className="b-col" style={{ gap: 6 }}>
          {maestri.map((m) => {
            const gia = corso !== "nuovo" && giaAssegnati.has(`${corso}|${m.id}`);
            return (
              <label key={m.id} className="b-check">
                <input type="checkbox" checked={scelti.includes(m.id)} onChange={(e) => setScelti((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))} />
                <span className="grow">{nomeCompleto(m)}</span>
                {gia ? <span className="tag">{t.fGiaTag}</span> : null}
              </label>
            );
          })}
        </div>

        <div className="k">{t.fScadenza}</div>
        <input className="b-input" type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} aria-label={t.fScadenza} />

        {err ? <div className="note" role="alert" style={{ color: "#FF8A8E" }}>{err}</div> : null}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn2" onClick={onChiudi}>{t.fAnnulla}</button>
          <button className="btn" style={{ flex: 1, opacity: valido && !lavoro ? 1 : 0.5 }} disabled={lavoro} onClick={conferma}>{lavoro ? t.fSalvo : t.fConferma}</button>
        </div>
      </div>
    </div>
  );
}
