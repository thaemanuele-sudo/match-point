"use client";
import { useEffect, useRef, useState } from "react";
import type { AnimazioneSchema, ElementoSchema, Keyframe } from "@/lib/types";

/** Posizione di un elemento al tempo t: interpolazione morbida tra i fotogrammi chiave. */
export function posizione(kf: Keyframe[], t: number): { x: number; y: number } {
  if (!kf.length) return { x: 0.5, y: 0.5 };
  const k = [...kf].sort((a, b) => a.t - b.t);
  if (t <= k[0].t) return k[0];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (t <= b.t) {
      const p = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * p);
      return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
    }
  }
  return k[k.length - 1];
}

// campo da doppio visto dall'alto in un riquadro 100 x 200 (unità SVG); fuori campo 8 per lato
const W = 100, H = 200, M = 8;
const px = (x: number) => M + x * (W - 2 * M);
const py = (y: number) => M + y * (H - 2 * M);
const COLORI = { giocatore: "#D8F34A", avversario: "#FF8A6B", palla: "#FFFFFF", cono: "#FF9F0A" } as const;

export type CampoAnimatoProps = {
  animazione: AnimazioneSchema;
  /** riproduzione automatica in loop */
  auto?: boolean;
  /** tempo controllato dall'esterno (editor admin): se presente l'animazione non scorre da sola */
  tempo?: number;
  lingua?: "it" | "en";
  /** id elemento evidenziato (editor) */
  selezionato?: string | null;
  /** clic sul campo con coordinate normalizzate (editor) */
  onPunto?: (x: number, y: number) => void;
  className?: string;
};

/**
 * Campo da tennis in SVG con giocatori, avversari, palla e coni che si muovono secondo lo schema.
 * Usato dall'app (Tattica → Schemi per fascia) e dall'editor degli schemi nel pannello admin.
 */
