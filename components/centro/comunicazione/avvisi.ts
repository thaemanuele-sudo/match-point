"use client";
/**
 * Avvisi: tabelle `avvisi` e `avvisi_letture`, RPC `invia_avviso`.
 * Regola "Scala" di docs/CENTRI.md: i conteggi (destinatari e letture) li calcola il database con RPC
 * (`conta_destinatari`, `letture_avvisi`, `ricorda_avviso`); se una RPC manca si ripiega su conteggi `head: true`,
 * mai sul download delle righe e mai su una query dentro un ciclo.
 */
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inSilenzio, prossimaConsegna, messaggioErrore, useMio, type Imp } from "./comuni";

export type TipoDest = "centro" | "fascia" | "gruppo" | "area" | "maestro";
export type Dest = { tipo: TipoDest; valori: string[] };
export type Avviso = {
  id: string;
  autore_id: string;
  titolo: string;
  testo: string;
  destinatari: Dest;
  conferma: boolean;
  promemoria: boolean;
  consegna_il: string | null;
  created_at: string;
};
export type Risolti = { allievi: number; famiglie: number; maestri: number };

const oggi = () => new Date().toISOString().slice(0, 10);
const num = (v: unknown) => (typeof v === "number" ? v : parseInt(String(v ?? 0), 10) || 0);
const prima = (d: unknown) => (Array.isArray(d) ? d[0] : d) as Record<string, unknown> | null;

/** Quanti allievi, famiglie e maestri ricevono un avviso (anteprima prima dell'invio). */
export async function contaDestinatari(sb: SupabaseClient, centroId: string, d: Dest): Promise<Risolti> {
  const r = await sb.rpc("conta_destinatari", { centro: centroId, destinatari: d });
  const x = !r.error ? prima(r.data) : null;
  if (x) return { allievi: num(x.allievi), famiglie: num(x.famiglie), maestri: num(x.maestri) };

  // ripiego: solo conteggi
  if (d.tipo === "centro") {
    const [a, g, m] = await Promise.all([
      sb.from("allievi").select("id", { count: "exact", head: true }).eq("centro_id", centroId),
      sb.from("membri").select("id", { count: "exact", head: true }).eq("centro_id", centroId).eq("ruolo", "genitore"),
      sb.from("membri").select("id", { count: "exact", head: true }).eq("centro_id", centroId).eq("ruolo", "maestro"),
    ]);
    return { allievi: a.count ?? 0, famiglie: g.count ?? 0, maestri: m.count ?? 0 };
  }
  let gruppoIds: string[] = [];
  if (d.tipo === "gruppo") gruppoIds = d.valori;
  else if (d.tipo === "fascia") gruppoIds = ((await sb.from("gruppi").select("id").eq("centro_id", centroId).in("fascia", d.valori)).data ?? []).map((g: { id: string }) => g.id);
  else if (d.tipo === "area") gruppoIds = ((await sb.from("gruppi").select("id").eq("centro_id", centroId).in("area_id", d.valori)).data ?? []).map((g: { id: string }) => g.id);
  else if (d.tipo === "maestro") {
    const { data } = await sb.from("gruppi_maestri").select("gruppo_id").in("membro_id", d.valori);
    gruppoIds = Array.from(new Set(((data ?? []) as { gruppo_id: string }[]).map((g) => g.gruppo_id)));
  }
  if (!gruppoIds.length) return { allievi: 0, famiglie: 0, maestri: 0 };
  const { data } = await sb.from("iscrizioni").select("allievo_id,al").in("gruppo_id", gruppoIds).limit(2000);
  const ids = Array.from(new Set(((data ?? []) as { allievo_id: string; al: string | null }[]).filter((x) => !x.al || x.al >= oggi()).map((x) => x.allievo_id)));
  // con tanti allievi l'elenco nell'indirizzo diventerebbe troppo lungo: si stima una famiglia per allievo
  let famiglie = ids.length;
  if (ids.length > 0 && ids.length <= 150) {
    const f = await sb.from("allievi_famiglie").select("membro_id", { count: "exact", head: true }).in("allievo_id", ids);
    famiglie = f.count ?? ids.length;
  }
  return { allievi: ids.length, famiglie, maestri: 0 };
}

export type InvioAvviso = { titolo: string; testo: string; destinatari: Dest; conferma: boolean; promemoria: boolean; consegna_il: string | null };
/** `invia_avviso` risolve i destinatari, crea le notifiche e conta i destinatari. Dopo le 21 la consegna è programmata alle 8:00. */
export async function inviaAvviso(sb: SupabaseClient, imp: Imp, v: Omit<InvioAvviso, "consegna_il">) {
  const consegna_il = inSilenzio(imp) ? prossimaConsegna(imp).toISOString() : null;
  const { data, error } = await sb.rpc("invia_avviso", { ...v, consegna_il });
  if (error) throw error;
  const x = prima(data);
  return { destinatari: x ? num(x.destinatari ?? x.n ?? x.conteggio) : typeof data === "number" ? data : 0, consegna_il };
}

