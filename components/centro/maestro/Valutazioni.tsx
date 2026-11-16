"use client";
// M8 · Valutazioni periodiche: griglia del test per competenza (voti 1-5) con il confronto sul test precedente.
import { useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Chip, Chips, Ico, Nota, Seg, Tag, Tile, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, isoGiorno } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { COL, leggiPagine, messaggioErrore, useMaestroDati } from "./dati";
import { StatoPagina } from "./piccoli";
import { chiaveTest, COLORI_VOTO, etichettaTest, fmt, nomeBreve, norm, ordineTest, type RValutazione } from "./util";

const IT = {
  sopra: "{gruppo} · Test di {mese}", titolo: "Valutazioni", compilate: "{n} voti / {t}", tocca: "Tocca un voto per cambiarlo (1-5)", confronto: "Confronto: test di {mese}", nessunConfronto: "Nessun test precedente",
  media: "Media gruppo", vsPrima: "Vs test prec.", inCalo: "In calo", suN: "{n} su {t}", coach: "COACH AI", vediScheda: "Vedi scheda", salva: "Salva valutazioni", salvo: "Salvo…", salvato: "Salvato nella scheda",
  aria: "{nome}, {comp}: voto {v} su 5{prec}. Cambia voto", ariaPrec: ", test precedente {p}", ariaVuoto: "{nome}, {comp}: nessun voto. Dai un voto",
  consCalo: "{nome}: {comp} in calo ({p} → {v}).", consProposta: "Proposta: 10' con \"{es}\" dalla libreria del centro.", consPropostaGen: "Proposta: 10' di lavoro mirato su {comp} nella prossima lezione.",
  consBene: "Nessun calo rispetto al test precedente: il gruppo tiene. Scegli un'altra competenza da spingere nel prossimo blocco.", consPrimo: "Primo test registrato per questo colpo: dai i voti e dal prossimo mese vedrai il confronto.",
  vuoto: "Nessun gruppo", vuotoTesto: "Le valutazioni si danno ai gruppi che segui.", nessunAllievo: "Nessun allievo in questo gruppo.", errSalva: "Non riesco a salvare le valutazioni: {e}",
  dritto: "Dritto", rovescio: "Rovescio", servizio: "Servizio", risposta: "Risposta", volee: "Volée", gruppo: "Gruppo", test: "Test",
};
const T = { it: IT, en: { ...IT } };

// Competenze di ripiego se il centro non ne ha scritte nelle linee guida (stesse del mockup)
const DEFAULT: Record<string, string[]> = {
  Dritto: ["Impugnatura", "Apertura", "Impatto", "Chiusura"],
  Rovescio: ["Impugnatura", "Preparazione", "Impatto", "Equilibrio"],
  Servizio: ["Lancio", "Trofeo", "Impatto", "Seconda"],
  Risposta: ["Posizione", "Lettura", "Impatto", "Recupero"],
  Volée: ["Impugnatura", "Preparazione", "Impatto", "Equilibrio"],
};
const COLPI = ["Dritto", "Rovescio", "Servizio", "Risposta", "Volée"] as const;
type Colpo = (typeof COLPI)[number];
const chiaveCella = (a: string, colpo: string, comp: string) => `${a}|${norm(colpo)}|${norm(comp)}`;
const f1 = (x: number) => x.toFixed(1).replace(".", ",");

