"use client";
// A1 Il mio percorso (linguaggio per bambini): tema del mese dal programma del gruppo, livelli da sbloccare
// (dalle valutazioni del maestro) e badge calcolati dalle presenze e dai compiti.
import { useEffect, useMemo, useState } from "react";
import "./famiglia.css";
import { SchermoCentro } from "@/components/centro/Schermo";
import type { IconaNome } from "@/components/centro/icone";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { aggiungiGiorni, giornoSettimana, isoGiorno, leggiData } from "@/lib/centro/date";
import { COL_LEZIONE, useFigli, valutazioniAllievo, type RLezione } from "./dati";
import { useCompiti } from "./compiti";
import { chiaveMese, fmt, intervalloSettimana, nomeColpo, temaDelMese, type RValutazione } from "./util";
import { Caricamento, ErroreBox, Icona, SelettoreFigli } from "./piccoli";

const IT = {
  ciao: "Ciao {nome}!",
  titolo: "Il mio percorso",
  serie: "{n} lezioni di fila",
  serieUna: "1 lezione di fila",
  questoMese: "QUESTO MESE",
  temaGenerico: "{tema}!",
  tema_dritto: "Il dritto!", tema_rovescio: "Il rovescio!", tema_servizio: "Il servizio!", tema_risposta: "La risposta!",
  tema_volée: "La volée!", tema_volee: "La volée!", tema_smash: "Lo smash!", tema_palleggio: "Il palleggio!", tema_tattica: "La tattica!",
  tema_atletica: "L'atletica!", tema_gioco_di_gambe: "Il gioco di gambe!",
  nessunTema: "Il tema del mese arriva presto!",
  nessunTemaSub: "Il tuo maestro sta preparando il programma.",
  settimana: "Settimana {sett} di {tot}.",
  restano0: "Ultima settimana: dai il massimo!",
  restano1: "Ancora una settimana e hai finito!",
  restanoN: "Ancora {n} settimane e hai finito!",
  scegli: "Scegli cosa vedere",
  vLivelli: "Livelli", vBadge: "Badge",
  livello: "Livello {n} · {nome}",
  l1: "Primi colpi", l2: "Ci prendo gusto", l3: "Sono bravo", l4: "Quasi esperto", l5: "Campione",
  subFatto: "Fatto in tutte le prove, bravo!",
  subCorso: "Ancora {n} da superare: {elenco}",
  subCorsoSenza: "Aspetta la prossima valutazione del maestro",
  subChiuso: "Si sblocca dopo il livello {n}",
  tagFatto: "Fatto", tagBloccato: "Bloccato", tagCorso: "{a} su {b}", tagInizio: "Si parte!",
  nessunLivello: "I livelli si sbloccano dopo la prima valutazione del maestro.",
  badgeFila: "5 lezioni di fila", badgeDieci: "10 lezioni in campo", badgeCompiti: "Super compiti",
  badgeMese: "Mese perfetto", badgeSquadra: "Squadra forte", badgeCampione: "Campione di mese",
  nessunProfilo: "Il tuo profilo non è ancora collegato a un allievo.",
  nessunProfiloSub: "Chiedi al centro di collegarlo.",
  nessunGruppo: "Non sei ancora in un gruppo. Quando il centro ti iscrive, qui compare il tuo percorso.",
  quasi: "{a}/{b}",
};
export const T = { it: IT, en: { ...IT } };

type Livello = { n: number; stato: "fatto" | "corso" | "chiuso"; nome: string; sub: string; tag: string };
type Comp = { nome: string; voto: number };

/** Voce n della scala di valutazione di linee_guida.scala: array o oggetto "1".."5", stringhe o {nome, descrizione}. */
function voceScala(scala: unknown, n: number): { nome?: string; descrizione?: string } {
  let v: unknown;
  if (Array.isArray(scala)) v = scala[n - 1];
  else if (scala && typeof scala === "object") v = (scala as Record<string, unknown>)[String(n)];
  if (typeof v === "string") return { nome: v };
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const s = (x: unknown) => (typeof x === "string" ? x : undefined);
    return { nome: s(o.nome) ?? s(o.titolo) ?? s(o.label), descrizione: s(o.descrizione) ?? s(o.testo) };
  }
  return {};
}

/** Numero di competenze attese da linee_guida.competenze (array di stringhe o di oggetti). */
function nomiCompetenze(c: unknown): string[] {
  if (!Array.isArray(c)) return [];
  return c.map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? String((x as Record<string, unknown>).nome ?? (x as Record<string, unknown>).titolo ?? "") : "")).filter(Boolean);
}

