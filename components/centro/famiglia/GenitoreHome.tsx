"use client";
// G1 Home genitore: figlio scelto, prossima lezione (con il campo effettivo dopo i cambi campo),
// ultimo riassunto approvato dal maestro, progressi del mese, ultimo messaggio e ultimo avviso.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { fmtData, fmtDataLunga, isoGiorno } from "@/lib/centro/date";
import { agendaLezioni, nomeCompleto, type RCambio, type RLezione, type VoceLezione } from "./dati";
import { useFigli } from "./dati";
import { calcolaColpi, fmt, maiuscola, nomeColpo, nomeMese, nomeCampo, temaDelMese, type RValutazione } from "./util";
import { Caricamento, ErroreBox, FoglioAssenza, Icona, SelettoreFigli, SenzaFigli } from "./piccoli";

const IT = {
  ciao: "Ciao {nome}",
  famiglia: "Famiglia {cognome}",
  figliConsensi: "Figli e consensi",
  prossima: "PROSSIMA LEZIONE",
  nessunaLezione: "Nessuna lezione in programma",
  nessunaLezioneSub: "Appena il centro programma le lezioni le trovi qui.",
  con: "con {maestro}",
  ilMaestro: "il maestro",
  cambioCampo: "Cambio campo: invece del {campo}",
  motivo: "motivo: {motivo}",
  nonPuoVenire: "Non può venire",
  assenzaSegnalata: "Assenza segnalata",
  calendario: "Calendario",
  ultima: "ULTIMA LEZIONE · {data}",
  approvato: "Approvato dal maestro",
  nessunRiassunto: "Il primo riassunto arriva dopo la prima lezione chiusa e approvata dal maestro.",
  scrittoCon: "Scritto con il Coach AI e letto dal maestro prima dell'invio",
  progressi: "Progressi di {mese}",
  vediTutto: "Vedi tutto",
  nessunProgresso: "I progressi compaiono dopo la prima valutazione del maestro.",
  daLeggere: "Da leggere",
  nessunMessaggio: "Nessun messaggio",
  nessunMessaggioSub: "Qui trovi le risposte del maestro e della segreteria.",
  avvisoCentro: "Avviso dal centro",
  nessunAvviso: "Nessun avviso in questo momento",
  nessunGruppo: "{nome} non è ancora iscritto a un gruppo.",
  tema: "{tema} · sett. {sett} di {tot}",
  maestroTag: "maestro",
};
export const T = { it: IT, en: { ...IT } };

type Dati = {
  cambi: RCambio[];
  righe: RLezione[];
  ultima: RLezione | null;
  vals: RValutazione[];
  msg: { da: string; testo: string } | null;
  msgNuovo: boolean;
  avviso: { titolo: string; testo: string | null } | null;
  assenze: string[];
};

