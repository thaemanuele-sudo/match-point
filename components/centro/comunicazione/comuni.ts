"use client";
/**
 * Utilità comuni dell'area F2 (comunicazione e tutela).
 * Qui stanno solo le cose condivise tra chat, avvisi, notifiche, assenze e segnalazioni:
 * così ogni schermata resta piccola e i nomi di tabelle e RPC del contratto (docs/CENTRI.md) sono in un posto solo.
 */
import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCentro } from "@/lib/centro/contesto";

export type Imp = {
  silenzio_da: string;
  silenzio_a: string;
  chat_genitori_fino: number;
  account_ragazzo_da: number;
  assenza_entro_ore: number;
  conservazione_mesi: number;
};
/** Valori di default del contratto: servono se il centro non li ha ancora salvati. */
export const IMP_DEF: Imp = {
  silenzio_da: "21:00",
  silenzio_a: "08:00",
  chat_genitori_fino: 18,
  account_ragazzo_da: 14,
  assenza_entro_ore: 2,
  conservazione_mesi: 24,
};

export type MembroLite = {
  id: string;
  nome?: string | null;
  cognome?: string | null;
  ruolo?: string;
  area_id?: string | null;
  user_id?: string | null;
};

export type RuoloSchermo = "dt" | "area" | "maestro" | "genitore" | "allievo";

/** Il contesto del centro già "pulito": il membro attivo è chi si sta vedendo (vista come) e non chi ha fatto l'accesso. */
export function useMio() {
  const c = useCentro() as unknown as {
    centro: { id: string; slug: string; nome: string; nome_app?: string | null; impostazioni?: Partial<Imp> | null };
    membro: MembroLite | null;
    vistaCome: MembroLite | null;
    ruolo: string;
    sb: SupabaseClient;
  };
  const centro = c?.centro;
  const me = c?.vistaCome ?? c?.membro ?? null;
  const imp: Imp = { ...IMP_DEF, ...(centro?.impostazioni ?? {}) };
  return { sb: c?.sb, centro, slug: centro?.slug ?? "", base: `/c/${centro?.slug ?? ""}`, me, ruolo: (c?.ruolo ?? "") as string, imp };
}

/** Il ruolo del contratto diventa il ruolo grafico dello schermo (barre e dashboard). */
export function ruoloSchermo(ruolo: string): RuoloSchermo {
  if (ruolo === "maestro" || ruolo === "genitore" || ruolo === "allievo") return ruolo;
  if (ruolo === "responsabile_area") return "area";
  return "dt";
}

export const èStaffDt = (ruolo: string) => ruolo === "titolare" || ruolo === "dt";

export function nomeMembro(m?: { nome?: string | null; cognome?: string | null } | null): string {
  if (!m) return "";
  return [m.nome, m.cognome].filter(Boolean).join(" ").trim();
}
/** "Tommaso R." come nei mockup: nome e iniziale del cognome. */
export function nomeCorto(m?: { nome?: string | null; cognome?: string | null } | null): string {
  if (!m) return "";
  const c = m.cognome ? ` ${m.cognome.charAt(0).toUpperCase()}.` : "";
  return `${m.nome ?? ""}${c}`.trim();
}
export function iniziali(s: string): string {
  const p = s.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[1][0]).toUpperCase();
}

/** Sostituisce {chiave} nei testi del dizionario. */
export function f(s: string, v: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
}

// ---------- orari di silenzio ----------
const minuti = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
};
/** Vero se in questo momento il centro è in silenzio (di default dalle 21:00 alle 8:00). */
export function inSilenzio(imp: Imp, d: Date = new Date()): boolean {
  const ora = d.getHours() * 60 + d.getMinutes();
  const da = minuti(imp.silenzio_da);
  const a = minuti(imp.silenzio_a);
  return da > a ? ora >= da || ora < a : ora >= da && ora < a;
}
/** Prossima ora di consegna dopo il silenzio. Il server applica la stessa regola: qui serve solo per scriverlo all'utente. */
export function prossimaConsegna(imp: Imp, d: Date = new Date()): Date {
  const r = new Date(d);
  const a = minuti(imp.silenzio_a);
  r.setHours(Math.floor(a / 60), a % 60, 0, 0);
  if (r.getTime() <= d.getTime()) r.setDate(r.getDate() + 1);
  return r;
}
export const hhmm = (s: string) => s.slice(0, 5);

