"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC } from "./stati";
import { caricaParti, inviaMessaggio, type Msg, type Parte } from "./conversazioni";
import { dataBreve, f, giornoLungo, inSilenzio, lettoAdesso, messaggioErrore, nomeMembro, oraIt, useMio, useRealtime, isoGiorno } from "./comuni";
import "./comunicazione.css";

const it = {
  caricamento: "Carico i messaggi…",
  vuoto: "Nessun messaggio ancora. Scrivi tu per primo.",
  tu: "Tu",
  invia: "Invia il messaggio",
  soloLettura: "Sola lettura: puoi leggere ma non scrivere in questa conversazione.",
  programmato: "Programmato per {giorno} alle {ora}",
  oggi: "oggi",
  domani: "domani",
  silenzio: "Dopo le {da} i messaggi restano in silenzio: partono alle {a}.",
  ruolo_maestro: "maestro",
  ruolo_genitore: "genitore",
  ruolo_allievo: "allievo",
  ruolo_segreteria: "segreteria",
  ruolo_dt: "direttore tecnico",
  ruolo_titolare: "titolare",
  ruolo_responsabile_area: "responsabile d'area",
  nonCancellabili: "I messaggi non si possono cancellare e restano nell'archivio del centro.",
};
const T = { it, en: { ...it } };

type Props = {
  id: string;
  /** "bimbo": testi più grandi e bolle verdi, come nella chat dell'allievo (A3). */
  stile?: "adulto" | "bimbo";
  soloLettura?: boolean;
  /** Mostra il nome sopra ogni messaggio (chat con più persone). */
  mostraAutore?: boolean;
  /** Risposte rapide: riempiono la bozza (adulti) oppure inviano subito (bimbi). */
  rapide?: string[];
  rapideInvia?: boolean;
  segnaposto: string;
  /** Riempie l'altezza disponibile (pagina conversazione). */
  alto?: boolean;
  /** Nei giorni separa i messaggi con un'intestazione (A3). */
  separaGiorni?: boolean;
  piede?: string;
  onInviato?: () => void;
};

/**
 * Conversazione in tempo reale. I messaggi non si cancellano né si modificano: qui non c'è nessun comando per farlo.
 * L'invio passa sempre da `invia_messaggio`, che applica gli orari di silenzio (consegna alle 8:00) e la sola lettura.
 */
