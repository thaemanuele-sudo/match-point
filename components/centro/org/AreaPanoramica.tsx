"use client";
// R1 · Area, panoramica: la vista del responsabile d'area, limitata alla sua area (gruppi, allievi, cambi di campo
// della settimana, assenze avvisate oggi). La direzione può aprirla scegliendo l'area.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Avatar, Btn, Caricamento, Chip, Chips, Errore, Ico, Sezione, Tag, Tile, Vuoto } from "@/components/centro/ui";
import { rotta, ROTTE_APP } from "@/lib/centro/rotte";
import { aggiungiGiorni, fmtData, fmtGiorni, fmtOra, inizioSettimana, isoGiorno } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { allieviDelGruppo, colorePerArea, maestriDi, nomeAllievo, nomeCompleto, sostituisci, useConteggi, useOrg } from "./dati";
import type { AllievoL, AssenzaR } from "./tipi";
import "./org.css";

const IT = {
  titolo: "Area {a}", sopra: "{p} · Resp. {a}", sopraDt: "{centro} · vista area", cambiaRuolo: "Cambia ruolo", gruppi: "gruppi", allievi: "allievi", presenze: "presenze", maestri: "maestri",
  gruppiT: "Gruppi dell'area", tutti: "Tutti", campo: "Campo {n}", senzaCampo: "Senza campo", sub: "{m} · {n} allievi", nessunMaestro: "Nessun maestro",
  cambiT: "Cambi di campo", settimana: "questa settimana", cambio: "Campo {a} → Campo {b} · {m}", apri: "Apri", nessunCambio: "Nessun cambio di campo questa settimana.",
  assT: "Assenze avvisate oggi", avvisata: "Avvisata", oggi: "Oggi {o} · {m}", nessunaAss: "Nessuna assenza avvisata oggi.", avviso: "Avviso all'area",
  m_malato: "Sono malato", m_scuola: "Ho scuola o compiti", m_viaggio: "Sono in viaggio", m_altro: "Altro",
  vuotoT: "Nessuna area assegnata", vuotoS: "Quando la direzione ti assegna un'area la trovi qui.", nessunGruppo: "Nessun gruppo in quest'area.",
};
const T = { it: IT, en: { ...IT } };

