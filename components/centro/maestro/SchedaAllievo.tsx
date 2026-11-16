"use client";
// M4 · Scheda allievo: competenze per colpo, lavoro (video, compiti, valutazioni), note private (solo staff) e genitori.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Avatar, Barra, Btn, Campo, Foglio, Ico, Nota, Seg, Sezione, Tile, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, fmtData, fmtGiornoMese, isoGiorno, leggiData } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { COL, messaggioErrore, useMaestroDati } from "./dati";
import { StatoPagina } from "./piccoli";
import { calcolaStat, type StatAllievo } from "./statistiche";
import {
  coloreVoto, etichettaProgramma, etichettaTest, fmt, maiuscola, nomeCompleto, norm, ordineTest, pctDaVoto, situazioneProgramma,
  type RAllievo, type RValutazione,
} from "./util";

const IT = {
  indietro: "Indietro", scrivi: "Scrivi a {nome}", presenze: "presenze {a}/{b}", compiti: "compiti fatti", noPresenze: "presenze", noDato: "n.d.",
  schedaComp: "Competenze", schedaLavoro: "Lavoro", schedaNote: "Note", schedaGen: "Genitori",
  errorePrincipale: "Errore principale", coach: "Coach AI", coachTesto: "La prossima lezione di {colpo} può includere \"{titolo}\" dalla libreria del centro ({min} minuti).",
  nessunaComp: "Ancora nessuna valutazione", nessunaCompTesto: "Le competenze compaiono dopo il primo test: apri Valutazioni e dai i voti.", vaiValutazioni: "Vai alle valutazioni",
  video: "Video e analisi AI", nessunVideo: "Nessun video o analisi condivisi.", analisiAI: "Analisi AI", daGuardare: "Da guardare",
  compitiTitolo: "Compiti", nessunCompito: "Nessun compito assegnato.", consegnato: "Consegnato {data}", consegnatoVideo: "Consegnato con video, {data}", entro: "Da consegnare entro {data}", daFare: "Da fare",
  valutazioni: "Valutazioni", confronta: "Confronta", testDi: "Test di {mese} · {colpo}", alTest: "{a}% al test, ora {b}%", nessunaVal: "Nessuna valutazione ancora.",
  notePrivate: "Note private: non le vedono né {nome} né la famiglia.", aggiungiNota: "Aggiungi nota", nuovaNota: "Nuova nota privata", testoNota: "Cosa hai notato?", salva: "Salva nota", annulla: "Annulla", nessunaNota: "Nessuna nota ancora.",
  contatti: "Contatti", scriviA: "Scrivi a {nome}", nessunGenitore: "Nessun genitore collegato a questo allievo.", consensi: "CONSENSI E DOCUMENTI", cFoto: "Foto e video in lezione", cAi: "Analisi AI dei video", cPrivacy: "Privacy",
  si: "Sì", no: "No", certificato: "Certificato medico", certValido: "Valido fino a {data}", certScaduto: "Scaduto il {data}", certAssente: "Non presente",
  chatNota: "La chat tra {nome} e il maestro è visibile ai genitori fino ai {anni} anni. Gli orari di silenzio sono dopo le {ora}.",
  nonTrovato: "Allievo non trovato", nonTrovatoTesto: "Non fa parte dei tuoi gruppi oppure non esiste.", gruppo: "Gruppo", maestro: "Maestro",
};
const T = { it: IT, en: { ...IT } };
type Scheda = "comp" | "lavoro" | "note" | "gen";

type Compito = { id: string; allievo_id: string | null; gruppo_id: string | null; titolo: string; durata_min: number | null; scadenza: string | null };
type Fatto = { compito_id: string; fatto_il: string | null; media_path: string | null };
type Nota_ = { id: string; testo: string; created_at: string };
type Genitore = { id: string; nome: string; cognome: string | null; email: string | null; telefono: string | null; relazione: string | null };
type Analisi = { id: string; colpo: string; creato_il: string; risultato: { sintesi?: string } | null };
type Consenso = { tipo: string; valore: boolean };
type Extra = { compiti: Compito[]; fatti: Fatto[]; note: Nota_[]; genitori: Genitore[]; consensi: Consenso[]; analisi: Analisi[]; errori: string[]; stat: StatAllievo };

