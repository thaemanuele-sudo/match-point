"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import { useListaNotifiche } from "./notifiche";
import { useUltimoCambio } from "./cambiCampo";
import { f, giornoContratto, giornoCorto, giornoNumero, hhmm, inizioLezione, iniziali, isoGiorno, nomeCorto, nomeMembro, quando, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Notifiche e cambi",
  sopra: "{nome} · {centro}",
  daVedere: "{n} da vedere",
  tuttoLetto: "Tutto letto",
  cambioK: "CAMBIO CAMPO DECISO DAL CENTRO",
  cemento: "cemento",
  terra: "terra",
  sintetico: "sintetico",
  erba: "erba",
  motivo: "Motivo: {motivo}. Deciso da {chi}.",
  motivoSolo: "Motivo: {motivo}.",
  avvisati: "Allievi e famiglie già avvisati",
  hoVisto: "Ho visto",
  visto: "Visto",
  allievi: "{l} su {t}",
  allieviLetto: "allievi hanno letto",
  famiglieLetto: "famiglie hanno letto",
  libero: "libero alle {ora}",
  occupato: "occupato alle {ora}",
  assenze: "Assenze avvisate dai bambini",
  assenzeSub: "{n} questa settimana",
  nessunaAssenza: "Nessuna assenza avvisata per i prossimi giorni.",
  famigliaAvvisata: "famiglia avvisata",
  dalCentro: "Dal centro",
  altreNotifiche: "altre notifiche",
  nessunaNotifica: "Nessuna altra notifica.",
  altre: "Carica altre notifiche",
  caricamento: "Carico le notifiche…",
  malato: "Sono malato",
  scuola: "Ho scuola",
  viaggio: "In viaggio",
  altro: "Altro",
  nessunCambio: "Nessun cambio campo in programma.",
};
const T = { it, en: { ...it } };

type Assenza = { allievo_id: string; data: string; gruppo_id: string | null; motivo: string; testo: string | null };
type Riga = Assenza & { nome: string; gruppo: string; ora: string | null; campo: string };
type Letture = { allievi_letti: number; allievi_tot: number; famiglie_letti: number; famiglie_tot: number };

