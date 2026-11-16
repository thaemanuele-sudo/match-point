"use client";
// M1 · Oggi: lezioni di oggi dai gruppi del maestro (con il campo vero, cambi di campo compresi), messaggi, allievi da valutare, avvisi.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Btn, Card, Ico, Riga, Sezione, Tag } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { fmtDataLunga, fmtOra, giornoSettimana, isoGiorno, tempoFa } from "@/lib/centro/date";
import { useNotifiche } from "@/lib/centro/notifiche";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { assicuraLezione, COL, messaggioErrore, useMaestroDati } from "./dati";
import { Badge, StatoPagina, stileIconaTonda } from "./piccoli";
import {
  campoEffettivo, chiaveTest, etichettaProgramma, fmt, leggiPiano, minutiA, nomeBreve, nomeCampo, situazioneProgramma,
  type RAllievo, type RGruppo, type RLezione,
} from "./util";

const IT = {
  ciao: "Ciao {nome} · {data}", titolo: "Oggi", lezioniOggi: "Lezioni di oggi", imieiGruppi: "I miei gruppi", daFare: "Da fare", messaggi: "Messaggi",
  nessunaLezione: "Nessuna lezione oggi", nessunaLezioneTesto: "Quando un tuo gruppo si allena, la lezione compare qui con il campo e il piano.",
  individuale: "Individuale", allievi: "{n} allievi", campo: "Campo da definire", daChiudere: "Da chiudere", inCorso: "In corso", chiusa: "Chiusa", pianoPronto: "Piano pronto",
  tra: "Tra {n} min", traOre: "Tra {n} h", pianoLezione: "Piano lezione", inizia: "Inizia", riprendi: "Riprendi", chiudi: "Chiudi lezione", cambioCampo: "Cambio campo",
  coach: "Coach AI", dalMetodo: "Dal Metodo", nessunMessaggio: "Nessun messaggio da leggere", daValutare: "{n} allievi da valutare", daValutare1: "1 allievo da valutare",
  valutaTutto: "Test di {mese}", nascondi: "Nascondi avviso", apri: "Apri", notifiche: "Avvisi e messaggi, {n} da leggere", errApri: "Non riesco ad aprire la lezione: {e}",
  altri: "e altri {n}", mamma: "famiglia", testoNuovo: "Nuovo messaggio",
};
const T = { it: IT, en: { ...IT } };

type Voce = {
  chiave: string; gruppo: RGruppo | null; lezione: RLezione | null; ora: string; data: string; durata: number;
  titolo: string; campo: string; cambioCampo: boolean; allievi: number; individuale: RAllievo | null;
};

