"use client";
/*
 * P2 · Unisciti a un centro  (/app/unisciti oppure /app/unisciti?c=CODICE)
 * Codice di 6 caratteri (o link ricevuto), anteprima del centro, ruolo che si riceve, conferma.
 *
 * L'anteprima usa la funzione del database `anteprima_invito(codice)` (non è nel contratto base: vedi
 * components/centro/accesso/anteprima_invito.sql). Se la funzione non c'è ancora la pagina funziona lo stesso:
 * salta l'anteprima e lascia confermare, perché il controllo vero lo fa `unisciti_con_codice`.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Schermo } from "@/components/app/Schermo";
import { estraiCodice, messaggioErrore, percorsoRuolo, pulisciCodice, salvaScelta, RUOLI_CENTRO, type RuoloCentro } from "./comune";
import { IcoFrecciaIndietro, IcoScudo } from "./icone";
import s from "./accesso.module.css";

const IT = {
  kick: "Nuovo centro",
  titolo: "Unisciti a un centro",
  modoCodice: "Codice del maestro",
  modoLink: "Link della segreteria",
  campoCodice: "Codice di 6 caratteri · dato dal maestro",
  campoLink: "Link ricevuto dalla segreteria",
  codiceAria: "Codice invito di 6 caratteri",
  linkAria: "Link di invito",
  linkSegnaposto: "Incolla qui il link ricevuto",
  statoVuoto: "Scrivi i 6 caratteri del codice.",
  statoCarico: "Controllo il codice…",
  statoValido: "Invito valido, scade tra {n} giorni",
  statoValidoUno: "Invito valido, scade domani",
  statoValidoOggi: "Invito valido, scade oggi",
  statoValidoSenza: "Invito valido",
  statoScaduto: "Invito scaduto: chiedi un nuovo codice al centro.",
  statoEsaurito: "Questo invito è già stato usato il numero massimo di volte.",
  statoNonValido: "Codice non trovato: controlla i 6 caratteri.",
  statoNonDisp: "Anteprima non disponibile adesso. Puoi confermare lo stesso.",
  anteprima: "Anteprima",
  anteprimaVuota: "Qui vedrai il centro",
  dt: "Direttore tecnico",
  maestri: "maestri",
  gruppi: "gruppi",
  allievi: "allievi",
  ruoloTitolo: "Il ruolo che riceverai",
  r_genitore_nome: "Genitore di {n}",
  r_genitore_1: "Vedi calendario, progressi e report del mese di {n}.",
  r_genitore_2: "Leggi la sua chat col maestro e scrivi alla segreteria.",
  r_maestro_nome: "Maestro",
  r_maestro_1: "Gruppi, programma del Metodo e piano lezione.",
  r_maestro_2: "Le tue chat con gli allievi sono visibili ai genitori.",
  r_allievo_nome: "Allievo · {g}",
  r_allievo_1: "Percorso, compiti a casa e chat con il maestro.",
  r_allievo_2: "Serve il consenso di un genitore. Mamma e papà possono leggere la chat.",
  r_titolare_nome: "Titolare",
  r_titolare_1: "Gestisci il centro, i maestri e le impostazioni.",
  r_titolare_2: "Vedi la panoramica, i pagamenti e le segnalazioni.",
  r_dt_nome: "Direttore tecnico",
  r_dt_1: "Guidi il Metodo, i maestri e i gruppi del centro.",
  r_dt_2: "Sei il responsabile tutela: le segnalazioni arrivano a te.",
  r_responsabile_area_nome: "Responsabile · {a}",
  r_responsabile_area_1: "Segui i gruppi, i campi e i maestri della tua area.",
  r_responsabile_area_2: "Scrivi avvisi ai gruppi della tua area.",
  r_segreteria_nome: "Segreteria",
  r_segreteria_1: "Segui iscrizioni, avvisi e pagamenti del centro.",
  r_segreteria_2: "Scrivi alle famiglie e ai maestri.",
  r_genitore_senza: "Genitore",
  r_allievo_senza: "Allievo",
  r_responsabile_area_senza: "Responsabile",
  r_nd_nome: "Il ruolo dell'invito",
  r_nd_1: "Adesso non riesco a mostrarti l'anteprima.",
  r_nd_2: "Vedrai il tuo ruolo appena confermi.",
  tuoFiglio: "tuo figlio",
  areaGenerica: "area",
  gruppoGenerico: "gruppo",
  conferma: "Conferma e unisciti",
  invio: "Mi unisco…",
  nota: "Il centro vedrà nome e ruolo. Puoi lasciarlo dal profilo.",
  registra: "Sei un centro? Registralo",
  indietro: "Indietro",
  erroreScaduto: "Questo invito è scaduto: chiedi un nuovo codice al centro.",
  erroreEsaurito: "Questo invito è già stato usato il numero massimo di volte.",
  erroreNonValido: "Codice non valido: controlla i 6 caratteri.",
  erroreGia: "Fai già parte di questo centro con questo ruolo.",
  erroreGenerico: "Non sono riuscito a completare l'iscrizione. Riprova tra poco.",
};
const T = { it: IT, en: IT };

type StatoAnteprima = "vuoto" | "carico" | "valido" | "scaduto" | "esaurito" | "non_valido" | "non_disponibile";
type DatiInvito = {
  centro_nome?: string; citta?: string; dt_nome?: string;
  n_maestri?: number; n_gruppi?: number; n_allievi?: number;
  ruolo?: RuoloCentro; scade_il?: string | null;
  gruppo_nome?: string; area_nome?: string; allievo_nome?: string;
};

const sostituisci = (txt: string, v: Record<string, string | number>) => txt.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const giorniA = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);

/** La risposta di una funzione che restituisce jsonb può arrivare come oggetto o come riga unica in un elenco. */
function primo<T>(x: unknown): T | null {
  if (Array.isArray(x)) return (x[0] as T) ?? null;
  return (x as T) ?? null;
}