/** Promemoria a chi non ha ancora letto: lo fa il database (può essere una platea di migliaia di persone). */
export async function ricordaAvviso(sb: SupabaseClient, avviso: string): Promise<number> {
  const { data, error } = await sb.rpc("ricorda_avviso", { avviso });
  if (error) throw error;
  const x = prima(data);
  return x ? num(x.n ?? x.destinatari) : typeof data === "number" ? data : 0;
}

export type AvvisoConLetture = Avviso & { letti: number; tot: number; letti24: number };

/** Avvisi inviati (miei o di tutto il centro) a blocchi di 20, con le conferme di lettura calcolate dal database. */
export function useAvvisiInviati(solo: "miei" | "tutti", blocco = 20) {
  const { sb, centro, me } = useMio();
  const [lista, setLista] = useState<AvvisoConLetture[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [ancora, setAncora] = useState(false);

  const leggi = useCallback(
    async (da: number, a: number): Promise<AvvisoConLetture[]> => {
      if (!sb || !centro || !me) return [];
      let q = sb.from("avvisi").select("id,autore_id,titolo,testo,destinatari,conferma,promemoria,consegna_il,created_at").eq("centro_id", centro.id).order("created_at", { ascending: false }).range(da, a);
      if (solo === "miei") q = q.eq("autore_id", me.id);
      const { data, error } = await q;
      if (error) throw error;
      const av = (data ?? []) as Avviso[];
      if (!av.length) return [];
      const ids = av.map((x) => x.id);
      const conta: Record<string, { letti: number; tot: number; letti24: number }> = {};
      const r = await sb.rpc("letture_avvisi", { avvisi: ids });
      if (!r.error && Array.isArray(r.data)) {
        (r.data as Record<string, unknown>[]).forEach((x) => (conta[String(x.avviso_id)] = { letti: num(x.letti), tot: num(x.totale), letti24: num(x.letti_24h) }));
      } else {
        // ripiego: un conteggio `head: true` per avviso, tutti insieme (al massimo un blocco)
        const cs = await Promise.all(ids.map((id) => sb.from("avvisi_letture").select("avviso_id", { count: "exact", head: true }).eq("avviso_id", id)));
        cs.forEach((c, i) => (conta[ids[i]] = { letti: c.count ?? 0, tot: 0, letti24: c.count ?? 0 }));
      }
      return av.map((x) => ({ ...x, letti: conta[x.id]?.letti ?? 0, tot: conta[x.id]?.tot ?? 0, letti24: conta[x.id]?.letti24 ?? 0 }));
    },
    [sb, centro, me, solo]
  );

  const carica = useCallback(async () => {
    try {
      const n = Math.max(blocco, lista?.length ?? 0);
      const r = await leggi(0, n - 1);
      setLista(r);
      setAncora(r.length === n);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
      setLista((l) => l ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leggi, blocco]);
  const altri = useCallback(async () => {
    try {
      const da = lista?.length ?? 0;
      const r = await leggi(da, da + blocco - 1);
      setLista((l) => [...(l ?? []), ...r]);
      setAncora(r.length === blocco);
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [leggi, lista, blocco]);
  useEffect(() => {
    carica();
  }, [carica]);
  return { lista, errore, ricarica: carica, altri, ancora };
}

export type Nomi = { gruppi: Record<string, string>; aree: Record<string, string>; maestri: Record<string, string> };
/** Nomi di gruppi, aree e maestri del centro, per scrivere "U12 Intermedio" invece dell'id. */
export function useNomi(): Nomi {
  const { sb, centro } = useMio();
  const [n, setN] = useState<Nomi>({ gruppi: {}, aree: {}, maestri: {} });
  useEffect(() => {
    if (!sb || !centro) return;
    (async () => {
      const [g, a, m] = await Promise.all([
        sb.from("gruppi").select("id,nome").eq("centro_id", centro.id),
        sb.from("aree").select("id,nome").eq("centro_id", centro.id),
        sb.from("membri").select("id,nome,cognome").eq("centro_id", centro.id).eq("ruolo", "maestro"),
      ]);
      const mappa = (r: unknown, nome: (x: { nome?: string; cognome?: string }) => string) => Object.fromEntries(((r ?? []) as { id: string; nome?: string; cognome?: string }[]).map((x) => [x.id, nome(x)]));
      setN({
        gruppi: mappa(g.data, (x) => x.nome ?? ""),
        aree: mappa(a.data, (x) => x.nome ?? ""),
        maestri: mappa(m.data, (x) => [x.nome, x.cognome].filter(Boolean).join(" ")),
      });
    })();
  }, [sb, centro]);
  return n;
}

/** Testo "a chi" di un avviso. Le etichette arrivano dal dizionario della schermata. */
export function etichettaDest(d: Dest, n: Nomi, L: { centro: string; famiglieDi: string; area: string; tutti: string }): string {
  const nomi = (m: Record<string, string>) => d.valori.map((v) => m[v] ?? "").filter(Boolean);
  switch (d.tipo) {
    case "centro":
      return L.centro;
    case "fascia":
      return d.valori.join(", ");
    case "gruppo":
      return nomi(n.gruppi).join(" + ") || L.tutti;
    case "area":
      return L.area.replace("{nome}", nomi(n.aree).join(", "));
    case "maestro":
      return L.famiglieDi.replace("{nome}", nomi(n.maestri).join(", "));
  }
}
