"use client";
// C21 · Ruolo e permessi: che cosa può fare il responsabile di ogni area. I permessi stanno in permessi_ruolo,
// ogni modifica finisce nel registro (chi, quando, cosa). Metodo è in sola lettura e la tutela resta alla direzione tecnica.
import { useEffect, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Avatar, Btn, Caricamento, Chip, Chips, Errore, Foglio, Ico, Nota, Vuoto } from "@/components/centro/ui";
import { rotta } from "@/lib/centro/rotte";
import { fmtData } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { CHIAVI_PERMESSI, nomeCompleto, permessiDi, sostituisci, useOrg, type ChiavePermesso } from "./dati";
import { InvitoBox, creaInvito } from "./Invito";
import type { PermessiArea, RegistroR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Ruolo e permessi", sopra: "{centro} · ruoli d'area", ruoli: "Scegli l'area", respT: "Responsabile {a}", sottoT: "Fasce {f} · {n}", persona: "persona", persone: "persone", nessunaFascia: "tutte",
  invita: "Invita", invitaT: "Invita un responsabile di {a}", invitaCodice: "Codice per il nuovo responsabile", genera: "Crea codice di invito", permesso: "PERMESSO", stato: "STATO", si: "Sì", no: "No", lettura: "Solo lettura", bloccato: "Bloccato",
  l_gruppi: "Gruppi e orari", s_gruppi: "dell'area {a}", l_campi: "Campi", s_campi: "assegnati all'area {a}", l_maestri: "Maestri dell'area", s_maestri: "vede e assegna ai gruppi",
  l_avvisi: "Avvisi all'area", s_avvisi: "a maestri, allievi e famiglie", l_iscrizioni: "Iscrizioni e quote", s_iscrizioni: "vede gli iscritti dell'area", l_metodo: "Metodo", s_metodo: "linee guida e libreria: solo lettura",
  l_tutela: "Segnalazioni di tutela", s_tutela: "restano alla direzione tecnica", l_pagamenti: "Pagamenti", s_pagamenti: "incassi e scadenze del centro",
  registro0: "Le modifiche ai permessi restano registrate: chi, quando, cosa.{u}", ultima: " Ultima: {chi}, {d}.", registro1: "{n} modifiche registrate adesso da {chi}. Resta lo storico di ogni cambio.", registro1s: "1 modifica registrata adesso da {chi}. Resta lo storico di ogni cambio.",
  soloDt: "Solo la direzione tecnica può cambiare i permessi.", vuotoT: "Nessuna area", vuotoS: "Crea prima le aree in Organizzazione.", on: "attivo", off: "spento",
};
const T = { it: IT, en: { ...IT } };