export default function GenitoreHome() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, campi, caricamento, errore, ricarica, ma } = useFigli("famiglia");
  const [dati, setDati] = useState<Dati | null>(null);
  const [errDati, setErrDati] = useState<string | null>(null);
  const [assenza, setAssenza] = useState<VoceLezione | null>(null);
  const r = rotta(centro.slug).genitore;
  const idAll = figlio?.allievo.id;
  const idGr = figlio?.gruppo?.id;

  useEffect(() => {
    if (!idAll || !ma) { setDati(null); return; }
    let vivo = true;
    (async () => {
      setErrDati(null);
      const oggi = isoGiorno();
      // senza gruppo le tre ricerche per gruppo non trovano nulla: un uuid nullo evita un errore di tipo nel database
      const g = idGr ?? "00000000-0000-0000-0000-000000000000";
      const [cambi, righe, ultima, vals, conv, notif, ass] = await Promise.all([
        sb.from("cambi_campo").select("*").eq("centro_id", centro.id).eq("gruppo_id", g).gte("data", oggi).order("data").limit(10),
        sb.from("lezioni").select("*").eq("centro_id", centro.id).eq("gruppo_id", g).gte("data", oggi).neq("stato", "chiusa").order("data").limit(10),
        sb.from("lezioni").select("*").eq("centro_id", centro.id).eq("gruppo_id", g).eq("stato", "chiusa").eq("riassunto_ok", true).not("riassunto", "is", null).order("data", { ascending: false }).limit(1),
        sb.from("valutazioni").select("colpo,competenza,voto,test,data").eq("centro_id", centro.id).eq("allievo_id", idAll).order("data", { ascending: false }).limit(300),
        sb.from("conversazioni").select("id").eq("centro_id", centro.id).eq("allievo_id", idAll).in("tipo", ["famiglia_maestro", "famiglia_segreteria"]),
        sb.from("notifiche").select("tipo,titolo,testo,letta_il,created_at").eq("membro_id", ma.id).in("tipo", ["avviso", "messaggio"]).order("created_at", { ascending: false }).limit(20),
        sb.from("assenze").select("data").eq("centro_id", centro.id).eq("allievo_id", idAll).gte("data", oggi),
      ]);
      // ultimo messaggio ricevuto (non scritto da me) tra le conversazioni del figlio
      let msg: Dati["msg"] = null;
      const ids = ((conv.data ?? []) as { id: string }[]).map((c) => c.id);
      if (ids.length) {
        const m = await sb.from("messaggi").select("autore_id,testo,created_at").in("conversazione_id", ids).order("created_at", { ascending: false }).limit(5);
        const ultimo = ((m.data ?? []) as { autore_id: string; testo: string }[]).find((x) => x.autore_id !== ma.id) ?? null;
        if (ultimo) {
          const a = await sb.from("membri").select("nome,cognome,ruolo").eq("id", ultimo.autore_id).maybeSingle();
          const nome = a.data ? `${nomeCompleto(a.data as { nome: string; cognome: string | null })} · ${(a.data as { ruolo: string }).ruolo === "segreteria" ? "segreteria" : t.maestroTag}` : t.ilMaestro;
          msg = { da: nome, testo: ultimo.testo };
        }
      }
      const nt = (notif.data ?? []) as { tipo: string; titolo: string; testo: string | null; letta_il: string | null }[];
      if (!vivo) return;
      const errore = [cambi, righe, ultima, vals].map((x) => (x as { error?: { message: string } }).error?.message).find(Boolean);
      if (errore) setErrDati(errore);
      setDati({
        cambi: (cambi.data ?? []) as RCambio[],
        righe: (righe.data ?? []) as RLezione[],
        ultima: ((ultima.data ?? [])[0] as RLezione | undefined) ?? null,
        vals: (vals.data ?? []) as RValutazione[],
        msg,
        msgNuovo: nt.some((x) => x.tipo === "messaggio" && !x.letta_il),
        avviso: nt.find((x) => x.tipo === "avviso") ?? null,
        assenze: ((ass.data ?? []) as { data: string }[]).map((x) => x.data),
      });
    })().catch((e: unknown) => vivo && setErrDati(e instanceof Error ? e.message : String(e)));
    return () => { vivo = false; };
  }, [idAll, idGr, ma?.id, centro.id, sb]); // eslint-disable-line react-hooks/exhaustive-deps

  const prossima = useMemo(() => {
    if (!figlio?.gruppo || !dati) return null;
    return agendaLezioni(figlio.gruppo, campi, new Date(), 21, dati.cambi, dati.righe, false)[0] ?? null;
  }, [figlio, dati, campi]);

  const tema = useMemo(() => temaDelMese(figlio?.programma?.mesi), [figlio]);
  const progressi = useMemo(() => {
    const colpi = calcolaColpi(dati?.vals ?? []);
    const t1 = (tema?.colpo || "").toLowerCase();
    // prima il colpo del mese, poi gli altri dal più alto
    return [...colpi].sort((a, b) => Number(b.colpo === t1) - Number(a.colpo === t1) || b.ora - a.ora).slice(0, 3);
  }, [dati, tema]);

  const maestro = figlio?.maestri[0]?.nome ? nomeCompleto(figlio.maestri[0]) : t.ilMaestro;
  const mese = nomeMese(new Date().getMonth()).toLowerCase();
  const assenteProssima = !!(prossima && dati?.assenze.includes(prossima.data));

  return (
    <SchermoCentro
      ruolo="genitore"
      tab="home"
      titolo={fmt(t.ciao, { nome: ma?.nome ?? "" })}
      sopra={`${centro.nome_app || centro.nome}${ma?.cognome ? ` · ${fmt(t.famiglia, { cognome: ma.cognome })}` : ""}`}
      azioni={<Link href={r.figli} className="icon" aria-label={t.figliConsensi}><Icona nome="users" /></Link>}
    >
      <div className="fam-col">
        {caricamento && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {!caricamento && !errore && figli.length === 0 && <SenzaFigli />}
        {figlio && (
          <>
            <SelettoreFigli figli={figli} scelto={figlio.allievo.id} onScegli={scegli} />
            {errDati && <ErroreBox testo={errDati} />}

            <div className="card pad fam-lawn" style={{ position: "relative" }}>
              <div className="fam-riga fam-sp">
                <span className="k" style={{ color: "#E6F5D6" }}>{t.prossima}</span>
                {tema && <span className="tag" style={{ background: "rgba(0,0,0,.35)" }}>{fmt(t.tema, { tema: maiuscola(nomeColpo(tema.tema)), sett: tema.settimana, tot: tema.totale })}</span>}
              </div>
              {!figlio.gruppo ? (
                <div style={{ fontSize: 14, marginTop: 8 }}>{fmt(t.nessunGruppo, { nome: figlio.allievo.nome })}</div>
              ) : !prossima ? (
                <>
                  <div className="fam-disp" style={{ fontSize: 26, fontWeight: 800, fontStyle: "italic", marginTop: 6 }}>{t.nessunaLezione}</div>
                  <div style={{ fontSize: 13, marginTop: 3 }}>{t.nessunaLezioneSub}</div>
                </>
              ) : (
                <>
                  <div className="fam-disp" style={{ fontSize: 30, fontWeight: 800, fontStyle: "italic", lineHeight: 1.05, marginTop: 6 }}>
                    {maiuscola(fmtDataLunga(prossima.data))} · {prossima.ora}
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 3 }}>
                    {prossima.campo ? nomeCampo(prossima.campo) : ""}{prossima.campo ? " · " : ""}{fmt(t.con, { maestro })}
                  </div>
                  {prossima.cambiato && (
                    <div style={{ fontSize: 12.5, marginTop: 2, color: "#FFE082", fontWeight: 700 }}>
                      {fmt(t.cambioCampo, { campo: nomeCampo(prossima.campoOriginale) })}{prossima.motivoCambio ? ` · ${fmt(t.motivo, { motivo: prossima.motivoCambio })}` : ""}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, marginTop: 2, color: "#DDEFD0" }}>{figlio.gruppo.nome}</div>
                  <div className="fam-btn-riga" style={{ marginTop: 10 }}>
                    <button type="button" className="btn2" disabled={assenteProssima} style={{ height: 40, fontSize: 13.5, background: "rgba(0,0,0,.4)" }} onClick={() => setAssenza(prossima)}>
                      {assenteProssima ? t.assenzaSegnalata : t.nonPuoVenire}
                    </button>
                    <Link href={r.calendario} className="btn2" style={{ height: 40, fontSize: 13.5, background: "rgba(0,0,0,.4)" }}>{t.calendario}</Link>
                  </div>
                </>
              )}
            </div>

            <div className="card pad">
              <div className="fam-riga fam-sp">
                <span className="k">{dati?.ultima ? fmt(t.ultima, { data: fmtData(dati.ultima.data).toUpperCase() }) : "ULTIMA LEZIONE"}</span>
                {dati?.ultima && <span className="tag" style={{ color: "#D8F34A" }}>{t.approvato}</span>}
              </div>
              <div className="v" style={{ marginTop: 6, fontSize: 13.5 }}>{dati?.ultima?.riassunto ?? t.nessunRiassunto}</div>
              {dati?.ultima && (
                <div className="fam-riga" style={{ marginTop: 8, fontSize: 12, color: "#A1A1A6", gap: 6 }}>
                  <Icona nome="check" size={14} />{t.scrittoCon}
                </div>
              )}
            </div>

            <div className="card pad">
              <div className="sec" style={{ marginBottom: 8 }}>
                <h2 style={{ fontSize: 16 }}>{fmt(t.progressi, { mese })}</h2>
                <Link href={r.progressi} className="fam-link">{t.vediTutto}</Link>
              </div>
              {progressi.length === 0 ? (
                <div className="muted" style={{ fontSize: 13 }}>{t.nessunProgresso}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {progressi.map((p) => (
                    <div key={p.colpo} className="fam-riga" style={{ fontSize: 13 }}>
                      <span style={{ width: 96, fontWeight: 700 }}>{nomeColpo(p.colpo)}</span>
                      <div className="bar fam-grow"><i style={{ width: `${p.ora}%`, background: "#D8F34A" }} /></div>
                      <span className="fam-disp" style={{ width: 44, textAlign: "right", fontWeight: 700, fontSize: 16, color: "#D8F34A" }}>
                        {p.delta === null ? "–" : p.delta > 0 ? `+${p.delta}` : p.delta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link href={r.messaggi} className="li" style={{ padding: "9px 12px" }}>
              <span className="fam-ic"><Icona nome="chat" /></span>
              <span className="fam-grow">
                <div className="t" style={{ fontSize: 14 }}>{dati?.msg?.da ?? t.nessunMessaggio}</div>
                <div className="s fam-ell">{dati?.msg?.testo ?? t.nessunMessaggioSub}</div>
              </span>
              {dati?.msgNuovo && <span className="dot" style={{ background: "#D8F34A" }} role="img" aria-label={t.daLeggere} />}
            </Link>
            <Link href={r.messaggi} className="li" style={{ padding: "9px 12px" }}>
              <span className="fam-ic"><Icona nome="bell" /></span>
              <span className="fam-grow">
                <div className="t" style={{ fontSize: 14 }}>{dati?.avviso?.titolo ?? t.avvisoCentro}</div>
                <div className="s fam-ell">{dati?.avviso ? dati.avviso.testo ?? "" : t.nessunAvviso}</div>
              </span>
            </Link>
          </>
        )}
      </div>
      {assenza && figlio && (
        <FoglioAssenza
          figlio={figlio}
          data={assenza.data}
          ora={assenza.ora}
          onChiudi={() => setAssenza(null)}
          onFatto={() => setDati((d) => (d ? { ...d, assenze: [...d.assenze, assenza.data] } : d))}
        />
      )}
    </SchermoCentro>
  );
}
