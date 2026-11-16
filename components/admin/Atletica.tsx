"use client";
/* Atletica: video di allenamento fisico con upload di video e copertina. */
import { useCallback, useEffect, useState } from "react";
import { urlContenuto } from "@/lib/contenuti";
import { CATEGORIE_ATLETICA, type CategoriaAtletica, type Fascia, type VideoAtletica } from "@/lib/types";
import { CaricaFile, Campo, Conferma, Errore, Fasce, I, Ico, Interruttore, durataVideo, errMsg, mmss, rimuoviContenuti, useAdmin } from "./comuni";

const NOME_CAT: Record<CategoriaAtletica, string> = {
  velocita: "Velocità", forza: "Forza", resistenza: "Resistenza", coordinazione: "Coordinazione", mobilita: "Mobilità", agilita: "Agilità", prevenzione: "Prevenzione",
};
type Bozza = Omit<VideoAtletica, "id" | "creato_il"> & { id?: string };
const VUOTA: Bozza = {
  titolo: "", descrizione: "", categoria: "coordinazione", livello: 1, fasce: [], video_path: null, copertina_path: null,
  durata_sec: null, dosaggio: "", ordine: 0, pubblicato: false,
};

export function Atletica() {
  const { sb, avvisa } = useAdmin();
  const [lista, setLista] = useState<VideoAtletica[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [b, setB] = useState<Bozza | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);
  const [del, setDel] = useState<VideoAtletica | null>(null);

  const carica = useCallback(async () => {
    const { data, error } = await sb.from("fitness_videos").select("*").order("ordine").order("creato_il");
    if (error) return setErrore(errMsg(error));
    setErrore(null);
    setLista(data as VideoAtletica[]);
  }, [sb]);
  useEffect(() => { void carica(); }, [carica]);

  const salva = async () => {
    if (!b) return;
    setErr(null);
    if (!b.titolo.trim()) return setErr("Scrivi il titolo.");
    if (!b.video_path) return setErr("Carica il video.");
    if (!b.fasce.length) return setErr("Scegli almeno una fascia.");
    setOcc(true);
    const { id, ...riga } = b;
    const { error } = id ? await sb.from("fitness_videos").update({ ...riga, titolo: b.titolo.trim() }).eq("id", id) : await sb.from("fitness_videos").insert({ ...riga, titolo: b.titolo.trim() });
    setOcc(false);
    if (error) return setErr(errMsg(error));
    avvisa("Video salvato");
    setB(null);
    void carica();
  };
  const elimina = async () => {
    if (!del) return;
    setOcc(true);
    const { error } = await sb.from("fitness_videos").delete().eq("id", del.id);
    setOcc(false);
    if (error) { setErrore(errMsg(error)); setDel(null); return; }
    await rimuoviContenuti(sb, [del.video_path, del.copertina_path]);
    setDel(null);
    avvisa("Video eliminato");
    void carica();
  };

  if (b) {
    const set = <K extends keyof Bozza>(k: K, v: Bozza[K]) => setB((x) => (x ? { ...x, [k]: v } : x));
    return (
      <>
        <div className="db-testa">
          <button type="button" className="db-indietro" onClick={() => { setB(null); setErr(null); }}><Ico d={I.indietro} size={22} /> Atletica</button>
          <div className="db-strumenti">
            <Interruttore valore={b.pubblicato} onChange={(v) => set("pubblicato", v)} lab="Pubblicato" />
            <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ}>{occ ? "Salvo…" : "Salva"}</button>
          </div>
        </div>
        <Errore testo={err} />
        <section className="db-card">
          <div className="db-card-testa"><h2 className="db-h2">{b.id ? "Modifica video" : "Nuovo video"}</h2></div>
          <div className="db-form">
            <Campo lab="Titolo" intera><input type="text" value={b.titolo} onChange={(e) => set("titolo", e.target.value)} /></Campo>
            <Campo lab="Descrizione" intera><textarea value={b.descrizione} onChange={(e) => set("descrizione", e.target.value)} /></Campo>
            <Campo lab="Categoria">
              <select value={b.categoria} onChange={(e) => set("categoria", e.target.value as CategoriaAtletica)}>
                {CATEGORIE_ATLETICA.map((c) => <option key={c} value={c}>{NOME_CAT[c]}</option>)}
              </select>
            </Campo>
            <Campo lab="Livello (1-5)"><select value={b.livello} onChange={(e) => set("livello", Number(e.target.value))}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Campo>
            <Fasce valore={b.fasce as Fascia[]} onChange={(f) => set("fasce", f)} />
            <Campo lab="Dosaggio" nota="Esempio: 3 serie da 10 ripetizioni"><input type="text" value={b.dosaggio} onChange={(e) => set("dosaggio", e.target.value)} /></Campo>
            <Campo lab="Durata (secondi)" nota="Si compila da sola quando carichi il video"><input type="number" min={0} value={b.durata_sec ?? ""} onChange={(e) => set("durata_sec", e.target.value === "" ? null : Number(e.target.value))} /></Campo>
            <Campo lab="Ordine"><input type="number" value={b.ordine} onChange={(e) => set("ordine", Number(e.target.value) || 0)} /></Campo>
            <CaricaFile lab="Video (mp4, mov, webm · fino a 500 MB)" tipo="video" cartella="atletica" maxMB={500} path={b.video_path} urlPubblico={urlContenuto}
              onFile={(f) => { void durataVideo(f).then((d) => { if (d) set("durata_sec", d); }); }}
              onCaricato={(p) => set("video_path", p)} onRimosso={() => { void rimuoviContenuti(sb, [b.video_path]); set("video_path", null); }} />
            <CaricaFile lab="Copertina" tipo="immagine" cartella="atletica" maxMB={10} path={b.copertina_path} urlPubblico={urlContenuto}
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

  return (
    <>
      <div className="db-testa">
        <div><h1 className="db-titolo">Atletica</h1><p className="db-sotto">Video di preparazione fisica per fascia d&apos;età.</p></div>
        <button type="button" className="db-btn2 acc" onClick={() => setB({ ...VUOTA, ordine: (lista?.length ?? 0) + 1 })}><Ico d={I.piu} size={16} /> Nuovo video</button>
      </div>
      <Errore testo={errore} />
      <section className="db-card">
        {!lista && !errore && <div className="db-vuoto">Carico…</div>}
        {lista?.length === 0 && <div className="db-vuoto">Nessun video. Aggiungine uno con &quot;Nuovo video&quot;.</div>}
        {lista?.map((v) => (
          <div key={v.id} className="db-elenco-riga">
            {v.copertina_path
              // eslint-disable-next-line @next/next/no-img-element
              ? <img className="mini" src={urlContenuto(v.copertina_path) ?? ""} alt="" />
              : <span className="mini"><Ico d={I.film} size={18} /></span>}
            <span className="t"><b>{v.titolo}</b><small>{NOME_CAT[v.categoria] ?? v.categoria} · livello {v.livello} · {v.fasce.join(" · ") || "nessuna fascia"} · {mmss(v.durata_sec)}</small></span>
            <span className={"db-badge " + (v.pubblicato ? "verde" : "grigio")}>{v.pubblicato ? "Pubblicato" : "Bozza"}</span>
            <span className="az">
              <button type="button" className="db-btn2 piccolo" onClick={() => setB({ ...v })} aria-label={`Modifica ${v.titolo}`}><Ico d={I.matita} size={15} /> Modifica</button>
              <button type="button" className="db-btn2 piccolo pericolo" onClick={() => setDel(v)} aria-label={`Elimina ${v.titolo}`}><Ico d={I.cestino} size={15} /></button>
            </span>
          </div>
        ))}
      </section>
      {del && <Conferma titolo="Eliminare il video?" testo={`“${del.titolo}” e i suoi file saranno rimossi. L'azione non si può annullare.`} occupato={occ} onSi={elimina} onNo={() => setDel(null)} />}
    </>
  );
}
