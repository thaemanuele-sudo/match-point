"use client";
// G3 Progressi: competenze per colpo (confronto con i 3 mesi precedenti), video inviati con i compiti, compiti.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { fmtData } from "@/lib/centro/date";
import { useFigli } from "./dati";
import { useCompiti } from "./compiti";
import { calcolaColpi, etichettaPeriodo, fmt, maiuscola, nomeColpo, nomeMese, temaDelMese, type RValutazione } from "./util";
import { Caricamento, ErroreBox, Icona, SelettoreFigli, SenzaFigli, Tratto, VisoreMedia } from "./piccoli";

const IT = {
  titolo: "Progressi",
  kick: "{nome} · {mese} · {tema} · settimana {sett} di {tot}",
  kickBase: "{nome} · {mese}",
  report: "Report",
  sezioni: "Sezioni dei progressi",
  vCompetenze: "Competenze", vVideo: "Video", vCompiti: "Compiti",
  puntiMedia: "PUNTI IN MEDIA", videoInviati: "VIDEO INVIATI", compitiFatti: "COMPITI FATTI",
  fraseCrescita: "Rispetto ai 3 mesi precedenti {nome} è cresciuto soprattutto nel {colpo}.",
  fraseSenzaConfronto: "Servono almeno due serie di valutazioni a distanza di qualche settimana per vedere il confronto.",
  fraseNessuna: "Le competenze compaiono dopo la prima valutazione del maestro.",
  fraseVideo: "Qui ci sono i video e le foto che {nome} ha mandato con i compiti. Li vedono solo il maestro e la famiglia.",
  fraseCompiti: "{fatti} compiti su {tot} sono stati fatti. Un ripasso breve basta per quelli rimasti.",
  fraseCompitiNessuno: "Quando il maestro assegna un compito lo trovi qui.",
  ora: "Ora",
  prima: "{periodo} {valore}%",
  subRiga: "{prima}ora {ora}%{delta}",
  inviatoIl: "Inviato il {data}",
  guarda: "Guarda",
  nessunVideo: "Nessun video inviato per ora.",
  assegnatoIl: "Assegnato il {data}",
  fatto: "Fatto", daFare: "Da fare",
  conVideo: " · con video",
  nessunCompito: "Nessun compito assegnato per ora.",
  nessunaValutazione: "Nessuna valutazione ancora.",
  voto: "{voto} su 5",
  mediaCompetenza: "{nome}: {voto} su 5",
  mediaCompetenzaPrima: "{nome}: {voto} su 5 (prima {prima})",
  espandi: "Mostra le competenze di {colpo}",
};
export const T = { it: IT, en: { ...IT } };

type Vista = "competenze" | "video" | "compiti";

