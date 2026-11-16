"use client";
import { Schermo } from "../Schermo";
import { Testata } from "./Testata";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./atletica.module.css";

const T = {
  it: { kick: "Coordinazione · U10-U12", titolo: "Scaletta", due: "Due dentro", fuori: "Dentro-fuori", sx: "piede sinistro", dx: "piede destro", pass: "passaggi per schema", tempo: "tempo", schema: "Schema dei passi sulla scaletta" },
  en: { kick: "Coordination · U10-U12", titolo: "Ladder", due: "Two in", fuori: "In-out", sx: "left foot", dx: "right foot", pass: "passes per pattern", tempo: "time", schema: "Footstep pattern on the ladder" },
  fr: { kick: "Coordination · U10-U12", titolo: "Échelle", due: "Deux dedans", fuori: "Dedans-dehors", sx: "pied gauche", dx: "pied droit", pass: "passages par schéma", tempo: "temps", schema: "Schéma des pas sur l'échelle" },
  de: { kick: "Koordination · U10-U12", titolo: "Leiter", due: "Zwei rein", fuori: "Rein-raus", sx: "linker Fuß", dx: "rechter Fuß", pass: "Durchgänge je Muster", tempo: "Zeit", schema: "Schrittmuster auf der Leiter" },
  es: { kick: "Coordinación · U10-U12", titolo: "Escalera", due: "Dos dentro", fuori: "Dentro-fuera", sx: "pie izquierdo", dx: "pie derecho", pass: "pasadas por patrón", tempo: "tiempo", schema: "Patrón de pasos en la escalera" },
};
// Posizione dei piedi sulla scaletta: [x del piede sinistro, x del destro], dal basso verso l'alto (7 riquadri).
const DUE_DENTRO: [number, number][] = [[62, 88], [62, 88], [62, 88], [62, 88], [62, 88], [62, 88]];
const DENTRO_FUORI: [number, number][] = [[62, 88], [22, 128], [62, 88], [22, 128], [62, 88], [22, 128]];

function Scala({ passi, label }: { passi: [number, number][]; label: string }) {
  return (
    <svg width="150" height="300" viewBox="0 0 150 300" role="img" aria-label={label} style={{ maxWidth: "100%", height: "auto" }}>
      {[12, 52, 92, 132, 172, 212, 252].map((y) => <rect key={y} x="40" y={y} width="70" height="40" fill="none" stroke="#F3F6F1" strokeWidth="2" />)}
      {passi.map(([sx, dx], i) => (
        <g key={i}>
          <ellipse cx={sx} cy={272 - i * 40} rx="8" ry="12" fill="#FF9F43" />
          <ellipse cx={dx} cy={252 - i * 40} rx="8" ry="12" fill="#3D8BFF" />
        </g>
      ))}
    </svg>
  );
}

export function Scaletta() {
  const t = useT(T);
  return (
    <Schermo tab="atletica">
      <div className={s.r}>
        <Testata kick={t.kick} titolo={t.titolo} indietro={ROTTE.Atletica} />
        <div className={s.g2}>
          <div className={`${s.card} ${s.schema}`}><div style={{ fontWeight: 800 }}>{t.due}</div><Scala passi={DUE_DENTRO} label={`${t.schema}: ${t.due}`} /></div>
          <div className={`${s.card} ${s.schema}`}><div style={{ fontWeight: 800 }}>{t.fuori}</div><Scala passi={DENTRO_FUORI} label={`${t.schema}: ${t.fuori}`} /></div>
        </div>
        <div className={s.legenda}>
          <span><span className={s.dot} style={{ background: "#FF9F43" }} />{t.sx}</span>
          <span><span className={s.dot} style={{ background: "#3D8BFF" }} />{t.dx}</span>
        </div>
        <div className={s.g2}>
          <div className={s.tile}><b>4</b><span>{t.pass}</span></div>
          <div className={s.tile}><b>6&apos;</b><span>{t.tempo}</span></div>
        </div>
      </div>
    </Schermo>
  );
}
