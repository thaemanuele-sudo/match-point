"use client";
/*
 * Scheda «Motore» (solo italiano): come passano le chiamate AI di Match Point, quanto si spende e quanto si risparmia,
 * come stanno imparando i modelli economici e il collegamento con il motore centrale.
 * I numeri arrivano da /api/admin/motore (solo admin). Le impostazioni passano da admin_get_settings / admin_set_setting
 * come nelle altre schede; le chiavi non vengono mai mostrate.
 */
import { useCallback, useEffect, useState } from "react";
import { Campo, Errore, I, Interruttore, Tile, errMsg, intero, useAdmin, usd } from "./comuni";

type Riga = { key: string; value: string; is_secret: boolean; impostata: boolean };
type Braccio = { modello: string; stato: "prova" | "attivo" | "escluso"; prove: number; basso: number; alto: number; ok: number; ko: number; costo_medio: number };
type Secchio = { secchio: string; servito: string; bracci: Braccio[] };
type Compito = { id: string; genere: string; versione: number; riferimento: string; candidati: string[]; secchi: Secchio[] };
type Dati = {
  modo: "attivo" | "osserva" | "spento";
  sage: { chiave: boolean; acceso: boolean };
  centro: { url: string | null; chiave: boolean };
  pronto: boolean;
  motivo?: string;
  erroreDati?: string | null;
  decisore?: string;
  spesa?: { vera: number; senza_motore: number; risparmio: number; chiamate: number; quota_cache: number };
  compiti?: Compito[];
};

const NOME_MODO: Record<Dati["modo"], string> = { attivo: "Attivo", osserva: "Osserva", spento: "Spento" };
const SPIEGA_MODO: Record<Dati["modo"], string> = {
  attivo: "Cache, modello meno caro che basta e apprendimento: il motore lavora per davvero.",
  osserva: "Risponde sempre il modello di riferimento; il motore intanto prova i modelli economici in ombra e impara. Nessun cambiamento per gli utenti.",
  spento: "Il motore non viene usato: ogni chiamata AI segue la strada di prima, diretta ad Anthropic e al servizio di voce.",
};
const NOME_STATO: Record<Braccio["stato"], string> = { prova: "in prova", attivo: "promosso", escluso: "escluso" };
const pc = (x: number) => `${Math.round(x * 100)}%`;
const corto = (id: string) => (id.includes("/") ? id.slice(id.indexOf("/") + 1) : id);
const NOME_COMPITO: Record<string, string> = {
  "matchpoint/chat": "Coach AI (chat)",
  "matchpoint/analisi-video": "Analisi video",
  "matchpoint/riassunto-lezione": "Riassunto della lezione",
};

