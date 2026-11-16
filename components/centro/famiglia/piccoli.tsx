"use client";
// Pezzi piccoli e riusabili delle schermate famiglia: icone, pannello dal basso, selettore del figlio e foglio "assenza".
// Usano solo le classi comuni di centro.css (card, chip, btn…) e le poche classi fam-* di famiglia.css.
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import "./famiglia.css";
import { useT } from "@/lib/i18n/lingua";
import { ICONE, type IconaNome } from "@/components/centro/icone";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { fmtData, leggiData } from "@/lib/centro/date";
import { nomeBreve, type Figlio } from "./dati";
import { fmt, rpcTollerante } from "./util";
import { eVideo, urlFirmato } from "./media";

const IT = {
  chiudi: "Chiudi", caricamento: "Caricamento…", riprova: "Riprova", erroreGenerico: "Qualcosa non ha funzionato. Riprova tra poco.",
  scegliFiglio: "Scegli il figlio",
  nessunFiglio: "Non ci sono ancora figli collegati a questo account.",
  nessunFiglioSub: "Chiedi al centro un codice di invito oppure aggiungilo con il codice che hai ricevuto.",
  usaCodice: "Usa un codice invito",
  nessunGruppo: "Non è ancora iscritto a un gruppo.",
  // foglio assenza
  assTitolo: "Giustifica assenza",
  assLezione: "Lezione di {data} alle {ora}",
  assMotivo: "Motivo",
  assMalato: "Malattia", assScuola: "Scuola o compiti", assViaggio: "Viaggio", assAltro: "Altro",
  assTesto: "Vuoi aggiungere una frase? (facoltativo)",
  assPlaceholder: "Per esempio: ha la febbre da ieri sera",
  assInvia: "Segnala assenza",
  assInvio: "Invio…",
  assTardi: "È troppo tardi per avvisare dall'app (servono almeno {ore} ore prima della lezione). Scrivi al maestro.",
  assScrivi: "Scrivi al maestro",
  assFatto: "Assenza segnalata. {maestro} e la famiglia ricevono l'avviso.",
  assMaestro: "Il maestro",
  guarda: "Guarda",
  videoNonDisp: "Il file non è disponibile in questo momento.",
  aperturaFile: "Apertura…",
};
export const T_PICCOLI = { it: IT, en: { ...IT } };

/** Icona a tratto dei mockup per nome (tracciati in components/centro/icone.ts). */
export function Icona({ nome, size = 18, sw = 2 }: { nome: IconaNome; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONE[nome] }} />
  );
}

