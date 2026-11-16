"use client";
/* Tecnica: video di errori e correzioni per colpo, collegati a coppie errore ↔ correzione. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { urlContenuto } from "@/lib/contenuti";
import { COLPI, type Colpo, type Fascia, type VideoTecnica } from "@/lib/types";
import { CaricaFile, Campo, Conferma, Errore, Fasce, I, Ico, Interruttore, errMsg, rimuoviContenuti, useAdmin } from "./comuni";

const NOME_COLPO: Record<Colpo, string> = { diritto: "Diritto", rovescio: "Rovescio", servizio: "Servizio", volee: "Volée", smash: "Smash", back: "Back", risposta: "Risposta" };
type Bozza = Omit<VideoTecnica, "id" | "creato_il"> & { id?: string };
const VUOTA: Bozza = {
  colpo: "diritto", tipo: "errore", codice: "", titolo: "", descrizione: "", fasce: [], video_path: null, copertina_path: null,
  collegato_a: null, ordine: 0, pubblicato: false,
};

export function Tecnica() {
  const { sb, avvisa } = useAdmin();
  const [lista, setLista] = useState<VideoTecnica[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [b, setB] = useState<Bozza | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);
  const [del, setDel] = useState<VideoTecnica | null>(null);
  const [filtro, setFiltro] = useState<Colpo | "tutti">("tutti");

  const carica = useCallback(async () => {
    const { data, error } = await sb.from("technique_videos").select("*").order("colpo").order("ordine").order("creato_il");
    if (error) return setErrore(errMsg(error));
    setErrore(null);
    setLista(data as VideoTecnica[]);
  }, [sb]);
  useEffect(() => { void carica(); }, [carica]);

  // coppie: ogni errore con la sua correzione (in un verso o nell'altro); gli altri restano singoli
  const gruppi = useMemo(() => {
    const tutti = (lista ?? []).filter((v) => filtro === "tutti" || v.colpo === filtro);
    const perId = new Map((lista ?? []).map((v) => [v.id, v]));
    const usati = new Set<string>();
    const coppie: { errore: VideoTecnica | null; correzione: VideoTecnica | null }[] = [];
    for (const v of tutti) {
      if (usati.has(v.id)) continue;
      const altro = (v.collegato_a && perId.get(v.collegato_a)) || tutti.find((x) => x.collegato_a === v.id && x.id !== v.id) || null;
      usati.add(v.id);
      if (altro) usati.add(altro.id);
      const e = v.tipo === "errore" ? v : altro?.tipo === "errore" ? altro : null;
      const c = v.tipo === "correzione" ? v : altro?.tipo === "correzione" ? altro : null;
      coppie.push({ errore: e, correzione: c });
    }
    return coppie;
  }, [lista, filtro]);

  const salva = async () => {
    if (!b) return;
    setErr(null);
    if (!b.titolo.trim()) return setErr("Scrivi il titolo.");
    if (!b.video_path) return setErr("Carica il video.");
    if (!b.fasce.length) return setErr("Scegli almeno una fascia.");
    setOcc(true);
    const { id, ...riga } = b;
    const dati = { ...riga, titolo: b.titolo.trim() };
    const r = id
      ? await sb.from("technique_videos").update(dati).eq("id", id).select("id").single()
      : await sb.from("technique_videos").insert(dati).select("id").single();
    if (!r.error) {
      const mioId = (r.data as { id: string }).id;
      // il collegamento vale nei due versi: il video collegato punta a questo
      if (b.collegato_a) await sb.from("technique_videos").update({ collegato_a: mioId }).eq("id", b.collegato_a);
      // se prima era collegato a un altro e ora no, quello perde il collegamento
      const prima = id ? lista?.find((x) => x.id === id)?.collegato_a : null;
      if (prima && prima !== b.collegato_a) await sb.from("technique_videos").update({ collegato_a: null }).eq("id", prima).eq("collegato_a", mioId);
    }
    setOcc(false);
    if (r.error) return setErr(errMsg(r.error));
    avvisa("Video salvato");
    setB(null);
    void carica();
  };
  const elimina = async () => {
    if (!del) return;
    setOcc(true);
    const { error } = await sb.from("technique_videos").delete().eq("id", del.id);
    setOcc(false);
    if (error) { setErrore(errMsg(error)); setDel(null); return; }
    await rimuoviContenuti(sb, [del.video_path, del.copertina_path]);
    setDel(null);
    avvisa("Video eliminato");
    void carica();
  };

  if (b) {
    const set = <K extends keyof Bozza>(k: K, v: Bozza[K]) => setB((x) => (x ? { ...x, [k]: v } : x));
    const opposto = b.tipo === "errore" ? "correzione" : "errore";
    const candidati = (lista ?? []).filter((v) => v.colpo === b.colpo && v.tipo === opposto && v.id !== b.id);
    return (
      <>
        <div className="db-testa">
          <button type="button" className="db-indietro" onClick={() => { setB(null); setErr(null); }}><Ico d={I.indietro} size={22} /> Tecnica</button>
          <div className="db-strumenti">
            <Interruttore valore={b.pubblicato} onChange={(v) => set("pubblicato", v)} lab="Pubblicato" />
            <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ}>{occ ? "Salvo…" : "Salva"}</button>
          </div>
        </div>
        <Errore testo={err} />
        <section className="db-card">
          <div className="db-card-testa"><h2 className="db-h2">{b.id ? "Modifica video" : "Nuovo video"}</h2></div>
          <div className="db-form">
            <Campo lab="Colpo"><select value={b.colpo} onChange={(e) => setB({ ...b, colpo: e.target.value as Colpo, collegato_a: null })}>{COLPI.map((c) => <option key={c} value={c}>{NOME_COLPO[c]}</option>)}</select></Campo>
            <Campo lab="Tipo"><select value={b.tipo} onChange={(e) => setB({ ...b, tipo: e.target.value as VideoTecnica["tipo"], collegato_a: null })}><option value="errore">Errore</option><option value="correzione">Correzione</option></select></Campo>
            <Campo lab="Codice" nota="Lo stesso codice usato dall'analisi AI, per esempio D-03"><input type="text" value={b.codice} onChange={(e) => set("codice", e.target.value)} /></Campo>
            <Campo lab="Ordine"><input type="number" value={b.ordine} onChange={(e) => set("ordine", Number(e.target.value) || 0)} /></Campo>
            <Campo lab="Titolo" intera><input type="text" value={b.titolo} onChange={(e) => set("titolo", e.target.value)} /></Campo>
            <Campo lab="Descrizione" intera><textarea value={b.descrizione} onChange={(e) => set("descrizione", e.target.value)} /></Campo>
            <Fasce valore={b.fasce as Fascia[]} onChange={(f) => set("fasce", f)} />
            <Campo lab={`Collegato a (${opposto === "errore" ? "errore" : "correzione"} dello stesso colpo)`} intera>
              <select value={b.collegato_a ?? ""} onChange={(e) => set("collegato_a", e.target.value || null)}>
                <option value="">Nessuno</option>
                {candidati.map((v) => <option key={v.id} value={v.id}>{v.codice ? v.codice + " · " : ""}{v.titolo}</option>)}
              </select>
            </Campo>
            <CaricaFile lab="Video (mp4, mov, webm · fino a 500 MB)" tipo="video" cartella="tecnica" maxMB={500} path={b.video_path} urlPubblico={urlContenuto}
              onCaricato={(p) => set("video_path", p)} onRimosso={() => { void rimuoviContenuti(sb, [b.video_path]); set("video_path", null); }} />
            <CaricaFile lab="Copertina" tipo="immagine" cartella="tecnica" maxMB={10} path={b.copertina_path} urlPubblico={urlContenuto}
              onCaricato={(p) => set("copertina_path", p)} onRimosso={() => set("copertina_path", null)} />
          </div>
          <div className="db-azioni">
            <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ}>{occ ? "Salvo…" : "Salva video"}</button>
            <button type="button" className="db-btn2" onClick={() => { setB(null); setErr(null); }}>Annulla</button>
          </div>
        </section>
      </>
    );
  }

  const lato = (v: VideoTecnica | null, cls: "err" | "cor") =>
    v ? (
      <button type="button" className={"lato " + cls} onClick={() => setB({ ...v })} aria-label={`Modifica ${v.titolo}`}>
        <b>{v.codice ? v.codice + " · " : ""}{v.titolo}</b>
        <small>{NOME_COLPO[v.colpo] ?? v.colpo} · {v.fasce.join(" ") || "nessuna fascia"} · {v.pubblicato ? "pubblicato" : "bozza"}</small>
      </button>
    ) : (
      <span className="lato" style={{ borderRadius: 12, padding: "10px 12px", background: "var(--card2)", color: "var(--fg3)", fontSize: 14 }}>{cls === "err" ? "Nessun errore collegato" : "Nessuna correzione collegata"}</span>
    );

  return (
    <>
      <div className="db-testa">
        <div><h1 className="db-titolo">Tecnica</h1><p className="db-sotto">Errori e correzioni per colpo, a coppie.</p></div>
        <div className="db-strumenti">
          <select className="db-select" aria-label="Filtra per colpo" value={filtro} onChange={(e) => setFiltro(e.target.value as Colpo | "tutti")}>
            <option value="tutti">Tutti i colpi</option>
            {COLPI.map((c) => <option key={c} value={c}>{NOME_COLPO[c]}</option>)}
          </select>
          <button type="button" className="db-btn2 acc" onClick={() => setB({ ...VUOTA, ordine: (lista?.length ?? 0) + 1, colpo: filtro === "tutti" ? "diritto" : filtro })}><Ico d={I.piu} size={16} /> Nuovo video</button>
        </div>
      </div>
      <Errore testo={errore} />
      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Coppie errore ↔ correzione</h2><span className="db-nota">tocca un video per modificarlo</span></div>
        {!lista && !errore && <div className="db-vuoto">Carico…</div>}
        {lista && !gruppi.length && <div className="db-vuoto">Nessun video. Aggiungine uno con &quot;Nuovo video&quot;.</div>}
        {gruppi.map((g, i) => (
          <div key={i} className="db-coppia">
            {lato(g.errore, "err")}
            <span className="freccia"><Ico d={I.freccia} size={18} /></span>
            {lato(g.correzione, "cor")}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {[g.errore, g.correzione].filter((x): x is VideoTecnica => !!x).map((v) => (
                <button key={v.id} type="button" className="db-btn2 piccolo pericolo" onClick={() => setDel(v)} aria-label={`Elimina ${v.titolo}`}><Ico d={I.cestino} size={14} /> {v.tipo === "errore" ? "Errore" : "Correzione"}</button>
              ))}
            </div>
          </div>
        ))}
      </section>
      {del && <Conferma titolo="Eliminare il video?" testo={`“${del.titolo}” e i suoi file saranno rimossi. L'azione non si può annullare.`} occupato={occ} onSi={elimina} onNo={() => setDel(null)} />}
    </>
  );
}
