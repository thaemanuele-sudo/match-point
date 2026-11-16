"use client";
import { useEffect, useMemo, useState } from "react";
import SchermoCentro from "./Sch";
import { useT } from "@/lib/i18n/lingua";
import { Ic } from "./icone";
import { Caric, ErroreC, VuotoC } from "./stati";
import { useFigli, useDatiAllievo } from "./famiglia";
import { f, giornoContratto, giornoCompleto, hhmm, inizioLezione, isoGiorno, messaggioErrore, nomeMembro, useMio } from "./comuni";
import "./comunicazione.css";

const it = {
  titolo: "Non riesci a venire?",
  sopra: "Ciao {nome}",
  quale: "QUALE ALLENAMENTO SALTI?",
  perche: "PERCHÉ?",
  malato: "Sono malato",
  scuola: "Ho scuola o compiti",
  viaggio: "Sono in viaggio",
  altro: "Altro",
  frase: "Vuoi scrivere una frase? (non serve)",
  invia: "Avvisa il maestro",
  inviando: "Invio…",
  sa: "{nome} lo sa.",
  genitori: "Anche mamma e papà ricevono l'avviso.",
  nota: "Puoi avvisare fino a {n} ore prima. Dopo, avvisa con mamma o papà.",
  troppoTardi: "Mancano meno di {n} ore: avvisa con mamma o papà.",
  conCampo: "Campo {n}{cop} · con {maestro}",
  coperto: " (coperto)",
  conMaestro: "con {maestro}",
  nessuna: "Non ci sono allenamenti nei prossimi giorni.",
  caricamento: "Carico i tuoi allenamenti…",
  maestroGenerico: "il maestro",
  gia: "Hai già avvisato per questo allenamento.",
  ore: "ore",
};
const T = { it, en: { ...it } };
const MOTIVI = [
  { k: "malato", p: "heart" },
  { k: "scuola", p: "doc" },
  { k: "viaggio", p: "plane" },
  { k: "altro", p: "dots" },
] as const;

type Lez = { data: string; ora: string; gruppoId: string; campo: number | null; copertura: string | null; maestro: string };

