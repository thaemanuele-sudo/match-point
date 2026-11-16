"use client";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "@/components/centro/Schermo";
import { VideoEsercizio } from "./Video";
import { FormEsercizio, type DatiEsercizio } from "./FormEsercizio";
import { Pannello } from "./Pannello";
import { Ico } from "./ico";
import { comune, fmt } from "./testi";
import { COLPI, FASCE, leggiEsercizio, leggiLinea, nomeColpo, rangeFasce, type ColpoK, type Esercizio, type LineaGuida } from "./dati";
import { useMetodo } from "./useMetodo";
import "./metodo.css";

const it = {
  ...comune,
  titolo: "Il mio Metodo",
  kick: "Consultazione · {centro}",
  v_lg: "Linee guida",
  v_lib: "Libreria",
  v_pro: "Proponi",
  tag_lg: "Linea guida del centro",
  livello: "Livello atteso.",
  atteso_scala: "Atteso a fine ciclo: {n} · {l}",
  competenze: "Competenze attese",
  errore_tipico: "Errore tipico",
  scala: "Scala di valutazione",
  video_tempo: "Video {t}",
  nota_lg: "Le linee guida sono bloccate: le gestisce {dt}. Se manca qualcosa, proponi un esercizio.",
  senza_lg: "Per {t} il centro non ha ancora scritto la linea guida. Se ti serve, proponi un esercizio.",
  solo_consultazione: "Solo consultazione. Gli esercizi che proponi compaiono qui come \"Proposto da maestro\" finché il direttore tecnico non li approva.",
  nessuno: "Nessun esercizio per questo colpo.",
  meta: "{c} · {f}",
  dettaglio_materiale: "Materiale",
  dettaglio_come: "Come si svolge",
  senza_video: "Nessun video allegato.",
  video_assente: "Il video non è disponibile in questo momento.",
  video_titolo: "Errore tipico · {n}",
  invia: "Proponi a {dt}",
  invia_dt: "Proponi al direttore tecnico",
  nota_invio: "Il direttore tecnico lo valuta: se lo approva entra nella libreria del centro, altrimenti ti scrive il motivo.",
  ok_titolo: "Proposta inviata",
  ok_testo: "\"{n}\" · {d}' è in attesa di {dt}. Lo trovi in Libreria come \"Proposto da maestro\".",
  ok_tag: "Da approvare",
  nuova: "Nuova proposta",
  vai_lib: "Vai alla libreria",
  notifica_t: "Esercizio proposto",
  notifica_x: "{chi} propone \"{n}\". Approvalo o rifiutalo dalla Libreria.",
  il_dt: "il direttore tecnico",
  maestro: "Un maestro",
};
const T = { it, en: { ...it } };

type Vista = "lg" | "lib" | "pro";
const DURATE = [5, 10, 15];

