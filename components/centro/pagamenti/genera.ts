import type { SupabaseClient } from "@supabase/supabase-js";
import { oggiISO, type Corso, type PeriodoNuovo } from "./util";

export type EsitoGenera = { create: number; giaPresenti: number; corsiSenzaQuota: number; senzaIscritti: number; scontate: number };

type Iscr = { allievo_id: string; gruppo_id: string; dal: string | null; al: string | null };
type Leg = { allievo_id: string; membro_id: string };

/**
 * Genera le quote di un periodo per gli iscritti ai corsi che hanno una quota.
 * - Un corso senza quota (quota_cent vuota) si salta: i prezzi non si inventano.
 * - Non crea doppioni: per ogni allievo, corso e periodo esiste al massimo una quota.
 * - Sconto fratelli: i figli della stessa famiglia (stesso genitore) pagano pieno il primo iscritto e scontato dal secondo.
 */
export async function generaQuote(
  sb: SupabaseClient,
  centroId: string,
  corsi: Corso[],
  per: PeriodoNuovo,
  opz: { scontoAttivo: boolean; iscrizione?: { codice: string; importo_cent: number } | null },
): Promise<EsitoGenera> {
  const esito: EsitoGenera = { create: 0, giaPresenti: 0, corsiSenzaQuota: 0, senzaIscritti: 0, scontate: 0 };
  const conGruppo = corsi.filter((c) => c.gruppo_id);
  const pronti = conGruppo.filter((c) => c.quota_cent != null && c.quota_cent > 0);
  esito.corsiSenzaQuota = conGruppo.length - pronti.length;
  if (!pronti.length) return esito;

  const oggi = oggiISO();
  const gruppiIds = Array.from(new Set(pronti.map((c) => c.gruppo_id as string)));
  const { data: isc, error: e1 } = await sb.from("iscrizioni").select("allievo_id,gruppo_id,dal,al").eq("centro_id", centroId).in("gruppo_id", gruppiIds);
  if (e1) throw new Error(e1.message);
  const attive = ((isc ?? []) as Iscr[]).filter((i) => (!i.dal || i.dal <= per.scade_il) && (!i.al || i.al >= oggi));
  if (!attive.length) {
    esito.senzaIscritti = pronti.length;
    return esito;
  }
  const allievi = Array.from(new Set(attive.map((i) => i.allievo_id)));

  const { data: leg, error: e2 } = await sb.from("allievi_famiglie").select("allievo_id,membro_id").eq("centro_id", centroId).in("allievo_id", allievi);
  if (e2) throw new Error(e2.message);
  const legami = (leg ?? []) as Leg[];

  // Famiglie = gruppi di allievi che condividono almeno un genitore (union-find sugli allievi).
  const padre = new Map<string, string>(allievi.map((a) => [a, a]));
  const trova = (x: string): string => {
    while (padre.get(x) !== x) {
      padre.set(x, padre.get(padre.get(x) as string) as string);
      x = padre.get(x) as string;
    }
    return x;
  };
  const perGenitore = new Map<string, string[]>();
  legami.forEach((l) => perGenitore.set(l.membro_id, [...(perGenitore.get(l.membro_id) ?? []), l.allievo_id]));
  perGenitore.forEach((lista) => lista.slice(1).forEach((a) => padre.set(trova(a), trova(lista[0]))));

  // Primo ingresso di ciascun allievo: il più anziano non ha sconto.
  const primoIngresso = new Map<string, string>();
  attive.forEach((i) => {
    const d = i.dal ?? "0000-00-00";
    const cur = primoIngresso.get(i.allievo_id);
    if (!cur || d < cur) primoIngresso.set(i.allievo_id, d);
  });
  const famiglie = new Map<string, string[]>();
  allievi.forEach((a) => famiglie.set(trova(a), [...(famiglie.get(trova(a)) ?? []), a]));
  const haSconto = new Set<string>();
  famiglie.forEach((membri) => {
    const ord = [...membri].sort((a, b) => (primoIngresso.get(a) as string).localeCompare(primoIngresso.get(b) as string) || a.localeCompare(b));
    ord.slice(1).forEach((a) => haSconto.add(a));
  });

  // Quote già presenti per questo periodo (anche quelle divise in rate).
  const { data: esistenti, error: e3 } = await sb.from("quote").select("allievo_id,corso_id,periodo").eq("centro_id", centroId).in("allievo_id", allievi).like("periodo", `${per.codice}%`);
  if (e3) throw new Error(e3.message);
  const ci = new Set(((esistenti ?? []) as { allievo_id: string; corso_id: string | null; periodo: string }[]).map((q) => `${q.allievo_id}|${q.corso_id}`));

  type Nuova = { centro_id: string; allievo_id: string; corso_id: string; periodo: string; importo_cent: number; scade_il: string; stato: "attesa" };
  const nuove: Nuova[] = [];
  for (const c of pronti) {
    for (const i of attive.filter((x) => x.gruppo_id === c.gruppo_id)) {
      const k = `${i.allievo_id}|${c.id}`;
      if (ci.has(k)) {
        esito.giaPresenti++;
        continue;
      }
      ci.add(k);
      const pct = opz.scontoAttivo && haSconto.has(i.allievo_id) ? Math.min(Math.max(c.sconto_fratelli_pct ?? 0, 0), 100) : 0;
      const importo = Math.round(((c.quota_cent as number) * (100 - pct)) / 100);
      if (pct > 0) esito.scontate++;
      nuove.push({ centro_id: centroId, allievo_id: i.allievo_id, corso_id: c.id, periodo: per.codice, importo_cent: importo, scade_il: per.scade_il, stato: "attesa" });
    }
  }

  // Quota di iscrizione: una sola per allievo e anno, sul primo corso con quota.
  if (opz.iscrizione) {
    const { data: gia } = await sb.from("quote").select("allievo_id").eq("centro_id", centroId).in("allievo_id", allievi).eq("periodo", opz.iscrizione.codice);
    const fatti = new Set(((gia ?? []) as { allievo_id: string }[]).map((q) => q.allievo_id));
    const primoCorso = new Map<string, string>();
    for (const c of pronti) for (const i of attive) if (i.gruppo_id === c.gruppo_id && !primoCorso.has(i.allievo_id)) primoCorso.set(i.allievo_id, c.id);
    primoCorso.forEach((corsoId, allievoId) => {
      if (fatti.has(allievoId)) return;
      nuove.push({ centro_id: centroId, allievo_id: allievoId, corso_id: corsoId, periodo: opz.iscrizione!.codice, importo_cent: opz.iscrizione!.importo_cent, scade_il: per.scade_il, stato: "attesa" });
    });
  }

  for (let i = 0; i < nuove.length; i += 200) {
    const { error } = await sb.from("quote").insert(nuove.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  esito.create = nuove.length;
  return esito;
}
