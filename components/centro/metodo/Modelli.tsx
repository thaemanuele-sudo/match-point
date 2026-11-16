"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { SchermoCentro } from "@/components/centro/Schermo";
import { BarraMattoni, kickMattone } from "./Barra";
import { Pannello, useToast } from "./Pannello";
import { Ico } from "./ico";
import { comune, fmt } from "./testi";
import { colpoK, COLPI, leggiEsercizio, nomeColpo, type ColpoK, type Esercizio } from "./dati";
import { useMetodo } from "./useMetodo";
import "./metodo.css";

const it = {
  ...comune,
  titolo: "Modelli di lezione",
  salva_aria: "Salva il modello",
  durata_aria: "Durata della lezione",
  durata_sel: "Lezione da {n} minuti",
  durata_lab: "{n} min",
  modello_aria: "Modello {n}",
  non_salvato: "Non ancora salvato",
  modificato: "Modifiche non salvate",
  in_libreria: "Salvato",
  mod_multi: "Multicolpo a quarti",
  mod_uno: "Un colpo a fondo",
  mod_gio: "Tecnica + gioco",
  mod_zero: "Da zero",
  nuovo_titolo: "Nuovo modello",
  nuovo_nome: "Nome del modello",
  nuovo_ph: "Es. Servizio e volée",
  nuovo_crea: "Crea il modello",
  nome_esiste: "Esiste già un modello con questo nome.",
  stato_ok: "{a}' su {b}'",
  stato_manca: "Mancano {n}'",
  stato_piu: "{n}' in più",
  seleziona: "Seleziona {n}",
  modo_tocca_f: "{n}: flessibile, tocca per renderlo libero",
  modo_tocca_l: "{n}: libero, tocca per bloccarlo",
  modo_tocca_b: "{n}: bloccato, tocca per renderlo flessibile",
  meno: "Meno minuti per {n}",
  piu: "Più minuti per {n}",
  aggiungi: "Aggiungi un blocco da {n}'",
  det_flex: "Alternative approvate · {n}",
  det_flex_n: "{n} approvate",
  det_flex_nota: "Il maestro sceglie solo tra queste, per lo stesso obiettivo. Ogni scelta resta tracciata e la vedi nella scheda del maestro.",
  det_flex_vuoto: "Nessuna alternativa: aggiungine almeno una dalla libreria, altrimenti il blocco resta com'è.",
  det_lock: "{n} · bloccato",
  det_lock_nota: "Ogni blocco nasce bloccato: il maestro lo svolge com'è scritto nel Metodo. Per concedere una scelta, passalo a Flessibile e approva le alternative.",
  det_free: "{n} · libero",
  det_free_nota: "Il maestro decide da solo cosa fare in questo blocco. Resta tracciato nella lezione.",
  det_nome: "Nome del blocco",
  det_colpo: "Colpo",
  det_nessun_colpo: "Nessuno",
  det_tipo: "Tipo di blocco",
  det_modo: "Come si svolge",
  det_base: "Esercizio del Metodo",
  det_base_nessuno: "Nessuno: lo sceglie il Metodo",
  det_aggiungi_alt: "Aggiungi un'alternativa dalla libreria…",
  det_togli_alt: "Togli {n}",
  det_elimina_blocco: "Elimina il blocco",
  salva: "Salva il modello",
  salvato_ok: "Modello salvato",
  elimina_modello: "Elimina questa durata",
  elimina_conferma: "Eliminare questo modello di lezione? Le lezioni già svolte restano.",
  eliminato_ok: "Modello eliminato",
  elimina_ko: "Il modello è usato da lezioni o programmi e non si può eliminare.",
  troppi: "I blocchi superano la durata della lezione: riduci i minuti.",
  vuoto: "Aggiungi almeno un blocco.",
  blocchi_lab: "Blocchi della lezione",
  b_nuovo: "Nuovo blocco",
  b_attivazione: "Attivazione",
  b_dritto: "Dritto",
  b_rovescio: "Rovescio",
  b_servizio_risposta: "Servizio e risposta",
  b_volee_gioco: "Volée e gioco",
  b_partita_punti: "Partita a punti",
  b_tecnica_colpo: "Tecnica del colpo",
  b_esercizio_coppia: "Esercizio in coppia",
  b_gioco_tema: "Gioco a tema",
  b_esercizio_tema: "Esercizio a tema",
  b_gioco_punti: "Gioco a punti",
  b_situazione: "Situazione di gioco",
  b_defaticamento: "Defaticamento",
  b_giochi_att: "Giochi di attivazione",
  b_colpo_giorno: "Colpo del giorno",
  b_gioco_squadre: "Gioco a squadre",
  b_mini_partita: "Mini partita",
  b_gioco_finale: "Gioco finale",
  b_coordinazione: "Coordinazione",
  b_torneo: "Torneo a squadre",
};
const T = { it, en: { ...it } };

