"use client";
import { useEffect, useMemo, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC } from "./stati";
import { contaDestinatari, inviaAvviso, useAvvisiInviati, useNomi, etichettaDest, type Dest, type Risolti } from "./avvisi";
import { f, giornoLungo, hhmm, inSilenzio, messaggioErrore, nomeMembro, oraIt, prossimaConsegna, quandoLista, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Avviso ai miei allievi",
  sopra: "{nome} · {data}",
  aChi: "A CHI LO MANDO",
  tutti: "Tutti i miei allievi",
  messaggio: "IL TUO MESSAGGIO",
  segnaposto: "Scrivi l'avviso per i tuoi allievi…",
  famiglie: "Anche alle famiglie",
  famigliePer: "Per i minori l'avviso arriva sempre anche ai genitori",
  sempreAcceso: "Sempre acceso",
  anteprima: "ANTEPRIMA",
  conteggio: "{a} allievi · {fa} famiglie",
  parteSubito: "Parte subito. Dopo le {da} resta in silenzio fino alle {a}",
  silenzio: "Dopo le {da} non si manda nulla: programmato per domani alle {a}",
  invia: "Invia a {n} allievi e famiglie",
  programma: "Programma per domani alle {a}",
  inviato: "Avviso inviato a {n} allievi",
  progOk: "Programmato per domani alle {a}",
  inviando: "Invio…",
  ultimi: "ULTIMI AVVISI · CONFERMA DI LETTURA",
  letti: "letti {l} su {t}",
  lettiS: "letti {l}",
  attesa: "in attesa",
  nessunoAncora: "Non hai ancora mandato avvisi.",
  caricamento: "Carico i tuoi gruppi…",
  nessunGruppo: "Non hai ancora gruppi assegnati.",
  destCentro: "Tutto il centro",
  destFamiglie: "Famiglie di {nome}",
  destArea: "Area {nome}",
  altri: "Carica altri avvisi",
};
const T = { it, en: { ...it } };
const MAX = 280;

