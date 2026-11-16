"use client";
import Link from "next/link";
import { CampoAnimato } from "@/components/schemi/CampoAnimato";
import { useLang, useT } from "@/lib/i18n/lingua";
import type { AnimazioneSchema, Fascia } from "@/lib/types";
import S from "./Schemi.module.css";

const T = {
  it: { adulti: "Adulti", difficolta: "Difficoltà", su5: "su 5", demo: "Esempio" },
  en: { adulti: "Adults", difficolta: "Difficulty", su5: "out of 5", demo: "Example" },
};

/** Pallini della difficoltà (1-5), con testo per i lettori di schermo. */
export function Difficolta({ valore }: { valore: number }) {
  const t = useT(T);
  const v = Math.max(0, Math.min(5, Math.round(valore)));
  return (
    <span className={S.dots} role="img" aria-label={`${t.difficolta}: ${v} ${t.su5}`}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= v ? S.dotOn : S.dot} />)}
    </span>
  );
}

/** Nome visibile di una fascia ("ADULTI" nel database, "Adulti"/"Adults" a schermo). */
export function useEtichettaFascia() {
  const t = useT(T);
  return (f: Fascia) => (f === "ADULTI" ? t.adulti : f);
}

/** Card di uno schema: anteprima animata in loop a sinistra, testi a destra; un tocco apre il dettaglio. */
export function SchemaCard({ href, titolo, obiettivo, difficolta, fasce, animazione, demo }: {
  href: string; titolo: string; obiettivo: string; difficolta: number; fasce: Fascia[]; animazione: AnimazioneSchema; demo?: boolean;
}) {
  const { lang } = useLang();
  const t = useT(T);
  const etichetta = useEtichettaFascia();
  return (
    <Link href={href} className={S.card}>
      {/* l'anteprima non è interattiva: il tocco va alla card */}
      <div className={S.prev}>
        <CampoAnimato animazione={animazione} auto lingua={lang} />
      </div>
      <div className={S.info}>
        {demo && <span className={S.demo}>{t.demo}</span>}
        <b className={S.titolo}>{titolo}</b>
        {obiettivo && <span className={S.obiettivo}>{obiettivo}</span>}
        <Difficolta valore={difficolta} />
        <span className={S.tags}>{fasce.map((f) => <span key={f} className={S.tag}>{etichetta(f)}</span>)}</span>
      </div>
    </Link>
  );
}
