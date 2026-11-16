"use client";
import { useEffect, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import ThreadChat from "./ThreadChat";
import { assicuraConversazione, useConversazioni } from "./conversazioni";
import { caricaDatiAllievo, useFigli } from "./famiglia";
import { f, hhmm, iniziali, messaggioErrore, nomeMembro, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  sopra: "Il mio maestro",
  maestroGenerico: "Il maestro",
  banner: "Anche mamma e papà possono leggere",
  scrivi: "Scrivi a {nome}…",
  r1: "Compiti fatti",
  r2: "Non vengo",
  r3: "Una domanda",
  piede: "{nome} risponde fino alle {ora}. Dopo, ti scrive il giorno dopo.",
  caricamento: "Carico la chat…",
  nessunMaestro: "Non hai ancora un maestro nel gruppo. Chiedi a un adulto del centro.",
  inizia: "Scrivi al maestro",
  nuova: "Qui puoi scrivere al tuo maestro.",
  invia: "Invia il messaggio",
};
const T = { it, en: { ...it } };

/** A3: chat dell'allievo con il maestro. Le famiglie la leggono (partecipanti in sola lettura). */
export default function AllievoChat() {
  const t = useT(T);
  const { sb, me, centro, imp } = useMio();
  const { figlio } = useFigli("allievo");
  const { conv, errore, ricarica } = useConversazioni({ tipi: ["allievo_maestro"], allievoId: figlio?.id ?? null, attivo: !!figlio });
  const [maestro, setMaestro] = useState<{ id: string; nome: string } | null>(null);
  const [famiglia, setFamiglia] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sb || !figlio) return;
    caricaDatiAllievo(sb, figlio.id).then((d) => setMaestro(d.maestro ? { id: d.maestro.id, nome: nomeMembro(d.maestro) } : null));
    sb.from("allievi_famiglie").select("membro_id").eq("allievo_id", figlio.id).then((r) => setFamiglia(((r.data ?? []) as { membro_id: string }[]).map((x) => x.membro_id)));
  }, [sb, figlio]);

  const chat = conv?.find((c) => c.tipo === "allievo_maestro" && (!figlio || c.allievo_id === figlio.id));
  const nomeM = nomeMembro(chat?.parti.find((p) => p.ruolo === "maestro")) || maestro?.nome || t.maestroGenerico;
  const primo = nomeM.split(" ")[0];

  async function inizia() {
    if (!sb || !centro || !me || !figlio || !maestro) return;
    setErr(null);
    try {
      // i genitori entrano nella chat in sola lettura: nessuna chat nascosta tra adulto e minore
      await assicuraConversazione(sb, centro.id, me.id, "allievo_maestro", figlio.id, [{ membro_id: maestro.id }, ...famiglia.map((g) => ({ membro_id: g, sola_lettura: true }))]);
      await ricarica();
    } catch (e) {
      setErr(messaggioErrore(e));
    }
  }

  return (
    <SchermoCentro ruolo="allievo" tab="maestro" titolo={nomeM} sopra={t.sopra} azioni={<span className="cm-av l" aria-hidden="true">{iniziali(nomeM)}</span>}>
      <div className="cm-col" style={{ gap: 9 }}>
        <div className="cm-banner">
          <Ic n="eye" size={18} sw={2.2} style={{ color: "#D8F34A" }} />
          <span style={{ fontWeight: 800 }}>{t.banner}</span>
        </div>
        <ErroreC testo={err ?? errore} />
        {!me || !figlio || conv === null ? (
          <Caric testo={t.caricamento} />
        ) : chat ? (
          <>
            <ThreadChat id={chat.id} stile="bimbo" separaGiorni rapide={[t.r1, t.r2, t.r3]} rapideInvia segnaposto={f(t.scrivi, { nome: primo })} piede={f(t.piede, { nome: primo, ora: hhmm(imp.silenzio_da) })} />
          </>
        ) : maestro ? (
          <div className="cm-col">
            <VuotoC>{t.nuova}</VuotoC>
            <button type="button" className="cm-bt" onClick={inizia}>
              {t.inizia}
            </button>
          </div>
        ) : (
          <VuotoC>{t.nessunMaestro}</VuotoC>
        )}
      </div>
    </SchermoCentro>
  );
}
