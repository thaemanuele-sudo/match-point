"use client";
/*
 * Branding del centro: nome dell'app, logo e colori, con anteprima su telefono.
 * Il logo va nel bucket pubblico `centri-pubblico` (cartella = id del centro) perché deve vedersi
 * anche prima che la famiglia acceda; nome e colori diventano le variabili --brand e --brand-ink dell'app.
 */
import { useEffect, useRef, useState } from "react";
import { Campo, Errore, Interruttore, errMsg, useAdmin } from "../comuni";
import { AnteprimaTelefono } from "./AnteprimaTelefono";
import { BUCKET_LOGHI, COLORE_PREDEFINITO, esadecimale, inkPer, urlLogo, type CentroConConteggi } from "./tipi";

const TIPI_LOGO = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_MB = 2;

export function Branding({ centro, ricarica }: { centro: CentroConConteggi; ricarica: () => Promise<void> }) {
  const { sb, avvisa } = useAdmin();
  const colore0 = esadecimale(centro.colore);
  const [nome, setNome] = useState(centro.nome);
  const [nomeApp, setNomeApp] = useState(centro.nome_app ?? centro.nome);
  const [citta, setCitta] = useState(centro.citta ?? "");
  const [colore, setColore] = useState(colore0);
  // il testo sopra il colore è automatico finché non coincide con una scelta diversa già salvata
  const [inkAuto, setInkAuto] = useState(!centro.colore_ink || esadecimale(centro.colore_ink, "") === inkPer(colore0));
  const [inkManuale, setInkManuale] = useState(esadecimale(centro.colore_ink, inkPer(colore0)));
  const [errore, setErrore] = useState<string | null>(null);
  const [occ, setOcc] = useState(false);
  const [logoOcc, setLogoOcc] = useState(false);
  const campoFile = useRef<HTMLInputElement>(null);

  // se il centro cambia (altra scheda, ricarica) il modulo riparte dai dati veri
  useEffect(() => {
    const c = esadecimale(centro.colore);
    setNome(centro.nome); setNomeApp(centro.nome_app ?? centro.nome); setCitta(centro.citta ?? "");
    setColore(c); setInkAuto(!centro.colore_ink || esadecimale(centro.colore_ink, "") === inkPer(c)); setInkManuale(esadecimale(centro.colore_ink, inkPer(c)));
  }, [centro.id, centro.nome, centro.nome_app, centro.citta, centro.colore, centro.colore_ink]);

  const ink = inkAuto ? inkPer(colore) : inkManuale;
  const logo = urlLogo(sb, centro.logo_path);
  const modificato = nome !== centro.nome || nomeApp !== (centro.nome_app ?? centro.nome) || citta !== (centro.citta ?? "") || colore !== colore0 || ink !== esadecimale(centro.colore_ink, "");

  const salva = async () => {
    setErrore(null);
    if (nome.trim().length < 2) return setErrore("Il nome del centro non può essere vuoto.");
    if (nomeApp.trim().length < 2) return setErrore("Scrivi il nome che vedranno nell'app.");
    setOcc(true);
    const { error } = await sb.from("centri").update({
      nome: nome.trim(), nome_app: nomeApp.trim(), citta: citta.trim() || null, colore, colore_ink: ink,
    }).eq("id", centro.id);
    setOcc(false);
    if (error) return setErrore(errMsg(error));
    avvisa("Branding salvato");
    await ricarica();
  };

  const caricaLogo = async (f: File | undefined) => {
    if (!f) return;
    setErrore(null);
    if (!TIPI_LOGO.includes(f.type)) return setErrore("Formato non valido: usa png, jpg, webp o svg.");
    if (f.size > MAX_MB * 1024 * 1024) return setErrore(`Il logo è troppo grande: massimo ${MAX_MB} MB.`);
    setLogoOcc(true);
    const ext = f.type === "image/svg+xml" ? "svg" : f.type.split("/")[1].replace("jpeg", "jpg");
    // nome nuovo a ogni caricamento: così il browser e il PWA non restano col logo vecchio in cache
    const path = `${centro.id}/logo-${crypto.randomUUID()}.${ext}`;
    const su = await sb.storage.from(BUCKET_LOGHI).upload(path, f, { contentType: f.type, cacheControl: "31536000", upsert: false });
    if (su.error) { setLogoOcc(false); return setErrore(errMsg(su.error)); }
    const { error } = await sb.from("centri").update({ logo_path: path }).eq("id", centro.id);
    if (error) {
      await sb.storage.from(BUCKET_LOGHI).remove([path]).catch(() => undefined);
      setLogoOcc(false);
      return setErrore(errMsg(error));
    }
    // il file vecchio non serve più: se non si cancella resta solo spazio occupato
    if (centro.logo_path && !/^https?:/.test(centro.logo_path)) await sb.storage.from(BUCKET_LOGHI).remove([centro.logo_path]).catch(() => undefined);
    setLogoOcc(false);
    avvisa("Logo aggiornato");
    await ricarica();
  };
  const togliLogo = async () => {
    setLogoOcc(true); setErrore(null);
    const { error } = await sb.from("centri").update({ logo_path: null }).eq("id", centro.id);
    if (error) { setLogoOcc(false); return setErrore(errMsg(error)); }
    if (centro.logo_path && !/^https?:/.test(centro.logo_path)) await sb.storage.from(BUCKET_LOGHI).remove([centro.logo_path]).catch(() => undefined);
    setLogoOcc(false);
    avvisa("Logo rimosso");
    await ricarica();
  };

  const coloreAnteprima = /^#[0-9a-fA-F]{6}$/.test(colore) ? colore : COLORE_PREDEFINITO;

  return (
    <section className="db-card">
      <div className="db-card-testa"><h2 className="db-h2">Branding</h2><span className="db-nota">Così le famiglie vedono l&apos;app: nome, logo e colori del centro.</span></div>
      <div className="db-branding">
        <div className="db-form" style={{ padding: 0 }}>
          <Campo lab="Nome del centro" intera><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} /></Campo>
          <Campo lab="Nome dell'app" nota="Quello che compare sul telefono quando si installa l'app (esempio: TC Brera)." intera>
            <input type="text" value={nomeApp} onChange={(e) => setNomeApp(e.target.value)} maxLength={30} />
          </Campo>
          <Campo lab="Città"><input type="text" value={citta} onChange={(e) => setCitta(e.target.value)} maxLength={60} /></Campo>

          <div className="db-campo">
            <span>Colore del centro</span>
            <div className="db-colore">
              <input type="color" aria-label="Scegli il colore" value={coloreAnteprima} onChange={(e) => setColore(e.target.value.toUpperCase())} />
              <input type="text" aria-label="Colore in esadecimale" value={colore} onChange={(e) => setColore(e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value)} maxLength={7} spellCheck={false} />
              <button type="button" className="db-btn2 piccolo" onClick={() => setColore(COLORE_PREDEFINITO)}>Giallo palla</button>
            </div>
          </div>

          <div className="db-campo intera">
            <span>Testo sopra il colore</span>
            <Interruttore valore={inkAuto} onChange={setInkAuto} lab="Scegli in automatico il testo più leggibile" />
            {!inkAuto && (
              <div className="db-colore">
                <input type="color" aria-label="Colore del testo" value={esadecimale(inkManuale, "#0B0B0C")} onChange={(e) => setInkManuale(e.target.value.toUpperCase())} />
                <input type="text" aria-label="Colore del testo in esadecimale" value={inkManuale} onChange={(e) => setInkManuale(e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value)} maxLength={7} spellCheck={false} />
              </div>
            )}
          </div>

          <div className="db-campo intera">
            <span>Logo</span>
            <div className="db-logo-riga">
              <span className="db-centro-mini grande" style={{ background: coloreAnteprima }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logo ? <img src={logo} alt="Logo attuale" /> : <b>{(nomeApp || nome).slice(0, 2).toUpperCase()}</b>}
              </span>
              <div className="db-sottoazioni" style={{ padding: 0 }}>
                <label className="db-btn2 piccolo" style={{ cursor: logoOcc ? "default" : "pointer", opacity: logoOcc ? 0.5 : 1 }}>
                  {logoOcc ? "Attendi…" : centro.logo_path ? "Sostituisci" : "Carica logo"}
                  <input ref={campoFile} type="file" hidden accept={TIPI_LOGO.join(",")} disabled={logoOcc}
                    onChange={(e) => { void caricaLogo(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {centro.logo_path && <button type="button" className="db-btn2 piccolo pericolo" disabled={logoOcc} onClick={togliLogo}>Rimuovi</button>}
              </div>
            </div>
            <small>png, jpg, webp o svg, massimo {MAX_MB} MB. Meglio quadrato, almeno 512 px: serve anche per l&apos;icona dell&apos;app sul telefono.</small>
          </div>

          <div className="db-azioni intera" style={{ padding: 0 }}>
            <button type="button" className="db-btn2 acc" onClick={salva} disabled={occ || !modificato}>{occ ? "Salvo…" : "Salva il branding"}</button>
            {modificato && !occ && <span className="db-nota">Modifiche non ancora salvate</span>}
          </div>
          <div className="intera"><Errore testo={errore} /></div>
        </div>

        <div className="db-branding-tel">
          <AnteprimaTelefono nomeApp={nomeApp} logoUrl={logo} colore={coloreAnteprima} ink={ink} />
          <span className="db-nota" style={{ textAlign: "center" }}>Anteprima</span>
        </div>
      </div>
    </section>
  );
}