/** A5: il bambino avvisa che non viene. La RPC `avvisa_assenza` controlla il limite delle 2 ore e notifica maestro e genitori. */
export default function AllievoAssenza() {
  const t = useT(T);
  const { sb, me, centro, base, imp } = useMio();
  const { figlio } = useFigli("allievo");
  const dati = useDatiAllievo(figlio?.id);
  const [lezioni, setLezioni] = useState<Lez[] | null>(null);
  const [lez, setLez] = useState(0);
  const [mot, setMot] = useState(0);
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // prossimi allenamenti (14 giorni): giorni e ora dei gruppi, con l'eventuale cambio campo di quel giorno
  useEffect(() => {
    if (!sb || !centro || !dati) return;
    (async () => {
      const gids = dati.gruppi.map((g) => g.id);
      if (!gids.length) return setLezioni([]);
      const oggi = new Date();
      const fine = new Date(Date.now() + 14 * 86400000);
      const [{ data: cc }, { data: cs }, { data: ass }] = await Promise.all([
        sb.from("cambi_campo").select("gruppo_id,data,campo_a").in("gruppo_id", gids).gte("data", isoGiorno(oggi)).lte("data", isoGiorno(fine)),
        sb.from("campi").select("id,numero,copertura").eq("centro_id", centro.id),
        figlio ? sb.from("assenze").select("data,gruppo_id").eq("allievo_id", figlio.id).gte("data", isoGiorno(oggi)).lte("data", isoGiorno(fine)) : Promise.resolve({ data: [] }),
      ]);
      const campi = new Map(((cs ?? []) as { id: string; numero: number; copertura: string | null }[]).map((c) => [c.id, c]));
      const cambi = new Map(((cc ?? []) as { gruppo_id: string; data: string; campo_a: string | null }[]).map((c) => [`${c.gruppo_id}|${c.data}`, c.campo_a]));
      const già = new Set(((ass ?? []) as { data: string; gruppo_id: string | null }[]).map((a) => `${a.gruppo_id}|${a.data}`));
      const out: Lez[] = [];
      for (let i = 0; i <= 14; i++) {
        const d = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + i);
        const iso = isoGiorno(d);
        for (const g of dati.gruppi) {
          if (!g.ora || !g.giorni?.includes(giornoContratto(d)) || già.has(`${g.id}|${iso}`)) continue;
          if (inizioLezione(iso, g.ora).getTime() < Date.now()) continue;
          const campo = campi.get(cambi.get(`${g.id}|${iso}`) ?? g.campo_id ?? "");
          out.push({ data: iso, ora: g.ora, gruppoId: g.id, campo: campo?.numero ?? null, copertura: campo?.copertura ?? null, maestro: nomeMembro(dati.maestri[g.id] ?? dati.maestro) });
        }
      }
      out.sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
      setLezioni(out.slice(0, 4));
    })();
  }, [sb, centro, dati, figlio]);

  const corrente = lezioni?.[lez];
  // limite: oltre `assenza_entro_ore` prima dell'inizio non si avvisa più da soli (lo ricontrolla anche il database)
  const tardi = useMemo(() => !!corrente && inizioLezione(corrente.data, corrente.ora).getTime() - Date.now() < imp.assenza_entro_ore * 3600000, [corrente, imp.assenza_entro_ore]);

  async function invia() {
    if (!sb || !figlio || !corrente || tardi || invio) return;
    setInvio(true);
    setErr(null);
    try {
      const { error } = await sb.rpc("avvisa_assenza", { allievo: figlio.id, data: corrente.data, motivo: MOTIVI[mot].k, testo: testo.trim() || null });
      if (error) throw error;
      setFatto(corrente.maestro || t.maestroGenerico);
    } catch (e) {
      setErr(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }

  if (!me || !centro || lezioni === null) return <SchermoCentro ruolo="allievo" tab="percorso" titolo={t.titolo} indietro={`${base}/allievo`}><Caric testo={t.caricamento} /></SchermoCentro>;
  const mT: Record<string, string> = { malato: t.malato, scuola: t.scuola, viaggio: t.viaggio, altro: t.altro };

  return (
    <SchermoCentro ruolo="allievo" tab="percorso" titolo={t.titolo} sopra={f(t.sopra, { nome: figlio?.nome ?? "" })} indietro={`${base}/allievo`}>
      <div className="cm-col">
        {lezioni.length === 0 ? (
          <VuotoC>{t.nessuna}</VuotoC>
        ) : (
          <>
            <div>
              <div className="cm-k" style={{ marginBottom: 6 }}>{t.quale}</div>
              <div className="cm-col s">
                {lezioni.map((l, k) => (
                  <button key={l.data + l.gruppoId} type="button" className="cm-scelta" aria-pressed={k === lez} onClick={() => { setLez(k); setFatto(null); setErr(null); }}>
                    <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: k === lez ? "#D8F34A" : "#232326", color: k === lez ? "#0B0B0C" : "#6E6E73" }}>{k === lez && <Ic n="check" size={14} sw={3} />}</span>
                    <span className="cm-grow">
                      <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{giornoCompleto(l.data).replace(/^./, (c) => c.toUpperCase())} · {hhmm(l.ora)}</span>
                      <span style={{ display: "block", fontSize: 12.5, color: "#A1A1A6", marginTop: 1 }}>
                        {l.campo ? f(t.conCampo, { n: l.campo, cop: l.copertura === "coperto" || l.copertura === "pallone" ? t.coperto : "", maestro: l.maestro || t.maestroGenerico }) : f(t.conMaestro, { maestro: l.maestro || t.maestroGenerico })}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="cm-k" style={{ marginBottom: 6 }}>{t.perche}</div>
              <div className="cm-motivi">
                {MOTIVI.map((m, k) => (
                  <button key={m.k} type="button" className="cm-motivo" aria-pressed={k === mot} onClick={() => { setMot(k); setFatto(null); }}>
                    <Ic n={m.p} size={20} />
                    <span>{mT[m.k]}</span>
                  </button>
                ))}
              </div>
            </div>

            <input className="cm-in r" style={{ borderRadius: 14 }} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={t.frase} aria-label={t.frase} maxLength={200} />

            {fatto ? (
              <div className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, borderColor: "rgba(76,208,125,.45)", background: "#10211A" }} role="status">
                <span style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", background: "#4CD07D", color: "#0B0B0C", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="check" size={22} sw={3} /></span>
                <div className="cm-grow">
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{f(t.sa, { nome: fatto.split(" ")[0] })}</div>
                  <div style={{ fontSize: 13, color: "#C7C7CC", marginTop: 1 }}>{t.genitori}</div>
                </div>
              </div>
            ) : (
              <>
                {tardi && <div className="cm-err">{f(t.troppoTardi, { n: imp.assenza_entro_ore })}</div>}
                <ErroreC testo={err} />
                <button type="button" className="cm-bt" style={{ height: 54 }} onClick={invia} disabled={invio || tardi || !corrente} aria-label={t.invia}>
                  <Ic n="send" size={18} sw={2.4} />
                  {invio ? t.inviando : t.invia}
                </button>
              </>
            )}
          </>
        )}
        <div className="note" style={{ fontSize: 12.5, padding: "9px 12px", display: "flex", gap: 9, alignItems: "center" }}>
          <Ic n="clock" size={16} />
          <span>{f(t.nota, { n: imp.assenza_entro_ore })}</span>
        </div>
      </div>
    </SchermoCentro>
  );
}
