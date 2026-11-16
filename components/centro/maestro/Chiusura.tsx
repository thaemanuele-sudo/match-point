"use client";
// M7 · Chiusura lezione: fatto davvero contro il piano (motivo obbligatorio se c'è scostamento), voto rapido per allievo,
// compito per casa e riassunto AI per le famiglie da approvare. La chiusura passa dalla RPC chiudi_lezione.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Campo, Foglio, Ico, Nota, Tag, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, isoGiorno, prossimeLezioni } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { assicuraPresenze, messaggioErrore, useLezione, useMaestroDati } from "./dati";
import { StatoPagina } from "./piccoli";
import {
  campoEffettivo, fmt, leggiMotivi, leggiPiano, leggiSvolto, nomeBreve, nomeCampo, norm, situazioneProgramma,
  type Blocco, type RPresenza,
} from "./util";

const IT = {
  titolo: "Chiusura lezione", sopra: "{gruppo} · {data} {ora} · {campo}", oggi: "oggi", fattoSu: "Fatto {f}' su {p}'", fattoDavvero: "Fatto davvero", piano: "Piano: {n}'",
  bloccato: "Bloccato", flessibile: "Flessibile", libero: "Libero", sostituito: "Cambiato", meno: "Meno cinque minuti: {nome}", piu: "Più cinque minuti: {nome}",
  motivo: "Perché è diverso dal piano?", motivoObbl: "Motivo obbligatorio", mGruppo: "Gruppo più lento", mTempo: "Tempo perso", mCampo: "Campo o meteo", mPochi: "Pochi presenti", mAltro: "Altro", altroPh: "Scrivi il motivo",
  comeAndati: "Come sono andati", unTocco: "Un tocco a testa", daRivedere: "Da rivedere", bene: "Bene", ottimo: "Ottimo", nessunPresente: "Nessun presente: niente voti da dare.",
  compitoPerCasa: "COMPITO PER CASA", nessunCompito: "Nessun compito: tocca per aggiungerlo", tuttoGruppo: "Tutto il gruppo", compitoTitolo: "Compito per casa", compitoNome: "Cosa devono fare?", compitoMin: "Durata in minuti", compitoScadenza: "Da consegnare entro",
  compitoLibreria: "Dalla libreria del centro", togli: "Nessun compito", salva: "Fatto",
  riassunto: "Riassunto per le famiglie", bozza: "Bozza Coach AI", daChiudere: "Il riassunto si prepara quando chiudi la lezione: il Coach AI lo scrive dal lavoro svolto e tu lo approvi prima che le famiglie lo vedano.",
  preparo: "Il Coach AI sta scrivendo il riassunto…", modifica: "Modifica", fineModifica: "Fatto", approva: "Approva e invia", inviato: "Inviato a {n} famiglie", inviato1: "Inviato a 1 famiglia", approvato: "Approvato da te",
  inviatoTesto: "Le famiglie lo trovano nella lezione di oggi. Compito e valutazioni sono salvati nella scheda di ogni allievo.", rivedi: "Rivedi", tornaOggi: "Torna a Oggi", prepara: "Prepara il riassunto", riprova: "Riprova",
  chiudi: "Chiudi lezione", chiusa: "Lezione chiusa", chiudoLavoro: "Chiudo la lezione…", mancanoMotivi: "Manca il motivo in {n} blocchi diversi dal piano.",
  errChiudi: "Non riesco a chiudere la lezione: {e}", errAi: "Il riassunto non è pronto: {e}", errApprova: "Non riesco a salvare l'approvazione: {e}", nonTrovata: "Lezione non trovata", nonTrovataTesto: "La lezione non esiste oppure non è tua.",
  pianoVuoto: "Il piano non ha blocchi.",
};
const T = { it: IT, en: { ...IT } };
const VOTI = [1, 2, 3] as const;
type Compito = { titolo: string; durata_min: number; esercizio_id: string | null; scadenza: string | null };

