"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "@/components/centro/Schermo";
import { BarraMattoni, kickMattone } from "./Barra";
import { VideoEsercizio } from "./Video";
import { FormEsercizio, type DatiEsercizio } from "./FormEsercizio";
import { Pannello, useToast } from "./Pannello";
import { Ico } from "./ico";
import { comune, fmt } from "./testi";
import { COLPI, leggiEsercizio, nomeColpo, norm, rangeFasce, type ColpoK, type Esercizio } from "./dati";
import { useMetodo } from "./useMetodo";
import "./metodo.css";

const it = {
  ...comune,
  titolo: "Libreria esercizi",
  nuovo_aria: "Nuovo esercizio",
  cerca_aria: "Cerca un esercizio",
  cerca_ph: "Cerca tra gli esercizi",
  nota: "Il maestro propone, solo il DT approva",
  uno: "{n} esercizio",
  molti: "{n} esercizi",
  nessuno: "Nessun esercizio con questi filtri.",
  meta_proposto: "{c} · {f} · proposto da {chi}",
  meta: "{c} · {f}",
  approva: "Approva",
  rifiuta: "Rifiuta",
  approva_aria: "Approva {n}",
  rifiuta_aria: "Rifiuta {n}",
  nuovo_titolo: "Nuovo esercizio",
  modifica_titolo: "Modifica esercizio",
  crea: "Aggiungi alla libreria",
  salva_modifiche: "Salva le modifiche",
  rifiuta_titolo: "Rifiuta la proposta",
  rifiuta_testo: "Scrivi al maestro perché non entra nella libreria: lo riceve come notifica.",
  rifiuta_ph: "Es. Simile a un esercizio già presente, meglio unirli.",
  rifiuta_conferma: "Rifiuta e avvisa",
  dettaglio_fasce: "Fasce",
  dettaglio_materiale: "Materiale",
  dettaglio_come: "Come si svolge",
  dettaglio_fonte: "Fonte",
  senza_video: "Nessun video allegato.",
  video_assente: "Il video non è disponibile in questo momento.",
  archivia: "Togli dalla libreria",
  aggiunto: "Esercizio aggiunto alla libreria",
  salvato_ok: "Esercizio aggiornato",
  approvato_ok: "Esercizio approvato: ora è nella libreria del centro",
  rifiutato_ok: "Proposta rifiutata: il maestro è stato avvisato",
  archiviato_ok: "Esercizio tolto dalla libreria",
  notifica_ok_t: "Esercizio approvato",
  notifica_ok_x: "\"{n}\" è entrato nella libreria del centro.",
  notifica_no_t: "Esercizio non approvato",
  notifica_no_x: "\"{n}\" non è stato approvato. {m}",
  notifica_senza_motivo: "Parla con il direttore tecnico per i dettagli.",
};
const T = { it, en: { ...it } };

const DURATE = [5, 10, 15, 20, 30];
type Fonte = "tutti" | "matchpoint" | "centro" | "da";

