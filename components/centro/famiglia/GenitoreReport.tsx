"use client";
// G4 Report del mese: solo mesi chiusi e solo da riassunti approvati dal maestro. Esporta PDF con la stampa del browser
// (window.print): la pagina stampata è una copia pulita in un portale, vedi famiglia.css.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { aggiungiGiorni, fmtData, isoGiorno } from "@/lib/centro/date";
import { COL_LEZIONE, nomeCompleto, useFigli, type RLezione } from "./dati";
import { chiaveMese, fmt, fmtOre, frasiProssimaVolta, inizioMese, nomeColpo, nomeMese, type RValutazione } from "./util";
import { Caricamento, ErroreBox, Icona, SelettoreFigli, SenzaFigli } from "./piccoli";

const IT = {
  titolo: "Report di {mese}",
  titoloVuoto: "Report del mese",
  kick: "{nome} · {gruppo}",
  scegliMese: "Scegli il mese",
  preparato: "Preparato dal Coach AI e approvato da {chi}",
  inAttesa: "Il maestro non ha ancora approvato i riassunti di {mese}. Il report è completo quando li approva.",
  parziale: "{n} lezioni senza riassunto approvato non sono incluse.",
  presenze: "PRESENZE", ore: "ORE IN CAMPO", test: "TEST",
  testFatto: "Fatto", testNonPrevisto: "Non previsto",
  presenzeVal: "{p} su {t}",
  lavoro: "LAVORO SVOLTO", migliorare: "COSA MIGLIORARE", consiglio: "CONSIGLIO PER CASA",
  nessunMiglioramento: "Nessun punto da rinforzare è stato segnalato in questo mese.",
  rinforzare: "Da rinforzare: {colpi}.",
  nessunConsiglio: "Nessun compito assegnato in questo mese.",
  esporta: "Esporta PDF", esportaDisabilitato: "In attesa del maestro",
  scrivi: "Scrivi al maestro",
  vuotoTitolo: "Il primo report arriva a fine mese",
  vuotoSub: "Il report di un mese si crea quando il mese è finito, usando solo i riassunti che il maestro ha approvato.",
  ilMaestro: "il maestro",
  indietro: "Indietro",
  stampaGenerato: "Generato il {data} da {centro}. Contiene solo riassunti approvati dal maestro.",
  stampaTitolo: "Report di {mese} {anno}",
  voto: "{colpo} ({voto} su 5)",
  nessunGruppo: "{nome} non è iscritto a un gruppo: non ci sono report.",
};
export const T = { it: IT, en: { ...IT } };

type Mese = { chiave: string; lezioni: RLezione[] };

