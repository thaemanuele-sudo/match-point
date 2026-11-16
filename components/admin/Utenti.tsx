"use client";
/* Utenti e costi AI: tabella degli iscritti con la spesa, riepiloghi, grafico giornaliero e scheda per utente. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UsoUtente } from "@/lib/types";
import { Errore, I, Ico, Tile, coloreAvatar, data, errMsg, iniziali, intero, useAdmin, usd } from "./comuni";

type Riga = { giorno: string; provider: string; funzione: string; costo: number; chiamate: number };
type Periodo = "g" | "s" | "m";
const COL: Record<Periodo, keyof UsoUtente> = { g: "costo_oggi", s: "costo_settimana", m: "costo_mese" };
const NOME_PERIODO: Record<Periodo, string> = { g: "Oggi", s: "7 giorni", m: "30 giorni" };

const SERIE = {
  provider: [
    { k: "anthropic", n: "Anthropic", c: "var(--viola)" },
    { k: "openai", n: "OpenAI", c: "var(--teal)" },
  ],
  funzione: [
    { k: "chat", n: "Chat", c: "var(--blu)" },
    { k: "analisi", n: "Analisi", c: "var(--viola)" },
    { k: "voce", n: "Voce", c: "var(--verde)" },
  ],
} as const;
const ALTRO = { k: "altro", n: "Altro", c: "var(--fg3)" };

const num = (v: unknown) => Number(v) || 0;
/** Ultimi n giorni (UTC, come le date del database), dal più vecchio a oggi. */
function ultimiGiorni(n: number) {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 864e5).toISOString().slice(0, 10));
}
const tipoLabel: Record<string, string> = { giocatore: "Giocatore", maestro: "Maestro", genitore: "Genitore" };

// ---------- grafico a barre impilate fatto a mano in SVG ----------
function Grafico({ righe, per, giorni = 30 }: { righe: Riga[]; per: "provider" | "funzione"; giorni?: number }) {
  const giornate = ultimiGiorni(giorni);
  const serie = [...SERIE[per], ALTRO];
  const chiave = (r: Riga) => {
    const v = (per === "provider" ? r.provider : r.funzione).toLowerCase();
    return serie.find((s) => v.includes(s.k))?.k ?? "altro";
  };
  const per_giorno = giornate.map((g) => {
    const tot: Record<string, number> = {};
    righe.filter((r) => String(r.giorno).slice(0, 10) === g).forEach((r) => { const k = chiave(r); tot[k] = (tot[k] || 0) + num(r.costo); });
    return { g, tot, somma: Object.values(tot).reduce((a, b) => a + b, 0) };
  });
  const max = Math.max(0.0001, ...per_giorno.map((d) => d.somma));
  const W = 600, H = 170, passo = W / giorni, larg = passo * 0.72;
  const usate = serie.filter((s) => righe.some((r) => chiave(r) === s.k));
  return (
    <div className="db-grafico">
      <svg viewBox={`0 0 ${W} ${H + 4}`} width="100%" preserveAspectRatio="none" style={{ height: 180, display: "block" }} role="img" aria-label={`Spesa AI giornaliera degli ultimi ${giorni} giorni`}>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="var(--sep)" strokeWidth="0.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />)}
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--sep)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {per_giorno.map((d, i) => {
          let y = H;
          return (
            <g key={d.g}>
              <title>{`${d.g}: ${usd(d.somma)}`}</title>
              {d.somma === 0 && <rect x={i * passo + (passo - larg) / 2} y={H - 2} width={larg} height={2} rx="1" fill="var(--sep)" />}
              {serie.map((s) => {
                const v = d.tot[s.k] || 0;
                if (!v) return null;
                const h = Math.max(1.5, (v / max) * (H - 6));
                y -= h;
                return <rect key={s.k} x={i * passo + (passo - larg) / 2} y={y} width={larg} height={h} rx="1.5" style={{ fill: s.c }} />;
              })}
            </g>
          );
        })}
      </svg>
      <div className="db-asse"><span>{per_giorno[0].g.slice(5).replace("-", "/")}</span><span>massimo {usd(max)}</span><span>oggi</span></div>
      <div className="db-leg" style={{ padding: "10px 0 0" }}>
        {usate.map((s) => <span key={s.k}><i style={{ background: s.c }} />{s.n}</span>)}
        {!usate.length && <span>Nessuna spesa registrata in questo periodo.</span>}
      </div>
    </div>
  );
}

function Avatar({ u, grande }: { u: UsoUtente; grande?: boolean }) {
  const c = coloreAvatar(u.id);
  return (
    <span className="db-avatar" style={{ background: `linear-gradient(150deg, color-mix(in srgb, ${c} 70%, #fff), ${c})`, ...(grande ? { width: 64, height: 64, borderRadius: 32, fontSize: 24 } : {}) }}>
      {iniziali(u.nome, u.cognome)}
    </span>
  );
}

