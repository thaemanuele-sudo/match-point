"use client";
/**
 * Accesso ai dati delle conversazioni (tabelle `conversazioni`, `partecipanti`, `messaggi`) e RPC `invia_messaggio`.
 * Le RPC sono tutte qui sotto: se il database cambia il nome di un parametro si corregge in un solo punto.
 */
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lettoQuando, messaggioErrore, nomeCorto, nomeMembro, useMio, useRealtime } from "./comuni";

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

/** Tutte le conversazioni visibili al membro attivo, con ultimo messaggio e puntino "nuovo". */
export function useConversazioni() {
  const { sb, centro, me } = useMio();
  const [conv, setConv] = useState<Conv[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const carica = useCallback(async () => {
    if (!sb || !centro || !me) return;
    try {
      const { data, error } = await sb.from("conversazioni").select("id,tipo,allievo_id,titolo,created_at").eq("centro_id", centro.id).order("created_at", { ascending: false });
      if (error) throw error;
      const righe = (data ?? []) as { id: string; tipo: TipoConv; allievo_id: string | null; titolo: string | null; created_at: string }[];
      const ids = righe.map((r) => r.id);
      const parti = await caricaParti(sb, ids);
      const alIds = Array.from(new Set(righe.map((r) => r.allievo_id).filter(Boolean))) as string[];
      const alNomi: Record<string, string> = {};
      if (alIds.length) {
        const { data: al } = await sb.from("allievi").select("id,nome,cognome").in("id", alIds);
        ((al ?? []) as { id: string; nome: string; cognome: string | null }[]).forEach((a) => (alNomi[a.id] = nomeCorto(a)));
      }
      const ultimi: Record<string, Msg> = {};
      if (ids.length) {
        const { data: ms } = await sb.from("messaggi").select("id,conversazione_id,autore_id,testo,created_at,consegna_il").in("conversazione_id", ids).order("created_at", { ascending: false }).limit(400);
        const ora = Date.now();
        ((ms ?? []) as Msg[]).forEach((m) => {
          // un messaggio programmato per l'indomani non è ancora "arrivato" a chi lo deve ricevere
          if (m.consegna_il && new Date(m.consegna_il).getTime() > ora && m.autore_id !== me.id) return;
          if (!ultimi[m.conversazione_id]) ultimi[m.conversazione_id] = m;
        });
      }
      const out: Conv[] = righe
        .map((r) => {
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
        })
        // vedo solo le conversazioni in cui sono partecipante (il DT vede il resto dall'archivio, non dalla casella)
        .filter((c) => c.parti.some((x) => x.membro_id === me.id));
      setConv(out);
      setErrore(null);
    } catch (e) {
      setErrore(messaggioErrore(e));
      setConv((c) => c ?? []);
    }
  }, [sb, centro, me]);

  useEffect(() => {
    carica();
  }, [carica]);
  // nuovi messaggi del centro: la RLS fa arrivare solo quelli che posso leggere
  useRealtime(sb, `cm-lista-${me?.id ?? "x"}`, "messaggi", null, "INSERT", carica);

  return { conv, errore, ricarica: carica };
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
