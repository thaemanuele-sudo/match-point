"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import ThreadChat from "./ThreadChat";
import { nomeConv, useConversazioni, type Conv } from "./conversazioni";
import { etichettaDest, useAvvisiInviati, useNomi } from "./avvisi";
import { f, hhmm, iniziali, inSilenzio, nomeMembro, quandoLista, useMio, useRealtime } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Messaggi",
  allievi: "Allievi",
  famiglie: "Famiglie",
  gruppi: "Gruppi",
  nuovoAvviso: "Nuovo avviso al gruppo",
  notifiche: "Notifiche e cambi",
  disponibilita: "Silenzio dalle {da} alle {a}",
  rispondi: "Rispondi entro le {da}",
  attivo: "Attivo ora",
  inSilenzio: "In silenzio",
  caricamento: "Carico le conversazioni…",
  vuotoAllievi: "Nessuna chat con gli allievi ancora.",
  vuotoFamiglie: "Nessuna chat con le famiglie ancora.",
  vuotoGruppi: "Non hai ancora mandato avvisi ai gruppi.",
  apri: "Apri conversazione con {nome}",
  tagAllievo: "Visibile ai genitori",
  tagFamiglia: "Chat con la famiglia",
  tagGruppo: "Avviso al gruppo · letto da {l} su {t}",
  piedeAl: "Visibile ai genitori fino ai {anni} anni. I messaggi non si cancellano.",
  piedeFa: "Conversazione conservata dal centro. I messaggi non si cancellano.",
  piedeGr: "Gli avvisi restano archiviati. I messaggi non si cancellano.",
  rispondiA: "Scrivi o scegli una risposta rapida",
  altre: "Carica altre conversazioni",
  apriChat: "Apri tutta la conversazione",
  nessunMsg: "Ancora nessun messaggio.",
  tu: "Tu",
  r1a: "Va benissimo",
  r1b: "Ci vediamo domani",
  r1c: "Bravo!",
  r2a: "Nessun problema",
  r2b: "Confermo l'orario",
  r2c: "Grazie, a presto",
  famigliaDi: "Famiglia di {nome}",
  chatDi: "Chat di {nome}",
  segreteria: "Segreteria",
  staff: "Staff",
  destCentro: "Tutto il centro",
  destFamiglie: "Famiglie di {nome}",
  destArea: "Area {nome}",
  destTutti: "Tutti i miei allievi",
};
const T = { it, en: { ...it } };

type Vista = "al" | "fa" | "gr";