export default function AreaPanoramica() {
  const t = useT(T);
  const o = useOrg();
  const { centro, sb, dati: d } = o;
  const r = rotta(centro.slug);
  const [areaSel, setAreaSel] = useState<string | null>(null);
  // presenze degli ultimi 30 giorni dell'area scelta (`area_presenze_mese`): `area` dice di quale area sono, così non si mostrano numeri di un'altra
  const [pres, setPres] = useState<{ area: string; perc: number | null } | null>(null);
  const [assenzeOggi, setAssenzeOggi] = useState<AssenzaR[] | null>(null);
  const [nomi, setNomi] = useState<Map<string, AllievoL>>(new Map());
  const [err, setErr] = useState<string | null>(null);

  const scelte = d ? (o.ids ?? d.aree.map((a) => a.id)) : [];
  const areaId = areaSel ?? scelte[0] ?? null;
  const idGruppiArea = useMemo(() => (d && areaId ? d.gruppi.filter((g) => g.area_id === areaId && g.attivo).map((g) => g.id) : []), [d, areaId]);
  const chiaveArea = idGruppiArea.join(",");

  // assenze avvisate oggi: poche righe (solo oggi), colonne ridotte
  useEffect(() => {
    let vivo = true;
    void sb.from("assenze").select("id,allievo_id,data,gruppo_id,motivo,testo").eq("centro_id", centro.id).eq("data", isoGiorno()).then((a: { data: unknown; error: { message: string } | null }) => {
      if (!vivo) return;
      if (a.error) setErr(a.error.message); else setAssenzeOggi((a.data ?? []) as AssenzaR[]);
    });
    return () => { vivo = false; };
  }, [sb, centro.id]);

  // percentuale di presenza dell'area, calcolata dal database
  useEffect(() => {
    if (!areaId) { setPres({ area: "", perc: null }); return; }
    let vivo = true;
    void sb.rpc("area_presenze_mese", { p_centro: centro.id, p_area: areaId }).then((x: { data: unknown; error: { message: string } | null }) => {
      if (!vivo) return;
      if (x.error) setErr(x.error.message); else setPres({ area: areaId, perc: x.data === null ? null : Number(x.data) });
    });
    return () => { vivo = false; };
  }, [sb, centro.id, areaId]);

  // allievi e iscritti per gruppo dell'area scelta, contati dal database
  const conteggi = useConteggi(sb, centro.id, areaId ? [areaId] : [], d);

  // allievi dell'area con un'assenza oggi: un'unica lettura per id, mai una per riga
  const idAssenti = useMemo(() => {
    if (!d || !assenzeOggi) return "";
    const alunniArea = new Set(idGruppiArea.flatMap((g) => allieviDelGruppo(d.iscrizioni, g)));
    return [...new Set(assenzeOggi.filter((a) => alunniArea.has(a.allievo_id)).map((a) => a.allievo_id))].join(",");
  }, [d, assenzeOggi, idGruppiArea]);
  useEffect(() => {
    if (!idAssenti) return;
    let vivo = true;
    void sb.from("allievi").select("id,nome,cognome,data_nascita,certificato_scade").in("id", idAssenti.split(",")).then((x: { data: unknown }) => {
      if (vivo) setNomi(new Map(((x.data ?? []) as AllievoL[]).map((a) => [a.id, a])));
    });
    return () => { vivo = false; };
  }, [sb, idAssenti]);

  const persona = o.membroAttivo ? nomeCompleto(o.membroAttivo) : "";
  const schermo = (corpo: React.ReactNode, titolo?: string, sopra?: string) => (
    <SchermoCentro ruolo="area" tab="area" titolo={titolo ?? sostituisci(t.titolo, { a: "" })} sopra={sopra ?? centro.nome}
      azioni={<Link href={ROTTE_APP.profili} className="chip" style={{ background: "#232326", color: "#F3F6F1", height: 34 }}><Ico nome="swap" size={14} />{t.cambiaRuolo}</Link>}>
      {corpo}
    </SchermoCentro>
  );
  if (!d || !assenzeOggi || !pres || (areaId && !conteggi.riepilogo)) return schermo(o.errore || err ? <Errore messaggio={o.errore ?? err} onRiprova={() => void o.carica()} /> : <Caricamento />);

  const area = d.aree.find((a) => a.id === areaId);
  if (!area) return schermo(<Vuoto titolo={t.vuotoT} testo={t.vuotoS} icona="star" />);

  const gruppi = d.gruppi.filter((g) => g.area_id === area.id && g.attivo);
  const idG = new Set(gruppi.map((g) => g.id));
  // `d.iscrizioni` contiene già solo le iscrizioni in corso
  const alunni = new Set(gruppi.flatMap((g) => allieviDelGruppo(d.iscrizioni, g.id)));
  const nAlunni = conteggi.riepilogo?.attivi ?? 0;
  const maestri = new Set(d.gm.filter((x) => idG.has(x.gruppo_id)).map((x) => x.membro_id));
  const perc = pres.area === area.id ? pres.perc : null;

  const lun = inizioSettimana(), dom = isoGiorno(aggiungiGiorni(lun, 6)), l0 = isoGiorno(lun);
  const cambi = d.cambi.filter((c) => idG.has(c.gruppo_id) && c.data >= l0 && c.data <= dom).sort((a, b) => (a.data > b.data ? 1 : -1));
  const num = (id: string | null) => d.campi.find((c) => c.id === id)?.numero ?? "?";
  const assenze = assenzeOggi.filter((a) => alunni.has(a.allievo_id));

  return schermo(
    <div className="og-pagina">
      {scelte.length > 1 && <Chips>{scelte.map((id) => <Chip key={id} on={id === area.id} onClick={() => setAreaSel(id)}>{d.aree.find((a) => a.id === id)?.nome}</Chip>)}</Chips>}
      <div className="g4" style={{ gap: 6 }}>
        <Tile valore={gruppi.length} etichetta={t.gruppi} /><Tile valore={nAlunni} etichetta={t.allievi} />
        <Tile valore={perc === null ? "—" : `${perc}%`} etichetta={t.presenze} /><Tile valore={maestri.size} etichetta={t.maestri} />
      </div>
      <div className="og-dash c2">
        <div className="og-colonna">
          <Sezione titolo={t.gruppiT} azione={<Link href={r.dt.gruppi} style={{ fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{t.tutti}</Link>} />
          {gruppi.length === 0 && <div className="og-s">{t.nessunGruppo}</div>}
          {gruppi.map((g) => {
            const c = d.campi.find((x) => x.id === g.campo_id);
            const m = maestriDi(d, g.id);
            return (
              <div key={g.id} className="li" style={{ padding: "9px 12px" }}>
                <span className="dot" style={{ background: colorePerArea(d, g.area_id) }} />
                <span className="grow"><span className="t" style={{ display: "block", fontSize: 14.5 }}>{g.nome} · {fmtGiorni(g.giorni)} {fmtOra(g.ora)}</span>
                  <span className="s" style={{ display: "block" }}>{sostituisci(t.sub, { m: m.length ? m.map(nomeCompleto).join(" · ") : t.nessunMaestro, n: conteggi.perGruppo?.get(g.id) ?? 0 })}</span></span>
                <Tag>{c ? sostituisci(t.campo, { n: c.numero }) : t.senzaCampo}</Tag>
              </div>
            );
          })}
        </div>
        <div className="og-colonna">
          <Sezione titolo={t.cambiT} azione={<span className="muted">{t.settimana}</span>} />
          {cambi.length === 0 && <div className="og-s">{t.nessunCambio}</div>}
          {cambi.map((c) => (
            <div key={c.id} className="card og-card" style={{ flexDirection: "row", alignItems: "center", gap: 10, borderColor: "rgba(255,159,67,.5)", padding: "10px 12px" }}>
              <span className="ic" style={{ color: "#FF9F43" }}><Ico nome="swap" size={20} /></span>
              <span className="grow"><span className="og-t" style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{d.gruppi.find((g) => g.id === c.gruppo_id)?.nome} · {fmtData(c.data)}</span>
                <span className="og-s" style={{ display: "block" }}>{sostituisci(t.cambio, { a: num(c.campo_da), b: num(c.campo_a), m: c.motivo ?? "" })}</span></span>
              <Link href={r.dt.campiOrari} style={{ fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{t.apri}</Link>
            </div>
          ))}
          <Sezione titolo={t.assT} azione={<span className="muted">{fmtData(o.oggi)}</span>} />
          {assenze.length === 0 && <div className="og-s">{t.nessunaAss}</div>}
          {assenze.map((a) => {
            const al = nomi.get(a.allievo_id);
            const g = d.gruppi.find((x) => x.id === a.gruppo_id) ?? gruppi.find((x) => allieviDelGruppo(d.iscrizioni, x.id).includes(a.allievo_id));
            if (!al) return null;
            return (
              <div key={a.id} className="li" style={{ padding: "9px 12px" }}>
                <Avatar nome={al.nome} cognome={al.cognome} size={34} />
                <span className="grow"><span className="t" style={{ display: "block", fontSize: 14.5 }}>{nomeAllievo(al)}{g ? ` · ${g.nome}` : ""}</span>
                  <span className="s" style={{ display: "block" }}>{sostituisci(t.oggi, { o: fmtOra(g?.ora), m: (t[`m_${a.motivo}` as keyof typeof IT] as string | undefined) ?? a.motivo ?? "" })}</span></span>
                <Tag>{t.avvisata}</Tag>
              </div>
            );
          })}
        </div>
      </div>
      <Btn href={r.area.avviso} icona="bell">{t.avviso}</Btn>
    </div>,
    sostituisci(t.titolo, { a: area.nome }),
    o.eResp ? sostituisci(t.sopra, { p: persona, a: area.sigla || area.nome }) : sostituisci(t.sopraDt, { centro: centro.nome }),
  );
}
