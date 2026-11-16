"use client";
// M6 · Lezione in corso: appello in un tocco, timer del blocco, prossimo blocco, nota vocale (MediaRecorder → storage `centri`)
// e "registra un colpo" che apre la pagina di caricamento video già esistente (/app/carica).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Foglio, Ico, Nota, Tag, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { fmtOra } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { assicuraPresenze, messaggioErrore, useLezione, useMaestroDati } from "./dati";
import { StatoPagina } from "./piccoli";
import { campoEffettivo, fmt, leggiPiano, leggiSvolto, nomeBreve, nomeCampo, titoloEsercizio, type Blocco, type RAllievo, type RPresenza } from "./util";

const IT = {
  inCorso: "In corso · {campo} · {ora}", termina: "Termina", dalMetodo: "Dal Metodo", bloccoDi: "BLOCCO {n} DI {t} · {m} MIN", poi: "POI", chiusuraLezione: "Chiusura lezione", chiusuraSotto: "Fatto davvero e riassunto per le famiglie",
  prossimoSotto: "{m} minuti", pausa: "Metti in pausa il timer", riprendi: "Riprendi il timer", successivo: "Blocco successivo", ultimo: "Ultimo blocco", oltre: "Oltre il tempo", tempoRimasto: "Tempo rimasto nel blocco: {m} minuti e {s} secondi",
  appello: "Appello · {p} su {t}", tuttiPresenti: "Tutti presenti", presente: "{nome}, presente", assente: "{nome}, assente", avvisato: "ha avvisato",
  nota: "Nota · {nome}", notaRec: "Registro… tocca per salvare", notaSalvata: "Salvata · {nome}", notaSalvo: "Salvo la nota…", cambiaAllievo: "Nota per un altro allievo", notaPer: "Nota vocale per…", colpo: "Registra un colpo",
  errMic: "Non riesco a usare il microfono: {e}", errNota: "Non riesco a salvare la nota: {e}", errPres: "Non riesco a salvare la presenza: {e}", noMic: "Questo dispositivo non permette di registrare l'audio.",
  gia: "Lezione già chiusa", giaTesto: "Questa lezione è chiusa: il timer non serve più.", vaiChiusura: "Vai alla chiusura", pianoVuoto: "Il piano non ha blocchi: il timer non parte.", nonTrovata: "Lezione non trovata", errInizio: "Non riesco ad avviare la lezione: {e}",
  nessunAllievo: "Nessun allievo in questo gruppo.",
};
const T = { it: IT, en: { ...IT } };

type Timer = { blocco: number; resto: number; ripartito: number | null; trascorsi: number[] };
const chiave = (id: string) => `mp-lezione-timer-${id}`;
const p2 = (n: number) => String(n).padStart(2, "0");

/** Secondi rimasti nel blocco: può diventare negativo (si è andati oltre il tempo). */
const rimasti = (tm: Timer, ora: number) => (tm.ripartito === null ? tm.resto : tm.resto - Math.floor((ora - tm.ripartito) / 1000));

