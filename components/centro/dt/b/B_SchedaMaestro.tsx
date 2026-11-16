"use client";
// C3 · Scheda maestro (/c/[slug]/dt/maestri/[id]). Aderenza, storico delle ultime 12 lezioni, scostamenti con il motivo,
// valutazioni date, osservazioni del direttore tecnico e piano di formazione.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { fmtData, fmtGiornoMese, fmtOra, leggiData } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "../../Schermo";
import { Ic } from "./Ic";
import { useDatiMaestri, type MaestroStat } from "./dati";
import {
  COL, coloreAderenza, coloreAvatar, corsoCompletato, fmtOre, iniziali, mediaVoti, motivoScostamento, nomeCompleto,
  percentualeCorso, rimpiazza, virgola, type Riga,
} from "./util";
import "./b.css";

const it = {
  kick: "Scheda maestro", indietro: "Indietro", osserva: "Osserva una sua lezione", aderenzaK: "ADERENZA AL METODO",
  comeDaPiano: "{a} lezioni su {b} come da piano", nessunaLezione: "Nessuna lezione chiusa da valutare",
  lezioniReg: "lezioni registrate", allievi: "allievi", rispostaChat: "risposta in chat",
  storico: "STORICO · ULTIME 12 LEZIONI", legDaPiano: "Come da piano", legSostituito: "Sostituito", legFuori: "Fuori piano",
  schede: "Schede", sProgramma: "Programma", sValutazioni: "Valutaz.", sOsservazioni: "Osserv.", sFormazione: "Formazione",
  tagFuori: "Fuori piano", tagConsentito: "Consentito", tagPiano: "Da piano",
  fuoriTesto: "Blocco Bloccato non svolto come da Metodo: {blocchi}.", motivo: "Motivo: {m}",
  sostituitoTesto: "{blocchi}: sostituito (Flessibile, stesso obiettivo).", pianoTesto: "Lezione completa come da piano.",
  nessunaLezioniRiga: "Nessuna lezione chiusa registrata.",
  testRiga: "Test {t} · {a} su {b}", testSub: "{colpo}: media {m} su 5{d}", testSubNd: "Nessun voto registrato nel test.",
  rispettoA: ", {d} rispetto a {p}", completo: "Completo", mancano: "Mancano {n}",
  dopoLezione: "Valutazioni dopo lezione", dopoLezioneSub: "{a} su {b} lezioni chiuse con valutazione rapida per ogni presente.", zeroMancanti: "0 mancanti", nMancanti: "{n} mancanti",
  daSeguire: "Da seguire", piuAvanti: "Più avanti", allievoSub: "Media {m} su 5 nel test {t}.",
  nessunTest: "Nessuna valutazione periodica registrata per gli allievi di questo maestro.",
  prossimaOss: "Prossima lezione da osservare", prossimaOssSub: "{d} · {o} · {g}", apri: "Apri",
  nessunaOss: "Nessuna osservazione registrata. Visibili solo a te e al maestro.", ossSub: "Tempi {a}/5, correzione {b}/5, gruppo {c}/5, sicurezza {d}/5.",
  fatto: "Fatto", daFare: "Da fare", completatoIl: "Completato il {d}.", scadeIl: "Scade il {d}.", moduliSub: "Modulo {a} di {b}.", nessunCorso: "Nessun corso del Metodo creato.",
  oblig: "Obbligatorio.", caricamento: "Carico la scheda…", nonTrovato: "Maestro non trovato in questo centro.", errore: "Non riesco a caricare la scheda", riprova: "Riprova",
  campo: "Campo {n}",
};
const T = { it, en: { ...it } };

type Tab = "programma" | "valutazioni" | "osservazioni" | "formazione";
type RigaUI = { c: string; t: string; s: string; r: string; href?: string };

const tagStile = (c: string) => ({ fontSize: 11, fontWeight: 800, padding: "3px 7px", borderRadius: 7, whiteSpace: "nowrap" as const, flex: "none" as const, background: c + "2B", color: c });
const abbrevia = (a: Riga) => `${a.nome ?? ""} ${a.cognome ? a.cognome[0] + "." : ""}`.trim();
const chiaveTest = (k: string) => k.replace("-", " ");

