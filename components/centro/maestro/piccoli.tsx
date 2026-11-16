"use client";
// Pezzetti condivisi dalle schermate del maestro.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Caricamento, Errore, Seg } from "@/components/centro/ui";
import { useT } from "@/lib/i18n/lingua";
import { rotta } from "@/lib/centro/rotte";

const IT = { gruppi: "Gruppi", allievi: "Allievi" };
const T = { it: IT, en: { ...IT } };

/** Selettore Gruppi · n / Allievi · n in cima a M2 e M3. */
export function SegGruppiAllievi({ slug, attivo, nGruppi, nAllievi }: { slug: string; attivo: "gruppi" | "allievi"; nGruppi: number; nAllievi: number }) {
  const t = useT(T);
  const r = rotta(slug).maestro;
  const stile = (on: boolean): CSSProperties => ({ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: on ? "var(--mc-fg,#F3F6F1)" : "var(--mc-muted,#A1A1A6)" });
  return (
    <div className="seg" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
      <Link href={r.gruppi} className={`sg${attivo === "gruppi" ? " on" : ""}`} style={stile(attivo === "gruppi")} aria-current={attivo === "gruppi" ? "page" : undefined}>{t.gruppi} · {nGruppi}</Link>
      <Link href={r.allievi} className={`sg${attivo === "allievi" ? " on" : ""}`} style={stile(attivo === "allievi")} aria-current={attivo === "allievi" ? "page" : undefined}>{t.allievi} · {nAllievi}</Link>
    </div>
  );
}

/** Stato di caricamento o di errore di una pagina; null quando i dati ci sono. */
export function StatoPagina({ caricamento, errore, onRiprova }: { caricamento: boolean; errore: string | null; onRiprova?: () => void }): ReactNode {
  if (errore) return <Errore messaggio={errore} onRiprova={onRiprova} />;
  if (caricamento) return <Caricamento />;
  return null;
}

/** Bottone tondo con sola icona nell'intestazione (cerca, notifiche...). */
export const stileIconaTonda: CSSProperties = { width: 40, height: 40, flex: "none", borderRadius: "50%", background: "var(--mc-card,#161618)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--mc-fg,#F3F6F1)", cursor: "pointer" };

/** Pallino rosso con il numero (notifiche da leggere). */
export function Badge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 9, background: "#FF5A5F", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--mc-bg,#050505)" }}>{n > 99 ? "99+" : n}</span>
  );
}

export { Seg };