export default function GenitoreReport() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, caricamento, errore, ricarica } = useFigli("famiglia");
  const [mesi, setMesi] = useState<Mese[] | null>(null);
  const [presenze, setPresenze] = useState<Record<string, boolean>>({});
  const [vals, setVals] = useState<RValutazione[]>([]);
  const [compiti, setCompiti] = useState<{ titolo: string; created_at: string }[]>([]);
  const [errDati, setErrDati] = useState<string | null>(null);
  const [mese, setMese] = useState<string | null>(null);
  const [montato, setMontato] = useState(false);
  const r = rotta(centro.slug).genitore;
  const idAll = figlio?.allievo.id;
  const idGr = figlio?.gruppo?.id;

  useEffect(() => setMontato(true), []);

  useEffect(() => {
    if (!idAll || !idGr) { setMesi([]); return; }
    let vivo = true;
    (async () => {
      setErrDati(null);
      const oggi = new Date();
      const inizioCorrente = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
      const dal = new Date(inizioCorrente.getFullYear(), inizioCorrente.getMonth() - 12, 1);
      const al = aggiungiGiorni(inizioCorrente, -1);
      // il mese corrente non è chiuso: il report esiste solo per i mesi finiti
      const l = await sb.from("lezioni").select(COL_LEZIONE).eq("centro_id", centro.id).eq("gruppo_id", idGr).eq("stato", "chiusa").gte("data", isoGiorno(dal)).lte("data", isoGiorno(al)).order("data");
      if (l.error) return void (vivo && (setErrDati(l.error.message), setMesi([])));
      const lez = (l.data ?? []) as RLezione[];
      const [p, v, c] = await Promise.all([
        lez.length ? sb.from("presenze").select("lezione_id,presente").eq("centro_id", centro.id).eq("allievo_id", idAll).in("lezione_id", lez.map((x) => x.id)) : Promise.resolve({ data: [] }),
        sb.from("valutazioni").select("colpo,competenza,voto,test,data").eq("centro_id", centro.id).eq("allievo_id", idAll).gte("data", isoGiorno(dal)).lte("data", isoGiorno(al)),
        sb.from("compiti").select("titolo,created_at").eq("centro_id", centro.id).or(`allievo_id.eq.${idAll},and(allievo_id.is.null,gruppo_id.eq.${idGr})`).gte("created_at", isoGiorno(dal)).lt("created_at", isoGiorno(inizioCorrente)).order("created_at"),
      ]);
      if (!vivo) return;
      const pr: Record<string, boolean> = {};
      for (const x of (p.data ?? []) as { lezione_id: string; presente: boolean }[]) pr[x.lezione_id] = x.presente;
      const perMese = new Map<string, RLezione[]>();
      for (const x of lez) perMese.set(chiaveMese(x.data), [...(perMese.get(chiaveMese(x.data)) || []), x]);
      const elenco = [...perMese.entries()].map(([chiave, lezioni]) => ({ chiave, lezioni })).sort((a, b) => b.chiave.localeCompare(a.chiave));
      setPresenze(pr);
      setVals((v.data ?? []) as RValutazione[]);
      setCompiti(((c.data ?? []) as { titolo: string; created_at: string }[]));
      setMesi(elenco);
      setMese((cur) => (cur && elenco.some((e) => e.chiave === cur) ? cur : elenco.find((e) => e.lezioni.some((z) => z.riassunto_ok))?.chiave ?? elenco[0]?.chiave ?? null));
    })().catch((e: unknown) => vivo && setErrDati(e instanceof Error ? e.message : String(e)));
    return () => { vivo = false; };
  }, [idAll, idGr, centro.id, sb]);

  const corrente = mesi?.find((m) => m.chiave === mese) ?? null;
  const rep = useMemo(() => {
    if (!corrente || !figlio) return null;
    const lez = corrente.lezioni;
    const approvate = lez.filter((l) => l.riassunto_ok && l.riassunto?.trim());
    const presenti = lez.filter((l) => presenze[l.id]).length;
    const durata = figlio.gruppo?.durata_min ?? 60;
    const inMese = (d: string) => chiaveMese(d) === corrente.chiave;
    const vm = vals.filter((v) => inMese(v.data));
    // colpi con voto medio basso nel mese (sotto 3,5 su 5), dal più debole
    const perColpo = new Map<string, number[]>();
    for (const v of vm) perColpo.set(v.colpo.toLowerCase(), [...(perColpo.get(v.colpo.toLowerCase()) || []), v.voto]);
    const deboli = [...perColpo.entries()]
      .map(([c, v]) => ({ c, m: v.reduce((a, b) => a + b, 0) / v.length }))
      .filter((x) => x.m < 3.5)
      .sort((a, b) => a.m - b.m)
      .slice(0, 2)
      .map((x) => fmt(t.voto, { colpo: nomeColpo(x.c), voto: (Math.round(x.m * 10) / 10).toString().replace(".", ",") }));
    const prossime = frasiProssimaVolta(approvate.map((l) => l.riassunto as string)).slice(0, 2);
    const miglioramenti = [...prossime, ...(deboli.length ? [fmt(t.rinforzare, { colpi: deboli.join(", ") })] : [])];
    const consigli = [...new Set([...lez.map((l) => l.compito?.trim() ?? "").filter(Boolean), ...compiti.filter((c) => inMese(c.created_at)).map((c) => c.titolo)])].slice(-3);
    const maestri = [...new Set(approvate.map((l) => figlio.maestri.find((m) => m.id === l.maestro_id)).filter(Boolean).map((m) => nomeCompleto(m!)))];
    return {
      pres: fmt(t.presenzeVal, { p: presenti, t: lez.length }),
      ore: fmtOre(presenti * durata),
      test: vm.length ? t.testFatto : t.testNonPrevisto,
      approvate, senza: lez.length - approvate.length,
      lavoro: approvate.map((l) => ({ data: l.data, testo: (l.riassunto as string).trim() })),
      miglioramenti, consigli,
      approva: maestri.length ? maestri.join(", ") : t.ilMaestro,
    };
  }, [corrente, figlio, presenze, vals, compiti, t]);

  const dataMese = corrente ? inizioMese(corrente.chiave) : null;
  const nomeM = dataMese ? nomeMese(dataMese.getMonth()) : "";
  const pronto = !!rep && rep.approvate.length > 0;
  const blocchi = rep
    ? [
        { c: "#D8F34A", k: t.lavoro, righe: rep.lavoro.map((l) => `${fmtData(l.data)} · ${l.testo}`) },
        { c: "#FFD54A", k: t.migliorare, righe: rep.miglioramenti.length ? rep.miglioramenti : [t.nessunMiglioramento] },
        { c: "#3D8BFF", k: t.consiglio, righe: rep.consigli.length ? rep.consigli : [t.nessunConsiglio] },
      ]
    : [];

  return (
    <SchermoCentro
      ruolo="genitore"
      tab="progressi"
      titolo={nomeM ? fmt(t.titolo, { mese: nomeM }) : t.titoloVuoto}
      sopra={figlio ? fmt(t.kick, { nome: figlio.allievo.nome, gruppo: figlio.gruppo?.nome ?? "" }) : undefined}
      indietro={r.progressi}
    >
      <div className="fam-col" style={{ gap: 9 }}>
        {caricamento && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {!caricamento && !errore && figli.length === 0 && <SenzaFigli />}
        {figlio && (
          <>
            <SelettoreFigli figli={figli} scelto={figlio.allievo.id} onScegli={(id) => { setMesi(null); setMese(null); scegli(id); }} />
            {errDati && <ErroreBox testo={errDati} />}
            {!figlio.gruppo && <div className="note">{fmt(t.nessunGruppo, { nome: figlio.allievo.nome })}</div>}
            {figlio.gruppo && mesi === null && <Caricamento />}
            {mesi && mesi.length === 0 && figlio.gruppo && (
              <div className="card pad" style={{ textAlign: "center" }}>
                <div className="t" style={{ fontWeight: 700 }}>{t.vuotoTitolo}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{t.vuotoSub}</div>
              </div>
            )}
            {mesi && mesi.length > 0 && (
              <div className="chips" role="group" aria-label={t.scegliMese}>
                {mesi.map((m) => (
                  <button key={m.chiave} type="button" className={m.chiave === mese ? "chip on" : "chip"} aria-pressed={m.chiave === mese} onClick={() => setMese(m.chiave)}>
                    {nomeMese(inizioMese(m.chiave).getMonth())}
                  </button>
                ))}
              </div>
            )}
            {rep && (
              <>
                <div className="note fam-riga" style={{ color: "#E5E5EA", gap: 8 }}>
                  <span style={{ color: "#D8F34A", flex: "none", display: "flex" }}><Icona nome="shield" size={16} sw={2.2} /></span>
                  <span>{pronto ? fmt(t.preparato, { chi: rep.approva }) : fmt(t.inAttesa, { mese: nomeM.toLowerCase() })}</span>
                </div>
                {pronto && rep.senza > 0 && <div className="note">{fmt(t.parziale, { n: rep.senza })}</div>}
                <div className="g3">
                  <div className="tile"><b>{rep.pres}</b><span>{t.presenze}</span></div>
                  <div className="tile"><b>{rep.ore}</b><span>{t.ore}</span></div>
                  <div className="tile"><b>{rep.test}</b><span>{t.test}</span></div>
                </div>
                {pronto && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {blocchi.map((b) => (
                      <div key={b.k} className="card pad" style={{ padding: "11px 13px" }}>
                        <div className="fam-riga" style={{ gap: 7 }}><span className="dot" style={{ background: b.c }} /><span className="k">{b.k}</span></div>
                        {b.righe.map((x, i) => <div key={i} className="v" style={{ fontSize: 13, marginTop: 4 }}>{x}</div>)}
                      </div>
                    ))}
                  </div>
                )}
                <div className="fam-btn-riga">
                  <button type="button" className="btn" style={{ flex: 1, height: 48, fontSize: 15 }} disabled={!pronto} onClick={() => window.print()}>
                    <Icona nome="share" size={18} sw={2.4} />{pronto ? t.esporta : t.esportaDisabilitato}
                  </button>
                  <Link href={r.messaggi} className="btn2" style={{ flex: "none", width: 130, height: 48, fontSize: 14 }}>{t.scrivi}</Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
      {montato && rep && figlio && dataMese && pronto &&
        createPortal(
          <div className="fam-print-root">
            <h1>{fmt(t.stampaTitolo, { mese: nomeM, anno: dataMese.getFullYear() })}</h1>
            <div className="p-sub">{nomeCompleto(figlio.allievo)} · {figlio.gruppo?.nome} · {centro.nome_app || centro.nome}</div>
            <div className="p-kpi">
              <div><b>{rep.pres}</b><span>{t.presenze}</span></div>
              <div><b>{rep.ore}</b><span>{t.ore}</span></div>
              <div><b>{rep.test}</b><span>{t.test}</span></div>
            </div>
            {blocchi.map((b) => (
              <div key={b.k} className="p-bl"><h3>{b.k}</h3>{b.righe.map((x, i) => <p key={i}>{x}</p>)}</div>
            ))}
            <div className="p-foot">{fmt(t.stampaGenerato, { data: fmtData(new Date()), centro: centro.nome_app || centro.nome })} {fmt(t.preparato, { chi: rep.approva })}.</div>
          </div>,
          document.body,
        )}
    </SchermoCentro>
  );
}
