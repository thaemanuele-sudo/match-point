"use client";
import { useCallback } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { registra } from "./dati";

/** Contesto comune alle schermate del Metodo: centro, client, membro attivo ("vedi come") e permesso di modifica. */
export function useMetodo() {
  const c = useCentro();
  const attivo = c.vistaCome ?? c.membro;
  const ruolo = String(c.ruolo);
  // Il Metodo resta del direttore tecnico (e del titolare): gli altri ruoli lo consultano soltanto
  const puoModificare = ruolo === "dt" || ruolo === "titolare";
  const reg = useCallback(
    (azione: string, oggetto: string, dettagli: Record<string, unknown> = {}) => registra(c.sb, c.centro.id, attivo?.id, azione, oggetto, dettagli),
    [c.sb, c.centro.id, attivo?.id],
  );
  return { sb: c.sb, centro: c.centro, attivo, ruolo, puoModificare, reg };
}
