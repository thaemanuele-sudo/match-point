"use client";
/* Schemi di gioco: elenco, creazione/modifica/eliminazione e editor dell'animazione sul campo. */
import { useCallback, useEffect, useRef, useState } from "react";
import { CampoAnimato } from "@/components/schemi/CampoAnimato";
import { urlContenuto } from "@/lib/contenuti";
import type { AnimazioneSchema, ElementoSchema, Fascia, SchemaGioco } from "@/lib/types";
import { CaricaFile, Campo, Conferma, Errore, Fasce, I, Ico, Interruttore, errMsg, rimuoviContenuti, useAdmin } from "./comuni";

type Bozza = {
  id?: string; titolo: string; descrizione: string; obiettivo: string; fasce: Fascia[]; difficolta: number;
  animazione: AnimazioneSchema; copertina_path: string | null; ordine: number; pubblicato: boolean;
};
const VUOTA: Bozza = {
  titolo: "", descrizione: "", obiettivo: "", fasce: [], difficolta: 1, copertina_path: null, ordine: 0, pubblicato: false,
  animazione: { durata: 6, elementi: [], note: [] },
};
const TIPI: { v: ElementoSchema["tipo"]; n: string; c: string }[] = [
  { v: "giocatore", n: "Giocatore", c: "#D8F34A" }, { v: "avversario", n: "Avversario", c: "#FF8A6B" },
  { v: "palla", n: "Palla", c: "#D8F34A" }, { v: "cono", n: "Cono", c: "#FF9F0A" },
];
const tr = (n: number) => Math.round(n * 100) / 100;

