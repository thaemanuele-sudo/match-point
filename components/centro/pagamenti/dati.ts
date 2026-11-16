// Letture condivise dalle schermate dei pagamenti: colonne esplicite, blocchi, cache del catalogo e totali (RPC).
// Con 1500 allievi e 2000 famiglie per centro una quota ha migliaia di righe al mese: niente tabelle intere,
// niente `in(...)` con centinaia di id (l'indirizzo della richiesta diventa troppo lungo) e niente totali sommati riga per riga nel browser.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AllievoMin, Corso, GruppoMin, LegameFamiglia, MembroMin } from "./util";

export const COL_QUOTA = "id,centro_id,allievo_id,corso_id,periodo,importo_cent,scade_il,stato,pagata_il,metodo,stripe_id";
export const COL_CORSO = "id,centro_id,nome,gruppo_id,quota_cent,sconto_fratelli_pct,rate,scadenze";
export const COL_GRUPPO_MIN = "id,nome,fascia,giorni,ora";

/** Righe per pagina nelle liste (.range) e per blocco nelle letture complete (limite di righe di PostgREST: 1000). */
export const PAGINA = 50;
export const BLOCCO_LETTURA = 1000;
/** Id per richiesta in un filtro `in(...)`: 100 uuid sono circa 4 KB di indirizzo, 1500 sarebbero 56 KB e verrebbero rifiutati. */
const ID_PER_RICHIESTA = 100;

type Esito<T> = { data: T[] | null; error: { message: string } | null };

/** Dà a una query di Supabase (non è una Promise vera) il tipo delle righe e lancia l'errore del database. */
export async function leggi<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const r = (await q) as Esito<T>;
  if (r.error) throw new Error(r.error.message);
  return r.data ?? [];
}

/** Esegue la stessa lettura su gruppi di al massimo 100 id, in parallelo, e unisce le righe. */
export async function inBlocchi<T>(ids: string[], lettura: (blocco: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  if (!ids.length) return [];
  const blocchi: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_PER_RICHIESTA) blocchi.push(ids.slice(i, i + ID_PER_RICHIESTA));
  const parti = await Promise.all(blocchi.map((b) => leggi<T>(lettura(b))));
  return parti.flat();
}

/** Legge tutte le righe di una query a blocchi di 1000 (il server non ne restituisce di più per volta). */
export async function tuttePagine<T>(pagina: (da: number, a: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let da = 0; ; da += BLOCCO_LETTURA) {
    const righe = await leggi<T>(pagina(da, da + BLOCCO_LETTURA - 1));
    out.push(...righe);
    if (righe.length < BLOCCO_LETTURA) return out;
  }
}

// ---------- catalogo del centro: corsi e gruppi (poche decine di righe), una lettura ogni 5 minuti ----------
const CATALOGO_FRESCO_MS = 5 * 60_000;
export type Catalogo = { corsi: Corso[]; gruppi: GruppoMin[] };
const catalogi = new Map<string, { dati: Catalogo; quando: number }>();
const catalogiInVolo = new Map<string, Promise<Catalogo>>();

/** Dopo aver cambiato un corso o una quota la prossima lettura passa dal database. */
export function invalidaCatalogo(centroId?: string): void {
  if (centroId) catalogi.delete(centroId);
  else catalogi.clear();
}

export function catalogoCentro(sb: SupabaseClient, centroId: string, forza = false): Promise<Catalogo> {
  const c = catalogi.get(centroId);
  if (c && !forza && Date.now() - c.quando < CATALOGO_FRESCO_MS) return Promise.resolve(c.dati);
  const gia = catalogiInVolo.get(centroId);
  if (gia && !forza) return gia;
  const p = (async () => {
    const [corsi, gruppi] = await Promise.all([
      leggi<Corso>(sb.from("corsi").select(COL_CORSO).eq("centro_id", centroId).order("created_at")),
      leggi<GruppoMin>(sb.from("gruppi").select(COL_GRUPPO_MIN).eq("centro_id", centroId).order("nome")),
    ]);
    const dati = { corsi, gruppi };
    catalogi.set(centroId, { dati, quando: Date.now() });
    return dati;
  })().finally(() => { catalogiInVolo.delete(centroId); });
  catalogiInVolo.set(centroId, p);
  return p;
}

