"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC } from "./stati";
import ThreadChat from "./ThreadChat";
import { caricaParti, nomeConv, type Parte, type TipoConv } from "./conversazioni";
import { f, hhmm, nomeCorto, nomeMembro, ruoloSchermo, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  caricamento: "Carico la conversazione…",
  nonTrovata: "Conversazione non trovata o non visibile.",
  famigliaDi: "Famiglia di {nome}",
  chatDi: "Chat di {nome}",
  segreteria: "Segreteria",
  staff: "Staff",
  bannerAl: "Visibile ai genitori fino ai {anni} anni",
  bannerAlBimbo: "Anche mamma e papà possono leggere",
  bannerFa: "Conversazione conservata dal centro",
  bannerSegr: "Chat con la segreteria del centro",
  bannerStaff: "Conversazione dello staff",
  scrivi: "Scrivi un messaggio",
  r1: "Va bene, grazie",
  r2: "Ci vediamo alla prossima lezione",
  r3: "Ti scrivo domani",
  rb1: "Compiti fatti",
  rb2: "Non vengo",
  rb3: "Una domanda",
  conv: "Conversazione",
  piedeBimbo: "Risponde fino alle {ora}. Dopo, ti scrive il giorno dopo.",
};
const T = { it, en: { ...it } };

type Riga = { id: string; tipo: TipoConv; allievo_id: string | null; titolo: string | null };

/** Pagina conversazione /c/[slug]/chat/[id], uguale per tutti i ruoli: cambiano solo grafica, etichetta e diritto di scrivere. */
export default function ChatConversazione() {
  const t = useT(T);
  const { id } = useParams<{ id: string }>();
  const { sb, me, ruolo, base, imp } = useMio();
  const [c, setC] = useState<Riga | null>(null);
  const [parti, setParti] = useState<Parte[]>([]);
  const [allievoNome, setAllievoNome] = useState("");
  const [stato, setStato] = useState<"carico" | "ok" | "no">("carico");

  useEffect(() => {
    if (!sb || !id) return;
    (async () => {
      const { data } = await sb.from("conversazioni").select("id,tipo,allievo_id,titolo").eq("id", id).maybeSingle();
      if (!data) return setStato("no");
      const r = data as Riga;
      const p = (await caricaParti(sb, [id]))[id] ?? [];
      if (r.allievo_id) {
        const { data: a } = await sb.from("allievi").select("nome,cognome").eq("id", r.allievo_id).maybeSingle();
        setAllievoNome(nomeCorto(a as { nome: string; cognome: string | null } | null));
      }
      setC(r);
      setParti(p);
      setStato("ok");
    })();
  }, [sb, id]);

  const rs = ruoloSchermo(ruolo);
  const tab = rs === "allievo" ? "maestro" : rs === "dt" ? "tutela" : "messaggi";
  const indietro = `${base}/${rs === "dt" ? "dt" : rs}${rs === "maestro" ? "/messaggi" : rs === "genitore" ? "/messaggi" : rs === "allievo" ? "/chat" : ""}`;

  if (stato === "carico" || !me) return <SchermoCentro ruolo={rs} tab={tab} titolo="…" indietro={indietro}><Caric testo={t.caricamento} /></SchermoCentro>;
  if (stato === "no" || !c) return <SchermoCentro ruolo={rs} tab={tab} titolo={t.conv} indietro={indietro}><ErroreC testo={t.nonTrovata} /></SchermoCentro>;

  const conv = { ...c, created_at: "", parti, allievoNome, ultimo: null, nuovo: false, miaSolaLettura: false };
  const mioRuolo = parti.find((p) => p.membro_id === me.id)?.ruolo ?? ruolo;
  const nome = nomeConv(conv, me.id, { famigliaDi: t.famigliaDi, chatDi: t.chatDi, segreteria: t.segreteria, staff: t.staff }) || nomeMembro(me);
  const bimbo = rs === "allievo";
  const banner = c.tipo === "allievo_maestro" ? (bimbo ? t.bannerAlBimbo : f(t.bannerAl, { anni: imp.chat_genitori_fino })) : c.tipo === "famiglia_segreteria" ? t.bannerSegr : c.tipo === "famiglia_maestro" ? t.bannerFa : t.bannerStaff;
  const primo = nome.split(" ")[0];
  const rapide = bimbo ? [t.rb1, t.rb2, t.rb3] : mioRuolo === "genitore" ? [] : [t.r1, t.r2, t.r3];

  return (
    <SchermoCentro ruolo={rs} tab={tab} titolo={nome} sopra={banner} indietro={indietro}>
      <div className="cm-col" style={{ gap: 9 }}>
        <div className={bimbo ? "cm-banner" : "cm-banner p"}>
          <Ic n={c.tipo === "allievo_maestro" ? "eye" : "lock"} size={16} sw={2.2} style={{ color: "#D8F34A" }} />
          <span>{banner}</span>
        </div>
        <ThreadChat id={c.id} stile={bimbo ? "bimbo" : "adulto"} alto mostraAutore={!bimbo} separaGiorni={bimbo} rapide={rapide} rapideInvia={bimbo} segnaposto={t.scrivi} piede={bimbo ? f(t.piedeBimbo, { ora: hhmm(imp.silenzio_da) }) : undefined} />
        <span style={{ display: "none" }}>{primo}</span>
      </div>
    </SchermoCentro>
  );
}
