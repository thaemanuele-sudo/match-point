"use client";
/** Ultimo cambio campo che riguarda i gruppi dati (tabella `cambi_campo`) con nomi di gruppo, campi e chi l'ha deciso. */
import { useEffect, useState } from "react";
import { isoGiorno, nomeMembro, useMio } from "./comuni";

export type Campo = { id: string; numero: number; nome: string | null; superficie: string | null; copertura: string | null; x: number | null; y: number | null; w: number | null; h: number | null };
export type Cambio = {
  id: string;
  gruppo_id: string;
  data: string;
  campo_da: string | null;
  campo_a: string | null;
  motivo: string | null;
  deciso_da: string | null;
  created_at: string;
  gruppoNome: string;
  ora: string | null;
  da: Campo | null;
  a: Campo | null;
  decisoDa: string;
};

/** `gruppoIds` null = tutti quelli che la RLS mi lascia vedere (maestro: i suoi). Una query per tabella, mai in ciclo. */
export function useUltimoCambio(gruppoIds: string[] | null, attivo = true) {
  const { sb, centro } = useMio();
  const [cambio, setCambio] = useState<Cambio | null | undefined>(undefined);
  const [campi, setCampi] = useState<Campo[]>([]);
  const chiave = gruppoIds?.join(",") ?? "*";
  useEffect(() => {
    if (!sb || !centro || !attivo) return;
    (async () => {
      let q = sb.from("cambi_campo").select("id,gruppo_id,data,campo_da,campo_a,motivo,deciso_da,created_at").eq("centro_id", centro.id).gte("data", isoGiorno(new Date())).order("created_at", { ascending: false }).limit(1);
      if (gruppoIds) {
        if (!gruppoIds.length) return setCambio(null);
        q = q.in("gruppo_id", gruppoIds);
      }
      const { data } = await q;
      const c = ((data ?? []) as { id: string; gruppo_id: string; data: string; campo_da: string | null; campo_a: string | null; motivo: string | null; deciso_da: string | null; created_at: string }[])[0];
      const { data: cs } = await sb.from("campi").select("id,numero,nome,superficie,copertura,x,y,w,h").eq("centro_id", centro.id).order("numero");
      const elenco = (cs ?? []) as Campo[];
      setCampi(elenco);
      if (!c) return setCambio(null);
      const [g, m] = await Promise.all([
        sb.from("gruppi").select("nome,ora").eq("id", c.gruppo_id).maybeSingle(),
        c.deciso_da ? sb.from("membri").select("nome,cognome").eq("id", c.deciso_da).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const gr = g.data as { nome: string; ora: string | null } | null;
      setCambio({ ...c, gruppoNome: gr?.nome ?? "", ora: gr?.ora ?? null, da: elenco.find((x) => x.id === c.campo_da) ?? null, a: elenco.find((x) => x.id === c.campo_a) ?? null, decisoDa: nomeMembro(m.data as { nome: string; cognome: string | null } | null) });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, centro, chiave, attivo]);
  return { cambio, campi };
}
