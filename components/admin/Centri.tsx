"use client";
/*
 * Scheda "Centri" del pannello admin (solo italiano).
 * Il super admin vede tutti i centri, ne crea di nuovi (vuoti o clonati), e per ciascuno gestisce
 * stato e prova, branding, membri e inviti. Il permesso vero è nel database (`is_admin()` nelle policy e in `clona_centro`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Errore, I, Ico, Tile, errMsg, useAdmin } from "./comuni";
import { Dettaglio } from "./centri/Dettaglio";
import { Nuovo } from "./centri/Nuovo";
import { BADGE_STATO, NOME_STATO, SLUG_MODELLO, esadecimale, giorniA, urlApp, urlDashboard, urlLogo, type Centro, type CentroConConteggi, type StatoCentro } from "./centri/tipi";

export function Centri() {
  const { sb } = useAdmin();
  const [lista, setLista] = useState<CentroConConteggi[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState(false);
  const [cerca, setCerca] = useState("");
  const [filtro, setFiltro] = useState<StatoCentro | "tutti">("tutti");

  const carica = useCallback(async () => {
    const { data, error } = await sb.from("centri").select("*").order("created_at", { ascending: false });
    if (error) return setErrore(errMsg(error));
    setErrore(null);
    const centri = (data ?? []) as Centro[];
    // i contatori si chiedono al database un centro per volta (solo conteggio, nessun dato di persone)
    const conteggi = await Promise.all(centri.map(async (c) => {
      const [m, a] = await Promise.all([
        sb.from("membri").select("id", { count: "exact", head: true }).eq("centro_id", c.id),
        sb.from("allievi").select("id", { count: "exact", head: true }).eq("centro_id", c.id),
      ]);
      return { ...c, n_membri: m.count ?? 0, n_allievi: a.count ?? 0 };
    }));
    setLista(conteggi);
  }, [sb]);
  useEffect(() => { void carica(); }, [carica]);

  const elenco = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return (lista ?? []).filter((c) =>
      (filtro === "tutti" || c.stato === filtro) &&
      (!q || [c.nome, c.nome_app, c.slug, c.citta].some((x) => (x ?? "").toLowerCase().includes(q))));
  }, [lista, cerca, filtro]);

  const centroSel = lista?.find((c) => c.id === sel) ?? null;
  if (centroSel) {
    return <Dettaglio centro={centroSel} indietro={() => setSel(null)} ricarica={carica} />;
  }

  const conta = (s: StatoCentro) => (lista ?? []).filter((c) => c.stato === s).length;
  const inScadenza = (lista ?? []).filter((c) => c.stato === "prova" && (giorniA(c.prova_fino) ?? 99) <= 7).length;

  return (
    <>
      <div className="db-testa">
        <div>
          <h1 className="db-titolo">Centri</h1>
          <p className="db-sotto">Ogni centro ha la sua app all&apos;indirizzo /c/nome-del-centro, con i suoi dati separati dagli altri.</p>
        </div>
        <div className="db-strumenti">
          <button type="button" className="db-btn2 acc" onClick={() => setNuovo((v) => !v)} aria-expanded={nuovo}><Ico d={I.piu} size={16} /> Nuovo centro</button>
        </div>
      </div>
      <Errore testo={errore} />

      <section className="db-kpi" aria-label="Riepilogo centri">
        <Tile colore="var(--blu)" icona={I.centri} lab="Centri" val={String(lista?.length ?? "…")} sub="compreso il modello" />
        <Tile colore="var(--arancio)" icona={I.orologio} lab="In prova" val={String(conta("prova"))} sub={inScadenza ? `${inScadenza} scadono entro 7 giorni` : "nessuna scade presto"} />
        <Tile colore="var(--verde)" icona={I.spunta} lab="Attivi" val={String(conta("attivo"))} />
        <Tile colore="var(--rosa)" icona={I.avviso} lab="Sospesi" val={String(conta("sospeso"))} />
      </section>

      {nuovo && (
        <Nuovo centri={lista ?? []} chiudi={() => setNuovo(false)}
          creato={async (slug) => { await carica(); setNuovo(false); const { data } = await sb.from("centri").select("id").eq("slug", slug).maybeSingle(); if (data) setSel(data.id); }} />
      )}

      <div className="db-strumenti">
        <label className="db-cerca">
          <Ico d={I.cerca} size={18} />
          <input type="search" placeholder="Cerca per nome, città o indirizzo" aria-label="Cerca centro" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </label>
        <div className="db-seg" role="group" aria-label="Filtra per stato">
          {(["tutti", "prova", "attivo", "sospeso"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{f === "tutti" ? "Tutti" : NOME_STATO[f]}</button>
          ))}
        </div>
      </div>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Elenco</h2><span className="db-nota">{elenco.length} {elenco.length === 1 ? "centro" : "centri"}</span></div>
        {!lista && !errore && <div className="db-vuoto">Carico i centri…</div>}
        {elenco.map((c) => {
          const g = giorniA(c.prova_fino);
          const logo = urlLogo(sb, c.logo_path);
          return (
            <div key={c.id} className="db-elenco-riga db-centro-riga">
              <button type="button" className="db-centro-apri" onClick={() => setSel(c.id)} aria-label={`Apri ${c.nome}`}>
                <span className="db-centro-mini" style={{ background: esadecimale(c.colore) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {logo ? <img src={logo} alt="" /> : <b>{(c.nome_app || c.nome).slice(0, 2).toUpperCase()}</b>}
                </span>
                <span className="t">
                  <b>{c.nome}{c.slug === SLUG_MODELLO && <span className="db-badge blu" style={{ marginLeft: 8 }}>modello</span>}</b>
                  <small>/c/{c.slug}{c.citta ? ` · ${c.citta}` : ""} · {c.n_membri} membri · {c.n_allievi} allievi</small>
                </span>
                <span className="db-centro-stato">
                  <span className={"db-badge " + BADGE_STATO[c.stato]}>{NOME_STATO[c.stato]}</span>
                  {c.stato === "prova" && g !== null && <span className="db-piccolo">{g < 0 ? `scaduta da ${-g} g` : g === 0 ? "scade oggi" : `${g} g rimasti`}</span>}
                </span>
              </button>
              <div className="az">
                <a className="db-btn2 piccolo" href={urlApp(c.slug)} target="_blank" rel="noopener noreferrer" aria-label={`Apri l'app di ${c.nome}`}>Apri app</a>
                <a className="db-btn2 piccolo" href={urlDashboard(c.slug)} target="_blank" rel="noopener noreferrer" aria-label={`Apri la dashboard di ${c.nome}`}>Dashboard</a>
              </div>
            </div>
          );
        })}
        {lista && !elenco.length && <div className="db-vuoto">{lista.length ? "Nessun centro corrisponde alla ricerca." : "Non c'è ancora nessun centro: creane uno con \"Nuovo centro\"."}</div>}
      </section>
    </>
  );
}
