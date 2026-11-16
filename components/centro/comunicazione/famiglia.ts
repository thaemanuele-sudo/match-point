"use client";
/** Figli del genitore, allievo dell'account del ragazzo, gruppi e maestro di un allievo. */
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useMio, type MembroLite } from "./comuni";

export type Figlio = { id: string; nome: string; cognome: string | null; data_nascita: string | null; membro_id: string | null };

export function eta(data: string | null | undefined): number | null {
  if (!data) return null;
  const n = new Date(data);
  const o = new Date();
  let e = o.getFullYear() - n.getFullYear();
  if (o.getMonth() < n.getMonth() || (o.getMonth() === n.getMonth() && o.getDate() < n.getDate())) e--;
  return e;
}

/** Genitore: i suoi figli (tabella `allievi_famiglie`). Allievo: sé stesso (`allievi.membro_id`). Il primo è scelto di partenza. */
export function useFigli(modo: "genitore" | "allievo") {
  const { sb, me, centro } = useMio();
  const [figli, setFigli] = useState<Figlio[] | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  useEffect(() => {
    if (!sb || !me || !centro) return;
    (async () => {
      let ids: string[] | null = null;
      if (modo === "genitore") {
        const { data } = await sb.from("allievi_famiglie").select("allievo_id").eq("membro_id", me.id);
        ids = ((data ?? []) as { allievo_id: string }[]).map((r) => r.allievo_id);
        if (!ids.length) return setFigli([]);
      }
      let q = sb.from("allievi").select("id,nome,cognome,data_nascita,membro_id").eq("centro_id", centro.id);
      q = ids ? q.in("id", ids) : q.eq("membro_id", me.id);
      const { data } = await q.order("data_nascita", { ascending: false });
      setFigli((data ?? []) as Figlio[]);
    })();
  }, [sb, me, centro, modo]);
  const figlio = figli?.find((x) => x.id === selId) ?? figli?.[0] ?? null;
  return { figli, figlio, setSel: setSelId };
}

export type GruppoLite = { id: string; nome: string; giorni: number[]; ora: string | null; durata_min: number | null; campo_id: string | null };
export type DatiAllievo = { gruppi: GruppoLite[]; maestro: MembroLite | null; maestri: Record<string, MembroLite> };

/** Gruppi attuali dell'allievo e maestro principale (o il primo). */
export async function caricaDatiAllievo(sb: SupabaseClient, allievoId: string): Promise<DatiAllievo> {
  const oggi = new Date().toISOString().slice(0, 10);
  const { data: isc } = await sb.from("iscrizioni").select("gruppo_id,al").eq("allievo_id", allievoId);
  const gids = Array.from(new Set(((isc ?? []) as { gruppo_id: string; al: string | null }[]).filter((r) => !r.al || r.al >= oggi).map((r) => r.gruppo_id)));
  if (!gids.length) return { gruppi: [], maestro: null, maestri: {} };
  const [{ data: g }, { data: gm }] = await Promise.all([
    sb.from("gruppi").select("id,nome,giorni,ora,durata_min,campo_id").in("id", gids),
    sb.from("gruppi_maestri").select("gruppo_id,membro_id,principale").in("gruppo_id", gids),
  ]);
  const gmr = (gm ?? []) as { gruppo_id: string; membro_id: string; principale: boolean }[];
  const mids = Array.from(new Set(gmr.map((x) => x.membro_id)));
  const maestri: Record<string, MembroLite> = {};
  if (mids.length) {
    const { data: ms } = await sb.from("membri").select("id,nome,cognome,ruolo").in("id", mids);
    ((ms ?? []) as MembroLite[]).forEach((m) => (maestri[m.id] = m));
  }
  const prima = gmr.find((x) => x.principale) ?? gmr[0];
  return { gruppi: (g ?? []) as GruppoLite[], maestro: prima ? maestri[prima.membro_id] ?? null : null, maestri: Object.fromEntries(gmr.map((x) => [x.gruppo_id, maestri[x.membro_id]]).filter((x) => x[1])) };
}

export function useDatiAllievo(allievoId: string | undefined) {
  const { sb } = useMio();
  const [d, setD] = useState<DatiAllievo | null>(null);
  useEffect(() => {
    if (!sb || !allievoId) return;
    caricaDatiAllievo(sb, allievoId).then(setD);
  }, [sb, allievoId]);
  return d;
}

/** Nome del direttore tecnico (responsabile della tutela), se la RLS lo lascia leggere; altrimenti stringa vuota. */
export function useNomeDt(): string {
  const { sb, centro } = useMio();
  const [n, setN] = useState("");
  useEffect(() => {
    if (!sb || !centro) return;
    sb.from("membri").select("nome,cognome").eq("centro_id", centro.id).eq("ruolo", "dt").limit(1).then((r) => {
      const m = ((r.data ?? []) as { nome: string; cognome: string | null }[])[0];
      setN(m ? [m.nome, m.cognome].filter(Boolean).join(" ") : "");
    });
  }, [sb, centro]);
  return n;
}