export function SchedaAllievo({ id }: { id: string }) {
  const t = useT(T);
  const { centro, membroAttivo: ma, sb } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const [scheda, setScheda] = useState<Scheda>("comp");
  const [x, setX] = useState<Extra | null>(null);
  const [errX, setErrX] = useState<string | null>(null);
  const [foglio, setFoglio] = useState(false);
  const [testo, setTesto] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [errNota, setErrNota] = useState<string | null>(null);

  // l'allievo deve far parte dei miei gruppi (la RLS lo garantisce comunque lato database)
  const allievo: RAllievo | null = dati?.allievi.get(id) ?? null;
  const gruppo = useMemo(() => dati?.gruppi.find((g) => (dati.iscritti.get(g.id) ?? []).some((a) => a.id === id)) ?? null, [dati, id]);

  const carica = useCallback(async () => {
    if (!allievo) return;
    try {
      const da = isoGiorno(aggiungiGiorni(new Date(), -60));
      const [val, pre, com, fat, not, fam, con] = await Promise.all([
        sb.from("valutazioni").select(COL.valutazioni).eq("allievo_id", id).gte("data", isoGiorno(aggiungiGiorni(new Date(), -400))).order("data", { ascending: false }).limit(400),
        sb.from("presenze").select("presente,lezioni!inner(data)").eq("allievo_id", id).gte("lezioni.data", da),
        sb.from("compiti").select("id,allievo_id,gruppo_id,titolo,durata_min,scadenza").or(gruppo ? `allievo_id.eq.${id},and(allievo_id.is.null,gruppo_id.eq.${gruppo.id})` : `allievo_id.eq.${id}`).order("created_at", { ascending: false }).limit(20),
        sb.from("compiti_fatti").select("compito_id,fatto_il,media_path").eq("allievo_id", id),
        sb.from("note_private").select("id,testo,created_at").eq("allievo_id", id).order("created_at", { ascending: false }).limit(50),
        sb.from("allievi_famiglie").select("relazione,membri(id,nome,cognome,email,telefono)").eq("allievo_id", id),
        sb.from("consensi").select("tipo,valore").eq("allievo_id", id),
      ]);
      const errori: string[] = [];
      for (const [nome, rr] of [["valutazioni", val], ["presenze", pre], ["compiti", com], ["compiti_fatti", fat], ["note_private", not], ["famiglie", fam], ["consensi", con]] as const) {
        if (rr.error) errori.push(`${nome}: ${rr.error.message}`);
      }
      const pp = ((pre.data ?? []) as unknown as { presente: boolean | null }[]);
      // video e analisi AI: sono dell'account dell'allievo (se ne ha uno); la RLS decide se il maestro li vede
      let analisi: Analisi[] = [];
      if (allievo.membro_id) {
        const m = await sb.from("membri").select("user_id").eq("id", allievo.membro_id).maybeSingle();
        if (m.data?.user_id) {
          const an = await sb.from("analyses").select("id,colpo,creato_il,risultato").eq("user_id", m.data.user_id).order("creato_il", { ascending: false }).limit(5);
          if (!an.error) analisi = (an.data ?? []) as Analisi[];
        }
      }
      const genitori = ((fam.data ?? []) as unknown as { relazione: string | null; membri: Omit<Genitore, "relazione"> | Omit<Genitore, "relazione">[] | null }[])
        .map((f) => ({ f, m: Array.isArray(f.membri) ? f.membri[0] : f.membri }))
        .filter((o) => !!o.m)
        .map((o) => ({ ...o.m!, relazione: o.f.relazione }));
      setX({
        compiti: (com.data ?? []) as Compito[], fatti: (fat.data ?? []) as Fatto[], note: (not.data ?? []) as Nota_[], genitori, consensi: (con.data ?? []) as Consenso[], analisi, errori,
        stat: calcolaStat((val.data ?? []) as RValutazione[], pp.filter((p) => p.presente === false).length, pp.filter((p) => p.presente).length),
      });
      setErrX(null);
    } catch (e) {
      setErrX(messaggioErrore(e));
    }
  }, [sb, id, allievo, gruppo]);
  useEffect(() => { void carica(); }, [carica]);

  async function salvaNota() {
    if (!ma || !testo.trim()) return;
    setSalvo(true); setErrNota(null);
    const { error } = await sb.from("note_private").insert({ centro_id: centro.id, allievo_id: id, maestro_id: ma.id, testo: testo.trim() });
    setSalvo(false);
    if (error) { setErrNota(error.message); return; }
    setTesto(""); setFoglio(false);
    void carica();
  }

  if (!caricamento && !errore && dati && !allievo) {
    return <SchermoCentro ruolo="maestro" tab="allievi" indietro={r.allievi} titolo={t.nonTrovato}><Vuoto titolo={t.nonTrovato} testo={t.nonTrovatoTesto} icona="user" /></SchermoCentro>;
  }
  const stato = StatoPagina({ caricamento: caricamento || (!x && !errX), errore: errore ?? errX, onRiprova: () => { ricarica(); void carica(); } });
  const nome = allievo ? nomeCompleto({ nome: allievo.nome, cognome: allievo.cognome ? `${allievo.cognome.charAt(0)}.` : null }) : "";

  return (
    <SchermoCentro
      ruolo="maestro" tab="allievi" indietro={r.allievi}
      sopra={allievo ? [gruppo?.nome, [ma?.nome, ma?.cognome].filter(Boolean).join(" ")].filter(Boolean).join(" · ") : undefined}
      titolo={allievo ? <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar nome={allievo.nome} cognome={allievo.cognome} size={46} />{nome}</span> : undefined}
      azioni={allievo ? <Link href={r.messaggi} className="icon" aria-label={fmt(t.scrivi, { nome: allievo.nome })}><Ico nome="chat" size={18} /></Link> : undefined}
    >
      {stato ?? (allievo && x && dati && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Tiles x={x} dati={dati} gruppoId={gruppo?.id ?? null} t={t} />
          <Seg<Scheda> valore={scheda} onChange={setScheda} valori={[{ id: "comp", etichetta: t.schedaComp }, { id: "lavoro", etichetta: t.schedaLavoro }, { id: "note", etichetta: t.schedaNote }, { id: "gen", etichetta: t.schedaGen }]} />
          {x.errori.length > 0 && <Nota icona="shield">{x.errori[0]}</Nota>}
          {scheda === "comp" && <Competenze x={x} dati={dati} fascia={gruppo?.fascia ?? null} vai={r.valutazioni} t={t} />}
          {scheda === "lavoro" && <Lavoro x={x} t={t} vai={r.valutazioni} />}
          {scheda === "note" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Nota icona="lock">{fmt(t.notePrivate, { nome: allievo.nome })}</Nota>
              {x.note.length === 0 && <div className="s muted">{t.nessunaNota}</div>}
              {x.note.map((n) => (
                <div key={n.id} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="k">{fmtGiornoMese(n.created_at).toUpperCase()}</span><span className="v" style={{ whiteSpace: "pre-wrap" }}>{n.testo}</span></div>
              ))}
              <Btn variante="secondario" icona="edit" onClick={() => setFoglio(true)}>{t.aggiungiNota}</Btn>
            </div>
          )}
          {scheda === "gen" && <GenitoriTab x={x} allievo={allievo} slug={centro.slug} anniChat={centro.impostazioni?.chat_genitori_fino ?? 18} silenzio={centro.impostazioni?.silenzio_da ?? "21:00"} t={t} />}
        </div>
      ))}
      <Foglio aperto={foglio} onChiudi={() => setFoglio(false)} titolo={t.nuovaNota}>
        <Campo etichetta={t.testoNota} valore={testo} onChange={setTesto} multiriga righe={5} errore={errNota} />
        <Btn onClick={salvaNota} disabled={salvo || !testo.trim()}>{t.salva}</Btn>
        <Btn variante="fantasma" onClick={() => setFoglio(false)}>{t.annulla}</Btn>
      </Foglio>
    </SchermoCentro>
  );
}