export default function ThreadChat({ id, stile = "adulto", soloLettura, mostraAutore, rapide, rapideInvia, segnaposto, alto, separaGiorni, piede, onInviato }: Props) {
  const t = useT(T);
  const { sb, me, imp } = useMio();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [parti, setParti] = useState<Parte[]>([]);
  const [bozza, setBozza] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fine = useRef<HTMLDivElement>(null);

  const carica = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.from("messaggi").select("id,conversazione_id,autore_id,testo,created_at,consegna_il").eq("conversazione_id", id).order("created_at", { ascending: true }).limit(500);
    if (error) {
      setErrore(messaggioErrore(error));
      setMsgs((m) => m ?? []);
      return;
    }
    setMsgs((data ?? []) as Msg[]);
    lettoAdesso(id);
  }, [sb, id]);

  useEffect(() => {
    carica();
  }, [carica]);
  useEffect(() => {
    if (!sb) return;
    caricaParti(sb, [id]).then((r) => setParti(r[id] ?? []));
  }, [sb, id]);
  useRealtime(sb, `cm-chat-${id}`, "messaggi", `conversazione_id=eq.${id}`, "INSERT", carica);
  // ogni minuto si ricalcola cosa è già stato consegnato (un messaggio programmato alle 8:00 compare da solo)
  useEffect(() => {
    const x = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(x);
  }, []);
  useEffect(() => {
    fine.current?.scrollIntoView({ block: "end" });
  }, [msgs, tick]);

  const mia = parti.find((p) => p.membro_id === me?.id);
  const lettura = !!soloLettura || !!mia?.sola_lettura;
  const nome = (aid: string) => parti.find((p) => p.membro_id === aid);

  async function manda(testo: string) {
    const x = testo.trim();
    if (!x || !sb || invio) return;
    setInvio(true);
    setErrore(null);
    try {
      await inviaMessaggio(sb, id, x);
      setBozza("");
      await carica();
      onInviato?.();
    } catch (e) {
      setErrore(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }
  const sottomette = (e: FormEvent) => {
    e.preventDefault();
    manda(bozza);
  };

  if (!me || msgs === null) return <Caric testo={t.caricamento} />;
  const adesso = Date.now();
  // chi non è l'autore non vede un messaggio finché non scatta la consegna
  const visibili = msgs.filter((m) => !m.consegna_il || new Date(m.consegna_il).getTime() <= adesso || m.autore_id === me.id);
  let giornoPrec = "";

  return (
    <div className="cm-col" style={alto ? { flex: 1, minHeight: 0 } : undefined}>
      <div className={`cm-thread${alto ? " alto" : ""}${stile === "bimbo" ? " bimbo" : ""}`} role="log" aria-live="polite">
        {visibili.length === 0 && <div className="cm-stato">{t.vuoto}</div>}
        {visibili.map((m) => {
          const autore = nome(m.autore_id);
          const mio = m.autore_id === me.id;
          // nella chat del figlio, il genitore vede i messaggi del ragazzo a destra e in verde
          const tipo = mio ? "me" : autore?.ruolo === "allievo" && lettura ? "fig" : "alt";
          const giorno = isoGiorno(new Date(m.created_at));
          const intest = separaGiorni && giorno !== giornoPrec ? giornoLungo(m.created_at) : null;
          giornoPrec = giorno;
          const prog = mio && m.consegna_il && new Date(m.consegna_il).getTime() > adesso ? new Date(m.consegna_il) : null;
          const domani = prog && isoGiorno(prog) !== isoGiorno(new Date());
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {intest && <div className="cm-giorno">{intest}</div>}
              <div className={`cm-bw ${tipo}`}>
                <div className="cm-b">
                  {mostraAutore && (
                    <div className="chi">
                      {mio ? t.tu : nomeMembro(autore) || "—"}
                      {!mio && autore?.ruolo ? ` · ${(t as Record<string, string>)["ruolo_" + autore.ruolo] ?? autore.ruolo}` : ""}
                    </div>
                  )}
                  <div className="tx">{m.testo}</div>
                  <div className="or">
                    {prog ? f(t.programmato, { giorno: domani ? t.domani : t.oggi, ora: oraIt(prog) }) : separaGiorni ? oraIt(m.created_at) : `${dataBreve(m.created_at)} · ${oraIt(m.created_at)}`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fine} />
      </div>

      <ErroreC testo={errore} />

      {lettura ? (
        <div className="note" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Ic n="eye" size={15} />
          {t.soloLettura}
        </div>
      ) : (
        <>
          {rapide && rapide.length > 0 && (
            <div className={`cm-rap${stile === "bimbo" ? " g" : ""}`}>
              {rapide.map((r) => (
                <button key={r} type="button" onClick={() => (rapideInvia ? manda(r) : setBozza(r))}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <form className="cm-comp" onSubmit={sottomette}>
            <input value={bozza} onChange={(e) => setBozza(e.target.value)} placeholder={segnaposto} aria-label={segnaposto} maxLength={1500} />
            <button className="cm-send" type="submit" disabled={invio || !bozza.trim()} aria-label={t.invia}>
              <Ic n="send" size={17} sw={2.4} />
            </button>
          </form>
          {inSilenzio(imp) && <div className="cm-piede" style={{ color: "#FFD54A" }}>{f(t.silenzio, { da: imp.silenzio_da.slice(0, 5), a: imp.silenzio_a.slice(0, 5) })}</div>}
        </>
      )}
      <div className="cm-piede">
        <Ic n="lock" size={11} sw={2.2} />
        {piede ?? t.nonCancellabili}
      </div>
    </div>
  );
}
