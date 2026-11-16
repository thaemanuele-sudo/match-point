"use client";
import { useEffect, useMemo, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, Interr, VuotoC } from "./stati";
import { etichettaDest, inviaAvviso, contaDestinatari, ricordaAvviso, useAvvisiInviati, useNomi, type AvvisoConLetture, type Dest, type Risolti, type TipoDest } from "./avvisi";
import { dataBreve, f, hhmm, inSilenzio, messaggioErrore, nomeMembro, oraIt, prossimaConsegna, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titoloCentro: "Avvisi",
  titoloArea: "Avviso all'area",
  sopraCentro: "{centro} · Comunicazioni",
  sopraArea: "{area} · Responsabile d'area",
  nuovo: "Nuovo avviso",
  inviati: "Inviati e letture",
  destinatari: "DESTINATARI",
  tCentro: "Tutto il centro",
  tFascia: "Fascia",
  tGruppo: "Gruppo",
  tMaestro: "Un maestro",
  tArea: "Tutta l'area",
  titolo: "Titolo",
  testo: "Scrivi l'avviso…",
  conferma: "Chiedi conferma di lettura",
  confermaSub: "Ricordiamo chi non ha letto dopo 24 ore",
  invia: "Invia avviso",
  programma: "Programma per domani alle {ora}",
  inviando: "Invio…",
  silenzio: "Dopo le {da} non si manda nulla: l'avviso parte alle {a}.",
  riepCentro: "{al} allievi · {fa} famiglie · {ma} maestri in copia",
  riep: "{al} allievi · {fa} famiglie · {dest}",
  scegli: "Scegli almeno un destinatario",
  letti24: "letti in 24 ore",
  delMese: "avvisi del mese",
  daRicordare: "da ricordare",
  hannoLetto: "{l} di {t} hanno letto",
  hannoLetto1: "{l} hanno letto",
  altri: "Carica altri avvisi",
  ricorda: "Ricorda a chi non ha letto",
  ricordato: "Promemoria inviato a {n} persone.",
  vuoto: "Non ci sono ancora avvisi inviati.",
  caricamento: "Carico gli avvisi…",
  inviato: "Avviso inviato: {n} destinatari.",
  programmato: "Programmato per domani alle {ora}.",
  famiglieDi: "Famiglie di {nome}",
  area: "Area {nome}",
  tutti: "Tutti",
  nonAutorizzato: "Gli avvisi sono riservati al direttore tecnico, al titolare e ai responsabili d'area.",
  nessunaArea: "Il tuo ruolo non è collegato a un'area.",
  programmatoTag: "programmato",
};
const T = { it, en: { ...it } };

const ORA = (d: Date) => oraIt(d);