export default function Unisciti() {
  const t = useT(T);
  const router = useRouter();
  const [modo, setModo] = useState<"codice" | "link">("codice");
  const [codice, setCodice] = useState("");
  const [link, setLink] = useState("");
  const [fuoco, setFuoco] = useState(false);
  const [stato, setStato] = useState<StatoAnteprima>("vuoto");
  const [invito, setInvito] = useState<DatiInvito | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const giro = useRef(0);

  // il codice vero: quello scritto nelle caselle oppure quello estratto dal link incollato
  const valore = modo === "codice" ? codice : estraiCodice(link);
  const completo = valore.length === 6;

  // link del tipo /app/unisciti?c=CODICE: il codice entra da solo
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setCodice(pulisciCodice(c));
  }, []);

  // anteprima: si interroga il database appena il codice è completo
  useEffect(() => {
    setErrore(null);
    if (!completo) { setStato("vuoto"); setInvito(null); return; }
    const mio = ++giro.current;
    setStato("carico");
    const id = window.setTimeout(async () => {
      const { data, error } = await supabaseBrowser().rpc("anteprima_invito", { codice: valore });
      if (mio !== giro.current) return; // nel frattempo il codice è cambiato
      if (error) { setInvito(null); setStato("non_disponibile"); return; }
      const r = primo<DatiInvito & { valido?: boolean; motivo?: string | null }>(data);
      if (!r || r.valido === false) {
        setInvito(r);
        setStato(r?.motivo === "scaduto" ? "scaduto" : r?.motivo === "esaurito" ? "esaurito" : "non_valido");
        return;
      }
      setInvito(r);
      setStato("valido");
    }, 250);
    return () => window.clearTimeout(id);
  }, [valore, completo]);

  async function conferma() {
    if (!completo || invio) return;
    setInvio(true); setErrore(null);
    const sb = supabaseBrowser();
    const { data, error } = await sb.rpc("unisciti_con_codice", { codice: valore });
    if (error) {
      const m = messaggioErrore(error);
      setErrore(/scad|expire/.test(m) ? t.erroreScaduto
        : /esaur|max|usi/.test(m) ? t.erroreEsaurito
        : /già|gia |already|duplicate|23505/.test(m) ? t.erroreGia
        : /non trovat|non valid|inesist|invalid|not found/.test(m) ? t.erroreNonValido
        : t.erroreGenerico);
      setInvio(false);
      return;
    }
    const r = primo<{ centro_slug?: string; ruolo?: RuoloCentro }>(data);
    if (!r?.centro_slug) { setErrore(t.erroreGenerico); setInvio(false); return; }
    const ruolo: RuoloCentro = r.ruolo && RUOLI_CENTRO.includes(r.ruolo) ? r.ruolo : invito?.ruolo ?? "genitore";
    // si ricorda il profilo appena creato, così il centro si apre già con il ruolo giusto
    try {
      const { data: u } = await sb.auth.getUser();
      const { data: c } = await sb.from("centri").select("id").eq("slug", r.centro_slug).maybeSingle();
      if (u.user && c) {
        const { data: m } = await sb.from("membri").select("id").eq("centro_id", c.id).eq("user_id", u.user.id).eq("ruolo", ruolo).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (m) salvaScelta(r.centro_slug, m.id, ruolo);
      }
    } catch { /* la scelta si potrà rifare da "Scegli profilo" */ }
    router.push(percorsoRuolo(r.centro_slug, ruolo));
  }

  // ----- testi dipendenti dallo stato -----
  let testoStato = t.statoVuoto;
  if (stato === "carico") testoStato = t.statoCarico;
  else if (stato === "scaduto") testoStato = t.statoScaduto;
  else if (stato === "esaurito") testoStato = t.statoEsaurito;
  else if (stato === "non_valido") testoStato = t.statoNonValido;
  else if (stato === "non_disponibile") testoStato = t.statoNonDisp;
  else if (stato === "valido") {
    const g = invito?.scade_il ? giorniA(invito.scade_il) : null;
    testoStato = g === null ? t.statoValidoSenza : g <= 0 ? t.statoValidoOggi : g === 1 ? t.statoValidoUno : sostituisci(t.statoValido, { n: g });
  }
  const buono = stato === "valido";
  const male = stato === "scaduto" || stato === "esaurito" || stato === "non_valido";

  const chiave = (invito?.ruolo && RUOLI_CENTRO.includes(invito.ruolo) ? invito.ruolo : "nd") as RuoloCentro | "nd";
  const ruoloOk = stato === "valido" && chiave !== "nd";
  const k = (parte: string) => (t as Record<string, string>)[`r_${ruoloOk ? chiave : "nd"}_${parte}`] ?? "";
  const vars = {
    n: invito?.allievo_nome || t.tuoFiglio,
    g: invito?.gruppo_nome || t.gruppoGenerico,
    a: invito?.area_nome || t.areaGenerica,
  };
  const ruoloNome = sostituisci(k("nome"), vars);
  // senza il dato (figlio, gruppo, area) il ruolo resta il nome semplice
  const senzaDato = (chiave === "allievo" && !invito?.gruppo_nome) || (chiave === "genitore" && !invito?.allievo_nome) || (chiave === "responsabile_area" && !invito?.area_nome);
  const ruoloNomePulito = ruoloOk && senzaDato ? k("senza") : ruoloNome;

  const caselle = Array.from({ length: 6 }, (_, i) => valore[i] ?? "");
  const attiva = Math.min(valore.length, 5);
  const puoConfermare = (stato === "valido" || stato === "non_disponibile") && !invio;

  return (
    <Schermo>
      <div className={`${s.q} ${s.alto}`}>
        <header className={s.hdr}>
          <Link href="/app/profili" className={s.indietro} aria-label={t.indietro}><IcoFrecciaIndietro /></Link>
          <div className={s.grow}><div className={s.kick}>{t.kick}</div><h1 className={s.h1}>{t.titolo}</h1></div>
        </header>

        <div className={s.seg} role="group" aria-label={t.titolo}>
          <button type="button" className={modo === "codice" ? `${s.sg} ${s.on}` : s.sg} aria-pressed={modo === "codice"} onClick={() => setModo("codice")}>{t.modoCodice}</button>
          <button type="button" className={modo === "link" ? `${s.sg} ${s.on}` : s.sg} aria-pressed={modo === "link"} onClick={() => setModo("link")}>{t.modoLink}</button>
        </div>

        <div className={`${s.card} ${s.pad}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className={s.k}>{modo === "codice" ? t.campoCodice : t.campoLink}</div>
          {modo === "codice" ? (
            <div className={s.caselle}>
              {caselle.map((ch, i) => (
                <span key={i} className={[s.casella, fuoco && i === attiva ? s.attiva : "", male ? s.errata : ""].join(" ")}>{ch}</span>
              ))}
              {/* il campo vero è trasparente sopra le caselle: tastiera, incolla e riempimento automatico funzionano di serie */}
              <input className={s.caselleInput} type="text" inputMode="text" autoCapitalize="characters" autoComplete="one-time-code" autoCorrect="off" spellCheck={false}
                aria-label={t.codiceAria} value={codice} maxLength={40}
                onChange={(e) => setCodice(estraiCodice(e.target.value))}
                onFocus={() => setFuoco(true)} onBlur={() => setFuoco(false)} />
            </div>
          ) : (
            <div className={s.linkBox}>
              <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label={t.linkAria}
                placeholder={t.linkSegnaposto} value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          )}
          <div className={s.stato} role="status" aria-live="polite">
            <span className={buono ? s.dot : male ? `${s.dot} ${s.no}` : `${s.dot} ${s.attesa}`} />{testoStato}
          </div>
        </div>

        <div className={`${s.card} ${s.anteprima}`}>
          <div className={s.anteprimaPrato} aria-hidden="true">
            <svg viewBox="0 0 357 40" preserveAspectRatio="xMidYMid slice"><path d="M-10 34 L370 12" stroke="#fff" strokeWidth="2.5" opacity=".45" fill="none" /><circle cx="320" cy="20" r="10" fill="#D8F34A" /></svg>
          </div>
          <div className={s.anteprimaCorpo}>
            <div className={s.anteprimaTesta}>
              <div>
                <div className={s.kick}>{[invito?.citta, invito?.dt_nome ? `${t.dt} ${invito.dt_nome}` : ""].filter(Boolean).join(" · ") || " "}</div>
                <div className={s.nomeCentro} style={ruoloOk || invito?.centro_nome ? undefined : { color: "#8E8E93" }}>{invito?.centro_nome && stato === "valido" ? invito.centro_nome : t.anteprimaVuota}</div>
              </div>
              <span className={s.tag}>{t.anteprima}</span>
            </div>
            <div className={s.g3}>
              <div className={s.tile}><b>{stato === "valido" ? invito?.n_maestri ?? "–" : "–"}</b><span>{t.maestri}</span></div>
              <div className={s.tile}><b>{stato === "valido" ? invito?.n_gruppi ?? "–" : "–"}</b><span>{t.gruppi}</span></div>
              <div className={s.tile}><b>{stato === "valido" ? invito?.n_allievi ?? "–" : "–"}</b><span>{t.allievi}</span></div>
            </div>
          </div>
        </div>

        <div className={`${s.card} ${s.pad} ${s.giallo}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className={s.ruoloTesta}>
            <span className={s.ic} style={{ borderRadius: 12 }}><IcoScudo size={20} colore="currentColor" /></span>
            <div className={s.grow}><div className={s.k}>{t.ruoloTitolo}</div><div className={s.ruoloNome}>{ruoloNomePulito}</div></div>
          </div>
          <div className={s.v}>{sostituisci(k("1"), vars)}</div>
          <div className={s.v}>{sostituisci(k("2"), vars)}</div>
        </div>

        {errore && <div className={s.errore} role="alert">{errore}</div>}

        <button type="button" className={`${s.btn} ${s.spingi}`} onClick={conferma} disabled={!puoConfermare}>{invio ? t.invio : t.conferma}</button>
        <div className={`${s.piccolo} ${s.centrato}`}>{t.nota}</div>
        <Link href="/app/registra-centro" className={s.testoLink}>{t.registra}</Link>
      </div>
    </Schermo>
  );
}