/** Tracciato SVG libero (per le icone che non sono in ICONE, come il lancio di palla). */
export function Tratto({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}

/** Pannello dal basso: chiude con Esc o toccando lo sfondo. */
export function Foglio({ titolo, onChiudi, children }: { titolo: string; onChiudi: () => void; children: ReactNode }) {
  const t = useT(T_PICCOLI);
  // onChiudi cambia a ogni disegno del genitore: letta da un ref, l'ascolto dei tasti si monta una volta sola
  const chiudiRef = useRef(onChiudi);
  chiudiRef.current = onChiudi;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && chiudiRef.current();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="fam-fg-bg" onClick={onChiudi}>
      <div className="fam-fg" role="dialog" aria-modal="true" aria-label={titolo} onClick={(e) => e.stopPropagation()}>
        <div className="fam-riga fam-sp">
          <h2>{titolo}</h2>
          <button type="button" className="chip" onClick={onChiudi} aria-label={t.chiudi}><Icona nome="x" size={14} sw={2.4} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Caricamento() {
  const t = useT(T_PICCOLI);
  return <div className="note" role="status">{t.caricamento}</div>;
}

export function ErroreBox({ testo, onRiprova }: { testo: string; onRiprova?: () => void }) {
  const t = useT(T_PICCOLI);
  return (
    <div className="fam-err" role="alert">
      {testo}
      {onRiprova && <> <button type="button" className="fam-link" style={{ background: "none", border: 0, font: "inherit", cursor: "pointer" }} onClick={onRiprova}>{t.riprova}</button></>}
    </div>
  );
}

/** Stato vuoto: nessun figlio collegato. */
export function SenzaFigli() {
  const t = useT(T_PICCOLI);
  return (
    <div className="card pad" style={{ textAlign: "center" }}>
      <div className="t" style={{ fontWeight: 700 }}>{t.nessunFiglio}</div>
      <div className="muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>{t.nessunFiglioSub}</div>
      <Link href="/app/unisciti" className="btn" style={{ height: 44, fontSize: 14 }}>{t.usaCodice}</Link>
    </div>
  );
}

/** Chip per scegliere il figlio; con un solo figlio non si mostra. */
export function SelettoreFigli({ figli, scelto, onScegli, extra }: { figli: Figlio[]; scelto: string | null; onScegli: (id: string) => void; extra?: ReactNode }) {
  const t = useT(T_PICCOLI);
  if (figli.length < 2 && !extra) return null;
  return (
    <div className="chips" role="group" aria-label={t.scegliFiglio}>
      {figli.map((f) => (
        <button key={f.allievo.id} type="button" className={f.allievo.id === scelto ? "chip on" : "chip"} aria-pressed={f.allievo.id === scelto} onClick={() => onScegli(f.allievo.id)}>
          {f.allievo.nome}{f.gruppo?.fascia ? ` · ${f.gruppo.fascia}` : ""}
        </button>
      ))}
      {extra}
    </div>
  );
}

const MOTIVI = [["malato", "assMalato"], ["scuola", "assScuola"], ["viaggio", "assViaggio"], ["altro", "assAltro"]] as const;

/**
 * Foglio per giustificare un'assenza: usa la RPC avvisa_assenza, che controlla il limite delle ore
 * (centri.impostazioni.assenza_entro_ore) e notifica maestro e genitori. Il controllo qui è solo un avviso anticipato.
 */
export function FoglioAssenza({ figlio, data, ora, onChiudi, onFatto }: { figlio: Figlio; data: string; ora: string; onChiudi: () => void; onFatto: () => void }) {
  const t = useT(T_PICCOLI);
  const { centro, sb } = useCentro();
  const [motivo, setMotivo] = useState<string>("malato");
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);
  const ore = Number(centro.impostazioni?.assenza_entro_ore ?? 2);
  const inizio = leggiData(data);
  const [h, m] = ora.split(":").map(Number);
  inizio.setHours(h || 0, m || 0, 0, 0);
  const troppoTardi = +inizio - Date.now() < ore * 3600 * 1000;
  const maestro = figlio.maestri[0]?.nome ?? t.assMaestro;

  async function invia() {
    setInvio(true);
    setErrore(null);
    const r = await rpcTollerante(sb, "avvisa_assenza", { allievo: figlio.allievo.id, data, motivo, testo: testo.trim() || null });
    setInvio(false);
    if (r.error) return setErrore(r.error.message || t.erroreGenerico);
    setFatto(true);
    onFatto();
  }

  return (
    <Foglio titolo={t.assTitolo} onChiudi={onChiudi}>
      <div className="muted" style={{ fontSize: 13.5 }}>{nomeBreve(figlio.allievo)} · {fmt(t.assLezione, { data: fmtData(data), ora })}</div>
      {fatto ? (
        <>
          <div className="fam-ok" role="status">{fmt(t.assFatto, { maestro })}</div>
          <button type="button" className="btn" onClick={onChiudi}>{t.chiudi}</button>
        </>
      ) : (
        <>
          <div>
            <span className="fam-lab">{t.assMotivo.toUpperCase()}</span>
            <div className="chips" role="group" aria-label={t.assMotivo}>
              {MOTIVI.map(([k, chiave]) => (
                <button key={k} type="button" className={motivo === k ? "chip on" : "chip"} aria-pressed={motivo === k} onClick={() => setMotivo(k)}>{t[chiave]}</button>
              ))}
            </div>
          </div>
          <label>
            <span className="fam-lab">{t.assTesto.toUpperCase()}</span>
            <textarea className="fam-txt" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={t.assPlaceholder} maxLength={300} />
          </label>
          {troppoTardi && (
            <div className="fam-err">
              {fmt(t.assTardi, { ore })}{" "}
              <Link className="fam-link" href={rotta(centro.slug).genitore.messaggi}>{t.assScrivi}</Link>
            </div>
          )}
          {errore && <div className="fam-err" role="alert">{errore}</div>}
          <button type="button" className="btn" disabled={invio || troppoTardi} onClick={invia}>{invio ? t.assInvio : t.assInvia}</button>
        </>
      )}
    </Foglio>
  );
}

/** Mostra un video o una foto del bucket privato con un link firmato a tempo. */
export function VisoreMedia({ titolo, path, onChiudi }: { titolo: string; path: string; onChiudi: () => void }) {
  const t = useT(T_PICCOLI);
  const { sb } = useCentro();
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    urlFirmato(sb, path).then((u) => vivo && setUrl(u));
    return () => { vivo = false; };
  }, [sb, path]);
  return (
    <Foglio titolo={titolo || t.guarda} onChiudi={onChiudi}>
      {url === undefined && <div className="note">{t.aperturaFile}</div>}
      {url === null && <div className="fam-err">{t.videoNonDisp}</div>}
      {url && (eVideo(path) ? <video src={url} controls playsInline preload="metadata" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img className="fam-media" src={url} alt={titolo} />)}
    </Foglio>
  );
}
