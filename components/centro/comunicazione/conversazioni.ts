"use client";
/**
 * Accesso ai dati delle conversazioni (tabelle `conversazioni`, `partecipanti`, `messaggi`) e RPC `invia_messaggio`.
 * Le RPC sono tutte qui sotto: se il database cambia il nome di un parametro si corregge in un solo punto.
 */
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BLOCCO, lettoQuando, messaggioErrore, nomeCorto, nomeMembro, useMio, useRealtime } from "./comuni";

export type TipoConv = "allievo_maestro" | "famiglia_maestro" | "famiglia_segreteria" | "staff";
export type Parte = { membro_id: string; sola_lettura: boolean; nome: string; cognome: string; ruolo: string };
export type Conv = {
  id: string;
  tipo: TipoConv;
  allievo_id: string | null;
  titolo: string | null;
  created_at: string;
  parti: Parte[];
  allievoNome: string;
  ultimo: { testo: string; autore_id: string; created_at: string } | null;
  nuovo: boolean;
  miaSolaLettura: boolean;
};

export type Msg = { id: string; conversazione_id: string; autore_id: string; testo: string; created_at: string; consegna_il: string | null };

/** `invia_messaggio`: il server applica silenzio (consegna alle 8:00), sola lettura e crea le notifiche. */
export async function inviaMessaggio(sb: SupabaseClient, conversazione: string, testo: string) {
  const { data, error } = await sb.rpc("invia_messaggio", { conversazione, testo });
  if (error) throw error;
  return data as unknown;
}

/** Carica partecipanti con nome e ruolo (due richieste semplici: non dipende dai nomi delle chiavi esterne). */
export async function caricaParti(sb: SupabaseClient, convIds: string[]): Promise<Record<string, Parte[]>> {
  if (!convIds.length) return {};
  const { data: ps } = await sb.from("partecipanti").select("conversazione_id,membro_id,sola_lettura").in("conversazione_id", convIds);
  const righe = (ps ?? []) as { conversazione_id: string; membro_id: string; sola_lettura: boolean }[];
  const ids = Array.from(new Set(righe.map((r) => r.membro_id)));
  const nomi: Record<string, { nome: string; cognome: string; ruolo: string }> = {};
  if (ids.length) {
    const { data: ms } = await sb.from("membri").select("id,nome,cognome,ruolo").in("id", ids);
    ((ms ?? []) as { id: string; nome: string | null; cognome: string | null; ruolo: string }[]).forEach((m) => (nomi[m.id] = { nome: m.nome ?? "", cognome: m.cognome ?? "", ruolo: m.ruolo }));
  }
  const out: Record<string, Parte[]> = {};
  righe.forEach((r) => {
    (out[r.conversazione_id] ||= []).push({ membro_id: r.membro_id, sola_lettura: !!r.sola_lettura, nome: nomi[r.membro_id]?.nome ?? "", cognome: nomi[r.membro_id]?.cognome ?? "", ruolo: nomi[r.membro_id]?.ruolo ?? "" });
  });
  return out;
}

/**
 * Conversazioni del membro attivo, a blocchi di 50 (più recenti per prime).
 * Il filtro per tipo e per allievo si fa nel database: la RLS limita già alle conversazioni che posso vedere.
 * Ultimo messaggio: una sola query `in(...)` sugli ultimi 90 giorni (mai una query per conversazione).
 * `attivo: false` salta il caricamento quando la scheda non serve.
 */