export default function AllievoPercorso() {
  const t = useT(T);
  const { centro, sb } = useCentro();
  const { figli, figlio, scegli, caricamento, errore, ricarica } = useFigli("allievo");
  const { compiti, fatti } = useCompiti(figlio);
  const [vista, setVista] = useState<"livelli" | "badge">("livelli");
  const [lezioni, setLezioni] = useState<RLezione[] | null>(null);
  const [presenze, setPresenze] = useState<Record<string, boolean>>({});
  const [vals, setVals] = useState<RValutazione[]>([]);
  const [linea, setLinea] = useState<{ scala: unknown; competenze: unknown } | null>(null);
  const [errDati, setErrDati] = useState<string | null>(null);
  // numeri dei badge calcolati dal database (badge_allievo): non si fermano alle ultime 120 lezioni né ai 40 compiti letti qui
  const [conteggi, setConteggi] = useState<{ serie: number; presenti: number; compitiFatti: number } | null>(null);
  const idAll = figlio?.allievo.id;
  const idGr = figlio?.gruppo?.id;
  const fascia = figlio?.gruppo?.fascia;
  const tema = useMemo(() => temaDelMese(figlio?.programma?.mesi), [figlio]);
  const colpoTema = (tema?.colpo || tema?.tema || "").toLowerCase();

  useEffect(() => {
    if (!idAll) return;
    let vivo = true;
    (async () => {
      setErrDati(null);
      const g = idGr ?? "00000000-0000-0000-0000-000000000000";
      // lezioni chiuse dell'ultimo anno (e comunque al massimo 120): il database non scorre tutto lo storico del gruppo
      const dal = isoGiorno(aggiungiGiorni(new Date(), -400));
      // lezioni, valutazioni (cache condivisa con Home e Progressi) e linea guida non dipendono l'una dall'altra: un solo giro
      const [l, v, lgR, bd] = await Promise.all([
        sb.from("lezioni").select(COL_LEZIONE).eq("centro_id", centro.id).eq("gruppo_id", g).eq("stato", "chiusa").gte("data", dal).order("data", { ascending: false }).limit(120),
        valutazioniAllievo(sb, centro.id, idAll).then((data) => ({ data, error: undefined as string | undefined }), (e: Error) => ({ data: [] as RValutazione[], error: e.message })),
        fascia && colpoTema
          ? sb.from("linee_guida").select("scala,competenze").eq("centro_id", centro.id).ilike("fascia", fascia).ilike("colpo", colpoTema).limit(1)
          : Promise.resolve({ data: null, error: null }),
        sb.rpc("badge_allievo", { p_centro: centro.id, p_allievo: idAll }),
      ]);
      const lez = (l.data ?? []) as RLezione[];
      const p = lez.length ? await sb.from("presenze").select("lezione_id,presente").eq("centro_id", centro.id).eq("allievo_id", idAll).in("lezione_id", lez.map((x) => x.id)) : { data: [], error: null };
      const lg = ((lgR.data ?? [])[0] as { scala: unknown; competenze: unknown } | undefined) ?? null;
      if (!vivo) return;
      const e = l.error?.message || v.error || p.error?.message;
      if (e) setErrDati(e);
      const pr: Record<string, boolean> = {};
      for (const x of (p.data ?? []) as { lezione_id: string; presente: boolean }[]) pr[x.lezione_id] = x.presente;
      setLezioni(lez);
      setPresenze(pr);
      setVals(v.data);
      setLinea(lg);
      const b = bd.data as { serie_presenze?: number; lezioni_presenti?: number; compiti_fatti?: number } | null;
      // se la RPC non risponde restano i conteggi calcolati qui sotto dalle lezioni lette
      setConteggi(!bd.error && b ? { serie: Number(b.serie_presenze ?? 0), presenti: Number(b.lezioni_presenti ?? 0), compitiFatti: Number(b.compiti_fatti ?? 0) } : null);
    })().catch((e: unknown) => vivo && setErrDati(e instanceof Error ? e.message : String(e)));
    return () => { vivo = false; };
  }, [idAll, idGr, fascia, colpoTema, centro.id, sb]);

  // lezioni di fila: dall'ultima lezione chiusa all'indietro, finché era presente
  const serie = useMemo(() => {
    if (conteggi) return conteggi.serie;
    let n = 0;
    for (const l of lezioni ?? []) { if (presenze[l.id] === true) n++; else break; }
    return n;
  }, [lezioni, presenze, conteggi]);

  const stat = useMemo(() => {
    const lez = lezioni ?? [];
    const oggi = new Date();
    const mCorr = chiaveMese(oggi);
    const mPrec = chiaveMese(new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1));
    const delMese = (m: string) => lez.filter((l) => chiaveMese(l.data) === m);
    const tutte = (arr: RLezione[]) => arr.length >= 3 && arr.every((l) => presenze[l.id] === true);
    const presTot = conteggi ? conteggi.presenti : lez.filter((l) => presenze[l.id] === true).length;
    const compitiMese = compiti.filter((c) => chiaveMese(c.created_at) === mCorr);
    const nFatti = conteggi ? conteggi.compitiFatti : fatti.length;
    return { presTot, mesePrec: tutte(delMese(mPrec)), campione: tutte(delMese(mCorr)) && compitiMese.length > 0 && compitiMese.every((c) => fatti.some((f) => f.compito_id === c.id)), nFatti };
  }, [lezioni, presenze, compiti, fatti, conteggi]);

  const badge = useMemo<{ nome: string; icona: IconaNome; on: boolean; hint: string }[]>(() => [
    { nome: t.badgeFila, icona: "flame", on: serie >= 5, hint: fmt(t.quasi, { a: Math.min(serie, 5), b: 5 }) },
    { nome: t.badgeDieci, icona: "target", on: stat.presTot >= 10, hint: fmt(t.quasi, { a: Math.min(stat.presTot, 10), b: 10 }) },
    { nome: t.badgeCompiti, icona: "star", on: stat.nFatti >= 5, hint: fmt(t.quasi, { a: Math.min(stat.nFatti, 5), b: 5 }) },
    { nome: t.badgeMese, icona: "cal", on: stat.mesePrec, hint: "" },
    { nome: t.badgeSquadra, icona: "heart", on: stat.presTot >= 25, hint: fmt(t.quasi, { a: Math.min(stat.presTot, 25), b: 25 }) },
    { nome: t.badgeCampione, icona: "bolt", on: stat.campione, hint: "" },
  ], [serie, stat, t]);

  // livelli: il livello n è superato quando tutte le competenze del colpo del mese hanno voto almeno n
  const livelli = useMemo<Livello[]>(() => {
    const ultime = new Map<string, Comp>();
    for (const v of vals) {
      if (v.colpo.toLowerCase() !== colpoTema) continue;
      const k = (v.competenza || v.colpo).toLowerCase();
      if (!ultime.has(k)) ultime.set(k, { nome: v.competenza || v.colpo, voto: v.voto }); // vals è già dal più recente
    }
    const comp = [...ultime.values()];
    const attese = nomiCompetenze(linea?.competenze);
    const totale = Math.max(comp.length, attese.length);
    if (!comp.length && !totale) return [];
    const base = [t.l1, t.l2, t.l3, t.l4, t.l5];
    const out: Livello[] = [];
    let trovato = false;
    for (let n = 1; n <= 5; n++) {
      const sc = voceScala(linea?.scala, n);
      const nome = sc.nome ?? base[n - 1];
      const ok = comp.length > 0 && comp.every((c) => c.voto >= n);
      const dentro = comp.filter((c) => c.voto >= n).length;
      if (ok) { out.push({ n, stato: "fatto", nome, sub: sc.descrizione ?? t.subFatto, tag: t.tagFatto }); continue; }
      if (!trovato) {
        trovato = true;
        const mancano = comp.filter((c) => c.voto < n).map((c) => c.nome.replace(/[_-]+/g, " "));
        out.push({
          n, stato: "corso", nome,
          sub: sc.descrizione ?? (mancano.length ? fmt(t.subCorso, { n: mancano.length, elenco: mancano.slice(0, 2).join(", ") }) : t.subCorsoSenza),
          tag: totale ? fmt(t.tagCorso, { a: dentro, b: totale }) : t.tagInizio,
        });
        continue;
      }
      out.push({ n, stato: "chiuso", nome, sub: sc.descrizione ?? fmt(t.subChiuso, { n: n - 1 }), tag: t.tagBloccato });
    }
    return out;
  }, [vals, linea, colpoTema, t]);

  // barre delle settimane: piena se passata, in parte la corrente (lezioni fatte su quelle previste)
  const settimane = useMemo(() => {
    if (!tema) return [];
    const oggi = new Date();
    return Array.from({ length: tema.totale }, (_, i) => {
      const n = i + 1;
      if (n < tema.settimana) return 100;
      if (n > tema.settimana) return 0;
      const [dal, al] = intervalloSettimana(oggi.getFullYear(), tema.mese, n, tema.totale);
      const giorni = figlio?.gruppo?.giorni ?? [];
      let previste = 0;
      for (let d = leggiData(dal); isoGiorno(d) <= al; d = aggiungiGiorni(d, 1)) if (giorni.includes(giornoSettimana(d))) previste++;
      const fatte = (lezioni ?? []).filter((l) => l.data >= dal && l.data <= al && presenze[l.id] === true).length;
      if (previste > 0) return Math.min(100, Math.round((fatte / previste) * 100));
      return Math.round(((oggi.getDate() - leggiData(dal).getDate() + 1) / 7) * 100);
    });
  }, [tema, figlio, lezioni, presenze]);

  const slug = (tema?.colpo || tema?.tema || "").toLowerCase().replace(/\s+/g, "_");
  const titoloTema = tema ? (t as Record<string, string>)[`tema_${slug}`] ?? fmt(t.temaGenerico, { tema: nomeColpo(tema.tema) }) : t.nessunTema;
  const restano = tema ? tema.totale - tema.settimana : 0;
  const fraseResta = restano <= 0 ? t.restano0 : restano === 1 ? t.restano1 : fmt(t.restanoN, { n: restano });

  return (
    <SchermoCentro
      ruolo="allievo"
      tab="percorso"
      titolo={t.titolo}
      sopra={figlio ? fmt(t.ciao, { nome: figlio.allievo.nome }) : undefined}
      azioni={serie > 0 ? (
        <span className="tag" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", fontSize: 12.5, color: "#FFB36B" }}>
          <Icona nome="flame" size={15} sw={2.2} />{serie === 1 ? t.serieUna : fmt(t.serie, { n: serie })}
        </span>
      ) : undefined}
    >
      <div className="fam-col">
        {caricamento && <Caricamento />}
        {errore && <ErroreBox testo={errore} onRiprova={ricarica} />}
        {!caricamento && !errore && figli.length === 0 && (
          <div className="card pad" style={{ textAlign: "center" }}>
            <div className="t" style={{ fontWeight: 700 }}>{t.nessunProfilo}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{t.nessunProfiloSub}</div>
          </div>
        )}
        {figlio && (
          <>
            <SelettoreFigli figli={figli} scelto={figlio.allievo.id} onScegli={scegli} />
            {errDati && <ErroreBox testo={errDati} />}
            {!figlio.gruppo ? (
              <div className="note">{t.nessunGruppo}</div>
            ) : (
              <div className="card pad fam-lawn">
                <div className="k" style={{ color: "#E6F5D6" }}>{t.questoMese}</div>
                <div className="fam-disp" style={{ fontSize: 40, fontWeight: 800, fontStyle: "italic", lineHeight: 1.02, marginTop: 2 }}>{titoloTema}</div>
                <div style={{ fontSize: 13.5, marginTop: 4 }}>{tema ? `${fmt(t.settimana, { sett: tema.settimana, tot: tema.totale })} ${fraseResta}` : t.nessunTemaSub}</div>
                {tema && (
                  <div className="fam-riga" style={{ gap: 6, marginTop: 10 }} role="img" aria-label={fmt(t.settimana, { sett: tema.settimana, tot: tema.totale })}>
                    {settimane.map((p, i) => (
                      <span key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: p >= 100 ? "#D8F34A" : p <= 0 ? "rgba(0,0,0,.35)" : `linear-gradient(90deg,#D8F34A 0 ${p}%,rgba(0,0,0,.35) ${p}% 100%)` }} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="seg" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))" }} role="group" aria-label={t.scegli}>
              {([["livelli", t.vLivelli], ["badge", t.vBadge]] as const).map(([k, l]) => (
                <button key={k} type="button" className={vista === k ? "sg on" : "sg"} aria-pressed={vista === k} onClick={() => setVista(k)}>{l}</button>
              ))}
            </div>
            {lezioni === null && !errDati && <Caricamento />}
            {vista === "livelli" && lezioni !== null && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {livelli.length === 0 && <div className="note">{t.nessunLivello}</div>}
                {livelli.map((l) => (
                  <div key={l.n} className="li" style={l.stato === "corso" ? { borderColor: "#D8F34A", background: "#1A1F0E" } : l.stato === "chiuso" ? { opacity: 0.7 } : undefined}>
                    <span className="fam-ic" style={{ width: 38, height: 38, ...(l.stato === "fatto" ? { background: "#D8F34A", color: "#0B0B0C" } : l.stato === "chiuso" ? { color: "#8E8E93" } : {}) }}>
                      <Icona nome={l.stato === "fatto" ? "check" : l.stato === "corso" ? "target" : "lock"} size={20} sw={2.2} />
                    </span>
                    <span className="fam-grow"><div className="t" style={{ fontSize: 15 }}>{fmt(t.livello, { n: l.n, nome: l.nome })}</div><div className="s">{l.sub}</div></span>
                    <span className="tag" style={l.stato === "fatto" ? { background: "#1E3A28", color: "#9BE3B0" } : l.stato === "corso" ? { background: "#D8F34A", color: "#0B0B0C" } : undefined}>{l.tag}</span>
                  </div>
                ))}
              </div>
            )}
            {vista === "badge" && lezioni !== null && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "12px 8px" }}>
                {badge.map((b) => (
                  <div key={b.nome} className={b.on ? "fam-badge on" : "fam-badge"}>
                    <span className="c"><Icona nome={b.on ? b.icona : "lock"} size={26} sw={2.2} /></span>
                    <span className="n">{b.nome}</span>
                    {!b.on && b.hint && <small>{b.hint}</small>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SchermoCentro>
  );
}
