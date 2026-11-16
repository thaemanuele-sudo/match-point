import "server-only";
import { after } from "next/server";
import {
  MODELLI_BASE,
  archivioSupabase,
  creaCatalogo,
  creaMotore,
  decisoreLLM,
  decisoreSage,
  depositoSupabase,
  fornitoreAnthropic,
  type Archivio,
  type Decisore,
  type Fornitore,
  type Genere,
  type Modo,
  type ModelloInfo,
  type Motore,
  type Risultato,
} from "@/lib/motore";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { supabaseAnon } from "@/lib/supabase/server";
import { creaCompiti } from "./compiti";
import { registraUso } from "./costi";
import { depositoTabella } from "./deposito-tabella";
import type { Impostazioni, Prezzi } from "./impostazioni";
import { MODELLO_KITTEN } from "./kitten";
import { voceKittenApp, voceOpenAIApp } from "./voce-fornitori";

/*
 * Il Motore dentro Match Point (solo server). Ogni chiamata AI passa da qui: cache, modello meno caro che basta,
 * apprendimento e conti. Si costruisce una volta sola e si ricostruisce solo se cambiano le impostazioni che lo riguardano
 * (chiavi, modelli, prezzi, voce, decisore): così le statistiche in memoria e le sospensioni dei modelli non si perdono a ogni richiesta.
 * Se il motore non si può costruire, `motoreApp` dà null e le rotte restano sulla strada di sempre.
 */

export const APP = "matchpoint";

export type MotoreApp = {
  motore: Motore;
  archivio: Archivio;
  modo: Modo;
  /** Decisore in uso, per il pannello: "llm:anthropic/claude-haiku-5-5" oppure "sage". */
  decisore: string;
  compiti: { id: string; versione: number; genere: Genere; riferimento: string; candidati: string[] }[];
  /** Id del modello di voce da usare con `motore.parla`, e la voce scelta nel pannello. */
  voce: { modello: string; voce: string; fornitore: "kittenml" | "openai" } | null;
};

/** "anthropic/claude-haiku-5-5" → "claude-haiku-5-5": come si chiamano i modelli nella tabella ai_usage. */
export const nomeModello = (id: string): string => (id.includes("/") ? id.slice(id.indexOf("/") + 1) : id);

