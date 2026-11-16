"use client";
import { useCallback, useEffect, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import ThreadChat from "./ThreadChat";
import { assicuraConversazione, useConversazioni, type Conv } from "./conversazioni";
import { caricaDatiAllievo, eta, useFigli } from "./famiglia";
import { dataBreve, f, hhmm, messaggioErrore, nomeMembro, oraIt, useMio } from "./comuni";
import type { Avviso } from "./avvisi";
import "./comunicazione.css";

const it = {
  titolo: "Messaggi",
  silenzio: "Silenzio dopo le {da}",
  maestro: "Maestro",
  chatFiglio: "Chat figlio",
  segreteria: "Segreteria",
  avvisi: "Avvisi",
  bannerMaestro: "Chat privata tra te e {nome}. Il direttore tecnico non la legge, salvo segnalazioni.",
  bannerFiglio: "Visibile ai genitori · sola lettura. Qui leggi la chat di {figlio} con {nome}, fino ai {anni} anni.",
  bannerFiglioOltre: "{figlio} ha più di {anni} anni: la sua chat con il maestro è privata e non è più visibile ai genitori.",
  bannerSegreteria: "Chat con la segreteria del {centro}.",
  bannerAvvisi: "Avvisi del centro, in sola lettura. Tocca per confermare di aver letto.",
  scrivi: "Scrivi a {nome}",
  scriviSegr: "Scrivi alla segreteria",
  maestroGenerico: "il maestro",
  caricamento: "Carico i messaggi…",
  nessunFiglio: "Non ci sono figli collegati al tuo account.",
  nessunaChat: "Non c'è ancora una conversazione. Puoi iniziarla ora.",
  nessunaChatFiglio: "Il tuo figlio non ha ancora scritto al maestro.",
  inizia: "Inizia la conversazione",
  nessunAvviso: "Nessun avviso ricevuto.",
  avvisoCentro: "Avviso del centro",
  letto: "Letto",
  conferma: "Conferma di aver letto",
  apri: "Apri la conversazione a tutto schermo",
  figlio: "Figlio",
  ora: "adesso",
};
const T = { it, en: { ...it } };
type Vista = "maestro" | "figlio" | "segreteria" | "avvisi";

export default function GenitoreMessaggi() {
  const t = useT(T);
  const { sb, me, centro, base, imp } = useMio();
  const { conv, errore, ricarica } = useConversazioni();
  const { figli, figlio, setSel } = useFigli("genitore");
  const [vista, setVista] = useState<Vista>("maestro");
  const [err, setErr] = useState<string | null>(null);
  const [crea, setCrea] = useState(false);
  const [maestroNome, setMaestroNome] = useState("");
  const [avvisi, setAvvisi] = useState<(Avviso & { letto: boolean })[] | null>(null);

  // nome del maestro del figlio, per i testi del banner
  useEffect(() => {
    if (!sb || !figlio) return;
    caricaDatiAllievo(sb, figlio.id).then((d) => setMaestroNome(nomeMembro(d.maestro)));
  }, [sb, figlio]);

  const caricaAvvisi = useCallback(async () => {
    if (!sb || !centro || !me) return;
    const { data } = await sb.from("avvisi").select("id,autore_id,titolo,testo,destinatari,conferma,promemoria,consegna_il,created_at").eq("centro_id", centro.id).order("created_at", { ascending: false }).limit(30);
    const ora = Date.now();
    const lista = ((data ?? []) as Avviso[]).filter((a) => !a.consegna_il || new Date(a.consegna_il).getTime() <= ora);
    const ids = lista.map((a) => a.id);
    const lette = new Set<string>();
    if (ids.length) {
      const { data: l } = await sb.from("avvisi_letture").select("avviso_id").eq("membro_id", me.id).in("avviso_id", ids);
      ((l ?? []) as { avviso_id: string }[]).forEach((x) => lette.add(x.avviso_id));
    }
    setAvvisi(lista.map((a) => ({ ...a, letto: lette.has(a.id) })));
  }, [sb, centro, me]);
  useEffect(() => {
    if (vista === "avvisi") caricaAvvisi();
  }, [vista, caricaAvvisi]);

  async function confermaLetto(a: Avviso) {
    if (!sb || !centro || !me) return;
    const { error } = await sb.from("avvisi_letture").insert({ centro_id: centro.id, avviso_id: a.id, membro_id: me.id, letto_il: new Date().toISOString() });
    if (error && !/duplicate|unique/i.test(error.message)) setErr(messaggioErrore(error));
    caricaAvvisi();
  }

  // quale conversazione corrisponde alla scheda scelta
  const trova = (): Conv | undefined => {
    const c = conv ?? [];
    if (vista === "maestro") return c.find((x) => x.tipo === "famiglia_maestro" && !x.miaSolaLettura && (!figlio || !x.allievo_id || x.allievo_id === figlio.id));
    if (vista === "figlio") return c.find((x) => x.tipo === "allievo_maestro" && x.allievo_id === figlio?.id);
    if (vista === "segreteria") return c.find((x) => x.tipo === "famiglia_segreteria" && (!figlio || !x.allievo_id || x.allievo_id === figlio.id));
    return undefined;
  };
  const corrente = trova();

  // se la conversazione non esiste, il genitore può aprirla (dipende dalle regole del database: l'errore si mostra)
  async function inizia() {
    if (!sb || !centro || !me || !figlio) return;
    setCrea(true);
    setErr(null);
    try {
      if (vista === "maestro") {
        const d = await caricaDatiAllievo(sb, figlio.id);
        if (!d.maestro) throw new Error(t.maestroGenerico);
        await assicuraConversazione(sb, centro.id, me.id, "famiglia_maestro", figlio.id, [{ membro_id: d.maestro.id }]);
      } else {
        const { data } = await sb.from("membri").select("id").eq("centro_id", centro.id).eq("ruolo", "segreteria").limit(1);
        const s = ((data ?? []) as { id: string }[])[0];
        await assicuraConversazione(sb, centro.id, me.id, "famiglia_segreteria", figlio.id, s ? [{ membro_id: s.id }] : []);
      }
      await ricarica();
    } catch (e) {
      setErr(messaggioErrore(e));
    } finally {
      setCrea(false);
    }
  }

  if (!me || !centro) return <Caric testo={t.caricamento} />;
  const oltre = !!figlio && (eta(figlio.data_nascita) ?? 0) >= imp.chat_genitori_fino;
  const nomeM = maestroNome || t.maestroGenerico;
  const banner = vista === "maestro" ? f(t.bannerMaestro, { nome: nomeM }) : vista === "figlio" ? (oltre ? f(t.bannerFiglioOltre, { figlio: figlio?.nome ?? "", anni: imp.chat_genitori_fino }) : f(t.bannerFiglio, { figlio: figlio?.nome ?? "", nome: nomeM, anni: imp.chat_genitori_fino })) : vista === "segreteria" ? f(t.bannerSegreteria, { centro: centro.nome }) : t.bannerAvvisi;

  return (
    <SchermoCentro
      ruolo="genitore"
      tab="messaggi"
      titolo={t.titolo}
      sopra={`${figlio?.nome ?? ""} · ${centro.nome}`}
      azioni={
        <span className="tag" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 9px" }}>
          <Ic n="moon" size={13} sw={2.2} />
          {f(t.silenzio, { da: hhmm(imp.silenzio_da) })}
        </span>
      }
    >
      <div className="cm-col" style={{ gap: 9 }}>
        {figli && figli.length > 1 && (
          <div className="chips" role="group" aria-label={t.figlio}>
            {figli.map((x) => (
              <button key={x.id} type="button" className={x.id === figlio?.id ? "chip on" : "chip"} onClick={() => setSel(x.id)}>
                {x.nome}
              </button>
            ))}
          </div>
        )}
        <div className="seg" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }} role="group">
          {([["maestro", t.maestro], ["figlio", t.chatFiglio], ["segreteria", t.segreteria], ["avvisi", t.avvisi]] as [Vista, string][]).map(([k, l]) => (
            <button key={k} type="button" className={k === vista ? "sg on" : "sg"} style={{ fontSize: 12.5 }} onClick={() => { setVista(k); setErr(null); }}>
              {l}
            </button>
          ))}
        </div>
        <div className="note" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Ic n="eye" size={16} style={{ color: "#D8F34A" }} />
          <span style={{ color: "#E5E5EA" }}>{banner}</span>
        </div>
        <ErroreC testo={err ?? errore} />

        {figli === null || conv === null ? (
          <Caric testo={t.caricamento} />
        ) : figli.length === 0 ? (
          <VuotoC>{t.nessunFiglio}</VuotoC>
        ) : vista === "avvisi" ? (
          avvisi === null ? (
            <Caric testo={t.caricamento} />
          ) : avvisi.length === 0 ? (
            <VuotoC>{t.nessunAvviso}</VuotoC>
          ) : (
            <div className="cm-col">
              {avvisi.map((a) => (
                <div key={a.id} className="cm-bw">
                  <div className="cm-b" style={{ maxWidth: "92%" }}>
                    <div className="chi">{t.avvisoCentro} · {a.titolo}</div>
                    <div className="tx">{a.testo}</div>
                    <div className="or">
                      {dataBreve(a.created_at)} · {oraIt(a.created_at)}
                      {a.letto ? ` · ${t.letto}` : ""}
                    </div>
                    {a.conferma && !a.letto && (
                      <button type="button" className="cm-bt2" style={{ height: 34, fontSize: 12.5, marginTop: 8 }} onClick={() => confermaLetto(a)}>
                        <Ic n="check" size={14} />
                        {t.conferma}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : vista === "figlio" && oltre ? (
          <VuotoC>{banner}</VuotoC>
        ) : corrente ? (
          <>
            <ThreadChat id={corrente.id} mostraAutore soloLettura={vista === "figlio"} segnaposto={vista === "segreteria" ? t.scriviSegr : f(t.scrivi, { nome: nomeM })} />
            <a className="cm-bt2" href={`${base}/chat/${corrente.id}`} style={{ height: 38, fontSize: 13 }}>
              {t.apri}
            </a>
          </>
        ) : vista === "figlio" ? (
          <VuotoC>{t.nessunaChatFiglio}</VuotoC>
        ) : (
          <div className="cm-col">
            <VuotoC>{t.nessunaChat}</VuotoC>
            <button type="button" className="cm-bt" onClick={inizia} disabled={crea}>
              {t.inizia}
            </button>
          </div>
        )}
      </div>
    </SchermoCentro>
  );
}