export function Valutazioni() {
  const t = useT(T);
  const { centro, membroAttivo: ma, sb } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const [gruppoId, setGruppoId] = useState<string | null>(null);
  const [colpo, setColpo] = useState<Colpo>("Dritto");
  const [test, setTest] = useState(() => chiaveTest(new Date()));
  const [righe, setRighe] = useState<RValutazione[] | null>(null);
  const [lineeGuida, setLineeGuida] = useState<Record<string, string[]>>({});
  // voti cambiati e non ancora salvati (anche di altri colpi): chiave cella → cella con il suo voto
  const [mod, setMod] = useState<Record<string, { a: string; colpo: string; comp: string; v: number }>>({});
  const [salvato, setSalvato] = useState(false);
  const [lavoro, setLavoro] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const gruppo = dati?.gruppi.find((g) => g.id === (gruppoId ?? dati.gruppi[0]?.id)) ?? null;
  const allievi = useMemo(() => (gruppo && dati ? dati.iscritti.get(gruppo.id) ?? [] : []), [gruppo, dati]);
  const ids = useMemo(() => allievi.map((a) => a.id), [allievi]);

  // voti degli allievi del gruppo (ultimo anno, a pagine) e competenze scritte dal centro per la fascia
  useEffect(() => {
    if (!gruppo || !ids.length) { setRighe([]); return; }
    let vivo = true;
    setRighe(null); setMod({}); setSalvato(false);
    (async () => {
      try {
        const da = isoGiorno(aggiungiGiorni(new Date(), -400));
        const [v, lg] = await Promise.all([
          leggiPagine<RValutazione>((a, b) => sb.from("valutazioni").select(COL.valutazioni).in("allievo_id", ids).gte("data", da).range(a, b)),
          gruppo.fascia ? sb.from("linee_guida").select("colpo,competenze").eq("centro_id", centro.id).eq("fascia", gruppo.fascia) : Promise.resolve({ data: [], error: null }),
        ]);
        if (!vivo) return;
        const c: Record<string, string[]> = {};
        for (const l of ((lg.data ?? []) as { colpo: string; competenze: unknown }[])) {
          const lista = Array.isArray(l.competenze) ? l.competenze.map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? String((x as { testo?: unknown; nome?: unknown; titolo?: unknown }).testo ?? (x as { nome?: unknown }).nome ?? (x as { titolo?: unknown }).titolo ?? "") : "")).filter(Boolean) : [];
          if (lista.length) c[norm(l.colpo)] = lista.slice(0, 4);
        }
        setLineeGuida(c); setRighe(v); setErr(null);
      } catch (e) {
        if (vivo) setErr(messaggioErrore(e));
      }
    })();
    return () => { vivo = false; };
  }, [gruppo, ids, sb, centro.id]);

  const tests = useMemo(() => {
    const s = new Set((righe ?? []).map((x) => x.test));
    s.add(chiaveTest(new Date()));
    return [...s].sort((a, b) => ordineTest(a) - ordineTest(b));
  }, [righe]);
  const prec = [...tests].filter((x) => ordineTest(x) < ordineTest(test) && (righe ?? []).some((v) => v.test === x)).pop() ?? null;
  const comps = lineeGuida[norm(colpo)] ?? DEFAULT[colpo];

  const attuali = useMemo(() => { const m = new Map<string, RValutazione>(); for (const v of righe ?? []) if (v.test === test) m.set(chiaveCella(v.allievo_id, v.colpo, v.competenza), v); return m; }, [righe, test]);
  const precedenti = useMemo(() => { const m = new Map<string, number>(); for (const v of righe ?? []) if (v.test === prec) m.set(chiaveCella(v.allievo_id, v.colpo, v.competenza), v.voto); return m; }, [righe, prec]);
  const voto = (a: string, comp: string): number | null => mod[chiaveCella(a, colpo, comp)]?.v ?? attuali.get(chiaveCella(a, colpo, comp))?.voto ?? null;
  const votoPrec = (a: string, comp: string): number | null => precedenti.get(chiaveCella(a, colpo, comp)) ?? null;

  function cambia(a: string, comp: string) {
    const v = voto(a, comp);
    setMod((m) => ({ ...m, [chiaveCella(a, colpo, comp)]: { a, colpo, comp, v: v === null ? 3 : v >= 5 ? 1 : v + 1 } }));
    setSalvato(false);
  }

  const stat = useMemo(() => {
    let somma = 0, n = 0, compilate = 0, sv = 0, sp = 0, nn = 0;
    const calo = new Set<string>();
    let peggio: { a: string; comp: string; p: number; v: number } | null = null;
    for (const a of ids) for (const comp of comps) {
      const v = voto(a, comp);
      if (v === null) continue;
      compilate++; somma += v; n++;
      const p = votoPrec(a, comp);
      // il confronto vale solo sulle celle che hanno il voto in entrambi i test
      if (p === null) continue;
      sv += v; sp += p; nn++;
      if (v < p) { calo.add(a); if (!peggio || p - v > peggio.p - peggio.v) peggio = { a, comp, p, v }; }
    }
    return { media: n ? somma / n : null, delta: nn ? (sv - sp) / nn : null, calo: calo.size, compilate, totale: ids.length * comps.length, peggio };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, comps, mod, attuali, precedenti, colpo]);

  async function salva() {
    if (!ma || !gruppo) return;
    setLavoro(true); setErr(null);
    const oggi = isoGiorno();
    const aggiorna: Record<string, unknown>[] = [];
    const nuove: Record<string, unknown>[] = [];
    for (const [k, c] of Object.entries(mod)) {
      const base = { centro_id: centro.id, allievo_id: c.a, maestro_id: ma.id, test, colpo: c.colpo, competenza: c.comp, voto: c.v, data: oggi };
      const es = attuali.get(k);
      if (es) aggiorna.push({ ...base, id: es.id }); else nuove.push(base);
    }
    // due scritture in tutto, non una per cella
    const [u, n] = await Promise.all([
      aggiorna.length ? sb.from("valutazioni").upsert(aggiorna, { onConflict: "id" }) : Promise.resolve({ error: null }),
      nuove.length ? sb.from("valutazioni").insert(nuove) : Promise.resolve({ error: null }),
    ]);
    setLavoro(false);
    const e = u.error ?? n.error;
    if (e) { setErr(fmt(t.errSalva, { e: e.message })); return; }
    setMod({}); setSalvato(true);
    // rilegge i voti per avere gli id delle righe nuove
    const da = isoGiorno(aggiungiGiorni(new Date(), -400));
    try { setRighe(await leggiPagine<RValutazione>((a, b) => sb.from("valutazioni").select(COL.valutazioni).in("allievo_id", ids).gte("data", da).range(a, b))); } catch { /* i voti sono salvati: la lista si aggiorna alla prossima apertura */ }
  }

  const stato = StatoPagina({ caricamento: caricamento || (!righe && !err && !!allievi.length), errore: errore ?? err, onRiprova: ricarica });
  const mese = etichettaTest(test).split(" ")[0].toLowerCase();
  const cons = (() => {
    if (!prec) return t.consPrimo;
    if (!stat.peggio) return t.consBene;
    const a = allievi.find((x) => x.id === stat.peggio!.a);
    const es = dati ? [...dati.esercizi.values()].find((e) => norm(e.colpo ?? "").startsWith(norm(colpo).slice(0, 4)) && (!gruppo?.fascia || !e.fasce?.length || e.fasce.includes(gruppo.fascia))) : null;
    return `${fmt(t.consCalo, { nome: a ? nomeBreve(a) : "", comp: stat.peggio.comp.toLowerCase(), p: stat.peggio.p, v: stat.peggio.v })} ${es ? fmt(t.consProposta, { es: es.titolo }) : fmt(t.consPropostaGen, { comp: stat.peggio.comp.toLowerCase() })}`;
  })();
  const linkScheda = r.allievo((stat.peggio?.a ?? allievi[0]?.id) ?? "");

  return (
    <SchermoCentro ruolo="maestro" tab="allievi" indietro={r.allievi} sopra={fmt(t.sopra, { gruppo: gruppo?.nome ?? "", mese })} titolo={t.titolo}
      azioni={gruppo && allievi.length ? <Tag colore="var(--brand)" sfondo="#0B0B0C">{fmt(t.compilate, { n: stat.compilate, t: stat.totale })}</Tag> : undefined}>
      {stato ?? (!dati?.gruppi.length ? <Vuoto titolo={t.vuoto} testo={t.vuotoTesto} icona="target" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {dati.gruppi.length > 1 && <Chips>{dati.gruppi.map((g) => <Chip key={g.id} on={g.id === gruppo?.id} onClick={() => setGruppoId(g.id)}>{g.nome}</Chip>)}</Chips>}
          {tests.length > 1 && <Chips>{tests.map((k) => <Chip key={k} on={k === test} onClick={() => { setTest(k); setSalvato(false); }}>{etichettaTest(k)}</Chip>)}</Chips>}
          <Seg<Colpo> valore={colpo} onChange={setColpo} valori={COLPI.map((c) => ({ id: c, etichetta: c }))} ariaLabel={t.test} />
          {allievi.length === 0 ? <div className="s muted">{t.nessunAllievo}</div> : (
            <>
              <div className="tbl">
                <div className="tr th" style={{ gridTemplateColumns: "76px repeat(4,minmax(0,1fr))", gap: 4 }}>
                  <span>ALLIEVO</span>
                  {comps.map((c) => <span key={c} title={c} style={{ textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 10 }}>{c}</span>)}
                </div>
                {allievi.map((a) => (
                  <div key={a.id} className="tr" style={{ gridTemplateColumns: "76px repeat(4,minmax(0,1fr))", gap: 4, padding: "5px 12px" }}>
                    <span style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nomeBreve(a)}</span>
                    {comps.map((c) => {
                      const v = voto(a.id, c);
                      const p = votoPrec(a.id, c);
                      const d = v !== null && p !== null ? v - p : null;
                      return (
                        <button key={c} type="button" onClick={() => cambia(a.id, c)}
                          aria-label={v === null ? fmt(t.ariaVuoto, { nome: nomeBreve(a), comp: c }) : fmt(t.aria, { nome: nomeBreve(a), comp: c, v, prec: p !== null ? fmt(t.ariaPrec, { p }) : "" })}
                          style={{ border: 0, background: "#0E0E10", borderRadius: 10, padding: "5px 0 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer", minHeight: 44, color: v === null ? "var(--mc-dim)" : COLORI_VOTO[v] }}>
                          <b className="disp" style={{ fontSize: 22, lineHeight: 1 }}>{v ?? "–"}</b>
                          <i style={{ fontStyle: "normal", fontSize: 10, fontWeight: 800, color: d === null ? "transparent" : d > 0 ? "#4CD07D" : d < 0 ? "#FF5A5F" : "#6E6E73" }}>{d === null ? "·" : d === 0 ? "=" : d > 0 ? `+${d}` : `−${Math.abs(d)}`}</i>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mc-muted)", display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
                <span>{t.tocca}</span><span>{prec ? fmt(t.confronto, { mese: etichettaTest(prec).split(" ")[0].toLowerCase() }) : t.nessunConfronto}</span>
              </div>
              <div className="g3">
                <Tile valore={stat.media === null ? "–" : f1(stat.media)} etichetta={t.media} />
                <Tile valore={stat.delta === null ? "–" : `${stat.delta >= 0 ? "+" : "−"}${f1(Math.abs(stat.delta))}`} colore={stat.delta === null ? undefined : stat.delta >= 0 ? "#4CD07D" : "#FF5A5F"} etichetta={t.vsPrima} />
                <Tile valore={fmt(t.suN, { n: stat.calo, t: allievi.length })} etichetta={t.inCalo} />
              </div>
              <div className="card" style={{ padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start", borderColor: "color-mix(in srgb, var(--brand) 25%, transparent)" }}>
                <span className="ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Ico nome="spark" size={16} /></span>
                <span className="grow"><span className="k" style={{ display: "block" }}>{t.coach}</span><span style={{ display: "block", fontSize: 12.5, lineHeight: 1.4, marginTop: 2, color: "#D6D6DA" }}>{cons}</span></span>
              </div>
              {err && <Nota icona="shield">{err}</Nota>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8 }}>
                <Btn variante="secondario" href={linkScheda}>{t.vediScheda}</Btn>
                <Btn onClick={salva} disabled={lavoro || (Object.keys(mod).length === 0 && !salvato)}>{lavoro ? t.salvo : salvato ? t.salvato : t.salva}</Btn>
              </div>
            </>
          )}
        </div>
      ))}
    </SchermoCentro>
  );
}
