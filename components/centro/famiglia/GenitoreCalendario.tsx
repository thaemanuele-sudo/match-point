"use client";
// G2 Calendario genitore: lezioni (con campo effettivo e cambi campo), tornei, test e chiusure del mese.
// Giustifica assenza = RPC avvisa_assenza; chiedi recupero = messaggio alla segreteria (invia_messaggio).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { aggiungiGiorni, fmtData, fmtGiorni, fmtOra, isoGiorno, leggiData } from "@/lib/centro/date";
import { agendaLezioni, nomeBreve, nomeCompleto, useFigli, type Figlio, type RCambio, type RLezione, type VoceLezione } from "./dati";
import { dataTest, fineMese, fmt, chiaveMese, inizioMese, maiuscola, nomeCampo, nomeColpo, nomeMese, temaDelMese } from "./util";
import { inviaMessaggioFamiglia } from "./messaggi";
import { Caricamento, ErroreBox, Foglio, FoglioAssenza, Icona, SelettoreFigli, SenzaFigli } from "./piccoli";

const IT = {
  kick: "{nome} · {gruppo}",
  filtroTutto: "Tutto", filtroLezioni: "Lezioni", filtroTornei: "Tornei", filtroTest: "Test", filtroChiusure: "Chiusure",
  filtri: "Filtra gli eventi",
  tipoLezione: "Lezione", tipoChiusura: "Chiusura", tipoTorneo: "Torneo", tipoTest: "Test",
  lezioneTema: "Lezione · {tema}", lezione: "Lezione",
  chiusiTitolo: "Campi chiusi", testTitolo: "Settimana di test", testMese: "Test del mese",
  testSub: "Il maestro valuta ogni colpo · dal {dal} al {al}", testSubMese: "Il maestro valuta ogni colpo",
  fino: "fino al {data}",
  cambio: "cambio campo",
  giustifica: "Giustifica assenza", assenzaSegnalata: "Assenza segnalata",
  presente: "Presente", assente: "Assente",
  campiChiusi: "Campi chiusi",
  mesePrec: "Mese precedente", meseSucc: "Mese successivo",
  nessunEvento: "Nessun evento in questo mese.",
  nessunaAssenza: "Nessuna assenza segnalata",
  assenzeN: "{n} assenze segnalate", assenzaUna: "1 assenza segnalata",
  recuperoSub: "Se manca una lezione puoi chiedere un recupero in un altro orario",
  recuperoInviato: "Richiesta di recupero inviata alla segreteria",
  chiediRecupero: "Chiedi recupero", richiestaInviata: "Richiesta inviata",
  scriviMaestro: "Scrivi al maestro",
  nota: "Le assenze si segnalano almeno {ore} ore prima della lezione. Il maestro vede subito chi manca.",
  recTitolo: "Chiedi un recupero",
  recSub: "Il messaggio arriva alla segreteria, che ti propone un altro orario.",
  recMsgConAssenza: "Buongiorno, {figlio} non ha potuto partecipare alla lezione di {data}. Sarebbe possibile un recupero in un altro orario? Grazie, {genitore}",
  recMsgGenerico: "Buongiorno, vorrei chiedere un recupero per {figlio} in un altro orario. Grazie, {genitore}",
  recMessaggio: "MESSAGGIO",
  recInvia: "Invia alla segreteria", recInvio: "Invio…",
  recTitoloChat: "{figlio} · segreteria",
  chiudi: "Chiudi",
  nessunGruppo: "{nome} non è ancora iscritto a un gruppo: non ci sono lezioni da mostrare.",
};
export const T = { it: IT, en: { ...IT } };

export type EventoCentro = { tipo: "torneo" | "chiusura" | "test"; data: string; fino?: string | null; titolo?: string; dettaglio?: string; fasce?: string[] };

type Ev = {
  chiave: string; data: string; titolo: string; sub: string; tipo: "Lezione" | "Chiusura" | "Torneo" | "Test";
  lez?: VoceLezione; passato: boolean; chiuso: boolean;
};

