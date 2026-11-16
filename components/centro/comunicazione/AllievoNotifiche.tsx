"use client";
import Link from "next/link";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import { useListaNotifiche, type Notifica } from "./notifiche";
import { useFigli, useDatiAllievo } from "./famiglia";
import { useUltimoCambio, type Campo } from "./cambiCampo";
import { dataLunga, f, hhmm, giornoCompleto, inizioLezione, nomeMembro, quando, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Le mie notifiche",
  sopra: "Ciao {nome}",
  nuove: "{n} nuove",
  nessunaNuova: "Tutto letto",
  dalCentro: "DAL CENTRO",
  piuVecchie: "PIÙ VECCHIE",
  da: "Da {chi} · {quando}",
  stessaOra: "Stessa ora: {giorno} alle {ora}. Cambia solo il campo.",
  cambio: "Cambio campo: {giorno} ti alleni sul Campo {a} ({sup}{cop}), non sul Campo {da}.",
  cemento: "cemento",
  terra: "terra",
  sintetico: "sintetico",
  erba: "erba",
  coperto: ", coperto",
  scoperto: ", scoperto",
  mappa: "Mappa dei campi: il nuovo campo è evidenziato",
  vuoto: "Non hai notifiche.",
  altre: "Carica altre notifiche",
  caricamento: "Carico le notifiche…",
  il: "il centro",
};
const T = { it, en: { ...it } };

const ICONA: Record<string, string> = { cambio_campo: "swap", compito: "target", messaggio: "chat", avviso: "chat", assenza: "check", segnalazione: "shield", pagamento: "doc" };

/** A6: notifiche del bambino, in linguaggio semplice. In cima l'ultimo cambio campo con la mini mappa. */
export default function AllievoNotifiche() {
  const t = useT(T);
  const { me, base } = useMio();
  const { figlio } = useFigli("allievo");
  const dati = useDatiAllievo(figlio?.id);
  const n = useListaNotifiche();
  const { cambio, campi } = useUltimoCambio(dati ? dati.gruppi.map((g) => g.id) : null, !!dati);

  if (!me) return <Caric testo={t.caricamento} />;
  const lista = n.lista;
  // in evidenza: la più recente notifica di cambio campo ancora da leggere (altrimenti l'ultima)
  const evid: Notifica | undefined = lista?.find((x) => x.tipo === "cambio_campo" && !x.letta_il) ?? lista?.find((x) => x.tipo === "cambio_campo");
  const altre = (lista ?? []).filter((x) => x.id !== evid?.id);
  const sup = (s: string | null) => (s === "cemento" ? t.cemento : s === "terra" ? t.terra : s === "sintetico" ? t.sintetico : s === "erba" ? t.erba : "");
  const testoCambio = cambio && cambio.a
    ? f(t.cambio, { giorno: dataLunga(inizioLezione(cambio.data, "00:00")).split(" ")[0], a: cambio.a.numero, da: cambio.da?.numero ?? "?", sup: sup(cambio.a.superficie), cop: cambio.a.copertura === "scoperto" ? t.scoperto : t.coperto })
    : null;
  const href = (x: Notifica) => x.link || (x.tipo === "compito" ? `${base}/allievo/compiti` : x.tipo === "assenza" ? `${base}/allievo/assenza` : `${base}/allievo/chat`);

  return (
    <SchermoCentro ruolo="allievo" tab="percorso" titolo={t.titolo} sopra={f(t.sopra, { nome: figlio?.nome ?? nomeMembro(me) })} indietro={`${base}/allievo`} azioni={<span className={n.nonLette ? "cm-tag g" : "cm-tag v"}>{n.nonLette ? f(t.nuove, { n: n.nonLette }) : t.nessunaNuova}</span>}>
      <div className="cm-col" style={{ gap: 9 }}>
        <ErroreC testo={n.errore} />
        {lista === null ? (
          <Caric testo={t.caricamento} />
        ) : (
          <>
            {evid && (
              <div className="card" style={{ padding: 12, borderColor: "rgba(216,243,74,.55)", background: "#181C0E", display: "flex", flexDirection: "column", gap: 8 }} onClick={() => !evid.letta_il && n.segna([evid.id])}>
                <div className="cm-row">
                  <span style={{ color: "#D8F34A", display: "flex" }}><Ic n="swap" size={18} /></span>
                  <span className="k cm-grow" style={{ color: "#D8F34A" }}>{t.dalCentro}{evid.mittente ? ` · ${evid.mittente.toUpperCase()}` : ""}</span>
                  <span style={{ fontSize: 11, color: "#A1A1A6", fontWeight: 700 }}>{quando(evid.created_at)}</span>
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 800, lineHeight: 1.3 }}>{testoCambio ?? evid.testo ?? evid.titolo}</div>
                {cambio && campi.length > 0 && <MiniMappa campi={campi} evidenzia={cambio.a} etichetta={t.mappa} />}
                {cambio && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#C7C7CC", lineHeight: 1.35 }}>
                    <Ic n="clock" size={15} />
                    <span>{f(t.stessaOra, { giorno: giornoCompleto(cambio.data), ora: cambio.ora ? hhmm(cambio.ora) : "" })}</span>
                  </div>
                )}
              </div>
            )}
            {altre.length > 0 && <div className="cm-k">{t.piuVecchie}</div>}
            {lista.length === 0 && <VuotoC>{t.vuoto}</VuotoC>}
            <div className="cm-col s">
              {altre.map((x) => (
                <Link key={x.id} href={href(x)} className="li" style={{ padding: "8px 12px", gap: 10, borderRadius: 15, opacity: x.letta_il ? 0.8 : 1 }} onClick={() => !x.letta_il && n.segna([x.id])}>
                  <span className="ic" style={{ width: 34, height: 34, borderRadius: 11 }}><Ic n={ICONA[x.tipo] ?? "bell"} size={17} /></span>
                  <span className="cm-grow">
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, lineHeight: 1.25 }}>{x.testo || x.titolo}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "#A1A1A6", marginTop: 2 }}>{f(t.da, { chi: x.mittente || t.il, quando: quando(x.created_at) })}</span>
                  </span>
                  {!x.letta_il && <span className="cm-pallino" />}
                </Link>
              ))}
              {n.ancora && (
                <button type="button" className="cm-bt2" onClick={n.altre}>
                  {t.altre}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </SchermoCentro>
  );
}

