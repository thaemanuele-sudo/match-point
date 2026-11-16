"use client";
import { useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    full8PointCards: "Schede complete in 8 punti (a-h)",
    strategies: "Strategie",
    deepCrosscourtAndWait: "Diagonale profonda e attesa della palla corta",
    clay: "Terra",
    tutte: "Tutte",
    adulti: "Adulti",
    superficie: "Superficie",
    serveToTheBackhand: "Servizio al rovescio e primo colpo nello spazio",
    hard: "Cemento",
    insideOutForehandTo: "Inside-out di diritto sul rovescio",
    highHeavyTopspinTo: "Topspin alto e carico sul rovescio",
    wideServeAndForehand: "Servizio esterno e diritto nello spazio",
    grass: "Erba",
    downTheLineApproach: "Approccio lungolinea e volée incrociata",
    dropShotAfterA: "Palla corta dopo scambio profondo",
    chipAndChargeOn: "Chip and charge sulla seconda",
    deepReturnToThe: "Risposta profonda al centro",
    leftyWideServeOn: "Servizio mancino esterno lato vantaggi",
  },
  en: {
    back: "Back",
    full8PointCards: "Full 8-point cards (a-h)",
    strategies: "Strategies",
    deepCrosscourtAndWait: "Deep crosscourt and wait for the short ball",
    clay: "Clay",
    tutte: "All",
    adulti: "Adults",
    superficie: "Surface",
    serveToTheBackhand: "Serve to the backhand and first shot into space",
    hard: "Hard",
    insideOutForehandTo: "Inside-out forehand to the backhand",
    highHeavyTopspinTo: "High heavy topspin to the backhand",
    wideServeAndForehand: "Wide serve and forehand into space",
    grass: "Grass",
    downTheLineApproach: "Down-the-line approach and crosscourt volley",
    dropShotAfterA: "Drop shot after a deep rally",
    chipAndChargeOn: "Chip and charge on second serve",
    deepReturnToThe: "Deep return to the middle",
    leftyWideServeOn: "Lefty wide serve on the ad side",
  },
};

type Sup = "clay" | "hard" | "grass";
const COLORE: Record<Sup, string> = { clay: "#C8693D", hard: "#3D7BC8", grass: "#2E8A55" };
// S1-S10 (dimostrative): codice, chiave del titolo, fasce ("<" = da quella fascia ad Adulti, "·" = solo le due) e superficie
const STRATEGIE: { cod: string; tit: keyof typeof T.it; da: string; a: string; sep: "·" | "→"; sup: Sup }[] = [
  { cod: "S1", tit: "deepCrosscourtAndWait", da: "U10", a: "U12", sep: "·", sup: "clay" },
  { cod: "S2", tit: "serveToTheBackhand", da: "U12", a: "U14", sep: "·", sup: "hard" },
  { cod: "S3", tit: "insideOutForehandTo", da: "U14", a: "ADULTI", sep: "→", sup: "hard" },
  { cod: "S4", tit: "highHeavyTopspinTo", da: "U16", a: "ADULTI", sep: "→", sup: "clay" },
  { cod: "S5", tit: "wideServeAndForehand", da: "U16", a: "ADULTI", sep: "→", sup: "grass" },
  { cod: "S6", tit: "downTheLineApproach", da: "U14", a: "U18", sep: "→", sup: "grass" },
  { cod: "S7", tit: "dropShotAfterA", da: "U16", a: "ADULTI", sep: "→", sup: "clay" },
  { cod: "S8", tit: "chipAndChargeOn", da: "U18", a: "ADULTI", sep: "·", sup: "grass" },
  { cod: "S9", tit: "deepReturnToThe", da: "U14", a: "ADULTI", sep: "→", sup: "hard" },
  { cod: "S10", tit: "leftyWideServeOn", da: "U14", a: "ADULTI", sep: "→", sup: "grass" },
];
const FILTRI: ("tutte" | Sup)[] = ["tutte", "clay", "hard", "grass"];

export function CatalogoStrategie() {
  const t = useT(T);
  const [sup, setSup] = useState<"tutte" | Sup>("tutte");
  const fas = (f: string) => (f === "ADULTI" ? t.adulti : f);
  const righe = STRATEGIE.filter((r) => sup === "tutte" || r.sup === sup);
  return (
    <Schermo tab="tattica">
      <div className={K.scr} style={{ gap: 8 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.Tattica} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.full8PointCards}</div>
            <h1 className={K.h1}>{t.strategies}</h1>
          </div>
        </header>
        <div className={K.chips} style={{ marginBottom: "2px" }}>
          {FILTRI.map((f) => (
            <button key={f} type="button" className={f === sup ? `${K.chip} ${K.on}` : K.chip} aria-pressed={f === sup} onClick={() => setSup(f)}>{f === "tutte" ? t.tutte : t[f]}</button>
          ))}
        </div>
        {righe.map((r) => (
          <Link key={r.cod} href={ROTTE.TatticaStrategia} className={K.li} style={{ padding: "9px 12px" }}>
            <span className={K.code} style={{ minWidth: "34px", textAlign: "center" }}>{r.cod}</span>
            <span className={K.grow}>
              <span className={K.t} style={{ fontSize: "14px", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t[r.tit]}</span>
              <span className={K.s}>{fas(r.da)} {r.sep} {fas(r.a)}</span>
            </span>
            <span className={K.tag} style={{ background: COLORE[r.sup], color: "#fff" }}>{t[r.sup]}</span>
          </Link>
        ))}
      </div>

    </Schermo>
  );
}