export function Schemi() {
  const { sb, avvisa } = useAdmin();
  const [lista, setLista] = useState<SchemaGioco[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [daEliminare, setDaEliminare] = useState<SchemaGioco | null>(null);
  const [occ, setOcc] = useState(false);

  const carica = useCallback(async () => {
    const { data, error } = await sb.from("game_schemes").select("*").order("ordine").order("creato_il");
    if (error) return setErrore(errMsg(error));
    setErrore(null);
    setLista(data as SchemaGioco[]);
  }, [sb]);
  useEffect(() => { void carica(); }, [carica]);

  const elimina = async () => {
    if (!daEliminare) return;
    setOcc(true);
    const { error } = await sb.from("game_schemes").delete().eq("id", daEliminare.id);
    setOcc(false);
    if (error) { setErrore(errMsg(error)); setDaEliminare(null); return; }
    await rimuoviContenuti(sb, [daEliminare.copertina_path]);
    setDaEliminare(null);
    avvisa("Schema eliminato");
    void carica();
  };

  if (bozza) return <Editor iniziale={bozza} chiudi={() => setBozza(null)} salvato={() => { setBozza(null); void carica(); }} />;

  return (
    <>
      <div className="db-testa">
        <div><h1 className="db-titolo">Schemi di gioco</h1><p className="db-sotto">Schemi animati mostrati nella sezione Tattica dell&apos;app.</p></div>
        <button type="button" className="db-btn2 acc" onClick={() => setBozza({ ...VUOTA, ordine: (lista?.length ?? 0) + 1 })}><Ico d={I.piu} size={16} /> Nuovo schema</button>
      </div>
      <Errore testo={errore} />
      <section className="db-card">
        {!lista && !errore && <div className="db-vuoto">Carico…</div>}
        {lista?.length === 0 && <div className="db-vuoto">Nessuno schema. Creane uno con &quot;Nuovo schema&quot;.</div>}
        {lista?.map((s) => (
          <div key={s.id} className="db-elenco-riga">
            {s.copertina_path
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className="mini" src={urlContenuto(s.copertina_path) ?? ""} alt="" />
              : <span className="mini"><Ico d={I.film} size={18} /></span>}
            <span className="t">
              <b>{s.titolo}</b>
              <small>{s.fasce.join(" · ") || "nessuna fascia"} · difficoltà {s.difficolta}/5 · {s.animazione?.elementi?.length ?? 0} elementi · ordine {s.ordine}</small>
            </span>
            <span className={"db-badge " + (s.pubblicato ? "verde" : "grigio")}>{s.pubblicato ? "Pubblicato" : "Bozza"}</span>
            <span className="az">
              <button type="button" className="db-btn2 piccolo" onClick={() => setBozza({ ...s, animazione: { durata: s.animazione?.durata ?? 6, elementi: s.animazione?.elementi ?? [], note: s.animazione?.note ?? [] } })} aria-label={`Modifica ${s.titolo}`}><Ico d={I.matita} size={15} /> Modifica</button>
              <button type="button" className="db-btn2 piccolo pericolo" onClick={() => setDaEliminare(s)} aria-label={`Elimina ${s.titolo}`}><Ico d={I.cestino} size={15} /></button>
            </span>
          </div>
        ))}
      </section>
      {daEliminare && <Conferma titolo="Eliminare lo schema?" testo={`“${daEliminare.titolo}” sparirà dall'app. L'azione non si può annullare.`} occupato={occ} onSi={elimina} onNo={() => setDaEliminare(null)} />}
    </>
  );
}

// ---------- editor ----------
function Editor({ iniziale, chiudi, salvato }: { iniziale: Bozza; chiudi: () => void; salvato: () => void }) {
  const { sb, avvisa } = useAdmin();
  const [b, setB] = useState<Bozza>(iniziale);
  const [t, setT] = useState(0);
  const [selId, setSelId] = useState<string | null>(iniziale.animazione.elementi[0]?.id ?? null);
  const [tipoNuovo, setTipoNuovo] = useState<ElementoSchema["tipo"]>("giocatore");
  const [etNuova, setEtNuova] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);
  const [play, setPlay] = useState(false);
  const raf = useRef(0);

  const an = b.animazione;
  const set = <K extends keyof Bozza>(k: K, v: Bozza[K]) => setB((x) => ({ ...x, [k]: v }));
  const setAn = (f: (a: AnimazioneSchema) => AnimazioneSchema) => setB((x) => ({ ...x, animazione: f(x.animazione) }));
  const sel = an.elementi.find((e) => e.id === selId) ?? null;

  // anteprima: il tempo avanza da 0 alla durata, poi si ferma
  useEffect(() => {
    if (!play) return;
    const inizio = performance.now();
    const giro = (ora: number) => {
      const s = (ora - inizio) / 1000;
      if (s >= an.durata) { setT(an.durata); setPlay(false); return; }
      setT(s);
      raf.current = requestAnimationFrame(giro);
    };
    raf.current = requestAnimationFrame(giro);
    return () => cancelAnimationFrame(raf.current);
  }, [play, an.durata]);

  const aggiungi = () => {
    // il colore resta vuoto: CampoAnimato usa quello predefinito del tipo
    const el: ElementoSchema = { id: crypto.randomUUID().slice(0, 8), tipo: tipoNuovo, etichetta: etNuova.trim() || undefined, keyframes: [] };
    setAn((a) => ({ ...a, elementi: [...a.elementi, el] }));
    setSelId(el.id); setEtNuova("");
  };
  const rimuoviElemento = (id: string) => {
    setAn((a) => ({ ...a, elementi: a.elementi.filter((e) => e.id !== id) }));
    if (selId === id) setSelId(null);
  };
  // clic sul campo: imposta o aggiorna il fotogramma chiave dell'elemento selezionato al tempo corrente
  const punto = (x: number, y: number) => {
    if (!selId) return setErr("Seleziona prima un elemento da muovere.");
    setErr(null);
    setAn((a) => ({
      ...a,
      elementi: a.elementi.map((e) => {
        if (e.id !== selId) return e;
        const i = e.keyframes.findIndex((k) => Math.abs(k.t - t) <= 0.05);
        const nuovo = { t: tr(i >= 0 ? e.keyframes[i].t : t), x: tr(x), y: tr(y) };
        const kf = i >= 0 ? e.keyframes.map((k, j) => (j === i ? nuovo : k)) : [...e.keyframes, nuovo];
        return { ...e, keyframes: kf.sort((p, q) => p.t - q.t) };
      }),
    }));
  };
  const cambiaDurata = (v: number) => {
    const d = Math.min(120, Math.max(1, v || 1));
    setAn((a) => ({ ...a, durata: d }));
    setT((x) => Math.min(x, d));
  };

  const salva = async () => {
    setErr(null);
    if (!b.titolo.trim()) return setErr("Scrivi il titolo.");
    if (!b.fasce.length) return setErr("Scegli almeno una fascia.");
    setOcc(true);
    const riga = {
      titolo: b.titolo.trim(), descrizione: b.descrizione, obiettivo: b.obiettivo, fasce: b.fasce, difficolta: b.difficolta,
      animazione: b.animazione, copertina_path: b.copertina_path, ordine: b.ordine, pubblicato: b.pubblicato,
    };
    const { error } = b.id
      ? await sb.from("game_schemes").update({ ...riga, aggiornato_il: new Date().toISOString() }).eq("id", b.id)
      : await sb.from("game_schemes").insert(riga);
    setOcc(false);
    if (error) return setErr(errMsg(error));
    avvisa("Schema salvato");
    salvato();
  };

  return (
    <>
      <div className="db-testa">
        <button type="button" className="db-indietro" onClick={chiudi}><Ico d={I.indietro} size={22} /> Schemi</button>
        <div className="db-strumenti">
          <Interruttore valore={b.pubblicato} onChange={(v) => set("pubblicato", v)} lab="Pubblicato" />
          <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ}>{occ ? "Salvo…" : "Salva"}</button>
        </div>
      </div>
      <Errore testo={err} />

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">{b.id ? "Modifica schema" : "Nuovo schema"}</h2></div>
        <div className="db-form">
          <Campo lab="Titolo" intera><input type="text" value={b.titolo} onChange={(e) => set("titolo", e.target.value)} /></Campo>
          <Campo lab="Descrizione" intera><textarea value={b.descrizione} onChange={(e) => set("descrizione", e.target.value)} /></Campo>
          <Campo lab="Obiettivo" intera><textarea value={b.obiettivo} onChange={(e) => set("obiettivo", e.target.value)} /></Campo>
          <Fasce valore={b.fasce} onChange={(f) => set("fasce", f)} />
          <Campo lab="Difficoltà (1-5)">
            <select value={b.difficolta} onChange={(e) => set("difficolta", Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </Campo>
          <Campo lab="Ordine"><input type="number" value={b.ordine} onChange={(e) => set("ordine", Number(e.target.value) || 0)} /></Campo>
          <CaricaFile lab="Copertina" tipo="immagine" cartella="schemi" maxMB={10} path={b.copertina_path} urlPubblico={urlContenuto}
            onCaricato={(p) => set("copertina_path", p)} onRimosso={() => set("copertina_path", null)} />
        </div>
      </section>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Animazione</h2><span className="db-nota">Scegli un elemento, sposta il tempo, tocca il campo per fissare la posizione.</span></div>
        <div className="db-editor">
          <div>
            <div className="db-campo-wrap">
              <CampoAnimato animazione={an} tempo={t} selezionato={selId} onPunto={punto} lingua="it" />
            </div>
            <div className="db-stack" style={{ marginTop: 12 }}>
              <label className="db-campo"><span>Tempo: {t.toFixed(2)} s / {an.durata} s</span>
                <input className="db-slider" type="range" min={0} max={an.durata} step={0.05} value={t} onChange={(e) => { setPlay(false); setT(Number(e.target.value)); }} aria-label="Tempo" />
              </label>
              <div className="db-sottoazioni" style={{ padding: 0 }}>
                <button type="button" className="db-btn2 piccolo" onClick={() => { setT(0); setPlay(true); }}><Ico d={I.play} size={14} /> Anteprima</button>
                {play && <button type="button" className="db-btn2 piccolo" onClick={() => setPlay(false)}>Ferma</button>}
                <label className="db-campo" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><span>Durata (s)</span>
                  <input type="number" min={1} max={120} step={1} style={{ width: 80 }} value={an.durata} onChange={(e) => cambiaDurata(Number(e.target.value))} />
                </label>
              </div>
            </div>
          </div>

          <div>
            <div className="db-sezione" style={{ marginTop: 0 }}>Elementi</div>
            <div className="db-stack">
              {an.elementi.map((e) => {
                const def = TIPI.find((x) => x.v === e.tipo)!;
                return (
                  <button key={e.id} type="button" className="db-el" aria-pressed={selId === e.id} onClick={() => setSelId(e.id)}>
                    <span className="pal" style={{ background: e.colore || def.c }} />
                    <span style={{ flex: 1 }}>{def.n}{e.etichetta ? ` · ${e.etichetta}` : ""} <small style={{ color: "var(--fg2)" }}>({e.keyframes.length} punti)</small></span>
                  </button>
                );
              })}
              {!an.elementi.length && <span className="db-nota">Nessun elemento: aggiungine uno qui sotto.</span>}
            </div>
            <div className="db-sottoazioni" style={{ padding: "10px 0 0" }}>
              <select className="db-select" value={tipoNuovo} onChange={(e) => setTipoNuovo(e.target.value as ElementoSchema["tipo"])} aria-label="Tipo di elemento">
                {TIPI.map((x) => <option key={x.v} value={x.v}>{x.n}</option>)}
              </select>
              <input className="db-select" style={{ width: 110 }} maxLength={2} placeholder="Etichetta" aria-label="Etichetta" value={etNuova} onChange={(e) => setEtNuova(e.target.value)} />
              <button type="button" className="db-btn2 piccolo acc" onClick={aggiungi}><Ico d={I.piu} size={14} /> Aggiungi</button>
            </div>

            {sel && (
              <>
                <div className="db-sezione">Fotogrammi chiave · {sel.etichetta || TIPI.find((x) => x.v === sel.tipo)?.n}</div>
                {!sel.keyframes.length && <span className="db-nota">Nessun punto: tocca il campo per aggiungerne uno al tempo corrente.</span>}
                {sel.keyframes.map((k, i) => (
                  <div key={i} className="db-kf">
                    <button type="button" className="db-link" style={{ padding: 0, minHeight: 32 }} onClick={() => { setPlay(false); setT(Math.min(k.t, an.durata)); }}>{k.t.toFixed(2)} s</button>
                    <span>x {k.x.toFixed(2)} · y {k.y.toFixed(2)}</span>
                    <button type="button" className="db-btn2 piccolo pericolo" aria-label="Elimina fotogramma"
                      onClick={() => setAn((a) => ({ ...a, elementi: a.elementi.map((e) => (e.id === sel.id ? { ...e, keyframes: e.keyframes.filter((_, j) => j !== i) } : e)) }))}><Ico d={I.cestino} size={14} /></button>
                  </div>
                ))}
                <div className="db-sottoazioni" style={{ padding: "10px 0 0" }}>
                  <button type="button" className="db-btn2 piccolo pericolo" onClick={() => rimuoviElemento(sel.id)}><Ico d={I.cestino} size={14} /> Rimuovi elemento</button>
                </div>
              </>
            )}

            <div className="db-sezione">Note temporizzate</div>
            <div className="db-stack">
              {an.note.map((n, i) => {
                const mod = (p: Partial<typeof n>) => setAn((a) => ({ ...a, note: a.note.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
                return (
                  <div key={i} className="db-riga-nota">
                    <input type="number" min={0} max={an.durata} step={0.1} aria-label="Secondo" value={n.t} onChange={(e) => mod({ t: Number(e.target.value) || 0 })} />
                    <input type="text" placeholder="Testo italiano" aria-label="Testo italiano" value={n.testo_it} onChange={(e) => mod({ testo_it: e.target.value })} />
                    <input type="text" placeholder="English text" aria-label="Testo inglese" value={n.testo_en ?? ""} onChange={(e) => mod({ testo_en: e.target.value })} />
                    <button type="button" className="db-btn2 piccolo pericolo" aria-label="Elimina nota" onClick={() => setAn((a) => ({ ...a, note: a.note.filter((_, j) => j !== i) }))}><Ico d={I.cestino} size={14} /></button>
                  </div>
                );
              })}
              <div><button type="button" className="db-btn2 piccolo" onClick={() => setAn((a) => ({ ...a, note: [...a.note, { t: tr(t), testo_it: "", testo_en: "" }] }))}><Ico d={I.piu} size={14} /> Nota al tempo corrente</button></div>
            </div>
          </div>
        </div>
        <div className="db-azioni">
          <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ}>{occ ? "Salvo…" : "Salva schema"}</button>
          <button type="button" className="db-btn2" onClick={chiudi}>Annulla</button>
        </div>
      </section>
    </>
  );
}
