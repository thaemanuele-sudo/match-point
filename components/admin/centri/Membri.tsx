"use client";
/*
 * Membri e ruoli di un centro: aggiungi, cambia ruolo, sospendi o riattiva, "Vedi come".
 * Una persona può avere più ruoli nello stesso centro (ad esempio titolare e direttore tecnico): sono righe diverse.
 * Chi non ha ancora un account resta "invitato" (user_id vuoto) finché non entra con un codice.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Campo, Conferma, Errore, I, Ico, coloreAvatar, errMsg, iniziali, useAdmin } from "../comuni";
import { NOME_RUOLO, RUOLI, doppione, nomeCompleto, urlVediCome, type Area, type CentroConConteggi, type Membro, type RuoloCentro } from "./tipi";

const BADGE: Record<Membro["stato"], string> = { attivo: "verde", invitato: "arancio", sospeso: "grigio" };
const NOME_STATO_MEMBRO: Record<Membro["stato"], string> = { attivo: "Attivo", invitato: "Invitato", sospeso: "Sospeso" };

export function Membri({ centro, aree, ricarica }: { centro: CentroConConteggi; aree: Area[]; ricarica: () => Promise<void> }) {
  const { sb, avvisa } = useAdmin();
  const [lista, setLista] = useState<Membro[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, setCerca] = useState("");
  const [filtro, setFiltro] = useState<RuoloCentro | "tutti">("tutti");
  const [aggiungi, setAggiungi] = useState(false);
  const [occ, setOcc] = useState<string | null>(null);
  const [rimuovi, setRimuovi] = useState<Membro | null>(null);

  const carica = useCallback(async () => {
    const { data, error } = await sb.from("membri").select("*").eq("centro_id", centro.id).order("created_at");
    if (error) return setErrore(errMsg(error));
    setErrore(null);
    setLista((data ?? []) as Membro[]);
  }, [sb, centro.id]);
  useEffect(() => { void carica(); }, [carica]);

  const aggiorna = async (m: Membro, campi: Partial<Membro>, ok: string) => {
    setOcc(m.id); setErrore(null);
    const { error } = await sb.from("membri").update(campi).eq("id", m.id);
    setOcc(null);
    if (error) return setErrore(doppione(error) ? "Questa persona ha già questo ruolo nel centro." : errMsg(error));
    avvisa(ok);
    await carica();
    void ricarica();
  };

  const cambiaRuolo = (m: Membro, ruolo: RuoloCentro) => {
    if (ruolo === m.ruolo) return;
    if (ruolo === "responsabile_area" && !aree.length) return setErrore("Questo centro non ha ancora aree: crea prima un'area dalla sua dashboard.");
    // l'area ha senso solo per il responsabile d'area
    void aggiorna(m, { ruolo, area_id: ruolo === "responsabile_area" ? m.area_id ?? aree[0]?.id ?? null : null }, `Ruolo cambiato in ${NOME_RUOLO[ruolo].toLowerCase()}`);
  };

  const elenco = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return (lista ?? []).filter((m) =>
      (filtro === "tutti" || m.ruolo === filtro) &&
      (!q || [m.nome, m.cognome, m.email].some((x) => (x ?? "").toLowerCase().includes(q))));
  }, [lista, cerca, filtro]);
  const presenti = RUOLI.filter((r) => (lista ?? []).some((m) => m.ruolo === r));

  return (
    <section className="db-card">
      <div className="db-card-testa">
        <h2 className="db-h2">Membri e ruoli</h2>
        <button type="button" className="db-btn2 acc piccolo" onClick={() => setAggiungi((v) => !v)} aria-expanded={aggiungi}><Ico d={I.piu} size={14} /> Aggiungi</button>
      </div>

      {aggiungi && <NuovoMembro centro={centro} aree={aree} fatto={async () => { setAggiungi(false); await carica(); void ricarica(); }} />}

      <div className="db-sottoazioni" style={{ paddingTop: 4 }}>
        <label className="db-cerca" style={{ minWidth: 200 }}>
          <Ico d={I.cerca} size={18} />
          <input type="search" placeholder="Cerca per nome o email" aria-label="Cerca membro" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </label>
        <div className="db-chipset" role="group" aria-label="Filtra per ruolo">
          <button type="button" className="db-chip" aria-pressed={filtro === "tutti"} onClick={() => setFiltro("tutti")}>Tutti</button>
          {presenti.map((r) => <button key={r} type="button" className="db-chip" aria-pressed={filtro === r} onClick={() => setFiltro(r)}>{NOME_RUOLO[r]}</button>)}
        </div>
      </div>
      <div style={{ padding: "0 20px" }}><Errore testo={errore} /></div>

      {!lista && !errore && <div className="db-vuoto">Carico i membri…</div>}
      {elenco.map((m) => (
        <div key={m.id} className="db-elenco-riga db-membro">
          <span className="db-avatar" style={{ background: coloreAvatar(m.id) }}>{iniziali(m.nome ?? "", m.cognome ?? "")}</span>
          <span className="t">
            <b>{nomeCompleto(m)}</b>
            <small>{m.email ?? "senza email"}{m.user_id ? "" : " · non ha ancora un account"}</small>
          </span>
          <span className="db-membro-campi">
            <select className="db-select" aria-label={`Ruolo di ${nomeCompleto(m)}`} value={m.ruolo} disabled={occ === m.id} onChange={(e) => cambiaRuolo(m, e.target.value as RuoloCentro)}>
              {RUOLI.map((r) => <option key={r} value={r}>{NOME_RUOLO[r]}</option>)}
            </select>
            {m.ruolo === "responsabile_area" && (
              <select className="db-select" aria-label={`Area di ${nomeCompleto(m)}`} value={m.area_id ?? ""} disabled={occ === m.id}
                onChange={(e) => void aggiorna(m, { area_id: e.target.value || null }, "Area cambiata")}>
                {!m.area_id && <option value="">Scegli l&apos;area</option>}
                {aree.map((a) => <option key={a.id} value={a.id}>{a.sigla || a.nome}</option>)}
              </select>
            )}
            <span className={"db-badge " + BADGE[m.stato]}>{NOME_STATO_MEMBRO[m.stato]}</span>
          </span>
          <span className="az">
            <a className="db-btn2 piccolo" href={urlVediCome(centro.slug, m.id)} target="_blank" rel="noopener noreferrer" aria-label={`Vedi l'app come ${nomeCompleto(m)}`}><Ico d={I.occhio} size={14} /> Vedi come</a>
            {m.stato === "sospeso"
              ? <button type="button" className="db-btn2 piccolo" disabled={occ === m.id} onClick={() => void aggiorna(m, { stato: m.user_id ? "attivo" : "invitato" }, "Membro riattivato")}>Riattiva</button>
              : <button type="button" className="db-btn2 piccolo" disabled={occ === m.id} onClick={() => void aggiorna(m, { stato: "sospeso" }, "Membro sospeso")}>Sospendi</button>}
            {!m.user_id && <button type="button" className="db-btn2 piccolo pericolo" disabled={occ === m.id} onClick={() => setRimuovi(m)}>Rimuovi</button>}
          </span>
        </div>
      ))}
      {lista && !elenco.length && <div className="db-vuoto">{lista.length ? "Nessun membro corrisponde alla ricerca." : "Questo centro non ha ancora membri. Aggiungine uno o crea un invito."}</div>}

      {rimuovi && (
        <Conferma titolo="Rimuovere questa persona?" azione="Rimuovi" occupato={occ === rimuovi.id}
          testo={`${nomeCompleto(rimuovi)} non ha ancora un account: la riga sparisce dal centro. Chi ha già un account si sospende, non si rimuove.`}
          onNo={() => setRimuovi(null)}
          onSi={async () => {
            setOcc(rimuovi.id);
            const { error } = await sb.from("membri").delete().eq("id", rimuovi.id);
            setOcc(null);
            setRimuovi(null);
            if (error) return setErrore(errMsg(error));
            avvisa("Persona rimossa");
            await carica();
            void ricarica();
          }} />
      )}
    </section>
  );
}

/** Aggiunge una persona. Se la sua email ha già un account Match Point la collega subito, altrimenti resta "invitata". */
function NuovoMembro({ centro, aree, fatto }: { centro: CentroConConteggi; aree: Area[]; fatto: () => void | Promise<void> }) {
  const { sb, avvisa } = useAdmin();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [ruolo, setRuolo] = useState<RuoloCentro>("maestro");
  const [area, setArea] = useState(aree[0]?.id ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);

  const salva = async () => {
    setErrore(null);
    const mail = email.trim().toLowerCase();
    if (!nome.trim() || !cognome.trim()) return setErrore("Scrivi nome e cognome.");
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setErrore("Controlla l'indirizzo email.");
    if (ruolo === "responsabile_area" && !area) return setErrore("Per il responsabile d'area scegli l'area (il centro non ne ha ancora: crea prima un'area).");
    setOcc(true);
    // se l'email ha già un account lo si collega; se la lettura dei profili non è permessa si prosegue come invitato
    let userId: string | null = null;
    if (mail) {
      const { data } = await sb.from("profiles").select("id").ilike("email", mail).maybeSingle();
      userId = (data as { id: string } | null)?.id ?? null;
    }
    const { error } = await sb.from("membri").insert({
      centro_id: centro.id, user_id: userId, ruolo, nome: nome.trim(), cognome: cognome.trim(), email: mail || null,
      area_id: ruolo === "responsabile_area" ? area : null, stato: userId ? "attivo" : "invitato",
    });
    setOcc(false);
    if (error) return setErrore(doppione(error) ? "Questa persona ha già questo ruolo nel centro." : errMsg(error));
    avvisa(userId ? "Persona aggiunta e collegata al suo account" : "Persona aggiunta: userà un codice invito per entrare");
    await fatto();
  };

  return (
    <div style={{ borderTop: ".5px solid var(--sep)", borderBottom: ".5px solid var(--sep)", margin: "4px 0 12px", background: "var(--card2)" }}>
      <div className="db-form" style={{ paddingTop: 16 }}>
        <Campo lab="Nome"><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} /></Campo>
        <Campo lab="Cognome"><input type="text" value={cognome} onChange={(e) => setCognome(e.target.value)} maxLength={60} /></Campo>
        <Campo lab="Email" nota="Se ha già un account Match Point con questa email, lo colleghiamo subito."><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></Campo>
        <Campo lab="Ruolo">
          <select value={ruolo} onChange={(e) => setRuolo(e.target.value as RuoloCentro)}>{RUOLI.map((r) => <option key={r} value={r}>{NOME_RUOLO[r]}</option>)}</select>
        </Campo>
        {ruolo === "responsabile_area" && (
          <Campo lab="Area">
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {!aree.length && <option value="">Nessuna area</option>}
              {aree.map((a) => <option key={a.id} value={a.id}>{a.sigla || a.nome}</option>)}
            </select>
          </Campo>
        )}
      </div>
      <div className="db-azioni">
        <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ}>{occ ? "Aggiungo…" : "Aggiungi al centro"}</button>
      </div>
      <div style={{ padding: "0 20px 16px" }}><Errore testo={errore} /></div>
    </div>
  );
}
