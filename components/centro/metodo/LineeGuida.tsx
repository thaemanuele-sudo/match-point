"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "@/components/centro/Schermo";
import { BarraMattoni, kickMattone } from "./Barra";
import { CampoVideo, VideoEsercizio } from "./Video";
import { Pannello, useToast } from "./Pannello";
import { Ico } from "./ico";
import { comune, fmt } from "./testi";
import { baseLinea, COLPI, dataBreve, FASCE, leggiLinea, nomeColpo, statoLinea, type ColpoK, type Errore, type LineaGuida } from "./dati";
import { useMetodo } from "./useMetodo";
import "./metodo.css";

const it = {
  ...comune,
  titolo: "Linee guida",
  modifica_aria: "Modifica le linee guida",
  matrice: "Fascia × colpo",
  complete: "{n} di {tot} complete",
  leg_c: "Completa",
  leg_b: "Bozza",
  leg_n: "Da scrivere",
  cella_c: "completa",
  cella_b: "bozza",
  cella_n: "da scrivere",
  st_c: "Completa · v{v}",
  st_b: "Bozza",
  st_n: "Da scrivere",
  kick_c: "{f} · {chi} · {data}",
  kick_b: "{f} · bozza di {chi} · {data}",
  kick_n: "{f} · non ancora scritta",
  competenze: "Competenze attese",
  errori: "Errori tipici · con video",
  regola_titolo: "Regola del centro, bloccata.",
  regola_libera: "Regola del centro.",
  scala: "Scala di valutazione",
  atteso: "Atteso a fine ciclo: {n} · {l}",
  livello_atteso: "Livello atteso.",
  vuota: "Nessuna linea guida per {t}. Finché manca, il Metodo non può proporre esercizi e lezioni per questo colpo.",
  scrivi_ai: "Scrivi con Coach AI",
  scrivi_ai_in_corso: "Coach AI sta scrivendo…",
  scrivi_mano: "Scrivi a mano",
  copia_da: "Copia da {f}",
  ai_errore: "Coach AI non risponde: ho preparato la bozza base del Metodo Match Point, rifiniscila tu.",
  ai_prompt:
    "Sei il direttore tecnico di un centro tennis italiano. Scrivi la linea guida per la fascia {fascia} e il colpo {colpo}. Rispondi SOLO con un oggetto JSON: {\"competenze\":[3 frasi brevi],\"errori\":[{\"nome\":\"...\"},{\"nome\":\"...\"}],\"regola\":\"una regola del centro\",\"livello\":\"livello atteso\"}. Linguaggio semplice, positivo, adatto ai ragazzi, senza consigli medici.",
  vedi_video: "Guarda il video: {n}",
  video_titolo: "Errore tipico · {n}",
  video_assente: "Il video non è ancora stato caricato. Lo trovi nella Libreria quando il DT lo aggiunge.",
  vai_libreria: "Apri la Libreria",
  // modifica
  ed_titolo: "Scrivi {t}",
  ed_competenze: "Competenze attese",
  ed_comp_ph: "Cosa deve saper fare",
  ed_aggiungi_comp: "Aggiungi competenza",
  ed_errori: "Errori tipici",
  ed_err_ph: "Nome dell'errore",
  ed_tempo_ph: "Minuto video",
  ed_aggiungi_err: "Aggiungi errore",
  ed_regola: "Regola del centro",
  ed_regola_ph: "Una regola chiara e breve che vale per tutti i maestri",
  ed_livello: "Livello atteso",
  ed_livello_ph: "Es. palla verde, 4 palle su 5 in cross",
  ed_atteso: "Atteso a fine ciclo",
  ed_scala: "Nomi della scala (1-4)",
  ed_bloccata: "Regola bloccata: i maestri non possono cambiarla",
  ed_stato: "Stato",
  ed_salva_c: "Salva come completa",
  ed_salva_b: "Salva come bozza",
  ed_serve: "Per una linea completa servono almeno 3 competenze e la regola.",
  video_allega: "Allega video",
  video_cambia: "Cambia video",
  video_rimuovi: "Togli",
  video_caricamento: "Caricamento…",
  video_troppo: "Il video supera i 100 MB: accorcialo e riprova.",
  video_errore: "Caricamento non riuscito. Riprova.",
  video_allegato: "Video allegato",
  salvata: "Linea guida salvata",
  senza_nome: "il direttore tecnico",
};
const T = { it, en: { ...it } };