export function Motore() {
  const { sb, avvisa } = useAdmin();
  const [righe, setRighe] = useState<Record<string, Riga> | null>(null);
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [occ, setOcc] = useState<string | null>(null);
  const [modo, setModo] = useState<Dati["modo"]>("attivo");
  const [sage, setSage] = useState(false);
  const [chiaveSage, setChiaveSage] = useState("");
  const [url, setUrl] = useState("");
  const [chiaveCentro, setChiaveCentro] = useState("");
  const [esitoSync, setEsitoSync] = useState<string | null>(null);

  const caricaDati = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/motore", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.messaggio || "Non riesco a leggere i numeri del motore.");
      setDati(j as Dati);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Non riesco a leggere i numeri del motore.");
    }
  }, []);

  const caricaImpostazioni = useCallback(async () => {
    const { data, error } = await sb.rpc("admin_get_settings");
    if (error) return setErrore(errMsg(error));
    const m: Record<string, Riga> = {};
    (data as Riga[]).forEach((r) => { m[r.key] = r; });
    setRighe(m);
    setModo(m.motore_modo?.value === "osserva" || m.motore_modo?.value === "spento" ? m.motore_modo.value : "attivo");
    setSage(m.motore_sage_utenti?.value === "1");
    setUrl(m.motore_centro_url?.value ?? "");
  }, [sb]);

  useEffect(() => { void caricaImpostazioni(); void caricaDati(); }, [caricaImpostazioni, caricaDati]);

  const scrivi = async (nome: string, coppie: [string, string, boolean][], ok: string) => {
    setOcc(nome); setErrore(null);
    for (const [k, v, s] of coppie) {
      const { error } = await sb.rpc("admin_set_setting", { p_key: k, p_value: v, p_secret: s });
      if (error) { setOcc(null); return setErrore(errMsg(error)); }
    }
    setOcc(null);
    avvisa(ok);
    void caricaImpostazioni();
    // Le impostazioni si rileggono dal server ogni minuto al massimo: i numeri nuovi possono tardare un po'.
    window.setTimeout(() => void caricaDati(), 1200);
  };

  const sincronizza = async () => {
    setOcc("sync"); setErrore(null); setEsitoSync(null);
    try {
      const r = await fetch("/api/admin/motore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ azione: "sincronizza" }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.messaggio || "Sincronizzazione non riuscita.");
      setEsitoSync(`Sincronizzato: inviate ${intero(j.inviati)} righe di numeri, ricevuti ${intero(j.priori)} valori di partenza.`);
      void caricaDati();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Sincronizzazione non riuscita.");
    }
    setOcc(null);
  };

  if (!righe || !dati) return errore ? <Errore testo={errore} /> : <div className="db-caric"><span className="db-spin" aria-label="Caricamento" /></div>;

  const haChiaveSage = !!righe.levanto_api_key?.impostata;
  const haChiaveCentro = !!righe.motore_centro_chiave?.impostata;
  const s = dati.spesa;

  return (
    <>
      <div className="db-testa">
        <div><h1 className="db-titolo">Motore</h1>
          <p className="db-sotto">Ogni chiamata AI di Match Point passa da qui: risposte già date dalla cache, il modello meno caro che basta e conti precisi. Se il motore si ferma, si torna alla strada di prima.</p></div>
      </div>
      <Errore testo={errore} />
      {!dati.pronto && <Errore testo={dati.motivo ?? "Il motore non è pronto."} />}
      {dati.erroreDati && <Errore testo={dati.erroreDati} />}

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Modo</h2><span className="db-badge verde">{NOME_MODO[dati.modo]}</span></div>
        <div className="db-form">
          <Campo lab="Come lavora il motore" nota={SPIEGA_MODO[modo]} intera>
            <select value={modo} onChange={(e) => setModo(e.target.value as Dati["modo"])}>
              <option value="attivo">Attivo</option><option value="osserva">Osserva</option><option value="spento">Spento</option>
            </select>
          </Campo>
        </div>
        <div className="db-azioni"><button type="button" className="db-btn2 acc" disabled={occ === "modo" || modo === dati.modo} onClick={() => void scrivi("modo", [["motore_modo", modo, false]], "Modo salvato")}>{occ === "modo" ? "Salvo…" : "Salva modo"}</button></div>
      </section>

      {s && (
        <section className="db-kpi" aria-label="Conti degli ultimi 30 giorni">
          <Tile colore="var(--blu)" icona={I.dollaro} lab="Spesa vera" val={usd(s.vera)} sub="ultimi 30 giorni, prove comprese" />
          <Tile colore="var(--viola)" icona={I.dollaro} lab="Senza motore" val={usd(s.senza_motore)} sub="con il solo modello di riferimento" />
          <Tile colore="var(--verde)" icona={I.grafico} lab="Risparmio" val={usd(s.risparmio)} sub={s.senza_motore > 0 ? `${pc(s.risparmio / s.senza_motore)} in meno` : "ancora nessuna chiamata"} />
          <Tile colore="var(--teal)" icona={I.grafico} lab="Risposte da cache" val={pc(s.quota_cache)} sub={`su ${intero(s.chiamate)} chiamate`} />
        </section>
      )}

      {(dati.compiti ?? []).map((c) => (
        <section className="db-card" key={c.id}>
          <div className="db-card-testa"><h2 className="db-h2">{NOME_COMPITO[c.id] ?? c.id}</h2><span className="db-nota">riferimento: {corto(c.riferimento)}</span></div>
          <div className="db-form"><div className="intera" style={{ overflowX: "auto" }}>
            {c.secchi.length === 0 ? (
              <p className="db-nota">
                Ancora nessuna prova.{c.candidati.length ? ` Il motore metterà alla prova ${c.candidati.map(corto).join(" e ")} appena arrivano le prime richieste.` : " Il modello di riferimento è già il più economico: non ci sono candidati da provare."}
              </p>
            ) : (
              <table className="db-tabprezzi">
                <thead><tr><th>Difficoltà</th><th>Modello</th><th>Stato</th><th>Prove</th><th>Riuscita (intervallo)</th><th>Costo medio</th></tr></thead>
                <tbody>
                  {c.secchi.flatMap((sc) => sc.bracci.map((b) => (
                    <tr key={sc.secchio + b.modello}>
                      <td>{sc.secchio}</td>
                      <td>{corto(b.modello)}{sc.servito === b.modello ? " · serve oggi" : ""}</td>
                      <td><span className={"db-badge " + (b.stato === "attivo" ? "verde" : "arancio")}>{NOME_STATO[b.stato]}</span></td>
                      <td>{intero(b.prove)}</td>
                      <td>{pc(b.basso)} – {pc(b.alto)}</td>
                      <td>{usd(b.costo_medio)}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            )}
          </div></div>
        </section>
      ))}

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Decisore</h2><span className="db-nota">{dati.decisore ? `in uso: ${dati.decisore}` : "non attivo"}</span></div>
        <div className="db-form">
          <p className="db-nota intera">
            Il decisore legge l&apos;ultimo messaggio di chi scrive al Coach AI per capire se la domanda è facile o difficile. Di partenza è Claude Haiku, lo stesso fornitore che già risponde:
            i messaggi dei ragazzi non vanno a nessun altro. Sage di Levanto si usa solo se inserisci la sua chiave <strong>e</strong> accendi l&apos;interruttore qui sotto.
          </p>
          <div className="db-campo intera">
            <span>Chiave API Sage (Levanto)</span>
            <div className="db-sec-pwd"><span className={"db-badge " + (haChiaveSage ? "verde" : "arancio")}>{haChiaveSage ? "Impostata" : "Non impostata"}</span></div>
            <div className="db-sec-pwd">
              <input type="password" autoComplete="new-password" aria-label="Chiave API Sage" placeholder={haChiaveSage ? "Incolla una nuova chiave per sostituirla" : "Incolla la chiave"}
                value={chiaveSage} onChange={(e) => setChiaveSage(e.target.value)} style={{ flex: "1 1 220px", minHeight: 44, border: 0, borderRadius: 10, background: "var(--campo)", padding: "0 12px", fontSize: 16 }} />
              <button type="button" className="db-btn2 acc" disabled={!chiaveSage.trim() || occ === "sage-chiave"}
                onClick={async () => { await scrivi("sage-chiave", [["levanto_api_key", chiaveSage.trim(), true]], "Chiave salvata"); setChiaveSage(""); }}>{occ === "sage-chiave" ? "Salvo…" : "Salva chiave"}</button>
            </div>
          </div>
          <div className="db-campo intera">
            <Interruttore valore={sage} onChange={setSage} lab="Usa Sage anche per i messaggi degli utenti" />
            <small>
              Acceso, i messaggi scritti dai ragazzi al Coach AI vengono inviati a Levanto (un fornitore diverso da Anthropic) per essere classificati. Accendilo solo se hai verificato che per voi va bene
              (informativa privacy, consenso delle famiglie). Spento, Sage non riceve nulla degli utenti. Serve anche la chiave qui sopra.
            </small>
          </div>
        </div>
        <div className="db-azioni"><button type="button" className="db-btn2 acc" disabled={occ === "sage" || sage === dati.sage.acceso}
          onClick={() => void scrivi("sage", [["motore_sage_utenti", sage ? "1" : "0", false]], sage ? "Sage acceso per i messaggi degli utenti" : "Sage spento per i messaggi degli utenti")}>{occ === "sage" ? "Salvo…" : "Salva scelta"}</button></div>
      </section>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Motore centrale</h2><span className="db-nota">scambio di soli numeri</span></div>
        <div className="db-form">
          <p className="db-nota intera">
            «Sincronizza» manda al motore centrale solo numeri (compito, modello, successi, insuccessi, costo medio) e ne riceve i valori di partenza per i modelli nuovi.
            Non partono mai testi, richieste o dati degli utenti.
          </p>
          <Campo lab="Indirizzo del motore centrale" nota="Per esempio https://il-tuo-motore.vercel.app" intera>
            <input type="text" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Campo>
          <div className="db-campo intera">
            <span>Chiave del motore centrale</span>
            <div className="db-sec-pwd"><span className={"db-badge " + (haChiaveCentro ? "verde" : "arancio")}>{haChiaveCentro ? "Impostata" : "Non impostata"}</span></div>
            <div className="db-sec-pwd">
              <input type="password" autoComplete="new-password" aria-label="Chiave del motore centrale" placeholder={haChiaveCentro ? "Incolla una nuova chiave per sostituirla" : "Incolla la chiave"}
                value={chiaveCentro} onChange={(e) => setChiaveCentro(e.target.value)} style={{ flex: "1 1 220px", minHeight: 44, border: 0, borderRadius: 10, background: "var(--campo)", padding: "0 12px", fontSize: 16 }} />
            </div>
          </div>
        </div>
        <div className="db-azioni">
          <button type="button" className="db-btn2 acc" disabled={occ === "centro" || (url.trim() === (righe.motore_centro_url?.value ?? "") && !chiaveCentro.trim())}
            onClick={async () => {
              const coppie: [string, string, boolean][] = [["motore_centro_url", url.trim(), false]];
              if (chiaveCentro.trim()) coppie.push(["motore_centro_chiave", chiaveCentro.trim(), true]);
              await scrivi("centro", coppie, "Motore centrale salvato");
              setChiaveCentro("");
            }}>{occ === "centro" ? "Salvo…" : "Salva"}</button>
          <button type="button" className="db-btn2" disabled={occ === "sync" || !dati.centro.url || !dati.centro.chiave} onClick={() => void sincronizza()}>{occ === "sync" ? "Sincronizzo…" : "Sincronizza"}</button>
        </div>
        {esitoSync && <p className="db-nota" role="status">{esitoSync}</p>}
      </section>
    </>
  );
}