export default function GenitoreProgressi() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, caricamento, errore, ricarica } = useFigli("famiglia");
  const { compiti, fatti, caricamento: caricaCompiti, errore: errCompiti } = useCompiti(figlio);
  const [vista, setVista] = useState<Vista>("competenze");
  const [vals, setVals] = useState<RValutazione[] | null>(null);
  const [errVal, setErrVal] = useState<string | null>(null);
  const [aperto, setAperto] = useState<string | null>(null);
  const [media, setMedia] = useState<{ titolo: string; path: string } | null>(null);
  const r = rotta(centro.slug).genitore;
  const idAll = figlio?.allievo.id;

  useEffect(() => {
    if (!idAll) { setVals(null); return; }
    let vivo = true;
    sb.from("valutazioni").select("colpo,competenza,voto,test,data").eq("centro_id", centro.id).eq("allievo_id", idAll).order("data", { ascending: false }).limit(500)
      .then((x) => {
        if (!vivo) return;
        if (x.error) setErrVal(x.error.message);
        setVals((x.data ?? []) as RValutazione[]);
      });
    return () => { vivo = false; };
  }, [idAll, centro.id, sb]);

  const colpi = useMemo(() => calcolaColpi(vals ?? []), [vals]);
  const tema = useMemo(() => temaDelMese(figlio?.programma?.mesi), [figlio]);
  const nome = figlio?.allievo.nome ?? "";
  const conDelta = colpi.filter((c) => c.delta !== null);
  const medio = conDelta.length ? Math.round(conDelta.reduce((a, c) => a + (c.delta ?? 0), 0) / conDelta.length) : null;
  const migliore = [...conDelta].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];
  const periodoPrima = colpi.find((c) => c.periodoPrima)?.periodoPrima ?? "";
  const periodoOra = etichettaPeriodo(colpi.map((c) => c.ultima));
  const nFatti = compiti.filter((c) => fatti.some((f) => f.compito_id === c.id)).length;
  const video = fatti.filter((f) => f.media_path).sort((a, b) => b.fatto_il.localeCompare(a.fatto_il));

  const mese = nomeMese(new Date().getMonth());
  const kick = figlio
    ? tema ? fmt(t.kick, { nome, mese, tema: maiuscola(nomeColpo(tema.tema)), sett: tema.settimana, tot: tema.totale }) : fmt(t.kickBase, { nome, mese })
    : undefined;

  const val = vista === "competenze"
    ? { grande: medio === null ? "–" : medio > 0 ? `+${medio}` : String(medio), et: t.puntiMedia, frase: colpi.length === 0 ? t.fraseNessuna : migliore && (migliore.delta ?? 0) > 0 ? fmt(t.fraseCrescita, { nome, colpo: nomeColpo(migliore.colpo).toLowerCase() }) : t.fraseSenzaConfronto }
    : vista === "video"
      ? { grande: String(video.length), et: t.videoInviati, frase: fmt(t.fraseVideo, { nome }) }
      : { grande: compiti.length ? `${nFatti} su ${compiti.length}` : "–", et: t.compitiFatti, frase: compiti.length ? fmt(t.fraseCompiti, { fatti: nFatti, tot: compiti.length }) : t.fraseCompitiNessuno };

  async function apri(path: string, titolo: string) {
    setMedia({ titolo, path });
  }

  return (
    <SchermoCentro
      ruolo="genitore"
      tab="progressi"
      titolo={t.titolo}
      sopra={kick}
      azioni={<Link href={r.report} className="chip on" style={{ height: 34 }}><Icona nome="doc" size={15} sw={2.2} />{t.report}</Link>}
    >
      <div className="fam-col">
        {caricamento && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {!caricamento && !errore && figli.length === 0 && <SenzaFigli />}
        {figlio && (
          <>
            <SelettoreFigli figli={figli} scelto={figlio.allievo.id} onScegli={scegli} />
            <div className="seg" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" }} role="group" aria-label={t.sezioni}>
              {([["competenze", t.vCompetenze], ["video", t.vVideo], ["compiti", t.vCompiti]] as const).map(([k, l]) => (
                <button key={k} type="button" className={vista === k ? "sg on" : "sg"} aria-pressed={vista === k} onClick={() => setVista(k)}>{l}</button>
              ))}
            </div>
            {(errVal || errCompiti) && <ErroreBox testo={(errVal || errCompiti) as string} />}
            <div className="card pad fam-riga" style={{ gap: 14 }}>
              <div><div className="big" style={{ color: "#D8F34A" }}>{val.grande}</div><div className="k" style={{ marginTop: 2 }}>{val.et}</div></div>
              <div className="fam-grow v" style={{ fontSize: 13 }}>{val.frase}</div>
            </div>

            {vista === "competenze" && (
              <>
                {periodoPrima && (
                  <div className="fam-riga" style={{ gap: 12, fontSize: 11.5, fontWeight: 700, color: "#A1A1A6" }}>
                    <span className="fam-riga" style={{ gap: 5 }}><span className="dot" style={{ background: "#5A5A5E" }} />{maiuscola(periodoPrima)}</span>
                    <span className="fam-riga" style={{ gap: 5 }}><span className="dot" style={{ background: "#D8F34A" }} />{maiuscola(periodoOra)}</span>
                  </div>
                )}
                {vals === null && <Caricamento />}
                {vals && colpi.length === 0 && <div className="note">{t.nessunaValutazione}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {colpi.map((c) => (
                    <div key={c.colpo}>
                      <button type="button" className="li" style={{ width: "100%", padding: "8px 12px", gap: 10, fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}
                        aria-expanded={aperto === c.colpo} aria-label={fmt(t.espandi, { colpo: nomeColpo(c.colpo) })} onClick={() => setAperto(aperto === c.colpo ? null : c.colpo)}>
                        <span className="fam-ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Icona nome="star" size={16} sw={2.2} /></span>
                        <span className="fam-grow">
                          <span className="fam-riga fam-sp" style={{ alignItems: "baseline" }}>
                            <span className="t" style={{ fontSize: 14 }}>{nomeColpo(c.colpo)}</span>
                            <span className="fam-disp" style={{ fontSize: 18, fontWeight: 700, color: "#D8F34A" }}>{c.ora}%</span>
                          </span>
                          <span className="bar" style={{ display: "block", marginTop: 5 }}>
                            <i style={{ width: `${c.ora}%`, background: "#D8F34A" }} />
                            {c.prima !== null && <i style={{ width: `${c.prima}%`, background: "#5A5A5E" }} />}
                          </span>
                          <span className="s" style={{ display: "block", fontSize: 12 }}>
                            {fmt(t.subRiga, { prima: c.prima !== null ? `${fmt(t.prima, { periodo: maiuscola(c.periodoPrima), valore: c.prima })} · ` : "", ora: c.ora, delta: c.delta === null ? "" : ` · ${c.delta > 0 ? "+" : ""}${c.delta}` })}
                          </span>
                        </span>
                      </button>
                      {aperto === c.colpo && (
                        <div className="tbl" style={{ marginTop: 4 }}>
                          {c.competenze.map((k) => (
                            <div key={k.nome} className="tr" style={{ gridTemplateColumns: "1fr auto" }}>
                              <span>{maiuscola(k.nome.replace(/[_-]+/g, " "))}</span>
                              <span className="fam-disp" style={{ color: "#D8F34A", fontWeight: 700 }}>{fmt(t.voto, { voto: String(k.voto).replace(".", ",") })}{k.prima !== null ? ` · ${String(k.prima).replace(".", ",")}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {vista === "video" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {caricaCompiti && <Caricamento />}
                {!caricaCompiti && video.length === 0 && <div className="note">{t.nessunVideo}</div>}
                {video.map((f) => {
                  const c = compiti.find((x) => x.id === f.compito_id);
                  return (
                    <button key={f.id} type="button" className="li" style={{ width: "100%", padding: "8px 12px", gap: 10, fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}
                      onClick={() => f.media_path && apri(f.media_path, c?.titolo ?? "")}>
                      <span className="fam-ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Tratto d="M8 5v14l11-7z" size={16} sw={2.2} /></span>
                      <span className="fam-grow"><div className="t" style={{ fontSize: 14 }}>{c?.titolo ?? ""}</div><div className="s" style={{ fontSize: 12 }}>{fmt(t.inviatoIl, { data: fmtData(f.fatto_il) })}</div></span>
                      <span className="fam-disp" style={{ fontSize: 16, fontWeight: 700, color: "#D8F34A" }}>{t.guarda}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {vista === "compiti" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {caricaCompiti && <Caricamento />}
                {!caricaCompiti && compiti.length === 0 && <div className="note">{t.nessunCompito}</div>}
                {compiti.slice(0, 12).map((c) => {
                  const f = fatti.find((x) => x.compito_id === c.id);
                  return (
                    <div key={c.id} className="li" style={{ padding: "8px 12px", gap: 10 }}>
                      <span className="fam-ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Icona nome="check" size={16} sw={2.2} /></span>
                      <span className="fam-grow"><div className="t" style={{ fontSize: 14 }}>{c.titolo}{c.durata_min ? ` · ${c.durata_min} min` : ""}</div>
                        <div className="s" style={{ fontSize: 12 }}>{fmt(t.assegnatoIl, { data: fmtData(c.created_at) })}{f?.media_path ? t.conVideo : ""}</div></span>
                      <span className="fam-disp" style={{ fontSize: 16, fontWeight: 700, color: f ? "#D8F34A" : "#A1A1A6" }}>{f ? t.fatto : t.daFare}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {media && <VisoreMedia titolo={media.titolo} path={media.path} onChiudi={() => setMedia(null)} />}
    </SchermoCentro>
  );
}
