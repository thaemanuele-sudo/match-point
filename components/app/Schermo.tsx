"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { TabBar, type Scheda } from "./TabBar";
import { useT } from "@/lib/i18n/lingua";

const T = { it: { indietro: "Indietro" }, en: { indietro: "Back" } };

/**
 * Contenitore di ogni schermata dell'app.
 *  - tab: quale scheda della barra è accesa; senza tab la barra non c'è (schermate a tutto schermo).
 *  - titolo + indietro: intestazione standard con freccia (href, oppure torna alla pagina precedente).
 */
export function Schermo({ children, tab, titolo, indietro, azioni, senzaBarra }: {
  children: ReactNode; tab?: Scheda; titolo?: ReactNode; indietro?: string | true; azioni?: ReactNode; senzaBarra?: boolean;
}) {
  const t = useT(T);
  const router = useRouter();
  const barra = !senzaBarra && tab !== undefined;
  return (
    <div className="mp-screen">
      <main className={barra ? "mp-scroll" : "mp-scroll no-tab"}>
        {(titolo || indietro) && (
          <header className="mp-head">
            {indietro &&
              (typeof indietro === "string" ? (
                <Link href={indietro} className="icon" aria-label={t.indietro}><Freccia /></Link>
              ) : (
                <button type="button" className="icon" aria-label={t.indietro} onClick={() => router.back()}><Freccia /></button>
              ))}
            {titolo && <h1>{titolo}</h1>}
            {azioni}
          </header>
        )}
        {children}
      </main>
      {barra && <TabBar attiva={tab} />}
    </div>
  );
}

function Freccia() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
}