export function useConversazioni(opz: { tipi?: TipoConv[]; allievoId?: string | null; attivo?: boolean } = {}) {
  const { sb, centro, me } = useMio();
  const [conv, setConv] = useState<Conv[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [ancora, setAncora] = useState(false);
  const chiaveTipi = opz.tipi?.join(",") ?? "";
  const allievoId = opz.allievoId ?? null;
  const attivo = opz.attivo !== false;

  const leggi = useCallback(
    async (da: number, a: number): Promise<Conv[]> => {
      if (!sb || !centro || !me || !attivo) return [];
      let q = sb.from("conversazioni").select("id,tipo,allievo_id,titolo,created_at").eq("centro_id", centro.id).order("created_at", { ascending: false }).range(da, a);
      if (chiaveTipi) q = q.in("tipo", chiaveTipi.split(","));
      if (allievoId) q = q.or(`allievo_id.eq.${allievoId},allievo_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      const righe = (data ?? []) as { id: string; tipo: TipoConv; allievo_id: string | null; titolo: string | null; created_at: string }[];
      const ids = righe.map((r) => r.id);
      const alIds = Array.from(new Set(righe.map((r) => r.allievo_id).filter(Boolean))) as string[];
      const novanta = new Date(Date.now() - 90 * 86400000).toISOString();
      const [parti, al, ms] = await Promise.all([
        caricaParti(sb, ids),
        alIds.length ? sb.from("allievi").select("id,nome,cognome").in("id", alIds) : Promise.resolve({ data: [] as unknown[] }),
        ids.length ? sb.from("messaggi").select("conversazione_id,autore_id,testo,created_at,consegna_il").in("conversazione_id", ids).gte("created_at", novanta).order("created_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] as unknown[] }),
      ]);
      const alNomi: Record<string, string> = {};
      ((al.data ?? []) as { id: string; nome: string; cognome: string | null }[]).forEach((x) => (alNomi[x.id] = nomeCorto(x)));
      const ultimi: Record<string, Msg> = {};
      const ora = Date.now();
      ((ms.data ?? []) as Msg[]).forEach((m) => {
        // un messaggio programmato per l'indomani non è ancora "arrivato" a chi lo deve ricevere
        if (m.consegna_il && new Date(m.consegna_il).getTime() > ora && m.autore_id !== me.id) return;
        if (!ultimi[m.conversazione_id]) ultimi[m.conversazione_id] = m;
      });
      return righe.map((r) => {
        const p = parti[r.id] ?? [];
        const u = ultimi[r.id];
        return {
          ...r,
          parti: p,
          allievoNome: r.allievo_id ? alNomi[r.allievo_id] ?? "" : "",
          ultimo: u ? { testo: u.testo, autore_id: u.autore_id, created_at: u.created_at } : null,
          nuovo: !!u && u.autore_id !== me.id && new Date(u.created_at).getTime() > lettoQuando(r.id),
          miaSolaLettura: !!p.find((x) => x.membro_id === me.id)?.sola_lettura,
        };
      });
    },
    [sb, centro, me, chiaveTipi, allievoId, attivo]
  );

  const carica = useCallback(async () => {
    try {
      const n = Math.max(BLOCCO, conv?.length ?? 0);
      const r = await leggi(0, n - 1);
      setConv(r);
      setAncora(r.length === n);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
      setConv((c) => c ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leggi]);

  const altre = useCallback(async () => {
    try {
      const da = conv?.length ?? 0;
      const r = await leggi(da, da + BLOCCO - 1);
      setConv((c) => [...(c ?? []), ...r]);
      setAncora(r.length === BLOCCO);
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [leggi, conv]);

  useEffect(() => {
    setConv(null);
    carica();
  }, [carica]);
  // un messaggio nuovo per me crea una notifica: ascolto solo le mie notifiche (filtro per membro), non tutti i messaggi del centro
  useRealtime(sb, `cm-lista-${me?.id ?? "x"}`, "notifiche", me ? `membro_id=eq.${me.id}` : null, "INSERT", () => carica());

  return { conv, errore, ricarica: carica, altre, ancora };
}

/** Nome da mostrare nella lista per il membro attivo. */
export function nomeConv(c: Conv, meId: string, etichette: { famigliaDi: string; chatDi: string; segreteria: string; staff: string }): string {
  const altri = c.parti.filter((p) => p.membro_id !== meId);
  const per = (ruolo: string) => altri.find((p) => p.ruolo === ruolo);
  switch (c.tipo) {
    case "allievo_maestro": {
      const me = c.parti.find((p) => p.membro_id === meId);
      if (me?.ruolo === "maestro") return c.allievoNome || nomeMembro(per("allievo")) || etichette.chatDi.replace("{nome}", "");
      if (me?.ruolo === "genitore" || me?.sola_lettura) return etichette.chatDi.replace("{nome}", c.allievoNome || nomeMembro(per("allievo")));
      return nomeMembro(per("maestro")) || etichette.chatDi.replace("{nome}", c.allievoNome);
    }
    case "famiglia_maestro": {
      const me = c.parti.find((p) => p.membro_id === meId);
      if (me?.ruolo === "genitore") return nomeMembro(per("maestro")) || etichette.staff;
      return nomeMembro(per("genitore")) || etichette.famigliaDi.replace("{nome}", c.allievoNome);
    }
    case "famiglia_segreteria": {
      const me = c.parti.find((p) => p.membro_id === meId);
      if (me?.ruolo === "genitore") return etichette.segreteria;
      return nomeMembro(per("genitore")) || etichette.famigliaDi.replace("{nome}", c.allievoNome);
    }
    default:
      return c.titolo || etichette.staff;
  }
}

/**
 * Trova la conversazione di un certo tipo per un allievo in cui sono partecipante; se manca prova a crearla.
 * La creazione dipende dalle RLS: se il database la nega, l'errore arriva alla schermata che lo mostra.
 */
export async function assicuraConversazione(
  sb: SupabaseClient,
  centroId: string,
  meId: string,
  tipo: TipoConv,
  allievoId: string | null,
  altri: { membro_id: string; sola_lettura?: boolean }[],
  titolo?: string
): Promise<string> {
  let q = sb.from("conversazioni").select("id").eq("centro_id", centroId).eq("tipo", tipo);
  if (allievoId) q = q.eq("allievo_id", allievoId);
  const { data: esistenti } = await q;
  const ids = ((esistenti ?? []) as { id: string }[]).map((x) => x.id);
  if (ids.length) {
    const parti = await caricaParti(sb, ids);
    const mia = ids.find((id) => (parti[id] ?? []).some((p) => p.membro_id === meId) && altri.every((a) => (parti[id] ?? []).some((p) => p.membro_id === a.membro_id)));
    if (mia) return mia;
  }
  const { data: nuova, error } = await sb.from("conversazioni").insert({ centro_id: centroId, tipo, allievo_id: allievoId, titolo: titolo ?? null }).select("id").single();
  if (error || !nuova) throw error ?? new Error("conversazione");
  const id = (nuova as { id: string }).id;
  const righe = [{ membro_id: meId, sola_lettura: false }, ...altri].map((p) => ({ centro_id: centroId, conversazione_id: id, membro_id: p.membro_id, sola_lettura: !!p.sola_lettura }));
  const { error: e2 } = await sb.from("partecipanti").insert(righe);
  if (e2) throw e2;
  return id;
}