// ---------- client dell'archivio ----------
type Rpc = (nome: string, argomenti: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

const rpc: Rpc = async (nome, argomenti) => {
  const { data, error } = await supabaseAnon().rpc(nome, argomenti);
  return { data, error: error ? { message: error.message } : null };
};

// ---------- catalogo: modelli base con i prezzi dell'amministratore ----------

/**
 * I prezzi sono quelli della tabella dell'amministratore, gli stessi che il pannello usa per i costi degli utenti:
 * così i conti del motore e quelli di ai_usage coincidono. I prezzi di cache seguono in proporzione.
 */
export function catalogoApp(imp: Impostazioni) {
  const prezzi: Prezzi = imp.prezzi;
  const modelli: ModelloInfo[] = MODELLI_BASE.map((m) => {
    const p = prezzi[m.nome];
    if (m.fornitore === "anthropic" && p && typeof p === "object" && m.prezzo_in > 0) {
      const f = p.in / m.prezzo_in;
      return {
        ...m,
        prezzo_in: p.in,
        prezzo_out: p.out,
        ...(m.prezzo_cache_lettura !== undefined ? { prezzo_cache_lettura: m.prezzo_cache_lettura * f } : {}),
        ...(m.prezzo_cache_scrittura !== undefined ? { prezzo_cache_scrittura: m.prezzo_cache_scrittura * f } : {}),
      };
    }
    if (m.id === `kittenml/${MODELLO_KITTEN}`) {
      return { ...m, prezzo_caratteri: typeof prezzi.tts_kitten_per_milione_caratteri === "number" ? prezzi.tts_kitten_per_milione_caratteri : 0 };
    }
    return m;
  });
  // Il modello di voce OpenAI scelto nel pannello (di norma gpt-4o-mini-tts) non è nell'elenco base.
  const idTts = `openai/${imp.modelloTts}`;
  const prezzoTts = typeof prezzi.tts_per_milione_caratteri === "number" ? prezzi.tts_per_milione_caratteri : 0;
  const senzaTts = modelli.filter((m) => m.id !== idTts);
  senzaTts.push({ id: idTts, fornitore: "openai", nome: imp.modelloTts, prezzo_in: 0, prezzo_out: 0, prezzo_caratteri: prezzoTts, voce: true });
  return creaCatalogo(senzaTts);
}

// ---------- costruzione ----------

/** Cosa cambia il motore: se una di queste cose cambia, lo si ricostruisce. Resta in memoria, non va mai nei log. */
function firma(imp: Impostazioni): string {
  return JSON.stringify([
    imp.anthropicKey, imp.openaiKey, imp.kittenKey, imp.levantoKey, imp.sageUtenti, imp.voceMotore, imp.kittenVoceId,
    imp.modelloChat, imp.modelloAnalisi, imp.modelloTts, imp.voceTts, imp.prezzi, imp.motoreModo,
    process.env.MP_SUPABASE_SERVICE_ROLE_KEY ? 1 : 0, process.env.MP_SERVER_TOKEN ? 1 : 0,
  ]);
}

let memoria: { firma: string; app: MotoreApp | null } | null = null;

function costruisci(imp: Impostazioni): MotoreApp | null {
  if (!imp.anthropicKey) return null;
  const catalogo = catalogoApp(imp);
  const compiti = creaCompiti(imp, catalogo);
  if (!compiti) return null;
  const haiku = catalogo.modello("anthropic/claude-haiku-5-5");
  if (!haiku) return null;

  const anthropic = fornitoreAnthropic({ chiave: imp.anthropicKey });
  const fornitori: Record<string, Fornitore> = { anthropic };
  if (imp.kittenKey) fornitori.kittenml = voceKittenApp(imp.kittenKey);
  if (imp.openaiKey) fornitori.openai = voceOpenAIApp(imp.openaiKey);

  // PRIVACY. I messaggi dei ragazzi non devono arrivare a un fornitore nuovo senza una scelta esplicita:
  // il decisore di partenza è Claude Haiku (lo stesso fornitore che già risponde). Sage di Levanto si usa solo se
  // l'amministratore ha inserito la sua chiave E ha acceso «Usa Sage anche per i messaggi degli utenti».
  const sage = !!imp.levantoKey && imp.sageUtenti;
  const decisore: Decisore = sage ? decisoreSage({ chiave: imp.levantoKey! }) : decisoreLLM({ fornitore: anthropic, modello: haiku });

  const archivio = archivioSupabase({ rpc, token: process.env.MP_SERVER_TOKEN });
  const chiaveServizio = process.env.MP_SUPABASE_SERVICE_ROLE_KEY;
  const deposito = chiaveServizio
    ? depositoSupabase({ url: SUPABASE_URL, chiave: chiaveServizio, secchio: "motore" })
    : depositoTabella({ rpc, token: process.env.MP_SERVER_TOKEN });

  // Voce: il motore scelto nel pannello; se manca la sua chiave, l'altro (come faceva la rotta della voce).
  const kitten = !!imp.kittenKey && (imp.voceMotore === "kittenml" || !imp.openaiKey);
  const voce: MotoreApp["voce"] = kitten
    ? { fornitore: "kittenml", modello: `kittenml/${MODELLO_KITTEN}`, voce: imp.kittenVoceId ?? "" }
    : imp.openaiKey
      ? { fornitore: "openai", modello: `openai/${imp.modelloTts}`, voce: imp.voceTts }
      : null;

  // Il pannello "spento" non costruisce il motore per le rotte (vedi motoreApp); qui per il pannello si parte in sola osservazione.
  const modo: Modo = imp.motoreModo === "spento" ? "osserva" : imp.motoreModo;

  const motore = creaMotore({
    app: APP,
    fornitori,
    catalogo,
    archivio,
    decisore,
    deposito,
    modo,
    // Le prove in ombra e i giudizi si fanno dopo la risposta, così il ragazzo non aspetta. Fuori da una richiesta after() non c'è: si lancia e basta.
    dopo: (lavoro) => {
      try {
        after(lavoro);
      } catch {
        void lavoro().catch(() => {});
      }
    },
    // Solo gli errori, e solo il loro messaggio: nei log non finiscono mai testi dei ragazzi.
    registro: (e) => {
      if (e.tipo.startsWith("errore_")) console.error(`[motore] ${e.tipo}`, e.compito ?? "", e.dettagli?.messaggio ?? "");
    },
  });
  for (const c of compiti) motore.registra(c);

  return {
    motore,
    archivio,
    modo,
    decisore: decisore.id,
    compiti: compiti.map((c) => ({ id: c.id, versione: c.versione, genere: c.genere, riferimento: c.riferimento, candidati: c.candidati })),
    voce,
  };
}

function daMemoria(imp: Impostazioni): MotoreApp | null {
  const f = firma(imp);
  if (memoria && memoria.firma === f) return memoria.app;
  let app: MotoreApp | null = null;
  try {
    app = costruisci(imp);
  } catch (e) {
    console.error("[motore] costruzione fallita:", e instanceof Error ? e.message : "errore");
  }
  memoria = { firma: f, app };
  return app;
}

/** Il motore per le rotte AI. Null = usa la strada di sempre (motore spento, senza chiave o non costruibile). */
export function motoreApp(imp: Impostazioni): MotoreApp | null {
  if (imp.motoreModo === "spento") return null;
  return daMemoria(imp);
}

/** Il motore per il pannello: c'è anche con il modo "spento", così si vedono comunque i numeri già raccolti. */
export function motorePannello(imp: Impostazioni): MotoreApp | null {
  return daMemoria(imp);
}

/**
 * Registra in ai_usage il costo VERO di una chiamata passata dal motore: modello che ha risposto, token e dollari.
 * Una risposta da cache costa zero e non conta token. Le prove in ombra e i giudizi non sono dell'utente: stanno solo nel registro del motore.
 * Non lancia mai (lo garantisce registraUso).
 */
export async function registraUsoMotore(userId: string, funzione: "chat" | "analisi" | "riassunto", r: Risultato): Promise<void> {
  const fresca = !r.da_cache && !r.locale;
  const tin = fresca ? r.uso.token_in + (r.uso.token_cache_letti ?? 0) + (r.uso.token_cache_scritti ?? 0) : 0;
  const tout = fresca ? r.uso.token_out : 0;
  await registraUso(userId, "anthropic", nomeModello(r.modello), funzione, tin, tout, 0, r.costo_usd);
}
