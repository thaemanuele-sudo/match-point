"use client";
// M5 · Piano lezione: la lezione nasce dal programma e dal modello del gruppo. I blocchi bloccati non si toccano,
// i flessibili si sostituiscono solo con le alternative approvate dal DT; ogni sostituzione finisce nel registro.
// I suggerimenti del Coach AI per i presenti si calcolano in locale dai dati e si applicano al singolo allievo come variante.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Foglio, Ico, Nota, Seg, Tag, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { aggiungiGiorni, fmtData, isoGiorno } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { messaggioErrore, salvaPiano, scriviRegistro, useLezione, useMaestroDati } from "./dati";
import { NuovaLezione } from "./NuovaLezione";
import { StatoPagina } from "./piccoli";
import {
  alternativaA, campoEffettivo, coloreColpo, etichettaProgramma, fmt, leggiPiano, leggiSvolto, nomeBreve, nomeCampo, norm, pianoDaModello,
  situazioneProgramma, titoloEsercizio, type Blocco, type REsercizio, type Sostituto, type Variante,
} from "./util";

const IT = {
  titolo: "Piano lezione", dalMetodo: "Dal Metodo", modello: "Modello: {nome}", senzaModello: "Senza modello nel Metodo", durata: "Durata della lezione", min: "{n} min",
  bloccato: "Bloccato", flessibile: "Flessibile", libero: "Libero", cambiato: "Cambiato", alternativa: "Alternativa {n} di {t} · il DT lo vede", flessibileInfo: "Flessibile · {t} alternative approvate", liberoInfo: "Libero · scegli dalla libreria",
  sostituisci: "Sostituisci", sostituisciAria: "Sostituisci {nome} con un'alternativa approvata", sostituisciTitolo: "Sostituisci: {nome}", originale: "Esercizio del Metodo", ripristina: "Ripristina l'esercizio del Metodo",
  nessunaAlt: "Nessuna alternativa approvata per questo blocco.", dallaLibreria: "Dalla libreria del centro", nessunEsercizio: "Nessun esercizio approvato per questo colpo.",
  tracciato0: "Nessuna modifica al piano del Metodo", tracciato1: "1 modifica registrata", tracciatoN: "{n} modifiche registrate",
  tracciatoNota: "Solo i blocchi flessibili del DT, con alternative approvate. Ogni cambio è tracciato e la direzione tecnica lo vede.",
  coach: "Coach AI", coachPresenti: "{p} presenti su {t}.", coachAssenti: "Assenze avvisate: {nomi}.", coachNiente: "Nessun suggerimento: i voti dei presenti sono in linea.",
  coachPer: "Per {nome}: {colpo} ({comp}, voto {voto}) → {es}", applica: "Applica", annulla: "Annulla", variante: "Variante per {nome}",
  inizia: "Inizia lezione", riprendi: "Riprendi la lezione", vediChiusura: "Vai alla chiusura", chiusa: "Lezione chiusa: il piano non si modifica più.",
  errSalva: "Non riesco a salvare il piano: {e}", errRegistro: "Piano salvato, ma non sono riuscito a scrivere nel registro: {e}", errInizio: "Non riesco ad avviare la lezione: {e}",
  nonTrovata: "Lezione non trovata", nonTrovataTesto: "La lezione non esiste oppure non è tua.", pianoVuoto: "Questa lezione non ha ancora blocchi.", confermaDurata: "Cambiando la durata si riparte dal modello e si perdono sostituzioni e varianti. Continuo?",
  cambioCampo: "Cambio campo: {campo}", oggi: "oggi", campo: "Campo da definire",
};
const T = { it: IT, en: { ...IT } };

type Suggerimento = { allievoId: string; nome: string; colpo: string; competenza: string; voto: number; esercizio: REsercizio; blocco: number };

export function PianoLezione({ id }: { id: string }) {
  if (id === "nuova") return <NuovaLezione />;
  return <Piano id={id} />;
}