export function LezioneInCorso({ id }: { id: string }) {
  const t = useT(T);
  const router = useRouter();
  const { centro, sb } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const { d, errore: errL, ricarica: ricL, caricamento: cL } = useLezione(id, dati);
  const [pres, setPres] = useState<RPresenza[] | null>(null);
  const [tm, setTm] = useState<Timer | null>(null);
  const [ora, setOra] = useState(() => Date.now());
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [scegli, setScegli] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [registra, setRegistra] = useState<{ allievo: string; fase: "rec" | "salvo" } | null>(null);
  const [salvata, setSalvata] = useState<string | null>(null);
  const rec = useRef<{ mr: MediaRecorder; flusso: MediaStream; pezzi: Blob[] } | null>(null);

  const piano = useMemo<Blocco[]>(() => (d ? leggiPiano(d.lezione.piano) : []), [d]);
  const lez = d?.lezione ?? null;

  // il timer riparte da dove era (localStorage): ricaricare la pagina o fare un salto a /app/carica non lo azzera
  useEffect(() => {
    if (!lez || !piano.length || tm) return;
    let salvato: Timer | null = null;
    try { const s = localStorage.getItem(chiave(lez.id)); if (s) salvato = JSON.parse(s) as Timer; } catch { /* storage non disponibile: si riparte */ }
    if (salvato && salvato.blocco < piano.length) { setTm(salvato); return; }
    setTm({ blocco: 0, resto: piano[0].minuti * 60, ripartito: Date.now(), trascorsi: [] });
  }, [lez, piano, tm]);
  useEffect(() => {
    if (!tm || !lez) return;
    try { localStorage.setItem(chiave(lez.id), JSON.stringify(tm)); } catch { /* facoltativo */ }
  }, [tm, lez]);
  useEffect(() => { const i = setInterval(() => setOra(Date.now()), 1000); return () => clearInterval(i); }, []);

  // all'apertura: la lezione passa a "in corso" e ci sono le righe di presenza di tutti gli iscritti
  useEffect(() => {
    if (!d || pres) return;
    let vivo = true;
    (async () => {
      try {
        if (d.lezione.stato === "programmata") {
          const { error } = await sb.from("lezioni").update({ stato: "in_corso" }).eq("id", d.lezione.id);
          if (error) throw error;
        }
        const tutte = await assicuraPresenze(sb, centro.id, d);
        if (vivo) setPres(tutte);
      } catch (e) {
        if (vivo) setMsg(fmt(t.errInizio, { e: messaggioErrore(e) }));
      }
    })();
    return () => { vivo = false; };
  }, [d, pres, sb, centro.id, t.errInizio]);

  // chiude il microfono se si esce dalla pagina durante la registrazione
  useEffect(() => () => { rec.current?.flusso.getTracks().forEach((x) => x.stop()); }, []);

  const scriviSvolto = useCallback(async (nuovo: Timer) => {
    if (!lez) return;
    const prima = leggiSvolto(lez.svolto);
    const svolto = piano.map((b, i) => {
      const fatto = i < nuovo.blocco;
      const min = fatto ? Math.max(0, Math.round((nuovo.trascorsi[i] ?? b.minuti * 60) / 60)) : prima.find((s) => s.indice === i)?.minuti ?? b.minuti;
      return { indice: i, minuti: min, fatto: fatto && min > 0, ...(b.sostituto ? { sostituito: true } : {}), ...(b.sostituto?.esercizio_id ? { esercizio_id: b.sostituto.esercizio_id } : {}), ...(fatto && min === 0 ? { saltato: true } : {}) };
    });
    const { error } = await sb.from("lezioni").update({ svolto }).eq("id", lez.id);
    if (error) setMsg(error.message);
  }, [lez, piano, sb]);

  if (!caricamento && !cL && !errore && !errL && !lez) return null;
  const stato = StatoPagina({ caricamento: caricamento || cL || (!!d && (!pres || !tm) && piano.length > 0 && !msg), errore: errore ?? (errL === "nonTrovata" ? t.nonTrovata : errL), onRiprova: () => { ricarica(); ricL(); } });

  const blocco = tm ? piano[tm.blocco] : undefined;
  const prossimo = tm ? piano[tm.blocco + 1] : undefined;
  const resto = tm ? rimasti(tm, ora) : 0;
  const totBlocco = (blocco?.minuti ?? 0) * 60;
  const oltre = resto < 0;
  const mm = Math.floor(Math.abs(resto) / 60);
  const ss = Math.abs(resto) % 60;
  const inPausa = tm?.ripartito === null;
  const presenti = (pres ?? []).filter((p) => p.presente).length;
  const allievi = d?.allievi ?? [];
  const riga = (a: RAllievo) => (pres ?? []).find((p) => p.allievo_id === a.id);
  const nomeUltimo = allievi.find((a) => a.id === ultimo);

  function pausa() {
    if (!tm) return;
    const adesso = Date.now();
    setTm(tm.ripartito === null ? { ...tm, ripartito: adesso } : { ...tm, resto: rimasti(tm, adesso), ripartito: null });
  }
  function avanti() {
    if (!tm || !blocco || !prossimo) return;
    const adesso = Date.now();
    const trascorsi = [...tm.trascorsi];
    trascorsi[tm.blocco] = Math.max(0, blocco.minuti * 60 - rimasti(tm, adesso));
    const nuovo: Timer = { blocco: tm.blocco + 1, resto: prossimo.minuti * 60, ripartito: adesso, trascorsi };
    setTm(nuovo);
    void scriviSvolto(nuovo);
  }
  async function termina() {
    if (tm && blocco) {
      // il blocco in corso conta come fatto con il tempo realmente trascorso
      const trascorsi = [...tm.trascorsi];
      trascorsi[tm.blocco] = Math.max(0, blocco.minuti * 60 - rimasti(tm, Date.now()));
      await scriviSvolto({ ...tm, blocco: tm.blocco + 1, trascorsi });
    }
    router.push(r.chiusura(id));
  }

  async function imposta(a: RAllievo, valore: boolean) {
    const p = riga(a);
    if (!p) return;
    setPres((x) => (x ?? []).map((y) => (y.id === p.id ? { ...y, presente: valore } : y)));
    if (valore) setUltimo(a.id);
    const { error } = await sb.from("presenze").update({ presente: valore }).eq("id", p.id);
    if (error) { setMsg(fmt(t.errPres, { e: error.message })); setPres((x) => (x ?? []).map((y) => (y.id === p.id ? { ...y, presente: !valore } : y))); }
  }
  async function tuttiPresenti() {
    const daCambiare = (pres ?? []).filter((p) => !p.presente);
    if (!daCambiare.length) return;
    setPres((x) => (x ?? []).map((y) => ({ ...y, presente: true })));
    const { error } = await sb.from("presenze").update({ presente: true }).in("id", daCambiare.map((p) => p.id));
    if (error) { setMsg(fmt(t.errPres, { e: error.message })); setPres(pres); }
  }

  async function notaVocale(a: RAllievo | undefined) {
    if (registra?.fase === "rec") {
      // secondo tocco: ferma e salva
      rec.current?.mr.stop();
      return;
    }
    if (!a) { setScegli(true); return; }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) { setMsg(t.noMic); return; }
    setMsg(null); setSalvata(null);
    try {
      const flusso = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((x) => MediaRecorder.isTypeSupported(x));
      const mr = new MediaRecorder(flusso, tipo ? { mimeType: tipo } : undefined);
      const pezzi: Blob[] = [];
      mr.ondataavailable = (e) => { if (e.data.size) pezzi.push(e.data); };
      mr.onstop = async () => {
        flusso.getTracks().forEach((x) => x.stop());
        setRegistra({ allievo: a.id, fase: "salvo" });
        try {
          const mime = mr.mimeType || "audio/webm";
          const ext = mime.includes("mp4") ? "m4a" : "webm";
          const path = `${centro.id}/note-audio/${id}/${a.id}-${Date.now()}.${ext}`;
          const up = await sb.storage.from("centri").upload(path, new Blob(pezzi, { type: mime }), { contentType: mime, upsert: false });
          if (up.error) throw up.error;
          const p = riga(a);
          if (p) {
            const { error } = await sb.from("presenze").update({ nota_audio_path: path }).eq("id", p.id);
            if (error) throw error;
            setPres((x) => (x ?? []).map((y) => (y.id === p.id ? { ...y, nota_audio_path: path } : y)));
          }
          setSalvata(nomeBreve(a));
        } catch (e) {
          setMsg(fmt(t.errNota, { e: messaggioErrore(e) }));
        } finally {
          rec.current = null;
          setRegistra(null);
        }
      };
      rec.current = { mr, flusso, pezzi };
      mr.start();
      setRegistra({ allievo: a.id, fase: "rec" });
    } catch (e) {
      setMsg(fmt(t.errMic, { e: messaggioErrore(e) }));
    }
  }

  if (lez?.stato === "chiusa") {
    return (
      <SchermoCentro ruolo="maestro" tab="oggi" indietro={r.base} titolo={d?.gruppo?.nome} senzaBarra>
        <Vuoto titolo={t.gia} testo={t.giaTesto} icona="check" azione={<Btn href={r.chiusura(id)} pieno={false}>{t.vaiChiusura}</Btn>} />
      </SchermoCentro>
    );
  }
  const { campo } = d && dati ? campoEffettivo(d.gruppo ?? { id: "", campo_id: null }, lez!.data, dati.cambi, dati.campi, lez) : { campo: null };
  const nomeNota = registra ? allievi.find((a) => a.id === registra.allievo) : nomeUltimo;

  return (
    <SchermoCentro
      ruolo="maestro" tab="oggi" senzaBarra
      sopra={d ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="dot" style={{ width: 8, height: 8, background: "#FF5A5F" }} />{fmt(t.inCorso, { campo: nomeCampo(campo) || "—", ora: fmtOra(lez!.ora) })}</span> : undefined}
      titolo={d?.gruppo?.nome ?? ""}
      azioni={d ? <button type="button" className="chip on" style={{ height: 36, padding: "0 16px" }} onClick={termina}>{t.termina}</button> : undefined}
    >
      {stato ?? (d && dati && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 24 }}>
          {piano.length === 0 || !tm || !blocco ? <Nota icona="clock">{t.pianoVuoto}</Nota> : (
            <>
              <div className="card" style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, borderColor: "color-mix(in srgb, var(--brand) 35%, transparent)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="k" style={{ color: "var(--brand)" }}>{fmt(t.bloccoDi, { n: tm.blocco + 1, t: piano.length, m: blocco.minuti })}</span>
                  {blocco.modo === "bloccato" && <Tag><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Ico nome="lock" size={11} />{t.dalMetodo}</span></Tag>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{blocco.titolo} <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>· {titoloEsercizio(blocco, dati.esercizi)}</span></div>
                <div className="disp" role="timer" aria-live="off" aria-label={fmt(t.tempoRimasto, { m: mm, s: ss })}
                  style={{ fontSize: 132, lineHeight: 0.95, fontWeight: 800, textAlign: "center", letterSpacing: 1, fontVariantNumeric: "tabular-nums", color: oltre ? "#FF5A5F" : "var(--mc-fg)", padding: "2px 0" }}>
                  {oltre ? "+" : ""}{p2(mm)}:{p2(ss)}
                </div>
                {oltre && <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#FF5A5F" }}>{t.oltre}</div>}
                <div className="bar" style={{ height: 10 }}><i style={{ width: `${Math.min(100, Math.max(0, Math.round((1 - resto / Math.max(1, totBlocco)) * 100)))}%`, background: oltre ? "#FF5A5F" : "var(--brand)" }} /></div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={pausa} aria-label={inPausa ? t.riprendi : t.pausa} style={{ width: 52, height: 52, flex: "none", borderRadius: "50%", border: 0, background: "var(--brand)", color: "var(--brand-ink)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Ico nome={inPausa ? "play" : "pause"} size={22} />
                  </button>
                  <button type="button" className="btn2" style={{ height: 52 }} onClick={avanti} disabled={!prossimo}>{prossimo ? t.successivo : t.ultimo}<Ico nome="next" size={18} /></button>
                </div>
              </div>
              <div className="li" style={{ padding: "10px 12px" }}>
                <span className="k" style={{ width: 34, flex: "none" }}>{t.poi}</span>
                <span className="grow"><span className="t" style={{ display: "block", fontSize: 14 }}>{prossimo ? `${prossimo.titolo} · ${fmt(t.prossimoSotto, { m: prossimo.minuti })}` : t.chiusuraLezione}</span><span className="s" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prossimo ? titoloEsercizio(prossimo, dati.esercizi) : t.chiusuraSotto}</span></span>
              </div>
            </>
          )}

          <div className="sec" style={{ marginTop: 2 }}>
            <h2 style={{ fontSize: 16 }}>{fmt(t.appello, { p: presenti, t: allievi.length })}</h2>
            <button type="button" onClick={tuttiPresenti} style={{ background: "none", border: 0, color: "var(--brand)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>{t.tuttiPresenti}</button>
          </div>
          {allievi.length === 0 && <div className="s muted">{t.nessunAllievo}</div>}
          <div className="g2" style={{ gap: 6 }}>
            {allievi.map((a) => {
              const p = riga(a);
              const on = !!p?.presente;
              return (
                <button key={a.id} type="button" onClick={() => imposta(a, !on)} aria-pressed={on} aria-label={fmt(on ? t.presente : t.assente, { nome: nomeBreve(a) })} disabled={!p}
                  style={{ display: "flex", alignItems: "center", gap: 8, height: 50, padding: "0 10px 0 7px", borderRadius: 14, color: "var(--mc-fg)", cursor: "pointer", border: `1px solid ${on ? "rgba(76,208,125,.45)" : "rgba(255,255,255,.07)"}`, background: on ? "#12301F" : "var(--mc-card)" }}>
                  <span style={{ width: 32, height: 32, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: on ? "#2A6C4C" : "#2C2C2E", color: on ? "#fff" : "var(--mc-muted)" }}>{(a.nome[0] ?? "") + (a.cognome?.[0] ?? "")}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {nomeBreve(a)}{!on && d.assenti.has(a.id) && <span className="muted" style={{ display: "block", fontSize: 10.5, fontWeight: 600 }}>{t.avvisato}</span>}
                  </span>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", ...(on ? { background: "#4CD07D", color: "#0B0B0C" } : { border: "2px solid #3A3A3C", color: "transparent" }) }}><Ico nome="check" size={13} tratto={3} /></span>
                </button>
              );
            })}
          </div>

          {msg && <Nota icona="shield">{msg}</Nota>}
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            <button type="button" className="btn2" onClick={() => notaVocale(nomeUltimo)} disabled={registra?.fase === "salvo"} style={{ height: 52, fontSize: 14, ...(registra?.fase === "rec" ? { background: "#3A1517", color: "#FF5A5F" } : {}) }}>
              <Ico nome="mic" size={18} />
              {registra?.fase === "rec" ? t.notaRec : registra?.fase === "salvo" ? t.notaSalvo : salvata ? fmt(t.notaSalvata, { nome: salvata }) : nomeNota ? fmt(t.nota, { nome: nomeBreve(nomeNota) }) : t.notaPer.replace("…", "")}
            </button>
            <Link href={ROTTE.Carica} target="_blank" rel="noopener" className="btn2" style={{ height: 52, fontSize: 14 }}><Ico nome="video" size={18} />{t.colpo}</Link>
          </div>
          {nomeUltimo && !registra && <button type="button" onClick={() => setScegli(true)} style={{ background: "none", border: 0, color: "var(--brand)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", alignSelf: "center" }}>{t.cambiaAllievo}</button>}
        </div>
      ))}
      <Foglio aperto={scegli} onChiudi={() => setScegli(false)} titolo={t.notaPer}>
        <div className="chips">
          {allievi.map((a) => (
            <button key={a.id} type="button" className="chip" onClick={() => { setUltimo(a.id); setScegli(false); void notaVocale(a); }}>{nomeBreve(a)}</button>
          ))}
        </div>
      </Foglio>
    </SchermoCentro>
  );
}