export function Oggi() {
  const t = useT(T);
  const router = useRouter();
  const { centro, membroAttivo: ma, sb } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const noti = useNotifiche();
  const oggi = isoGiorno();
  const [lezioni, setLezioni] = useState<RLezione[] | null>(null);
  const [individuali, setIndividuali] = useState<Map<string, RAllievo>>(new Map());
  const [daValutare, setDaValutare] = useState<RAllievo[] | null>(null);
  const [errLez, setErrLez] = useState<string | null>(null);
  const [occupato, setOccupato] = useState<string | null>(null);
  const [adesso, setAdesso] = useState(() => new Date());

  // il "tra 18 min" resta vero anche se la pagina rimane aperta
  useEffect(() => { const i = setInterval(() => setAdesso(new Date()), 30000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (!dati || !ma) return;
    let vivo = true;
    (async () => {
      try {
        const gIds = dati.gruppi.map((g) => g.id);
        // lezioni di oggi dei miei gruppi, più quelle in cui sono il maestro (anche individuali)
        const [perGruppo, perMaestro] = await Promise.all([
          gIds.length ? sb.from("lezioni").select(COL.lezioni).eq("data", oggi).in("gruppo_id", gIds) : Promise.resolve({ data: [], error: null }),
          sb.from("lezioni").select(COL.lezioni).eq("data", oggi).eq("maestro_id", ma.id),
        ]);
        if (perGruppo.error) throw perGruppo.error;
        if (perMaestro.error) throw perMaestro.error;
        const mappa = new Map<string, RLezione>();
        for (const l of [...(perGruppo.data ?? []), ...(perMaestro.data ?? [])] as RLezione[]) mappa.set(l.id, l);
        const lez = [...mappa.values()];
        // allievo delle lezioni individuali (senza gruppo)
        const soloIds = lez.filter((l) => !l.gruppo_id).map((l) => l.id);
        const ind = new Map<string, RAllievo>();
        if (soloIds.length) {
          const pr = await sb.from("presenze").select("lezione_id,allievo_id").in("lezione_id", soloIds);
          const aIds = [...new Set((pr.data ?? []).map((p: { allievo_id: string }) => p.allievo_id))];
          const al = aIds.length ? await sb.from("allievi").select(COL.allievi).in("id", aIds) : { data: [] };
          const am = new Map(((al.data ?? []) as RAllievo[]).map((a) => [a.id, a]));
          for (const p of (pr.data ?? []) as { lezione_id: string; allievo_id: string }[]) { const a = am.get(p.allievo_id); if (a) ind.set(p.lezione_id, a); }
        }
        // allievi senza voto nel test del mese
        const tutti = [...dati.allievi.values()];
        let mancano: RAllievo[] = [];
        if (tutti.length) {
          const v = await sb.from("valutazioni").select("allievo_id").eq("test", chiaveTest(oggi)).in("allievo_id", tutti.map((a) => a.id));
          if (v.error) throw v.error;
          const fatti = new Set((v.data ?? []).map((x: { allievo_id: string }) => x.allievo_id));
          mancano = tutti.filter((a) => !fatti.has(a.id));
        }
        if (!vivo) return;
        setLezioni(lez); setIndividuali(ind); setDaValutare(mancano); setErrLez(null);
      } catch (e) {
        if (vivo) setErrLez(messaggioErrore(e));
      }
    })();
    return () => { vivo = false; };
  }, [dati, ma, sb, oggi]);

  // le voci di oggi: una per gruppo che si allena oggi (con o senza riga in `lezioni`) e le lezioni fuori orario o individuali
  const voci = useMemo<Voce[]>(() => {
    if (!dati || !lezioni) return [];
    const gs = giornoSettimana(oggi);
    const out: Voce[] = [];
    const usate = new Set<string>();
    for (const g of dati.gruppi) {
      const lez = lezioni.find((l) => l.gruppo_id === g.id) ?? null;
      if (!lez && !(g.giorni?.includes(gs) && g.ora)) continue;
      if (lez) usate.add(lez.id);
      const { campo, cambio } = campoEffettivo(g, oggi, dati.cambi, dati.campi, lez);
      out.push({
        chiave: g.id, gruppo: g, lezione: lez, ora: fmtOra(lez?.ora ?? g.ora), data: oggi, durata: g.durata_min ?? 60, titolo: g.nome,
        campo: nomeCampo(campo), cambioCampo: !!cambio, allievi: dati.iscritti.get(g.id)?.length ?? 0, individuale: null,
      });
    }
    for (const l of lezioni) {
      if (usate.has(l.id) || l.gruppo_id) continue;
      const campo = l.campo_id ? dati.campi.get(l.campo_id) : null;
      out.push({ chiave: l.id, gruppo: null, lezione: l, ora: fmtOra(l.ora), data: oggi, durata: 60, titolo: t.individuale, campo: nomeCampo(campo), cambioCampo: false, allievi: 1, individuale: individuali.get(l.id) ?? null });
    }
    return out.sort((a, b) => a.ora.localeCompare(b.ora));
  }, [dati, lezioni, individuali, oggi, t.individuale]);

  const finita = (v: Voce) => {
    const m = minutiA(v.ora, v.data, adesso);
    return m !== null && m + v.durata < 0;
  };
  // la prossima lezione (o quella in corso) è quella evidenziata
  const evidenza = voci.find((v) => v.lezione?.stato !== "chiusa" && !(finita(v) && v.lezione?.stato !== "in_corso")) ?? null;

  async function vai(v: Voce, dove: "lezione" | "inCorso" | "chiusura") {
    if (!dati || !ma) return;
    setOccupato(v.chiave);
    try {
      const id = v.lezione?.id ?? (v.gruppo ? await assicuraLezione(sb, centro.id, ma.id, v.gruppo, v.data, dati) : null);
      if (!id) return;
      router.push(r[dove](id));
    } catch (e) {
      setErrLez(fmt(t.errApri, { e: messaggioErrore(e) }));
      setOccupato(null);
    }
  }

  const stato = (v: Voce) => {
    if (v.lezione?.stato === "chiusa") return { testo: t.chiusa, sfondo: "#12301F", colore: "#4CD07D", dove: "lezione" as const };
    if (v.lezione?.stato === "in_corso") return { testo: t.inCorso, sfondo: "#3A1517", colore: "#FF5A5F", dove: "inCorso" as const };
    if (finita(v)) return { testo: t.daChiudere, sfondo: "#3A2A12", colore: "#FF9F43", dove: "chiusura" as const };
    if (v.lezione && leggiPiano(v.lezione.piano).length) return { testo: t.pianoPronto, sfondo: "#12301F", colore: "#4CD07D", dove: "lezione" as const };
    return null;
  };

  const messaggi = noti.lista.filter((n) => !n.letta_il && n.tipo === "messaggio").slice(0, 3);
  const avvisoNota = noti.lista.find((n) => !n.letta_il && (n.tipo === "avviso" || n.tipo === "cambio_campo")) ?? null;

  const nome = ma?.nome ?? "";
  const bell = (
    <Link href={r.notifiche} className="icon" style={{ ...stileIconaTonda, position: "relative" }} aria-label={fmt(t.notifiche, { n: noti.conteggio })}>
      <Ico nome="bell" size={20} /><Badge n={noti.conteggio} />
    </Link>
  );

  const stato0 = StatoPagina({ caricamento: caricamento || (!lezioni && !errLez), errore: errore ?? errLez, onRiprova: ricarica });
  return (
    <SchermoCentro ruolo="maestro" tab="oggi" sopra={fmt(t.ciao, { nome, data: fmtDataLunga(oggi) })} titolo={t.titolo} azioni={bell}>
      {stato0 ?? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Sezione titolo={t.lezioniOggi} azione={<Link href={r.gruppi}>{t.imieiGruppi}</Link>} />
          {voci.length === 0 && (
            <Card><div className="s" style={{ textAlign: "center" }}><b style={{ display: "block", color: "var(--mc-fg)" }}>{t.nessunaLezione}</b>{t.nessunaLezioneTesto}</div></Card>
          )}
          {voci.map((v) => {
            const st = stato(v);
            const sotto = [v.campo || t.campo, v.individuale ? nomeBreve(v.individuale) : fmt(t.allievi, { n: v.allievi }), `${v.durata}'`].join(" · ");
            const sit = v.gruppo ? situazioneProgramma(v.gruppo.programma_id ? dati?.programmi.get(v.gruppo.programma_id) : null, v.data) : null;
            const modello = v.lezione?.modello_id ? dati?.modelli.find((m) => m.id === v.lezione!.modello_id)?.nome : undefined;
            const min = minutiA(v.ora, v.data, adesso);
            const tra = min !== null && min > 0 ? (min >= 120 ? fmt(t.traOre, { n: Math.round(min / 60) }) : fmt(t.tra, { n: min })) : null;
            const ora = <span className="disp" style={{ width: 50, flex: "none", fontSize: 22, fontWeight: 700, color: "var(--mc-muted)" }}>{v.ora}</span>;
            if (evidenza?.chiave === v.chiave) {
              const inCorso = v.lezione?.stato === "in_corso";
              return (
                <div key={v.chiave} className="card" style={{ borderColor: "color-mix(in srgb, var(--brand) 40%, transparent)", display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="disp" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: "var(--brand)" }}>{v.ora}</span>
                    <span className="grow"><span style={{ display: "block", fontSize: 17, fontWeight: 700 }}>{v.titolo}</span><span className="muted" style={{ display: "block", fontSize: 12.5, marginTop: 2 }}>{sotto}</span></span>
                    {(inCorso || tra) && <span className="tag" style={{ background: inCorso ? "#FF5A5F" : "var(--brand)", color: inCorso ? "#fff" : "var(--brand-ink)" }}>{inCorso ? t.inCorso : tra}</span>}
                  </div>
                  {v.cambioCampo && <Tag colore="#FF9F43" sfondo="#3A2A12">{t.cambioCampo}: {v.campo}</Tag>}
                  {sit && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 14, background: "#0E0E10", border: "1px solid #232326" }}>
                      <span className="ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Ico nome="spark" size={16} /></span>
                      <span className="grow" style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                        <b>{etichettaProgramma(sit)} · {sit.settimana}/{sit.totale}</b><br />
                        <span className="muted">{[modello, t.coach].filter(Boolean).join(" · ")}</span>
                      </span>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 8 }}>
                    <Btn variante="secondario" onClick={() => vai(v, "lezione")} disabled={occupato === v.chiave}>{t.pianoLezione}</Btn>
                    <Btn onClick={() => vai(v, "inCorso")} disabled={occupato === v.chiave} icona="play">{inCorso ? t.riprendi : t.inizia}</Btn>
                  </div>
                </div>
              );
            }
            return (
              <button key={v.chiave} type="button" className="li" style={{ padding: "6px 12px", textAlign: "left", width: "100%" }} onClick={() => vai(v, st?.dove ?? "lezione")} disabled={occupato === v.chiave}>
                {ora}
                <span className="grow"><span className="t" style={{ display: "block" }}>{v.individuale ? `${v.titolo} · ${nomeBreve(v.individuale)}` : v.titolo}</span><span className="s" style={{ display: "block" }}>{sotto}</span></span>
                {st && <span className="tag" style={{ background: st.sfondo, color: st.colore }}>{st.testo}</span>}
              </button>
            );
          })}

          <Sezione titolo={t.daFare} azione={<Link href={r.messaggi}>{t.messaggi}</Link>} />
          {messaggi.length === 0 && <div className="s muted" style={{ padding: "0 4px" }}>{t.nessunMessaggio}</div>}
          {messaggi.map((n) => (
            <Riga key={n.id} href={n.link || r.messaggi} avatar={{ nome: n.mittente || n.titolo }} titolo={n.titolo} sotto={<span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.testo}</span>} destra={<span className="s" style={{ margin: 0 }}>{tempoFa(n.created_at)}</span>} chevron={false} />
          ))}
          {daValutare && daValutare.length > 0 && (
            <Riga
              href={r.valutazioni} icona="target"
              titolo={daValutare.length === 1 ? t.daValutare1 : fmt(t.daValutare, { n: daValutare.length })}
              sotto={[...daValutare.slice(0, 3).map(nomeBreve).join(", "), daValutare.length > 3 ? fmt(t.altri, { n: daValutare.length - 3 }) : ""].filter(Boolean).join(" ")}
            />
          )}
          {avvisoNota && (
            <div className="note" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "var(--brand)", flex: "none", marginTop: 1 }}><Ico nome="bell" size={16} /></span>
              <Link href={avvisoNota.link || r.notifiche} className="grow" style={{ color: "inherit" }}>
                <b style={{ color: "var(--mc-fg)" }}>{avvisoNota.mittente ? `${avvisoNota.mittente}: ` : ""}</b>{avvisoNota.testo || avvisoNota.titolo}
              </Link>
              <button type="button" onClick={() => noti.segnaLetta(avvisoNota.id)} aria-label={t.nascondi} style={{ width: 28, height: 28, flex: "none", borderRadius: "50%", border: 0, background: "#232326", color: "var(--mc-fg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Ico nome="x" size={12} tratto={2.6} /></button>
            </div>
          )}
        </div>
      )}
    </SchermoCentro>
  );
}