// ---------- date in italiano ----------
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const GIORNI_C = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI_L = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const p2 = (n: number) => String(n).padStart(2, "0");
export const oraIt = (v: string | Date) => {
  const d = new Date(v);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
export const dataBreve = (v: string | Date) => {
  const d = new Date(v);
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
};
export const giornoLungo = (v: string | Date) => {
  const d = new Date(v);
  const g = GIORNI[d.getDay()];
  return `${g.charAt(0).toUpperCase()}${g.slice(1)} ${d.getDate()} ${MESI_L[d.getMonth()]}`;
};
export const giornoSettimana = (v: string | Date) => GIORNI[new Date(v).getDay()];
export const giornoSettimanaCorto = (v: string | Date) => GIORNI_C[new Date(v).getDay()];
export const dataLunga = (v: string | Date) => {
  const d = new Date(v);
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI_L[d.getMonth()]}`;
};
export const isoGiorno = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
/** "oggi 16:20", "ieri 19:10", "mer 11 nov". */
export function quando(v: string | Date): string {
  const d = new Date(v);
  const oggi = new Date();
  const g = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((g(oggi) - g(d)) / 86400000);
  if (diff === 0) return `oggi ${oraIt(d)}`;
  if (diff === 1) return `ieri ${oraIt(d)}`;
  if (diff > 1 && diff < 7) return `${GIORNI_C[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
  return `${d.getDate()} ${MESI[d.getMonth()]}`;
}
/** Per la lista delle conversazioni: ora se è di oggi, "ieri", giorno breve se è di questa settimana, altrimenti data. */
export function quandoLista(v: string | Date): string {
  const d = new Date(v);
  const oggi = new Date();
  const g = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((g(oggi) - g(d)) / 86400000);
  if (diff <= 0) return oraIt(d);
  if (diff === 1) return "ieri";
  if (diff < 7) return GIORNI_C[d.getDay()];
  return dataBreve(d);
}
/** Data e ora di un giorno "2026-11-17" + "17:00:00" in ora locale. */
export function inizioLezione(data: string, ora: string): Date {
  const [y, m, d] = data.split("-").map((x) => parseInt(x, 10));
  const [h, mi] = ora.split(":").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0, 0);
}
/** Giorno della settimana come nel contratto: 1 = lunedì … 7 = domenica. */
export const giornoContratto = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

// ---------- letture locali (solo comodità del dispositivo) ----------
export function lettoAdesso(chiave: string) {
  try {
    localStorage.setItem(`mp-letto-${chiave}`, new Date().toISOString());
  } catch {
    /* storage non disponibile: il puntino "nuovo" resterà */
  }
}
export function lettoQuando(chiave: string): number {
  try {
    const v = localStorage.getItem(`mp-letto-${chiave}`);
    return v ? new Date(v).getTime() : 0;
  } catch {
    return 0;
  }
}

/**
 * Ascolta una tabella in tempo reale (Supabase Realtime) e richiama `quando` a ogni cambio.
 * Il callback sta in un ref, così la sottoscrizione non si rifà a ogni render.
 */
export function useRealtime(sb: SupabaseClient | undefined, nome: string, tabella: string, filtro: string | null, evento: "INSERT" | "*", quandoSuccede: () => void) {
  const cb = useRef(quandoSuccede);
  cb.current = quandoSuccede;
  useEffect(() => {
    if (!sb) return;
    const ch = sb
      .channel(nome)
      .on("postgres_changes" as never, { event: evento, schema: "public", table: tabella, ...(filtro ? { filter: filtro } : {}) } as never, () => cb.current())
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, nome, tabella, filtro, evento]);
}

export const messaggioErrore = (e: unknown): string => {
  const m = (e as { message?: string } | null)?.message;
  return m || "Errore";
};
