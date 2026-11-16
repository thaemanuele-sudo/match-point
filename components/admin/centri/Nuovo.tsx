"use client";
/*
 * Crea un centro: vuoto (solo la riga del centro, in prova per 30 giorni) oppure clonato.
 * Clonare = funzione `clona_centro(sorgente, nome, slug)`: copia Metodo, aree, campi, corsi, permessi e impostazioni
 * del centro scelto (o del modello Match Point), ma non persone, allievi, messaggi e pagamenti.
 */
import { useState } from "react";
import { Campo, Errore, errMsg, useAdmin } from "../comuni";
import { COLORE_PREDEFINITO, INK_SCURO, SLUG_MODELLO, SLUG_VALIDO, aggiungiGiorni, doppione, oggiISO, slugify, type Centro } from "./tipi";

export function Nuovo({ centri, chiudi, creato }: { centri: Centro[]; chiudi: () => void; creato: (slug: string) => void | Promise<void> }) {
  const { sb, avvisa } = useAdmin();
  const modello = centri.find((c) => c.slug === SLUG_MODELLO);
  const [modo, setModo] = useState<"vuoto" | "clonato">(modello ? "clonato" : "vuoto");
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocco, setSlugTocco] = useState(false);
  const [citta, setCitta] = useState("");
  const [sorgente, setSorgente] = useState(modello?.id ?? centri[0]?.id ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);

  // finché non si scrive a mano l'indirizzo, segue il nome del centro
  const cambiaNome = (v: string) => { setNome(v); if (!slugTocco) setSlug(slugify(v)); };

  const crea = async () => {
    setErrore(null);
    const n = nome.trim();
    const s = slug.trim();
    if (n.length < 2) return setErrore("Scrivi il nome del centro.");
    if (!SLUG_VALIDO.test(s)) return setErrore("L'indirizzo può avere solo lettere minuscole, numeri e trattini (esempio: tc-brera).");
    if (modo === "clonato" && !sorgente) return setErrore("Scegli il centro da cui clonare.");
    setOcc(true);
    if (modo === "clonato") {
      const { error } = await sb.rpc("clona_centro", { sorgente, nome: n, slug: s });
      if (error) { setOcc(false); return setErrore(doppione(error) ? "Esiste già un centro con questo indirizzo." : errMsg(error)); }
      // la città non fa parte di ciò che si clona: si aggiunge subito
      if (citta.trim()) await sb.from("centri").update({ citta: citta.trim() }).eq("slug", s);
    } else {
      const { error } = await sb.from("centri").insert({
        slug: s, nome: n, nome_app: n, citta: citta.trim() || null,
        colore: COLORE_PREDEFINITO, colore_ink: INK_SCURO, stato: "prova", prova_fino: aggiungiGiorni(oggiISO(), 30),
      });
      if (error) { setOcc(false); return setErrore(doppione(error) ? "Esiste già un centro con questo indirizzo." : errMsg(error)); }
    }
    setOcc(false);
    avvisa(modo === "clonato" ? "Centro clonato" : "Centro creato");
    await creato(s);
  };

  return (
    <section className="db-card" aria-label="Nuovo centro">
      <div className="db-card-testa"><h2 className="db-h2">Nuovo centro</h2><span className="db-nota">Poi potrai cambiare nome, logo e colori dalla scheda del centro.</span></div>
      <div className="db-form">
        <div className="db-campo intera">
          <span>Come parte</span>
          <div className="db-seg" role="group" aria-label="Come parte il centro" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={modo === "vuoto"} onClick={() => setModo("vuoto")}>Vuoto</button>
            <button type="button" aria-pressed={modo === "clonato"} onClick={() => setModo("clonato")}>Clonato da un centro</button>
          </div>
          <small>{modo === "vuoto" ? "Solo il centro, senza aree, campi né Metodo: si compila tutto a mano." : "Copia Metodo, aree, campi, corsi, permessi e impostazioni. Non copia persone, allievi, messaggi e pagamenti."}</small>
        </div>
        <Campo lab="Nome del centro"><input type="text" value={nome} onChange={(e) => cambiaNome(e.target.value)} placeholder="Tennis Club Brera" maxLength={80} /></Campo>
        <Campo lab="Indirizzo dell'app" nota={slug ? `/c/${slug}` : "Lettere minuscole, numeri e trattini"}>
          <input type="text" value={slug} onChange={(e) => { setSlugTocco(true); setSlug(slugify(e.target.value)); }} placeholder="tc-brera" maxLength={40} />
        </Campo>
        <Campo lab="Città"><input type="text" value={citta} onChange={(e) => setCitta(e.target.value)} placeholder="Milano" maxLength={60} /></Campo>
        {modo === "clonato" && (
          <Campo lab="Clona da">
            <select value={sorgente} onChange={(e) => setSorgente(e.target.value)}>
              {modello && <option value={modello.id}>Modello Match Point</option>}
              {centri.filter((c) => c.slug !== SLUG_MODELLO).map((c) => <option key={c.id} value={c.id}>{c.nome} (/c/{c.slug})</option>)}
            </select>
          </Campo>
        )}
      </div>
      <div className="db-azioni">
        <button type="button" className="db-btn2 acc" onClick={crea} disabled={occ}>{occ ? "Creo…" : modo === "clonato" ? "Clona il centro" : "Crea il centro"}</button>
        <button type="button" className="db-btn2" onClick={chiudi} disabled={occ}>Annulla</button>
      </div>
      <div style={{ padding: "0 20px 16px" }}><Errore testo={errore} /></div>
    </section>
  );
}
