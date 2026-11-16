"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import { assicuraConversazione } from "./conversazioni";
import { BLOCCO, f, messaggioErrore, nomeMembro, quando, quandoLista, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Segnalazioni",
  sopra: "Visibili solo al direttore tecnico",
  riservato: "Accesso riservato",
  nonAutorizzato: "Le segnalazioni sono riservate al direttore tecnico e al titolare del centro.",
  nuove: "Nuove {n}",
  inCarico: "In carico {n}",
  chiuse: "Chiuse {n}",
  priorita: "Priorità {p}",
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
  sNuova: "Nuova",
  sPresa: "In carico",
  sChiusa: "Chiusa",
  vuoto: "Nessuna segnalazione in questo stato.",
  caricamento: "Carico le segnalazioni…",
  altre: "Carica altre segnalazioni",
  daAllievo: "Da un allievo",
  daGenitore: "Da un genitore",
  daAnonima: "Segnalazione anonima",
  daAltro: "Da un membro del centro",
  arrivata: "Arrivata {quando} dal pulsante Qualcosa non va?",
  maestroNo: "Il maestro non vede questa segnalazione.",
  maestroNoNome: "Il maestro non vede il nome di chi segnala.",
  conservata: "Conservata, non cancellabile.",
  riguardaDt: "Riguarda il direttore tecnico: la vede solo il titolare.",
  prendi: "Prendi in carico",
  scrivi: "Scrivi alla famiglia",
  chiudi: "Chiudi segnalazione",
  nota: "Aggiungi nota",
  riapri: "Riapri",
  cronologia: "Vedi cronologia",
  nascondiCron: "Nascondi cronologia",
  notaSegnaposto: "Scrivi una nota interna…",
  salva: "Salva la nota",
  noteVuote: "Nessuna nota ancora.",
  cambiaPriorita: "Priorità",
  avviso: "Se una segnalazione riguarda il direttore tecnico, arriva al titolare del centro.",
  c_adulto: "Comportamento di un adulto",
  c_sicurezza: "Sicurezza o infortunio",
  c_bullismo: "Problema nel gruppo o bullismo",
  c_chat: "Una chat che mi preoccupa",
  c_altro: "Altro",
  c_disagio: "Mi sento a disagio",
  c_infortunio: "Mi sono fatto male",
  c_gruppo: "Problema con il gruppo",
  nonTrovata: "Scegli una segnalazione dalla lista.",
};
const T = { it, en: { ...it } };

type Stato = "nuova" | "presa" | "chiusa";
type Seg = {
  id: string;
  created_at: string;
  autore_id: string | null;
  anonima: boolean;
  per_allievo_id: string | null;
  categoria: string;
  testo: string;
  priorita: "alta" | "media" | "bassa";
  stato: Stato;
  riguarda_dt: boolean;
};
type Extra = { autoreRuolo: string; autoreNome: string; gruppo: string };
type Nota = { id: string; autore_id: string; testo: string; created_at: string; autore: string };
const COL = "id,created_at,autore_id,anonima,per_allievo_id,categoria,testo,priorita,stato,riguarda_dt";
const PC: Record<string, string> = { alta: "#FF5A5F", media: "#FF9F43", bassa: "#4CD07D" };
const tagP = (p: string) => ({ background: p === "alta" ? "rgba(255,90,95,.16)" : p === "media" ? "rgba(255,159,67,.16)" : "rgba(76,208,125,.14)", color: PC[p] });