type Tipo = "a" | "t" | "g" | "r";
type Modo = "bloccato" | "flessibile" | "libero";
type Blocco = { titolo: string; colpo: string; minuti: number; esercizio_id: string | null; modo: Modo; alternative: string[]; tipo: Tipo };
type Riga = { id: string; nome: string; durata: number; blocchi: Blocco[]; creata: string };

const COL: Record<Tipo, string> = { a: "#FF9F43", t: "#3D8BFF", g: "#4CD07D", r: "#A78BFA" };
const SIZES = [5, 10, 15, 20, 30];
const DURATE = [45, 60, 90, 120];

// Modelli di partenza Match Point: [chiave testo, minuti, tipo, colpo]. Ogni blocco nasce bloccato.
type Def = [string, number, Tipo, ColpoK | ""];
const DEF: Record<string, Record<number, Def[]>> = {
  mod_multi: {
    45: [["b_dritto", 10, "t", "dritto"], ["b_rovescio", 10, "t", "rovescio"], ["b_servizio_risposta", 10, "t", "servizio"], ["b_volee_gioco", 15, "g", "volee"]],
    60: [["b_dritto", 15, "t", "dritto"], ["b_rovescio", 15, "t", "rovescio"], ["b_servizio_risposta", 15, "t", "servizio"], ["b_volee_gioco", 15, "g", "volee"]],
    90: [["b_attivazione", 10, "a", ""], ["b_dritto", 20, "t", "dritto"], ["b_rovescio", 20, "t", "rovescio"], ["b_servizio_risposta", 20, "t", "servizio"], ["b_volee_gioco", 20, "g", "volee"]],
    120: [["b_attivazione", 10, "a", ""], ["b_dritto", 20, "t", "dritto"], ["b_rovescio", 20, "t", "rovescio"], ["b_servizio_risposta", 20, "t", "servizio"], ["b_volee_gioco", 20, "g", "volee"], ["b_partita_punti", 30, "g", ""]],
  },
  mod_uno: {
    45: [["b_attivazione", 5, "a", ""], ["b_tecnica_colpo", 15, "t", ""], ["b_esercizio_coppia", 15, "t", ""], ["b_gioco_tema", 10, "g", ""]],
    60: [["b_attivazione", 10, "a", ""], ["b_tecnica_colpo", 20, "t", ""], ["b_esercizio_tema", 15, "t", ""], ["b_gioco_punti", 15, "g", ""]],
    90: [["b_attivazione", 10, "a", ""], ["b_tecnica_colpo", 20, "t", ""], ["b_esercizio_tema", 20, "t", ""], ["b_situazione", 20, "g", ""], ["b_gioco_punti", 20, "g", ""]],
    120: [["b_attivazione", 10, "a", ""], ["b_tecnica_colpo", 30, "t", ""], ["b_esercizio_tema", 20, "t", ""], ["b_situazione", 20, "g", ""], ["b_gioco_punti", 30, "g", ""], ["b_defaticamento", 10, "r", ""]],
  },
  mod_gio: {
    45: [["b_giochi_att", 10, "a", ""], ["b_colpo_giorno", 15, "t", ""], ["b_gioco_squadre", 20, "g", ""]],
    60: [["b_giochi_att", 10, "a", ""], ["b_colpo_giorno", 15, "t", ""], ["b_mini_partita", 20, "g", ""], ["b_gioco_finale", 15, "g", ""]],
    90: [["b_giochi_att", 10, "a", ""], ["b_colpo_giorno", 20, "t", ""], ["b_coordinazione", 20, "a", ""], ["b_mini_partita", 20, "g", ""], ["b_gioco_finale", 20, "g", ""]],
    120: [["b_giochi_att", 10, "a", ""], ["b_colpo_giorno", 30, "t", ""], ["b_coordinazione", 20, "a", ""], ["b_mini_partita", 20, "g", ""], ["b_torneo", 30, "g", ""], ["b_defaticamento", 10, "r", ""]],
  },
};