function Piano({ id }: { id: string }) {
  const t = useT(T);
  const router = useRouter();
  const { centro, membroAttivo: ma, sb } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const { d, errore: errL, ricarica: ricL, caricamento: cL } = useLezione(id, dati);
  const [piano, setPiano] = useState<Blocco[] | null>(null);
  const [sostituendo, setSostituendo] = useState<number | null>(null);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [sugg, setSugg] = useState<Suggerimento[]>([]);

  useEffect(() => { if (d) setPiano(leggiPiano(d.lezione.piano)); }, [d]);
  const lez = d?.lezione ?? null;
  const modificabile = !!lez && lez.stato !== "chiusa";
  const svoltoPrima = useMemo(() => leggiSvolto(lez?.svolto), [lez]);

  // presenti = iscritti meno chi ha avvisato l'assenza per quel giorno
  const presenti = useMemo(() => (d ? d.allievi.filter((a) => !d.assenti.has(a.id)) : []), [d]);

  // Coach AI locale: per chi ha un voto basso (1-2) nell'ultimo test, un esercizio della libreria sullo stesso colpo
  useEffect(() => {
    if (!d || !dati || !piano || !d.allievi.length) { setSugg([]); return; }
    let vivo = true;
    (async () => {
      const da = isoGiorno(aggiungiGiorni(new Date(), -120));
      const v = await sb.from("valutazioni").select("allievo_id,colpo,competenza,voto,test,data").in("allievo_id", presenti.map((a) => a.id)).lte("voto", 2).gte("data", da).order("data", { ascending: false }).limit(200);
      if (!vivo || v.error) return;
      const visti = new Set<string>();
      const out: Suggerimento[] = [];
      for (const x of (v.data ?? []) as { allievo_id: string; colpo: string; competenza: string; voto: number }[]) {
        if (visti.has(x.allievo_id)) continue;
        const a = presenti.find((y) => y.id === x.allievo_id);
        const colpoN = norm(x.colpo).slice(0, 4);
        const fascia = d.gruppo?.fascia ?? null;
        const es = [...dati.esercizi.values()].find((e) => norm(e.colpo ?? "").startsWith(colpoN) && (!fascia || !e.fasce?.length || e.fasce.includes(fascia)));
        if (!a || !es) continue;
        const bi = piano.findIndex((b) => norm(b.colpo || b.titolo).startsWith(colpoN));
        visti.add(x.allievo_id);
        out.push({ allievoId: a.id, nome: nomeBreve(a), colpo: x.colpo, competenza: x.competenza, voto: x.voto, esercizio: es, blocco: bi >= 0 ? bi : 0 });
        if (out.length >= 3) break;
      }
      setSugg(out);
    })().catch(() => { if (vivo) setSugg([]); });
    return () => { vivo = false; };
    // il piano cambia a ogni sostituzione: i suggerimenti dipendono dai presenti, non dal piano
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, dati, presenti, sb]);

  if (!caricamento && !cL && !errore && !errL && !lez) return null;
  if (errL === "nonTrovata") {
    return <SchermoCentro ruolo="maestro" tab="nuovo" indietro={r.base} titolo={t.nonTrovata}><Vuoto titolo={t.nonTrovata} testo={t.nonTrovataTesto} icona="cal" /></SchermoCentro>;
  }

  const sit = d?.gruppo && dati ? situazioneProgramma(d.gruppo.programma_id ? dati.programmi.get(d.gruppo.programma_id) : null, d.lezione.data) : null;
  const { campo, cambio } = d && dati ? campoEffettivo(d.gruppo ?? { id: "", campo_id: null }, d.lezione.data, dati.cambi, dati.campi, d.lezione) : { campo: null, cambio: null };
  const modello = dati && lez?.modello_id ? dati.modelli.find((m) => m.id === lez.modello_id) : undefined;
  const durate = dati ? [...new Set(dati.modelli.map((m) => m.durata_min).filter((x): x is number => !!x))].sort((a, b) => a - b) : [];
  const totaleMin = (piano ?? []).reduce((s, b) => s + b.minuti, 0);
  const nCambi = (piano ?? []).reduce((s, b) => s + (b.sostituto ? 1 : 0) + b.varianti.length, 0);

  async function salva(nuovo: Blocco[], azione?: { nome: string; oggetto: string; dettagli: Record<string, unknown> }) {
    if (!lez || !ma) return;
    setOccupato(true); setMsgErr(null);
    const prima = piano;
    setPiano(nuovo);
    const e = await salvaPiano(sb, lez.id, nuovo, svoltoPrima);
    if (e) { setPiano(prima); setMsgErr(fmt(t.errSalva, { e })); setOccupato(false); return; }
    if (azione) {
      const er = await scriviRegistro(sb, centro.id, ma.id, azione.nome, azione.oggetto, azione.dettagli);
      if (er) setMsgErr(fmt(t.errRegistro, { e: er }));
    }
    setOccupato(false);
  }

  function sostituisci(i: number, nuovo: Sostituto | null) {
    if (!piano || !lez) return;
    const b = piano[i];
    const copia = piano.map((x, k) => (k === i ? { ...x, sostituto: nuovo } : x));
    setSostituendo(null);
    void salva(copia, {
      nome: nuovo ? "sostituzione_blocco" : "ripristino_blocco", oggetto: `lezione:${lez.id}`,
      dettagli: { lezione_id: lez.id, gruppo_id: lez.gruppo_id, data: lez.data, indice: i, blocco: b.titolo, da: titoloEsercizio(b, dati?.esercizi ?? new Map()), a: nuovo?.titolo ?? null, esercizio_id: nuovo?.esercizio_id ?? null },
    });
  }

  function applicaVariante(s: Suggerimento) {
    if (!piano || !lez) return;
    const gia = piano[s.blocco]?.varianti.find((v) => v.allievo_id === s.allievoId);
    const copia = piano.map((b, k) => {
      if (k !== s.blocco) return b;
      const varianti: Variante[] = gia
        ? b.varianti.filter((v) => v.allievo_id !== s.allievoId)
        : [...b.varianti, { allievo_id: s.allievoId, nome: s.nome, esercizio_id: s.esercizio.id, esercizio: s.esercizio.titolo, motivo: `${s.colpo}: ${s.competenza}` }];
      return { ...b, varianti };
    });
    void salva(copia, {
      nome: gia ? "variante_annullata" : "variante_individuale", oggetto: `lezione:${lez.id}`,
      dettagli: { lezione_id: lez.id, indice: s.blocco, allievo_id: s.allievoId, esercizio_id: s.esercizio.id, esercizio: s.esercizio.titolo },
    });
  }

  function cambiaDurata(minuti: number) {
    if (!lez || !dati || !modificabile) return;
    const nuovo = dati.modelli.find((m) => m.durata_min === minuti && m.id !== lez.modello_id) ?? dati.modelli.find((m) => m.durata_min === minuti);
    if (!nuovo || nuovo.id === lez.modello_id) return;
    if (nCambi > 0 && !window.confirm(t.confermaDurata)) return;
    void (async () => {
      setOccupato(true); setMsgErr(null);
      const p = pianoDaModello(nuovo.blocchi, dati.esercizi);
      const { error } = await sb.from("lezioni").update({ modello_id: nuovo.id, piano: p, svolto: [] }).eq("id", lez.id);
      setOccupato(false);
      if (error) { setMsgErr(fmt(t.errSalva, { e: error.message })); return; }
      ricL();
    })();
  }

  async function inizia() {
    if (!lez) return;
    if (lez.stato === "chiusa") { router.push(r.chiusura(lez.id)); return; }
    setOccupato(true);
    if (lez.stato === "programmata") {
      const { error } = await sb.from("lezioni").update({ stato: "in_corso" }).eq("id", lez.id);
      if (error) { setMsgErr(fmt(t.errInizio, { e: messaggioErrore(error) })); setOccupato(false); return; }
    }
    router.push(r.inCorso(lez.id));
  }

  const stato = StatoPagina({ caricamento: caricamento || cL, errore: errore ?? errL, onRiprova: () => { ricarica(); ricL(); } });
  const sopra = d ? [d.gruppo?.nome ?? "", d.lezione.data === isoGiorno() ? `${t.oggi} ${d.lezione.ora?.slice(0, 5) ?? ""}` : `${fmtData(d.lezione.data)} ${d.lezione.ora?.slice(0, 5) ?? ""}`, nomeCampo(campo) || t.campo].filter(Boolean).join(" · ") : undefined;

  return (
    <SchermoCentro ruolo="maestro" tab="nuovo" indietro={r.base} sopra={sopra} titolo={t.titolo}>
      {stato ?? (d && piano && dati && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cambio && <Tag colore="#FF9F43" sfondo="#3A2A12">{fmt(t.cambioCampo, { campo: nomeCampo(campo) })}</Tag>}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px" }}>
            <span className="ic" style={{ width: 34, height: 34, borderRadius: 11 }}><Ico nome="spark" size={18} /></span>
            <span className="grow">
              <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{sit ? `${etichettaProgramma(sit)} · ${sit.settimana}/${sit.totale}` : d.gruppo?.nome ?? ""}</span>
              <span className="muted" style={{ display: "block", fontSize: 12, marginTop: 1 }}>{modello ? fmt(t.modello, { nome: modello.nome }) : t.senzaModello}{sit?.temaSettimana ? ` · ${sit.temaSettimana}` : ""}</span>
            </span>
            {modello && <Tag colore="#4CD07D" sfondo="#10261A">{t.dalMetodo}</Tag>}
          </div>
          {durate.length > 1 && modificabile && (
            <Seg<string> valore={String(modello?.durata_min ?? durate[0])} onChange={(v) => cambiaDurata(+v)} ariaLabel={t.durata} valori={durate.map((x) => ({ id: String(x), etichetta: fmt(t.min, { n: x }) }))} />
          )}
          {piano.length === 0 ? <Vuoto titolo={t.pianoVuoto} icona="layers" /> : (
            <>
              <div style={{ display: "flex", gap: 3, height: 12 }} aria-hidden="true">
                {piano.map((b, i) => <span key={i} style={{ flex: Math.max(1, b.minuti), borderRadius: 6, background: coloreColpo(b.colpo || b.titolo) }} />)}
              </div>
              {piano.map((b, i) => (
                <CartaBlocco key={i} b={b} es={dati.esercizi} modificabile={modificabile} occupato={occupato} t={t} onSostituisci={() => setSostituendo(i)} />
              ))}
              <div style={{ fontSize: 12, color: "var(--mc-muted)", textAlign: "right" }}>{fmt(t.min, { n: totaleMin })}</div>
            </>
          )}
          <Nota icona="lock"><b style={{ color: "var(--mc-fg)" }}>{nCambi === 0 ? t.tracciato0 : nCambi === 1 ? t.tracciato1 : fmt(t.tracciatoN, { n: nCambi })}</b><br />{t.tracciatoNota}</Nota>
          <Coach t={t} presenti={presenti.length} totale={d.allievi.length} assenti={d.allievi.filter((a) => d.assenti.has(a.id)).map(nomeBreve)} sugg={sugg} piano={piano} onApplica={applicaVariante} disabilitato={!modificabile || occupato} />
          {msgErr && <Nota icona="shield">{msgErr}</Nota>}
          {!modificabile && <Nota icona="lock">{t.chiusa}</Nota>}
          <Btn onClick={inizia} disabled={occupato} icona={lez?.stato === "chiusa" ? undefined : "play"}>{lez?.stato === "chiusa" ? t.vediChiusura : lez?.stato === "in_corso" ? t.riprendi : t.inizia}</Btn>
        </div>
      ))}
      <Foglio aperto={sostituendo !== null} onChiudi={() => setSostituendo(null)} titolo={piano && sostituendo !== null ? fmt(t.sostituisciTitolo, { nome: piano[sostituendo].titolo }) : ""}>
        {piano && sostituendo !== null && dati && (
          <Scelte b={piano[sostituendo]} es={dati.esercizi} t={t} onScegli={(s) => sostituisci(sostituendo, s)} fascia={d?.gruppo?.fascia ?? null} />
        )}
      </Foglio>
    </SchermoCentro>
  );
}

