"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LinguaProvider, useT } from "@/lib/i18n/lingua";
import { coloriCentro, nomeApp, type MarchioCentro } from "./brand";
import { rotta, ROTTE_APP } from "./rotte";
import type { Centro, Membro, Ruolo } from "./tipi-base";

/** Client Supabase del browser (stesso tipo di supabaseBrowser()). */
export type SB = ReturnType<typeof supabaseBrowser>;

export type ContestoCentro = {
  centro: Centro;
  /** Il mio membro nel centro, per il ruolo con cui sto usando l'app. Null per un super admin che non è membro. */
  membro: Membro | null;
  /** Tutti i miei ruoli in questo centro (un account può essere maestro e genitore insieme). */
  miei: Membro[];
  /** Ruolo con cui si usa l'app: quello di `vistaCome` se c'è, altrimenti quello della sezione aperta (/dt, /maestro...). */
  ruolo: Ruolo;
  /** Membro che sto "vedendo come" (?come=<membro_id>), solo super admin e titolare/dt. */
  vistaCome: Membro | null;
  /** vistaCome ?? membro: ogni query del ruolo usa membroAttivo.id e mai auth.uid(). */
  membroAttivo: Membro | null;
  /** Utente autenticato (auth.uid). */
  userId: string;
  eAdmin: boolean;
  sb: SB;
  /** Rilegge centro e membri (dopo una modifica di branding o di ruoli). */
  ricarica: () => Promise<void>;
  /** Smette di vedere come un altro membro. */
  esciVista: () => void;
};

const Ctx = createContext<ContestoCentro | null>(null);

/** Contesto del centro. Va usato dentro /c/[slug] (CentroProvider è nel layout). */
export function useCentro(): ContestoCentro {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCentro va usato dentro CentroProvider (layout di /c/[slug])");
  return c;
}

const T = {
  it: {
    carico: "Carico il centro…", nonTrovato: "Centro non trovato", nonTrovatoTesto: "L'indirizzo non esiste oppure non fai parte di questo centro.",
    unisciti: "Unisciti con un codice", profili: "I miei profili", riprova: "Riprova", errore: "Non riesco a caricare il centro",
    vistaCome: "Stai vedendo come", esci: "esci",
  },
  en: {
    carico: "Carico il centro…", nonTrovato: "Centro non trovato", nonTrovatoTesto: "L'indirizzo non esiste oppure non fai parte di questo centro.",
    unisciti: "Unisciti con un codice", profili: "I miei profili", riprova: "Riprova", errore: "Non riesco a caricare il centro",
    vistaCome: "Stai vedendo come", esci: "esci",
  },
};

// Sezione dell'indirizzo → ruolo di ripiego quando non c'è altra indicazione
const RUOLO_DA_SEZIONE: Record<string, Ruolo> = { dt: "dt", area: "responsabile_area", maestro: "maestro", genitore: "genitore", allievo: "allievo" };
const ORDINE_RUOLI: Record<string, Ruolo[]> = {
  dt: ["dt", "titolare", "segreteria"],
  area: ["responsabile_area"],
  maestro: ["maestro"],
  genitore: ["genitore"],
  allievo: ["allievo"],
};

const chiaveCome = (slug: string) => `mp-come-${slug}`;
function leggiCome(slug: string): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get("come");
    if (q) sessionStorage.setItem(chiaveCome(slug), q);
    return q || sessionStorage.getItem(chiaveCome(slug));
  } catch {
    return null; // sessionStorage bloccato: la vista "come" vale solo finché la pagina resta aperta
  }
}

const chiaveSezione = (slug: string) => `mp-sezione-${slug}`;
function ultimaSezione(slug: string): string {
  try { return sessionStorage.getItem(chiaveSezione(slug)) ?? ""; } catch { return ""; }
}

type Carico = { centro: Centro; miei: Membro[]; userId: string; eAdmin: boolean };

// Colonne esplicite: `centri` e `membri` si leggono a ogni apertura dell'app, niente select('*')
const COLONNE_CENTRO = "id,slug,nome,nome_app,citta,logo_path,colore,colore_ink,stato,prova_fino,piano,impostazioni,creato_da,created_at";
const COLONNE_MEMBRO = "id,centro_id,user_id,ruolo,nome,cognome,email,telefono,area_id,stato,created_at";