const tipoDa = (titolo: string): Tipo => {
  const n = titolo.toLowerCase();
  if (/attivaz|coordin|riscald/.test(n)) return "a";
  if (/defatic|recup|stretch/.test(n)) return "r";
  if (/gioco|partita|punti|torneo|situaz/.test(n)) return "g";
  return "t";
};

function leggiBlocchi(j: unknown): Blocco[] {
  if (!Array.isArray(j)) return [];
  return j.map((x): Blocco => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const titolo = String(o.titolo ?? "");
    const modo = o.modo === "flessibile" || o.modo === "libero" ? o.modo : "bloccato";
    const tipo = o.tipo === "a" || o.tipo === "t" || o.tipo === "g" || o.tipo === "r" ? o.tipo : tipoDa(titolo);
    return {
      titolo,
      colpo: String(o.colpo ?? ""),
      minuti: Number(o.minuti) || 10,
      esercizio_id: o.esercizio_id ? String(o.esercizio_id) : null,
      modo,
      alternative: Array.isArray(o.alternative) ? o.alternative.map(String) : [],
      tipo,
    };
  });
}

/** C7 · Modelli di lezione: costruttore a blocchi su barra dei minuti 45/60/90/120. */
export default function Modelli() {
  const t = useT(T) as Record<string, string>;
  const { sb, centro, puoModificare, reg } = useMetodo();
  const [righe, setRighe] = useState<Riga[]>([]);
  const [esercizi, setEsercizi] = useState<Esercizio[]>([]);
  const [carica, setCarica] = useState(true);
  const [ko, setKo] = useState(false);
  const [dur, setDur] = useState(60);
  const [nome, setNome] = useState<string>(t.mod_multi);
  const [nuovi, setNuovi] = useState<string[]>([]);
  const [bozze, setBozze] = useState<Record<string, Blocco[]>>({});
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const [creaAperto, setCreaAperto] = useState(false);
  const [nuovoNome, setNuovoNome] = useState("");
  const [toast, mostra] = useToast();

  const leggi = useCallback(async () => {
    const [a, b] = await Promise.all([
      sb.from("modelli_lezione").select("*").eq("centro_id", centro.id).order("created_at", { ascending: true }),
      sb.from("esercizi").select("*").eq("centro_id", centro.id).eq("stato", "approvato"),
    ]);
    if (a.error) {
      setKo(true);
      setCarica(false);
      return;
    }
    setRighe((a.data ?? []).map((r: Record<string, unknown>) => ({ id: String(r.id), nome: String(r.nome ?? ""), durata: Number(r.durata_min) || 60, blocchi: leggiBlocchi(r.blocchi), creata: String(r.created_at ?? "") })));
    setEsercizi((b.data ?? []).map((r: Record<string, unknown>) => leggiEsercizio(r)));
    setKo(false);
    setCarica(false);
  }, [sb, centro.id]);
  useEffect(() => {
    leggi();
  }, [leggi]);

  // Il modello scelto di partenza è quello del seed (Multicolpo a quarti) se esiste, altrimenti il primo
  const [iniz, setIniz] = useState(false);
  useEffect(() => {
    if (carica || iniz) return;
    setIniz(true);
    if (righe.length && !righe.some((r) => r.nome === t.mod_multi)) setNome(righe[0].nome);
  }, [carica, iniz, righe, t.mod_multi]);

  const defBlocchi = useCallback(
    (n: string, d: number): Blocco[] => {
      const k = Object.keys(DEF).find((x) => t[x] === n);
      const base: Def[] = k ? DEF[k][d] : [["b_attivazione", d >= 90 ? 10 : d === 45 ? 5 : 10, "a", ""]];
      return base.map(([tk, minuti, tipo, c]) => ({ titolo: t[tk], colpo: c ? nomeColpo(c) : "", minuti, esercizio_id: null, modo: "bloccato", alternative: [], tipo }));
    },
    [t],
  );
  const chiave = (n: string, d: number) => `${n}|${d}`;
  const rigaDi = (n: string, d: number) => righe.find((r) => r.nome === n && r.durata === d);
  const blocchiDi = useCallback((n: string, d: number): Blocco[] => bozze[chiave(n, d)] ?? rigaDi(n, d)?.blocchi ?? defBlocchi(n, d), [bozze, righe, defBlocchi]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomi = useMemo(() => {
    const l: string[] = [];
    righe.forEach((r) => !l.includes(r.nome) && l.push(r.nome));
    ["mod_multi", "mod_uno", "mod_gio"].forEach((k) => !l.includes(t[k]) && l.push(t[k]));
    nuovi.forEach((n) => !l.includes(n) && l.push(n));
    return l;
  }, [righe, nuovi, t]);

  const blocchi = blocchiDi(nome, dur);
  const key = chiave(nome, dur);
  const riga = rigaDi(nome, dur);
  const sporco = !!bozze[key];
  const totale = blocchi.reduce((a, b) => a + b.minuti, 0);
  const scala = Math.max(totale, dur);
  const libero = dur - totale;
  const idx = Math.min(sel, Math.max(0, blocchi.length - 1));
  const cur = blocchi[idx];

  const muta = (fn: (b: Blocco[]) => Blocco[]) => setBozze((p) => ({ ...p, [key]: fn(blocchi.map((x) => ({ ...x, alternative: [...x.alternative] }))) }));
  const setBl = (i: number, patch: Partial<Blocco>) => muta((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const step = (i: number, dir: 1 | -1) => {
    const m = blocchi[i].minuti;
    const ix = SIZES.indexOf(m);
    const n = ix < 0 ? (dir > 0 ? SIZES.find((s) => s > m) ?? m : [...SIZES].reverse().find((s) => s < m) ?? m) : SIZES[Math.max(0, Math.min(SIZES.length - 1, ix + dir))];
    setBl(i, { minuti: n });
  };
  const ciclo = (i: number) => setBl(i, { modo: blocchi[i].modo === "bloccato" ? "flessibile" : blocchi[i].modo === "flessibile" ? "libero" : "bloccato" });
  const fl = [...SIZES].reverse().find((s) => s <= libero) ?? 0;
  const puoAggiungere = libero > 0 && blocchi.length < 8 && fl > 0;

  const titoloEs = (id: string) => esercizi.find((e) => e.id === id)?.titolo ?? id;
  const candidati = (b: Blocco, escludi: string[]) => {
    const k = colpoK(b.colpo);
    return esercizi.filter((e) => !escludi.includes(e.id) && (!k || e.colpo === k));
  };

  async function salva() {
    setErrore("");
    if (blocchi.length === 0) return setErrore(t.vuoto);
    if (totale > dur) return setErrore(t.troppi);
    setBusy(true);
    const payload = { centro_id: centro.id, nome, durata_min: dur, blocchi };
    const { error } = riga ? await sb.from("modelli_lezione").update(payload).eq("id", riga.id) : await sb.from("modelli_lezione").insert(payload);
    setBusy(false);
    if (error) return setErrore(t.errore);
    await reg(riga ? "metodo.modello.modifica" : "metodo.modello.crea", `${nome} · ${dur}'`, {
      blocchi: blocchi.length,
      minuti: totale,
      flessibili: blocchi.filter((b) => b.modo === "flessibile").length,
      liberi: blocchi.filter((b) => b.modo === "libero").length,
    });
    setBozze((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
    // Resta sulla stessa pagina: si ricaricano i dati e basta
    await leggi();
    mostra(t.salvato_ok);
  }
  async function eliminaRiga() {
    if (!riga || !window.confirm(t.elimina_conferma)) return;
    setBusy(true);
    const { error } = await sb.from("modelli_lezione").delete().eq("id", riga.id);
    setBusy(false);
    if (error) return setErrore(t.elimina_ko);
    await reg("metodo.modello.elimina", `${riga.nome} · ${riga.durata}'`, { id: riga.id });
    setBozze((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
    mostra(t.eliminato_ok);
    leggi();
  }
  function creaModello() {
    const n = nuovoNome.trim();
    if (!n) return;
    if (nomi.some((x) => x.toLowerCase() === n.toLowerCase())) return setErrore(t.nome_esiste);
    setErrore("");
    setNuovi((p) => [...p, n]);
    setNome(n);
    setSel(0);
    setCreaAperto(false);
    setNuovoNome("");
  }

  const statoTxt = libero === 0 ? fmt(t.stato_ok, { a: totale, b: dur }) : libero > 0 ? fmt(t.stato_manca, { n: libero }) : fmt(t.stato_piu, { n: -libero });
  const statoCol = libero === 0 ? "#4CD07D" : libero > 0 ? "#FFB020" : "#FF5A5F";
  const tstep = dur <= 60 ? 15 : 30;
  const ticks: number[] = [];
  for (let x = 0; x <= scala; x += tstep) ticks.push(x);

  const barraModello = (n: string) => {
    const b = blocchiDi(n, dur);
    let acc = 0;
    const st: string[] = [];
    b.forEach((x) => {
      const p0 = (acc / dur) * 100;
      const p1 = ((acc + x.minuti) / dur) * 100;
      st.push(`${COL[x.tipo]} ${p0.toFixed(1)}% ${(p1 - 1.2).toFixed(1)}%`, `#161618 ${(p1 - 1.2).toFixed(1)}% ${p1.toFixed(1)}%`);
      acc += x.minuti;
    });
    if (acc < dur) st.push(`#2C2C2E ${((acc / dur) * 100).toFixed(1)}% 100%`);
    return `linear-gradient(90deg,${st.join(",")})`;
  };

  return (
    <SchermoCentro
      ruolo="dt"
      tab="metodo"
      titolo={t.titolo}
      largo
      azioni={
        puoModificare ? (
          <button type="button" className="mm-ib" aria-label={t.salva_aria} disabled={busy || !sporco} onClick={salva}>
            <Ico n="check" w={2.4} />
          </button>
        ) : undefined
      }
    >
      <div className="mm">
        <div>
          <div className="mm-k" style={{ textTransform: "none", fontSize: 12 }}>{kickMattone(t, 3, centro.nome)}</div>
          <h1 className="mm-h1">{t.titolo}</h1>
        </div>
        <BarraMattoni slug={centro.slug} attiva="mod" />
        {carica ? <div className="mm-load">{t.caricamento}</div> : null}
        {ko ? <div className="mm-err">{t.errore_lettura}</div> : null}
        {!carica && !ko ? (
          <div className="mm-mocols mm-cols">
            <div className="mm-cols">
              <div className="mm-seg" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }} role="group" aria-label={t.durata_aria}>
                {DURATE.map((d) => (
                  <button key={d} type="button" className={`mm-sg${d === dur ? " on" : ""}`} aria-label={fmt(t.durata_sel, { n: d })} onClick={() => { setDur(d); setSel(0); }}>{fmt(t.durata_lab, { n: d })}</button>
                ))}
              </div>
              <div className="mm-scroll">
                {nomi.map((n) => (
                  <button key={n} type="button" className={`mm-mod${n === nome ? " on" : ""}`} aria-label={fmt(t.modello_aria, { n })} onClick={() => { setNome(n); setSel(0); }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>{n}</span>
                    <i style={{ background: barraModello(n) }} />
                  </button>
                ))}
                {puoModificare ? (
                  <button type="button" className="mm-mod" aria-label={t.nuovo_titolo} onClick={() => { setErrore(""); setCreaAperto(true); }} style={{ width: 110, justifyContent: "center", alignItems: "center", borderStyle: "dashed", borderColor: "#3A3A3C" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, display: "flex", gap: 5, alignItems: "center" }}><Ico n="plus" s={14} />{t.mod_zero}</span>
                  </button>
                ) : null}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div className={`mm-tl${libero < 0 ? " over" : ""}`}>
                  {blocchi.map((b, i) => (
                    <span key={i} style={{ flex: `${b.minuti} 1 0`, background: COL[b.tipo] }}>{b.minuti / scala >= 0.07 ? `${b.minuti}'` : ""}</span>
                  ))}
                  {libero > 0 ? <span className="fr" style={{ flex: `${libero} 1 0` }}>{libero / scala >= 0.07 ? `+${libero}'` : ""}</span> : null}
                </div>
                <div className="mm-tk">
                  {ticks.map((x) => (
                    <span key={x} style={{ left: `${(x / scala) * 100}%`, transform: `translateX(${x === 0 ? "0" : "-50%"})` }}>{x}&apos;</span>
                  ))}
                </div>
              </div>
              <div className="mm-sec" style={{ fontSize: 10.5, fontWeight: 700, color: "#A1A1A6", flexWrap: "wrap" }}>
                <span className="mm-row" style={{ gap: 9, flexWrap: "wrap" }}>
                  {(["a", "t", "g", "r"] as Tipo[]).map((k) => (
                    <span key={k} className="mm-row" style={{ gap: 4 }}><span className="mm-dot" style={{ width: 8, height: 8, background: COL[k] }} />{t[`tipo_${k}`]}</span>
                  ))}
                </span>
                <span style={{ color: statoCol, fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap" }}>{statoTxt}</span>
              </div>
              <div className="mm-row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className={`mm-tag ${sporco ? "wa" : riga ? "ok" : ""}`}>{sporco ? t.modificato : riga ? t.in_libreria : t.non_salvato}</span>
              </div>
            </div>

            <div className="mm-cols">
              <div className="mm-cards" style={{ gap: 4 }} aria-label={t.blocchi_lab}>
                {blocchi.map((b, i) => (
                  <div key={i} className="mm-blk" style={i === idx ? { borderColor: "#D8F34A" } : undefined}>
                    <span className="st" style={{ background: COL[b.tipo] }} />
                    <button type="button" className="nm mm-ell" aria-label={fmt(t.seleziona, { n: b.titolo })} onClick={() => setSel(i)}>{b.titolo}</button>
                    <button
                      type="button"
                      className={`mm-mode ${b.modo === "flessibile" ? "f" : b.modo === "libero" ? "l" : ""}`}
                      disabled={!puoModificare}
                      aria-label={fmt(b.modo === "flessibile" ? t.modo_tocca_f : b.modo === "libero" ? t.modo_tocca_l : t.modo_tocca_b, { n: b.titolo })}
                      onClick={() => { setSel(i); ciclo(i); }}
                    >
                      <Ico n={b.modo === "bloccato" ? "lock" : b.modo === "flessibile" ? "layers" : "unlock"} s={12} w={2.4} />
                      {t[`modo_${b.modo}`]}
                    </button>
                    <span className="mm-row" style={{ gap: 2, flex: "none" }}>
                      <button type="button" className="mm-rd" disabled={!puoModificare} aria-label={fmt(t.meno, { n: b.titolo })} onClick={() => step(i, -1)}><Ico n="minus" s={14} w={2.6} /></button>
                      <span className="mm-min">{fmt(t.min_ab, { n: b.minuti })}</span>
                      <button type="button" className="mm-rd" disabled={!puoModificare} aria-label={fmt(t.piu, { n: b.titolo })} onClick={() => step(i, 1)}><Ico n="plus" s={14} w={2.6} /></button>
                    </span>
                  </div>
                ))}
                {puoModificare && puoAggiungere ? (
                  <button type="button" className="mm-add" onClick={() => { muta((b) => [...b, { titolo: t.b_nuovo, colpo: "", minuti: fl, esercizio_id: null, modo: "bloccato", alternative: [], tipo: "t" }]); setSel(blocchi.length); }}>
                    <Ico n="plus" s={14} />{fmt(t.aggiungi, { n: fl })}
                  </button>
                ) : null}
              </div>

              {cur ? (
                <div className="mm-card">
                  {cur.modo === "flessibile" ? (
                    <>
                      <div className="mm-sec"><span className="mm-k" style={{ color: "#D8F34A" }}>{fmt(t.det_flex, { n: cur.titolo.toUpperCase() })}</span><span style={{ fontSize: 11, fontWeight: 700, color: "#A1A1A6" }}>{fmt(t.det_flex_n, { n: cur.alternative.length })}</span></div>
                      <div className="mm-chips" style={{ gap: 5 }}>
                        {cur.alternative.map((a) => (
                          <span key={a} className="mm-alt">{titoloEs(a)}{puoModificare ? <button type="button" aria-label={fmt(t.det_togli_alt, { n: titoloEs(a) })} onClick={() => setBl(idx, { alternative: cur.alternative.filter((x) => x !== a) })}><Ico n="x" s={12} w={2.6} /></button> : null}</span>
                        ))}
                      </div>
                      {cur.alternative.length === 0 ? <div style={{ fontSize: 12, color: "#FFB020" }}>{t.det_flex_vuoto}</div> : null}
                      <div style={{ fontSize: 11.5, lineHeight: 1.3, color: "#A1A1A6" }}>{t.det_flex_nota}</div>
                    </>
                  ) : cur.modo === "libero" ? (
                    <>
                      <div className="mm-row"><span style={{ color: "#7FD3FF" }}><Ico n="unlock" s={16} /></span><span className="mm-k" style={{ color: "#7FD3FF" }}>{fmt(t.det_free, { n: cur.titolo.toUpperCase() })}</span></div>
                      <div style={{ fontSize: 12, lineHeight: 1.35, color: "#A1A1A6" }}>{t.det_free_nota}</div>
                    </>
                  ) : (
                    <>
                      <div className="mm-row"><span style={{ color: "#D8F34A" }}><Ico n="lock" s={16} /></span><span className="mm-k" style={{ color: "#D8F34A" }}>{fmt(t.det_lock, { n: cur.titolo.toUpperCase() })}</span></div>
                      <div style={{ fontSize: 12, lineHeight: 1.35, color: "#A1A1A6" }}>{t.det_lock_nota}</div>
                    </>
                  )}

                  {puoModificare ? (
                    <>
                      <label className="mm-fld"><span className="mm-lab">{t.det_nome.toUpperCase()}</span><input className="mm-inp" value={cur.titolo} onChange={(e) => setBl(idx, { titolo: e.target.value })} /></label>
                      <div className="mm-fld">
                        <span className="mm-lab">{t.det_modo.toUpperCase()}</span>
                        <div className="mm-seg" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
                          {(["bloccato", "flessibile", "libero"] as Modo[]).map((m) => (
                            <button key={m} type="button" className={`mm-sg${cur.modo === m ? " on" : ""}`} onClick={() => setBl(idx, { modo: m })}>{t[`modo_${m}`]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mm-fld">
                        <span className="mm-lab">{t.det_tipo.toUpperCase()}</span>
                        <div className="mm-chips">
                          {(["a", "t", "g", "r"] as Tipo[]).map((k) => (
                            <button key={k} type="button" className={`mm-chip${cur.tipo === k ? " on" : ""}`} onClick={() => setBl(idx, { tipo: k })}>{t[`tipo_${k}`]}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mm-fld">
                        <span className="mm-lab">{t.det_colpo.toUpperCase()}</span>
                        <div className="mm-chips">
                          <button type="button" className={`mm-chip${!cur.colpo ? " on" : ""}`} onClick={() => setBl(idx, { colpo: "" })}>{t.det_nessun_colpo}</button>
                          {COLPI.map((c) => (
                            <button key={c.k} type="button" className={`mm-chip${colpoK(cur.colpo) === c.k ? " on" : ""}`} onClick={() => setBl(idx, { colpo: c.nome })}>{c.k === "gambe" ? t.colpo_gambe_c : t[`colpo_${c.k}`]}</button>
                          ))}
                        </div>
                      </div>
                      <label className="mm-fld">
                        <span className="mm-lab">{t.det_base.toUpperCase()}</span>
                        <select className="mm-sel" value={cur.esercizio_id ?? ""} onChange={(e) => setBl(idx, { esercizio_id: e.target.value || null })}>
                          <option value="">{t.det_base_nessuno}</option>
                          {candidati(cur, []).map((e) => (
                            <option key={e.id} value={e.id}>{e.titolo}</option>
                          ))}
                        </select>
                      </label>
                      {cur.modo === "flessibile" ? (
                        <label className="mm-fld">
                          <select className="mm-sel" value="" aria-label={t.det_aggiungi_alt} onChange={(e) => e.target.value && setBl(idx, { alternative: [...cur.alternative, e.target.value] })}>
                            <option value="">{t.det_aggiungi_alt}</option>
                            {candidati(cur, [...cur.alternative, cur.esercizio_id ?? ""]).map((e) => (
                              <option key={e.id} value={e.id}>{e.titolo}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <button type="button" className="mm-btn2 dg sm" style={{ alignSelf: "flex-start" }} onClick={() => { muta((b) => b.filter((_, j) => j !== idx)); setSel(0); }}><Ico n="trash" s={14} />{t.det_elimina_blocco}</button>
                    </>
                  ) : null}
                </div>
              ) : null}

              {errore ? <div className="mm-err">{errore}</div> : null}
              {puoModificare ? (
                <div className="mm-row" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="mm-btn" style={{ flex: 1 }} disabled={busy || (!sporco && !!riga)} onClick={salva}>{t.salva}</button>
                  {riga ? <button type="button" className="mm-btn2 dg" disabled={busy} onClick={eliminaRiga}><Ico n="trash" s={16} />{t.elimina_modello}</button> : null}
                </div>
              ) : (
                <div className="mm-note">{t.sola_lettura}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <Pannello aperto={creaAperto} titolo={t.nuovo_titolo} onChiudi={() => setCreaAperto(false)}>
        <label className="mm-fld"><span className="mm-lab">{t.nuovo_nome.toUpperCase()}</span><input className="mm-inp" value={nuovoNome} placeholder={t.nuovo_ph} onChange={(e) => setNuovoNome(e.target.value)} /></label>
        {errore ? <div className="mm-err">{errore}</div> : null}
        <div className="mm-row" style={{ flexWrap: "wrap" }}>
          <button type="button" className="mm-btn" disabled={!nuovoNome.trim()} onClick={creaModello}>{t.nuovo_crea}</button>
          <button type="button" className="mm-btn2" onClick={() => setCreaAperto(false)}>{t.annulla}</button>
        </div>
      </Pannello>
      {toast}
    </SchermoCentro>
  );
}
