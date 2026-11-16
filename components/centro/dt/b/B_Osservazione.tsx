"use client";
// C4 · Osservazione in campo (/c/[slug]/dt/osservazione/[id]). Il direttore tecnico valuta quattro aspetti della lezione,
// vede il voto complessivo e sceglie i consigli. Si salva in `osservazioni`: la vedono solo DT e il maestro (RLS).
// L'[id] può essere una lezione (dalla panoramica) oppure un maestro (dalla sua scheda): in quel caso si sceglie
// la sua prossima lezione, altrimenti l'ultima chiusa.
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { fmtData, fmtOra, isoGiorno } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "../../Schermo";
import { COL, CRITERI, iniziali, coloreAvatar, nomeCompleto, rimpiazza, virgola, type Criterio, type Riga } from "./util";
import "./b.css";

const it = {
  kick: "Osservazione in campo", titolo: "Valuta la lezione",
  tempi: "Rispetto dei tempi", tempiHint: "Blocchi da 15' rispettati",
  correzione: "Qualità della correzione", correzioneHint: "Una per volta, chiara e positiva",
  gruppo: "Gestione del gruppo", gruppoHint: "Nessuno fermo in fila",
  sicurezza: "Sicurezza", sicurezzaHint: "Campo in ordine, palle raccolte",
  l1: "Da migliorare", l2: "Sufficiente", l3: "Buono", l4: "Molto buono", l5: "Eccellente",
  punteggio: "Punteggio {n} su 5, {l}, {c}",
  votoK: "VOTO COMPLESSIVO", su10: "/ 10", scegli: "Valuta i quattro aspetti",
  consigliK: "CONSIGLI PER {nome} · TOCCA PER AGGIUNGERE",
  c1: "Rotazioni più rapide", c2: "Una correzione alla volta", c3: "Più tempo a servizio e risposta", c4: "Rinforzo positivo",
  salva: "Salva e condividi con {nome}", salvo: "Salvo…", aggiorna: "Aggiorna e condividi con {nome}",
  visibile: "Visibile solo a te e a {nome} · resta tracciata nella sua scheda",
  campo: "Campo {n}", minuti: "{n}'", senzaLezione: "Nessuna lezione collegata: l'osservazione si salva nella scheda del maestro.",
  caricamento: "Carico la lezione…", nonTrovato: "Lezione o maestro non trovati in questo centro.", nonAutorizzato: "Solo il direttore tecnico può registrare un'osservazione.",
  errore: "Non riesco a salvare: {e}", erroreCarica: "Non riesco a caricare i dati: {e}",
  notificaTitolo: "Nuova osservazione in campo", notificaTesto: "{da} ha valutato una tua lezione. Trovi voti e consigli in La mia formazione.",
};
const T = { it, en: { ...it } };

const giudizio = (media: number) => (media >= 4.5 ? 5 : media >= 3.75 ? 4 : media >= 3 ? 3 : media >= 2 ? 2 : 1);

type Ctx = { maestro: Riga; lezione: Riga | null; gruppo: Riga | null; campo: Riga | null; modello: Riga | null; esistente: Riga | null };

