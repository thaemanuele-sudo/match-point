"use client";
// M11 · La mia formazione (/c/[slug]/maestro/formazione). Percorso di certificazione, osservazioni ricevute dal
// direttore tecnico e obiettivi. Le osservazioni sono visibili solo al maestro e al DT (RLS di `osservazioni`).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { fmtGiornoMese, isoGiorno } from "@/lib/centro/date";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "../../Schermo";
import { Ic } from "./Ic";
import { COL, CRITERI, corsoCompletato, mediaVoti, nomeCompleto, percentualeCorso, rimpiazza, virgola, type CorsoB, type FormazioneB, type Riga } from "./util";
import "./b.css";

const it = {
  titolo: "La mia formazione", certK: "CERTIFICAZIONE", certNome: "Maestro del Metodo",
  corsiFatti: "{a} corsi su {b} completati", esamePronto: "Percorso completo: l'esame pratico lo fissa il direttore tecnico",
  viste: "Viste", vCorsi: "Corsi", vOss: "Osservazioni", vObi: "Obiettivi",
  completato: "Completato", moduliSu: "{a} moduli su {b}", entro: "Entro {d}", nonIniziato: "Da iniziare",
  fatto: "Fatto", continua: "Continua", inizia: "Inizia", registraModulo: "Registra un modulo completato: {corso}",
  notaCorsi: "Il Metodo si completa con {n} corsi. Quando hai finito, il direttore tecnico fissa l'esame pratico in campo.", nessunCorso: "Il centro non ha ancora creato corsi del Metodo.",
  ossDel: "Osservazione del {d}", ossDa: "{o} · {g}", consiglio: "Consiglio.", su5: "/5", nessunaOss: "Nessuna osservazione ricevuta finora.",
  tempi: "Rispetto dei tempi", correzione: "Qualità della correzione", gruppo: "Gestione del gruppo", sicurezza: "Sicurezza",
  notaObi: "Gli obiettivi nascono dai consigli del direttore tecnico dopo ogni osservazione. Toccali per segnarli come raggiunti.", raggiunto: "Raggiunto", daFare: "Da fare",
  segnaRaggiunto: "Segna come raggiunto: {o}", segnaDaFare: "Segna come da fare: {o}", nessunObi: "Nessun obiettivo: arriveranno con la prima osservazione.",
  soloLettura: "Stai vedendo la formazione di un altro maestro: le modifiche sono disattivate.",
  caricamento: "Carico la formazione…", errore: "Errore: {e}", riprova: "Riprova",
};
const T = { it, en: { ...it } };

type Vista = "corsi" | "osservazioni" | "obiettivi";