/** C14 (centro) e avviso all'area (responsabile): stesso compositore, cambiano i destinatari consentiti. */
export function AvvisiPagina({ modo }: { modo: "centro" | "area" }) {
  const t = useT(T);
  const { sb, me, centro, ruolo, imp } = useMio();
  const nomi = useNomi();
  const inv = useAvvisiInviati("tutti", 20);
  const [vista, setVista] = useState<"nuovo" | "inviati">("nuovo");
  const [tipo, setTipo] = useState<TipoDest>(modo === "area" ? "area" : "centro");
  const [valori, setValori] = useState<string[]>([]);
  const [titolo, setTitolo] = useState("");
  const [testo, setTesto] = useState("");
  const [conferma, setConferma] = useState(true);
  const [ris, setRis] = useState<Risolti | null>(null);
  const [opz, setOpz] = useState<{ fasce: string[]; gruppi: { id: string; nome: string }[]; maestri: { id: string; nome: string }[] }>({ fasce: [], gruppi: [], maestri: [] });
  const [invio, setInvio] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const areaId = modo === "area" ? me?.area_id ?? null : null;
  const dt = ruolo === "titolare" || ruolo === "dt";
  const consentito = modo === "centro" ? dt || ruolo === "segreteria" : ruolo === "responsabile_area" || dt;

  // opzioni: fasce, gruppi e maestri del centro (o dell'area per il responsabile)
  useEffect(() => {
    if (!sb || !centro) return;
    (async () => {
      let q = sb.from("gruppi").select("id,nome,fascia").eq("centro_id", centro.id).eq("attivo", true).order("nome");
      if (areaId) q = q.eq("area_id", areaId);
      const { data: g } = await q;
      const gr = (g ?? []) as { id: string; nome: string; fascia: string | null }[];
      const { data: m } = modo === "centro" ? await sb.from("membri").select("id,nome,cognome").eq("centro_id", centro.id).eq("ruolo", "maestro").order("nome") : { data: [] };
      setOpz({
        fasce: Array.from(new Set(gr.map((x) => x.fascia).filter(Boolean))) as string[],
        gruppi: gr.map((x) => ({ id: x.id, nome: x.nome })),
        maestri: ((m ?? []) as { id: string; nome: string; cognome: string }[]).map((x) => ({ id: x.id, nome: nomeMembro(x) })),
      });
    })();
  }, [sb, centro, areaId, modo]);

  const dest: Dest = useMemo(() => (tipo === "area" ? { tipo, valori: areaId ? [areaId] : [] } : { tipo, valori }), [tipo, valori, areaId]);
  const pronto = tipo === "centro" || dest.valori.length > 0;

  useEffect(() => {
    if (!sb || !centro || !pronto) return setRis(null);
    let vivo = true;
    contaDestinatari(sb, centro.id, dest).then((r) => vivo && setRis(r), () => vivo && setRis(null));
    return () => {
      vivo = false;
    };
  }, [sb, centro, dest, pronto]);

  const scegliTipo = (k: TipoDest) => {
    setTipo(k);
    setValori([]);
    setOk(null);
  };
  const alterna = (v: string) => setValori((x) => (x.includes(v) ? x.filter((y) => y !== v) : [...x, v]));

  const tipi: [TipoDest, string][] = modo === "area" ? [["area", t.tArea], ["gruppo", t.tGruppo]] : [["centro", t.tCentro], ["fascia", t.tFascia], ["gruppo", t.tGruppo], ["maestro", t.tMaestro]];
  const sub: { id: string; nome: string }[] = tipo === "fascia" ? opz.fasce.map((x) => ({ id: x, nome: x })) : tipo === "gruppo" ? opz.gruppi : tipo === "maestro" ? opz.maestri : [];
  const silenzio = inSilenzio(imp);
  const etDest = etichettaDest(dest, { ...nomi, aree: { ...nomi.aree } }, { centro: t.tCentro, famiglieDi: t.famiglieDi, area: t.area, tutti: t.tutti });
  const riepilogo = !pronto ? t.scegli : !ris ? "…" : tipo === "centro" ? f(t.riepCentro, { al: ris.allievi, fa: ris.famiglie, ma: ris.maestri }) : f(t.riep, { al: ris.allievi, fa: ris.famiglie, dest: etDest });

  async function invia() {
    if (!sb || !centro || !pronto || !titolo.trim() || !testo.trim()) return;
    setInvio(true);
    setErr(null);
    setOk(null);
    try {
      const r = await inviaAvviso(sb, centro.id, { titolo: titolo.trim(), testo: testo.trim(), destinatari: dest, conferma, promemoria: conferma });
      setOk(r.consegna_il ? f(t.programmato, { ora: ORA(new Date(r.consegna_il)) }) : f(t.inviato, { n: r.destinatari }));
      setTitolo("");
      setTesto("");
      inv.ricarica();
    } catch (e) {
      setErr(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }

  const lista = inv.lista;
  const mese = new Date().getMonth();
  const delMese = (lista ?? []).filter((a) => new Date(a.created_at).getMonth() === mese).length;
  const tot = (lista ?? []).reduce((s, a) => s + a.tot, 0);
  const pct = tot ? Math.round(((lista ?? []).reduce((s, a) => s + a.letti24, 0) / tot) * 100) : 0;
  const daRicordare = (lista ?? []).filter((a) => a.conferma && Date.now() - new Date(a.created_at).getTime() > 86400000).reduce((s, a) => s + Math.max(0, a.tot - a.letti), 0);

  const [ricMsg, setRicMsg] = useState<string | null>(null);
  async function ricorda(a: AvvisoConLetture) {
    if (!sb || !centro) return;
    setRicMsg(null);
    try {
      const n = await ricordaAvviso(sb, a.id);
      setRicMsg(f(t.ricordato, { n }));
    } catch (e) {
      setRicMsg(messaggioErrore(e));
    }
  }

  const titoloPag = modo === "area" ? t.titoloArea : t.titoloCentro;
  const sopra = modo === "area" ? f(t.sopraArea, { area: nomi.aree[areaId ?? ""] ?? "" }) : f(t.sopraCentro, { centro: centro?.nome ?? "" });

  return (
    <SchermoCentro ruolo={modo === "area" ? "area" : "dt"} tab={modo === "area" ? "messaggi" : "avvisi"} titolo={titoloPag} sopra={sopra} indietro largo>
      {!centro || !me ? (
        <Caric testo={t.caricamento} />
      ) : !consentito ? (
        <ErroreC testo={t.nonAutorizzato} />
      ) : modo === "area" && !areaId && !dt ? (
        <ErroreC testo={t.nessunaArea} />
      ) : (
        <div className="cm-col">
          <div className="seg cm-solo-tel" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            {([["nuovo", t.nuovo], ["inviati", t.inviati]] as ["nuovo" | "inviati", string][]).map(([k, l]) => (
              <button key={k} type="button" className={k === vista ? "sg on" : "sg"} onClick={() => setVista(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="cm-due">
            <section className="cm-pannello cm-col" data-attivo={vista === "nuovo" ? "1" : "0"} aria-label={t.nuovo}>
              <div className="cm-k">{t.destinatari}</div>
              <div className="chips">
                {tipi.map(([k, l]) => (
                  <button key={k} type="button" className={k === tipo ? "chip on" : "chip"} aria-pressed={k === tipo} onClick={() => scegliTipo(k)}>
                    {l}
                  </button>
                ))}
              </div>
              {sub.length > 0 && (
                <div className="chips">
                  {sub.map((o) => (
                    <button key={o.id} type="button" className={valori.includes(o.id) ? "chip on" : "chip"} aria-pressed={valori.includes(o.id)} onClick={() => alterna(o.id)}>
                      {o.nome}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                <Ic n="users" size={16} style={{ color: "#D8F34A" }} />
                <span>{riepilogo}</span>
              </div>
              <input className="cm-in r" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder={t.titolo} aria-label={t.titolo} maxLength={120} />
              <textarea className="cm-ta" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={t.testo} aria-label={t.testo} maxLength={1200} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{t.conferma}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#A1A1A6" }}>{t.confermaSub}</span>
                </span>
                <Interr on={conferma} onChange={setConferma} label={t.conferma} />
              </div>
              {silenzio && (
                <div className="cm-piede" style={{ color: "#FFD54A", fontWeight: 700 }}>
                  <Ic n="moon" size={13} />
                  {f(t.silenzio, { da: hhmm(imp.silenzio_da), a: hhmm(imp.silenzio_a) })}
                </div>
              )}
              <ErroreC testo={err} />
              {ok && <div className="cm-ok">{ok}</div>}
              <button type="button" className="cm-bt" disabled={invio || !pronto || !titolo.trim() || !testo.trim()} onClick={invia}>
                <Ic n="send" size={17} sw={2.4} />
                {invio ? t.inviando : silenzio ? f(t.programma, { ora: ORA(prossimaConsegna(imp)) }) : t.invia}
              </button>
            </section>

            <section className="cm-pannello cm-col" data-attivo={vista === "inviati" ? "1" : "0"} aria-label={t.inviati}>
              <div className="g3 cm-tiles">
                <div className="tile"><b>{pct}%</b><span>{t.letti24}</span></div>
                <div className="tile"><b>{delMese}</b><span>{t.delMese}</span></div>
                <div className="tile"><b style={{ color: "#FF9F43" }}>{daRicordare}</b><span>{t.daRicordare}</span></div>
              </div>
              <ErroreC testo={inv.errore} />
              {ricMsg && <div className="cm-ok">{ricMsg}</div>}
              {lista === null ? (
                <Caric testo={t.caricamento} />
              ) : lista.length === 0 ? (
                <VuotoC>{t.vuoto}</VuotoC>
              ) : (
                lista.map((a) => {
                  const p = a.tot ? Math.round((a.letti / a.tot) * 100) : 0;
                  const futuro = a.consegna_il && new Date(a.consegna_il).getTime() > Date.now();
                  return (
                    <div key={a.id} className="card" style={{ padding: "11px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                        <span style={{ fontWeight: 700, fontSize: 14.5 }}>{a.titolo}</span>
                        <span style={{ fontSize: 12, color: "#A1A1A6", whiteSpace: "nowrap" }}>{futuro ? t.programmatoTag : dataBreve(a.created_at)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5 }}>
                        <span className="muted">{etichettaDest(a.destinatari, nomi, { centro: t.tCentro, famiglieDi: t.famiglieDi, area: t.area, tutti: t.tutti })}</span>
                        <b style={{ whiteSpace: "nowrap" }}>{a.tot > 0 ? f(t.hannoLetto, { l: a.letti, t: a.tot }) : f(t.hannoLetto1, { l: a.letti })}</b>
                      </div>
                      <div className="bar"><i style={{ width: `${p}%`, background: a.letti === a.tot && a.tot > 0 ? "#4CD07D" : "#D8F34A" }} /></div>
                      {a.conferma && (a.tot === 0 || a.letti < a.tot) && (
                        <button type="button" className="cm-bt2" style={{ height: 34, fontSize: 12.5, alignSelf: "flex-start" }} onClick={() => ricorda(a)}>
                          <Ic n="bell" size={14} />
                          {t.ricorda}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              {inv.ancora && (
                <button type="button" className="cm-bt2" onClick={inv.altri}>
                  {t.altri}
                </button>
              )}
            </section>
          </div>
        </div>
      )}
    </SchermoCentro>
  );
}

export default function CentroAvvisi() {
  return <AvvisiPagina modo="centro" />;
}
