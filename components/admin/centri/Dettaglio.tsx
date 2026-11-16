"use client";
/*
 * Scheda di un centro: intestazione con i link rapidi e quattro sezioni
 * (stato e prova, branding, membri, inviti).
 */
import { useEffect, useState } from "react";
import { I, Ico, useAdmin } from "../comuni";
import { Branding } from "./Branding";
import { Inviti } from "./Inviti";
import { Membri } from "./Membri";
import { StatoProva } from "./StatoProva";
import { BADGE_STATO, NOME_STATO, SLUG_MODELLO, esadecimale, giorniA, urlApp, urlDashboard, urlLogo, type Area, type CentroConConteggi } from "./tipi";

const SEZIONI = [
  { id: "stato", nome: "Stato e prova" },
  { id: "branding", nome: "Branding" },
  { id: "membri", nome: "Membri e ruoli" },
  { id: "inviti", nome: "Inviti" },
] as const;
type Sezione = (typeof SEZIONI)[number]["id"];

export function Dettaglio({ centro, indietro, ricarica }: { centro: CentroConConteggi; indietro: () => void; ricarica: () => Promise<void> }) {
  const { sb } = useAdmin();
  const [sezione, setSezione] = useState<Sezione>("stato");
  const [aree, setAree] = useState<Area[]>([]);

  // le aree servono sia ai membri (responsabile d'area) sia agli inviti
  useEffect(() => {
    let vivo = true;
    sb.from("aree").select("id, nome, sigla").eq("centro_id", centro.id).order("ordine").then(({ data }: { data: Area[] | null }) => { if (vivo) setAree(data ?? []); });
    return () => { vivo = false; };
  }, [sb, centro.id]);

  const g = giorniA(centro.prova_fino);
  const logo = urlLogo(sb, centro.logo_path);

  return (
    <>
      <div className="db-testa">
        <button type="button" className="db-indietro" onClick={indietro}><Ico d={I.indietro} size={22} /> Centri</button>
      </div>

      <section className="db-card db-profilo">
        <span className="db-chi" style={{ gap: 16 }}>
          <span className="db-centro-mini grande" style={{ background: esadecimale(centro.colore) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" /> : <b>{(centro.nome_app || centro.nome).slice(0, 2).toUpperCase()}</b>}
          </span>
          <span>
            <span className="db-nome" style={{ fontSize: 24, whiteSpace: "normal" }}>{centro.nome}</span>
            <span className="db-piccolo" style={{ fontSize: 14 }}>/c/{centro.slug}{centro.citta ? ` · ${centro.citta}` : ""}</span>
            <span className="db-chips">
              <span className={"db-badge " + BADGE_STATO[centro.stato]}>{NOME_STATO[centro.stato]}</span>
              {centro.stato === "prova" && g !== null && <span className="db-badge grigio">{g < 0 ? `prova scaduta da ${-g} giorni` : g === 0 ? "la prova scade oggi" : `${g} giorni di prova rimasti`}</span>}
              {centro.slug === SLUG_MODELLO && <span className="db-badge blu">modello</span>}
              <span className="db-badge grigio">{centro.n_membri} membri</span>
              <span className="db-badge grigio">{centro.n_allievi} allievi</span>
            </span>
          </span>
        </span>
        <span className="db-strumenti">
          <a className="db-btn2" href={urlApp(centro.slug)} target="_blank" rel="noopener noreferrer"><Ico d={I.esterno} size={16} /> Apri app</a>
          <a className="db-btn2" href={urlDashboard(centro.slug)} target="_blank" rel="noopener noreferrer"><Ico d={I.grafico} size={16} /> Dashboard</a>
        </span>
      </section>

      <div className="db-schede" role="group" aria-label="Sezioni del centro" style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
        {SEZIONI.map((s) => <button key={s.id} type="button" aria-pressed={sezione === s.id} onClick={() => setSezione(s.id)}>{s.nome}</button>)}
      </div>

      {sezione === "stato" && <StatoProva centro={centro} ricarica={ricarica} />}
      {sezione === "branding" && <Branding centro={centro} ricarica={ricarica} />}
      {sezione === "membri" && <Membri centro={centro} aree={aree} ricarica={ricarica} />}
      {sezione === "inviti" && <Inviti centro={centro} aree={aree} />}
    </>
  );
}
