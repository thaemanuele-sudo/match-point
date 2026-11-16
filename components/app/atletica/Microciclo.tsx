"use client";
import { useEffect, useState } from "react";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Under 14 agonista · proposta AI", titolo: "La settimana", tecnica: "Tecnica", tattica: "Tattica", atletica: "Atletica" },
  en: { kick: "Under 14 competitive · AI proposal", titolo: "The week", tecnica: "Technique", tattica: "Tactics", atletica: "Fitness" },
};
const BLU = "#3D8BFF", ROSSO = "#FF5A5F", LIME = "#D8F34A";
// Dati dimostrativi: [giorno, [[colore, attività]…], etichetta]
const GIORNI: Record<"it" | "en", [string, [string, string][], string][]> = {
  it: [
    ["Lun", [[BLU, "Diritto: apertura e impatto"], [ROSSO, "S1 diagonale"], [LIME, "Coordinazione + footwork"]], "Verifica video"],
    ["Mar", [[BLU, "Servizio: lancio e trophy"], [ROSSO, "S2 servizio + 1"], [LIME, "Forza e core"]], "Carico medio"],
    ["Mer", [[BLU, "Riposo attivo"], [LIME, "Mobilità e prevenzione"]], "Recupero"],
    ["Gio", [[BLU, "Rovescio e back"], [ROSSO, "S3 inside-out"], [LIME, "Velocità e agilità"]], "Retest spider"],
    ["Ven", [[BLU, "Volée e smash"], [ROSSO, "S6 approccio"], [LIME, "Spinta gambe"]], "Carico alto"],
    ["Sab", [[BLU, "Match a punteggio"], [ROSSO, "Combinazioni fisse"], [LIME, "Defaticamento"]], "Analisi match"],
  ],
  en: [
    ["Mon", [[BLU, "Forehand: preparation and contact"], [ROSSO, "S1 crosscourt"], [LIME, "Coordination + footwork"]], "Video check"],
    ["Tue", [[BLU, "Serve: toss and trophy"], [ROSSO, "S2 serve + 1"], [LIME, "Strength and core"]], "Medium load"],
    ["Wed", [[BLU, "Active rest"], [LIME, "Mobility and prevention"]], "Recovery"],
    ["Thu", [[BLU, "Backhand and slice"], [ROSSO, "S3 inside-out"], [LIME, "Speed and agility"]], "Spider retest"],
    ["Fri", [[BLU, "Volley and overhead"], [ROSSO, "S6 approach"], [LIME, "Leg drive"]], "High load"],
    ["Sat", [[BLU, "Scored match"], [ROSSO, "Set combinations"], [LIME, "Cool-down"]], "Match analysis"],
  ],
};

export function Microciclo() {
  const t = useT(T);
  const { lang } = useLang();
  const [oggi, setOggi] = useState(0); // indice del giorno evidenziato (Lun = 0)
  useEffect(() => {
    const d = new Date().getDay(); // 0 = domenica
    setOggi(d >= 1 && d <= 6 ? d - 1 : -1);
  }, []);
  return (
    <Schermo tab="atletica">
      <div className={`${s.r} ${s.stretto7}`}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.Atletica} />
        <div className={s.leg}>
          <span><span className={s.dot} style={{ background: BLU }} />{t.tecnica}</span>
          <span><span className={s.dot} style={{ background: ROSSO }} />{t.tattica}</span>
          <span><span className={s.dot} style={{ background: LIME }} />{t.atletica}</span>
        </div>
        {GIORNI[lang].map(([g, att, tag], i) => (
          <div key={g} className={`${s.li} ${s.giorno}`}>
            <span className={`${s.disp} ${s.gNome} ${i === oggi ? s.oggi : ""}`}>{g}</span>
            <span className={`${s.grow} ${s.gLista}`}>
              {att.map(([c, x]) => <span key={x} className={s.gRiga}><span className={s.dot} style={{ background: c }} />{x}</span>)}
            </span>
            <span className={s.tag} style={{ alignSelf: "center" }}>{tag}</span>
          </div>
        ))}
      </div>
    </Schermo>
  );
}