export function Utenti() {
  const { sb } = useAdmin();
  const [utenti, setUtenti] = useState<UsoUtente[] | null>(null);
  const [giorni, setGiorni] = useState<Riga[]>([]);
  const [budget, setBudget] = useState(0);
  const [errore, setErrore] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("m");
  const [cerca, setCerca] = useState("");
  const [per, setPer] = useState<"provider" | "funzione">("provider");
  const [sel, setSel] = useState<string | null>(null);

  const carica = useCallback(async () => {
    setErrore(null);
    const [u, g, s] = await Promise.all([sb.rpc("admin_users_overview"), sb.rpc("admin_usage_daily", { p_days: 30, p_user: null }), sb.rpc("admin_get_settings")]);
    if (u.error) return setErrore(errMsg(u.error));
    if (g.error) setErrore(errMsg(g.error));
    setUtenti((u.data as UsoUtente[]).map((x) => ({ ...x, costo_oggi: num(x.costo_oggi), costo_settimana: num(x.costo_settimana), costo_mese: num(x.costo_mese), costo_totale: num(x.costo_totale), chiamate_mese: num(x.chiamate_mese), token_in_mese: num(x.token_in_mese), token_out_mese: num(x.token_out_mese), caratteri_mese: num(x.caratteri_mese) })));
    setGiorni(((g.data as Riga[]) ?? []).map((r) => ({ ...r, costo: num(r.costo), chiamate: num(r.chiamate) })));
    const b = ((s.data as { key: string; value: string }[]) ?? []).find((r) => r.key === "budget_mensile_utente_usd");
    setBudget(num(b?.value));
  }, [sb]);
  useEffect(() => { void carica(); }, [carica]);

  const elenco = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return (utenti ?? [])
      .filter((u) => !q || [u.nome, u.cognome, u.email, u.telefono].some((x) => (x ?? "").toLowerCase().includes(q)))
      .sort((a, b) => num(b[COL[periodo]]) - num(a[COL[periodo]]) || a.cognome.localeCompare(b.cognome));
  }, [utenti, cerca, periodo]);

  if (!utenti) return errore ? <Errore testo={errore} /> : <div className="db-caric"><span className="db-spin" aria-label="Caricamento" /></div>;

  const somma = (k: keyof UsoUtente) => utenti.reduce((a, u) => a + num(u[k]), 0);
  const nuovi = utenti.filter((u) => Date.now() - new Date(u.creato_il).getTime() < 7 * 864e5).length;
  const oltre = budget > 0 ? utenti.filter((u) => u.costo_mese > budget).length : 0;
  const medio = utenti.length ? somma("costo_mese") / utenti.length : 0;

  const utente = sel ? utenti.find((u) => u.id === sel) : null;
  if (utente) return <Scheda u={utente} budget={budget} indietro={() => setSel(null)} />;

  const esporta = () => {
    const intest = ["Nome", "Cognome", "Email", "Telefono", "Tipo", "Fascia", "Iscritto il", "Ultimo accesso", "Spesa oggi USD", "Spesa 7 giorni USD", "Spesa 30 giorni USD", "Spesa totale USD", "Chiamate mese", "Token in mese", "Token out mese"];
    const cella = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const righe = elenco.map((u) => [u.nome, u.cognome, u.email, u.telefono, u.tipo_utente, u.fascia, u.creato_il, u.ultimo_accesso, u.costo_oggi, u.costo_settimana, u.costo_mese, u.costo_totale, u.chiamate_mese, u.token_in_mese, u.token_out_mese].map(cella).join(";"));
    const blob = new Blob(["﻿" + [intest.map(cella).join(";"), ...righe].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `utenti-match-point-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const ev = (p: Periodo) => (periodo === p ? " db-colonna-ev" : "");
  return (
    <>
      <div className="db-testa">
        <div>
          <h1 className="db-titolo">Utenti e costi AI</h1>
          <p className="db-sotto">{utenti.length} iscritti · spesa in dollari (USD)</p>
        </div>
        <div className="db-strumenti">
          <div className="db-seg" role="group" aria-label="Periodo">
            {(["g", "s", "m"] as Periodo[]).map((p) => <button key={p} type="button" aria-pressed={periodo === p} onClick={() => setPeriodo(p)}>{p === "g" ? "Giorno" : p === "s" ? "Settimana" : "Mese"}</button>)}
          </div>
          <button type="button" className="db-btn2" onClick={esporta}><Ico d={I.scarica} size={16} /> CSV</button>
        </div>
      </div>
      <Errore testo={errore} />

      <section className="db-kpi" aria-label="Riepilogo">
        <Tile colore="var(--blu)" icona={I.persone} lab="Utenti totali" val={intero(utenti.length)} sub={`${nuovi} nuovi negli ultimi 7 giorni`} />
        <Tile colore="var(--verde)" icona={I.dollaro} lab="Spesa oggi" val={usd(somma("costo_oggi"))} sub="tutti gli utenti" />
        <Tile colore="var(--teal)" icona={I.dollaro} lab="Spesa 7 giorni" val={usd(somma("costo_settimana"))} sub="tutti gli utenti" />
        <Tile colore="var(--viola)" icona={I.dollaro} lab="Spesa 30 giorni" val={usd(somma("costo_mese"))} sub="tutti gli utenti" />
        <Tile colore="var(--arancio)" icona={I.grafico} lab="Costo medio per utente" val={usd(medio)} sub="al mese" />
        <Tile colore="var(--rosa)" icona={I.avviso} lab="Oltre il budget" val={intero(oltre)} sub={budget > 0 ? `limite ${usd(budget)} al mese` : "budget illimitato"} />
      </section>

      <section className="db-card">
        <div className="db-card-testa">
          <h2 className="db-h2">Spesa giornaliera · ultimi 30 giorni</h2>
          <div className="db-seg" role="group" aria-label="Suddivisione" style={{ height: 36 }}>
            <button type="button" aria-pressed={per === "provider"} onClick={() => setPer("provider")}>Provider</button>
            <button type="button" aria-pressed={per === "funzione"} onClick={() => setPer("funzione")}>Funzione</button>
          </div>
        </div>
        <Grafico righe={giorni} per={per} />
      </section>

      <label className="db-cerca">
        <Ico d={I.cerca} size={18} />
        <input type="search" placeholder="Cerca per nome, email o telefono" aria-label="Cerca utente" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      </label>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Iscritti</h2><span className="db-nota">ordinati per spesa · {NOME_PERIODO[periodo]}</span></div>
        <div className="db-tab utenti">
          <div className="db-tab-in largo">
            <div className="db-riga db-riga-u testa">
              <span /><span>Utente</span><span>Email · telefono</span><span>Tipo</span><span>Iscritto il</span><span>Ultimo accesso</span>
              <span className={"db-dx" + ev("g")}>Oggi</span><span className={"db-dx" + ev("s")}>7 giorni</span><span className={"db-dx" + ev("m")}>30 giorni</span>
              <span className="db-dx">Totale</span><span className="db-dx">Mese: chiamate</span>
            </div>
            {elenco.map((u) => (
              <button key={u.id} type="button" className="db-riga db-riga-u utente" onClick={() => setSel(u.id)}>
                <Avatar u={u} />
                <span className="db-chi"><span><span className="db-nome">{u.nome} {u.cognome}</span>{u.ruolo === "admin" && <span className="db-piccolo">amministratore</span>}</span></span>
                <span style={{ minWidth: 0 }}><span className="db-trunc" style={{ display: "block" }}>{u.email}</span><span className="db-piccolo">{u.telefono || "—"}</span></span>
                <span><span className="db-badge grigio">{tipoLabel[u.tipo_utente] ?? u.tipo_utente}</span>{u.fascia && <span className="db-piccolo" style={{ display: "block" }}>{u.fascia}</span>}</span>
                <span className="db-num">{data(u.creato_il)}</span>
                <span className="db-num">{data(u.ultimo_accesso)}</span>
                <span className={"db-dx" + ev("g")}><span className="db-forte">{usd(u.costo_oggi)}</span></span>
                <span className={"db-dx" + ev("s")}><span className="db-forte">{usd(u.costo_settimana)}</span></span>
                <span className={"db-dx" + ev("m")}><span className="db-forte" style={budget > 0 && u.costo_mese > budget ? { color: "var(--rosa)" } : undefined}>{usd(u.costo_mese)}</span></span>
                <span className="db-dx"><span className="db-forte">{usd(u.costo_totale)}</span></span>
                <span className="db-dx"><span className="db-num">{intero(u.chiamate_mese)}</span><span className="db-piccolo">{intero(u.token_in_mese + u.token_out_mese)} token</span></span>
              </button>
            ))}
          </div>
        </div>
        {/* telefono: celle in stile iOS */}
        <div className="db-lista">
          {elenco.map((u) => (
            <button key={u.id} type="button" className="db-cella" onClick={() => setSel(u.id)}>
              <Avatar u={u} />
              <span className="db-chi" style={{ minWidth: 0 }}><span><span className="db-nome">{u.nome} {u.cognome}</span><span className="db-piccolo db-trunc">{u.email}</span></span></span>
              <Ico d={I.avanti} size={16} />
              <span className="db-cella-dati">
                {(["g", "s", "m"] as Periodo[]).map((p) => (
                  <span key={p} className="db-mini" style={{ background: periodo === p ? "color-mix(in srgb, var(--acc) 18%, transparent)" : "var(--card2)" }}>
                    <i>{NOME_PERIODO[p]}</i><b>{usd(num(u[COL[p]]))}</b>
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
        {!elenco.length && <div className="db-vuoto">Nessun utente trovato.</div>}
      </section>
      <p className="db-piede">Il costo è stimato con la tabella prezzi delle Impostazioni al momento della chiamata.</p>
    </>
  );
}

// ---------- scheda di un utente ----------
function Scheda({ u, budget, indietro }: { u: UsoUtente; budget: number; indietro: () => void }) {
  const { sb } = useAdmin();
  const [righe, setRighe] = useState<Riga[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    sb.rpc("admin_usage_daily", { p_days: 30, p_user: u.id }).then(({ data: d, error }) => {
      if (error) return setErr(errMsg(error));
      setRighe(((d as Riga[]) ?? []).map((r) => ({ ...r, costo: num(r.costo), chiamate: num(r.chiamate) })));
    });
  }, [sb, u.id]);

  const tot = (k: string) => (righe ?? []).filter((r) => r.funzione.toLowerCase().includes(k));
  const funzioni = SERIE.funzione.map((f) => {
    const r = tot(f.k);
    return { ...f, costo: r.reduce((a, x) => a + x.costo, 0), chiamate: r.reduce((a, x) => a + x.chiamate, 0) };
  });
  const totale30 = (righe ?? []).reduce((a, r) => a + r.costo, 0);
  const perc = budget > 0 ? Math.min(100, (u.costo_mese / budget) * 100) : 0;

  return (
    <>
      <div className="db-testa">
        <button type="button" className="db-indietro" onClick={indietro}><Ico d={I.indietro} size={22} /> Utenti</button>
      </div>
      <section className="db-card db-profilo">
        <span className="db-chi" style={{ gap: 16 }}>
          <Avatar u={u} grande />
          <span>
            <span className="db-nome" style={{ fontSize: 24, whiteSpace: "normal" }}>{u.nome} {u.cognome}</span>
            <span className="db-piccolo" style={{ fontSize: 14 }}>{u.email} · {u.telefono || "telefono n.d."}</span>
            <span className="db-chips">
              <span className="db-badge blu">{tipoLabel[u.tipo_utente] ?? u.tipo_utente}</span>
              {u.fascia && <span className="db-badge viola">{u.fascia}</span>}
              {u.ruolo === "admin" && <span className="db-badge arancio">admin</span>}
              <span className="db-badge grigio">iscritto il {data(u.creato_il)}</span>
              <span className="db-badge grigio">ultimo accesso {data(u.ultimo_accesso, true)}</span>
            </span>
          </span>
        </span>
        <span className="db-totale"><span className="db-nota">Spesa totale</span><b>{usd(u.costo_totale)}</b></span>
      </section>
      <Errore testo={err} />
      <section className="db-kpi">
        <Tile colore="var(--verde)" icona={I.dollaro} lab="Oggi" val={usd(u.costo_oggi)} />
        <Tile colore="var(--teal)" icona={I.dollaro} lab="7 giorni" val={usd(u.costo_settimana)} />
        <Tile colore="var(--viola)" icona={I.dollaro} lab="30 giorni" val={usd(u.costo_mese)} sub={budget > 0 ? `${Math.round(perc)}% del budget ${usd(budget)}` : "budget illimitato"} />
        <Tile colore="var(--blu)" icona={I.grafico} lab="Chiamate nel mese" val={intero(u.chiamate_mese)} sub={`${intero(u.token_in_mese)} token in · ${intero(u.token_out_mese)} out · ${intero(u.caratteri_mese)} caratteri voce`} />
      </section>
      <div className="db-griglia2">
        <section className="db-card larga">
          <div className="db-card-testa"><h2 className="db-h2">Spesa giornaliera</h2><span className="db-nota">ultimi 30 giorni · per funzione</span></div>
          {righe ? <Grafico righe={righe} per="funzione" /> : <div className="db-vuoto">Carico…</div>}
        </section>
        <section className="db-card">
          <div className="db-card-testa"><h2 className="db-h2">Per funzione</h2><span className="db-nota">30 giorni</span></div>
          {funzioni.map((f) => (
            <div key={f.k} className="db-voce">
              <span className="q" style={{ background: f.c }}><Ico d={I.grafico} size={16} /></span>
              <span className="t"><b>{f.n}</b><small>{intero(f.chiamate)} chiamate · {totale30 > 0 ? Math.round((f.costo / totale30) * 100) : 0}%</small></span>
              <b>{usd(f.costo)}</b>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