export function CampoAnimato({ animazione, auto = true, tempo, lingua = "it", selezionato, onPunto, className }: CampoAnimatoProps) {
  const [t, setT] = useState(0);
  const [play, setPlay] = useState(auto);
  const ref = useRef<SVGSVGElement>(null);
  const durata = Math.max(1, animazione.durata || 6);
  const controllato = tempo !== undefined;

  useEffect(() => {
    if (controllato || !play) return;
    let raf = 0, inizio = performance.now() - t * 1000;
    const giro = (ora: number) => {
      // un secondo di pausa alla fine prima di ripartire
      const s = ((ora - inizio) / 1000) % (durata + 1);
      setT(Math.min(s, durata));
      raf = requestAnimationFrame(giro);
    };
    raf = requestAnimationFrame(giro);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, durata, controllato]);

  const ora = controllato ? tempo! : t;
  const nota = [...(animazione.note ?? [])].sort((a, b) => a.t - b.t).filter((n) => n.t <= ora).pop();
  const testoNota = nota ? (lingua === "en" && nota.testo_en ? nota.testo_en : nota.testo_it) : "";

  const clic = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPunto || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W, sy = ((e.clientY - r.top) / r.height) * H;
    onPunto(Math.min(1, Math.max(0, (sx - M) / (W - 2 * M))), Math.min(1, Math.max(0, (sy - M) / (H - 2 * M))));
  };

  const scia = (el: ElementoSchema) => {
    if (el.tipo !== "palla" || el.keyframes.length < 2) return null;
    const punti: string[] = [];
    for (let s = 0; s <= ora; s += durata / 60) { const p = posizione(el.keyframes, s); punti.push(`${px(p.x)},${py(p.y)}`); }
    return <polyline points={punti.join(" ")} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.8" strokeDasharray="2 2" />;
  };

  return (
    <div className={className} style={{ position: "relative" }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", borderRadius: 18, cursor: onPunto ? "crosshair" : "default" }} onClick={clic} role="img" aria-label={lingua === "en" ? "Animated game pattern" : "Schema di gioco animato"}>
        <defs>
          <pattern id="erba" width="12" height="200" patternUnits="userSpaceOnUse"><rect width="6" height="200" fill="#1E6A44" /><rect x="6" width="6" height="200" fill="#24764C" /></pattern>
        </defs>
        <rect width={W} height={H} fill="#174F33" />
        <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} fill="url(#erba)" />
        <g stroke="#fff" strokeWidth="0.7" fill="none" opacity=".9">
          <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} />
          {/* corridoi del singolare: 4.5/36 ft per lato */}
          <line x1={px(0.125)} y1={M} x2={px(0.125)} y2={H - M} />
          <line x1={px(0.875)} y1={M} x2={px(0.875)} y2={H - M} />
          {/* linee del servizio a 18 ft dalla rete su 39 */}
          <line x1={px(0.125)} y1={py(0.5 - 0.2308)} x2={px(0.875)} y2={py(0.5 - 0.2308)} />
          <line x1={px(0.125)} y1={py(0.5 + 0.2308)} x2={px(0.875)} y2={py(0.5 + 0.2308)} />
          <line x1={px(0.5)} y1={py(0.5 - 0.2308)} x2={px(0.5)} y2={py(0.5 + 0.2308)} />
          <line x1={px(0.5)} y1={M} x2={px(0.5)} y2={M + 2} />
          <line x1={px(0.5)} y1={H - M} x2={px(0.5)} y2={H - M - 2} />
        </g>
        <line x1={M - 3} y1={py(0.5)} x2={W - M + 3} y2={py(0.5)} stroke="#F3F6F1" strokeWidth="1.4" />
        {animazione.elementi.map((el) => <g key={el.id + "s"}>{scia(el)}</g>)}
        {animazione.elementi.map((el) => {
          const p = posizione(el.keyframes, ora);
          const c = el.colore || COLORI[el.tipo];
          const sel = selezionato === el.id;
          if (el.tipo === "palla") return <circle key={el.id} cx={px(p.x)} cy={py(p.y)} r={2.2} fill={c === "#FFFFFF" ? "#D8F34A" : c} stroke="#0B0B0C" strokeWidth=".5" />;
          if (el.tipo === "cono") return <path key={el.id} d={`M${px(p.x)} ${py(p.y) - 3}l2.6 5h-5.2z`} fill={c} stroke={sel ? "#fff" : "none"} />;
          return (
            <g key={el.id}>
              <circle cx={px(p.x)} cy={py(p.y)} r={sel ? 5.4 : 4.6} fill={c} stroke={sel ? "#fff" : "#0B0B0C"} strokeWidth={sel ? 1 : 0.6} />
              {el.etichetta && <text x={px(p.x)} y={py(p.y) + 1.6} textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#0B0B0C" fontFamily="system-ui,sans-serif">{el.etichetta.slice(0, 2)}</text>}
            </g>
          );
        })}
      </svg>
      {testoNota && (
        <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, padding: "8px 12px", borderRadius: 12, background: "rgba(0,0,0,.66)", backdropFilter: "blur(12px)", color: "#F3F6F1", fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{testoNota}</div>
      )}
      {!controllato && (
        <button type="button" onClick={() => setPlay((v) => !v)} aria-label={play ? (lingua === "en" ? "Pause" : "Pausa") : (lingua === "en" ? "Play" : "Riproduci")}
          style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: "50%", border: 0, background: "rgba(0,0,0,.6)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
          {play ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
        </button>
      )}
    </div>
  );
}

/** Schema di esempio: servizio esterno e diritto nello spazio. Usato come anteprima quando il database è vuoto. */
export const SCHEMA_ESEMPIO: AnimazioneSchema = {
  durata: 6,
  elementi: [
    { id: "g", tipo: "giocatore", etichetta: "Tu", keyframes: [{ t: 0, x: 0.55, y: 1 }, { t: 1.2, x: 0.6, y: 0.97 }, { t: 3.2, x: 0.42, y: 0.92 }, { t: 6, x: 0.5, y: 0.94 }] },
    { id: "a", tipo: "avversario", etichetta: "A", keyframes: [{ t: 0, x: 0.3, y: 0.02 }, { t: 1.6, x: 0.08, y: 0.06 }, { t: 4.4, x: 0.6, y: 0.05 }, { t: 6, x: 0.72, y: 0.05 }] },
    { id: "p", tipo: "palla", keyframes: [{ t: 0, x: 0.58, y: 1 }, { t: 1.2, x: 0.14, y: 0.27 }, { t: 1.8, x: 0.07, y: 0.07 }, { t: 3.2, x: 0.42, y: 0.9 }, { t: 4.6, x: 0.82, y: 0.08 }, { t: 6, x: 0.86, y: 0.02 }] },
  ],
  note: [
    { t: 0, testo_it: "Servizio esterno: apri il campo", testo_en: "Wide serve: open the court" },
    { t: 3, testo_it: "Diritto nello spazio lasciato libero", testo_en: "Forehand into the open space" },
  ],
};
