// Copia del Motore: non modificare qui, si modifica nel repository motore
// Archivio su Supabase: implementa `Archivio` chiamando le funzioni di sql/motore.sql.
//
// Non usa supabase-js: chi lo crea passa una funzione `rpc(nome, argomenti)` che
// restituisce { data, error } (per esempio `(n, a) => supabase.rpc(n, a)`), così
// `core/` resta senza dipendenze. Se c'è un token, va come `p_token` in ogni
// chiamata; con la chiave di servizio non serve.
//
// Mappa metodo -> funzione SQL -> parametri (tutti con il prefisso `p_`; i
// parametri non indicati si omettono e prendono il valore predefinito null):
//
//   leggiCache(chiave)            motore_cache_leggi       p_token, p_chiave
//                                 -> { testo, dati?, modello, creato_il } | null
//   scriviCache(chiave, voce,     motore_cache_scrivi      p_token, p_chiave, p_app, p_compito,
//     { app, compito, durata_s })                          p_valore { testo, dati? }, p_modello,
//                                                          p_creato_il (ms), p_durata_s
//   togliCache(chiave)            motore_cache_togli       p_token, p_chiave
//   leggiBracci(app, compito,     motore_bracci_leggi      p_token, p_app, p_compito, p_versione
//     versione)                   -> Braccio[] (aggiornato_il in ms)
//   aggiornaBraccio(chiave,       motore_braccio_aggiorna  p_token, p_app, p_compito, p_versione,
//     delta, { emivita_giorni,                               p_secchio, p_modello, p_ok, p_ko,
//     adesso })                                              p_costo_usd, p_latenza_ms,
//                                                            p_emivita_giorni, p_adesso (ms)
//                                 -> Braccio
//   impostaStato(chiave, stato)   motore_braccio_stato     p_token, p_app, p_compito, p_versione,
//                                                          p_secchio, p_modello, p_stato
//   registraChiamata(c)           motore_chiamata_registra p_token, p_chiamata (oggetto Chiamata,
//                                                          creato_il in ms)
//   leggiChiamata(id)             motore_chiamata_leggi    p_token, p_id -> Chiamata | null
//   leggiPriori(genere)           motore_priori_leggi      p_token, p_genere
//                                 -> { [modello]: { ok, ko } } (somma delle fonti)
//   sommaPriori(genere, modello,  motore_priori_somma      p_token, p_genere, p_modello, p_ok, p_ko,
//     delta, fonte)                                         p_fonte
//   riepilogo(app, da, a)         motore_riepilogo         p_token, p_app (null = tutte), p_da, p_a
//                                                          (ms, estremi inclusi) -> Riepilogo[]
//                                 (le chiamate in ombra stanno in righe separate da quelle servite)
//   aggiornaTaratura(chiave,      motore_taratura_aggiorna p_token, p_app, p_decisore, p_uso,
//     fascia, delta, { emivita_                              p_compito, p_fascia, p_ok, p_ko,
//     giorni, adesso })                                      p_emivita_giorni, p_adesso (ms)
//   leggiTaratura(chiave)         motore_taratura_leggi    p_token, p_app, p_decisore, p_uso, p_compito
//                                                          -> [{ fascia, ok, ko }] (sempre 6 fasce)
//
// Un errore di `rpc` diventa un `Error` con lo stesso messaggio.

import type {
  Archivio,
  Braccio,
  Chiamata,
  FasciaTaratura,
  Genere,
  Priore,
  Riepilogo,
  StatoBraccio,
  VoceCache,
} from "../tipi";
import { FASCE } from "../taratura";

type Rpc = (
  nome: string,
  argomenti: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v);
}

function senzaVuoti(o: Record<string, unknown>): Record<string, unknown> {
  const fuori: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) fuori[k] = v;
  return fuori;
}

function comeBraccio(r: Record<string, unknown>): Braccio {
  return {
    app: String(r.app),
    compito: String(r.compito),
    versione: num(r.versione),
    secchio: String(r.secchio),
    modello: String(r.modello),
    ok: num(r.ok),
    ko: num(r.ko),
    costo_medio: num(r.costo_medio),
    latenza_media: num(r.latenza_media),
    stato: r.stato as StatoBraccio,
    aggiornato_il: num(r.aggiornato_il),
  };
}

function comeChiamata(r: Record<string, unknown>): Chiamata {
  const c: Chiamata = {
    id: String(r.id),
    app: String(r.app),
    compito: String(r.compito),
    versione: num(r.versione),
    secchio: String(r.secchio),
    modello: String(r.modello),
    esito: r.esito as Chiamata["esito"],
    ombra: Boolean(r.ombra),
    token_in: num(r.token_in),
    token_out: num(r.token_out),
    caratteri: num(r.caratteri),
    costo_usd: num(r.costo_usd),
    costo_riferimento_usd: num(r.costo_riferimento_usd),
    latenza_ms: num(r.latenza_ms),
    creato_il: num(r.creato_il),
  };
  if (typeof r.utente === "string") c.utente = r.utente;
  if (typeof r.chiave_cache === "string") c.chiave_cache = r.chiave_cache;
  return c;
}

