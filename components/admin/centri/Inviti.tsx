"use client";
/*
 * Inviti di un centro: codici di 6 caratteri con ruolo, scadenza e numero massimo di usi.
 * Chi riceve il codice (o il link /app/unisciti?c=CODICE) entra nel centro con il ruolo dell'invito,
 * tramite la funzione `unisciti_con_codice`. Il codice è unico nel database: in caso di doppione se ne genera un altro.
 */
import { useCallback, useEffect, useState } from "react";
import { Campo, Conferma, Errore, I, Ico, data, errMsg, useAdmin } from "../comuni";
import { COL_INVITO, NOME_RUOLO, PAGINA, RUOLI, doppione, generaCodice, urlInvito, type Area, type CentroConConteggi, type Gruppo, type Invito, type RuoloCentro } from "./tipi";

export function Inviti({ centro, aree }: { centro: CentroConConteggi; aree: Area[] }) {
  const { sb, avvisa } = useAdmin();
  // a pagine di 50 con "carica altri": un grande centro ha un invito per ogni allievo
  const [lista, setLista] = useState<Invito[] | null>(null);
  const [altri, setAltri] = useState(false);
  const [totale, setTotale] = useState<number | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [io, setIo] = useState<string | null>(null); // la riga "membro" del super admin in questo centro, se c'è
  const [errore, setErrore] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);
  const [elimina, setElimina] = useState<Invito | null>(null);
  const [nuovoCodice, setNuovoCodice] = useState<Invito | null>(null);
  const [copiato, setCopiato] = useState<string | null>(null);

  const [ruolo, setRuolo] = useState<RuoloCentro>("maestro");
  const [areaId, setAreaId] = useState("");
  const [gruppoId, setGruppoId] = useState("");
  const [giorni, setGiorni] = useState("14");
  const [usiMax, setUsiMax] = useState("1");

  const leggi = useCallback(
    // si chiede una riga in più per sapere se c'è un'altra pagina
    (da: number) => sb.from("inviti").select(COL_INVITO).eq("centro_id", centro.id).order("created_at", { ascending: false }).order("id").range(da, da + PAGINA),
    [sb, centro.id],
  );
  const carica = useCallback(async () => {
    const [r, n] = await Promise.all([leggi(0), sb.from("inviti").select("id", { count: "exact", head: true }).eq("centro_id", centro.id)]);
    if (r.error) return setErrore(errMsg(r.error));
    setErrore(null);
    const righe = (r.data ?? []) as Invito[];
    setLista(righe.slice(0, PAGINA));
    setAltri(righe.length > PAGINA);
    setTotale(n.count ?? righe.length);
  }, [sb, centro.id, leggi]);
  const caricaAltri = async () => {
    if (!lista || caricando) return;
    setCaricando(true);
    const { data: d, error } = await leggi(lista.length);
    setCaricando(false);
    if (error) return setErrore(errMsg(error));
    const righe = (d ?? []) as Invito[];
    setLista([...lista, ...righe.slice(0, PAGINA)]);
    setAltri(righe.length > PAGINA);
  };
  useEffect(() => { void carica(); }, [carica]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const g = await sb.from("gruppi").select("id, nome").eq("centro_id", centro.id).order("nome");
      if (vivo) setGruppi((g.data ?? []) as Gruppo[]);
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return;
      const m = await sb.from("membri").select("id").eq("centro_id", centro.id).eq("user_id", u.user.id).limit(1).maybeSingle();
      if (vivo) setIo((m.data as { id: string } | null)?.id ?? null);
    })();
    return () => { vivo = false; };
  }, [sb, centro.id]);

  const usaGruppo = ruolo === "maestro" || ruolo === "allievo";
  const usaArea = ruolo === "responsabile_area";
  // l'area mostrata nel menu (la prima, se non si è scelto nulla) è quella che si salva
  const areaEff = areaId || aree[0]?.id || "";

  const crea = async () => {
    setErrore(null);
    const g = Number(giorni), u = Number(usiMax);
    if (!Number.isInteger(g) || g < 1 || g > 365) return setErrore("La validità va da 1 a 365 giorni.");
    if (!Number.isInteger(u) || u < 1 || u > 10000) return setErrore("Il numero di usi va da 1 a 10000.");
    if (usaArea && !areaEff) return setErrore("Scegli l'area del responsabile (il centro non ne ha ancora: crea prima un'area).");
    setOcc(true);
    const scade = new Date(Date.now() + g * 864e5).toISOString();
    for (let i = 0; i < 5; i++) {
      const riga: Record<string, unknown> = {
        centro_id: centro.id, codice: generaCodice(), ruolo, scade_il: scade, usi_max: u,
        area_id: usaArea ? areaEff : null, gruppo_id: usaGruppo && gruppoId ? gruppoId : null,
      };
      if (io) riga.creato_da = io;
      const { data: nuovo, error } = await sb.from("inviti").insert(riga).select(COL_INVITO).maybeSingle();
      if (!error) {
        setOcc(false);
        setNuovoCodice(nuovo as Invito | null);
        avvisa("Invito creato");
        await carica();
        return;
      }
      if (!doppione(error)) { setOcc(false); return setErrore(errMsg(error)); }
    }
    setOcc(false);
    setErrore("Non sono riuscito a generare un codice libero. Riprova.");
  };

  const copia = async (chiave: string, testo: string) => {
    try { await navigator.clipboard.writeText(testo); setCopiato(chiave); window.setTimeout(() => setCopiato((x) => (x === chiave ? null : x)), 1800); }
    catch { setErrore("Non riesco a copiare: seleziona il testo a mano."); }
  };

  const stato = (i: Invito) => {
    if (i.scade_il && new Date(i.scade_il) < new Date()) return { t: "Scaduto", c: "grigio" };
    if (i.usi_max !== null && i.usi >= i.usi_max) return { t: "Esaurito", c: "grigio" };
    return { t: "Valido", c: "verde" };
  };
  const dettaglio = (i: Invito) => {
    const parti: string[] = [NOME_RUOLO[i.ruolo]];
    if (i.area_id) parti.push(aree.find((a) => a.id === i.area_id)?.sigla || aree.find((a) => a.id === i.area_id)?.nome || "area");
    if (i.gruppo_id) parti.push(gruppi.find((g) => g.id === i.gruppo_id)?.nome || "gruppo");
    return parti.join(" · ");
  };

  return (
    <>
      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Nuovo invito</h2><span className="db-nota">Il codice si dà a voce o si manda in un messaggio.</span></div>
        <div className="db-form">
          <Campo lab="Ruolo che riceve">
            <select value={ruolo} onChange={(e) => setRuolo(e.target.value as RuoloCentro)}>
              {RUOLI.map((r) => <option key={r} value={r}>{NOME_RUOLO[r]}</option>)}
            </select>
          </Campo>
          {usaArea && (
            <Campo lab="Area">
              <select value={areaEff} onChange={(e) => setAreaId(e.target.value)}>
                {!aree.length && <option value="">Nessuna area</option>}
                {aree.map((a) => <option key={a.id} value={a.id}>{a.sigla || a.nome}</option>)}
              </select>
            </Campo>
          )}
          {usaGruppo && (
            <Campo lab="Gruppo (facoltativo)">
              <select value={gruppoId} onChange={(e) => setGruppoId(e.target.value)}>
                <option value="">Nessun gruppo in particolare</option>
                {gruppi.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </Campo>
          )}
          <Campo lab="Valido per (giorni)"><input type="number" min={1} max={365} value={giorni} onChange={(e) => setGiorni(e.target.value)} /></Campo>
          <Campo lab="Quante persone possono usarlo" nota="1 per un invito personale, di più per un codice da dare a un gruppo."><input type="number" min={1} max={10000} value={usiMax} onChange={(e) => setUsiMax(e.target.value)} /></Campo>
        </div>
        <div className="db-azioni">
          <button type="button" className="db-btn2 acc" onClick={crea} disabled={occ}>{occ ? "Creo…" : "Genera il codice"}</button>
        </div>
        <div style={{ padding: "0 20px 16px" }}><Errore testo={errore} /></div>
        {nuovoCodice && (
          <div className="db-codice-nuovo" role="status">
            <span className="db-nota">Codice appena creato · {dettaglio(nuovoCodice)}</span>
            <span className="db-codice">{nuovoCodice.codice}</span>
            <span className="db-sottoazioni" style={{ padding: 0 }}>
              <button type="button" className="db-btn2" onClick={() => copia("n", nuovoCodice.codice)}><Ico d={I.copia} size={16} /> {copiato === "n" ? "Copiato" : "Copia codice"}</button>
              <button type="button" className="db-btn2" onClick={() => copia("nl", urlInvito(nuovoCodice.codice))}><Ico d={I.copia} size={16} /> {copiato === "nl" ? "Copiato" : "Copia link"}</button>
            </span>
          </div>
        )}
      </section>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Inviti del centro</h2><span className="db-nota">{totale ?? lista?.length ?? 0} in tutto</span></div>
        {!lista && !errore && <div className="db-vuoto">Carico gli inviti…</div>}
        {lista?.map((i) => {
          const s = stato(i);
          return (
            <div key={i.id} className="db-elenco-riga">
              <span className="db-codice piccolo">{i.codice}</span>
              <span className="t">
                <b>{dettaglio(i)}</b>
                <small>usato {i.usi}{i.usi_max !== null ? ` su ${i.usi_max}` : ""} · {i.scade_il ? `scade il ${data(i.scade_il)}` : "senza scadenza"}</small>
              </span>
              <span className={"db-badge " + s.c}>{s.t}</span>
              <span className="az">
                <button type="button" className="db-btn2 piccolo" onClick={() => copia(i.id, urlInvito(i.codice))}><Ico d={I.copia} size={14} /> {copiato === i.id ? "Copiato" : "Copia link"}</button>
                <button type="button" className="db-btn2 piccolo pericolo" onClick={() => setElimina(i)} aria-label={`Elimina l'invito ${i.codice}`}>Elimina</button>
              </span>
            </div>
          );
        })}
        {lista && !lista.length && <div className="db-vuoto">Nessun invito: genera il primo qui sopra.</div>}
        {altri && <div className="db-sottoazioni" style={{ justifyContent: "center" }}><button type="button" className="db-btn2" disabled={caricando} onClick={() => void caricaAltri()}>Carica altri</button></div>}
      </section>

      {elimina && (
        <Conferma titolo="Eliminare l'invito?" azione="Elimina" occupato={occ}
          testo={`Il codice ${elimina.codice} smette di funzionare. Chi è già entrato resta nel centro.`}
          onNo={() => setElimina(null)}
          onSi={async () => {
            setOcc(true);
            const { error } = await sb.from("inviti").delete().eq("id", elimina.id);
            setOcc(false);
            setElimina(null);
            if (error) return setErrore(errMsg(error));
            if (nuovoCodice?.id === elimina.id) setNuovoCodice(null);
            avvisa("Invito eliminato");
            await carica();
          }} />
      )}
    </>
  );
}