// ---------- chi ha pagato: allievi, genitori e famiglie delle quote lette ----------
export type Legami = {
  allievi: Map<string, AllievoMin>;
  /** genitori (membro_id) di ogni allievo */
  genitoriDi: Map<string, string[]>;
  membri: Map<string, MembroMin>;
};

/** Allievi, collegamenti con i genitori e nomi dei genitori per un insieme di allievi: tre letture a blocchi, due in parallelo. */
export async function leggiLegami(sb: SupabaseClient, centroId: string, allievoIds: string[], conNomi = true): Promise<Legami> {
  const ids = Array.from(new Set(allievoIds));
  const [al, lg] = await Promise.all([
    conNomi ? inBlocchi<AllievoMin>(ids, (b) => sb.from("allievi").select("id,nome,cognome").eq("centro_id", centroId).in("id", b)) : Promise.resolve<AllievoMin[]>([]),
    inBlocchi<LegameFamiglia>(ids, (b) => sb.from("allievi_famiglie").select("allievo_id,membro_id").eq("centro_id", centroId).in("allievo_id", b)),
  ]);
  const genitoriDi = new Map<string, string[]>();
  for (const l of lg) genitoriDi.set(l.allievo_id, [...(genitoriDi.get(l.allievo_id) ?? []), l.membro_id]);
  const gids = conNomi ? Array.from(new Set(lg.map((l) => l.membro_id))) : [];
  const me = await inBlocchi<MembroMin>(gids, (b) => sb.from("membri").select("id,nome,cognome").in("id", b));
  return { allievi: new Map(al.map((a) => [a.id, a])), genitoriDi, membri: new Map(me.map((m) => [m.id, m])) };
}

/** Le famiglie si contano per genitore; senza genitore collegato vale l'allievo stesso. */
export const chiaveFamiglia = (allievoId: string, genitori: string[] | undefined) => (genitori?.length ? [...genitori].sort()[0] : allievoId);

// ---------- totali del mese ----------
export type Riepilogo = { P: number; A: number; S: number; fam: { P: number; A: number; S: number } };
const RIEPILOGO_VUOTO: Riepilogo = { P: 0, A: 0, S: 0, fam: { P: 0, A: 0, S: 0 } };

/**
 * Totali del mese più gli arretrati (quote non pagate di mesi precedenti): li calcola il database con la RPC
 * `riepilogo_pagamenti` (docs/RPC.md, Aggregati), nel perimetro della RLS di `quote`. Una quota in attesa scaduta
 * prima di `oggi` vale scaduta; per famiglia conta lo stato peggiore (scaduta, poi attesa, poi pagata).
 */
export async function riepilogoPagamenti(sb: SupabaseClient, centroId: string, da: string, a: string, oggi: string): Promise<Riepilogo> {
  const r = await sb.rpc("riepilogo_pagamenti", { p_centro: centroId, p_dal: da, p_al: a, p_oggi: oggi });
  if (r.error) throw new Error(r.error.message);
  const j = (Array.isArray(r.data) ? r.data[0] : r.data) as Record<string, number | null> | null;
  if (!j) return RIEPILOGO_VUOTO;
  return {
    P: Number(j.pagato_cent ?? 0), A: Number(j.attesa_cent ?? 0), S: Number(j.scaduto_cent ?? 0),
    fam: { P: Number(j.famiglie_pagate ?? 0), A: Number(j.famiglie_attesa ?? 0), S: Number(j.famiglie_scadute ?? 0) },
  };
}
