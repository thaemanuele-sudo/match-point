"use client";
// G7 Figli e consensi: profilo di ogni figlio, account del ragazzo (invito dai 14 anni), consensi privacy / foto e video / AI
// (spenti finché il genitore non firma) e certificato medico con scadenza.
import { useEffect, useState } from "react";
import Link from "next/link";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { rotta, ROTTE_APP } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { fmtGiorni, fmtOra, isoGiorno, leggiData, aggiungiGiorni } from "@/lib/centro/date";
import { nomeBreve, nomeCompleto, useFigli, type Figlio } from "./dati";
import { caricaMedia } from "./media";
import { codiceCasuale, eta, fmt, MESI_LUNGHI } from "./util";
import { Caricamento, ErroreBox, Foglio, Icona, SelettoreFigli, SenzaFigli } from "./piccoli";

const IT = {
  titolo: "Figli e consensi",
  kick: "{famiglia} · {centro}",
  famiglia: "Famiglia {cognome}",
  aggiungi: "Aggiungi",
  aggiungiAria: "Aggiungi un figlio",
  aggiungiTitolo: "Aggiungi un figlio",
  aggiungiTesto: "Per collegare un altro figlio al tuo account serve il codice di invito di 6 caratteri che ti dà il centro. Lo inserisci nella pagina di ingresso.",
  aggiungiVai: "Inserisci il codice",
  anni: "{n} anni", annoNato: "nato nel {anno}", nonIscritto: "Non ancora iscritto a un gruppo",
  accountTitolo: "Account del ragazzo",
  accountMinore: "Sotto i {anni} anni usa la Modalità ragazzo sul tuo telefono. L'account personale si attiva dai {anni} anni.",
  accountAttivo: "{nome} ha il suo account e lo usa per i compiti e la chat con il maestro.",
  accountInvito: "{nome} può avere il suo account: invitalo con un codice personale, valido 7 giorni.",
  accountInvitoPronto: "Invito pronto: codice {codice}. Scade il {data}.",
  tagModalita: "Modalità ragazzo", tagAttivo: "Attivo", tagInvita: "Può accedere",
  invita: "Invita {nome}", rinvia: "Mostra codice",
  invitoTitolo: "Invito per {nome}",
  invitoTesto: "{nome} apre il link, accede e inserisce il codice. Il codice vale una sola volta e scade tra 7 giorni.",
  codice: "CODICE", link: "LINK", condividi: "Condividi", copia: "Copia il link", copiato: "Link copiato",
  invitoMsg: "Ti invito a entrare in {centro} su Match Point: apri il link e usa il codice {codice}.",
  consensi: "Consensi",
  cambiabili: "Puoi cambiarli quando vuoi",
  cPrivacy: "Privacy e regole del centro", cPrivacyD: "Necessario per partecipare alle lezioni",
  cFoto: "Foto e video in campo", cFotoD: "Per l'analisi dei colpi e i video condivisi",
  cAi: "Analisi con il Coach AI", cAiD: "Il maestro controlla sempre ogni risultato",
  spento: "Spento: non attivo finché non firmi",
  firmatoDa: "Firmato da {chi} il {data}",
  firmatoDaAltro: "un familiare",
  revocatoIl: "Disattivato il {data}",
  firmaTitolo: "Firma il consenso",
  firmaTesto: "Attivo «{consenso}» per {nome}. Scrivi il tuo nome e cognome per firmare: puoi cambiare idea quando vuoi.",
  firmaCampo: "NOME E COGNOME",
  firmaBtn: "Firma e attiva", firmaInvio: "Salvataggio…",
  revocaTitolo: "Disattiva il consenso",
  revocaTesto: "Disattivo «{consenso}» per {nome}.",
  revocaPrivacy: " Senza il consenso privacy {nome} non può partecipare alle lezioni.",
  revocaBtn: "Disattiva",
  annulla: "Annulla", chiudi: "Chiudi",
  certificato: "Certificato medico", carica: "Carica", aggiorna: "Aggiorna",
  certNessuno: "Nessun certificato caricato",
  certValido: "Valido fino al {data}", certInScadenza: "Valido fino al {data} · in scadenza", certScaduto: "Scaduto il {data}",
  certTitolo: "Certificato medico di {nome}",
  certFile: "FOTO O PDF DEL CERTIFICATO", certData: "VALIDO FINO AL",
  certSalva: "Salva certificato", certInvio: "Caricamento…",
  certObbligo: "Scegli il file e la data di scadenza.",
  minorenne: "Finché {nome} ha meno di {anni} anni puoi leggere la sua chat con il maestro, in sola lettura.",
  erroreGenerico: "Qualcosa non ha funzionato. Riprova tra poco.",
  consensoNome: "Consenso",
};
export const T = { it: IT, en: { ...IT } };

