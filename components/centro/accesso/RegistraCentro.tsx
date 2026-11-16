"use client";
/*
 * P3 · Registra il tuo centro  (/app/registra-centro)
 * Tre passi: 1) dati del centro, 2) codici per invitare maestri e famiglie, 3) parte la prova gratuita di 30 giorni.
 * La registrazione è la funzione del database `registra_centro(nome, citta, slug, campi)`: crea il centro in prova,
 * mette chi la chiama come titolare e direttore tecnico (il direttore è anche il responsabile tutela dei minori:
 * le segnalazioni arrivano a lui e non ai maestri) e copia il modello Match Point.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useProfilo } from "@/lib/useProfilo";
import { Schermo } from "@/components/app/Schermo";
import { generaCodice, messaggioErrore, percorsoRuolo, salvaScelta, slugify, type RuoloCentro } from "./comune";
import { IcoCondividi, IcoCopia, IcoFrecciaIndietro, IcoMeno, IcoPiuPiccolo, IcoScudo, IcoMaestro, IcoSpunta } from "./icone";
import s from "./accesso.module.css";

const IT = {
  kick: "Prova gratuita · senza impegno",
  titolo: "Registra il tuo centro",
  passiAria: "I tre passi",
  passo1: "Dati del centro",
  passo2: "Invita maestri e famiglie",
  passo3: "Parte la prova gratuita",
  nome: "Nome del centro",
  citta: "Città",
  campi: "Numero di campi",
  campiMeno: "Un campo in meno",
  campiPiu: "Un campo in più",
  referente: "Titolare o referente",
  email: "Email",
  telefono: "Telefono",
  ruolo: "Il tuo ruolo nel centro",
  ruoloTitolare: "Titolare",
  ruoloDt: "Direttore tecnico",
  notaTitolare: "Potrai nominare il direttore tecnico: sarà il responsabile tutela dei minori.",
  notaDt: "Sarai anche il responsabile tutela: le segnalazioni arrivano a te, non ai maestri.",
  indirizzo: "Indirizzo dell'app del centro: /c/{slug}",
  registra: "Registra e inizia la prova",
  invio: "Registro il centro…",
  team: "In alternativa ti attiva il team Match Point.",
  teamResto: " Lasci i dati e il centro viene configurato per te.",
  haiCodice: "Hai già un codice?",
  unisciti: "Unisciti a un centro",
  indietro: "Indietro",
  // validazioni ed errori
  errNome: "Scrivi il nome del centro.",
  errCitta: "Scrivi la città.",
  errReferente: "Scrivi nome e cognome del titolare o referente.",
  errEmail: "Controlla l'indirizzo email.",
  errTelefono: "Controlla il numero di telefono.",
  errGenerico: "Non sono riuscito a registrare il centro. Riprova tra poco.",
  errSlugOccupato: "Esiste già un centro con un indirizzo troppo simile: prova a cambiare il nome.",
  // passo 2
  p2Titolo: "Invita maestri e famiglie",
  p2Intro: "Condividi questi codici: chi li riceve si unisce al centro con il ruolo giusto. Puoi crearne altri quando vuoi dalla dashboard.",
  p2Maestri: "Codice per i maestri",
  p2Famiglie: "Codice per le famiglie",
  p2Valido: "Valido 30 giorni",
  copia: "Copia codice",
  copiaLink: "Copia link",
  copiato: "Copiato",
  condividi: "Condividi",
  messaggioMaestri: "Ti invito su {centro} con Match Point: apri il link e unisciti come maestro.",
  messaggioFamiglie: "Ti invito su {centro} con Match Point: apri il link e unisciti come famiglia.",
  creoCodici: "Creo i codici…",
  errCodici: "Non sono riuscito a creare i codici adesso. Puoi crearli dopo dalla dashboard del centro.",
  continua: "Continua",
  salta: "Salta per ora",
  // passo 3
  p3Titolo: "Si parte!",
  p3Prova: "La prova gratuita di 30 giorni è attiva fino al {data}.",
  p3Uno: "Il centro nasce con il Metodo Match Point già pronto: aree, linee guida e modelli di lezione.",
  p3Due: "Aggiungi campi, gruppi e allievi dalla dashboard, a tuo ritmo.",
  p3Tre: "Nessun pagamento adesso: prima di fine prova ti avvisiamo.",
  apri: "Apri la dashboard del centro",
};
const T = { it: IT, en: IT };

const sostituisci = (txt: string, v: Record<string, string | number>) => txt.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
const GIORNI_PROVA = 30;

type Creato = { id: string; slug: string; nome: string; membroId: string | null; provaFino: string };
type Codici = { maestro: string; genitore: string };

export default function RegistraCentro() {
  const t = useT(T);
  const router = useRouter();
  const { profilo } = useProfilo();
  const [passo, setPasso] = useState<1 | 2 | 3>(1);

  const [nome, setNome] = useState("");
  const [citta, setCitta] = useState("");
  const [campi, setCampi] = useState(4);
  const [referente, setReferente] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ruolo, setRuolo] = useState<"titolare" | "dt">("titolare");
  const [errore, setErrore] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);
  const [creato, setCreato] = useState<Creato | null>(null);

  // i dati personali partono dal profilo dell'account (una sola volta, senza sovrascrivere ciò che l'utente ha già scritto)
  const precompilato = useRef(false);
  useEffect(() => {
    if (!profilo || precompilato.current) return;
    precompilato.current = true;
    setReferente((v) => v || `${profilo.nome} ${profilo.cognome}`.trim());
    setEmail((v) => v || profilo.email || "");
    setTelefono((v) => v || profilo.telefono || "");
  }, [profilo]);

  const slugProposto = slugify(nome);

  async function registra(e: FormEvent) {
    e.preventDefault();
    if (invio) return;
    const dati = { nome: nome.trim(), citta: citta.trim(), referente: referente.trim().replace(/\s+/g, " "), email: email.trim(), telefono: telefono.trim() };
    if (dati.nome.length < 2 || !slugProposto) return setErrore(t.errNome);
    if (dati.citta.length < 2) return setErrore(t.errCitta);
    if (!dati.referente.includes(" ")) return setErrore(t.errReferente);
    if (!emailOk(dati.email)) return setErrore(t.errEmail);
    if (dati.telefono && dati.telefono.replace(/\D/g, "").length < 6) return setErrore(t.errTelefono);

    setInvio(true); setErrore(null);
    const sb = supabaseBrowser();
    try {
      // se l'indirizzo è già preso si riprova con una coda casuale (un solo tentativo in più)
      let slug = slugProposto;
      let risposta = await sb.rpc("registra_centro", { nome: dati.nome, citta: dati.citta, slug, campi });
      if (risposta.error && /23505|duplicate|unique|già|exist/.test(messaggioErrore(risposta.error))) {
        slug = `${slugProposto.slice(0, 34)}-${Math.random().toString(36).slice(2, 6)}`;
        risposta = await sb.rpc("registra_centro", { nome: dati.nome, citta: dati.citta, slug, campi });
        if (risposta.error && /23505|duplicate|unique/.test(messaggioErrore(risposta.error))) { setErrore(t.errSlugOccupato); setInvio(false); return; }
      }
      if (risposta.error) throw risposta.error;

      // la funzione può restituire il centro, il suo id o l'indirizzo: per essere sicuri si rilegge dal database
      const r = risposta.data as unknown;
      const slugRisposta = r && typeof r === "object" && "slug" in (r as object) ? String((r as { slug: unknown }).slug) : slug;
      const { data: c, error: errC } = await sb.from("centri").select("id, slug, nome, prova_fino").eq("slug", slugRisposta).maybeSingle();
      if (errC || !c) throw errC ?? new Error("centro non trovato");

      const { data: u } = await sb.auth.getUser();
      let membroId: string | null = null;
      if (u.user) {
        // il profilo del titolare riceve i contatti scritti nel modulo; è un dato in più, quindi un errore qui non ferma la registrazione
        const [n, ...resto] = dati.referente.split(" ");
        await sb.from("membri").update({ nome: n, cognome: resto.join(" "), email: dati.email, telefono: dati.telefono || null })
          .eq("centro_id", c.id).eq("user_id", u.user.id).then(() => undefined, () => undefined);
        const { data: mm } = await sb.from("membri").select("id, ruolo").eq("centro_id", c.id).eq("user_id", u.user.id);
        const lista = (mm ?? []) as { id: string; ruolo: RuoloCentro }[];
        const scelto = lista.find((x) => x.ruolo === ruolo) ?? lista.find((x) => x.ruolo === "dt") ?? lista[0];
        if (scelto) { membroId = scelto.id; salvaScelta(c.slug, scelto.id, scelto.ruolo); }
      }
      const fine = c.prova_fino ?? new Date(Date.now() + GIORNI_PROVA * 864e5).toISOString().slice(0, 10);
      setCreato({ id: c.id, slug: c.slug, nome: c.nome, membroId, provaFino: fine });
      setPasso(2);
    } catch {
      setErrore(t.errGenerico);
    }
    setInvio(false);
  }

  const passi = [t.passo1, t.passo2, t.passo3];

  return (
    <Schermo>
      <div className={`${s.q} ${s.fitto}`}>
        <header className={s.hdr}>
          <Link href="/app/profili" className={s.indietro} aria-label={t.indietro}><IcoFrecciaIndietro /></Link>
          <div className={s.grow}><div className={s.kick}>{t.kick}</div><h1 className={s.h1}>{t.titolo}</h1></div>
        </header>

        <ol className={s.passi} aria-label={t.passiAria}>
          {passi.map((nomePasso, i) => (
            <li key={i} className={`${s.passo} ${passo === i + 1 ? s.on : ""} ${passo > i + 1 ? s.fatto : ""}`} aria-current={passo === i + 1 ? "step" : undefined}>
              <span className={s.num}>{passo > i + 1 ? <IcoSpunta size={13} /> : i + 1}</span>
              <span className={s.nomePasso}>{nomePasso}</span>
            </li>
          ))}
        </ol>

        {passo === 1 && (
          <form onSubmit={registra} noValidate style={{ display: "contents" }}>
            <label className={s.campo}>
              <span className={s.k}>{t.nome}</span>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="organization" maxLength={80} />
              {slugProposto && <span className={s.aiuto}>{sostituisci(t.indirizzo, { slug: slugProposto })}</span>}
            </label>

            <div className={s.g2}>
              <label className={s.campo}>
                <span className={s.k}>{t.citta}</span>
                <input type="text" value={citta} onChange={(e) => setCitta(e.target.value)} autoComplete="address-level2" maxLength={60} />
              </label>
              <div>
                <span className={s.k} id="lblCampi">{t.campi}</span>
                <div role="group" aria-labelledby="lblCampi" className={s.contatore}>
                  <button type="button" aria-label={t.campiMeno} onClick={() => setCampi((c) => Math.max(1, c - 1))}><IcoMeno /></button>
                  <b aria-live="polite">{campi}</b>
                  <button type="button" aria-label={t.campiPiu} onClick={() => setCampi((c) => Math.min(30, c + 1))}><IcoPiuPiccolo /></button>
                </div>
              </div>
            </div>

            <label className={s.campo}>
              <span className={s.k}>{t.referente}</span>
              <input type="text" value={referente} onChange={(e) => setReferente(e.target.value)} autoComplete="name" maxLength={80} />
            </label>
            <label className={s.campo}>
              <span className={s.k}>{t.email}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" maxLength={120} />
            </label>
            <label className={s.campo}>
              <span className={s.k}>{t.telefono}</span>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" maxLength={30} />
            </label>

            <div>
              <span className={s.k}>{t.ruolo}</span>
              <div className={s.chips} role="group" aria-label={t.ruolo} style={{ marginTop: 6 }}>
                {(["titolare", "dt"] as const).map((r) => (
                  <button key={r} type="button" className={r === ruolo ? `${s.chip} ${s.on}` : s.chip} aria-pressed={r === ruolo} onClick={() => setRuolo(r)}>
                    {r === "titolare" ? t.ruoloTitolare : t.ruoloDt}
                  </button>
                ))}
              </div>
              <div className={s.notaRuolo}><IcoScudo />{" "}<span>{ruolo === "titolare" ? t.notaTitolare : t.notaDt}</span></div>
            </div>

            {errore && <div className={s.errore} role="alert">{errore}</div>}

            <button type="submit" className={s.btn} style={{ marginTop: 2 }} disabled={invio}>{invio ? t.invio : t.registra}</button>
            <div className={s.note} style={{ padding: "9px 12px" }}>
              <IcoMaestro size={18} />
              <span><b style={{ color: "#F3F6F1" }}>{t.team}</b>{t.teamResto}</span>
            </div>
            <div className={s.centrato} style={{ fontSize: 13, color: "#A1A1A6" }}>
              {t.haiCodice}{" "}<Link href="/app/unisciti" style={{ fontWeight: 700, textDecoration: "none" }}>{t.unisciti}</Link>
            </div>
          </form>
        )}

        {passo === 2 && creato && <PassoInviti creato={creato} t={t} avanti={() => setPasso(3)} />}

        {passo === 3 && creato && (
          <>
            <h2 className={s.vittoria}>{t.p3Titolo}</h2>
            <div className={`${s.card} ${s.pad} ${s.giallo}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className={s.nomeCentro}>{creato.nome}</div>
              <div className={s.v} style={{ color: "#F3F6F1" }}>{sostituisci(t.p3Prova, { data: new Date(creato.provaFino).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) })}</div>
            </div>
            <ul className={s.elenco}>
              {[t.p3Uno, t.p3Due, t.p3Tre].map((x) => <li key={x}><IcoSpunta size={14} /><span>{x}</span></li>)}
            </ul>
            <button type="button" className={`${s.btn} ${s.spingi}`} onClick={() => router.push(percorsoRuolo(creato.slug, ruolo))}>{t.apri}</button>
          </>
        )}
      </div>
    </Schermo>
  );
}

/** Passo 2: crea un codice per i maestri e uno per le famiglie e li mostra con copia e condividi. */
function PassoInviti({ creato, t, avanti }: { creato: Creato; t: typeof IT; avanti: () => void }) {
  const [codici, setCodici] = useState<Codici | null>(null);
  const [errore, setErrore] = useState(false);
  const [copiato, setCopiato] = useState<string | null>(null);
  const partito = useRef(false);

  useEffect(() => {
    // con StrictMode l'effetto gira due volte in sviluppo: il segnaposto evita di creare i codici due volte
    if (partito.current) return;
    partito.current = true;
    const sb = supabaseBrowser();
    const scade = new Date(Date.now() + GIORNI_PROVA * 864e5).toISOString();
    // il codice è unico nel database: se capita un doppione se ne genera un altro
    const crea = async (ruolo: "maestro" | "genitore", usiMax: number): Promise<string> => {
      for (let i = 0; i < 4; i++) {
        const codice = generaCodice();
        const riga: Record<string, unknown> = { centro_id: creato.id, codice, ruolo, scade_il: scade, usi_max: usiMax };
        if (creato.membroId) riga.creato_da = creato.membroId;
        const { error } = await sb.from("inviti").insert(riga);
        if (!error) return codice;
        if (!/23505|duplicate|unique/.test(messaggioErrore(error))) throw error;
      }
      throw new Error("codice non generato");
    };
    (async () => {
      try {
        const maestro = await crea("maestro", 30);
        const genitore = await crea("genitore", 500);
        setCodici({ maestro, genitore });
      } catch {
        setErrore(true);
      }
    })();
  }, [creato]);

  const link = (c: string) => `${window.location.origin}/app/unisciti?c=${c}`;
  const copia = async (chiave: string, testo: string) => {
    try { await navigator.clipboard.writeText(testo); setCopiato(chiave); window.setTimeout(() => setCopiato((x) => (x === chiave ? null : x)), 1800); } catch { /* appunti non disponibili */ }
  };
  const condividi = async (c: string, messaggio: string) => {
    const nav = navigator as Navigator & { share?: (d: { text?: string; url?: string }) => Promise<void> };
    try { if (nav.share) await nav.share({ text: sostituisci(messaggio, { centro: creato.nome }), url: link(c) }); else await copia(c + "l", link(c)); } catch { /* condivisione annullata */ }
  };

  const Carta = ({ titolo, codice, messaggio }: { titolo: string; codice: string; messaggio: string }) => (
    <div className={`${s.card} ${s.pad}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className={s.k}>{titolo}</div>
      <div className={s.codiceRiga}><span className={s.codiceGrande}>{codice}</span><span className={s.piccolo}>{t.p2Valido}</span></div>
      <div className={s.azioniRiga}>
        <button type="button" className={s.btn2} onClick={() => copia(codice, codice)}><IcoCopia />{copiato === codice ? t.copiato : t.copia}</button>
        <button type="button" className={s.btn2} onClick={() => copia(codice + "l", link(codice))}><IcoCopia />{copiato === codice + "l" ? t.copiato : t.copiaLink}</button>
        <button type="button" className={s.btn2} onClick={() => condividi(codice, messaggio)} aria-label={t.condividi}><IcoCondividi /></button>
      </div>
    </div>
  );

  return (
    <>
      <h2 className={s.h1} style={{ marginTop: 4 }}>{t.p2Titolo}</h2>
      <p className={s.v} style={{ margin: 0 }}>{t.p2Intro}</p>
      {!codici && !errore && <p className={s.v} role="status">{t.creoCodici}</p>}
      {errore && <div className={s.errore} role="alert">{t.errCodici}</div>}
      {codici && (
        <>
          <Carta titolo={t.p2Maestri} codice={codici.maestro} messaggio={t.messaggioMaestri} />
          <Carta titolo={t.p2Famiglie} codice={codici.genitore} messaggio={t.messaggioFamiglie} />
        </>
      )}
      <button type="button" className={`${s.btn} ${s.spingi}`} onClick={avanti} disabled={!codici && !errore}>{codici ? t.continua : t.salta}</button>
      {codici && <button type="button" className={s.testoLink} style={{ background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", color: "#A1A1A6" }} onClick={avanti}>{t.salta}</button>}
    </>
  );
}