type TT = Record<string, string>;

function Tiles({ x, dati, gruppoId, t }: { x: Extra; dati: NonNullable<ReturnType<typeof useMaestroDati>["dati"]>; gruppoId: string | null; t: TT }) {
  const tot = x.stat.presenze30 + x.stat.assenze30;
  // il colpo del mese è quello del programma del gruppo; senza programma, la competenza più bassa
  const g = dati.gruppi.find((y) => y.id === gruppoId);
  const sit = situazioneProgramma(g?.programma_id ? dati.programmi.get(g.programma_id) : null, new Date());
  const colpo = sit?.colpo || sit?.tema || x.stat.peggiore?.colpo || "";
  const m = mediaColpo(x.stat.valutazioni, colpo);
  const fatti = x.compiti.filter((c) => x.fatti.some((f) => f.compito_id === c.id && f.fatto_il)).length;
  return (
    <div className="g3">
      <Tile valore={tot ? `${Math.round((x.stat.presenze30 / tot) * 100)}%` : t.noDato} etichetta={tot ? fmt(t.presenze, { a: x.stat.presenze30, b: tot }) : t.noPresenze} />
      <Tile valore={m.pct !== null ? `${m.pct}%` : t.noDato} colore={m.pct !== null ? coloreVoto(m.pct) : undefined} etichetta={`${colpo.toLowerCase() || "—"}${m.delta !== null ? ` · ${m.delta > 0 ? "+" : ""}${m.delta}` : ""}`} />
      <Tile valore={x.compiti.length ? `${fatti}/${x.compiti.length}` : t.noDato} colore="#FFD54A" etichetta={t.compiti} />
    </div>
  );
}

