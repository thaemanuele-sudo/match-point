"use client";
// C11 · Progressi per fascia: confronto tra gruppi o tra maestri sulla stessa competenza, dalle valutazioni dei test.
import { useEffect, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Caricamento, Chip, Chips, Errore, Nota, Sezione, Seg, Tile, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { COLPI_DB, maestriDi, nomeCompleto, settimanaProgramma, sostituisci, useOrg } from "./dati";
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
const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Riga di `progressi_per_unita` (docs/RPC.md): livello 0-100 dell'ultimo test e punti rispetto al test precedente. */
type RigaUnita = { unita_id: string; nome: string; n_allievi: number; livello: number | null; delta: number | null };

export default function CentroProgressi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, sb, dati: d } = o;
  const r = rotta(centro.slug);
  // il confronto lo calcola il database (`progressi_per_unita`); si tiene per vista e competenza per non rileggerlo tornando indietro
  const [cache, setCache] = useState<Record<string, RigaUnita[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [vista, setVista] = useState<"gruppi" | "maestri">("gruppi");
  const [comp, setComp] = useState<Comp>("dritto");

  const chiave = `${vista}|${comp}|${o.ids?.join(",") ?? "*"}`;
  const val = cache[chiave] ?? null;
  useEffect(() => {
    if (cache[chiave]) return;
    let vivo = true;
    void sb.rpc("progressi_per_unita", { p_centro: centro.id, p_colpo: COLPI_DB[comp], p_vista: vista, p_aree: o.ids }).then((x: { data: unknown; error: { message: string } | null }) => {
      if (!vivo) return;
      if (x.error) setErr(x.error.message);
      else setCache((c) => ({ ...c, [chiave]: ((x.data ?? []) as RigaUnita[]).map((u) => ({ ...u, livello: u.livello === null ? null : Number(u.livello), delta: u.delta === null ? null : Number(u.delta) })) }));
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, centro.id, chiave, cache]);

  const schermo = (corpo: React.ReactNode, sopra?: string) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="progressi" titolo={t.titolo} sopra={sopra ?? centro.nome} indietro={o.eResp ? r.area.base : r.dt.base}>{corpo}</SchermoCentro>
  );
  if (!d || !val) return schermo(o.errore || err ? <Errore messaggio={o.errore ?? err} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const unita = (u: RigaUnita) => ({
    id: u.unita_id, nome: u.nome,
    sub: vista === "gruppi"
      ? sostituisci(t.subGruppo, { m: maestriDi(d, u.unita_id).map((m) => nomeCompleto(m)).join(" · ") || t.nessunMaestro, n: u.n_allievi })
      : sostituisci(t.subMaestro, { g: d.gm.filter((x) => x.membro_id === u.unita_id).map((x) => d.gruppi.find((g) => g.id === x.gruppo_id)).filter((g) => g && (!o.ids || o.gruppiVis.some((v) => v.id === g.id))).map((g) => g!.nome).join(" · "), n: u.n_allievi }),
  });
  const righe = val.map((u) => ({ ...unita(u), v: u.livello, d: u.delta }));
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
