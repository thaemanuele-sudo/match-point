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

  const carica = useCallback(async () => {
    setErrore(null);
    // tre letture indipendenti in parallelo: sessione, centro (con i miei membri) e super admin
    const [{ data: ses }, centroR, adminR] = await Promise.all([
      sb.auth.getSession(),
      sb.from("centri").select("*").eq("slug", slug).maybeSingle(),
      sb.rpc("is_admin"),
    ]);
    const userId = ses.session?.user.id;
    if (!userId) { setErrore(t.errore); return; }
    if (centroR.error) { setErrore(centroR.error.message); return; }
    const centro = centroR.data as Centro | null;
    if (!centro) { setDati(null); setErrore("nonTrovato"); return; }
    const mR = await sb.from("membri").select("*").eq("centro_id", centro.id).eq("user_id", userId).neq("stato", "sospeso");
    if (mR.error) { setErrore(mR.error.message); return; }
    setDati({ centro, miei: (mR.data ?? []) as Membro[], userId, eAdmin: adminR.data === true });
  }, [sb, slug, t.errore]);

  useEffect(() => { void carica(); }, [carica]);

  // ?come=<membro_id>: letto una volta e tenuto in sessionStorage; vale solo per super admin e titolare/dt
  useEffect(() => { setComeId(leggiCome(slug)); }, [slug, pathname]);
  const puoVedereCome = !!dati && (dati.eAdmin || dati.miei.some((m) => m.ruolo === "titolare" || m.ruolo === "dt"));
  useEffect(() => {
    if (!comeId || !dati || !puoVedereCome) { setVista(null); return; }
    let vivo = true;
    sb.from("membri").select("*").eq("id", comeId).eq("centro_id", dati.centro.id).maybeSingle().then(({ data }: { data: unknown }) => {
      if (vivo) setVista((data as Membro | null) ?? null);
    });
    return () => { vivo = false; };
  }, [comeId, dati, puoVedereCome, sb]);

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
    return { centro, membro, miei, ruolo, vistaCome: vista, membroAttivo: vista ?? membro, userId, eAdmin, sb, ricarica: carica, esciVista };
  }, [dati, vista, sezione, slug, sb, carica, esciVista]);

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
            <button type="button" className="btn" onClick={() => void carica()}>{t.riprova}</button>
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