// Cache di modulo: centro e membri si leggono una volta sola per centro e utente, non a ogni montaggio del provider.
// Oltre FRESCO_MS si mostra subito il dato in cache e lo si riallinea in sottofondo (un nuovo ruolo, un cambio di marchio).
const FRESCO_MS = 60_000;
const cacheCentro = new Map<string, { dati: Carico; quando: number }>();
const inVolo = new Map<string, Promise<Carico | { errore: string } | "nonTrovato">>();
const chiaveCache = (slug: string, userId: string) => `${slug}|${userId}`;

/** Dopo un cambio di ruoli o di marchio fatto fuori dal provider: la prossima apertura rilegge dal database. */
export function invalidaContestoCentro(slug?: string): void {
  if (!slug) { cacheCentro.clear(); return; }
  for (const k of cacheCentro.keys()) if (k.startsWith(`${slug}|`)) cacheCentro.delete(k);
}

/** Una sola richiesta per centro e utente anche se più componenti chiedono insieme; centro e miei membri vengono in un solo giro. */
function leggiCentro(sb: SB, slug: string, userId: string): Promise<Carico | { errore: string } | "nonTrovato"> {
  const k = chiaveCache(slug, userId);
  const gia = inVolo.get(k);
  if (gia) return gia;
  const p = (async () => {
    // centro, i miei membri (filtro sulla tabella incorporata, solo i non sospesi) e super admin: tre letture in un giro solo
    const [centroR, adminR] = await Promise.all([
      sb.from("centri").select(`${COLONNE_CENTRO},membri(${COLONNE_MEMBRO})`).eq("slug", slug).eq("membri.user_id", userId).neq("membri.stato", "sospeso").maybeSingle(),
      sb.rpc("is_admin"),
    ]);
    if (centroR.error) return { errore: centroR.error.message };
    const riga = centroR.data as (Centro & { membri?: Membro[] }) | null;
    if (!riga) return "nonTrovato" as const;
    const { membri, ...centro } = riga;
    const dati: Carico = { centro: centro as Centro, miei: membri ?? [], userId, eAdmin: adminR.data === true };
    cacheCentro.set(k, { dati, quando: Date.now() });
    return dati;
  })().finally(() => { inVolo.delete(k); });
  inVolo.set(k, p);
  return p;
}

export function CentroProvider({ slug, brandIniziale, children }: { slug: string; brandIniziale?: MarchioCentro | null; children: ReactNode }) {
  return (
    <LinguaProvider>
      <Dentro slug={slug} brandIniziale={brandIniziale ?? null}>{children}</Dentro>
    </LinguaProvider>
  );
}

function stileMarchio(c: MarchioCentro | null | undefined): CSSProperties {
  const { brand, ink } = coloriCentro(c);
  return { "--brand": brand, "--brand-ink": ink } as CSSProperties;
}