/** M12: un unico messaggio a tutti i miei allievi o solo ad alcuni gruppi, sempre anche alle famiglie dei minori. */
export default function MaestroAvviso() {
  const t = useT(T);
  const { sb, me, centro, imp } = useMio();
  const nomi = useNomi();
  const ultimi = useAvvisiInviati("miei", 5);
  const [gruppi, setGruppi] = useState<{ id: string; nome: string }[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [testo, setTesto] = useState("");
  const [ris, setRis] = useState<Risolti | null>(null);
  const [invio, setInvio] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // i miei gruppi: due query semplici (legami maestro-gruppo, poi i gruppi)
  useEffect(() => {
    if (!sb || !me) return;
    (async () => {
      const { data: gm } = await sb.from("gruppi_maestri").select("gruppo_id").eq("membro_id", me.id);
      const ids = ((gm ?? []) as { gruppo_id: string }[]).map((x) => x.gruppo_id);
      if (!ids.length) return setGruppi([]);
      const { data } = await sb.from("gruppi").select("id,nome").in("id", ids).eq("attivo", true).order("nome");
      setGruppi((data ?? []) as { id: string; nome: string }[]);
    })();
  }, [sb, me]);

  // nessun gruppo scelto = tutti i miei allievi (tutti i gruppi del maestro)
  const dest: Dest = useMemo(() => (sel.length ? { tipo: "gruppo", valori: sel } : { tipo: "maestro", valori: me ? [me.id] : [] }), [sel, me]);
  useEffect(() => {
    if (!sb || !centro || !me) return;
    let vivo = true;
    const x = setTimeout(() => contaDestinatari(sb, centro.id, dest).then((r) => vivo && setRis(r)), 300);
    return () => {
      vivo = false;
      clearTimeout(x);
    };
  }, [sb, centro, me, dest]);

  const silenzio = inSilenzio(imp);
  const a = hhmm(imp.silenzio_a);
  const nAl = ris?.allievi ?? 0;

  async function invia() {
    if (!sb || !testo.trim() || invio) return;
    setInvio(true);
    setErr(null);
    setOk(null);
    try {
      const titolo = testo.trim().slice(0, 60);
      // per i minori l'avviso arriva sempre anche ai genitori: lo decide il server, qui non c'è nessuna scelta
      const r = await inviaAvviso(sb, imp, { titolo, testo: testo.trim(), destinatari: dest, conferma: true, promemoria: true });
      setOk(r.consegna_il ? f(t.progOk, { a: oraIt(new Date(r.consegna_il)) }) : f(t.inviato, { n: nAl }));
      setTesto("");
      ultimi.ricarica();
    } catch (e) {
      setErr(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }

  if (!me || !centro || gruppi === null) return <SchermoCentro ruolo="maestro" tab="messaggi" titolo={t.titolo} indietro><Caric testo={t.caricamento} /></SchermoCentro>;
  const etDest = sel.length ? gruppi.filter((g) => sel.includes(g.id)).map((g) => g.nome).join(" + ") : t.tutti;

  return (
    <SchermoCentro ruolo="maestro" tab="messaggi" titolo={t.titolo} sopra={f(t.sopra, { nome: nomeMembro(me), data: giornoLungo(new Date()).toLowerCase() })} indietro>
      <div className="cm-col" style={{ gap: 8 }}>
        <div>
          <div className="cm-k" style={{ marginBottom: 5 }}>{t.aChi}</div>
          <div className="chips" style={{ gap: 5 }}>
            <button type="button" className={sel.length === 0 ? "chip on" : "chip"} style={{ height: 30, fontSize: 12.5, padding: "0 11px" }} aria-pressed={sel.length === 0} onClick={() => setSel([])}>
              {t.tutti}
            </button>
            {gruppi.map((g) => (
              <button key={g.id} type="button" className={sel.includes(g.id) ? "chip on" : "chip"} style={{ height: 30, fontSize: 12.5, padding: "0 11px" }} aria-pressed={sel.includes(g.id)} onClick={() => setSel((x) => (x.includes(g.id) ? x.filter((y) => y !== g.id) : [...x, g.id]))}>
                {g.nome}
              </button>
            ))}
          </div>
          {gruppi.length === 0 && <div className="cm-stato">{t.nessunGruppo}</div>}
        </div>

        <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label htmlFor="mav-testo" className="cm-k">{t.messaggio}</label>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6E6E73" }}>{testo.length} / {MAX}</span>
          </div>
          <textarea id="mav-testo" className="cm-ta" style={{ background: "transparent", border: 0, padding: 0, minHeight: 70 }} value={testo} maxLength={MAX} onChange={(e) => setTesto(e.target.value)} placeholder={t.segnaposto} />
        </div>

        <div className="li" style={{ padding: "8px 12px", gap: 10, borderRadius: 14, borderColor: "rgba(216,243,74,.22)" }}>
          <span style={{ color: "#D8F34A", display: "flex", flex: "none" }}><Ic n="users" size={18} /></span>
          <span className="cm-grow">
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{t.famiglie}</span>
            <span style={{ display: "block", fontSize: 11.5, color: "#A1A1A6", lineHeight: 1.3, marginTop: 1 }}>{t.famigliePer}</span>
          </span>
          <span role="img" aria-label={t.sempreAcceso} style={{ width: 40, height: 24, borderRadius: 12, background: "#4CD07D", position: "relative", flex: "none", opacity: 0.85 }}>
            <i style={{ position: "absolute", right: 3, top: 3, width: 18, height: 18, borderRadius: "50%", background: "#0B0B0C" }} />
          </span>
        </div>

        <div className="tile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
          <span className="ic" style={{ width: 34, height: 34 }}><Ic n="users" size={18} /></span>
          <span className="cm-grow">
            <span style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#A1A1A6", letterSpacing: ".4px" }}>{t.anteprima}</span>
            <span className="cm-ell" style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{etDest}</span>
          </span>
          <span className="disp" style={{ fontSize: 19, fontWeight: 700, color: "#D8F34A", whiteSpace: "nowrap" }}>{ris ? f(t.conteggio, { a: ris.allievi, fa: ris.famiglie }) : "…"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, padding: "0 4px", color: silenzio ? "#FFD54A" : "#4CD07D" }}>
          <Ic n="moon" size={14} />
          <span>{silenzio ? f(t.silenzio, { da: hhmm(imp.silenzio_da), a }) : f(t.parteSubito, { da: hhmm(imp.silenzio_da), a })}</span>
        </div>

        <ErroreC testo={err} />
        {ok && <div className="cm-ok">{ok}</div>}
        <button type="button" className="cm-bt" style={{ height: 48, fontSize: 15 }} disabled={invio || !testo.trim() || nAl === 0} onClick={invia}>
          <Ic n="send" size={17} sw={2.4} />
          {invio ? t.inviando : silenzio ? f(t.programma, { a: oraIt(prossimaConsegna(imp)) }) : f(t.invia, { n: nAl })}
        </button>

        <div className="cm-k" style={{ marginTop: 4 }}>{t.ultimi}</div>
        <ErroreC testo={ultimi.errore} />
        <div className="cm-col s">
          {ultimi.lista && ultimi.lista.length === 0 && <div className="cm-stato">{t.nessunoAncora}</div>}
          {(ultimi.lista ?? []).map((u) => {
            const prog = u.consegna_il && new Date(u.consegna_il).getTime() > Date.now();
            const completo = u.tot > 0 && u.letti === u.tot;
            return (
              <div key={u.id} className="li" style={{ padding: "7px 12px", gap: 10, borderRadius: 14 }}>
                <span className="cm-grow">
                  <span className="cm-ell" style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{u.titolo}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "#A1A1A6", marginTop: 1 }}>
                    {etichettaDest(u.destinatari, nomi, { centro: t.destCentro, famiglieDi: t.destFamiglie, area: t.destArea, tutti: t.tutti })} · {quandoLista(u.created_at)}
                  </span>
                </span>
                <span className={`cm-tag${completo ? " v" : ""}`}>{prog ? t.attesa : u.tot > 0 ? f(t.letti, { l: u.letti, t: u.tot }) : f(t.lettiS, { l: u.letti })}</span>
              </div>
            );
          })}
          {ultimi.ancora && (
            <button type="button" className="cm-bt2" onClick={ultimi.altri}>
              {t.altri}
            </button>
          )}
        </div>
      </div>
    </SchermoCentro>
  );
}
