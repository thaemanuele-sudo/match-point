"use client";
// Galleria di tutte le schermate: chip-filtro per area, griglia di iPhone piccoli e ingrandimento in un <dialog>
// con frecce, tasti freccia, scorrimento col dito ed Esc (il dialogo nativo gestisce focus e Esc).
import { useEffect, useMemo, useRef, useState } from "react";
import { Telefono } from "./Telefono";
import { GRUPPI, type GruppoId } from "@/lib/sito/schermate";
import type { LinguaSito } from "@/lib/sito/tipi";

export type VoceGalleria = { n: string; g: GruppoId; t: string };

export type TestiGalleria = {
  tutte: string;
  filtri: Record<GruppoId, string>;
  filtriAria: string;
  ingrandisci: string;
  chiudi: string;
  precedente: string;
  successivo: string;
  contatore: string;
  schermata: string;
};

export function Galleria({ voci, lang, testi }: { voci: VoceGalleria[]; lang: LinguaSito; testi: TestiGalleria }) {
  const [filtro, setFiltro] = useState<"tutte" | GruppoId>("tutte");
  const [indice, setIndice] = useState<number | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const tocco = useRef<number | null>(null);

  const lista = useMemo(() => (filtro === "tutte" ? voci : voci.filter((v) => v.g === filtro)), [voci, filtro]);
  const conta = useMemo(() => {
    const c: Record<string, number> = { tutte: voci.length };
    for (const g of GRUPPI) c[g] = voci.filter((v) => v.g === g).length;
    return c;
  }, [voci]);

  // apre/chiude il dialogo nativo in base allo stato
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (indice !== null && !d.open) d.showModal();
    if (indice === null && d.open) d.close();
  }, [indice]);

  // con il dialogo aperto la pagina sotto non deve scorrere
  useEffect(() => {
    if (indice === null) return;
    const prima = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prima;
    };
  }, [indice === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const vai = (passo: number) =>
    setIndice((i) => (i === null || lista.length === 0 ? i : (i + passo + lista.length) % lista.length));

  function tasti(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      vai(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      vai(-1);
    }
  }

  const corrente = indice !== null ? lista[indice] : null;

  return (
    <>
      <div className="s-chip-riga" role="group" aria-label={testi.filtriAria}>
        {(["tutte", ...GRUPPI] as const).map((g) => (
          <button
            key={g}
            type="button"
            className="s-chip"
            aria-pressed={filtro === g}
            onClick={() => setFiltro(g)}
          >
            {g === "tutte" ? testi.tutte : testi.filtri[g]}
            <span className="s-chip-n">{conta[g]}</span>
          </button>
        ))}
      </div>

      <ul className="s-gal">
        {lista.map((v, i) => (
          <li key={v.n}>
            <button type="button" className="s-gal-voce" onClick={() => setIndice(i)} aria-label={`${testi.ingrandisci}: ${v.t}`}>
              <Telefono nome={v.n} lang={lang} alt="" />
              <span className="s-gal-cap">{v.t}</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogo}
        className="s-dlg"
        aria-label={corrente ? `${testi.schermata}: ${corrente.t}` : testi.schermata}
        onClose={() => setIndice(null)}
        onKeyDown={tasti}
        onClick={(e) => {
          // il tocco sullo sfondo (non su telefono o pulsanti) chiude
          if ((e.target as HTMLElement).dataset.chiudi !== undefined) dialogo.current?.close();
        }}
      >
        {corrente && (
          <div className="s-dlg-in" data-chiudi="">
            <button type="button" className="s-dlg-x" onClick={() => dialogo.current?.close()} aria-label={testi.chiudi} autoFocus>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <p className="s-dlg-n" aria-live="polite">
              {testi.contatore.replace("{n}", String((indice ?? 0) + 1)).replace("{tot}", String(lista.length))}
            </p>
            <div
              className="s-dlg-scena"
              data-chiudi=""
              onTouchStart={(e) => {
                tocco.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                const x0 = tocco.current;
                tocco.current = null;
                const x1 = e.changedTouches[0]?.clientX;
                if (x0 === null || x1 === undefined || Math.abs(x1 - x0) < 48) return;
                vai(x1 < x0 ? 1 : -1);
              }}
            >
              <Telefono key={corrente.n} nome={corrente.n} lang={lang} alt={`${testi.schermata}: ${corrente.t}`} eager className="s-tel-grande" />
            </div>
            <button type="button" className="s-dlg-freccia s-dlg-prec" onClick={() => vai(-1)} aria-label={testi.precedente}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="s-dlg-cap">
              {corrente.t}
            </p>
            <button type="button" className="s-dlg-freccia s-dlg-succ" onClick={() => vai(1)} aria-label={testi.successivo}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