function Dentro({ slug, brandIniziale, children }: { slug: string; brandIniziale: MarchioCentro | null; children: ReactNode }) {
  const t = useT(T);
  const pathname = usePathname();
  const router = useRouter();
  const sb = supabaseBrowser();
  const [dati, setDati] = useState<Carico | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [comeId, setComeId] = useState<string | null>(null);
  const [vista, setVista] = useState<Membro | null>(null);
  const messaggioErrore = t.errore;

  const carica = useCallback(async (forza = false) => {
    setErrore(null);
    // la sessione è in locale (cookie): nessuna richiesta di rete finché il token è valido
    const { data: ses } = await sb.auth.getSession();
    const userId = ses.session?.user.id;
    if (!userId) { setErrore(messaggioErrore); return; }
    const inCache = cacheCentro.get(chiaveCache(slug, userId));
    if (inCache && !forza) {
      setDati((att) => (att === inCache.dati ? att : inCache.dati));
      if (Date.now() - inCache.quando < FRESCO_MS) return;
      // dato non più fresco: lo si mostra e lo si riallinea in sottofondo, senza schermata di caricamento né errori
      const nuovo = await leggiCentro(sb, slug, userId);
      if (typeof nuovo === "object" && "centro" in nuovo) setDati(nuovo);
      return;
    }
    const r = await leggiCentro(sb, slug, userId);
    if (r === "nonTrovato") { setDati(null); setErrore("nonTrovato"); return; }
    if ("errore" in r) { setErrore(r.errore); return; }
    setDati(r);
  }, [sb, slug, messaggioErrore]);
  const ricaricaForzata = useCallback(() => carica(true), [carica]);

  useEffect(() => { void carica(); }, [carica]);

  // ?come=<membro_id>: letto una volta e tenuto in sessionStorage; vale solo per super admin e titolare/dt
  useEffect(() => { setComeId(leggiCome(slug)); }, [slug, pathname]);
  const puoVedereCome = !!dati && (dati.eAdmin || dati.miei.some((m) => m.ruolo === "titolare" || m.ruolo === "dt"));
  const centroId = dati?.centro.id ?? null;
  useEffect(() => {
    if (!comeId || !centroId || !puoVedereCome) { setVista(null); return; }
    let vivo = true;
    sb.from("membri").select(COLONNE_MEMBRO).eq("id", comeId).eq("centro_id", centroId).maybeSingle().then(({ data }: { data: unknown }) => {
      if (vivo) setVista((data as Membro | null) ?? null);
    });
    return () => { vivo = false; };
  }, [comeId, centroId, puoVedereCome, sb]);

  const esciVista = useCallback(() => {
    try { sessionStorage.removeItem(chiaveCome(slug)); } catch { /* niente da togliere */ }
    setComeId(null);
    setVista(null);
    // toglie ?come= dall'indirizzo senza ricaricare
    const u = new URL(window.location.href);
    if (u.searchParams.has("come")) { u.searchParams.delete("come"); router.replace(u.pathname + u.search); }
  }, [router, slug]);

  const sezione = pathname.split("/")[3] ?? "";
  useEffect(() => {
    if (ORDINE_RUOLI[sezione]) { try { sessionStorage.setItem(chiaveSezione(slug), sezione); } catch { /* facoltativo */ } }
  }, [sezione, slug]);
  const ctx = useMemo<ContestoCentro | null>(() => {
    if (!dati) return null;
    const { centro, miei, userId, eAdmin } = dati;
    let ruolo: Ruolo;
    let membro: Membro | null = null;
    if (vista) {
      ruolo = vista.ruolo;
    } else {
      // fuori dalle sezioni di ruolo (es. /chat/[id]) vale l'ultima sezione di ruolo visitata
      const sez = ORDINE_RUOLI[sezione] ? sezione : ultimaSezione(slug);
      const ordine = ORDINE_RUOLI[sez];
      membro = (ordine && ordine.map((r) => miei.find((m) => m.ruolo === r)).find(Boolean)) || (ordine ? null : miei[0]) || null;
      ruolo = membro?.ruolo ?? RUOLO_DA_SEZIONE[sez] ?? miei[0]?.ruolo ?? "dt";
    }
    return { centro, membro, miei, ruolo, vistaCome: vista, membroAttivo: vista ?? membro, userId, eAdmin, sb, ricarica: ricaricaForzata, esciVista };
  }, [dati, vista, sezione, slug, sb, ricaricaForzata, esciVista]);

  const stile = stileMarchio(dati?.centro ?? brandIniziale);

  return (
    <div className="mc" style={stile}>
      {ctx ? (
        <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
      ) : errore === "nonTrovato" ? (
        <div className="mc-schermo-pieno">
          <div className="card pad" style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <h1 className="h1">{t.nonTrovato}</h1>
            <p className="muted" style={{ margin: 0 }}>{t.nonTrovatoTesto}</p>
            <a className="btn" href={ROTTE_APP.unisciti()}>{t.unisciti}</a>
            <a className="btn2" href={ROTTE_APP.profili}>{t.profili}</a>
          </div>
        </div>
      ) : errore ? (
        <div className="mc-schermo-pieno">
          <div className="card pad" style={{ display: "grid", gap: 10, maxWidth: 360 }}>
            <h1 className="h1">{t.errore}</h1>
            <p className="muted" style={{ margin: 0 }}>{errore}</p>
            <button type="button" className="btn" onClick={() => void ricaricaForzata()}>{t.riprova}</button>
          </div>
        </div>
      ) : (
        <div className="mc-schermo-pieno" role="status" aria-live="polite"><span className="muted">{t.carico}</span></div>
      )}
    </div>
  );
}

/** Striscia "Stai vedendo come Marco Ferri · esci". Non mostra nulla se non si sta vedendo come qualcuno. */
export function BannerVista() {
  const t = useT(T);
  const { vistaCome, esciVista } = useCentro();
  if (!vistaCome) return null;
  const nome = [vistaCome.nome, vistaCome.cognome].filter(Boolean).join(" ");
  return (
    <div className="mc-vista" role="status">
      <span>{t.vistaCome} <b>{nome}</b></span>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={esciVista}>{t.esci}</button>
    </div>
  );
}

/** Per i componenti che mostrano il nome dell'app del centro. */
export function useNomeApp(): string {
  return nomeApp(useCentro().centro);
}

export { rotta };