type Form = {
  competenze: string[];
  errori: Errore[];
  regola: string;
  livello: string;
  atteso: number;
  livelli: string[];
  bloccata: boolean;
  completa: boolean;
};

const chiave = (f: string, k: string) => `${f}|${k}`;

export default function LineeGuida() {
  const t = useT(T) as Record<string, string>;
  const { sb, centro, attivo, puoModificare, reg } = useMetodo();
  const [righe, setRighe] = useState<Record<string, LineaGuida>>({});
  const [carica, setCarica] = useState(true);
  const [ko, setKo] = useState(false);
  const [f, setF] = useState<string>("U10");
  const [c, setC] = useState<ColpoK>("dritto");
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const [videoPath, setVideoPath] = useState<{ path: string; nome: string } | null>(null);
  const [toast, mostra] = useToast();
  const defL = useMemo(() => [t.scala_1, t.scala_2, t.scala_3, t.scala_4], [t]);

  const leggi = useCallback(async () => {
    const { data, error } = await sb.from("linee_guida").select("id,fascia,colpo,competenze,errori,regola,scala,bloccata,created_at").eq("centro_id", centro.id);
    if (error) {
      setKo(true);
      setCarica(false);
      return;
    }
    const m: Record<string, LineaGuida> = {};
    (data ?? []).forEach((r: Record<string, unknown>) => {
      const l = leggiLinea(r, defL);
      if (l) m[chiave(l.fascia, l.colpo)] = l;
    });
    setRighe(m);
    setKo(false);
    setCarica(false);
  }, [sb, centro.id, defL]);
  useEffect(() => {
    leggi();
  }, [leggi]);
  useEffect(() => setForm(null), [f, c]);

  const sel = righe[chiave(f, c)];
  const stato = statoLinea(sel);
  const complete = Object.values(righe).filter((l) => statoLinea(l) === "c").length;
  const nomeC = t[`colpo_${c}`];
  const titolo = `${f} · ${nomeC}`;

  function apriForm(l: LineaGuida | undefined, base?: ReturnType<typeof baseLinea>) {
    const b = base ?? baseLinea(f, c);
    setErrore("");
    setForm({
      competenze: l ? [...l.competenze] : [...b.competenze],
      errori: l ? l.errori.map((e) => ({ ...e })) : b.errori.map((e) => ({ ...e })),
      regola: l ? l.regola : b.regola,
      livello: l ? l.scala.livello : b.livello,
      atteso: l ? l.scala.atteso : b.atteso,
      livelli: l ? [...l.scala.livelli] : [...defL],
      bloccata: l ? l.bloccata : true,
      completa: false,
    });
  }

  function copiaDa() {
    const i = FASCE.indexOf(f as (typeof FASCE)[number]);
    const prec = [...FASCE.slice(0, i).reverse(), ...FASCE.slice(i + 1)].map((x) => righe[chiave(x, c)]).find(Boolean);
    if (prec) {
      apriForm(undefined, { competenze: prec.competenze, errori: prec.errori, regola: prec.regola, livello: prec.scala.livello, atteso: prec.scala.atteso });
    } else apriForm(undefined);
  }
  const fonteCopia = (() => {
    const i = FASCE.indexOf(f as (typeof FASCE)[number]);
    const ord = [...FASCE.slice(0, i).reverse(), ...FASCE.slice(i + 1)];
    return ord.find((x) => righe[chiave(x, c)]) ?? (i > 0 ? FASCE[i - 1] : FASCE[1]);
  })();

  async function scriviAI() {
    setBusy(true);
    setErrore("");
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messaggi: [{ ruolo: "user", testo: fmt(t.ai_prompt, { fascia: f, colpo: nomeC }) }], lingua: "it" }),
      });
      if (!r.ok || !r.body) throw new Error("ai");
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
      }
      const m = acc.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("json");
      const j = JSON.parse(m[0]) as { competenze?: unknown; errori?: unknown; regola?: unknown; livello?: unknown };
      const comp = Array.isArray(j.competenze) ? j.competenze.map(String).filter(Boolean).slice(0, 5) : [];
      const err = Array.isArray(j.errori) ? j.errori.map((e) => (typeof e === "object" && e ? String((e as { nome?: unknown }).nome ?? "") : String(e))).filter(Boolean).slice(0, 4) : [];
      if (comp.length < 3) throw new Error("poche");
      const b = baseLinea(f, c);
      apriForm(undefined, { competenze: comp, errori: err.map((nome) => ({ nome })), regola: String(j.regola ?? b.regola), livello: String(j.livello ?? b.livello), atteso: b.atteso });
    } catch {
      // Senza Coach AI si parte comunque dalla bozza base del Metodo Match Point
      apriForm(undefined);
      setErrore(t.ai_errore);
    } finally {
      setBusy(false);
    }
  }

  async function salva(completa: boolean) {
    if (!form) return;
    const comp = form.competenze.map((x) => x.trim()).filter(Boolean);
    const errs = form.errori.filter((e) => e.nome.trim()).map((e) => ({ nome: e.nome.trim(), tempo: e.tempo || undefined, video_path: e.video_path || null, esercizio_id: e.esercizio_id || null }));
    if (completa && (comp.length < 3 || !form.regola.trim())) {
      setErrore(t.ed_serve);
      return;
    }
    setBusy(true);
    setErrore("");
    const versione = completa ? (sel?.scala.versione ?? 0) + 1 : sel?.scala.versione ?? 1;
    const nome = [attivo?.nome, attivo?.cognome].filter(Boolean).join(" ") || t.senza_nome;
    const payload = {
      centro_id: centro.id,
      fascia: f,
      colpo: nomeColpo(c),
      competenze: comp,
      errori: errs,
      regola: form.regola.trim(),
      scala: { livelli: form.livelli.map((x, i) => x.trim() || defL[i]), atteso: form.atteso, livello: form.livello.trim(), stato: completa ? "completa" : "bozza", versione, da: nome, il: new Date().toISOString() },
      bloccata: form.bloccata,
    };
    const q = sel ? sb.from("linee_guida").update(payload).eq("id", sel.id) : sb.from("linee_guida").insert(payload);
    const { error } = await q;
    setBusy(false);
    if (error) {
      setErrore(t.errore);
      return;
    }
    await reg(sel ? "metodo.linea_guida.modifica" : "metodo.linea_guida.crea", `${f} · ${nomeColpo(c)}`, { stato: completa ? "completa" : "bozza", versione, competenze: comp.length, errori: errs.length });
    setForm(null);
    mostra(t.salvata);
    leggi();
  }

  const setComp = (i: number, v: string) => setForm((p) => p && { ...p, competenze: p.competenze.map((x, j) => (j === i ? v : x)) });
  const setErr = (i: number, patch: Partial<Errore>) => setForm((p) => p && { ...p, errori: p.errori.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const kick = !sel
    ? fmt(t.kick_n, { f: t[`fascia_${f}`] })
    : fmt(stato === "c" ? t.kick_c : t.kick_b, { f: t[`fascia_${f}`], chi: sel.scala.da || t.senza_nome, data: dataBreve(sel.scala.il || sel.creata) });

  const videoT = { allega: t.video_allega, cambia: t.video_cambia, rimuovi: t.video_rimuovi, caricamento: t.video_caricamento, troppo: t.video_troppo, errore: t.video_errore, allegato: t.video_allegato };

  return (
    <SchermoCentro
      ruolo="dt"
      tab="metodo"
      titolo={t.titolo}
      sopra={kickMattone(t, 1, centro.nome)}
      largo
      azioni={
        puoModificare ? (
          <button type="button" className={`mm-ib${form ? " on" : ""}`} aria-label={t.modifica_aria} onClick={() => (form ? setForm(null) : apriForm(sel))}>
            <Ico n="edit" />
          </button>
        ) : undefined
      }
    >
      <div className="mm">
        <BarraMattoni slug={centro.slug} attiva="lg" />
        {carica ? <div className="mm-load">{t.caricamento}</div> : null}
        {ko ? <div className="mm-err">{t.errore_lettura}</div> : null}
        {!carica && !ko ? (
          <div className="mm-lgcols mm-cols">
            <div className="mm-cols">
              <div className="mm-card" style={{ gap: 6 }}>
                <div className="mm-sec">
                  <h2 className="mm-h2">{t.matrice}</h2>
                  <span className="mm-mu" style={{ fontSize: 12 }}>{fmt(t.complete, { n: complete, tot: FASCE.length * COLPI.length })}</span>
                </div>
                <div className="mm-mx">
                  <div className="mm-mx-f">
                    {FASCE.map((x) => (
                      <button key={x} type="button" className={x === f ? "on" : ""} onClick={() => setF(x)} aria-label={fmt(t.fascia_aria, { f: t[`fascia_${x}`] })}>
                        {x}
                      </button>
                    ))}
                  </div>
                  <div className="mm-mx-r">
                    <div className="mm-mx-h">
                      {COLPI.map((x) => (
                        <span key={x.k} className={x.k === c ? "on" : ""}>{t[`ab_${x.k}`]}</span>
                      ))}
                    </div>
                    <div className="mm-mx-g">
                      {FASCE.map((fa) =>
                        COLPI.map((co) => {
                          const s = statoLinea(righe[chiave(fa, co.k)]);
                          return (
                            <button
                              key={fa + co.k}
                              type="button"
                              className={`mm-cell ${s}${fa === f && co.k === c ? " sel" : ""}`}
                              aria-label={`${t[`fascia_${fa}`]}, ${t[`colpo_${co.k}`]}: ${t[`cella_${s}`]}`}
                              onClick={() => {
                                setF(fa);
                                setC(co.k);
                              }}
                            />
                          );
                        }),
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mm-leg">
                <span><i style={{ background: "#D8F34A" }} />{t.leg_c}</span>
                <span><i style={{ background: "rgba(216,243,74,.30)", border: "1px dashed rgba(216,243,74,.7)" }} />{t.leg_b}</span>
                <span><i style={{ background: "#232326", border: "1px solid #3A3A3C" }} />{t.leg_n}</span>
              </div>
            </div>

            <div className="mm-card" style={{ gap: 9 }}>
              <div className="mm-sec" style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <h2 className="mm-disp" style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1.05 }}>{form ? fmt(t.ed_titolo, { t: titolo }) : titolo}</h2>
                  <div className="mm-k" style={{ textTransform: "none", fontSize: 11.5 }}>{kick}</div>
                </div>
                <span className={`mm-tag ${stato === "c" ? "ok" : stato === "b" ? "wa" : ""}`}>{stato === "c" ? fmt(t.st_c, { v: sel?.scala.versione ?? 1 }) : t[`st_${stato}`]}</span>
              </div>
              {errore ? <div className="mm-err">{errore}</div> : null}

              {form ? (
                <>
                  <div className="mm-fld">
                    <span className="mm-lab">{t.ed_competenze.toUpperCase()}</span>
                    {form.competenze.map((x, i) => (
                      <div key={i} className="mm-row">
                        <input className="mm-inp" value={x} placeholder={t.ed_comp_ph} aria-label={`${t.ed_competenze} ${i + 1}`} onChange={(e) => setComp(i, e.target.value)} />
                        <button type="button" className="mm-rd" aria-label={t.elimina} onClick={() => setForm((p) => p && { ...p, competenze: p.competenze.filter((_, j) => j !== i) })}><Ico n="x" s={14} /></button>
                      </div>
                    ))}
                    {form.competenze.length < 6 ? (
                      <button type="button" className="mm-add" onClick={() => setForm((p) => p && { ...p, competenze: [...p.competenze, ""] })}><Ico n="plus" s={14} />{t.ed_aggiungi_comp}</button>
                    ) : null}
                  </div>
                  <div className="mm-fld">
                    <span className="mm-lab">{t.ed_errori.toUpperCase()}</span>
                    {form.errori.map((e, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 14, background: "#0E0E10" }}>
                        <div className="mm-row">
                          <input className="mm-inp" value={e.nome} placeholder={t.ed_err_ph} aria-label={`${t.ed_errori} ${i + 1}`} onChange={(ev) => setErr(i, { nome: ev.target.value })} />
                          <input className="mm-inp" style={{ width: 92, flex: "none" }} value={e.tempo ?? ""} placeholder={t.ed_tempo_ph} aria-label={t.ed_tempo_ph} onChange={(ev) => setErr(i, { tempo: ev.target.value })} />
                          <button type="button" className="mm-rd" aria-label={t.elimina} onClick={() => setForm((p) => p && { ...p, errori: p.errori.filter((_, j) => j !== i) })}><Ico n="x" s={14} /></button>
                        </div>
                        <CampoVideo sb={sb} centroId={centro.id} cartella="errori" path={e.video_path ?? null} onPath={(p) => setErr(i, { video_path: p })} testi={videoT} />
                      </div>
                    ))}
                    {form.errori.length < 4 ? (
                      <button type="button" className="mm-add" onClick={() => setForm((p) => p && { ...p, errori: [...p.errori, { nome: "" }] })}><Ico n="plus" s={14} />{t.ed_aggiungi_err}</button>
                    ) : null}
                  </div>
                  <label className="mm-fld"><span className="mm-lab">{t.ed_regola.toUpperCase()}</span><textarea className="mm-ta" value={form.regola} placeholder={t.ed_regola_ph} onChange={(e) => setForm((p) => p && { ...p, regola: e.target.value })} /></label>
                  <label className="mm-fld"><span className="mm-lab">{t.ed_livello.toUpperCase()}</span><input className="mm-inp" value={form.livello} placeholder={t.ed_livello_ph} onChange={(e) => setForm((p) => p && { ...p, livello: e.target.value })} /></label>
                  <div className="mm-fld">
                    <span className="mm-lab">{t.ed_scala.toUpperCase()}</span>
                    <div className="mm-scala" style={{ gap: 6 }}>
                      {form.livelli.map((x, i) => (
                        <input key={i} className="mm-inp" style={{ padding: "0 8px", height: 36, fontSize: 13 }} value={x} aria-label={`${t.ed_scala} ${i + 1}`} onChange={(e) => setForm((p) => p && { ...p, livelli: p.livelli.map((y, j) => (j === i ? e.target.value : y)) })} />
                      ))}
                    </div>
                  </div>
                  <div className="mm-fld">
                    <span className="mm-lab">{t.ed_atteso.toUpperCase()}</span>
                    <div className="mm-chips">
                      {[1, 2, 3, 4].map((n) => (
                        <button key={n} type="button" className={`mm-chip${form.atteso === n ? " on" : ""}`} onClick={() => setForm((p) => p && { ...p, atteso: n })}>{n} · {form.livelli[n - 1]}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mm-row">
                    <span className="mm-grow" style={{ fontSize: 13 }}><Ico n="lock" s={14} /> {t.ed_bloccata}</span>
                    <button type="button" className={`mm-sw${form.bloccata ? " on" : ""}`} role="switch" aria-checked={form.bloccata} aria-label={t.ed_bloccata} onClick={() => setForm((p) => p && { ...p, bloccata: !p.bloccata })}><i /></button>
                  </div>
                  <div className="mm-row" style={{ flexWrap: "wrap" }}>
                    <button type="button" className="mm-btn" disabled={busy} onClick={() => salva(true)}>{t.ed_salva_c}</button>
                    <button type="button" className="mm-btn2" disabled={busy} onClick={() => salva(false)}>{t.ed_salva_b}</button>
                    <button type="button" className="mm-btn2" disabled={busy} onClick={() => setForm(null)}>{t.annulla}</button>
                  </div>
                </>
              ) : sel ? (
                <>
                  {sel.scala.livello ? <div style={{ fontSize: 13, lineHeight: 1.4, color: "#D6D6DA" }}><b style={{ color: "#D8F34A" }}>{t.livello_atteso}</b> {sel.scala.livello}</div> : null}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div className="mm-k">{t.competenze}</div>
                    {sel.competenze.map((x, i) => (
                      <div key={i} className="mm-comp"><span style={{ color: "#D8F34A", marginTop: 1 }}><Ico n="check" s={15} w={2.6} /></span><span>{x}</span></div>
                    ))}
                  </div>
                  {sel.errori.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div className="mm-k">{t.errori}</div>
                      <div className="mm-err2">
                        {sel.errori.slice(0, 4).map((e, i) =>
                          e.video_path ? (
                            <button key={i} type="button" className="mm-li" style={{ padding: "6px 8px", borderRadius: 14 }} aria-label={fmt(t.vedi_video, { n: e.nome })} onClick={() => setVideoPath({ path: e.video_path!, nome: e.nome })}>
                              <span className="mm-play"><Ico n="play" s={14} fill /></span>
                              <span className="mm-grow"><span className="t" style={{ fontSize: 12.5, display: "block", lineHeight: 1.15 }}>{e.nome}</span><span className="s" style={{ fontSize: 11, display: "block" }}>{e.tempo ? fmt(t.video_sel, { t: e.tempo }) : t.video}</span></span>
                            </button>
                          ) : (
                            <Link key={i} href={`/c/${centro.slug}/dt/metodo/libreria`} className="mm-li" style={{ padding: "6px 8px", borderRadius: 14 }}>
                              <span className="mm-play"><Ico n="play" s={14} fill /></span>
                              <span className="mm-grow"><span className="t" style={{ fontSize: 12.5, display: "block", lineHeight: 1.15 }}>{e.nome}</span><span className="s" style={{ fontSize: 11, display: "block" }}>{e.tempo ? fmt(t.video_sel, { t: e.tempo }) : t.video}</span></span>
                            </Link>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}
                  {sel.regola ? (
                    <div className="mm-note" style={{ padding: "8px 10px", alignItems: "flex-start" }}>
                      <span style={{ color: "#D8F34A", marginTop: 1 }}><Ico n={sel.bloccata ? "lock" : "unlock"} s={16} /></span>
                      <span><b>{sel.bloccata ? t.regola_titolo : t.regola_libera}</b> {sel.regola}</span>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div className="mm-sec"><span className="mm-k">{t.scala}</span><span style={{ fontSize: 11.5, color: "#D8F34A" }}>{fmt(t.atteso, { n: sel.scala.atteso, l: sel.scala.livelli[sel.scala.atteso - 1] })}</span></div>
                    <div className="mm-scala">
                      {sel.scala.livelli.map((l, i) => (
                        <span key={i} className={i + 1 === sel.scala.atteso ? "on" : ""}><b>{i + 1}</b>{l}</span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "6px 0 2px" }}>
                  <div className="mm-row">
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: "#232326", color: "#D8F34A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ico n="spark" s={20} /></span>
                    <span style={{ fontSize: 13, lineHeight: 1.4 }}>{fmt(t.vuota, { t: titolo })}</span>
                  </div>
                  {puoModificare ? (
                    <>
                      <button type="button" className="mm-btn" disabled={busy} onClick={scriviAI}>{busy ? t.scrivi_ai_in_corso : t.scrivi_ai}</button>
                      <button type="button" className="mm-btn2" disabled={busy} onClick={copiaDa}>{fmt(t.copia_da, { f: fonteCopia })}</button>
                      <button type="button" className="mm-btn2" disabled={busy} onClick={() => apriForm(undefined)}>{t.scrivi_mano}</button>
                    </>
                  ) : (
                    <div className="mm-note">{t.sola_lettura}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      <Pannello aperto={!!videoPath} titolo={videoPath ? fmt(t.video_titolo, { n: videoPath.nome }) : ""} onChiudi={() => setVideoPath(null)}>
        {videoPath ? <VideoEsercizio sb={sb} path={videoPath.path} errore={t.video_assente} /> : null}
        <button type="button" className="mm-btn2" onClick={() => setVideoPath(null)}>{t.chiudi}</button>
      </Pannello>
      {toast}
    </SchermoCentro>
  );
}