const COL: Record<string, string> = { terra: "#B8532E", cemento: "#2E5E9E", sintetico: "#2F8F4E", erba: "#2F8F4E" };

/** Pianta dei campi dall'alto: posizioni x, y, w, h (0-100) dalla tabella `campi`; quello nuovo è col bordo giallo. */
export function MiniMappa({ campi, evidenzia, etichetta }: { campi: Campo[]; evidenzia: Campo | null; etichetta: string }) {
  return (
    <svg viewBox="0 0 100 60" role="img" aria-label={etichetta} style={{ width: "100%", height: 130, borderRadius: 14, background: "#0E1510" }}>
      {campi.map((c, i) => {
        // se un campo non ha ancora la posizione, si dispongono in fila così la mappa resta leggibile
        const x = c.x ?? 4 + (i % 4) * 24;
        const y = c.y ?? 8 + Math.floor(i / 4) * 26;
        const w = c.w ?? 20;
        const h = c.h ?? 40;
        const on = c.id === evidenzia?.id;
        return (
          <g key={c.id}>
            <rect x={x} y={y * 0.6} width={w} height={h * 0.6} rx={1.5} fill={COL[c.superficie ?? ""] ?? "#2F8F4E"} opacity={on ? 1 : 0.45} stroke={on ? "#D8F34A" : "rgba(255,255,255,.25)"} strokeWidth={on ? 1.6 : 0.5} />
            <line x1={x + w / 2} y1={y * 0.6} x2={x + w / 2} y2={y * 0.6 + h * 0.6} stroke="rgba(255,255,255,.5)" strokeWidth={0.4} />
            <text x={x + w / 2} y={y * 0.6 + h * 0.3 + 2} textAnchor="middle" fontSize={7} fontWeight={800} fill="#fff" fontFamily="Barlow Condensed, sans-serif">{c.numero}</text>
          </g>
        );
      })}
    </svg>
  );
}
