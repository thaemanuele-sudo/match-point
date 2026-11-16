"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { CampoVideo } from "./Video";
import { comune } from "./testi";
import { COLPI, FASCE, type ColpoK, type Esercizio, type Sb } from "./dati";
import "./metodo.css";

const it = {
  ...comune,
  f_titolo: "Nome dell'esercizio",
  f_titolo_ph: "Es. Palleggio a due al volo",
  f_colpo: "Colpo",
  f_fasce: "Fasce",
  f_durata: "Durata",
  f_materiale: "Materiale",
  f_materiale_ph: "Es. 12 palline, 2 coni",
  f_descrizione: "Come si svolge",
  f_descrizione_ph: "Descrivi l'esercizio in poche righe: dove ci si mette, cosa fa chi lo svolge, quando si cambia ruolo.",
  f_video: "Video (facoltativo)",
  f_manca: "Servono almeno il nome, il colpo e una fascia.",
  video_allega: "Allega video",
  video_cambia: "Cambia video",
  video_rimuovi: "Togli",
  video_caricamento: "Caricamento…",
  video_troppo: "Il video supera i 100 MB: accorcialo e riprova.",
  video_errore: "Caricamento non riuscito. Riprova.",
  video_allegato: "Video allegato",
};
const T = { it, en: { ...it } };

export type DatiEsercizio = { titolo: string; colpo: ColpoK; fasce: string[]; durata: number; materiale: string; descrizione: string; video_path: string | null };

/** Modulo per creare, modificare o proporre un esercizio (usato da Libreria e da M9). */
export function FormEsercizio({
  sb, centroId, iniziale, durate, etichettaSalva, onSalva, onAnnulla, busy, errore, fasceIniziali,
}: {
  sb: Sb; centroId: string; iniziale?: Esercizio; durate: number[]; etichettaSalva: string;
  onSalva: (d: DatiEsercizio) => void; onAnnulla?: () => void; busy: boolean; errore?: string; fasceIniziali?: string[];
}) {
  const t = useT(T) as Record<string, string>;
  const [titolo, setTitolo] = useState(iniziale?.titolo ?? "");
  const [colpo, setColpo] = useState<ColpoK | null>(iniziale?.colpo ?? null);
  const [fasce, setFasce] = useState<string[]>(iniziale?.fasce ?? fasceIniziali ?? []);
  const [durata, setDurata] = useState(iniziale?.durata ?? durate[1] ?? 10);
  const [materiale, setMateriale] = useState(iniziale?.materiale ?? "");
  const [descrizione, setDescrizione] = useState(iniziale?.descrizione ?? "");
  const [video, setVideo] = useState<string | null>(iniziale?.video_path ?? null);
  const [manca, setManca] = useState(false);
  const toggle = (f: string) => setFasce((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  function invia() {
    if (!titolo.trim() || !colpo || fasce.length === 0) {
      setManca(true);
      return;
    }
    setManca(false);
    onSalva({ titolo: titolo.trim(), colpo, fasce, durata, materiale: materiale.trim(), descrizione: descrizione.trim(), video_path: video });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label className="mm-fld"><span className="mm-lab">{t.f_titolo.toUpperCase()}</span><input className="mm-inp" value={titolo} placeholder={t.f_titolo_ph} onChange={(e) => setTitolo(e.target.value)} /></label>
      <div className="mm-fld">
        <span className="mm-lab">{t.f_colpo.toUpperCase()}</span>
        <div className="mm-chips">
          {COLPI.map((c) => (
            <button key={c.k} type="button" className={`mm-chip${colpo === c.k ? " on" : ""}`} aria-pressed={colpo === c.k} onClick={() => setColpo(c.k)}>{t[`colpo_${c.k}`]}</button>
          ))}
        </div>
      </div>
      <div className="mm-fld">
        <span className="mm-lab">{t.f_fasce.toUpperCase()}</span>
        <div className="mm-chips">
          {FASCE.map((f) => (
            <button key={f} type="button" className={`mm-chip${fasce.includes(f) ? " on" : ""}`} aria-pressed={fasce.includes(f)} onClick={() => toggle(f)}>{f}</button>
          ))}
        </div>
      </div>
      <div className="mm-fld">
        <span className="mm-lab">{t.f_durata.toUpperCase()}</span>
        <div className="mm-chips">
          {durate.map((d) => (
            <button key={d} type="button" className={`mm-chip${durata === d ? " on" : ""}`} aria-pressed={durata === d} onClick={() => setDurata(d)}>{d}&apos;</button>
          ))}
        </div>
      </div>
      <label className="mm-fld"><span className="mm-lab">{t.f_materiale.toUpperCase()}</span><input className="mm-inp" value={materiale} placeholder={t.f_materiale_ph} onChange={(e) => setMateriale(e.target.value)} /></label>
      <label className="mm-fld"><span className="mm-lab">{t.f_descrizione.toUpperCase()}</span><textarea className="mm-ta" value={descrizione} placeholder={t.f_descrizione_ph} onChange={(e) => setDescrizione(e.target.value)} /></label>
      <div className="mm-fld">
        <span className="mm-lab">{t.f_video.toUpperCase()}</span>
        <CampoVideo sb={sb} centroId={centroId} cartella="esercizi" path={video} onPath={setVideo} testi={{ allega: t.video_allega, cambia: t.video_cambia, rimuovi: t.video_rimuovi, caricamento: t.video_caricamento, troppo: t.video_troppo, errore: t.video_errore, allegato: t.video_allegato }} />
      </div>
      {manca ? <div className="mm-err">{t.f_manca}</div> : null}
      {errore ? <div className="mm-err">{errore}</div> : null}
      <div className="mm-row" style={{ flexWrap: "wrap" }}>
        <button type="button" className="mm-btn" style={{ flex: 1 }} disabled={busy} onClick={invia}>{etichettaSalva}</button>
        {onAnnulla ? <button type="button" className="mm-btn2" disabled={busy} onClick={onAnnulla}>{t.annulla}</button> : null}
      </div>
    </div>
  );
}