/** C6 · Libreria esercizi: filtri, schede, approva o rifiuta le proposte dei maestri, aggiungi con video. */
export default function Libreria() {
  const t = useT(T) as Record<string, string>;
  const { sb, centro, attivo, puoModificare, reg } = useMetodo();
  const [ex, setEx] = useState<Esercizio[]>([]);
  const [nomi, setNomi] = useState<Record<string, string>>({});
  const [carica, setCarica] = useState(true);
  const [ko, setKo] = useState(false);
  const [q, setQ] = useState("");
  const [colpo, setColpo] = useState<ColpoK | "tutti">("tutti");
  const [fonte, setFonte] = useState<Fonte>("tutti");
  const [aperto, setAperto] = useState<Esercizio | null>(null);
  const [modifica, setModifica] = useState(false);
  const [nuovo, setNuovo] = useState(false);
  const [rifiuto, setRifiuto] = useState<Esercizio | null>(null);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const [toast, mostra] = useToast();

  const leggi = useCallback(async () => {
    const [a, b] = await Promise.all([
      sb.from("esercizi").select("*").eq("centro_id", centro.id).order("created_at", { ascending: false }),
      sb.from("membri").select("id,nome,cognome").eq("centro_id", centro.id),
    ]);
    if (a.error) {
      setKo(true);
      setCarica(false);
      return;
    }
    setEx((a.data ?? []).map((r: Record<string, unknown>) => leggiEsercizio(r)));
    const m: Record<string, string> = {};
    (b.data ?? []).forEach((r: Record<string, unknown>) => {
      m[String(r.id)] = [r.nome, r.cognome].filter(Boolean).join(" ");
    });
    setNomi(m);
    setKo(false);
    setCarica(false);
  }, [sb, centro.id]);
  useEffect(() => {
    leggi();
  }, [leggi]);

  const viva = useMemo(() => ex.filter((e) => e.stato !== "rifiutato"), [ex]);
  const nDaApprovare = viva.filter((e) => e.stato === "proposto").length;
  const etichettaFonte = (e: Esercizio) => (e.stato === "proposto" ? "da" : e.fonte === "matchpoint" ? "matchpoint" : "centro");

  const lista = viva.filter((e) => {
    if (colpo !== "tutti" && e.colpo !== colpo) return false;
    if (fonte !== "tutti" && etichettaFonte(e) !== fonte) return false;
    if (q.trim()) {
      const n = norm(q);
      if (!norm(`${e.titolo} ${e.materiale} ${e.descrizione}`).includes(n)) return false;
    }
    return true;
  });

  const meta = (e: Esercizio) => {
    const c = e.colpo ? t[`colpo_${e.colpo}`] : "";
    const f = rangeFasce(e.fasce);
    return e.stato === "proposto" ? fmt(t.meta_proposto, { c, f, chi: (e.proposto_da && nomi[e.proposto_da]) || "—" }) : fmt(t.meta, { c, f });
  };
  const tagDi = (e: Esercizio) => {
    const f = etichettaFonte(e);
    return f === "da" ? { cls: "or", txt: t.fonte_da_approvare } : f === "centro" ? { cls: "ce", txt: t.fonte_centro } : { cls: "", txt: t.fonte_matchpoint };
  };

  async function avvisa(e: Esercizio, titolo: string, testo: string) {
    if (!e.proposto_da) return;
    try {
      // La notifica è un di più: se la policy non la consente, l'esito dell'approvazione resta valido
      await sb.from("notifiche").insert({ centro_id: centro.id, membro_id: e.proposto_da, tipo: "sistema", titolo, testo, link: `/c/${centro.slug}/maestro/metodo`, mittente: attivo?.id ?? null });
    } catch {
      /* ignorata */
    }
  }

  async function approva(e: Esercizio) {
    setBusy(true);
    // Approvato dal DT l'esercizio diventa del centro
    const { error } = await sb.from("esercizi").update({ stato: "approvato", fonte: "centro" }).eq("id", e.id);
    setBusy(false);
    if (error) return mostra(t.errore);
    await reg("metodo.esercizio.approva", e.titolo, { id: e.id, proposto_da: e.proposto_da });
    await avvisa(e, t.notifica_ok_t, fmt(t.notifica_ok_x, { n: e.titolo }));
    mostra(t.approvato_ok);
    setAperto(null);
    leggi();
  }
  async function rifiuta() {
    if (!rifiuto) return;
    setBusy(true);
    const { error } = await sb.from("esercizi").update({ stato: "rifiutato" }).eq("id", rifiuto.id);
    setBusy(false);
    if (error) return mostra(t.errore);
    await reg("metodo.esercizio.rifiuta", rifiuto.titolo, { id: rifiuto.id, motivo: motivo.trim() });
    await avvisa(rifiuto, t.notifica_no_t, fmt(t.notifica_no_x, { n: rifiuto.titolo, m: motivo.trim() || t.notifica_senza_motivo }));
    setRifiuto(null);
    setMotivo("");
    setAperto(null);
    mostra(t.rifiutato_ok);
    leggi();
  }
  async function salvaNuovo(d: DatiEsercizio) {
    setBusy(true);
    setErrore("");
    const { error } = await sb.from("esercizi").insert({
      centro_id: centro.id, titolo: d.titolo, colpo: nomeColpo(d.colpo), fasce: d.fasce, durata_min: d.durata, materiale: d.materiale, descrizione: d.descrizione,
      video_path: d.video_path, fonte: "centro", stato: "approvato", proposto_da: attivo?.id ?? null,
    });
    setBusy(false);
    if (error) return setErrore(t.errore);
    await reg("metodo.esercizio.crea", d.titolo, { colpo: d.colpo, fasce: d.fasce, durata: d.durata, video: !!d.video_path });
    setNuovo(false);
    mostra(t.aggiunto);
    leggi();
  }
  async function salvaModifica(d: DatiEsercizio) {
    if (!aperto) return;
    setBusy(true);
    setErrore("");
    const { error } = await sb.from("esercizi").update({ titolo: d.titolo, colpo: nomeColpo(d.colpo), fasce: d.fasce, durata_min: d.durata, materiale: d.materiale, descrizione: d.descrizione, video_path: d.video_path }).eq("id", aperto.id);
    setBusy(false);
    if (error) return setErrore(t.errore);
    await reg("metodo.esercizio.modifica", d.titolo, { id: aperto.id });
    setModifica(false);
    setAperto(null);
    mostra(t.salvato_ok);
    leggi();
  }
  async function archivia(e: Esercizio) {
    setBusy(true);
    const { error } = await sb.from("esercizi").update({ stato: "rifiutato" }).eq("id", e.id);
    setBusy(false);
    if (error) return mostra(t.errore);
    await reg("metodo.esercizio.archivia", e.titolo, { id: e.id });
    setAperto(null);
    mostra(t.archiviato_ok);
    leggi();
  }

  const conta = lista.length === 1 ? fmt(t.uno, { n: 1 }) : fmt(t.molti, { n: lista.length });
  const fonti: { k: Fonte; l: string }[] = [
    { k: "tutti", l: t.tutti },
    { k: "matchpoint", l: t.fonte_matchpoint },
    { k: "centro", l: t.fonte_centro },
    { k: "da", l: `${t.fonte_da_approvare} ${nDaApprovare}` },
  ];

  return (
    <SchermoCentro
      ruolo="dt"
      tab="metodo"
      titolo={t.titolo}
      largo
      azioni={
        puoModificare ? (
          <button type="button" className="mm-ib" aria-label={t.nuovo_aria} onClick={() => { setErrore(""); setNuovo(true); }}>
            <Ico n="plus" w={2.4} />
          </button>
        ) : undefined
      }
    >
      <div className="mm">
        <div>
          <div className="mm-k" style={{ textTransform: "none", fontSize: 12 }}>{kickMattone(t, 2, centro.nome)}</div>
          <h1 className="mm-h1">{t.titolo}</h1>
        </div>
        <BarraMattoni slug={centro.slug} attiva="lib" />
        <label style={{ position: "relative", display: "block" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#A1A1A6", display: "flex" }}><Ico n="search" /></span>
          <input type="search" className="mm-inp" style={{ paddingLeft: 40, height: 40 }} aria-label={t.cerca_aria} placeholder={t.cerca_ph} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="mm-scroll">
          <button type="button" className={`mm-chip${colpo === "tutti" ? " on" : ""}`} onClick={() => setColpo("tutti")}>{t.tutti}</button>
          {COLPI.map((c) => (
            <button key={c.k} type="button" className={`mm-chip${colpo === c.k ? " on" : ""}`} onClick={() => setColpo(c.k)}>{c.k === "gambe" ? t.colpo_gambe_c : t[`colpo_${c.k}`]}</button>
          ))}
        </div>
        <div className="mm-seg" style={{ gridTemplateColumns: ".8fr 1.15fr .85fr 1.4fr" }}>
          {fonti.map((x) => (
            <button key={x.k} type="button" className={`mm-sg${fonte === x.k ? " on" : ""}`} style={{ fontSize: 12 }} onClick={() => setFonte(x.k)}>{x.l}</button>
          ))}
        </div>
        <div className="mm-sec"><h2 className="mm-h2">{conta}</h2><span className="mm-mu" style={{ fontSize: 11.5 }}>{t.nota}</span></div>
        {carica ? <div className="mm-load">{t.caricamento}</div> : null}
        {ko ? <div className="mm-err">{t.errore_lettura}</div> : null}
        {!carica && !ko && lista.length === 0 ? <div className="mm-load">{t.nessuno}</div> : null}
        <div className="mm-grid">
          <div className="mm-cards">
            {lista.map((e) => {
              const tg = tagDi(e);
              const pend = e.stato === "proposto";
              return (
                <div key={e.id} className="mm-li mm-ex" style={{ cursor: "default" }}>
                  <button type="button" className="mm-ex-th" style={{ border: 0, cursor: "pointer", padding: 0 }} aria-label={e.titolo} onClick={() => { setModifica(false); setAperto(e); }}><Ico n="play" s={18} fill /></button>
                  <span className="mm-grow">
                    <button type="button" onClick={() => { setModifica(false); setAperto(e); }} style={{ display: "block", background: "none", border: 0, padding: 0, color: "inherit", textAlign: "left", cursor: "pointer", width: "100%" }}>
                      <span className="t mm-ell" style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{e.titolo}</span>
                      <span className="s" style={{ display: "block", fontSize: 12, color: "#A1A1A6", marginTop: 1 }}>{meta(e)}</span>
                      <span className="s mm-ell" style={{ display: "block", fontSize: 11.5, color: "#A1A1A6", marginTop: 1 }}>{e.materiale}</span>
                    </button>
                    {pend && puoModificare ? (
                      <span className="mm-row" style={{ marginTop: 6, gap: 6 }}>
                        <button type="button" className="mm-btn sm" disabled={busy} aria-label={fmt(t.approva_aria, { n: e.titolo })} onClick={() => approva(e)}>{t.approva}</button>
                        <button type="button" className="mm-btn2 sm" disabled={busy} aria-label={fmt(t.rifiuta_aria, { n: e.titolo })} onClick={() => { setMotivo(""); setRifiuto(e); }}>{t.rifiuta}</button>
                      </span>
                    ) : null}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "none" }}>
                    <span className="mm-ex-d">{fmt(t.min_ab, { n: e.durata })}</span>
                    <span className={`mm-tag ${tg.cls}`}>{tg.txt}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Pannello aperto={!!aperto && !rifiuto} titolo={aperto ? (modifica ? t.modifica_titolo : aperto.titolo) : ""} onChiudi={() => { setAperto(null); setModifica(false); }}>
        {aperto && modifica ? (
          <FormEsercizio sb={sb} centroId={centro.id} iniziale={aperto} durate={DURATE} etichettaSalva={t.salva_modifiche} onSalva={salvaModifica} onAnnulla={() => setModifica(false)} busy={busy} errore={errore} />
        ) : aperto ? (
          <>
            {aperto.video_path ? <VideoEsercizio sb={sb} path={aperto.video_path} errore={t.video_assente} /> : <div className="mm-note">{t.senza_video}</div>}
            <div className="mm-row" style={{ flexWrap: "wrap" }}>
              <span className={`mm-tag ${tagDi(aperto).cls}`}>{tagDi(aperto).txt}</span>
              <span className="mm-tag">{aperto.colpo ? t[`colpo_${aperto.colpo}`] : ""}</span>
              <span className="mm-tag">{fmt(t.min_ab, { n: aperto.durata })}</span>
            </div>
            <div style={{ fontSize: 13, color: "#A1A1A6" }}>{meta(aperto)}</div>
            {aperto.materiale ? <div><div className="mm-k">{t.dettaglio_materiale}</div><div style={{ fontSize: 14, marginTop: 3 }}>{aperto.materiale}</div></div> : null}
            {aperto.descrizione ? <div><div className="mm-k">{t.dettaglio_come}</div><div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 3 }}>{aperto.descrizione}</div></div> : null}
            {puoModificare ? (
              <div className="mm-row" style={{ flexWrap: "wrap" }}>
                {aperto.stato === "proposto" ? (
                  <>
                    <button type="button" className="mm-btn" disabled={busy} onClick={() => approva(aperto)}>{t.approva}</button>
                    <button type="button" className="mm-btn2" disabled={busy} onClick={() => { setMotivo(""); setRifiuto(aperto); }}>{t.rifiuta}</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="mm-btn" onClick={() => { setErrore(""); setModifica(true); }}><Ico n="edit" s={16} />{t.modifica}</button>
                    <button type="button" className="mm-btn2 dg" disabled={busy} onClick={() => archivia(aperto)}><Ico n="trash" s={16} />{t.archivia}</button>
                  </>
                )}
              </div>
            ) : null}
            <button type="button" className="mm-btn2" onClick={() => setAperto(null)}>{t.chiudi}</button>
          </>
        ) : null}
      </Pannello>

      <Pannello aperto={nuovo} titolo={t.nuovo_titolo} onChiudi={() => setNuovo(false)}>
        <FormEsercizio sb={sb} centroId={centro.id} durate={DURATE} etichettaSalva={t.crea} onSalva={salvaNuovo} onAnnulla={() => setNuovo(false)} busy={busy} errore={errore} />
      </Pannello>

      <Pannello aperto={!!rifiuto} titolo={t.rifiuta_titolo} onChiudi={() => setRifiuto(null)}>
        <div style={{ fontSize: 13.5, color: "#A1A1A6", lineHeight: 1.4 }}>{t.rifiuta_testo}</div>
        <textarea className="mm-ta" value={motivo} placeholder={t.rifiuta_ph} aria-label={t.rifiuta_titolo} onChange={(e) => setMotivo(e.target.value)} />
        <div className="mm-row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="mm-btn" disabled={busy} onClick={rifiuta}>{t.rifiuta_conferma}</button>
          <button type="button" className="mm-btn2" onClick={() => setRifiuto(null)}>{t.annulla}</button>
        </div>
      </Pannello>
      {toast}
    </SchermoCentro>
  );
}