export default function MaestroMessaggi() {
  const t = useT(T);
  const { me, centro, base, imp, sb } = useMio();
  const avvisi = useAvvisiInviati("miei", 15);
  const nomi = useNomi();
  const [vista, setVista] = useState<Vista>("al");
  const { conv, errore, ricarica, altre, ancora } = useConversazioni({ tipi: [vista === "fa" ? "famiglia_maestro" : "allievo_maestro"], attivo: vista !== "gr" });
  const [sel, setSel] = useState<string | null>(null);
  const [nonLette, setNonLette] = useState(0);

  const et = { famigliaDi: t.famigliaDi, chatDi: t.chatDi, segreteria: t.segreteria, staff: t.staff };
  const righe = useMemo<Conv[]>(() => (vista === "gr" ? [] : conv ?? []), [conv, vista]);
  const idSel = vista === "gr" ? (avvisi.lista ?? []).find((a) => a.id === sel)?.id ?? avvisi.lista?.[0]?.id ?? null : righe.find((c) => c.id === sel)?.id ?? righe[0]?.id ?? null;
  const corrente = righe.find((c) => c.id === idSel) ?? null;
  const avvCorr = vista === "gr" ? (avvisi.lista ?? []).find((a) => a.id === idSel) ?? null : null;

  // quante notifiche nuove (cambi campo, assenze…) mostrare accanto al collegamento M13
  useEffect(() => {
    if (!sb || !me) return;
    sb.from("notifiche").select("id", { count: "exact", head: true }).eq("membro_id", me.id).is("letta_il", null).then((r) => setNonLette(r.count ?? 0));
  }, [sb, me, conv]);
  useRealtime(sb, `cm-notif-conta-${me?.id ?? "x"}`, "notifiche", me ? `membro_id=eq.${me.id}` : null, "INSERT", () => setNonLette((n) => n + 1));

  if (!me || !centro) return <Caric testo={t.caricamento} />;
  const silenzio = inSilenzio(imp);
  const rapide = vista === "al" ? [t.r1a, t.r1b, t.r1c] : [t.r2a, t.r2b, t.r2c];

  return (
    <SchermoCentro
      ruolo="maestro"
      tab="messaggi"
      titolo={t.titolo}
      sopra={`${nomeMembro(me)} · ${centro.nome}`}
      azioni={
        <Link href={`${base}/maestro/avviso`} className="icon" aria-label={t.nuovoAvviso}>
          <Ic n="bell" size={18} />
        </Link>
      }
    >
      <div className="cm-col" style={{ gap: 8 }}>
        <div className="li" style={{ padding: "7px 12px", gap: 10, borderRadius: 14 }}>
          <span style={{ color: silenzio ? "#FFD54A" : "#4CD07D", display: "flex" }}>
            <Ic n="clock" size={16} />
          </span>
          <span className="cm-grow" style={{ fontSize: 12.5 }}>
            <b>{f(t.rispondi, { da: hhmm(imp.silenzio_da) })}</b>
            <span className="cm-muted"> · {f(t.disponibilita, { da: hhmm(imp.silenzio_da), a: hhmm(imp.silenzio_a) })}</span>
          </span>
          <span className={`cm-tag ${silenzio ? "g" : "v"}`}>{silenzio ? t.inSilenzio : t.attivo}</span>
        </div>

        <Link href={`${base}/maestro/notifiche`} className="li" style={{ padding: "7px 12px", gap: 10, borderRadius: 14 }}>
          <span style={{ color: "#D8F34A", display: "flex" }}>
            <Ic n="swap" size={16} />
          </span>
          <span className="cm-grow" style={{ fontSize: 13, fontWeight: 700 }}>{t.notifiche}</span>
          {nonLette > 0 && <span className="cm-tag g">{nonLette}</span>}
        </Link>

        <div className="seg" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
          {([["al", t.allievi], ["fa", t.famiglie], ["gr", t.gruppi]] as [Vista, string][]).map(([k, l]) => (
            <button key={k} type="button" className={k === vista ? "sg on" : "sg"} onClick={() => { setVista(k); setSel(null); }}>
              {l}
            </button>
          ))}
        </div>

        <ErroreC testo={errore ?? avvisi.errore} />
        {conv === null && vista !== "gr" ? (
          <Caric testo={t.caricamento} />
        ) : vista === "gr" ? (
          avvisi.lista === null ? (
            <Caric testo={t.caricamento} />
          ) : avvisi.lista.length === 0 ? (
            <VuotoC>{t.vuotoGruppi}</VuotoC>
          ) : (
            <div className="cm-col s">
              {avvisi.lista.map((a) => {
                const dest = etichettaDest(a.destinatari, nomi, { centro: t.destCentro, famiglieDi: t.destFamiglie, area: t.destArea, tutti: t.destTutti });
                return (
                  <button key={a.id} type="button" className={`cm-li${a.id === idSel ? " on" : ""}`} onClick={() => setSel(a.id)} aria-label={t.apri.replace("{nome}", dest)}>
                    <span className="cm-av" style={{ fontSize: 11 }}>{iniziali(dest)}</span>
                    <span className="cm-grow">
                      <span className="cm-ell" style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{dest}</span>
                      <span className="cm-ell cm-muted" style={{ display: "block", fontSize: 12, marginTop: 1 }}>{a.titolo}</span>
                    </span>
                    <span className="cm-muted" style={{ fontSize: 11.5, fontWeight: 700, flex: "none" }}>{quandoLista(a.created_at)}</span>
                  </button>
                );
              })}
            </div>
          )
        ) : righe.length === 0 ? (
          <VuotoC>{vista === "al" ? t.vuotoAllievi : t.vuotoFamiglie}</VuotoC>
        ) : (
          <div className="cm-col s">
            {righe.map((c) => {
              const nome = nomeConv(c, me.id, et);
              return (
                <button key={c.id} type="button" className={`cm-li${c.id === idSel ? " on" : ""}`} onClick={() => setSel(c.id)} aria-label={t.apri.replace("{nome}", nome)}>
                  <span className="cm-av">{iniziali(nome)}</span>
                  <span className="cm-grow">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="cm-ell" style={{ fontSize: 14, fontWeight: 700 }}>{nome}</span>
                      {c.nuovo && <span className="cm-pallino" />}
                    </span>
                    <span className="cm-ell cm-muted" style={{ display: "block", fontSize: 12, marginTop: 1 }}>{c.ultimo?.testo ?? t.nessunMsg}</span>
                  </span>
                  <span className="cm-muted" style={{ fontSize: 11.5, fontWeight: 700, flex: "none" }}>{c.ultimo ? quandoLista(c.ultimo.created_at) : ""}</span>
                </button>
              );
            })}
          </div>
        )}

        {vista !== "gr" && ancora && (
          <button type="button" className="cm-bt2" style={{ height: 36, fontSize: 13 }} onClick={altre}>
            {t.altre}
          </button>
        )}

        {corrente && (
          <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, borderColor: "rgba(216,243,74,.2)" }}>
            <div className="cm-row">
              <span className="cm-grow" style={{ fontSize: 13.5, fontWeight: 800 }}>{nomeConv(corrente, me.id, et)}</span>
              <span className={`cm-tag${vista === "al" ? " v" : ""}`}>
                {vista === "al" && <Ic n="eye" size={12} />}
                {vista === "al" ? t.tagAllievo : t.tagFamiglia}
              </span>
            </div>
            <ThreadChat id={corrente.id} rapide={rapide} segnaposto={t.rispondiA} piede={vista === "al" ? f(t.piedeAl, { anni: imp.chat_genitori_fino }) : t.piedeFa} onInviato={ricarica} />
            <Link href={`${base}/chat/${corrente.id}`} className="cm-bt2" style={{ height: 38, fontSize: 13 }}>
              {t.apriChat}
            </Link>
          </div>
        )}

        {avvCorr && (
          <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, borderColor: "rgba(216,243,74,.2)" }}>
            <div className="cm-row">
              <span className="cm-grow" style={{ fontSize: 13.5, fontWeight: 800 }}>{avvCorr.titolo}</span>
              <span className="cm-tag">{f(t.tagGruppo, { l: avvCorr.letti, t: avvCorr.tot })}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{avvCorr.testo}</div>
            <div className="cm-piede">
              <Ic n="lock" size={11} sw={2.2} />
              {t.piedeGr}
            </div>
            <Link href={`${base}/maestro/avviso`} className="cm-bt2" style={{ height: 38, fontSize: 13 }}>
              {t.nuovoAvviso}
            </Link>
          </div>
        )}
      </div>
    </SchermoCentro>
  );
}