export default function BSchedaMaestro() {
  const t = useT(T);
  const { id } = useParams<{ id: string }>();
  const { centro, sb } = useCentro();
  const R = rotta(centro.slug);
  const { dati, carica, errore, ricarica } = useDatiMaestri();
  const [tab, setTab] = useState<Tab>("programma");
  const [allievi, setAllievi] = useState<Riga[]>([]);
  const [presenze, setPresenze] = useState<Riga[]>([]);
  const [osserv, setOsserv] = useState<Riga[]>([]);

  const m: MaestroStat | undefined = dati?.maestri.find((x) => x.m.id === id);

  // Dettagli che servono solo a questa scheda: nomi degli allievi, voti rapidi delle ultime lezioni, osservazioni ricevute
  useEffect(() => {
    if (!m) return;
    let vivo = true;
    (async () => {
      const idsL = m.ultime.map((u) => u.l.id);
      const [a, p, o] = await Promise.all([
        m.allieviIds.length ? sb.from("allievi").select("id,nome,cognome").eq("centro_id", centro.id).in("id", m.allieviIds) : Promise.resolve({ data: [] as Riga[] }),
        idsL.length ? sb.from("presenze").select("lezione_id,presente,voto_rapido").eq("centro_id", centro.id).in("lezione_id", idsL) : Promise.resolve({ data: [] as Riga[] }),
        sb.from("osservazioni").select("id,osservatore_id,lezione_id,voti,voto,consigli,nota,created_at").eq("centro_id", centro.id).eq("maestro_id", id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!vivo) return;
      setAllievi((a.data as Riga[]) ?? []);
      setPresenze((p.data as Riga[]) ?? []);
      setOsserv((o.data as Riga[]) ?? []);
    })();
    return () => { vivo = false; };
  }, [m, sb, centro.id, id]);

  const prossima = useMemo(() => {
    if (!dati) return undefined;
    return dati.lezioni
      .filter((l) => l.maestro_id === id && l.stato !== "chiusa" && l.data >= dati.oggi)
      .sort((a, b) => (a.data + fmtOra(a.ora)).localeCompare(b.data + fmtOra(b.ora)))[0];
  }, [dati, id]);

  const righe: RigaUI[] = useMemo(() => {
    if (!dati || !m) return [];
    const nomeGruppo = (gid: string) => dati.gruppi.find((g) => g.id === gid)?.nome ?? "";
    if (tab === "programma") {
      const r = [...m.ultime].reverse().slice(0, 8).map<RigaUI>((u) => {
        const motivo = motivoScostamento(u.l.motivi_scostamento);
        const blocchi = u.cambi.map((c) => c.titolo).join(", ");
        const base = { t: `${fmtData(u.l.data)} · ${nomeGruppo(u.l.gruppo_id)}` };
        if (u.esito === "fuori") return { ...base, c: COL.giallo, s: [rimpiazza(t.fuoriTesto, { blocchi }), motivo ? rimpiazza(t.motivo, { m: motivo }) : ""].filter(Boolean).join(" "), r: t.tagFuori };
        if (u.esito === "sostituito") return { ...base, c: COL.blu, s: [rimpiazza(t.sostituitoTesto, { blocchi }), motivo].filter(Boolean).join(" "), r: t.tagConsentito };
        return { ...base, c: COL.verde, s: t.pianoTesto, r: t.tagPiano };
      });
      return r.length ? r : [{ c: COL.muto, t: t.nessunaLezioniRiga, s: "", r: "" }];
    }
    if (tab === "valutazioni") {
      const mie = new Set(m.allieviIds);
      const val = dati.valutazioni.filter((v) => mie.has(v.allievo_id) && v.voto != null);
      const media = (rows: Riga[]) => (rows.length ? rows.reduce((s, v) => s + Number(v.voto), 0) / rows.length : null);
      const corr = val.filter((v) => v.test === dati.testCorrente);
      const prec = val.filter((v) => v.test === dati.testPrecedente);
      const out: RigaUI[] = [];
      if (!dati.testCorrente || !corr.length) {
        out.push({ c: COL.muto, t: t.nessunTest, s: "", r: "" });
      } else {
        const rated = new Set(corr.map((v) => v.allievo_id)).size;
        // colpo più valutato nel test: è quello su cui il maestro sta lavorando
        const perColpo = new Map<string, Riga[]>();
        for (const v of corr) perColpo.set(v.colpo ?? "", [...(perColpo.get(v.colpo ?? "") ?? []), v]);
        const [colpo, righeColpo] = [...perColpo.entries()].sort((a, b) => b[1].length - a[1].length)[0];
        const mc = media(righeColpo)!;
        const mp = media(prec.filter((v) => (v.colpo ?? "") === colpo));
        const delta = mp == null ? "" : rimpiazza(t.rispettoA, { d: `${mc - mp >= 0 ? "+" : ""}${virgola(mc - mp)}`, p: chiaveTest(dati.testPrecedente ?? "") });
        out.push({
          c: rated >= m.allieviIds.length ? COL.verde : COL.giallo,
          t: rimpiazza(t.testRiga, { t: chiaveTest(dati.testCorrente), a: rated, b: m.allieviIds.length }),
          s: rimpiazza(t.testSub, { colpo: colpo ? colpo[0].toUpperCase() + colpo.slice(1) : "—", m: virgola(mc), d: delta }),
          r: m.mancanti ? rimpiazza(t.mancano, { n: m.mancanti }) : t.completo,
        });
      }
      const idsPres = new Map<string, Riga[]>();
      for (const p of presenze) idsPres.set(p.lezione_id, [...(idsPres.get(p.lezione_id) ?? []), p]);
      const complete = m.ultime.filter((u) => { const pp = (idsPres.get(u.l.id) ?? []).filter((p) => p.presente); return pp.length > 0 && pp.every((p) => p.voto_rapido != null); }).length;
      out.push({ c: complete === m.ultime.length ? COL.verde : COL.giallo, t: t.dopoLezione, s: rimpiazza(t.dopoLezioneSub, { a: complete, b: m.ultime.length }), r: complete === m.ultime.length ? t.zeroMancanti : rimpiazza(t.nMancanti, { n: m.ultime.length - complete }) });
      // l'allievo più indietro e quello più avanti nel test corrente
      const perAllievo = new Map<string, number>();
      for (const id2 of new Set(corr.map((v) => v.allievo_id))) perAllievo.set(id2, media(corr.filter((v) => v.allievo_id === id2))!);
      const ord = [...perAllievo.entries()].sort((a, b) => a[1] - b[1]);
      const nome = (aid: string) => abbrevia(allievi.find((a) => a.id === aid) ?? {});
      if (ord.length > 1) {
        out.push({ c: COL.giallo, t: nome(ord[0][0]), s: rimpiazza(t.allievoSub, { m: virgola(ord[0][1]), t: chiaveTest(dati.testCorrente ?? "") }), r: t.daSeguire });
        const ult = ord[ord.length - 1];
        out.push({ c: COL.verde, t: nome(ult[0]), s: rimpiazza(t.allievoSub, { m: virgola(ult[1]), t: chiaveTest(dati.testCorrente ?? "") }), r: t.piuAvanti });
      }
      return out;
    }
    if (tab === "osservazioni") {
      const out: RigaUI[] = [];
      if (prossima) {
        out.push({ c: COL.blu, t: t.prossimaOss, s: rimpiazza(t.prossimaOssSub, { d: fmtData(prossima.data), o: fmtOra(prossima.ora), g: nomeGruppo(prossima.gruppo_id) }), r: t.apri, href: R.dt.osservazione(prossima.id) });
      }
      for (const o of osserv) {
        const media = mediaVoti(o.voti);
        const oss = dati.membri.find((x) => x.id === o.osservatore_id);
        const voti = o.voti ?? {};
        out.push({
          c: COL.verde,
          t: `${fmtData(o.created_at)} · ${nomeCompleto(oss)}`,
          s: (Array.isArray(o.consigli) && o.consigli.length ? o.consigli.join(" · ") : o.nota) || rimpiazza(t.ossSub, { a: voti.tempi ?? "–", b: voti.correzione ?? "–", c: voti.gruppo ?? "–", d: voti.sicurezza ?? "–" }),
          r: media != null ? virgola(media * 2) : String(o.voto ?? ""),
        });
      }
      return out.length ? out : [{ c: COL.muto, t: t.nessunaOss, s: "", r: "" }];
    }
    // formazione
    if (!dati.corsi.length) return [{ c: COL.muto, t: t.nessunCorso, s: "", r: "" }];
    return dati.corsi.map<RigaUI>((c) => {
      const f = dati.formazione.find((x) => x.corso_id === c.id && x.membro_id === id);
      const fatto = corsoCompletato(c, f);
      const p = percentualeCorso(c, f);
      const sub = fatto ? (f?.certificato_il ? rimpiazza(t.completatoIl, { d: fmtGiornoMese(f.certificato_il) }) : "") : [c.obbligatorio ? t.oblig : "", f?.scadenza ? rimpiazza(t.scadeIl, { d: fmtGiornoMese(f.scadenza) }) : "", c.moduli ? rimpiazza(t.moduliSub, { a: f?.moduli_fatti ?? 0, b: c.moduli }) : ""].filter(Boolean).join(" ");
      return { c: fatto ? COL.verde : p > 0 ? COL.blu : c.obbligatorio ? COL.arancio : COL.muto, t: c.titolo, s: sub, r: fatto ? t.fatto : p > 0 ? `${p}%` : t.daFare };
    });
  }, [dati, m, tab, t, allievi, presenze, osserv, prossima, id, R]);

  const mesi = useMemo(() => {
    if (!m || !m.ultime.length) return "";
    const nomi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    const a = nomi[leggiData(m.ultime[0].l.data).getMonth()], b = nomi[leggiData(m.ultime[m.ultime.length - 1].l.data).getMonth()];
    return a === b ? a : `${a} · ${b}`;
  }, [m]);

  const colEsito = { piano: COL.verde, sostituito: COL.blu, fuori: COL.giallo } as const;
  const colA = coloreAderenza(m?.aderenza ?? null);
  const nOk = m ? m.ultime.filter((u) => u.esito !== "fuori").length : 0;

  return (
    <SchermoCentro
      ruolo="dt"
      tab="maestri"
      titolo={m ? nomeCompleto(m.m) : "…"}
      sopra={`${t.kick}${m?.gruppi[0] ? " · " + m.gruppi[0].nome : ""}`}
      indietro={R.dt.maestri}
      azioni={m ? <Link href={R.dt.osservazione(prossima?.id ?? m.m.id)} className="icon" aria-label={t.osserva}><Ic n="eye" s={18} /></Link> : undefined}
    >
      {carica && !dati ? <div className="note" role="status">{t.caricamento}</div> : null}
      {errore ? <div className="note" role="alert">{t.errore}: {errore} <button className="chip" onClick={ricarica}>{t.riprova}</button></div> : null}
      {dati && !m ? <div className="note">{t.nonTrovato}</div> : null}
      {m ? (
        <div className="b-scheda">
          <div className="b-col">
            <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: coloreAvatar(m.m.id), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" }}>{iniziali(m.m)}</span>
              <div className="grow">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="k">{t.aderenzaK}</span>
                  <span className="disp" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: colA }}>{m.aderenza == null ? "—" : `${m.aderenza}%`}</span>
                </div>
                <div className="bar" style={{ height: 8, margin: "4px 0 5px" }}><i style={{ width: `${m.aderenza ?? 0}%`, background: colA }} /></div>
                <div className="kick" style={{ fontSize: 11.5 }}>
                  {m.ultime.length ? rimpiazza(t.comeDaPiano, { a: nOk, b: m.ultime.length }) : t.nessunaLezione}{dati?.programmaLabel ? ` · ${dati.programmaLabel.split(" · ").slice(0, 2).join(" · ")}` : ""}
                </div>
              </div>
            </div>

            <div className="g3">
              <div className="tile" style={{ padding: "8px 12px" }}><b>{m.lezioniChiuse}</b><span>{t.lezioniReg}</span></div>
              <div className="tile" style={{ padding: "8px 12px" }}><b>{m.allieviIds.length}</b><span>{t.allievi}</span></div>
              <div className="tile" style={{ padding: "8px 12px" }}><b style={{ color: m.rispostaOre != null && m.rispostaOre > 24 ? COL.arancio : COL.verde }}>{fmtOre(m.rispostaOre)}</b><span>{t.rispostaChat}</span></div>
            </div>

            <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="k">{t.storico}</span><span className="kick" style={{ fontSize: 11 }}>{mesi}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 4 }}>
                {m.ultime.map((u, i) => (
                  <span key={u.l.id} title={`${fmtData(u.l.data)}`} style={{ height: 26, borderRadius: 7, background: colEsito[u.esito] + (i === m.ultime.length - 1 ? "" : "CC"), color: "#0B0B0C", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {leggiData(u.l.data).getDate()}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, fontWeight: 700, color: COL.muto, flexWrap: "wrap" }}>
                {([[COL.verde, t.legDaPiano], [COL.blu, t.legSostituito], [COL.giallo, t.legFuori]] as const).map(([c, l]) => (
                  <span key={l} style={{ display: "flex", gap: 5, alignItems: "center" }}><span className="dot" style={{ background: c, width: 8, height: 8 }} />{l}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="b-col">
            <div className="seg" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }} role="group" aria-label={t.schede}>
              {([["programma", t.sProgramma], ["valutazioni", t.sValutazioni], ["osservazioni", t.sOsservazioni], ["formazione", t.sFormazione]] as const).map(([k, l]) => (
                <button key={k} className={k === tab ? "sg on" : "sg"} aria-pressed={k === tab} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            {righe.map((r, i) => {
              const corpo = (
                <>
                  <span className="dot" style={{ background: r.c, marginTop: 5 }} />
                  <span className="grow">
                    <span className="t" style={{ display: "block", fontSize: 14 }}>{r.t}</span>
                    {r.s ? <span className="s" style={{ display: "block", marginTop: 1, lineHeight: 1.3 }}>{r.s}</span> : null}
                  </span>
                  {r.r ? <span style={tagStile(r.c)}>{r.r}</span> : null}
                </>
              );
              const stile = { alignItems: "flex-start", padding: "9px 12px", gap: 10 } as const;
              return r.href ? <Link key={i} href={r.href} className="li" style={stile}>{corpo}</Link> : <div key={i} className="li" style={stile}>{corpo}</div>;
            })}
          </div>
        </div>
      ) : null}
    </SchermoCentro>
  );
}