/** C13: segnalazioni a blocchi di 50 per stato, contatori con `count head`, solo titolare e DT. */
export default function CentroSegnalazioni() {
  const t = useT(T);
  const router = useRouter();
  const { sb, me, centro, ruolo, base } = useMio();
  const [stato, setStato] = useState<Stato>("nuova");
  const [lista, setLista] = useState<Seg[] | null>(null);
  const [ancora, setAncora] = useState(false);
  const [conta, setConta] = useState<Record<Stato, number>>({ nuova: 0, presa: 0, chiusa: 0 });
  const [extra, setExtra] = useState<Record<string, Extra>>({});
  const [selId, setSelId] = useState<string | null>(null);
  const [note, setNote] = useState<Nota[]>([]);
  const [mostraNote, setMostraNote] = useState(true);
  const [scrivi, setScrivi] = useState(false);
  const [bozza, setBozza] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ammesso = ruolo === "titolare" || ruolo === "dt";

  const contatori = useCallback(async () => {
    if (!sb || !centro) return;
    const q = (s: Stato) => sb.from("segnalazioni").select("id", { count: "exact", head: true }).eq("centro_id", centro.id).eq("stato", s);
    const [a, b, c] = await Promise.all([q("nuova"), q("presa"), q("chiusa")]);
    setConta({ nuova: a.count ?? 0, presa: b.count ?? 0, chiusa: c.count ?? 0 });
  }, [sb, centro]);

  // nomi di chi segnala e gruppo dell'allievo: una query per tabella sulle sole righe della pagina
  const arricchisci = useCallback(
    async (righe: Seg[]) => {
      if (!sb || !righe.length) return;
      const mIds = Array.from(new Set(righe.map((r) => r.autore_id).filter(Boolean))) as string[];
      const aIds = Array.from(new Set(righe.map((r) => r.per_allievo_id).filter(Boolean))) as string[];
      const [ms, isc] = await Promise.all([
        mIds.length ? sb.from("membri").select("id,nome,cognome,ruolo").in("id", mIds) : Promise.resolve({ data: [] }),
        aIds.length ? sb.from("iscrizioni").select("allievo_id,gruppo_id,al").in("allievo_id", aIds) : Promise.resolve({ data: [] }),
      ]);
      const iscr = ((isc ?? { data: [] }).data ?? []) as { allievo_id: string; gruppo_id: string; al: string | null }[];
      const gIds = Array.from(new Set(iscr.map((x) => x.gruppo_id)));
      const gr = gIds.length ? (await sb.from("gruppi").select("id,nome").in("id", gIds)).data ?? [] : [];
      const gN = new Map((gr as { id: string; nome: string }[]).map((g) => [g.id, g.nome]));
      const mN = new Map(((ms.data ?? []) as { id: string; nome: string; cognome: string | null; ruolo: string }[]).map((m) => [m.id, m]));
      const out: Record<string, Extra> = {};
      righe.forEach((r) => {
        const m = r.autore_id ? mN.get(r.autore_id) : undefined;
        const g = iscr.find((x) => x.allievo_id === r.per_allievo_id && !x.al);
        out[r.id] = { autoreRuolo: m?.ruolo ?? "", autoreNome: nomeMembro(m), gruppo: g ? gN.get(g.gruppo_id) ?? "" : "" };
      });
      setExtra((e) => ({ ...e, ...out }));
    },
    [sb]
  );

  const leggi = useCallback(
    async (da: number) => {
      if (!sb || !centro) return [];
      const { data, error } = await sb.from("segnalazioni").select(COL).eq("centro_id", centro.id).eq("stato", stato).order("created_at", { ascending: false }).range(da, da + BLOCCO - 1);
      if (error) throw error;
      return (data ?? []) as Seg[];
    },
    [sb, centro, stato]
  );

  useEffect(() => {
    if (!ammesso) return;
    setLista(null);
    setSelId(null);
    leggi(0)
      .then((r) => {
        setLista(r);
        setAncora(r.length === BLOCCO);
        arricchisci(r);
      })
      .catch((e) => {
        setErr(messaggioErrore(e));
        setLista([]);
      });
    contatori();
  }, [ammesso, leggi, arricchisci, contatori]);

  const corrente = lista?.find((x) => x.id === selId) ?? lista?.[0] ?? null;

  // cronologia: note della segnalazione scelta
  useEffect(() => {
    if (!sb || !corrente) return setNote([]);
    (async () => {
      const { data } = await sb.from("segnalazioni_note").select("id,autore_id,testo,created_at").eq("segnalazione_id", corrente.id).order("created_at").limit(100);
      const righe = (data ?? []) as Omit<Nota, "autore">[];
      const ids = Array.from(new Set(righe.map((n) => n.autore_id)));
      const { data: ms } = ids.length ? await sb.from("membri").select("id,nome,cognome").in("id", ids) : { data: [] };
      const nm = new Map(((ms ?? []) as { id: string; nome: string; cognome: string | null }[]).map((m) => [m.id, nomeMembro(m)]));
      setNote(righe.map((n) => ({ ...n, autore: nm.get(n.autore_id) ?? "" })));
    })();
  }, [sb, corrente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cambia(s: Seg, patch: Partial<Seg>) {
    if (!sb) return;
    setErr(null);
    const { error } = await sb.from("segnalazioni").update(patch).eq("id", s.id);
    if (error) return setErr(messaggioErrore(error));
    // se cambia lo stato la riga esce dalla lista corrente
    setLista((l) => (l ? (patch.stato && patch.stato !== stato ? l.filter((x) => x.id !== s.id) : l.map((x) => (x.id === s.id ? { ...x, ...patch } : x))) : l));
    if (patch.stato) contatori();
  }
  async function salvaNota(s: Seg) {
    if (!sb || !centro || !me || !bozza.trim()) return;
    const { data, error } = await sb.from("segnalazioni_note").insert({ centro_id: centro.id, segnalazione_id: s.id, autore_id: me.id, testo: bozza.trim() }).select("id,autore_id,testo,created_at").single();
    if (error) return setErr(messaggioErrore(error));
    setNote((n) => [...n, { ...(data as Omit<Nota, "autore">), autore: nomeMembro(me) }]);
    setBozza("");
    setScrivi(false);
    setMostraNote(true);
  }
  // "Scrivi alla famiglia": apre (o crea) la chat famiglia-segreteria dell'allievo con i suoi genitori
  async function scriviFamiglia(s: Seg) {
    if (!sb || !centro || !me) return;
    setErr(null);
    try {
      let genitori: string[] = [];
      if (s.per_allievo_id) {
        const { data } = await sb.from("allievi_famiglie").select("membro_id").eq("allievo_id", s.per_allievo_id);
        genitori = ((data ?? []) as { membro_id: string }[]).map((x) => x.membro_id);
      }
      if (!genitori.length && s.autore_id) genitori = [s.autore_id];
      const id = await assicuraConversazione(sb, centro.id, me.id, "famiglia_segreteria", s.per_allievo_id, genitori.map((g) => ({ membro_id: g })));
      router.push(`${base}/chat/${id}`);
    } catch (e) {
      setErr(messaggioErrore(e));
    }
  }

  const P: Record<string, string> = { alta: t.alta, media: t.media, bassa: t.bassa };
  const S: Record<string, string> = { nuova: t.sNuova, presa: t.sPresa, chiusa: t.sChiusa };
  const C: Record<string, string> = { adulto: t.c_adulto, sicurezza: t.c_sicurezza, bullismo: t.c_bullismo, chat: t.c_chat, altro: t.c_altro, disagio: t.c_disagio, infortunio: t.c_infortunio, gruppo: t.c_gruppo };
  const da = (s: Seg) => {
    const e = extra[s.id];
    const chi = !s.autore_id ? t.daAnonima : e?.autoreRuolo === "allievo" ? t.daAllievo : e?.autoreRuolo === "genitore" ? t.daGenitore : t.daAltro;
    return e?.gruppo ? `${chi} · ${e.gruppo}` : chi;
  };

  return (
    <SchermoCentro ruolo="dt" tab="tutela" titolo={t.titolo} sopra={t.sopra} indietro={`${base}/dt`} largo azioni={<span className="ic" role="img" aria-label={t.riservato} style={{ borderRadius: "50%" }}><Ic n="lock" size={18} /></span>}>
      {!me || !centro ? (
        <Caric testo={t.caricamento} />
      ) : !ammesso ? (
        <ErroreC testo={t.nonAutorizzato} />
      ) : (
        <div className="cm-col">
          <div className="seg" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
            {([["nuova", f(t.nuove, { n: conta.nuova })], ["presa", f(t.inCarico, { n: conta.presa })], ["chiusa", f(t.chiuse, { n: conta.chiusa })]] as [Stato, string][]).map(([k, l]) => (
              <button key={k} type="button" className={k === stato ? "sg on" : "sg"} onClick={() => setStato(k)}>{l}</button>
            ))}
          </div>
          <ErroreC testo={err} />
          {lista === null ? (
            <Caric testo={t.caricamento} />
          ) : lista.length === 0 ? (
            <VuotoC>{t.vuoto}</VuotoC>
          ) : (
            <div className="cm-due pari">
              <div className="cm-col s">
                {lista.map((r) => (
                  <button key={r.id} type="button" className="li" style={{ width: "100%", boxSizing: "border-box", textAlign: "left", fontFamily: "inherit", cursor: "pointer", padding: "9px 12px", border: `1px solid ${r.id === corrente?.id ? "#D8F34A" : "rgba(255,255,255,.06)"}` }} onClick={() => setSelId(r.id)}>
                    <span className="dot" style={{ background: PC[r.priorita] }} />
                    <span className="grow">
                      <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{C[r.categoria] ?? r.categoria}</span>
                      <span style={{ display: "block", fontSize: 12, color: "#A1A1A6", marginTop: 1 }}>{da(r)} · {quandoLista(r.created_at)}</span>
                    </span>
                    <span className="cm-tag" style={tagP(r.priorita)}>{P[r.priorita]}</span>
                  </button>
                ))}
                {ancora && (
                  <button type="button" className="cm-bt2" onClick={async () => { const r = await leggi(lista.length); setLista([...lista, ...r]); setAncora(r.length === BLOCCO); arricchisci(r); }}>{t.altre}</button>
                )}
              </div>

              {corrente ? (
                <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span className="code">SEG-{corrente.id.slice(0, 4).toUpperCase()}</span>
                    <span className="cm-tag" style={tagP(corrente.priorita)}>{f(t.priorita, { p: P[corrente.priorita] })}</span>
                    <span className="tag">{S[corrente.stato]}</span>
                    {corrente.riguarda_dt && <span className="cm-tag r">DT</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{C[corrente.categoria] ?? corrente.categoria}</div>
                  <div style={{ fontSize: 12.5, color: "#A1A1A6", lineHeight: 1.4 }}>
                    {da(corrente)}
                    {extra[corrente.id]?.autoreNome && !corrente.anonima ? ` · ${extra[corrente.id].autoreNome}` : ""}
                    <br />
                    {f(t.arrivata, { quando: quando(corrente.created_at) })}
                  </div>
                  <div className="note" style={{ color: "#E5E5EA", whiteSpace: "pre-wrap" }}>{corrente.testo}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#A1A1A6" }}>
                    <Ic n="lock" size={14} />
                    <span>{corrente.riguarda_dt ? t.riguardaDt : corrente.stato === "chiusa" ? t.conservata : corrente.anonima ? t.maestroNoNome : t.maestroNo}</span>
                  </div>
                  <div className="chips" role="group" aria-label={t.cambiaPriorita}>
                    {(["alta", "media", "bassa"] as const).map((p) => (
                      <button key={p} type="button" className={p === corrente.priorita ? "chip on" : "chip"} style={{ height: 28, fontSize: 12 }} onClick={() => cambia(corrente, { priorita: p })}>{P[p]}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {corrente.stato === "nuova" && <button type="button" className="btn" style={{ flex: 1, height: 46, fontSize: 14 }} onClick={() => cambia(corrente, { stato: "presa" })}>{t.prendi}</button>}
                    {corrente.stato === "presa" && <button type="button" className="btn" style={{ flex: 1, height: 46, fontSize: 14 }} onClick={() => cambia(corrente, { stato: "chiusa" })}>{t.chiudi}</button>}
                    {corrente.stato === "chiusa" && <button type="button" className="btn" style={{ flex: 1, height: 46, fontSize: 14 }} onClick={() => cambia(corrente, { stato: "presa" })}>{t.riapri}</button>}
                    {corrente.stato !== "chiusa" ? (
                      <button type="button" className="btn2" style={{ height: 46, fontSize: 14 }} onClick={() => setScrivi((v) => !v)}>{t.nota}</button>
                    ) : (
                      <button type="button" className="btn2" style={{ height: 46, fontSize: 14 }} onClick={() => setMostraNote((v) => !v)}>{mostraNote ? t.nascondiCron : t.cronologia}</button>
                    )}
                    {corrente.stato === "nuova" && <button type="button" className="btn2" style={{ height: 46, fontSize: 14 }} onClick={() => scriviFamiglia(corrente)}>{t.scrivi}</button>}
                  </div>
                  {scrivi && (
                    <div className="cm-col s">
                      <textarea className="cm-ta" value={bozza} onChange={(e) => setBozza(e.target.value)} placeholder={t.notaSegnaposto} aria-label={t.notaSegnaposto} maxLength={1000} />
                      <button type="button" className="cm-bt" style={{ height: 42 }} disabled={!bozza.trim()} onClick={() => salvaNota(corrente)}>{t.salva}</button>
                    </div>
                  )}
                  {mostraNote && note.length > 0 && (
                    <div className="cm-col s">
                      {note.map((n) => (
                        <div key={n.id} className="note">
                          <b style={{ color: "#E5E5EA" }}>{n.autore}</b> · {quando(n.created_at)}
                          <div style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{n.testo}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <VuotoC>{t.nonTrovata}</VuotoC>
              )}
            </div>
          )}
          <div className="note">{t.avviso}</div>
        </div>
      )}
    </SchermoCentro>
  );
}