export function Chiusura({ id }: { id: string }) {
  const t = useT(T);
  const { centro, membroAttivo: ma, sb } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const { d, errore: errL, ricarica: ricL, caricamento: cL } = useLezione(id, dati);
  const [piano, setPiano] = useState<Blocco[]>([]);
  const [fatto, setFatto] = useState<number[]>([]);
  const [motivi, setMotivi] = useState<Record<string, string>>({});
  const [altro, setAltro] = useState<Set<number>>(new Set());
  const [pres, setPres] = useState<RPresenza[] | null>(null);
  const [compito, setCompito] = useState<Compito | null>(null);
  const [fCompito, setFCompito] = useState(false);
  const [bozza, setBozza] = useState<Compito>({ titolo: "", durata_min: 10, esercizio_id: null, scadenza: null });
  const [chiusa, setChiusa] = useState(false);
  const [riassunto, setRiassunto] = useState("");
  const [ok, setOk] = useState(false);
  const [modifica, setModifica] = useState(false);
  const [stAi, setStAi] = useState<"no" | "scrivo" | "pronto" | "errore">("no");
  const [famiglie, setFamiglie] = useState(0);
  const [lavoro, setLavoro] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mancano, setMancano] = useState(false);

  const lez = d?.lezione ?? null;
  const presenti = useMemo(() => (d && pres ? d.allievi.filter((a) => pres.find((p) => p.allievo_id === a.id)?.presente) : []), [d, pres]);

  // valori di partenza dal piano e da quello che il timer ha già registrato (svolto)
  useEffect(() => {
    if (!d || !dati) return;
    const p = leggiPiano(d.lezione.piano);
    const sv = leggiSvolto(d.lezione.svolto);
    const timerUsato = sv.some((s) => s.fatto || s.saltato);
    setPiano(p);
    setFatto(p.map((b, i) => { const s = sv.find((x) => x.indice === i); return s && s.fatto ? s.minuti : timerUsato ? 0 : b.minuti; }));
    setMotivi(leggiMotivi(d.lezione.motivi_scostamento));
    setChiusa(d.lezione.stato === "chiusa");
    setRiassunto(d.lezione.riassunto ?? "");
    setOk(d.lezione.riassunto_ok === true);
    setStAi(d.lezione.riassunto ? "pronto" : "no");
    if (d.lezione.compito) setCompito({ titolo: d.lezione.compito, durata_min: 10, esercizio_id: null, scadenza: null });
    let vivo = true;
    assicuraPresenze(sb, centro.id, d).then((x) => { if (vivo) setPres(x); }).catch((e) => { if (vivo) setMsg(messaggioErrore(e)); });
    return () => { vivo = false; };
  }, [d, dati, sb, centro.id]);

  // suggerimento di compito: un esercizio della libreria sul colpo del mese, per la fascia del gruppo
  const suggeriti = useMemo(() => {
    if (!d || !dati) return [];
    const sit = situazioneProgramma(d.gruppo?.programma_id ? dati.programmi.get(d.gruppo.programma_id) : null, d.lezione.data);
    const colpo = norm(sit?.colpo || sit?.tema || "").slice(0, 4);
    const fascia = d.gruppo?.fascia ?? null;
    const tutti = [...dati.esercizi.values()].filter((e) => !fascia || !e.fasce?.length || e.fasce.includes(fascia));
    return [...tutti.filter((e) => colpo && norm(e.colpo ?? "").startsWith(colpo)), ...tutti.filter((e) => !colpo || !norm(e.colpo ?? "").startsWith(colpo))].slice(0, 6);
  }, [d, dati]);

  if (!caricamento && !cL && !errore && !errL && !lez) return null;
  if (errL === "nonTrovata") return <SchermoCentro ruolo="maestro" tab="oggi" indietro={r.base} titolo={t.nonTrovata}><Vuoto titolo={t.nonTrovata} testo={t.nonTrovataTesto} icona="cal" /></SchermoCentro>;

  const scost = (b: Blocco, i: number) => (fatto[i] ?? b.minuti) !== b.minuti;
  const senzaMotivo = piano.map((b, i) => (scost(b, i) && !(motivi[String(i)] ?? "").trim() ? i : -1)).filter((i) => i >= 0);
  const totFatto = fatto.reduce((s, x) => s + x, 0);
  const totPiano = piano.reduce((s, b) => s + b.minuti, 0);

  function passo(i: number, delta: number) {
    setFatto((f) => f.map((x, k) => (k === i ? Math.max(0, Math.min(180, x + delta)) : x)));
    setMancano(false);
  }
  async function voto(a: string, v: number) {
    const p = pres?.find((x) => x.allievo_id === a);
    if (!p) return;
    setPres((x) => (x ?? []).map((y) => (y.id === p.id ? { ...y, voto_rapido: v } : y)));
  }

  async function generaRiassunto(lezioneId: string) {
    setStAi("scrivo"); setMsg(null);
    try {
      const res = await fetch("/api/centro/riassunto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lezione_id: lezioneId }) });
      const j = (await res.json().catch(() => ({}))) as { riassunto?: string; messaggio?: string };
      if (!res.ok || !j.riassunto) throw new Error(j.messaggio ?? `errore ${res.status}`);
      setRiassunto(j.riassunto); setOk(false); setStAi("pronto");
    } catch (e) {
      setStAi("errore");
      setMsg(fmt(t.errAi, { e: messaggioErrore(e) }));
    }
  }

  async function chiudi() {
    if (!lez || !pres || !d) return;
    if (senzaMotivo.length) { setMancano(true); return; }
    setLavoro(true); setMsg(null);
    // svolto parallelo al piano (contratto con l'area B) e motivi per indice
    const svolto = piano.map((b, i) => ({
      indice: i, minuti: fatto[i] ?? b.minuti, fatto: (fatto[i] ?? b.minuti) > 0,
      ...(b.sostituto ? { sostituito: true } : {}), ...(b.sostituto?.esercizio_id ? { esercizio_id: b.sostituto.esercizio_id } : {}), ...((fatto[i] ?? b.minuti) === 0 ? { saltato: true } : {}),
    }));
    const motiviOut: Record<string, string> = {};
    piano.forEach((b, i) => { if (scost(b, i)) motiviOut[String(i)] = (motivi[String(i)] ?? "").trim(); });
    const presenze = pres.map((p) => ({ allievo_id: p.allievo_id, presente: !!p.presente, voto_rapido: p.presente ? p.voto_rapido : null, nota: p.nota }));
    try {
      const m = await sb.from("lezioni").update({ motivi_scostamento: motiviOut }).eq("id", lez.id);
      if (m.error) throw m.error;
      const rpc = await sb.rpc("chiudi_lezione", { lezione: lez.id, svolto, presenze, compito });
      if (rpc.error) {
        // la funzione non c'è ancora o ha un'altra firma: stesse scritture, una per tabella, perché la lezione si chiuda comunque
        if (!/PGRST202|42883|Could not find the function/i.test(`${rpc.error.code ?? ""} ${rpc.error.message}`)) throw rpc.error;
        const u = await sb.from("lezioni").update({ svolto, stato: "chiusa", compito: compito?.titolo ?? null }).eq("id", lez.id);
        if (u.error) throw u.error;
        const up = await sb.from("presenze").upsert(pres.map((p) => ({ id: p.id, centro_id: centro.id, lezione_id: lez.id, allievo_id: p.allievo_id, presente: !!p.presente, voto_rapido: p.presente ? p.voto_rapido : null })), { onConflict: "id" });
        if (up.error) throw up.error;
        if (compito && ma) {
          const c = await sb.from("compiti").insert({ centro_id: centro.id, gruppo_id: lez.gruppo_id, maestro_id: ma.id, titolo: compito.titolo, durata_min: compito.durata_min, esercizio_id: compito.esercizio_id, scadenza: compito.scadenza });
          if (c.error) throw c.error;
        }
      }
      try { localStorage.removeItem(`mp-lezione-timer-${lez.id}`); } catch { /* niente da togliere */ }
      setChiusa(true);
      setLavoro(false);
      ricL();
      await generaRiassunto(lez.id);
    } catch (e) {
      setMsg(fmt(t.errChiudi, { e: messaggioErrore(e) }));
      setLavoro(false);
    }
  }

  async function approva() {
    if (!lez) return;
    setLavoro(true); setMsg(null);
    const { error } = await sb.from("lezioni").update({ riassunto: riassunto.trim(), riassunto_ok: true }).eq("id", lez.id);
    if (error) { setMsg(fmt(t.errApprova, { e: error.message })); setLavoro(false); return; }
    // famiglie dei presenti (una query sola per tutti), avvisate con una notifica; se non si può scrivere, l'approvazione vale lo stesso
    const ids = presenti.map((a) => a.id);
    let n = 0;
    if (ids.length) {
      const f = await sb.from("allievi_famiglie").select("allievo_id,membro_id").in("allievo_id", ids);
      const righe = (f.data ?? []) as { allievo_id: string; membro_id: string }[];
      n = new Set(righe.map((x) => x.allievo_id)).size;
      const gen = [...new Set(righe.map((x) => x.membro_id))];
      if (gen.length) {
        await sb.from("notifiche").insert(gen.map((mid) => ({
          centro_id: centro.id, membro_id: mid, tipo: "sistema", titolo: `${d?.gruppo?.nome ?? ""}: riassunto della lezione`, testo: riassunto.trim().slice(0, 200),
          link: rotta(centro.slug).genitore.base, mittente: ma ? [ma.nome, ma.cognome].filter(Boolean).join(" ") : null,
        })));
      }
    }
    setFamiglie(n); setOk(true); setModifica(false); setLavoro(false);
  }
  async function rivedi() {
    if (!lez) return;
    const { error } = await sb.from("lezioni").update({ riassunto_ok: false }).eq("id", lez.id);
    if (error) { setMsg(fmt(t.errApprova, { e: error.message })); return; }
    setOk(false);
  }

  const stato = StatoPagina({ caricamento: caricamento || cL || (!!d && !pres && !msg), errore: errore ?? errL, onRiprova: () => { ricarica(); ricL(); } });
  const { campo } = d && dati ? campoEffettivo(d.gruppo ?? { id: "", campo_id: null }, d.lezione.data, dati.cambi, dati.campi, d.lezione) : { campo: null };
  const sopra = d ? fmt(t.sopra, { gruppo: d.gruppo?.nome ?? "", data: d.lezione.data === isoGiorno() ? t.oggi : d.lezione.data, ora: d.lezione.ora?.slice(0, 5) ?? "", campo: nomeCampo(campo) }) : undefined;
  const motiviPronti = [t.mGruppo, t.mTempo, t.mCampo, t.mPochi];

  function apriCompito() {
    if (chiusa) return;
    const prossima = d?.gruppo ? prossimeLezioni([d.gruppo], { da: aggiungiGiorni(d.lezione.data, 1), giorniAvanti: 14, max: 1 })[0] : null;
    setBozza(compito ? { ...compito, scadenza: compito.scadenza ?? prossima?.data ?? null } : { titolo: "", durata_min: 10, esercizio_id: null, scadenza: prossima?.data ?? null });
    setFCompito(true);
  }

  return (
    <SchermoCentro ruolo="maestro" tab="oggi" indietro={r.inCorso(id)} sopra={sopra} titolo={t.titolo}
      azioni={d ? <span className="tag" style={{ background: "#0B0B0C", border: "1px solid #2C2C2E", color: "var(--brand)" }}>{fmt(t.fattoSu, { f: totFatto, p: totPiano })}</span> : undefined}>
      {stato ?? (d && dati && pres && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="sec"><h2>{t.fattoDavvero}</h2><span className="muted" style={{ fontWeight: 600 }}>{fmt(t.piano, { n: totPiano })}</span></div>
          {piano.length === 0 && <div className="s muted">{t.pianoVuoto}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {piano.map((b, i) => {
              const diff = (fatto[i] ?? b.minuti) - b.minuti;
              const k = String(i);
              const manca = mancano && senzaMotivo.includes(i);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="li" style={{ padding: "5px 8px 5px 12px", gap: 8, borderRadius: 14, minHeight: 36, borderColor: manca ? "#FF5A5F" : undefined }}>
                    <span className="grow" style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.titolo}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", flex: "none", background: b.modo === "bloccato" ? "#232326" : "#12281D", color: b.modo === "bloccato" ? "#A1A1A6" : "#4CD07D" }}>{b.sostituto ? t.sostituito : t[b.modo]}</span>
                    </span>
                    {diff !== 0 && <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD54A" }}>{diff > 0 ? "+" : "−"}{Math.abs(diff)}&apos;</span>}
                    <button type="button" disabled={chiusa} aria-label={fmt(t.meno, { nome: b.titolo })} onClick={() => passo(i, -5)} style={{ width: 26, height: 26, borderRadius: "50%", border: 0, background: "#2C2C2E", color: "var(--mc-fg)", fontSize: 16, fontWeight: 700, lineHeight: 1, cursor: "pointer", flex: "none" }}>&#8722;</button>
                    <span className="disp" style={{ width: 34, textAlign: "center", fontSize: 21, fontWeight: 800 }}>{fatto[i] ?? b.minuti}&apos;</span>
                    <button type="button" disabled={chiusa} aria-label={fmt(t.piu, { nome: b.titolo })} onClick={() => passo(i, 5)} style={{ width: 26, height: 26, borderRadius: "50%", border: 0, background: "var(--brand)", color: "var(--brand-ink)", fontSize: 16, fontWeight: 800, lineHeight: 1, cursor: "pointer", flex: "none" }}>+</button>
                  </div>
                  {scost(b, i) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 4px 4px" }}>
                      <span className="k" style={{ color: manca ? "#FF5A5F" : undefined }}>{t.motivo} · {t.motivoObbl}</span>
                      <div className="chips">
                        {[...motiviPronti, t.mAltro].map((m) => {
                          const on = m === t.mAltro ? altro.has(i) || (!!motivi[k] && !motiviPronti.includes(motivi[k])) : motivi[k] === m;
                          return <button key={m} type="button" disabled={chiusa} className={`chip${on ? " on" : ""}`} style={{ height: 28, fontSize: 12 }}
                            onClick={() => { if (m === t.mAltro) { setAltro((s) => new Set(s).add(i)); setMotivi((x) => ({ ...x, [k]: motiviPronti.includes(x[k]) ? "" : x[k] ?? "" })); } else { setAltro((s) => { const n = new Set(s); n.delete(i); return n; }); setMotivi((x) => ({ ...x, [k]: m })); } setMancano(false); }}>{m}</button>;
                        })}
                      </div>
                      {(altro.has(i) || (!!motivi[k] && !motiviPronti.includes(motivi[k]))) && (
                        <input className="mc-input" disabled={chiusa} value={motivi[k] ?? ""} placeholder={t.altroPh} maxLength={140} aria-label={t.altroPh} onChange={(e) => { setMotivi((x) => ({ ...x, [k]: e.target.value })); setMancano(false); }} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sec" style={{ marginTop: 4 }}><h2>{t.comeAndati}</h2><span className="muted" style={{ fontWeight: 600 }}>{t.unTocco}</span></div>
          {presenti.length === 0 && <div className="s muted">{t.nessunPresente}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {presenti.map((a) => {
              const v = pres.find((p) => p.allievo_id === a.id)?.voto_rapido ?? null;
              const stili = [{ background: "#3A2A12", color: "#FFB45A" }, { background: "#2C2C2E", color: "#F3F6F1" }, { background: "var(--brand)", color: "var(--brand-ink)" }];
              return (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "78px minmax(0,1fr)", gap: 8, alignItems: "center", padding: "3px 4px 3px 12px", borderRadius: 14, background: "var(--mc-card)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nomeBreve(a)}</span>
                  <div className="seg" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 3, padding: 3, background: "#0E0E10" }}>
                    {VOTI.map((n, k) => (
                      <button key={n} type="button" disabled={chiusa} className="sg" aria-pressed={v === n}
                        style={v === n ? stili[k] : undefined}
                        onClick={() => voto(a.id, n)}>{[t.daRivedere, t.bene, t.ottimo][k]}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" className="li" onClick={apriCompito} style={{ padding: "8px 12px", gap: 10, borderRadius: 16, marginTop: 2, textAlign: "left", width: "100%" }}>
            <span className="ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Ico nome="target" size={16} /></span>
            <span className="grow"><span className="k" style={{ display: "block" }}>{t.compitoPerCasa}</span><span style={{ display: "block", fontSize: 13.5, fontWeight: 700, marginTop: 1 }}>{compito?.titolo || t.nessunCompito}</span></span>
            {compito && <Tag>{t.tuttoGruppo}</Tag>}
          </button>

          {msg && <Nota icona="shield">{msg}</Nota>}
          {mancano && senzaMotivo.length > 0 && <Nota icona="lock">{fmt(t.mancanoMotivi, { n: senzaMotivo.length })}</Nota>}

          {!chiusa && <Btn onClick={chiudi} disabled={lavoro || piano.length === 0}>{lavoro ? t.chiudoLavoro : t.chiudi}</Btn>}
          {chiusa && <Tag colore="#4CD07D" sfondo="#10281B">{t.chiusa}</Tag>}

          <div className="card" style={{ padding: "11px 12px", display: "flex", flexDirection: "column", gap: 8, borderColor: ok ? "rgba(76,208,125,.45)" : "color-mix(in srgb, var(--brand) 28%, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: ok ? "#4CD07D" : "var(--brand)", display: "flex" }}><Ico nome={ok ? "check" : "spark"} size={18} /></span>
              <span style={{ fontSize: 14, fontWeight: 800 }} className="grow">{ok ? (famiglie === 1 ? t.inviato1 : famiglie > 0 ? fmt(t.inviato, { n: famiglie }) : t.riassunto) : t.riassunto}</span>
              <Tag colore={ok ? "#4CD07D" : "var(--brand)"} sfondo={ok ? "#10281B" : "#2A2A10"}>{ok ? t.approvato : t.bozza}</Tag>
            </div>
            {stAi === "no" && !chiusa && <div style={{ fontSize: 12.5, lineHeight: 1.42, color: "var(--mc-muted)" }}>{t.daChiudere}</div>}
            {stAi === "no" && chiusa && <Btn variante="secondario" onClick={() => lez && generaRiassunto(lez.id)}>{t.prepara}</Btn>}
            {stAi === "scrivo" && <div style={{ fontSize: 12.5, color: "var(--mc-muted)" }} role="status">{t.preparo}</div>}
            {stAi === "errore" && <Btn variante="secondario" onClick={() => lez && generaRiassunto(lez.id)}>{t.riprova}</Btn>}
            {stAi === "pronto" && (modifica && !ok
              ? <textarea className="mc-input" rows={6} value={riassunto} aria-label={t.riassunto} onChange={(e) => setRiassunto(e.target.value)} />
              : <div style={{ fontSize: 12.5, lineHeight: 1.42, color: ok ? "var(--mc-muted)" : "#D6D6DA", whiteSpace: "pre-wrap" }}>{riassunto}</div>)}
            {stAi === "pronto" && !ok && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8 }}>
                <Btn variante="secondario" onClick={() => setModifica((m) => !m)}>{modifica ? t.fineModifica : t.modifica}</Btn>
                <Btn onClick={approva} disabled={lavoro || !riassunto.trim()}>{t.approva}</Btn>
              </div>
            )}
            {ok && (
              <>
                <div style={{ fontSize: 12.5, lineHeight: 1.42, color: "var(--mc-muted)" }}>{t.inviatoTesto}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8 }}>
                  <Btn variante="secondario" onClick={rivedi}>{t.rivedi}</Btn>
                  <Btn href={r.base}>{t.tornaOggi}</Btn>
                </div>
              </>
            )}
          </div>
          <Link href={r.base} style={{ textAlign: "center", fontSize: 13, fontWeight: 700 }}>{t.tornaOggi}</Link>
        </div>
      ))}
      <Foglio aperto={fCompito} onChiudi={() => setFCompito(false)} titolo={t.compitoTitolo}>
        <Campo etichetta={t.compitoNome} valore={bozza.titolo} onChange={(v) => setBozza((b) => ({ ...b, titolo: v, esercizio_id: null }))} multiriga righe={2} maxLength={200} />
        <Campo etichetta={t.compitoMin} tipo="number" valore={String(bozza.durata_min)} onChange={(v) => setBozza((b) => ({ ...b, durata_min: Math.max(1, Math.min(120, Number(v) || 1)) }))} />
        <Campo etichetta={t.compitoScadenza} tipo="date" valore={bozza.scadenza ?? ""} onChange={(v) => setBozza((b) => ({ ...b, scadenza: v || null }))} />
        {suggeriti.length > 0 && (
          <>
            <div className="k">{t.compitoLibreria}</div>
            <div className="chips">
              {suggeriti.map((e) => <button key={e.id} type="button" className={`chip${bozza.esercizio_id === e.id ? " on" : ""}`} onClick={() => setBozza((b) => ({ ...b, titolo: e.titolo, durata_min: e.durata_min ?? b.durata_min, esercizio_id: e.id }))}>{e.titolo}</button>)}
            </div>
          </>
        )}
        <Btn disabled={!bozza.titolo.trim()} onClick={() => { setCompito({ ...bozza, titolo: bozza.titolo.trim() }); setFCompito(false); }}>{t.salva}</Btn>
        <Btn variante="fantasma" onClick={() => { setCompito(null); setFCompito(false); }}>{t.togli}</Btn>
      </Foglio>
    </SchermoCentro>
  );
}