/** Media dell'ultimo test e variazione sul test precedente, per un colpo (o per tutti se `colpo` è vuoto). */
function mediaColpo(val: RValutazione[], colpo: string): { pct: number | null; delta: number | null } {
  const v = colpo ? val.filter((x) => norm(x.colpo).startsWith(norm(colpo).slice(0, 4))) : val;
  const test = [...new Set(v.map((x) => x.test))].sort((a, b) => ordineTest(a) - ordineTest(b));
  const media = (k: string | undefined) => { const r = v.filter((x) => x.test === k); return r.length ? pctDaVoto(r.reduce((s, y) => s + y.voto, 0) / r.length) : null; };
  const a = media(test[test.length - 1]);
  const b = media(test[test.length - 2]);
  return { pct: a !== null ? Math.round(a) : null, delta: a !== null && b !== null ? Math.round(a - b) : null };
}

function Competenze({ x, dati, fascia, vai, t }: { x: Extra; dati: NonNullable<ReturnType<typeof useMaestroDati>["dati"]>; fascia: string | null; vai: string; t: TT }) {
  const { sb, centro } = useCentro();
  const colpi = useMemo(() => [...new Set(x.stat.valutazioni.map((v) => v.colpo))].map((c) => ({ colpo: c, ...mediaColpo(x.stat.valutazioni, c) })).filter((c) => c.pct !== null), [x.stat.valutazioni]);
  const peggiore = [...colpi].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  const [errore, setErrore] = useState<string | null>(null);

  // errore tipico del colpo più debole, dalle linee guida del centro per la fascia
  useEffect(() => {
    if (!peggiore || !fascia) { setErrore(null); return; }
    let vivo = true;
    sb.from("linee_guida").select("colpo,errori").eq("centro_id", centro.id).eq("fascia", fascia).then(({ data }: { data: { colpo: string; errori: unknown }[] | null }) => {
      const riga = (data ?? []).find((l) => norm(l.colpo).startsWith(norm(peggiore.colpo).slice(0, 4)));
      const e = Array.isArray(riga?.errori) ? (riga!.errori as unknown[])[0] : null;
      const nome = e && typeof e === "object" ? String((e as { nome?: unknown; titolo?: unknown }).nome ?? (e as { titolo?: unknown }).titolo ?? "") : typeof e === "string" ? e : "";
      if (vivo) setErrore(nome || null);
    });
    return () => { vivo = false; };
  }, [sb, centro.id, fascia, peggiore]);

  if (!colpi.length) return <Vuoto titolo={t.nessunaComp} testo={t.nessunaCompTesto} icona="chart" azione={<Btn href={vai} variante="secondario" pieno={false} piccolo>{t.vaiValutazioni}</Btn>} />;
  const es = peggiore ? [...dati.esercizi.values()].find((e) => norm(e.colpo ?? "").startsWith(norm(peggiore.colpo).slice(0, 4)) && (!fascia || !e.fasce?.length || e.fasce.includes(fascia))) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="card" style={{ padding: "6px 14px", display: "flex", flexDirection: "column" }}>
        {colpi.map((c) => (
          <div key={c.colpo} style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr) 38px 30px", alignItems: "center", gap: 8, height: 34, borderTop: "1px solid rgba(255,255,255,.05)" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{maiuscola(c.colpo)}</span>
            <Barra pct={c.pct ?? 0} colore={coloreVoto(c.pct ?? 0)} etichetta={c.colpo} />
            <span className="disp" style={{ fontSize: 18, fontWeight: 700, textAlign: "right" }}>{c.pct}%</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, textAlign: "right", color: (c.delta ?? 0) < 0 ? "#FF5A5F" : "#4CD07D" }}>{c.delta === null ? "" : c.delta > 0 ? `+${c.delta}` : c.delta}</span>
          </div>
        ))}
      </div>
      {peggiore && (
        <Nota icona="target"><b style={{ color: "var(--mc-fg)" }}>{t.errorePrincipale}</b> · {maiuscola(peggiore.colpo)}<br />{errore ?? `${maiuscola(peggiore.colpo)}: ${peggiore.pct}%`}</Nota>
      )}
      {es && <div className="note" style={{ display: "flex", gap: 10, alignItems: "flex-start", borderColor: "color-mix(in srgb, var(--brand) 30%, transparent)" }}><span style={{ color: "var(--brand)", flex: "none", marginTop: 1 }}><Ico nome="spark" size={16} /></span><span><b style={{ color: "var(--mc-fg)" }}>{t.coach}</b><br />{fmt(t.coachTesto, { colpo: peggiore!.colpo.toLowerCase(), titolo: es.titolo, min: es.durata_min ?? 10 })}</span></div>}
    </div>
  );
}