type Tipo = "privacy" | "foto_video" | "ai";
type RConsenso = { id: string; allievo_id: string; tipo: Tipo; valore: boolean; firmato_da: string | null; firmato_il: string | null };
const COL_CONSENSO = "id,allievo_id,tipo,valore,firmato_da,firmato_il";
type RInvito = { id: string; codice: string; scade_il: string | null };

const fmtLunga = (d: string | Date) => {
  const x = leggiData(d);
  return `${x.getDate()} ${MESI_LUNGHI[x.getMonth()]} ${x.getFullYear()}`;
};

export default function GenitoreFigli() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, caricamento, errore, ricarica, ma } = useFigli("famiglia");
  const [consensi, setConsensi] = useState<RConsenso[]>([]);
  const [invito, setInvito] = useState<RInvito | null>(null);
  const [errDati, setErrDati] = useState<string | null>(null);
  const [firma, setFirma] = useState<{ tipo: Tipo; attiva: boolean } | null>(null);
  const [mostraInvito, setMostraInvito] = useState(false);
  const [certificato, setCertificato] = useState(false);
  const [aggiungi, setAggiungi] = useState(false);
  const r = rotta(centro.slug).genitore;
  const idAll = figlio?.allievo.id;
  const soglia = Number(centro.impostazioni?.account_ragazzo_da ?? 14);
  const fino = Number(centro.impostazioni?.chat_genitori_fino ?? 18);

  useEffect(() => {
    if (!idAll) return;
    let vivo = true;
    (async () => {
      setErrDati(null);
      const [c, i] = await Promise.all([
        sb.from("consensi").select(COL_CONSENSO).eq("centro_id", centro.id).eq("allievo_id", idAll),
        // se la RLS non lascia leggere gli inviti, il genitore potrà solo crearne uno nuovo
        sb.from("inviti").select("id,codice,scade_il,usi,usi_max").eq("centro_id", centro.id).eq("allievo_id", idAll).eq("ruolo", "allievo").order("created_at", { ascending: false }).limit(3),
      ]);
      if (!vivo) return;
      if (c.error) setErrDati(c.error.message);
      setConsensi((c.data ?? []) as RConsenso[]);
      const adesso = isoGiorno();
      const valido = ((i.data ?? []) as (RInvito & { usi: number | null; usi_max: number | null })[]).find((x) => (x.usi ?? 0) < (x.usi_max ?? 1) && (!x.scade_il || x.scade_il.slice(0, 10) >= adesso));
      setInvito(valido ?? null);
    })().catch((e: unknown) => vivo && setErrDati(e instanceof Error ? e.message : String(e)));
    return () => { vivo = false; };
  }, [idAll, centro.id, sb]);

  const ETI = figlio ? eta(figlio.allievo.data_nascita) : null;
  const dato = (tipo: Tipo) => consensi.find((c) => c.tipo === tipo);
  const VOCI: { tipo: Tipo; nome: string; desc: string }[] = [
    { tipo: "privacy", nome: t.cPrivacy, desc: t.cPrivacyD },
    { tipo: "foto_video", nome: t.cFoto, desc: t.cFotoD },
    { tipo: "ai", nome: t.cAi, desc: t.cAiD },
  ];

  const certData = figlio?.allievo.certificato_scade;
  const certTesto = !certData
    ? t.certNessuno
    : certData < isoGiorno() ? fmt(t.certScaduto, { data: fmtLunga(certData) })
      : certData <= isoGiorno(aggiungiGiorni(new Date(), 30)) ? fmt(t.certInScadenza, { data: fmtLunga(certData) })
        : fmt(t.certValido, { data: fmtLunga(certData) });

  let accountTesto = "", accountTag = t.tagModalita;
  if (figlio) {
    if (ETI === null || ETI < soglia) accountTesto = fmt(t.accountMinore, { anni: soglia });
    else if (figlio.allievo.membro_id) { accountTesto = fmt(t.accountAttivo, { nome: figlio.allievo.nome }); accountTag = t.tagAttivo; }
    else { accountTesto = invito ? fmt(t.accountInvitoPronto, { codice: invito.codice, data: invito.scade_il ? fmtLunga(invito.scade_il) : "" }) : fmt(t.accountInvito, { nome: figlio.allievo.nome }); accountTag = t.tagInvita; }
  }
  const puoInvitare = !!figlio && ETI !== null && ETI >= soglia && !figlio.allievo.membro_id;

  return (
    <SchermoCentro
      ruolo="genitore"
      tab="home"
      titolo={t.titolo}
      sopra={fmt(t.kick, { famiglia: ma?.cognome ? fmt(t.famiglia, { cognome: ma.cognome }) : "", centro: centro.nome_app || centro.nome })}
      indietro={r.base}
    >
      <div className="fam-col">
        {caricamento && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {!caricamento && !errore && figli.length === 0 && <SenzaFigli />}
        {figlio && (
          <>
            <SelettoreFigli
              figli={figli}
              scelto={figlio.allievo.id}
              onScegli={scegli}
              extra={<button type="button" className="chip" aria-label={t.aggiungiAria} onClick={() => setAggiungi(true)}><Icona nome="plus" size={14} sw={2.6} />{t.aggiungi}</button>}
            />
            {errDati && <ErroreBox testo={errDati} />}
            <div className="card pad fam-riga" style={{ gap: 12 }}>
              <span className="fam-disp" style={{ width: 52, height: 52, borderRadius: "50%", background: "#232326", color: "#D8F34A", fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                {figlio.allievo.nome.charAt(0).toUpperCase()}
              </span>
              <div className="fam-grow">
                <div className="t" style={{ fontWeight: 700, fontSize: 16 }}>{nomeBreve(figlio.allievo)}</div>
                {ETI !== null && figlio.allievo.data_nascita && (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{fmt(t.anni, { n: ETI })} · {fmt(t.annoNato, { anno: leggiData(figlio.allievo.data_nascita).getFullYear() })}</div>
                )}
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {figlio.gruppo ? `${figlio.gruppo.nome}${figlio.gruppo.giorni?.length ? ` · ${fmtGiorni(figlio.gruppo.giorni)} ${fmtOra(figlio.gruppo.ora)}` : ""}` : t.nonIscritto}
                </div>
              </div>
            </div>

            <div className="li" style={{ padding: "9px 12px", alignItems: "flex-start" }}>
              <span className="fam-ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Icona nome="user" size={16} /></span>
              <span className="fam-grow">
                <div className="t" style={{ fontSize: 14 }}>{t.accountTitolo}</div>
                <div className="s" style={{ fontSize: 12 }}>{accountTesto}</div>
                {puoInvitare && (
                  <button type="button" className="chip on" style={{ height: 30, fontSize: 12, marginTop: 8 }} onClick={() => setMostraInvito(true)}>
                    {invito ? t.rinvia : fmt(t.invita, { nome: figlio.allievo.nome })}
                  </button>
                )}
              </span>
              <span className="tag">{accountTag}</span>
            </div>

            <div className="sec" style={{ marginTop: 2 }}><h2 style={{ fontSize: 16 }}>{t.consensi}</h2><span className="muted" style={{ fontWeight: 600 }}>{t.cambiabili}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {VOCI.map((v) => {
                const c = dato(v.tipo);
                const on = !!c?.valore;
                const chi = c?.firmato_da && c.firmato_da === ma?.id ? nomeCompleto(ma) : t.firmatoDaAltro;
                return (
                  <button key={v.tipo} type="button" className="li" style={{ width: "100%", padding: "9px 12px", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}
                    aria-pressed={on} onClick={() => setFirma({ tipo: v.tipo, attiva: !on })}>
                    <span className="fam-grow" style={{ color: "inherit" }}>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{v.nome}</span>
                      <span style={{ display: "block", fontSize: 12, color: "#A1A1A6", marginTop: 2, fontWeight: 500 }}>{v.desc}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: on ? "#D8F34A" : "#8E8E93", marginTop: 3, fontWeight: 600 }}>
                        {on && c?.firmato_il ? fmt(t.firmatoDa, { chi, data: fmtLunga(c.firmato_il) }) : !on && c?.firmato_il ? fmt(t.revocatoIl, { data: fmtLunga(c.firmato_il) }) : !on ? t.spento : ""}
                      </span>
                    </span>
                    <span className={on ? "fam-sw on" : "fam-sw"}><i /></span>
                  </button>
                );
              })}
            </div>

            <div className="li" style={{ padding: "9px 12px" }}>
              <span className="fam-ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Icona nome="doc" size={16} /></span>
              <span className="fam-grow"><div className="t" style={{ fontSize: 14 }}>{t.certificato}</div><div className="s" style={{ fontSize: 12 }}>{certTesto}</div></span>
              <button type="button" className="chip on" style={{ height: 30, fontSize: 12 }} onClick={() => setCertificato(true)}>{certData ? t.aggiorna : t.carica}</button>
            </div>
            <div className="note" style={{ fontSize: 11.5, padding: "8px 12px" }}>{fmt(t.minorenne, { nome: figlio.allievo.nome, anni: fino })}</div>
          </>
        )}
      </div>

      {aggiungi && (
        <Foglio titolo={t.aggiungiTitolo} onChiudi={() => setAggiungi(false)}>
          <div className="muted" style={{ fontSize: 13.5 }}>{t.aggiungiTesto}</div>
          <Link href={ROTTE_APP.unisciti()} className="btn">{t.aggiungiVai}</Link>
        </Foglio>
      )}
      {firma && figlio && ma && (
        <FoglioConsenso
          figlio={figlio} tipo={firma.tipo} attiva={firma.attiva} nomeConsenso={VOCI.find((x) => x.tipo === firma.tipo)?.nome ?? t.consensoNome}
          esistente={dato(firma.tipo)} onChiudi={() => setFirma(null)}
          onSalvato={(c) => setConsensi((lista) => [...lista.filter((x) => x.tipo !== c.tipo), c])}
        />
      )}
      {mostraInvito && figlio && ma && (
        <FoglioInvito figlio={figlio} esistente={invito} onChiudi={() => setMostraInvito(false)} onCreato={setInvito} />
      )}
      {certificato && figlio && (
        <FoglioCertificato figlio={figlio} onChiudi={() => setCertificato(false)} onFatto={ricarica} />
      )}
    </SchermoCentro>
  );
}

/** Firma (o ritiro) di un consenso: scrive firmato_da e firmato_il, così resta traccia di chi ha deciso e quando. */
function FoglioConsenso({ figlio, tipo, attiva, nomeConsenso, esistente, onChiudi, onSalvato }: {
  figlio: Figlio; tipo: Tipo; attiva: boolean; nomeConsenso: string; esistente: RConsenso | undefined; onChiudi: () => void; onSalvato: (c: RConsenso) => void;
}) {
  const t = useT(T);
  const { centro, sb, membro, vistaCome } = useCentro();
  const ma = vistaCome ?? membro;
  const [nome, setNome] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function salva() {
    if (!ma) return;
    setInvio(true);
    setErrore(null);
    const ora = new Date().toISOString();
    const corpo = { valore: attiva, firmato_da: ma.id, firmato_il: ora };
    const q = esistente
      ? sb.from("consensi").update(corpo).eq("id", esistente.id).select(COL_CONSENSO).single()
      : sb.from("consensi").insert({ centro_id: centro.id, allievo_id: figlio.allievo.id, tipo, ...corpo }).select(COL_CONSENSO).single();
    const r = await q;
    setInvio(false);
    if (r.error || !r.data) return setErrore(r.error?.message ?? t.erroreGenerico);
    onSalvato(r.data as RConsenso);
    onChiudi();
  }

  return (
    <Foglio titolo={attiva ? t.firmaTitolo : t.revocaTitolo} onChiudi={onChiudi}>
      {attiva ? (
        <>
          <div className="muted" style={{ fontSize: 13.5 }}>{fmt(t.firmaTesto, { consenso: nomeConsenso, nome: figlio.allievo.nome })}</div>
          <label>
            <span className="fam-lab">{t.firmaCampo}</span>
            <input className="fam-in" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder={ma ? nomeCompleto(ma) : ""} />
          </label>
        </>
      ) : (
        <div className="muted" style={{ fontSize: 13.5 }}>
          {fmt(t.revocaTesto, { consenso: nomeConsenso, nome: figlio.allievo.nome })}{tipo === "privacy" ? fmt(t.revocaPrivacy, { nome: figlio.allievo.nome }) : ""}
        </div>
      )}
      {errore && <div className="fam-err" role="alert">{errore}</div>}
      <div className="fam-btn-riga">
        <button type="button" className="btn2" onClick={onChiudi}>{t.annulla}</button>
        <button type="button" className="btn" style={{ flex: 1.4 }} disabled={invio || (attiva && nome.trim().length < 3)} onClick={salva}>
          {invio ? t.firmaInvio : attiva ? t.firmaBtn : t.revocaBtn}
        </button>
      </div>
    </Foglio>
  );
}

/** Invito del ragazzo (dai 14 anni): crea un codice di 6 caratteri valido 7 giorni e una sola volta, legato al suo profilo. */
function FoglioInvito({ figlio, esistente, onChiudi, onCreato }: { figlio: Figlio; esistente: RInvito | null; onChiudi: () => void; onCreato: (i: RInvito) => void }) {
  const t = useT(T);
  const { centro, sb, membro, vistaCome } = useCentro();
  const ma = vistaCome ?? membro;
  const [invito, setInvito] = useState<RInvito | null>(esistente);
  const [errore, setErrore] = useState<string | null>(null);
  const [lavoro, setLavoro] = useState(false);
  const [copiato, setCopiato] = useState(false);

  async function crea() {
    if (!ma) return;
    setLavoro(true);
    setErrore(null);
    // il codice è unico nel database: in caso di collisione si riprova con un altro
    for (let i = 0; i < 4; i++) {
      const scade = aggiungiGiorni(new Date(), 7).toISOString();
      const r = await sb.from("inviti").insert({ centro_id: centro.id, codice: codiceCasuale(), ruolo: "allievo", allievo_id: figlio.allievo.id, scade_il: scade, usi_max: 1, usi: 0, creato_da: ma.id }).select("id,codice,scade_il").single();
      if (!r.error && r.data) { setInvito(r.data as RInvito); onCreato(r.data as RInvito); setLavoro(false); return; }
      if (r.error && r.error.code !== "23505") { setErrore(r.error.message); break; }
    }
    setLavoro(false);
  }
  useEffect(() => { if (!esistente) void crea(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const url = invito && typeof window !== "undefined" ? `${window.location.origin}${ROTTE_APP.unisciti(invito.codice)}` : "";
  async function condividi() {
    if (!invito) return;
    const testo = fmt(t.invitoMsg, { centro: centro.nome_app || centro.nome, codice: invito.codice });
    try {
      if (navigator.share) { await navigator.share({ text: testo, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopiato(true);
    } catch { /* condivisione annullata dall'utente */ }
  }

  return (
    <Foglio titolo={fmt(t.invitoTitolo, { nome: figlio.allievo.nome })} onChiudi={onChiudi}>
      <div className="muted" style={{ fontSize: 13.5 }}>{fmt(t.invitoTesto, { nome: figlio.allievo.nome })}</div>
      {lavoro && !invito && <Caricamento />}
      {errore && <div className="fam-err" role="alert">{errore}</div>}
      {invito && (
        <>
          <div>
            <span className="fam-lab">{t.codice}</span>
            <div className="fam-disp" style={{ fontSize: 44, fontWeight: 800, letterSpacing: 6, color: "#D8F34A" }}>{invito.codice}</div>
          </div>
          <div>
            <span className="fam-lab">{t.link}</span>
            <div className="s fam-ell" style={{ fontSize: 12.5, color: "#A1A1A6" }}>{url}</div>
          </div>
          <button type="button" className="btn" onClick={condividi}><Icona nome="share" size={18} sw={2.4} />{copiato ? t.copiato : typeof navigator !== "undefined" && "share" in navigator ? t.condividi : t.copia}</button>
        </>
      )}
    </Foglio>
  );
}

/** Certificato medico: il file va nel bucket privato (centro/certificati/allievo), la scadenza nella scheda dell'allievo. */
function FoglioCertificato({ figlio, onChiudi, onFatto }: { figlio: Figlio; onChiudi: () => void; onFatto: () => void }) {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const [file, setFile] = useState<File | null>(null);
  const [scade, setScade] = useState(figlio.allievo.certificato_scade ?? "");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function salva() {
    if (!file || !scade) return setErrore(t.certObbligo);
    setInvio(true);
    setErrore(null);
    const up = await caricaMedia(sb, centro.id, `certificati/${figlio.allievo.id}`, "certificato", file);
    if (up.errore) { setInvio(false); return setErrore(up.errore); }
    const r = await sb.from("allievi").update({ certificato_scade: scade }).eq("id", figlio.allievo.id).select("id").single();
    setInvio(false);
    if (r.error) return setErrore(r.error.message);
    onFatto();
    onChiudi();
  }

  return (
    <Foglio titolo={fmt(t.certTitolo, { nome: figlio.allievo.nome })} onChiudi={onChiudi}>
      <label>
        <span className="fam-lab">{t.certFile}</span>
        <input className="fam-in" style={{ height: "auto", padding: 10 }} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        <span className="fam-lab">{t.certData}</span>
        <input className="fam-in" type="date" value={scade} min={isoGiorno()} onChange={(e) => setScade(e.target.value)} />
      </label>
      {errore && <div className="fam-err" role="alert">{errore}</div>}
      <button type="button" className="btn" disabled={invio || !file || !scade} onClick={salva}>{invio ? t.certInvio : t.certSalva}</button>
    </Foglio>
  );
}
