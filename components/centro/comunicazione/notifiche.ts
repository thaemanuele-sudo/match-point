"use client";
/**
 * Notifiche del membro attivo (tabella `notifiche`): a blocchi di 50, solo ultimi 90 giorni, colonne scelte,
 * realtime filtrato per membro e chiuso allo smontaggio. Non usa `useNotifiche()` della fondazione perché qui
 * servono filtri per tipo e "carica altre"; legge e scrive la stessa tabella.
 */
import { useCallback, useEffect, useState } from "react";
import { BLOCCO, messaggioErrore, useMio, useRealtime } from "./comuni";

export type Notifica = {
  id: string;
  tipo: string;
  titolo: string;
  testo: string | null;
  link: string | null;
  mittente: string | null;
  letta_il: string | null;
  created_at: string;
};
const COL = "id,tipo,titolo,testo,link,mittente,letta_il,created_at";

export function useListaNotifiche(opz: { tipi?: string[]; escludi?: string[] } = {}) {
  const { sb, me } = useMio();
  const [lista, setLista] = useState<Notifica[] | null>(null);
  const [nonLette, setNonLette] = useState(0);
  const [ancora, setAncora] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const incl = opz.tipi?.join(",") ?? "";
  const escl = opz.escludi?.join(",") ?? "";

  const leggi = useCallback(
    async (da: number, a: number) => {
      if (!sb || !me) return [];
      const novanta = new Date(Date.now() - 90 * 86400000).toISOString();
      let q = sb.from("notifiche").select(COL).eq("membro_id", me.id).gte("created_at", novanta).order("created_at", { ascending: false }).range(da, a);
      if (incl) q = q.in("tipo", incl.split(","));
      if (escl) q = q.not("tipo", "in", `(${escl})`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Notifica[];
    },
    [sb, me, incl, escl]
  );

  const conta = useCallback(async () => {
    if (!sb || !me) return;
    let q = sb.from("notifiche").select("id", { count: "exact", head: true }).eq("membro_id", me.id).is("letta_il", null);
    if (incl) q = q.in("tipo", incl.split(","));
    if (escl) q = q.not("tipo", "in", `(${escl})`);
    const r = await q;
    setNonLette(r.count ?? 0);
  }, [sb, me, incl, escl]);

  const carica = useCallback(async () => {
    try {
      const r = await leggi(0, BLOCCO - 1);
      setLista(r);
      setAncora(r.length === BLOCCO);
      setErrore(null);
      conta();
    } catch (e) {
      setErrore(messaggioErrore(e));
      setLista((l) => l ?? []);
    }
  }, [leggi, conta]);

  const altre = useCallback(async () => {
    try {
      const da = lista?.length ?? 0;
      const r = await leggi(da, da + BLOCCO - 1);
      setLista((l) => [...(l ?? []), ...r]);
      setAncora(r.length === BLOCCO);
    } catch (e) {
      setErrore(messaggioErrore(e));
    }
  }, [leggi, lista]);

  useEffect(() => {
    carica();
  }, [carica]);
  // una notifica nuova arriva dal payload: niente ricarica della lista
  useRealtime<Notifica>(sb, `cm-notif-${me?.id ?? "x"}`, "notifiche", me ? `membro_id=eq.${me.id}` : null, "INSERT", (n) => {
    if (incl && !incl.split(",").includes(n.tipo)) return;
    if (escl && escl.split(",").includes(n.tipo)) return;
    setLista((l) => (l && !l.some((x) => x.id === n.id) ? [n, ...l] : l));
    setNonLette((c) => c + 1);
  });

  /** Segna come lette una o più notifiche con un'unica richiesta. */
  const segna = useCallback(
    async (ids: string[]) => {
      if (!sb || !ids.length) return;
      const ora = new Date().toISOString();
      const { error } = await sb.from("notifiche").update({ letta_il: ora }).in("id", ids);
      if (error) return setErrore(messaggioErrore(error));
      setLista((l) => (l ? l.map((n) => (ids.includes(n.id) ? { ...n, letta_il: ora } : n)) : l));
      conta();
    },
    [sb, conta]
  );

  return { lista, nonLette, ancora, altre, errore, segna, ricarica: carica };
}
