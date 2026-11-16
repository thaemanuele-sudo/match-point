"use client";
// Codice di invito di 6 caratteri (tabella `inviti`): lo genera il centro e lo consegna a maestri, famiglie o responsabili.
import { useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import type { SB } from "@/lib/centro/contesto";
import { ROTTE_APP } from "@/lib/centro/rotte";
import { Btn } from "@/components/centro/ui";
import { COL_INVITO, nuovoCodice } from "./dati";
import type { InvitoR } from "./tipi";
import "./org.css";

const IT = { copia: "Copia codice", copiaLink: "Copia link", copiato: "Copiato", link: "Link per entrare", scade: "Valido 30 giorni" };
const T = { it: IT, en: { ...IT } };

export type NuovoInvito = { ruolo: string; gruppo_id?: string | null; area_id?: string | null; allievo_id?: string | null; usi_max?: number };

/** Crea un invito con un codice libero (riprova se il codice esiste già: la colonna è unica). */
export async function creaInvito(sb: SB, centroId: string, v: NuovoInvito): Promise<{ invito?: InvitoR; errore?: string }> {
  const scade = new Date();
  scade.setDate(scade.getDate() + 30);
  let ultimo = "";
  for (let i = 0; i < 6; i++) {
    const { data, error } = await sb
      .from("inviti")
      .insert({ centro_id: centroId, codice: nuovoCodice(), ruolo: v.ruolo, gruppo_id: v.gruppo_id ?? null, area_id: v.area_id ?? null, allievo_id: v.allievo_id ?? null, scade_il: scade.toISOString(), usi_max: v.usi_max ?? 1 })
      .select(COL_INVITO)
      .single();
    if (!error) return { invito: data as InvitoR };
    ultimo = error.message;
    if (error.code !== "23505") break;
  }
  return { errore: ultimo };
}

/** Il link che la famiglia o il maestro aprono sul telefono. */
export const linkInvito = (codice: string) => `${window.location.origin}${ROTTE_APP.unisciti(codice)}`;

async function copia(testo: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(testo); return true; } catch { return false; }
}

export function InvitoBox({ codice, titolo }: { codice: string; titolo?: string }) {
  const t = useT(T);
  const [ok, setOk] = useState<"" | "c" | "l">("");
  const vai = async (cosa: "c" | "l") => {
    if (await copia(cosa === "c" ? codice : linkInvito(codice))) {
      setOk(cosa);
      setTimeout(() => setOk(""), 1800);
    }
  };
  return (
    <div className="card og-box">
      {titolo && <div className="og-k">{titolo}</div>}
      <span className="code og-codice" aria-live="polite">{codice}</span>
      <div className="og-link muted" aria-label={t.link}>{linkInvito(codice)}</div>
      <div className="og-riga">
        <Btn variante="secondario" piccolo onClick={() => void vai("c")}>{ok === "c" ? t.copiato : t.copia}</Btn>
        <Btn variante="secondario" piccolo onClick={() => void vai("l")}>{ok === "l" ? t.copiato : t.copiaLink}</Btn>
      </div>
      <div className="og-k">{t.scade}</div>
    </div>
  );
}
