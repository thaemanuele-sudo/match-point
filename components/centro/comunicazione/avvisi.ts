"use client";
/**
 * Avvisi: tabelle `avvisi` e `avvisi_letture`, RPC `invia_avviso`.
 * Regola "Scala" di docs/CENTRI.md: i conteggi (destinatari e letture) li calcola il database con RPC
 * (`conta_destinatari`, `letture_avvisi`, `ricorda_avviso`), mai scaricando le righe né con una query dentro un ciclo.
 */
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { messaggioErrore, useMio } from "./comuni";

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

const num = (v: unknown) => (typeof v === "number" ? v : parseInt(String(v ?? 0), 10) || 0);
const prima = (d: unknown) => (Array.isArray(d) ? d[0] : d) as Record<string, unknown> | null;

/** Quanti allievi, famiglie e maestri ricevono un avviso (anteprima prima dell'invio): lo conta il database (`conta_destinatari`). */
export async function contaDestinatari(sb: SupabaseClient, centroId: string, d: Dest): Promise<Risolti> {
  const r = await sb.rpc("conta_destinatari", { centro: centroId, destinatari: d });
  if (r.error) throw r.error;
  const x = prima(r.data);
  return { allievi: num(x?.allievi), famiglie: num(x?.famiglie), maestri: num(x?.maestri) };
}

export type InvioAvviso = { titolo: string; testo: string; destinatari: Dest; conferma: boolean; promemoria: boolean };
/**
 * `invia_avviso` risolve i destinatari, crea le notifiche e li conta. L'orario di silenzio (21:00-08:00) lo applica il database
 * quando `consegna_il` non è indicata; il centro si passa sempre, perché chi lavora in più centri altrimenti riceve un errore.
 */
export async function inviaAvviso(sb: SupabaseClient, centroId: string, v: InvioAvviso): Promise<{ destinatari: number; consegna_il: string | null }> {
  const { data, error } = await sb.rpc("invia_avviso", { ...v, centro: centroId });
  if (error) throw error;
  const x = prima(data);
  // il database imposta sempre una data di consegna: è "programmato" solo se cade nel futuro (dopo le 21:00 slitta alle 8:00)
  const quando = x?.consegna_il ? String(x.consegna_il) : null;
  return { destinatari: num(x?.destinatari), consegna_il: quando && new Date(quando).getTime() > Date.now() + 60_000 ? quando : null };
}

/** Promemoria a chi non ha ancora letto: lo fa il database (può essere una platea di migliaia di persone). Ritorna quante notifiche ha creato. */
export async function ricordaAvviso(sb: SupabaseClient, avviso: string): Promise<number> {
  const { data, error } = await sb.rpc("ricorda_avviso", { avviso });
  if (error) throw error;
  return num(data);
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
      // le letture le conta il database (`letture_avvisi`), una riga per avviso
      const r = await sb.rpc("letture_avvisi", { avvisi: ids });
      if (r.error) throw r.error;
      ((r.data ?? []) as Record<string, unknown>[]).forEach((x) => (conta[String(x.avviso_id)] = { letti: num(x.letti), tot: num(x.totale), letti24: num(x.letti_24h) }));
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