/** M9 · Il mio Metodo: linee guida e libreria in sola lettura, più la proposta di un nuovo esercizio. */
export default function MaestroMetodo() {
  const t = useT(T) as Record<string, string>;
  const { sb, centro, attivo, reg } = useMetodo();
  const [vista, setVista] = useState<Vista>("lg");
  const [fascia, setFascia] = useState<string>("U12");
  const [colpo, setColpo] = useState<ColpoK>("dritto");
  const [filtro, setFiltro] = useState<ColpoK | "tutti">("tutti");
  const [linee, setLinee] = useState<LineaGuida[]>([]);
  const [ex, setEx] = useState<Esercizio[]>([]);
  const [fasceMie, setFasceMie] = useState<string[]>([]);
  const [dt, setDt] = useState("");
  const [carica, setCarica] = useState(true);
  const [ko, setKo] = useState(false);
  const [aperto, setAperto] = useState<Esercizio | null>(null);
  const [videoErr, setVideoErr] = useState<{ path: string; nome: string } | null>(null);
  const [inviata, setInviata] = useState<{ nome: string; durata: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const [formKey, setFormKey] = useState(0);

  const leggi = useCallback(async () => {
    const defL = [t.scala_1, t.scala_2, t.scala_3, t.scala_4];
    const [a, b, c, d] = await Promise.all([
      sb.from("linee_guida").select("*").eq("centro_id", centro.id),
      sb.from("esercizi").select("*").eq("centro_id", centro.id).order("created_at", { ascending: false }),
      attivo ? sb.from("gruppi_maestri").select("gruppo_id").eq("membro_id", attivo.id) : Promise.resolve({ data: [], error: null }),
      sb.from("membri").select("nome,cognome,ruolo").eq("centro_id", centro.id).in("ruolo", ["dt", "titolare"]).order("ruolo", { ascending: false }),
    ]);
    if (a.error || b.error) {
      setKo(true);
      setCarica(false);
      return;
    }
    setLinee((a.data ?? []).map((r: Record<string, unknown>) => leggiLinea(r, defL)).filter(Boolean) as LineaGuida[]);
    setEx((b.data ?? []).map((r: Record<string, unknown>) => leggiEsercizio(r)));
    const dtRow = (d.data ?? [])[0] as Record<string, unknown> | undefined;
    if (dtRow) setDt([dtRow.nome, dtRow.cognome].filter(Boolean).join(" "));
    // La fascia di partenza è quella dei gruppi del maestro
    const ids = (c.data ?? []).map((r: Record<string, unknown>) => String(r.gruppo_id));
    if (ids.length) {
      const g = await sb.from("gruppi").select("fascia").in("id", ids);
      const f = [...new Set((g.data ?? []).map((r: Record<string, unknown>) => String(r.fascia)).filter(Boolean))] as string[];
      setFasceMie(f);
      if (f.length) setFascia((p) => (f.includes(p) ? p : f[0]));
    }
    setKo(false);
    setCarica(false);
  }, [sb, centro.id, attivo, t]);
  useEffect(() => {
    leggi();
  }, [leggi]);

  const dtNome = dt || t.il_dt;
  const sel = linee.find((l) => l.fascia === fascia && l.colpo === colpo);
  const titolo = `${fascia} · ${t[`colpo_${colpo}`]}`;

  // Il maestro vede gli esercizi approvati e solo le sue proposte ancora in attesa
  const visibili = ex.filter((e) => (e.stato === "approvato" && (filtro === "tutti" || e.colpo === filtro)) || (e.stato === "proposto" && e.proposto_da === attivo?.id && (filtro === "tutti" || e.colpo === filtro)));
  const tagFonte = (e: Esercizio) =>
    e.stato === "proposto" ? { l: t.fonte_maestro, s: { background: "#2A2A10", color: "#FFD54A" } } : e.fonte === "matchpoint" ? { l: t.fonte_matchpoint, s: { background: "#232326", color: "#A1A1A6" } } : { l: t.fonte_centro, s: { background: "#12281D", color: "#4CD07D" } };

  async function proponi(d: DatiEsercizio) {
    setBusy(true);
    setErrore("");
    const { error } = await sb.from("esercizi").insert({
      centro_id: centro.id, titolo: d.titolo, colpo: nomeColpo(d.colpo), fasce: d.fasce, durata_min: d.durata, materiale: d.materiale, descrizione: d.descrizione,
      video_path: d.video_path, fonte: "maestro", stato: "proposto", proposto_da: attivo?.id ?? null,
    });
    if (error) {
      setBusy(false);
      return setErrore(t.errore);
    }
    await reg("metodo.esercizio.proponi", d.titolo, { colpo: d.colpo, fasce: d.fasce, durata: d.durata, video: !!d.video_path });
    try {
      // Avviso al DT: se la policy non lo permette, la proposta resta comunque in libreria da approvare
      const r = await sb.from("membri").select("id").eq("centro_id", centro.id).in("ruolo", ["dt", "titolare"]);
      const chi = [attivo?.nome, attivo?.cognome].filter(Boolean).join(" ") || t.maestro;
      const righe = (r.data ?? []).map((m: Record<string, unknown>) => ({ centro_id: centro.id, membro_id: String(m.id), tipo: "sistema", titolo: t.notifica_t, testo: fmt(t.notifica_x, { chi, n: d.titolo }), link: `/c/${centro.slug}/dt/metodo/libreria`, mittente: attivo?.id ?? null }));
      if (righe.length) await sb.from("notifiche").insert(righe);
    } catch {
      /* ignorata */
    }
    setBusy(false);
    setInviata({ nome: d.titolo, durata: d.durata });
    leggi();
  }

  return (
    <SchermoCentro ruolo="maestro" tab="metodo" titolo={t.titolo} sopra={fmt(t.kick, { centro: centro.nome })}>
      <div className="mm">
        <div className="mm-seg" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {(["lg", "lib", "pro"] as Vista[]).map((v) => (
            <button key={v} type="button" className={`mm-sg${vista === v ? " on" : ""}`} onClick={() => setVista(v)}>{t[`v_${v}`]}</button>
          ))}
        </div>
        {carica ? <div className="mm-load">{t.caricamento}</div> : null}
        {ko ? <div className="mm-err">{t.errore_lettura}</div> : null}

        {!carica && !ko && vista === "lg" ? (
          <>
            <div className="mm-scroll">
              {FASCE.map((f) => (
                <button key={f} type="button" className={`mm-chip${f === fascia ? " on" : ""}`} aria-pressed={f === fascia} aria-label={fmt(t.fascia_aria, { f: t[`fascia_${f}`] })} onClick={() => setFascia(f)} style={{ height: 32, fontSize: 13 }}>{f}{fasceMie.includes(f) ? " •" : ""}</button>
              ))}
            </div>
            <div className="mm-scroll">
              {COLPI.map((c) => (
                <button key={c.k} type="button" className={`mm-chip${c.k === colpo ? " on" : ""}`} aria-pressed={c.k === colpo} onClick={() => setColpo(c.k)}>{c.k === "gambe" ? t.colpo_gambe_c : t[`colpo_${c.k}`]}</button>
              ))}
            </div>
            {sel ? (
              <>
                <div className="mm-card" style={{ padding: "13px 14px", gap: 9 }}>
                  <div className="mm-row"><span className="mm-disp mm-grow" style={{ fontSize: 26, fontWeight: 800, fontStyle: "italic", lineHeight: 1 }}>{titolo}</span><span className="mm-tag" style={{ color: "#A1A1A6" }}>{t.tag_lg}</span></div>
                  {sel.scala.livello ? <div style={{ fontSize: 13, lineHeight: 1.4, color: "#D6D6DA" }}><b style={{ color: "#D8F34A" }}>{t.livello}</b> {sel.scala.livello}</div> : null}
                  <div className="mm-k">{t.competenze}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sel.competenze.map((x, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, lineHeight: 1.35 }}><span className="mm-dot" style={{ background: "#4CD07D", marginTop: 5, width: 8, height: 8 }} /><span>{x}</span></div>
                    ))}
                  </div>
                  {sel.errori.slice(0, 2).map((e, i) => (
                    <button key={i} type="button" className="mm-li" style={{ background: "#0E0E10", borderRadius: 14 }} disabled={!e.video_path} onClick={() => e.video_path && setVideoErr({ path: e.video_path, nome: e.nome })}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: "#232326", color: "#D8F34A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ico n="video" s={18} /></span>
                      <span className="mm-grow"><span className="mm-k" style={{ display: "block" }}>{t.errore_tipico}</span><span style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{e.nome}</span></span>
                      {e.tempo ? <span className="mm-tag">{fmt(t.video_tempo, { t: e.tempo })}</span> : null}
                    </button>
                  ))}
                  <div className="mm-sec"><span className="mm-k">{t.scala}</span><span style={{ fontSize: 11.5, color: "#D8F34A" }}>{fmt(t.atteso_scala, { n: sel.scala.atteso, l: sel.scala.livelli[sel.scala.atteso - 1] })}</span></div>
                </div>
                <div className="mm-note" style={{ alignItems: "center" }}><span style={{ color: "#D8F34A" }}><Ico n="lock" s={16} /></span><span>{fmt(t.nota_lg, { dt: dtNome })}</span></div>
              </>
            ) : (
              <div className="mm-note">{fmt(t.senza_lg, { t: titolo })}</div>
            )}
          </>
        ) : null}

        {!carica && !ko && vista === "lib" ? (
          <>
            <div className="mm-scroll">
              <button type="button" className={`mm-chip${filtro === "tutti" ? " on" : ""}`} onClick={() => setFiltro("tutti")}>{t.tutti}</button>
              {COLPI.map((c) => (
                <button key={c.k} type="button" className={`mm-chip${filtro === c.k ? " on" : ""}`} onClick={() => setFiltro(c.k)}>{c.k === "gambe" ? t.colpo_gambe_c : t[`colpo_${c.k}`]}</button>
              ))}
            </div>
            <div className="mm-cards" style={{ gap: 7 }}>
              {visibili.length === 0 ? <div className="mm-load">{t.nessuno}</div> : null}
              {visibili.map((e) => {
                const tg = tagFonte(e);
                return (
                  <button key={e.id} type="button" className="mm-li" style={{ padding: "10px 12px", gap: 12 }} onClick={() => setAperto(e)}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, background: "#232326", color: "#D8F34A", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ico n="play" s={18} fill /></span>
                    <span className="mm-grow"><span className="t mm-ell" style={{ display: "block", fontSize: 14 }}>{e.titolo}</span><span className="s mm-ell" style={{ display: "block", fontSize: 12 }}>{fmt(t.meta, { c: e.colpo ? t[`colpo_${e.colpo}`] : "", f: rangeFasce(e.fasce) })}{e.materiale ? ` · ${e.materiale}` : ""}</span></span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className="mm-disp" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}>{fmt(t.min_ab, { n: e.durata })}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap", ...tg.s }}>{tg.l}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mm-note">{t.solo_consultazione}</div>
          </>
        ) : null}

        {!carica && !ko && vista === "pro" ? (
          inviata ? (
            <>
              <div className="mm-card" style={{ padding: "18px 16px", alignItems: "center", textAlign: "center", borderColor: "rgba(76,208,125,.4)" }}>
                <span style={{ width: 48, height: 48, borderRadius: "50%", background: "#10281B", color: "#4CD07D", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico n="check" s={24} w={2.6} /></span>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{t.ok_titolo}</div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#A1A1A6" }}>{fmt(t.ok_testo, { n: inviata.nome, d: inviata.durata, dt: dtNome })}</div>
                <span className="mm-tag ye">{t.ok_tag}</span>
              </div>
              <div className="mm-row">
                <button type="button" className="mm-btn2" style={{ flex: 1 }} onClick={() => { setInviata(null); setFormKey((k) => k + 1); }}>{t.nuova}</button>
                <button type="button" className="mm-btn" style={{ flex: 1 }} onClick={() => { setInviata(null); setVista("lib"); }}>{t.vai_lib}</button>
              </div>
            </>
          ) : (
            <>
              <FormEsercizio key={formKey} sb={sb} centroId={centro.id} durate={DURATE} etichettaSalva={dt ? fmt(t.invia, { dt }) : t.invia_dt} onSalva={proponi} busy={busy} errore={errore} fasceIniziali={fasceMie} />
              <div className="mm-note">{t.nota_invio}</div>
            </>
          )
        ) : null}
      </div>

      <Pannello aperto={!!aperto} titolo={aperto?.titolo ?? ""} onChiudi={() => setAperto(null)}>
        {aperto ? (
          <>
            {aperto.video_path ? <VideoEsercizio sb={sb} path={aperto.video_path} errore={t.video_assente} /> : <div className="mm-note">{t.senza_video}</div>}
            <div style={{ fontSize: 13, color: "#A1A1A6" }}>{fmt(t.meta, { c: aperto.colpo ? t[`colpo_${aperto.colpo}`] : "", f: rangeFasce(aperto.fasce) })} · {fmt(t.min_ab, { n: aperto.durata })}</div>
            {aperto.materiale ? <div><div className="mm-k">{t.dettaglio_materiale}</div><div style={{ fontSize: 14, marginTop: 3 }}>{aperto.materiale}</div></div> : null}
            {aperto.descrizione ? <div><div className="mm-k">{t.dettaglio_come}</div><div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 3 }}>{aperto.descrizione}</div></div> : null}
            <button type="button" className="mm-btn2" onClick={() => setAperto(null)}>{t.chiudi}</button>
          </>
        ) : null}
      </Pannello>
      <Pannello aperto={!!videoErr} titolo={videoErr ? fmt(t.video_titolo, { n: videoErr.nome }) : ""} onChiudi={() => setVideoErr(null)}>
        {videoErr ? <VideoEsercizio sb={sb} path={videoErr.path} errore={t.video_assente} /> : null}
        <button type="button" className="mm-btn2" onClick={() => setVideoErr(null)}>{t.chiudi}</button>
      </Pannello>
    </SchermoCentro>
  );
}