function Lavoro({ x, t, vai }: { x: Extra; t: TT; vai: string }) {
  const test = (v: RValutazione[]) => [...new Set(v.map((y) => y.test))].sort((a, b) => ordineTest(b) - ordineTest(a));
  const colpi = [...new Set(x.stat.valutazioni.map((v) => v.colpo))].slice(0, 3).map((c) => {
    const v = x.stat.valutazioni.filter((y) => y.colpo === c);
    const ts = test(v);
    const media = (k: string) => { const r = v.filter((y) => y.test === k); return Math.round(pctDaVoto(r.reduce((s, y) => s + y.voto, 0) / r.length)); };
    return ts.length ? { colpo: c, test: ts[0], ora: media(ts[0]), prima: ts[1] ? media(ts[1]) : null } : null;
  }).filter((c): c is NonNullable<typeof c> => !!c);
  const fatto = (id: string) => x.fatti.find((f) => f.compito_id === id && f.fatto_il);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Sezione titolo={<span style={{ fontSize: 16 }}>{t.video}</span>} />
      {x.analisi.length === 0 && <div className="s muted">{t.nessunVideo}</div>}
      {x.analisi.map((a) => (
        <div key={a.id} className="li" style={{ padding: "8px 10px" }}>
          <span className="lawn" style={{ width: 62, height: 46, borderRadius: 12, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Ico nome="play" size={18} /></span>
          <span className="grow"><span className="t" style={{ display: "block", fontSize: 14 }}>{maiuscola(a.colpo)} · {fmtGiornoMese(a.creato_il)}</span><span className="s" style={{ display: "block" }}>{a.risultato?.sintesi?.slice(0, 80) ?? ""}</span></span>
          <span className="tag" style={{ background: "#10261A", color: "#4CD07D" }}>{t.analisiAI}</span>
        </div>
      ))}
      <Sezione titolo={<span style={{ fontSize: 16 }}>{t.compitiTitolo}</span>} azione={x.compiti.length ? <span className="muted">{x.compiti.filter((c) => fatto(c.id)).length}/{x.compiti.length}</span> : undefined} />
      {x.compiti.length === 0 && <div className="s muted">{t.nessunCompito}</div>}
      {x.compiti.slice(0, 5).map((c) => {
        const f = fatto(c.id);
        return (
          <div key={c.id} className="li" style={{ padding: "8px 12px" }}>
            <span className="ic" style={{ width: 32, height: 32, borderRadius: 10, color: f ? "#4CD07D" : "#FF9F43" }}><Ico nome={f ? "check" : "clock"} size={16} /></span>
            <span className="grow">
              <span className="t" style={{ display: "block", fontSize: 14 }}>{c.titolo}{c.durata_min ? ` · ${c.durata_min} min` : ""}</span>
              <span className="s" style={{ display: "block" }}>{f ? fmt(f.media_path ? t.consegnatoVideo : t.consegnato, { data: fmtData(f.fatto_il!) }) : c.scadenza ? fmt(t.entro, { data: fmtData(c.scadenza) }) : t.daFare}</span>
            </span>
          </div>
        );
      })}
      <Sezione titolo={<span style={{ fontSize: 16 }}>{t.valutazioni}</span>} azione={<Link href={vai}>{t.confronta}</Link>} />
      {colpi.length === 0 && <div className="s muted">{t.nessunaVal}</div>}
      {colpi.map((c) => (
        <div key={c.colpo} className="li" style={{ padding: "8px 12px" }}>
          <span className="grow"><span className="t" style={{ display: "block", fontSize: 14 }}>{fmt(t.testDi, { mese: etichettaTest(c.test).split(" ")[0].toLowerCase(), colpo: c.colpo.toLowerCase() })}</span><span className="s" style={{ display: "block" }}>{c.prima !== null ? fmt(t.alTest, { a: c.prima, b: c.ora }) : `${c.ora}%`}</span></span>
          {c.prima !== null && <span className="disp" style={{ fontSize: 20, fontWeight: 700, color: c.ora - c.prima >= 0 ? "#4CD07D" : "#FF5A5F" }}>{c.ora - c.prima > 0 ? "+" : ""}{c.ora - c.prima}</span>}
        </div>
      ))}
    </div>
  );
}

function GenitoriTab({ x, allievo, slug, anniChat, silenzio, t }: { x: Extra; allievo: RAllievo; slug: string; anniChat: number; silenzio: string; t: TT }) {
  const r = rotta(slug).maestro;
  const consenso = (tipo: string) => x.consensi.find((c) => c.tipo === tipo)?.valore === true;
  const cert = allievo.certificato_scade;
  const scaduto = cert ? leggiData(cert) < leggiData(isoGiorno()) : false;
  const dataCert = cert ? `${["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"][leggiData(cert).getMonth()]} ${leggiData(cert).getFullYear()}` : "";
  const riga = (et: string, ok: boolean) => <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span>{et}</span><b style={{ color: ok ? "#4CD07D" : "#FF9F43" }}>{ok ? t.si : t.no}</b></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {x.genitori.length === 0 && <Vuoto titolo={t.nessunGenitore} icona="users" />}
      {x.genitori.map((g) => (
        <div key={g.id} className="li" style={{ padding: "10px 12px" }}>
          <Avatar nome={g.nome} cognome={g.cognome} size={40} />
          <span className="grow"><span className="t" style={{ display: "block" }}>{nomeCompleto(g)}</span><span className="s" style={{ display: "block" }}>{[g.relazione ? maiuscola(g.relazione) : "", g.telefono ?? g.email ?? ""].filter(Boolean).join(" · ")}</span></span>
          <Link href={r.messaggi} className="icon" aria-label={fmt(t.scriviA, { nome: nomeCompleto(g) })} style={{ width: 36, height: 36 }}><Ico nome="chat" size={16} /></Link>
        </div>
      ))}
      <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="k">{t.consensi}</span>
        {riga(t.cFoto, consenso("foto_video"))}
        {riga(t.cAi, consenso("ai"))}
        {riga(t.cPrivacy, consenso("privacy"))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
          <span>{t.certificato}</span>
          <b style={{ color: !cert ? "#FF9F43" : scaduto ? "#FF5A5F" : "#4CD07D" }}>{!cert ? t.certAssente : fmt(scaduto ? t.certScaduto : t.certValido, { data: dataCert })}</b>
        </div>
      </div>
      <Nota icona="shield">{fmt(t.chatNota, { nome: allievo.nome, anni: anniChat, ora: silenzio.slice(0, 2).replace(/^0/, "") })}</Nota>
    </div>
  );
}