type Dati = { cambi: RCambio[]; righe: RLezione[]; assenze: string[]; presenti: Record<string, boolean> };

const COLORI: Record<Ev["tipo"], CSSProperties> = {
  Lezione: { background: "#232326" },
  Chiusura: { background: "#4A2A2C", color: "#FFB4B6" },
  Torneo: { background: "#D8F34A", color: "#0B0B0C" },
  Test: { background: "#2A3A5A", color: "#B8D0FF" },
};

/** Eventi del centro (tornei, chiusure, test) letti da centri.impostazioni.eventi, filtrati per fascia del figlio. */
function eventiCentro(imp: unknown, fascia: string | null | undefined): EventoCentro[] {
  const lista = (imp as { eventi?: unknown } | null)?.eventi;
  if (!Array.isArray(lista)) return [];
  return (lista as EventoCentro[]).filter((e) => e && typeof e.data === "string" && ["torneo", "chiusura", "test"].includes(e.tipo) && (!e.fasce?.length || !fascia || e.fasce.includes(fascia)));
}

export default function GenitoreCalendario() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, campi, caricamento, errore, ricarica, ma } = useFigli("famiglia");
  const [mese, setMese] = useState(() => chiaveMese(new Date()));
  const [filtro, setFiltro] = useState<"tutto" | "lezioni" | "tornei" | "test" | "chiusure">("tutto");
  const [dati, setDati] = useState<Dati | null>(null);
  const [errDati, setErrDati] = useState<string | null>(null);
  const [assenza, setAssenza] = useState<VoceLezione | null>(null);
  const [recupero, setRecupero] = useState(false);
  const [recuperoFatto, setRecuperoFatto] = useState(false);
  const r = rotta(centro.slug).genitore;
  const idAll = figlio?.allievo.id;
  const idGr = figlio?.gruppo?.id;
  const ore = Number(centro.impostazioni?.assenza_entro_ore ?? 2);

  useEffect(() => {
    if (!idAll) { setDati(null); return; }
    let vivo = true;
    (async () => {
      setErrDati(null);
      const dal = isoGiorno(inizioMese(mese));
      const al = isoGiorno(fineMese(mese));
      const g = idGr ?? "00000000-0000-0000-0000-000000000000";
      const [cambi, righe, ass] = await Promise.all([
        sb.from("cambi_campo").select("*").eq("centro_id", centro.id).eq("gruppo_id", g).gte("data", dal).lte("data", al),
        sb.from("lezioni").select("*").eq("centro_id", centro.id).eq("gruppo_id", g).gte("data", dal).lte("data", al),
        sb.from("assenze").select("data").eq("centro_id", centro.id).eq("allievo_id", idAll).gte("data", dal).lte("data", al),
      ]);
      const lez = (righe.data ?? []) as RLezione[];
      const presenti: Record<string, boolean> = {};
      if (lez.length) {
        const p = await sb.from("presenze").select("lezione_id,presente").eq("centro_id", centro.id).eq("allievo_id", idAll).in("lezione_id", lez.map((x) => x.id));
        for (const x of (p.data ?? []) as { lezione_id: string; presente: boolean }[]) {
          const d = lez.find((l) => l.id === x.lezione_id)?.data;
          if (d) presenti[d] = x.presente;
        }
      }
      if (!vivo) return;
      const e = cambi.error?.message || righe.error?.message || ass.error?.message;
      if (e) setErrDati(e);
      setDati({ cambi: (cambi.data ?? []) as RCambio[], righe: lez, assenze: ((ass.data ?? []) as { data: string }[]).map((x) => x.data), presenti });
    })().catch((e: unknown) => vivo && setErrDati(e instanceof Error ? e.message : String(e)));
    return () => { vivo = false; };
  }, [idAll, idGr, mese, centro.id, sb]);

  const eventi = useMemo<Ev[]>(() => {
    if (!figlio || !dati) return [];
    const ora = Date.now();
    const dal = inizioMese(mese);
    const fine = fineMese(mese);
    const giorniMese = fine.getDate();
    const fuori = eventiCentro(centro.impostazioni, figlio.gruppo?.fascia);
    const chiusure = fuori.filter((e) => e.tipo === "chiusura");
    const inChiusura = (d: string) => chiusure.some((c) => d >= c.data && d <= (c.fino || c.data));
    const out: Ev[] = [];

    if (figlio.gruppo) {
      const maestro = figlio.maestri[0] ? nomeCompleto(figlio.maestri[0]) : "";
      for (const v of agendaLezioni(figlio.gruppo, campi, dal, giorniMese, dati.cambi, dati.righe, true)) {
        const tema = temaDelMese(figlio.programma?.mesi, leggiData(v.data));
        const chiuso = inChiusura(v.data);
        const inizio = leggiData(v.data);
        const [h, m] = v.ora.split(":").map(Number);
        inizio.setHours(h || 0, m || 0, 0, 0);
        const pezzi = [v.ora, chiuso ? t.campiChiusi : nomeCampo(v.campo), maestro, v.cambiato ? t.cambio : ""].filter(Boolean);
        out.push({
          chiave: `l-${v.data}`, data: v.data, tipo: "Lezione",
          titolo: tema?.tema ? fmt(t.lezioneTema, { tema: maiuscola(nomeColpo(tema.tema)) }) : t.lezione,
          sub: pezzi.join(" · "), lez: v, passato: +inizio < ora, chiuso,
        });
      }
    }
    for (const e of fuori) {
      if (e.data < isoGiorno(dal) || e.data > isoGiorno(fine)) continue;
      const tipo = e.tipo === "torneo" ? "Torneo" : e.tipo === "chiusura" ? "Chiusura" : "Test";
      const base = e.titolo || (tipo === "Chiusura" ? t.chiusiTitolo : tipo === "Test" ? t.testTitolo : t.tipoTorneo);
      const sub = [e.dettaglio, e.fino && e.fino !== e.data ? fmt(t.fino, { data: fmtData(e.fino) }) : ""].filter(Boolean).join(" · ");
      out.push({ chiave: `e-${e.tipo}-${e.data}`, data: e.data, tipo, titolo: base, sub, passato: e.data < isoGiorno(), chiuso: false });
    }
    // settimane di test del programma del gruppo
    for (const s of figlio.programma?.settimane_test ?? []) {
      const d = dataTest(String(s), figlio.programma?.anno ?? dal.getFullYear());
      if (!d || chiaveMese(d.data) !== mese) continue;
      out.push({
        chiave: `t-${d.data}`, data: d.data, tipo: "Test", passato: d.data < isoGiorno(), chiuso: false,
        titolo: d.mese ? t.testMese : t.testTitolo,
        sub: d.mese ? t.testSubMese : fmt(t.testSub, { dal: fmtData(d.data), al: fmtData(aggiungiGiorni(d.data, 6)) }),
      });
    }
    return out.sort((a, b) => a.data.localeCompare(b.data) || a.tipo.localeCompare(b.tipo));
  }, [figlio, dati, campi, mese, centro.impostazioni, t]);

  const visibili = eventi.filter((e) => filtro === "tutto" || (filtro === "lezioni" && e.tipo === "Lezione") || (filtro === "tornei" && e.tipo === "Torneo") || (filtro === "test" && e.tipo === "Test") || (filtro === "chiusure" && e.tipo === "Chiusura"));
  const nAss = dati?.assenze.length ?? 0;
  const ultimaAss = dati?.assenze.slice().sort().pop();
  const meseData = inizioMese(mese);
  const vaiMese = (n: number) => setMese(chiaveMese(new Date(meseData.getFullYear(), meseData.getMonth() + n, 1)));

  const FILTRI = [["tutto", t.filtroTutto], ["lezioni", t.filtroLezioni], ["tornei", t.filtroTornei], ["test", t.filtroTest], ["chiusure", t.filtroChiusure]] as const;
  const gruppoTesto = figlio?.gruppo ? `${figlio.gruppo.nome}${figlio.gruppo.giorni?.length ? ` · ${fmtGiorni(figlio.gruppo.giorni)} ${fmtOra(figlio.gruppo.ora)}` : ""}` : "";

  return (
    <SchermoCentro
      ruolo="genitore"
      tab="calendario"
      titolo={`${nomeMese(meseData.getMonth())} ${meseData.getFullYear()}`}
      sopra={figlio ? fmt(t.kick, { nome: figlio.allievo.nome, gruppo: gruppoTesto }) : undefined}
    >
      <div className="fam-col">
        {caricamento && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {!caricamento && !errore && figli.length === 0 && <SenzaFigli />}
        {figlio && (
          <>
            <SelettoreFigli figli={figli} scelto={figlio.allievo.id} onScegli={scegli} />
            <div className="fam-riga fam-sp">
              <button type="button" className="chip" onClick={() => vaiMese(-1)} aria-label={t.mesePrec}><Icona nome="back" size={14} sw={2.4} /></button>
              <div className="chips" role="group" aria-label={t.filtri}>
                {FILTRI.map(([k, l]) => (
                  <button key={k} type="button" className={filtro === k ? "chip on" : "chip"} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>
                ))}
              </div>
              <button type="button" className="chip" onClick={() => vaiMese(1)} aria-label={t.meseSucc}><Icona nome="next" size={14} sw={2.4} /></button>
            </div>
            {!figlio.gruppo && <div className="note">{fmt(t.nessunGruppo, { nome: figlio.allievo.nome })}</div>}
            {errDati && <ErroreBox testo={errDati} />}
            {!dati && !errDati && <Caricamento />}
            {dati && visibili.length === 0 && <div className="note">{t.nessunEvento}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {visibili.map((e) => {
                const dow = fmtData(e.data).split(" ")[0].toUpperCase();
                const giorno = leggiData(e.data).getDate();
                const segnalata = dati?.assenze.includes(e.data) ?? false;
                const pres = dati?.presenti[e.data];
                const puoGiustificare = e.tipo === "Lezione" && !e.passato && !e.chiuso;
                return (
                  <div key={e.chiave} className="li" style={{ padding: "8px 10px", gap: 10, opacity: e.passato ? 0.65 : 1 }}>
                    <span style={{ width: 44, flex: "none", textAlign: "center" }}>
                      <span className="fam-disp" style={{ display: "block", fontSize: 26, fontWeight: 800, lineHeight: 1, color: "#D8F34A" }}>{giorno}</span>
                      <span className="k" style={{ fontSize: 10.5 }}>{dow}</span>
                    </span>
                    <span className="fam-grow">
                      <div className="t" style={{ fontSize: 14 }}>{e.titolo}</div>
                      <div className="s">{e.sub}</div>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                      <span className="tag" style={COLORI[e.tipo]}>{e.tipo === "Lezione" ? t.tipoLezione : e.tipo === "Chiusura" ? t.tipoChiusura : e.tipo === "Torneo" ? t.tipoTorneo : t.tipoTest}</span>
                      {puoGiustificare && (
                        <button type="button" className="chip" disabled={segnalata}
                          style={{ height: 26, fontSize: 11.5, padding: "0 9px", ...(segnalata ? { background: "#D8F34A", color: "#0B0B0C" } : {}) }}
                          onClick={() => e.lez && setAssenza(e.lez)}>
                          {segnalata ? t.assenzaSegnalata : t.giustifica}
                        </button>
                      )}
                      {e.tipo === "Lezione" && e.passato && (pres !== undefined || segnalata) && (
                        <span className="tag" style={pres ? { color: "#9BE3B0" } : { color: "#FFB4B6" }}>{pres ? t.presente : t.assente}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="card pad" style={{ borderColor: "rgba(216,243,74,.25)" }}>
              <div className="fam-riga" style={{ gap: 8 }}>
                <span className="fam-ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Icona nome="check" /></span>
                <div className="fam-grow">
                  <div className="t" style={{ fontWeight: 700, fontSize: 14 }}>{nAss === 0 ? t.nessunaAssenza : nAss === 1 ? t.assenzaUna : fmt(t.assenzeN, { n: nAss })}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{recuperoFatto ? t.recuperoInviato : t.recuperoSub}</div>
                </div>
              </div>
              <div className="fam-btn-riga" style={{ marginTop: 10 }}>
                <button type="button" className="btn2" disabled={recuperoFatto} style={{ height: 40, fontSize: 13.5 }} onClick={() => setRecupero(true)}>{recuperoFatto ? t.richiestaInviata : t.chiediRecupero}</button>
                <Link href={r.messaggi} className="btn2" style={{ height: 40, fontSize: 13.5 }}>{t.scriviMaestro}</Link>
              </div>
            </div>
            <div className="note">{fmt(t.nota, { ore })}</div>
          </>
        )}
      </div>
      {assenza && figlio && (
        <FoglioAssenza figlio={figlio} data={assenza.data} ora={assenza.ora} onChiudi={() => setAssenza(null)}
          onFatto={() => setDati((d) => (d ? { ...d, assenze: [...d.assenze, assenza.data] } : d))} />
      )}
      {recupero && figlio && ma && (
        <FoglioRecupero figlio={figlio} genitore={nomeCompleto(ma)} dataAssenza={ultimaAss} centroId={centro.id} membroId={ma.id}
          onChiudi={() => setRecupero(false)} onFatto={() => setRecuperoFatto(true)} />
      )}
    </SchermoCentro>
  );
}

/** Richiesta di recupero: un messaggio alla segreteria, nella conversazione famiglia_segreteria del figlio. */
function FoglioRecupero({ figlio, genitore, dataAssenza, centroId, membroId, onChiudi, onFatto }: {
  figlio: Figlio; genitore: string; dataAssenza?: string; centroId: string; membroId: string; onChiudi: () => void; onFatto: () => void;
}) {
  const t = useT(T);
  const { sb } = useCentro();
  const [testo, setTesto] = useState(() =>
    dataAssenza
      ? fmt(t.recMsgConAssenza, { figlio: nomeBreve(figlio.allievo), data: fmtData(dataAssenza), genitore })
      : fmt(t.recMsgGenerico, { figlio: nomeBreve(figlio.allievo), genitore }),
  );
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [fatto, setFatto] = useState(false);

  async function invia() {
    setInvio(true);
    setErrore(null);
    const e = await inviaMessaggioFamiglia(sb, centroId, membroId, figlio.allievo.id, "famiglia_segreteria", fmt(t.recTitoloChat, { figlio: nomeBreve(figlio.allievo) }), testo.trim());
    setInvio(false);
    if (e) return setErrore(e);
    setFatto(true);
    onFatto();
  }

  return (
    <Foglio titolo={t.recTitolo} onChiudi={onChiudi}>
      <div className="muted" style={{ fontSize: 13.5 }}>{t.recSub}</div>
      {fatto ? (
        <>
          <div className="fam-ok" role="status">{t.recuperoInviato}</div>
          <button type="button" className="btn" onClick={onChiudi}>{t.chiudi}</button>
        </>
      ) : (
        <>
          <label>
            <span className="fam-lab">{t.recMessaggio}</span>
            <textarea className="fam-txt" value={testo} onChange={(e) => setTesto(e.target.value)} maxLength={600} />
          </label>
          {errore && <div className="fam-err" role="alert">{errore}</div>}
          <button type="button" className="btn" disabled={invio || testo.trim().length < 5} onClick={invia}>{invio ? t.recInvio : t.recInvia}</button>
        </>
      )}
    </Foglio>
  );
}
