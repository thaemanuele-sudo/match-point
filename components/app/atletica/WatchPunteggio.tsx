"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { Quadrante, useOra } from "./Quadrante";
import s from "./atletica.module.css";

const T = {
  it: { nome: "Punteggio live sul quadrante dello smartwatch", set: "Set", tu: "Tu", avv: "Avv.", piuTu: "+ Tu", piuAvv: "+ Avv.", puntoTu: "Punto per te", puntoAvv: "Punto per l'avversario" },
  en: { nome: "Live score on the smartwatch face", set: "Set", tu: "You", avv: "Opp.", piuTu: "+ You", piuAvv: "+ Opp.", puntoTu: "Point for you", puntoAvv: "Point for the opponent" },
};
const PUNTI = ["0", "15", "30", "40", "AD"];

type Stato = { set: number; giochi: [number, number]; punti: [number, number] };

/** Regole del tennis: 0-15-30-40, vantaggio ai "vari", gioco, e set a 6 con 2 di scarto (7 sul 5 o sul 6). */
function segna(st: Stato, chi: 0 | 1): Stato {
  const altro = (1 - chi) as 0 | 1;
  const p: [number, number] = [...st.punti];
  let gioco = false;
  if (p[chi] >= 3 && p[altro] >= 3) {
    if (p[chi] === 4) gioco = true; // aveva il vantaggio
    else if (p[altro] === 4) p[altro] = 3; // vantaggio annullato: ancora parità
    else p[chi] = 4; // vantaggio
  } else if (p[chi] === 3) gioco = true;
  else p[chi]++;
  if (!gioco) return { ...st, punti: p };
  const g: [number, number] = [...st.giochi];
  g[chi]++;
  const setVinto = (g[chi] >= 6 && g[chi] - g[altro] >= 2) || g[chi] === 7;
  return setVinto ? { set: st.set + 1, giochi: [0, 0], punti: [0, 0] } : { set: st.set, giochi: g, punti: [0, 0] };
}

export function WatchPunteggio() {
  const t = useT(T);
  const ora = useOra();
  // Si parte dalla situazione del disegno: set 3, giochi 5-4, 30-15 (dati dimostrativi).
  const [st, setSt] = useState<Stato>({ set: 3, giochi: [5, 4], punti: [2, 1] });
  return (
    <Quadrante etichetta={t.nome}>
      <div style={{ position: "absolute", inset: 0, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#A1A1A6" }}><span>{t.set} {st.set}</span><span>{ora}</span></div>
        <div aria-live="polite" style={{ borderRadius: 16, background: "#0F3D27", padding: "8px 10px", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "4px 8px", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{t.tu}</span>
          <span className={s.disp} style={{ fontSize: 24, fontWeight: 800 }}>{st.giochi[0]}</span>
          <span className={s.disp} style={{ fontSize: 24, fontWeight: 800, color: "#D8F34A" }}>{PUNTI[st.punti[0]]}</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#A1A1A6" }}>{t.avv}</span>
          <span className={s.disp} style={{ fontSize: 24, fontWeight: 800 }}>{st.giochi[1]}</span>
          <span className={s.disp} style={{ fontSize: 24, fontWeight: 800 }}>{PUNTI[st.punti[1]]}</span>
        </div>
        <div className={s.g2} style={{ gap: 6, marginTop: "auto" }}>
          <button type="button" className={s.wBtn} aria-label={t.puntoTu} onClick={() => setSt((x) => segna(x, 0))} style={{ height: 52, borderRadius: 16, background: "#D8F34A", color: "#0B0B0C", fontWeight: 800, fontSize: 15 }}>{t.piuTu}</button>
          <button type="button" className={s.wBtn} aria-label={t.puntoAvv} onClick={() => setSt((x) => segna(x, 1))} style={{ height: 52, borderRadius: 16, background: "#2C2C2E", color: "#F3F6F1", fontWeight: 800, fontSize: 15 }}>{t.piuAvv}</button>
        </div>
      </div>
    </Quadrante>
  );
}