export function archivioSupabase(opz: { rpc: Rpc; token?: string }): Archivio {
  async function chiama(nome: string, argomenti: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await opz.rpc(nome, senzaVuoti({ p_token: opz.token, ...argomenti }));
    if (error) throw new Error(error.message);
    return data;
  }

  return {
    async leggiCache(chiave) {
      const r = (await chiama("motore_cache_leggi", { p_chiave: chiave })) as Record<string, unknown> | null;
      if (!r) return null;
      const voce: VoceCache = { testo: String(r.testo), modello: String(r.modello ?? ""), creato_il: num(r.creato_il) };
      // `dati` c'è solo se era stato scritto; un null vero resta null.
      if ("dati" in r) voce.dati = r.dati;
      return voce;
    },

    async scriviCache(chiave, voce, o) {
      const valore: Record<string, unknown> = { testo: voce.testo };
      if (voce.dati !== undefined) valore.dati = voce.dati;
      await chiama("motore_cache_scrivi", {
        p_chiave: chiave,
        p_app: o.app,
        p_compito: o.compito,
        p_valore: valore,
        p_modello: voce.modello,
        p_creato_il: voce.creato_il,
        p_durata_s: o.durata_s,
      });
    },

    async togliCache(chiave) {
      await chiama("motore_cache_togli", { p_chiave: chiave });
    },

    async leggiBracci(app, compito, versione) {
      const r = (await chiama("motore_bracci_leggi", {
        p_app: app,
        p_compito: compito,
        p_versione: versione,
      })) as Record<string, unknown>[] | null;
      return (r ?? []).map(comeBraccio);
    },

    async aggiornaBraccio(chiave, delta, o) {
      const r = (await chiama("motore_braccio_aggiorna", {
        p_app: chiave.app,
        p_compito: chiave.compito,
        p_versione: chiave.versione,
        p_secchio: chiave.secchio,
        p_modello: chiave.modello,
        p_ok: delta.ok,
        p_ko: delta.ko,
        p_costo_usd: delta.costo_usd,
        p_latenza_ms: delta.latenza_ms,
        p_emivita_giorni: o.emivita_giorni,
        p_adesso: o.adesso,
      })) as Record<string, unknown>;
      return comeBraccio(r);
    },

    async impostaStato(chiave, stato) {
      await chiama("motore_braccio_stato", {
        p_app: chiave.app,
        p_compito: chiave.compito,
        p_versione: chiave.versione,
        p_secchio: chiave.secchio,
        p_modello: chiave.modello,
        p_stato: stato,
      });
    },

    async registraChiamata(c) {
      await chiama("motore_chiamata_registra", { p_chiamata: senzaVuoti({ ...c }) });
    },

    async leggiChiamata(id) {
      const r = (await chiama("motore_chiamata_leggi", { p_id: id })) as Record<string, unknown> | null;
      return r ? comeChiamata(r) : null;
    },

    async leggiPriori(genere: Genere) {
      const r = (await chiama("motore_priori_leggi", { p_genere: genere })) as Record<
        string,
        { ok: unknown; ko: unknown }
      > | null;
      const fuori: Record<string, Priore> = {};
      for (const [modello, p] of Object.entries(r ?? {})) fuori[modello] = { ok: num(p.ok), ko: num(p.ko) };
      return fuori;
    },

    async sommaPriori(genere, modello, delta, fonte) {
      await chiama("motore_priori_somma", {
        p_genere: genere,
        p_modello: modello,
        p_ok: delta.ok,
        p_ko: delta.ko,
        p_fonte: fonte,
      });
    },

    async aggiornaTaratura(chiave, fascia, delta, o) {
      await chiama("motore_taratura_aggiorna", {
        p_app: chiave.app,
        p_decisore: chiave.decisore,
        p_uso: chiave.uso,
        p_compito: chiave.compito,
        p_fascia: fascia,
        p_ok: delta.ok,
        p_ko: delta.ko,
        p_emivita_giorni: o.emivita_giorni,
        p_adesso: o.adesso,
      });
    },

    async leggiTaratura(chiave) {
      const r = (await chiama("motore_taratura_leggi", {
        p_app: chiave.app,
        p_decisore: chiave.decisore,
        p_uso: chiave.uso,
        p_compito: chiave.compito,
      })) as Record<string, unknown>[] | null;
      // `da` e `a` non viaggiano: sono i bordi fissi delle fasce e si rimettono qui, così
      // il database e il codice non possono dire due cose diverse. Le fasce mancanti sono vuote.
      const per = new Map((r ?? []).map((x) => [num(x.fascia), x]));
      return FASCE.slice(0, -1).map((da, fascia): FasciaTaratura => {
        const x = per.get(fascia);
        return { fascia, da, a: FASCE[fascia + 1], ok: x ? num(x.ok) : 0, ko: x ? num(x.ko) : 0 };
      });
    },

    async riepilogo(app, da, a) {
      const r = (await chiama("motore_riepilogo", { p_app: app, p_da: da, p_a: a })) as
        | Record<string, unknown>[]
        | null;
      return (r ?? []).map(
        (x): Riepilogo => ({
          compito: String(x.compito),
          modello: String(x.modello),
          chiamate: num(x.chiamate),
          da_cache: num(x.da_cache),
          locali: num(x.locali),
          ombra: num(x.ombra),
          costo_usd: num(x.costo_usd),
          costo_riferimento_usd: num(x.costo_riferimento_usd),
          latenza_media: num(x.latenza_media),
        }),
      );
    },
  };
}
