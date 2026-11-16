"use client";
/**
 * Avvisi: tabelle `avvisi` e `avvisi_letture`, RPC `invia_avviso`.
 * Il conteggio dei destinatari si risolve qui (anteprima e "letti X su Y"): il server fa lo stesso lavoro quando crea le notifiche.
 */
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inSilenzio, prossimaConsegna, messaggioErrore, useMio, useRealtime, type Imp } from "./comuni";

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
export type Risolti = { allievi: number; famiglie: number; maestri: number; membri: string[] };

const oggi = () => new Date().toISOString().slice(0, 10);

/** Chi riceve un avviso: allievi (con le loro famiglie) e, per "tutto il centro", anche i maestri in copia. */
export async function risolviDestinatari(sb: SupabaseClient, centroId: string, d: Dest): Promise<Risolti> {
  let gruppoIds: string[] | null = null; // null = tutto il centro
  if (d.tipo === "fascia" && d.valori.length) {
    const { data } = await sb.from("gruppi").select("id").eq("centro_id", centroId).in("fascia", d.valori);
    gruppoIds = ((data ?? []) as { id: string }[]).map((g) => g.id);
  } else if (d.tipo === "gruppo") {
    gruppoIds = d.valori;
  } else if (d.tipo === "area" && d.valori.length) {
    const { data } = await sb.from("gruppi").select("id").eq("centro_id", centroId).in("area_id", d.valori);
    gruppoIds = ((data ?? []) as { id: string }[]).map((g) => g.id);
  } else if (d.tipo === "maestro" && d.valori.length) {
    const { data } = await sb.from("gruppi_maestri").select("gruppo_id").in("membro_id", d.valori);
    gruppoIds = Array.from(new Set(((data ?? []) as { gruppo_id: string }[]).map((g) => g.gruppo_id)));
  }
  let allievoIds: string[] = [];
  if (gruppoIds === null) {
    const { data } = await sb.from("allievi").select("id").eq("centro_id", centroId);
    allievoIds = ((data ?? []) as { id: string }[]).map((a) => a.id);
  } else if (gruppoIds.length) {
    const { data } = await sb.from("iscrizioni").select("allievo_id,al").in("gruppo_id", gruppoIds);
    allievoIds = Array.from(new Set(((data ?? []) as { allievo_id: string; al: string | null }[]).filter((r) => !r.al || r.al >= oggi()).map((r) => r.allievo_id)));
  }
  const membri = new Set<string>();
  let famiglie = 0;
  if (allievoIds.length) {
    const { data: fam } = await sb.from("allievi_famiglie").select("membro_id").in("allievo_id", allievoIds);
    const set = new Set(((fam ?? []) as { membro_id: string }[]).map((x) => x.membro_id));
    famiglie = set.size;
    set.forEach((m) => membri.add(m));
    const { data: acc } = await sb.from("allievi").select("membro_id").in("id", allievoIds);
    ((acc ?? []) as { membro_id: string | null }[]).forEach((a) => a.membro_id && membri.add(a.membro_id));
  }
  let maestri = 0;
  if (d.tipo === "centro") {
    const { data } = await sb.from("membri").select("id").eq("centro_id", centroId).eq("ruolo", "maestro");
    maestri = (data ?? []).length;
  }
  return { allievi: allievoIds.length, famiglie, maestri, membri: Array.from(membri) };
}

export type InvioAvviso = { titolo: string; testo: string; destinatari: Dest; conferma: boolean; promemoria: boolean; consegna_il: string | null };
/** `invia_avviso` risolve i destinatari, crea le notifiche e conta i destinatari. Dopo le 21 la consegna è programmata alle 8:00. */
export async function inviaAvviso(sb: SupabaseClient, imp: Imp, v: Omit<InvioAvviso, "consegna_il">) {
  const consegna_il = inSilenzio(imp) ? prossimaConsegna(imp).toISOString() : null;
  const { data, error } = await sb.rpc("invia_avviso", { ...v, consegna_il });
  if (error) throw error;
  return { risposta: data as unknown, consegna_il };
}

export type AvvisoConLetture = Avviso & { letti: number; tot: number; letti24: number };

/** Avvisi inviati (miei o di tutto il centro) con le conferme di lettura. */
export function useAvvisiInviati(solo: "miei" | "tutti", limite = 20) {
  const { sb, centro, me } = useMio();
  const [lista, setLista] = useState<AvvisoConLetture[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const carica = useCallback(async () => {
    if (!sb || !centro || !me) return;
    try {
      let q = sb.from("avvisi").select("id,autore_id,titolo,testo,destinatari,conferma,promemoria,consegna_il,created_at").eq("centro_id", centro.id).order("created_at", { ascending: false }).limit(limite);
      if (solo === "miei") q = q.eq("autore_id", me.id);
      const { data, error } = await q;
      if (error) throw error;
      const av = (data ?? []) as Avviso[];
      const ids = av.map((a) => a.id);
      const letture: Record<string, { membro_id: string; letto_il: string }[]> = {};
      if (ids.length) {
        const { data: l } = await sb.from("avvisi_letture").select("avviso_id,membro_id,letto_il").in("avviso_id", ids);
        ((l ?? []) as { avviso_id: string; membro_id: string; letto_il: string }[]).forEach((r) => (letture[r.avviso_id] ||= []).push(r));
      }
      const cache: Record<string, Risolti> = {};
      const out: AvvisoConLetture[] = [];
      for (const a of av) {
        const chiave = JSON.stringify(a.destinatari);
        cache[chiave] ||= await risolviDestinatari(sb, centro.id, a.destinatari);
        const r = cache[chiave];
        const dest = new Set(r.membri);
        const l = (letture[a.id] ?? []).filter((x) => dest.size === 0 || dest.has(x.membro_id));
        const t0 = new Date(a.consegna_il ?? a.created_at).getTime();
        out.push({ ...a, tot: Math.max(r.membri.length, l.length), letti: l.length, letti24: l.filter((x) => new Date(x.letto_il).getTime() - t0 < 86400000).length });
      }
      setLista(out);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
      setLista((l) => l ?? []);
    }
  }, [sb, centro, me, solo, limite]);
  useEffect(() => {
    carica();
  }, [carica]);
  useRealtime(sb, `cm-avvisi-${solo}-${me?.id ?? "x"}`, "avvisi_letture", null, "INSERT", carica);
  return { lista, errore, ricarica: carica };
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