export default function BOsservazione() {
  const t = useT(T);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { centro, sb, membroAttivo, ruolo } = useCentro();
  const R = rotta(centro.slug);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [stato, setStato] = useState<"carica" | "ok" | "nonTrovato">("carica");
  const [err, setErr] = useState("");
  const [voti, setVoti] = useState<Record<Criterio, number>>({ tempi: 0, correzione: 0, gruppo: 0, sicurezza: 0 });
  const [consigli, setConsigli] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        let lezione: Riga | null = null;
        let maestro: Riga | null = null;
        const COL_LEZ = "id,gruppo_id,data,ora,campo_id,maestro_id,modello_id,stato";
        const l = await sb.from("lezioni").select(COL_LEZ).eq("centro_id", centro.id).eq("id", id).maybeSingle();
        if (l.error) throw l.error;
        if (l.data) {
          lezione = l.data as Riga;
        } else {
          const mm = await sb.from("membri").select("id,nome,cognome").eq("centro_id", centro.id).eq("id", id).maybeSingle();
          if (mm.error) throw mm.error;
          maestro = mm.data as Riga | null;
          if (maestro) {
            const oggi = isoGiorno();
            // la prossima lezione da fare, altrimenti l'ultima chiusa: due richieste da una riga, non 200 lezioni da filtrare nel browser
            const [prossima, ultima] = await Promise.all([
              sb.from("lezioni").select(COL_LEZ).eq("centro_id", centro.id).eq("maestro_id", id).neq("stato", "chiusa").gte("data", oggi).order("data", { ascending: true }).order("ora", { ascending: true }).limit(1),
              sb.from("lezioni").select(COL_LEZ).eq("centro_id", centro.id).eq("maestro_id", id).eq("stato", "chiusa").order("data", { ascending: false }).limit(1),
            ]);
            lezione = ((prossima.data as Riga[] | null)?.[0] ?? (ultima.data as Riga[] | null)?.[0] ?? null);
          }
        }
        if (lezione && !maestro) {
          const mm = await sb.from("membri").select("id,nome,cognome").eq("centro_id", centro.id).eq("id", lezione.maestro_id).maybeSingle();
          maestro = mm.data as Riga | null;
        }
        if (!maestro) { if (vivo) setStato("nonTrovato"); return; }
        const [g, c, mo, es] = await Promise.all([
          lezione?.gruppo_id ? sb.from("gruppi").select("nome").eq("id", lezione.gruppo_id).maybeSingle() : Promise.resolve({ data: null }),
          lezione?.campo_id ? sb.from("campi").select("numero,nome").eq("id", lezione.campo_id).maybeSingle() : Promise.resolve({ data: null }),
          lezione?.modello_id ? sb.from("modelli_lezione").select("nome,durata_min").eq("id", lezione.modello_id).maybeSingle() : Promise.resolve({ data: null }),
          lezione && membroAttivo ? sb.from("osservazioni").select("id,voti,consigli").eq("centro_id", centro.id).eq("lezione_id", lezione.id).eq("osservatore_id", membroAttivo.id).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        if (!vivo) return;
        const esistente = (es.data as Riga | null) ?? null;
        setCtx({ maestro, lezione, gruppo: g.data as Riga | null, campo: c.data as Riga | null, modello: mo.data as Riga | null, esistente });
        if (esistente) {
          setVoti({ tempi: +esistente.voti?.tempi || 0, correzione: +esistente.voti?.correzione || 0, gruppo: +esistente.voti?.gruppo || 0, sicurezza: +esistente.voti?.sicurezza || 0 });
          setConsigli(Array.isArray(esistente.consigli) ? esistente.consigli : []);
        }
        setStato("ok");
      } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (vivo) { setErr(rimpiazza(t.erroreCarica, { e: String(e?.message ?? e) })); setStato("nonTrovato"); }
      }
    })();
    return () => { vivo = false; };
    // t cambia riferimento solo con la lingua: non deve rifare le query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, centro.id, id, membroAttivo?.id]);

  const completo = CRITERI.every((c) => voti[c] > 0);
  const media = completo ? CRITERI.reduce((s, c) => s + voti[c], 0) / CRITERI.length : 0;
  const colMedia = media >= 3.75 ? COL.verde : media >= 3 ? COL.giallo : COL.arancio;
  const nomeM = ctx ? ctx.maestro.nome : "";
  const puoi = ruolo === "dt" || ruolo === "titolare";
  const etichetteVoto = [t.l1, t.l2, t.l3, t.l4, t.l5];

  const criteri: [Criterio, string, string][] = useMemo(
    () => [["tempi", t.tempi, t.tempiHint], ["correzione", t.correzione, t.correzioneHint], ["gruppo", t.gruppo, t.gruppoHint], ["sicurezza", t.sicurezza, t.sicurezzaHint]],
    [t],
  );
  const suggerimenti = [t.c1, t.c2, t.c3, t.c4];

  async function salva() {
    if (!ctx || !completo || !membroAttivo) return;
    setSalvo(true);
    setErr("");
    const riga = {
      centro_id: centro.id, maestro_id: ctx.maestro.id, osservatore_id: membroAttivo.id, lezione_id: ctx.lezione?.id ?? null,
      voti: { ...voti }, voto: Math.round(media * 2), consigli,
    };
    const r = ctx.esistente
      ? await sb.from("osservazioni").update({ voti: riga.voti, voto: riga.voto, consigli }).eq("id", ctx.esistente.id)
      : await sb.from("osservazioni").insert(riga);
    if (r.error) { setErr(rimpiazza(t.errore, { e: r.error.message })); setSalvo(false); return; }
    // Avviso al maestro: se la notifica non parte l'osservazione resta comunque salvata
    await sb.from("notifiche").insert({
      centro_id: centro.id, membro_id: ctx.maestro.id, tipo: "sistema", titolo: t.notificaTitolo,
      testo: rimpiazza(t.notificaTesto, { da: nomeCompleto(membroAttivo) }), link: R.maestro.formazione, mittente: nomeCompleto(membroAttivo),
    });
    router.push(R.dt.maestro(ctx.maestro.id));
  }

  return (
    <SchermoCentro ruolo="dt" tab="maestri" titolo={t.titolo} sopra={t.kick} indietro={ctx ? R.dt.maestro(ctx.maestro.id) : R.dt.maestri}>
      {stato === "carica" ? <div className="note" role="status">{t.caricamento}</div> : null}
      {stato === "nonTrovato" ? <div className="note" role="alert">{err || t.nonTrovato}</div> : null}
      {stato === "ok" && ctx ? (
        <>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px" }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: coloreAvatar(ctx.maestro.id), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" }}>{iniziali(ctx.maestro as { nome: string; cognome: string | null })}</span>
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: 15 }}>{nomeCompleto(ctx.maestro as { nome: string; cognome: string | null })}{ctx.gruppo ? ` · ${ctx.gruppo.nome}` : ""}</div>
              <div className="kick" style={{ fontSize: 12 }}>
                {ctx.lezione
                  ? [fmtData(ctx.lezione.data), fmtOra(ctx.lezione.ora), ctx.campo ? rimpiazza(t.campo, { n: ctx.campo.numero }) : "", ctx.modello ? `${ctx.modello.nome}${ctx.modello.durata_min ? ", " + rimpiazza(t.minuti, { n: ctx.modello.durata_min }) : ""}` : ""].filter(Boolean).join(" · ")
                  : t.senzaLezione}
              </div>
            </div>
          </div>

          <div className="b-oss">
            <div className="b-col">
              {criteri.map(([k, nome, hint]) => (
                <div key={k} className="card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px 12px" }}>
                  <div className="grow"><div style={{ fontWeight: 700, fontSize: 14 }}>{nome}</div><div className="kick" style={{ fontSize: 11.5, lineHeight: 1.3 }}>{hint}</div></div>
                  <div className="b-voto" role="group" aria-label={nome}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} className={voti[k] === n ? "on" : voti[k] > n ? "parz" : ""} aria-pressed={voti[k] === n} aria-label={rimpiazza(t.punteggio, { n, l: etichetteVoto[n - 1], c: nome })} onClick={() => setVoti((v) => ({ ...v, [k]: n }))}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="b-col">
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderColor: "rgba(216,243,74,.35)" }}>
                <div>
                  <div className="k">{t.votoK}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className="disp" style={{ fontSize: 42, fontWeight: 800, fontStyle: "italic", lineHeight: 1, color: COL.palla }}>{completo ? virgola(media * 2) : "—"}</span>
                    <span className="muted" style={{ fontWeight: 700 }}>{t.su10}</span>
                  </div>
                </div>
                <div className="grow">
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 5 }}>{completo ? etichetteVoto[giudizio(media) - 1] : t.scegli}</div>
                  <div className="bar" style={{ height: 8 }}><i style={{ width: `${media * 20}%`, background: colMedia }} /></div>
                </div>
              </div>

              <div className="k" style={{ marginTop: 1 }}>{rimpiazza(t.consigliK, { nome: nomeM.toUpperCase() })}</div>
              <div className="chips" style={{ gap: 5 }}>
                {suggerimenti.map((s) => {
                  const on = consigli.includes(s);
                  return <button key={s} className={on ? "chip on" : "chip"} aria-pressed={on} style={{ height: 30, padding: "0 11px", fontSize: 12.5 }} onClick={() => setConsigli((c) => (on ? c.filter((x) => x !== s) : [...c, s]))}>{s}</button>;
                })}
              </div>

              {err ? <div className="note" role="alert" style={{ color: "#FF8A8E" }}>{err}</div> : null}
              {puoi ? (
                <button className="btn" onClick={salva} disabled={!completo || salvo} style={{ height: 50, opacity: !completo || salvo ? 0.5 : 1, cursor: !completo || salvo ? "default" : "pointer" }}>
                  {salvo ? t.salvo : rimpiazza(ctx.esistente ? t.aggiorna : t.salva, { nome: nomeM })}
                </button>
              ) : <div className="note">{t.nonAutorizzato}</div>}
              <div className="kick" style={{ textAlign: "center", fontSize: 11.5 }}>{rimpiazza(t.visibile, { nome: nomeM })}</div>
            </div>
          </div>
        </>
      ) : null}
    </SchermoCentro>
  );
}
