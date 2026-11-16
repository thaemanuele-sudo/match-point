"use client";
// C11 · Progressi per fascia: confronto tra gruppi o tra maestri sulla stessa competenza, dalle valutazioni dei test.
import { useEffect, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Caricamento, Chip, Chips, Errore, Nota, Sezione, Seg, Tile, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { allieviDelGruppo, maestriDi, nomeCompleto, settimanaProgramma, sostituisci, useOrg } from "./dati";
import type { ValutazioneR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Progressi per fascia", sopra: "{centro} · {mese}{sett}", sett: " · sett. {n} di {tot}", viste: "Confronta per", perGruppo: "Per gruppo", perMaestro: "Per maestro",
  media: "media del centro", top: "il più avanti", delta: "vs trimestre", livello: "livello raggiunto", titoloLista: "{c} · {v}", gruppi: "gruppi", maestri: "maestri",
  subGruppo: "{m} · {n} allievi", subMaestro: "{g} · {n} allievi", noteGruppo: "Il gruppo più indietro {su} è {nome} ({v}%). Valuta un blocco dedicato nel prossimo ciclo.",
  noteMaestro: "Stessa scala del Metodo, sugli allievi seguiti. Più margine: {nome}.", suDritto: "sul dritto", suRovescio: "sul rovescio", suServizio: "sul servizio", suVolee: "sulla volée", suGambe: "nel gioco di gambe",
  c_dritto: "Dritto", c_rovescio: "Rovescio", c_servizio: "Servizio", c_volee: "Volée", c_gambe: "Gambe",
  vuotoT: "Ancora nessuna valutazione", vuotoS: "I progressi compaiono dopo i primi test dei maestri su questa competenza.", nessuno: "—", nessunMaestro: "senza maestro",
};
const T = { it: IT, en: { ...IT } };
const COMP = ["dritto", "rovescio", "servizio", "volee", "gambe"] as const;
type Comp = (typeof COMP)[number];
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const chiaveColpo: Record<Comp, string> = { dritto: "dritto", rovescio: "rovescio", servizio: "servizio", volee: "volee", gambe: "gamb" };

export default function CentroProgressi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, sb, dati: d } = o;
  const r = rotta(centro.slug);
  const [val, setVal] = useState<ValutazioneR[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [vista, setVista] = useState<"gruppi" | "maestri">("gruppi");
  const [comp, setComp] = useState<Comp>("dritto");

  useEffect(() => {
    sb.from("valutazioni").select("*").eq("centro_id", centro.id).then(({ data, error }: { data: unknown; error: { message: string } | null }) => (error ? setErr(error.message) : setVal((data ?? []) as ValutazioneR[])));
  }, [sb, centro.id]);

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="progressi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base}>{corpo}</SchermoCentro>
  );
  if (!d || !val) return schermo(o.errore || err ? <Errore messaggio={o.errore ?? err} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const mie = val.filter((v) => v.voto != null && norm(v.colpo).includes(chiaveColpo[comp]));
  // livello di un allievo: media dei voti (1-5) all'ultima data di test, in %; confronto con il test più vecchio
  const livello = (id: string) => {
    const x = mie.filter((v) => v.allievo_id === id);
    const date = [...new Set(x.map((v) => v.data ?? v.test ?? ""))].sort();
    if (!date.length) return null;
    const a = (k: string) => (media(x.filter((v) => (v.data ?? v.test ?? "") === k).map((v) => v.voto as number)) as number) * 20;
    const ora = a(date[date.length - 1]);
    return { ora, delta: date.length > 1 ? ora - a(date[0]) : null };
  };
  const unita = vista === "gruppi"
    ? o.gruppiVis.filter((g) => g.attivo).map((g) => ({ id: g.id, nome: g.nome, sub: sostituisci(t.subGruppo, { m: maestriDi(d, g.id).map((m) => nomeCompleto(m)).join(" · ") || t.nessunMaestro, n: allieviDelGruppo(o.iscrAttive, g.id).length }), allievi: allieviDelGruppo(o.iscrAttive, g.id) }))
    : d.membri.filter((m) => m.ruolo === "maestro").map((m) => {
        const gs = d.gm.filter((x) => x.membro_id === m.id).map((x) => x.gruppo_id).filter((id) => o.gruppiVis.some((g) => g.id === id));
        const al = [...new Set(gs.flatMap((g) => allieviDelGruppo(o.iscrAttive, g)))];
        return { id: m.id, nome: nomeCompleto(m), sub: sostituisci(t.subMaestro, { g: gs.map((id) => d.gruppi.find((g) => g.id === id)?.nome).join(" · "), n: al.length }), allievi: al };
      }).filter((u) => u.allievi.length > 0);
  const righe = unita.map((u) => {
    const l = u.allievi.map(livello).filter((x): x is NonNullable<ReturnType<typeof livello>> => !!x);
    return { ...u, v: media(l.map((x) => x.ora)), d: media(l.filter((x) => x.delta !== null).map((x) => x.delta as number)) };
  });
  const con = righe.filter((x) => x.v !== null);
  const mediaTot = media(con.map((x) => x.v as number));
  const dTot = media(con.filter((x) => x.d !== null).map((x) => x.d as number));
  const mx = Math.max(...con.map((x) => x.v as number)), mn = Math.min(...con.map((x) => x.v as number));
  const top = con.find((x) => x.v === mx), basso = con.find((x) => x.v === mn);
  const fmtD = (n: number | null) => (n === null ? t.nessuno : `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}`);
  const suKey = `su${comp.charAt(0).toUpperCase()}${comp.slice(1)}` as keyof typeof IT;
  const primo = o.gruppiVis.map((g) => settimanaProgramma(d.programmi.find((p) => p.id === g.programma_id))).find(Boolean);
  const mese = new Date().toLocaleDateString("it-IT", { month: "long" });

  return schermo(
    <div className="og-pagina">
      <Seg ariaLabel={t.viste} valore={vista} onChange={setVista} valori={[{ id: "gruppi", etichetta: t.perGruppo }, { id: "maestri", etichetta: t.perMaestro }]} />
      <Chips>{COMP.map((c) => <Chip key={c} on={c === comp} onClick={() => setComp(c)}>{t[`c_${c}` as keyof typeof IT]}</Chip>)}</Chips>
      <div className="g3" style={{ gap: 8 }}>
        <Tile valore={mediaTot === null ? "—" : `${Math.round(mediaTot)}%`} etichetta={t.media} />
        <Tile valore={<span style={{ fontSize: 20 }}>{top?.nome ?? "—"}</span>} etichetta={t.top} />
        <Tile valore={fmtD(dTot)} etichetta={t.delta} colore="#4CD07D" />
      </div>
      <Sezione titolo={sostituisci(t.titoloLista, { c: t[`c_${comp}` as keyof typeof IT], v: vista === "gruppi" ? t.gruppi : t.maestri })} azione={<span className="muted">{t.livello}</span>} />
      {con.length === 0 ? <Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="chart" /> : (
        <div className="og-dash c2" style={{ gap: 7 }}>
          {righe.map((x) => {
            const colore = x.v === mx ? "#D8F34A" : x.v === mn ? "#FF9F43" : "#3D8BFF";
            return (
              <div key={x.id} className="card og-card" style={{ padding: "10px 12px" }}>
                <div className="og-riga" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                  <span className="grow"><span className="og-t" style={{ display: "block", fontSize: 14.5 }}>{x.nome}</span><span className="og-s og-ell" style={{ display: "block" }}>{x.sub}</span></span>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#4CD07D" }}>{fmtD(x.d)}</span>
                    <span className="disp" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{x.v === null ? "—" : `${Math.round(x.v)}%`}</span>
                  </span>
                </div>
                <div className="bar"><i style={{ width: `${x.v === null ? 0 : Math.round(x.v)}%`, background: colore }} /></div>
              </div>
            );
          })}
        </div>
      )}
      {basso && con.length > 1 && <Nota>{sostituisci(vista === "gruppi" ? t.noteGruppo : t.noteMaestro, { su: t[suKey], nome: basso.nome, v: Math.round(basso.v as number) })}</Nota>}
    </div>,
    sostituisci(t.sopra, { centro: centro.nome, mese: mese.charAt(0).toUpperCase() + mese.slice(1), sett: primo ? sostituisci(t.sett, { n: primo.n, tot: primo.tot }) : "" }),
  );
}
