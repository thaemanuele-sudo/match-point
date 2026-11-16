"use client";
/*
 * Stato del centro (prova, attivo, sospeso) e proroga della prova.
 * Sospendere blocca l'app del centro per tutti i suoi membri, quindi chiede conferma.
 * I dati non si cancellano mai: un centro sospeso si può riattivare quando si vuole.
 */
import { useState } from "react";
import { Campo, Conferma, Errore, errMsg, useAdmin } from "../comuni";
import { BADGE_STATO, NOME_STATO, aggiungiGiorni, giorniA, oggiISO, type CentroConConteggi, type StatoCentro } from "./tipi";

const DESCRIZIONE: Record<StatoCentro, string> = {
  prova: "Il centro usa l'app gratis fino alla data di fine prova.",
  attivo: "Il centro ha il piano attivo: nessuna scadenza della prova.",
  sospeso: "L'app del centro è bloccata per tutti. I dati restano al sicuro.",
};

export function StatoProva({ centro, ricarica }: { centro: CentroConConteggi; ricarica: () => Promise<void> }) {
  const { sb, avvisa } = useAdmin();
  const [errore, setErrore] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);
  const [conferma, setConferma] = useState<StatoCentro | null>(null);
  const [data, setData] = useState(centro.prova_fino?.slice(0, 10) ?? "");
  const [piano, setPiano] = useState(centro.piano ?? "");

  const scrivi = async (campi: Record<string, unknown>, ok: string) => {
    setOcc(true); setErrore(null);
    const { error } = await sb.from("centri").update(campi).eq("id", centro.id);
    setOcc(false);
    if (error) return setErrore(errMsg(error));
    avvisa(ok);
    await ricarica();
  };

  const imposta = async (stato: StatoCentro) => {
    setConferma(null);
    const campi: Record<string, unknown> = { stato };
    // una prova senza data non scadrebbe mai: se manca, riparte da 30 giorni
    if (stato === "prova" && !centro.prova_fino) { const d = aggiungiGiorni(oggiISO(), 30); campi.prova_fino = d; setData(d); }
    await scrivi(campi, stato === "sospeso" ? "Centro sospeso" : stato === "attivo" ? "Centro attivato" : "Centro in prova");
  };

  // la proroga parte dalla fine della prova, oppure da oggi se è già scaduta o non c'è
  const proroga = async (giorni: number) => {
    const base = centro.prova_fino && (giorniA(centro.prova_fino) ?? -1) >= 0 ? centro.prova_fino.slice(0, 10) : oggiISO();
    const d = aggiungiGiorni(base, giorni);
    setData(d);
    await scrivi({ prova_fino: d }, `Prova prorogata fino al ${new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`);
  };
  const impostaData = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErrore("Scegli una data valida.");
    await scrivi({ prova_fino: data }, "Data di fine prova salvata");
  };
  const salvaPiano = () => scrivi({ piano: piano.trim() || null }, "Piano salvato");

  const g = giorniA(centro.prova_fino);

  return (
    <>
      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Stato</h2><span className={"db-badge " + BADGE_STATO[centro.stato]}>{NOME_STATO[centro.stato]}</span></div>
        <div style={{ padding: "0 20px 6px" }}><p className="db-nota" style={{ margin: 0 }}>{DESCRIZIONE[centro.stato]}</p></div>
        <div className="db-azioni" style={{ paddingTop: 14 }}>
          <div className="db-seg" role="group" aria-label="Stato del centro">
            {(["prova", "attivo", "sospeso"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={centro.stato === s} disabled={occ}
                onClick={() => (s === centro.stato ? undefined : s === "sospeso" ? setConferma(s) : void imposta(s))}>{NOME_STATO[s]}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="db-card">
        <div className="db-card-testa">
          <h2 className="db-h2">Prova gratuita</h2>
          <span className="db-nota">{centro.prova_fino ? (g !== null && g < 0 ? `scaduta il ${new Date(centro.prova_fino.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT")}` : `fino al ${new Date(centro.prova_fino.slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT")}${g !== null ? ` · ${g} giorni` : ""}`) : "nessuna data impostata"}</span>
        </div>
        <div className="db-azioni">
          {[7, 14, 30].map((n) => <button key={n} type="button" className="db-btn2" disabled={occ} onClick={() => proroga(n)}>+{n} giorni</button>)}
        </div>
        <div className="db-form" style={{ paddingTop: 0 }}>
          <Campo lab="Oppure scegli la data di fine prova">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ width: "100%", minHeight: 44, border: 0, borderRadius: 10, background: "var(--campo)", padding: "0 12px", fontSize: 16 }} />
          </Campo>
          <div className="db-campo" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="db-btn2" disabled={occ || !data} onClick={impostaData}>Salva la data</button>
          </div>
        </div>
        {centro.stato !== "prova" && <div style={{ padding: "0 20px 16px" }}><p className="db-nota" style={{ margin: 0 }}>Il centro non è in prova: la nuova data vale solo se lo rimetti in prova.</p></div>}
      </section>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Piano</h2></div>
        <div className="db-form">
          <Campo lab="Nome del piano" nota="Solo un'etichetta per te (ad esempio: base, pro, accordo speciale).">
            <input type="text" value={piano} onChange={(e) => setPiano(e.target.value)} maxLength={60} />
          </Campo>
          <div className="db-campo" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="db-btn2" disabled={occ || piano.trim() === (centro.piano ?? "")} onClick={salvaPiano}>Salva il piano</button>
          </div>
        </div>
      </section>
      <Errore testo={errore} />

      {conferma === "sospeso" && (
        <Conferma titolo="Sospendere il centro?" azione="Sospendi" occupato={occ}
          testo={`${centro.nome} non potrà più usare l'app finché non lo riattivi. I dati restano al loro posto.`}
          onSi={() => void imposta("sospeso")} onNo={() => setConferma(null)} />
      )}
    </>
  );
}