export default function BMaestroFormazione() {
  const t = useT(T);
  const { centro, sb, membroAttivo, vistaCome } = useCentro();
  const R = rotta(centro.slug);
  const [vista, setVista] = useState<Vista>("corsi");
  const [corsi, setCorsi] = useState<CorsoB[]>([]);
  const [forma, setForma] = useState<FormazioneB[]>([]);
  const [oss, setOss] = useState<Riga[]>([]);
  const [nomi, setNomi] = useState<Record<string, string>>({});
  const [gruppiL, setGruppiL] = useState<Record<string, string>>({});
  const [raggiunti, setRaggiunti] = useState<Record<string, boolean>>({});
  const [carica, setCarica] = useState(true);
  const [err, setErr] = useState("");
  const me = membroAttivo?.id;

  const leggi = useCallback(async () => {
    if (!me) { setCarica(false); return; }
    const [c, f, o, r] = await Promise.all([
      sb.from("corsi_formazione").select("id,titolo,obbligatorio,moduli").eq("centro_id", centro.id).order("created_at", { ascending: true }),
      sb.from("formazione").select("id,corso_id,membro_id,moduli_fatti,certificato_il,scadenza").eq("centro_id", centro.id).eq("membro_id", me),
      sb.from("osservazioni").select("id,osservatore_id,lezione_id,voti,voto,consigli,nota,created_at").eq("centro_id", centro.id).eq("maestro_id", me).order("created_at", { ascending: false }).limit(10),
      // il registro cresce a ogni tocco: bastano le righe più recenti (poi lette dalla più vecchia, l'ultima per oggetto vale)
      sb.from("registro").select("oggetto,dettagli,created_at").eq("centro_id", centro.id).eq("membro_id", me).eq("azione", "obiettivo").order("created_at", { ascending: false }).limit(300),
    ]);
    const e = c.error ?? f.error ?? o.error ?? r.error;
    setErr(e ? e.message : "");
    setCorsi((c.data as CorsoB[]) ?? []);
    setForma((f.data as FormazioneB[]) ?? []);
    const osservazioni = (o.data as Riga[]) ?? [];
    setOss(osservazioni);
    // l'ultima riga del registro per ogni obiettivo dice se è raggiunto: il registro è solo in aggiunta, quindi niente cancellazioni
    const mappa: Record<string, boolean> = {};
    for (const x of [...((r.data as Riga[]) ?? [])].reverse()) mappa[x.oggetto] = !!x.dettagli?.raggiunto;
    setRaggiunti(mappa);
    // nomi di chi ha osservato e gruppi delle lezioni osservate
    const idO = Array.from(new Set(osservazioni.map((x) => x.osservatore_id).filter(Boolean)));
    const idL = Array.from(new Set(osservazioni.map((x) => x.lezione_id).filter(Boolean)));
    const [mm, ll] = await Promise.all([
      idO.length ? sb.from("membri").select("id,nome,cognome").in("id", idO) : Promise.resolve({ data: [] as Riga[] }),
      // il nome del gruppo arriva con la stessa richiesta (join), senza una seconda query in cascata
      idL.length ? sb.from("lezioni").select("id,gruppi(nome)").in("id", idL) : Promise.resolve({ data: [] as Riga[] }),
    ]);
    setNomi(Object.fromEntries(((mm.data as Riga[]) ?? []).map((x) => [x.id, nomeCompleto(x as { nome: string; cognome: string | null })])));
    setGruppiL(Object.fromEntries(((ll.data as Riga[]) ?? []).map((x) => [x.id, String((Array.isArray(x.gruppi) ? x.gruppi[0]?.nome : x.gruppi?.nome) ?? "")])));
    setCarica(false);
  }, [sb, centro.id, me]);
  useEffect(() => { void leggi(); }, [leggi]);

  const fDi = (id: string) => forma.find((f) => f.corso_id === id);
  const fatti = corsi.filter((c) => corsoCompletato(c, fDi(c.id))).length;
  const perc = corsi.length ? Math.round((fatti / corsi.length) * 100) : 0;

  const obiettivi = useMemo(() => {
    const visti = new Set<string>();
    const out: { key: string; n: string; d: string }[] = [];
    for (const o of oss.slice(0, 3)) {
      for (const c of Array.isArray(o.consigli) ? (o.consigli as string[]) : []) {
        if (visti.has(c)) continue;
        visti.add(c);
        out.push({ key: `${o.id}:${c}`, n: c, d: rimpiazza(t.ossDel, { d: fmtGiornoMese(o.created_at) }) + " · " + (nomi[o.osservatore_id] ?? "") });
      }
    }
    return out;
  }, [oss, nomi, t]);

  async function avanza(c: CorsoB) {
    if (!me || vistaCome) return;
    const f = fDi(c.id);
    const tot = c.moduli ?? 0;
    const n = tot ? Math.min(tot, (f?.moduli_fatti ?? 0) + 1) : 0;
    const chiuso = !tot || n >= tot;
    const campi = { moduli_fatti: n, certificato_il: chiuso ? isoGiorno() : null };
    const r = f ? await sb.from("formazione").update(campi).eq("id", f.id) : await sb.from("formazione").insert({ centro_id: centro.id, corso_id: c.id, membro_id: me, ...campi });
    if (r.error) setErr(r.error.message); else await leggi();
  }

  async function segna(key: string, testo: string) {
    if (!me || vistaCome) return;
    const nuovo = !raggiunti[key];
    setRaggiunti((x) => ({ ...x, [key]: nuovo }));
    const r = await sb.from("registro").insert({ centro_id: centro.id, membro_id: me, azione: "obiettivo", oggetto: key, dettagli: { raggiunto: nuovo, testo } });
    if (r.error) { setErr(r.error.message); setRaggiunti((x) => ({ ...x, [key]: !nuovo })); }
  }

  const ultima = oss[0];
  const altre = oss.slice(1);
  const etichetteCrit: Record<string, string> = { tempi: t.tempi, correzione: t.correzione, gruppo: t.gruppo, sicurezza: t.sicurezza };

  return (
    <SchermoCentro ruolo="maestro" tab="metodo" titolo={t.titolo} sopra={`${nomeCompleto(membroAttivo)} · ${centro.nome}`} indietro={R.maestro.metodo}>
      {vistaCome ? <div className="note">{t.soloLettura}</div> : null}
      {err ? <div className="note" role="alert" style={{ color: "#FF8A8E" }}>{rimpiazza(t.errore, { e: err })} <button className="chip" onClick={() => void leggi()}>{t.riprova}</button></div> : null}
      {carica ? <div className="note" role="status">{t.caricamento}</div> : null}

      <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9, background: "linear-gradient(135deg,#1A2410,#161618 60%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="ic" style={{ width: 42, height: 42, borderRadius: 14, background: "#2A3510" }}><Ic n="star" s={22} /></span>
          <span className="grow"><span className="k" style={{ display: "block" }}>{t.certK}</span><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{t.certNome}</span></span>
          <span className="disp" style={{ fontSize: 30, fontWeight: 800, color: COL.palla, lineHeight: 1 }}>{perc}%</span>
        </div>
        <div className="bar" style={{ height: 7 }}><i style={{ width: `${perc}%`, background: COL.palla }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: COL.muto }}>
          <span>{rimpiazza(t.corsiFatti, { a: fatti, b: corsi.length })}</span>
          {corsi.length > 0 && fatti === corsi.length ? <span style={{ textAlign: "right" }}>{t.esamePronto}</span> : null}
        </div>
      </div>

      <div className="seg" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }} role="group" aria-label={t.viste}>
        {([["corsi", t.vCorsi], ["osservazioni", t.vOss], ["obiettivi", t.vObi]] as const).map(([k, l]) => (
          <button key={k} className={k === vista ? "sg on" : "sg"} aria-pressed={k === vista} onClick={() => setVista(k)}>{l}</button>
        ))}
      </div>

      {vista === "corsi" ? (
        <>
          {!carica && !corsi.length ? <div className="note">{t.nessunCorso}</div> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {corsi.map((c) => {
              const f = fDi(c.id);
              const ok = corsoCompletato(c, f);
              const p = percentualeCorso(c, f);
              return (
                <div key={c.id} className="li" style={{ padding: "9px 12px", gap: 11 }}>
                  <span className="ic" style={{ width: 34, height: 34, borderRadius: 10, background: ok ? "#10281B" : "#232326", color: ok ? COL.verde : COL.palla }}>{ok ? <Ic n="check" s={18} w={2.4} /> : <Ic n="play" s={16} />}</span>
                  <span className="grow">
                    <span className="t" style={{ display: "block", fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.titolo}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                      <span className="bar" style={{ flex: 1, height: 6 }}><i style={{ width: `${p}%`, background: ok ? COL.verde : COL.palla }} /></span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: COL.muto, whiteSpace: "nowrap" }}>
                        {ok ? t.completato : f?.scadenza && p === 0 ? rimpiazza(t.entro, { d: fmtGiornoMese(f.scadenza) }) : c.moduli ? rimpiazza(t.moduliSu, { a: f?.moduli_fatti ?? 0, b: c.moduli }) : t.nonIniziato}
                      </span>
                    </span>
                  </span>
                  {ok ? <span style={{ fontSize: 11, fontWeight: 800, color: COL.verde }}>{t.fatto}</span> : (
                    <button disabled={!!vistaCome} onClick={() => void avanza(c)} aria-label={rimpiazza(t.registraModulo, { corso: c.titolo })} style={{ fontSize: 11.5, fontWeight: 800, padding: "5px 10px", borderRadius: 999, background: COL.palla, color: "#0B0B0C", whiteSpace: "nowrap", border: 0, fontFamily: "inherit", cursor: vistaCome ? "default" : "pointer", opacity: vistaCome ? 0.5 : 1 }}>{p > 0 ? t.continua : t.inizia}</button>
                  )}
                </div>
              );
            })}
          </div>
          {corsi.length ? <div className="note">{rimpiazza(t.notaCorsi, { n: corsi.length })}</div> : null}
        </>
      ) : null}

      {vista === "osservazioni" ? (
        <>
          {!carica && !ultima ? <div className="note">{t.nessunaOss}</div> : null}
          {ultima ? (
            <div className="card" style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="grow">
                  <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{rimpiazza(t.ossDel, { d: fmtGiornoMese(ultima.created_at) })}</span>
                  <span style={{ display: "block", fontSize: 12, color: COL.muto }}>{[nomi[ultima.osservatore_id], gruppiL[ultima.lezione_id]].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="disp" style={{ fontSize: 30, fontWeight: 800, color: COL.palla, lineHeight: 1 }}>
                  {mediaVoti(ultima.voti) == null ? "—" : virgola(mediaVoti(ultima.voti)!)}<span style={{ fontSize: 14, color: COL.muto }}> {t.su5}</span>
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {CRITERI.map((k) => {
                  const v = Number(ultima.voti?.[k]) || 0;
                  return (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "128px minmax(0,1fr) 22px", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                      <span>{etichetteCrit[k]}</span>
                      <span className="bar" style={{ height: 6 }}><i style={{ width: `${v * 20}%`, background: v >= 4 ? COL.verde : COL.giallo }} /></span>
                      <b className="disp" style={{ fontSize: 16, textAlign: "right" }}>{v || "—"}</b>
                    </div>
                  );
                })}
              </div>
              {(Array.isArray(ultima.consigli) && ultima.consigli.length) || ultima.nota ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "#D6D6DA", background: "#0E0E10", borderRadius: 12, padding: "9px 11px" }}>
                  <b style={{ color: COL.palla }}>{t.consiglio}</b> {Array.isArray(ultima.consigli) && ultima.consigli.length ? ultima.consigli.join(" · ") : ultima.nota}
                </div>
              ) : null}
            </div>
          ) : null}
          {altre.map((o) => (
            <div key={o.id} className="li" style={{ padding: "9px 12px", gap: 11 }}>
              <span className="grow"><span className="t" style={{ display: "block", fontSize: 13.5 }}>{rimpiazza(t.ossDel, { d: fmtGiornoMese(o.created_at) })}</span><span className="s" style={{ fontSize: 12 }}>{[nomi[o.osservatore_id], gruppiL[o.lezione_id]].filter(Boolean).join(" · ")}</span></span>
              <span className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{mediaVoti(o.voti) == null ? "—" : virgola(mediaVoti(o.voti)!)}</span>
            </div>
          ))}
        </>
      ) : null}

      {vista === "obiettivi" ? (
        <>
          {!carica && !obiettivi.length ? <div className="note">{t.nessunObi}</div> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {obiettivi.map((o) => {
              const fatto = !!raggiunti[o.key];
              return (
                <button key={o.key} className="b-riga-btn" disabled={!!vistaCome} onClick={() => void segna(o.key, o.n)} aria-pressed={fatto} aria-label={rimpiazza(fatto ? t.segnaDaFare : t.segnaRaggiunto, { o: o.n })}>
                  <span style={{ width: 24, height: 24, flex: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", ...(fatto ? { background: COL.palla, color: "#0B0B0C" } : { background: "transparent", border: "2px solid #3A3A3C" }) }}>{fatto ? <Ic n="check" s={18} w={2.4} /> : null}</span>
                  <span className="grow">
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, ...(fatto ? { color: COL.muto, textDecoration: "line-through" } : {}) }}>{o.n}</span>
                    <span style={{ display: "block", fontSize: 12, color: COL.muto, marginTop: 2 }}>{o.d}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: COL.muto, whiteSpace: "nowrap" }}>{fatto ? t.raggiunto : t.daFare}</span>
                </button>
              );
            })}
          </div>
          <div className="note">{t.notaObi}</div>
        </>
      ) : null}
    </SchermoCentro>
  );
}
