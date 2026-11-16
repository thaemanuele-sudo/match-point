"use client";
// A2 Compiti a casa: esercizi del maestro con video, "L'ho fatto" e, se i genitori hanno dato il consenso foto/video,
// invio di una foto o di un video (storage del centro). Linguaggio per bambini.
import { useEffect, useMemo, useRef, useState } from "react";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { fmtDataLunga, isoGiorno, aggiungiGiorni } from "@/lib/centro/date";
import { useFigli } from "./dati";
import { useCompiti, type RCompito, type RFatto } from "./compiti";
import { caricaMedia } from "./media";
import { fmt } from "./util";
import { Caricamento, ErroreBox, Icona, SelettoreFigli, VisoreMedia } from "./piccoli";

const IT = {
  titolo: "I miei compiti",
  da: "Da {maestro}, per {giorno}",
  daSenza: "Da {maestro}",
  su: " su {n}",
  guarda: "Guarda il video: {titolo}",
  nessunVideo: "Nessun video per questo compito",
  minuti: "{n} minuti",
  fatto: "L'ho fatto", fattoOk: "Fatto, bravo!",
  mandaVideo: "Manda video", videoInviato: "Video inviato", inviando: "Invio…",
  mandaAria: "Manda una foto o un video a {maestro}",
  guardaInviato: "Guarda il tuo video",
  nota: "Il video lo vedono {maestro} e i tuoi genitori. Se non te la senti, puoi segnare il compito senza video.",
  serveConsenso: "Per mandare video serve il permesso dei tuoi genitori. Chiedi a mamma o papà di attivare «Foto e video in campo».",
  nessunCompito: "Nessun compito per ora. Goditi il tennis!",
  nessunProfilo: "Il tuo profilo non è ancora collegato a un allievo.",
  ilMaestro: "il maestro",
  salvataggio: "Non sono riuscito a salvare. Riprova tra poco.",
  maestroPrefisso: "{nome}",
};
export const T = { it: IT, en: { ...IT } };