/** M13: cambi campo decisi dal centro, assenze avvisate dai bambini, altre notifiche. Tutto a blocchi e con query uniche. */
export default function MaestroNotifiche() {
  const t = useT(T);
  const { sb, me, centro, base } = useMio();
  const cambiN = useListaNotifiche({ tipi: ["cambio_campo"] });
  const altre = useListaNotifiche({ escludi: ["cambio_campo", "assenza"] });
  const [gruppoIds, setGruppoIds] = useState<string[] | null>(null);
  const { cambio, campi } = useUltimoCambio(gruppoIds, gruppoIds !== null);
  const [assenze, setAssenze] = useState<Riga[] | null>(null);
  const [letture, setLetture] = useState<Letture | null>(null);
  const [libero, setLibero] = useState<boolean | null>(null);

  // i miei gruppi, per limitare cambi e assenze a quelli che mi riguardano
  useEffect(() => {
    if (!sb || !me) return;
    sb.from("gruppi_maestri").select("gruppo_id").eq("membro_id", me.id).then((r) => setGruppoIds(((r.data ?? []) as { gruppo_id: string }[]).map((x) => x.gruppo_id)));
  }, [sb, me]);

  // assenze avvisate: da oggi a +7 giorni, una query per tabella
  useEffect(() => {
    if (!sb || !centro || gruppoIds === null) return;
    (async () => {
      if (!gruppoIds.length) return setAssenze([]);
      const da = new Date();
      const a = new Date(Date.now() + 7 * 86400000);
      const { data } = await sb.from("assenze").select("allievo_id,data,gruppo_id,motivo,testo").eq("centro_id", centro.id).in("gruppo_id", gruppoIds).gte("data", isoGiorno(da)).lte("data", isoGiorno(a)).order("data").limit(50);
      const righe = (data ?? []) as Assenza[];
      const aIds = Array.from(new Set(righe.map((x) => x.allievo_id)));
      const gIds = Array.from(new Set(righe.map((x) => x.gruppo_id).filter(Boolean))) as string[];
      const [al, gr, cs] = await Promise.all([
        aIds.length ? sb.from("allievi").select("id,nome,cognome").in("id", aIds) : Promise.resolve({ data: [] }),
        gIds.length ? sb.from("gruppi").select("id,nome,ora,campo_id").in("id", gIds) : Promise.resolve({ data: [] }),
        sb.from("campi").select("id,numero").eq("centro_id", centro.id),
      ]);
      const aN = new Map(((al.data ?? []) as { id: string; nome: string; cognome: string | null }[]).map((x) => [x.id, nomeCorto(x)]));
      const gN = new Map(((gr.data ?? []) as { id: string; nome: string; ora: string | null; campo_id: string | null }[]).map((x) => [x.id, x]));
      const cN = new Map(((cs.data ?? []) as { id: string; numero: number }[]).map((x) => [x.id, x.numero]));
      setAssenze(righe.map((x) => ({ ...x, nome: aN.get(x.allievo_id) ?? "", gruppo: gN.get(x.gruppo_id ?? "")?.nome ?? "", ora: gN.get(x.gruppo_id ?? "")?.ora ?? null, campo: String(cN.get(gN.get(x.gruppo_id ?? "")?.campo_id ?? "") ?? "") })));
    })();
  }, [sb, centro, gruppoIds]);

  // letture del cambio (RPC: conteggi nel database) e campo libero (due conteggi head)
  useEffect(() => {
    if (!sb || !cambio) return;
    (async () => {
      const r = await sb.rpc("letture_cambio_campo", { cambio: cambio.id });
      const x = (Array.isArray(r.data) ? r.data[0] : r.data) as Letture | null;
      setLetture(!r.error && x ? x : null);
      if (!cambio.campo_a || !cambio.ora) return setLibero(null);
      const g = giornoContratto(inizioLezione(cambio.data, "00:00"));
      const [a, b] = await Promise.all([
        sb.from("gruppi").select("id", { count: "exact", head: true }).eq("campo_id", cambio.campo_a).eq("attivo", true).eq("ora", cambio.ora).contains("giorni", [g]).neq("id", cambio.gruppo_id),
        sb.from("cambi_campo").select("id", { count: "exact", head: true }).eq("campo_a", cambio.campo_a).eq("data", cambio.data).neq("id", cambio.id),
      ]);
      setLibero((a.count ?? 0) + (b.count ?? 0) === 0);
    })();
  }, [sb, cambio]);

  if (!me || !centro) return <Caric testo={t.caricamento} />;
  const visto = cambiN.nonLette === 0;
  const nuove = cambiN.nonLette + altre.nonLette;
  const motiviT: Record<string, string> = { malato: t.malato, scuola: t.scuola, viaggio: t.viaggio, altro: t.altro };
  const superficie = (s: string | null) => (s === "cemento" ? t.cemento : s === "terra" ? t.terra : s === "sintetico" ? t.sintetico : s === "erba" ? t.erba : "");
  const lista = altre.lista;

  return (
    <SchermoCentro ruolo="maestro" tab="messaggi" titolo={t.titolo} sopra={f(t.sopra, { nome: nomeMembro(me), centro: centro.nome })} indietro={`${base}/maestro/messaggi`} azioni={<span className={nuove ? "cm-tag g" : "cm-tag v"}>{nuove ? f(t.daVedere, { n: nuove }) : t.tuttoLetto}</span>}>
      <div className="cm-col" style={{ gap: 9 }}>
        <ErroreC testo={cambiN.errore ?? altre.errore} />
        {cambio === undefined ? (
          <Caric testo={t.caricamento} />
        ) : cambio === null ? (
          <VuotoC>{t.nessunCambio}</VuotoC>
        ) : (
          <div className="card" style={{ padding: 12, borderColor: "rgba(255,213,74,.4)", background: "#1A1810", display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="cm-row">
              <span style={{ color: "#FFD54A", display: "flex" }}><Ic n="swap" size={18} /></span>
              <span className="k cm-grow" style={{ color: "#FFD54A" }}>{t.cambioK}</span>
              <span style={{ fontSize: 11, color: "#A1A1A6", fontWeight: 700 }}>{quando(cambio.created_at)}</span>
            </div>
            <div className="disp" style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.05 }}>{cambio.gruppoNome} · {giornoCorto(cambio.data)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: 9, background: "#2A1A14", color: "#FF9F43", textDecoration: "line-through", whiteSpace: "nowrap" }}>Campo {cambio.da?.numero ?? "?"}</span>
              <Ic n="send" size={16} sw={2.4} />
              <span style={{ padding: "4px 10px", borderRadius: 9, background: "#D8F34A", color: "#0B0B0C", whiteSpace: "nowrap" }}>Campo {cambio.a?.numero ?? "?"}</span>
              <span className="muted" style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap" }}>{cambio.ora ? hhmm(cambio.ora) : ""} · {superficie(cambio.a?.superficie ?? null)}</span>
            </div>
            {cambio.motivo && <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "#C7C7CC" }}>{cambio.decisoDa ? f(t.motivo, { motivo: cambio.motivo, chi: cambio.decisoDa }) : f(t.motivoSolo, { motivo: cambio.motivo })}</div>}
            <div className="cm-row">
              <div className="cm-grow" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#4CD07D" }}>
                <Ic n="check" size={16} />
                <span>{t.avvisati}</span>
              </div>
              <button type="button" className={visto ? "btn2" : "btn"} style={{ height: 38, padding: "0 18px", fontSize: 14, flex: "none" }} aria-pressed={visto} disabled={visto} onClick={() => cambiN.segna((cambiN.lista ?? []).filter((n) => !n.letta_il).map((n) => n.id))}>
                {visto ? t.visto : t.hoVisto}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
              {letture && (
                <>
                  <Mini v={f(t.allievi, { l: letture.allievi_letti, t: letture.allievi_tot })} e={t.allieviLetto} />
                  <Mini v={f(t.allievi, { l: letture.famiglie_letti, t: letture.famiglie_tot })} e={t.famiglieLetto} />
                </>
              )}
              {libero !== null && cambio.ora && <Mini v={`Campo ${cambio.a?.numero ?? ""}`} e={f(libero ? t.libero : t.occupato, { ora: hhmm(cambio.ora) })} />}
            </div>
          </div>
        )}

        <div className="sec" style={{ marginTop: 2 }}>
          <h2 style={{ fontSize: 16 }}>{t.assenze}</h2>
          <span className="muted">{f(t.assenzeSub, { n: assenze?.length ?? 0 })}</span>
        </div>
        {assenze === null ? (
          <Caric testo={t.caricamento} />
        ) : assenze.length === 0 ? (
          <VuotoC>{t.nessunaAssenza}</VuotoC>
        ) : (
          <div className="cm-col s">
            {assenze.map((a, i) => (
              <div key={`${a.allievo_id}${a.data}${i}`} className="li" style={{ padding: "8px 12px", gap: 10, borderRadius: 15 }}>
                <span className="cm-av" style={{ width: 34, height: 34, fontSize: 12 }}>{iniziali(a.nome)}</span>
                <span className="cm-grow">
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{a.nome} · {giornoNumero(a.data)}</span>
                  <span style={{ display: "block", fontSize: 12, color: "#A1A1A6", marginTop: 1 }}>
                    {a.gruppo}{a.ora ? ` · ${hhmm(a.ora)}` : ""}{a.campo ? ` · Campo ${a.campo}` : ""} · {t.famigliaAvvisata}
                  </span>
                </span>
                <span className="tag">{motiviT[a.motivo] ?? a.motivo}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sec" style={{ marginTop: 2 }}>
          <h2 style={{ fontSize: 16 }}>{t.dalCentro}</h2>
          <span className="muted">{t.altreNotifiche}</span>
        </div>
        {lista === null ? (
          <Caric testo={t.caricamento} />
        ) : lista.length === 0 ? (
          <VuotoC>{t.nessunaNotifica}</VuotoC>
        ) : (
          <div className="cm-col s">
            {lista.map((n) => (
              <Link key={n.id} href={n.link || "#"} className="li" style={{ padding: "8px 12px", gap: 10, borderRadius: 15, opacity: n.letta_il ? 0.75 : 1 }} onClick={() => !n.letta_il && altre.segna([n.id])}>
                <span className="ic" style={{ width: 32, height: 32, borderRadius: 10 }}><Ic n={n.tipo === "segnalazione" ? "shield" : n.tipo === "compito" ? "target" : n.tipo === "messaggio" ? "chat" : "bell"} size={16} /></span>
                <span className="cm-grow">
                  <span className="cm-ell" style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{n.titolo}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "#A1A1A6", marginTop: 1 }}>{[n.mittente, quando(n.created_at)].filter(Boolean).join(" · ")}</span>
                </span>
                {!n.letta_il && <span className="cm-pallino" />}
              </Link>
            ))}
            {altre.ancora && (
              <button type="button" className="cm-bt2" onClick={altre.altre}>
                {t.altre}
              </button>
            )}
          </div>
        )}
      </div>
    </SchermoCentro>
  );
}

function Mini({ v, e }: { v: string; e: string }) {
  return (
    <div style={{ background: "#0E0E10", borderRadius: 12, padding: "6px 8px" }}>
      <div className="disp" style={{ fontSize: 19, fontWeight: 700, color: "#D8F34A", lineHeight: 1.1 }}>{v}</div>
      <div style={{ fontSize: 10.5, color: "#A1A1A6", fontWeight: 700 }}>{e}</div>
    </div>
  );
}