type TT = Record<string, string>;

function CartaBlocco({ b, es, modificabile, occupato, t, onSostituisci }: { b: Blocco; es: Map<string, REsercizio>; modificabile: boolean; occupato: boolean; t: TT; onSostituisci: () => void }) {
  const colore = coloreColpo(b.colpo || b.titolo);
  const fless = b.modo !== "bloccato";
  const cambiato = !!b.sostituto;
  const puo = fless && modificabile && (b.modo === "libero" || b.alternative.length > 0);
  const stato = cambiato ? { x: t.cambiato, s: "#3A2A12", c: "#FF9F43" } : b.modo === "bloccato" ? { x: t.bloccato, s: "#232326", c: "#E5E5EA" } : b.modo === "libero" ? { x: t.libero, s: "#12281D", c: "#4CD07D" } : null;
  const info = cambiato ? (b.alternative.length ? fmt(t.alternativa, { n: Math.max(1, b.alternative.findIndex((a) => alternativaA(a, es).titolo === b.sostituto!.titolo) + 1), t: b.alternative.length }) : t.liberoInfo)
    : b.modo === "flessibile" ? fmt(t.flessibileInfo, { t: b.alternative.length }) : b.modo === "libero" ? t.liberoInfo : "";
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px 8px 0", overflow: "hidden", flex: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 5, alignSelf: "stretch", flex: "none", background: colore }} aria-hidden="true" />
        <span className="disp" style={{ width: 34, flex: "none", textAlign: "center", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{b.minuti}&apos;</span>
        <span className="grow">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{b.titolo}</span>
            {stato && <span className="tag" style={{ background: stato.s, color: stato.c }}>{stato.x}</span>}
          </span>
          <span className="muted" style={{ display: "block", fontSize: 12.5, marginTop: 2, lineHeight: 1.3 }}>{titoloEsercizio(b, es) || "—"}</span>
          {info && <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--brand)", marginTop: 2 }}>{info}</span>}
        </span>
        {!fless && <span style={{ color: "var(--mc-dim)", display: "flex", flex: "none" }} aria-hidden="true"><Ico nome="lock" size={18} /></span>}
        {fless && modificabile && (
          <button type="button" onClick={onSostituisci} disabled={!puo || occupato} aria-label={fmt(t.sostituisciAria, { nome: b.titolo })}
            style={{ flex: "none", height: 32, padding: "0 11px", borderRadius: 999, border: 0, background: "#2C2C2E", color: "var(--mc-fg)", fontWeight: 700, fontSize: 12.5, cursor: puo ? "pointer" : "default", opacity: puo ? 1 : 0.5 }}>{t.sostituisci}</button>
        )}
      </div>
      {b.varianti.map((v) => (
        <div key={v.allievo_id} style={{ marginLeft: 49, fontSize: 12, color: "var(--mc-muted)" }}><b style={{ color: "var(--brand)" }}>{fmt(t.variante, { nome: v.nome })}</b>: {v.esercizio}</div>
      ))}
    </div>
  );
}

function Scelte({ b, es, t, onScegli, fascia }: { b: Blocco; es: Map<string, REsercizio>; t: TT; onScegli: (s: Sostituto | null) => void; fascia: string | null }) {
  const alt = b.alternative.map((a) => alternativaA(a, es));
  const colpoN = norm(b.colpo || b.titolo).slice(0, 4);
  // blocco libero: qualsiasi esercizio approvato dello stesso colpo (e della fascia del gruppo)
  const libreria = b.modo === "libero" ? [...es.values()].filter((e) => norm(e.colpo ?? "").startsWith(colpoN) && (!fascia || !e.fasce?.length || e.fasce.includes(fascia))) : [];
  const riga = (titolo: string, sotto: string | undefined, on: boolean, click: () => void, k: string) => (
    <button key={k} type="button" className="li" onClick={click} style={{ textAlign: "left", width: "100%", borderColor: on ? "var(--brand)" : undefined }}>
      <span className="grow"><span className="t" style={{ display: "block" }}>{titolo}</span>{sotto && <span className="s" style={{ display: "block" }}>{sotto}</span>}</span>
      {on && <Ico nome="check" size={18} />}
    </button>
  );
  return (
    <>
      {riga(t.originale, b.esercizio || undefined, !b.sostituto, () => onScegli(null), "orig")}
      {alt.length === 0 && libreria.length === 0 && <div className="s muted">{b.modo === "libero" ? t.nessunEsercizio : t.nessunaAlt}</div>}
      {alt.map((a, i) => riga(a.titolo, undefined, b.sostituto?.titolo === a.titolo, () => onScegli(a), `a${i}`))}
      {libreria.length > 0 && <div className="k" style={{ marginTop: 4 }}>{t.dallaLibreria}</div>}
      {libreria.map((e) => riga(e.titolo, e.durata_min ? `${e.durata_min} min` : undefined, b.sostituto?.esercizio_id === e.id, () => onScegli({ esercizio_id: e.id, titolo: e.titolo }), e.id))}
    </>
  );
}

function Coach({ t, presenti, totale, assenti, sugg, piano, onApplica, disabilitato }: { t: TT; presenti: number; totale: number; assenti: string[]; sugg: Suggerimento[]; piano: Blocco[]; onApplica: (s: Suggerimento) => void; disabilitato: boolean }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", borderColor: "color-mix(in srgb, var(--brand) 30%, transparent)" }}>
      <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
        <span style={{ color: "var(--brand)", flex: "none" }}><Ico nome="spark" size={18} /></span>
        <span className="grow" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
          <b>{t.coach}</b> · {fmt(t.coachPresenti, { p: presenti, t: totale })}
          {assenti.length > 0 && <> {fmt(t.coachAssenti, { nomi: assenti.join(", ") })}</>}
          {sugg.length === 0 && <> <span className="muted">{t.coachNiente}</span></>}
        </span>
      </div>
      {sugg.map((s) => {
        const attiva = !!piano[s.blocco]?.varianti.some((v) => v.allievo_id === s.allievoId);
        return (
          <div key={s.allievoId} style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <span className="grow" style={{ fontSize: 12.5, lineHeight: 1.35 }}>{fmt(t.coachPer, { nome: s.nome, colpo: s.colpo.toLowerCase(), comp: s.competenza.toLowerCase(), voto: s.voto, es: s.esercizio.titolo })}</span>
            <button type="button" onClick={() => onApplica(s)} disabled={disabilitato}
              style={{ flex: "none", height: 30, padding: "0 12px", borderRadius: 999, border: 0, background: attiva ? "#2C2C2E" : "var(--brand)", color: attiva ? "var(--mc-fg)" : "var(--brand-ink)", fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>{attiva ? t.annulla : t.applica}</button>
          </div>
        );
      })}
    </div>
  );
}