export default function AllievoCompiti() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, caricamento, errore, ricarica } = useFigli("allievo");
  const { compiti, fatti, setFatti, esercizi, caricamento: caricaC, errore: errC } = useCompiti(figlio);
  const [consenso, setConsenso] = useState<boolean | null>(null);
  const [lavoro, setLavoro] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [guarda, setGuarda] = useState<{ titolo: string; path: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [perCompito, setPerCompito] = useState<RCompito | null>(null);
  const idAll = figlio?.allievo.id;

  // il consenso foto/video decide se si può mandare un video; se non si riesce a leggere resta "sconosciuto" e decide la RLS
  useEffect(() => {
    if (!idAll) return;
    let vivo = true;
    (async () => {
      const x = await sb.from("consensi").select("valore").eq("centro_id", centro.id).eq("allievo_id", idAll).eq("tipo", "foto_video").limit(1);
      if (vivo) setConsenso(x.error ? null : !!(x.data ?? [])[0]?.valore);
    })();
    return () => { vivo = false; };
  }, [idAll, centro.id, sb]);

  const nomeMaestro = (c?: RCompito) => {
    const m = figlio?.maestri.find((x) => x.id === c?.maestro_id) ?? figlio?.maestri[0];
    return m?.nome ?? t.ilMaestro;
  };

  // compiti da mostrare: quelli ancora da fare e quelli assegnati nelle ultime due settimane
  const lista = useMemo(() => {
    const limite = isoGiorno(aggiungiGiorni(new Date(), -14));
    return compiti.filter((c) => !fatti.some((f) => f.compito_id === c.id) || c.created_at.slice(0, 10) >= limite).slice(0, 8);
  }, [compiti, fatti]);
  const nFatti = lista.filter((c) => fatti.some((f) => f.compito_id === c.id)).length;
  const prossimaScadenza = lista.filter((c) => c.scadenza && !fatti.some((f) => f.compito_id === c.id)).map((c) => c.scadenza as string).sort()[0];
  const giorno = prossimaScadenza ? fmtDataLunga(prossimaScadenza).split(" ")[0] : null;
  const capo = lista[0];
  const kick = figlio ? (giorno ? fmt(t.da, { maestro: nomeMaestro(capo), giorno }) : fmt(t.daSenza, { maestro: nomeMaestro(capo) })) : undefined;

  async function segna(c: RCompito) {
    if (!idAll) return;
    setErr(null);
    setLavoro(c.id);
    const f = fatti.find((x) => x.compito_id === c.id);
    if (f) {
      const r = await sb.from("compiti_fatti").delete().eq("id", f.id);
      if (r.error) setErr(r.error.message || t.salvataggio);
      else setFatti((l) => l.filter((x) => x.id !== f.id));
    } else {
      const r = await sb.from("compiti_fatti").insert({ centro_id: centro.id, compito_id: c.id, allievo_id: idAll, fatto_il: new Date().toISOString() }).select("*").single();
      if (r.error || !r.data) setErr(r.error?.message ?? t.salvataggio);
      else setFatti((l) => [...l, r.data as RFatto]);
    }
    setLavoro(null);
  }

  async function mandaMedia(file: File, c: RCompito) {
    if (!idAll) return;
    setErr(null);
    setLavoro(c.id);
    const up = await caricaMedia(sb, centro.id, `compiti/${idAll}`, c.id, file);
    if (up.errore) { setErr(up.errore); setLavoro(null); return; }
    const f = fatti.find((x) => x.compito_id === c.id);
    // mandare il video vale anche come "fatto": se il compito era già segnato si aggiorna solo il file
    const r = f
      ? await sb.from("compiti_fatti").update({ media_path: up.path }).eq("id", f.id).select("*").single()
      : await sb.from("compiti_fatti").insert({ centro_id: centro.id, compito_id: c.id, allievo_id: idAll, fatto_il: new Date().toISOString(), media_path: up.path }).select("*").single();
    if (r.error || !r.data) setErr(r.error?.message ?? t.salvataggio);
    else setFatti((l) => [...l.filter((x) => x.compito_id !== c.id), r.data as RFatto]);
    setLavoro(null);
  }

  return (
    <SchermoCentro
      ruolo="allievo"
      tab="compiti"
      titolo={t.titolo}
      sopra={kick}
      azioni={lista.length > 0 ? (
        <span className="fam-disp" style={{ fontSize: 30, fontWeight: 800, fontStyle: "italic", color: "#D8F34A", lineHeight: 1 }}>
          {nFatti}<span style={{ fontSize: 16, color: "#A1A1A6", fontStyle: "normal" }}>{fmt(t.su, { n: lista.length })}</span>
        </span>
      ) : undefined}
    >
      <div className="fam-col">
        {(caricamento || (caricaC && !!figlio)) && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {errC && <ErroreBox testo={errC} />}
        {!caricamento && !errore && figli.length === 0 && <div className="note">{t.nessunProfilo}</div>}
        {figlio && (
          <>
            <SelettoreFigli figli={figli} scelto={figlio.allievo.id} onScegli={scegli} />
            {lista.length > 0 && (
              <div className="bar" style={{ height: 10 }} role="progressbar" aria-valuemin={0} aria-valuemax={lista.length} aria-valuenow={nFatti}>
                <i style={{ width: `${Math.round((nFatti / lista.length) * 100)}%`, background: "#D8F34A" }} />
              </div>
            )}
            {err && <div className="fam-err" role="alert">{err}</div>}
            {!caricaC && lista.length === 0 && <div className="note">{t.nessunCompito}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {lista.map((c) => {
                const f = fatti.find((x) => x.compito_id === c.id);
                const ok = !!f;
                const es = esercizi.find((x) => x.id === c.esercizio_id);
                const maestro = nomeMaestro(c);
                const sub = [c.durata_min ? fmt(t.minuti, { n: c.durata_min }) : "", es?.descrizione?.slice(0, 70) ?? ""].filter(Boolean).join(" · ");
                const occupato = lavoro === c.id;
                return (
                  <div key={c.id} className="card pad" style={ok ? { borderColor: "rgba(216,243,74,.45)", background: "#171C0F" } : undefined}>
                    <div className="fam-riga" style={{ gap: 12 }}>
                      <button type="button" className="fam-lawn" disabled={!es?.video_path}
                        style={{ width: 64, height: 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer", color: "#fff" }}
                        aria-label={es?.video_path ? fmt(t.guarda, { titolo: c.titolo }) : t.nessunVideo}
                        onClick={() => es?.video_path && setGuarda({ titolo: c.titolo, path: es.video_path })}>
                        <Icona nome="play" size={26} />
                      </button>
                      <div className="fam-grow">
                        <div className="t" style={{ fontWeight: 700, fontSize: 15 }}>{c.titolo}</div>
                        {sub && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
                      </div>
                    </div>
                    <div className="fam-btn-riga" style={{ marginTop: 10 }}>
                      <button type="button" className={ok ? "btn" : "btn2"} disabled={occupato} style={{ flex: 1.4, height: 40, fontSize: 14 }} aria-pressed={ok} onClick={() => segna(c)}>
                        <Icona nome="check" size={16} sw={2.6} />{ok ? t.fattoOk : t.fatto}
                      </button>
                      {f?.media_path ? (
                        <button type="button" className="btn2" style={{ height: 40, fontSize: 13 }} onClick={() => setGuarda({ titolo: c.titolo, path: f.media_path as string })}>
                          <Icona nome="video" size={16} sw={2.2} />{t.videoInviato}
                        </button>
                      ) : (
                        <button type="button" className="btn2" disabled={occupato || consenso === false} style={{ height: 40, fontSize: 13 }}
                          aria-label={fmt(t.mandaAria, { maestro })}
                          onClick={() => { setPerCompito(c); fileRef.current?.click(); }}>
                          <Icona nome="video" size={16} sw={2.2} />{occupato ? t.inviando : t.mandaVideo}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {consenso === false && <div className="note" style={{ fontSize: 12, padding: "8px 12px" }}>{t.serveConsenso}</div>}
            <div className="note" style={{ fontSize: 12, padding: "8px 12px" }}>{fmt(t.nota, { maestro: nomeMaestro(capo) })}</div>
            <input ref={fileRef} type="file" accept="video/*,image/*" hidden
              onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file && perCompito) void mandaMedia(file, perCompito); }} />
          </>
        )}
      </div>
      {guarda && <VisoreMedia titolo={guarda.titolo} path={guarda.path} onChiudi={() => setGuarda(null)} />}
    </SchermoCentro>
  );
}