export default function CentroRuoloPermessi() {
  const t = useT(T);
  const o = useOrg();
  const { centro, dati: d, sb } = o;
  const r = rotta(centro.slug);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [mod, setMod] = useState(0);
  const [ultimo, setUltimo] = useState<RegistroR | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [invito, setInvito] = useState<{ codice: string | null } | null>(null);

  useEffect(() => {
    sb.from("registro").select("*").eq("centro_id", centro.id).eq("azione", "permesso").order("created_at", { ascending: false }).limit(1).then(({ data }: { data: unknown }) => setUltimo((((data ?? []) as RegistroR[])[0]) ?? null));
  }, [sb, centro.id, mod]);

  const schermo = (corpo: React.ReactNode) => (
    <SchermoCentro ruolo={o.eResp ? "area" : "dt"} tab="permessi" titolo={t.titolo} sopra={sostituisci(t.sopra, { centro: centro.nome })} indietro={r.dt.organizzazione}>{corpo}</SchermoCentro>
  );
  if (!d) return schermo(o.errore ? <Errore messaggio={o.errore} onRiprova={() => void o.carica()} /> : <Caricamento />);
  if (d.aree.length === 0) return schermo(<Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="lock" azione={<Btn pieno={false} href={r.dt.organizzazione}>{t.invita}</Btn>} />);

  const aree = o.ids ? d.aree.filter((a) => o.ids!.includes(a.id)) : d.aree;
  const area = aree.find((a) => a.id === areaId) ?? aree[0] ?? d.aree[0];
  const perm = permessiDi(d.permessi, area.id);
  const persone = d.membri.filter((m) => m.ruolo === "responsabile_area" && m.area_id === area.id);
  const puo = o.isDT;

  const cambia = async (k: ChiavePermesso, valore: boolean) => {
    setErrore(null);
    const riga = d.permessi.find((x) => x.area_id === area.id);
    const nuovi: PermessiArea = { ...perm, [k]: valore };
    const x = riga
      ? await sb.from("permessi_ruolo").update({ permessi: nuovi }).eq("id", riga.id)
      : await sb.from("permessi_ruolo").insert({ centro_id: centro.id, area_id: area.id, permessi: nuovi });
    if (x.error) { setErrore(x.error.message); return; }
    await o.registra("permesso", area.nome, { permesso: k, valore });
    setMod((n) => n + 1);
    await o.carica();
  };
  const genera = async () => {
    const x = await creaInvito(sb, centro.id, { ruolo: "responsabile_area", area_id: area.id });
    if (x.errore) setErrore(x.errore); else setInvito({ codice: x.invito?.codice ?? null });
  };
  const chi = ultimo ? d.membri.find((m) => m.id === ultimo.membro_id) : null;
  const io = o.membroAttivo ? nomeCompleto(o.membroAttivo) : "";
  const registro = mod === 0
    ? sostituisci(t.registro0, { u: ultimo ? sostituisci(t.ultima, { chi: chi ? nomeCompleto(chi) : "—", d: fmtData(ultimo.created_at) }) : "" })
    : sostituisci(mod === 1 ? t.registro1s : t.registro1, { n: mod, chi: io });

  return schermo(
    <div className="og-pagina">
      <Chips>{aree.map((a) => <Chip key={a.id} on={a.id === area.id} onClick={() => setAreaId(a.id)}>{a.nome}</Chip>)}</Chips>
      <div className="og-split">
        <div className="og-pagina">
          <div className="card og-card" style={{ padding: "10px 12px", gap: 8 }}>
            <div className="og-riga" style={{ flexWrap: "nowrap" }}>
              <span className="ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Ico nome="users" size={18} /></span>
              <span className="grow"><span className="og-t" style={{ display: "block", fontWeight: 800, fontSize: 16 }}>{sostituisci(t.respT, { a: area.nome })}</span>
                <span className="og-s" style={{ display: "block" }}>{sostituisci(t.sottoT, { f: area.fasce?.length ? area.fasce.join(", ") : t.nessunaFascia, n: `${persone.length} ${persone.length === 1 ? t.persona : t.persone}` })}</span></span>
            </div>
            <div className="og-riga" style={{ gap: 6 }}>
              {persone.map((m) => <span key={m.id} className="og-pill" style={{ paddingRight: 10 }}><Avatar nome={m.nome} cognome={m.cognome} size={24} />{nomeCompleto(m)}</span>)}
              {puo && <button type="button" className="chip" style={{ height: 30, background: "#0B0B0C", color: "#D8F34A", border: "1px dashed rgba(216,243,74,.5)" }} onClick={() => { setInvito({ codice: null }); }}><Ico nome="plus" size={13} />{t.invita}</button>}
            </div>
          </div>
          {!puo && <Nota icona="lock">{t.soloDt}</Nota>}
        </div>
        <div className="og-pagina">
          <div className="tbl">
            <div className="og-tr og-th" style={{ gridTemplateColumns: "1fr auto", padding: "7px 12px" }}><span>{t.permesso}</span><span>{t.stato}</span></div>
            {CHIAVI_PERMESSI.map((k) => {
              const fisso = k === "metodo" || k === "tutela";
              const on = !fisso && perm[k] === true;
              const etichetta = t[`l_${k}` as keyof typeof IT];
              return (
                <div key={k} className="og-tr" style={{ gridTemplateColumns: "1fr auto", padding: "6px 12px", minHeight: 37 }}>
                  <span style={{ minWidth: 0 }}><span className="og-t og-ell" style={{ display: "block", fontSize: 13.5 }}>{etichetta}</span><span className="og-s og-ell" style={{ display: "block", fontSize: 11.5 }}>{sostituisci(t[`s_${k}` as keyof typeof IT], { a: area.nome })}</span></span>
                  <span className="og-riga" style={{ flexWrap: "nowrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: k === "metodo" ? "#FFD54A" : on ? "#D8F34A" : "#A1A1A6" }}>{k === "metodo" ? t.lettura : on ? t.si : t.no}</span>
                    {fisso ? <span role="img" aria-label={t.bloccato} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#232326", color: "#A1A1A6" }}><Ico nome="lock" size={15} /></span>
                      : <button type="button" role="switch" aria-checked={on} aria-label={`${etichetta}: ${on ? t.on : t.off}`} disabled={!puo} className={`mc-sw${on ? " on" : ""}`} onClick={() => void cambia(k, !on)}><i /></button>}
                  </span>
                </div>
              );
            })}
          </div>
          {errore && <Errore messaggio={errore} />}
          <div className="note og-riga" style={{ flexWrap: "nowrap", alignItems: "flex-start", fontSize: 12 }}><Ico nome="clock" size={16} /><span>{registro}</span></div>
        </div>
      </div>
      {invito && (
        <Foglio aperto onChiudi={() => setInvito(null)} titolo={sostituisci(t.invitaT, { a: area.nome })}>
          <div className="og-form">{invito.codice ? <InvitoBox codice={invito.codice} titolo={t.invitaCodice} /> : <Btn icona="share" onClick={() => void genera()}>{t.genera}</Btn>}</div>
        </Foglio>
      )}
    </div>,
  );
}
