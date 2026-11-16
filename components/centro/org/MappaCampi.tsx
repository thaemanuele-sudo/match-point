"use client";
// Mappa dei campi disegnata dall'alto: linee vere del campo da tennis, colore per superficie, copertura, luci e manutenzione.
import { useT } from "@/lib/i18n/lingua";
import { sostituisci } from "./dati";
import type { CampoR, Superficie } from "./tipi";
import "./org.css";

const IT = {
  mappa: "Mappa dall'alto dei campi del centro", pallone: "pallone", scoperto: "scoperto", coperto: "coperto", manutenzione: "MANUTENZIONE", chiuso: "CHIUSO",
  lPallone: "Pallone", lTetto: "Tetto fisso", lLuci: "Luci", lManut: "Manutenzione", etichetta: "Campo {n}, {s}, {c}", conLuci: "con luci", senzaLuci: "senza luci",
  terra: "terra rossa", cemento: "cemento", sintetico: "sintetico", erba: "erba",
};
const T = { it: IT, en: { ...IT } };

export const COLORI_FONDO: Record<Superficie, { bordo: string; campo: string }> = {
  terra: { bordo: "#8F3F22", campo: "#C4623A" },
  cemento: { bordo: "#23527F", campo: "#2F6FB5" },
  sintetico: { bordo: "#2C7345", campo: "#3F9B5E" },
  erba: { bordo: "#2E6B2E", campo: "#3E8F3E" },
};
const W = 340;

type Rett = { x: number; y: number; w: number; h: number };
/** Posizioni dal database (0-100) se valide per tutti; altrimenti una griglia a due colonne. */
export function rettangoli(campi: CampoR[]): { r: Map<string, Rett>; h: number } {
  const valide = campi.length > 0 && campi.every((c) => [c.x, c.y, c.w, c.h].every((v) => typeof v === "number") && (c.w as number) > 0 && (c.h as number) > 0 && (c.x as number) + (c.w as number) <= 100.5 && (c.y as number) + (c.h as number) <= 100.5);
  const r = new Map<string, Rett>();
  if (valide) {
    campi.forEach((c) => r.set(c.id, { x: ((c.x as number) / 100) * W, y: ((c.y as number) / 100) * 236, w: ((c.w as number) / 100) * W, h: ((c.h as number) / 100) * 236 }));
    return { r, h: 236 };
  }
  campi.forEach((c, i) => r.set(c.id, { x: 7 + (i % 2) * 167, y: 18 + Math.floor(i / 2) * 114, w: 160, h: 96 }));
  return { r, h: 18 + Math.ceil(campi.length / 2) * 114 };
}

const isMini = (c: CampoR) => c.superficie === "sintetico" || /mini/i.test(c.nome ?? "");

function Linee({ w, h }: { w: number; h: number }) {
  // proporzioni del campo vero: corridoi 8.2/65.8, linee di servizio a 32.9/142.6 dalle linee di fondo
  const a = (h * 8.2) / 65.8, b = (h * 57.6) / 65.8, s1 = (w * 32.9) / 142.6, s2 = (w * 109.7) / 142.6;
  return (
    <g fill="none" stroke="#F3F6F1" strokeWidth={1.3}>
      <rect x={0} y={0} width={w} height={h} />
      <path d={`M0 ${a}H${w}M0 ${b}H${w}M${s1} ${a}V${b}M${s2} ${a}V${b}M${s1} ${h / 2}H${s2}`} />
      <path d={`M${w / 2} -3V${h + 3}`} strokeWidth={2} strokeDasharray="2 1.5" />
    </g>
  );
}

export function MappaCampi({ campi, selezionato, onSeleziona, inManut }: { campi: CampoR[]; selezionato: string | null; onSeleziona: (id: string) => void; inManut: Set<string> }) {
  const t = useT(T);
  const { r, h } = rettangoli(campi);
  return (
    <div className="card og-mappa">
      <svg viewBox={`0 0 ${W + 1} ${h}`} role="group" aria-label={t.mappa}>
        <defs>
          <pattern id="og-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="9" fill="#FFD54A" fillOpacity="0.6" /></pattern>
        </defs>
        {campi.map((c) => {
          const p = r.get(c.id) as Rett;
          const col = COLORI_FONDO[c.superficie] ?? COLORI_FONDO.terra;
          const sel = c.id === selezionato;
          const manut = inManut.has(c.id) || c.stato !== "disponibile";
          const mini = isMini(c) && c.superficie === "sintetico";
          const ix = p.w * 0.054, iy = p.h * 0.156, cw = p.w - 2 * ix, ch = p.h - 2 * iy;
          const luci: [number, number][] = mini ? [[8, p.h / 2], [p.w - 8, p.h / 2]] : [[8, 8], [p.w - 8, 8], [8, p.h - 8], [p.w - 8, p.h - 8]];
          const copLabel = c.copertura === "pallone" ? t.pallone : c.copertura === "coperto" ? t.coperto : t.scoperto;
          const nome = c.nome && !/^campo\s*\d+$/i.test(c.nome) ? ` · ${c.nome}` : "";
          const vai = () => onSeleziona(c.id);
          return (
            <g key={c.id} role="button" tabIndex={0} aria-pressed={sel} onClick={vai} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); vai(); } }}
              aria-label={sostituisci(t.etichetta, { n: c.numero, s: t[c.superficie], c: copLabel }) + `, ${c.luci ? t.conLuci : t.senzaLuci}`}>
              <g transform={`translate(${p.x} ${p.y})`}>
                <rect width={p.w} height={p.h} rx={10} fill={col.bordo} />
                {mini ? (
                  <>
                    {[0.073, 0.52].map((f) => (
                      <g key={f} transform={`translate(${p.w * 0.1625} ${p.h * f})`}>
                        <rect width={p.w * 0.675} height={p.h * 0.406} fill={col.campo} />
                        <g fill="none" stroke="#F3F6F1" strokeWidth={1.3}>
                          <rect width={p.w * 0.675} height={p.h * 0.406} />
                          <path d={`M${p.w * 0.2} 0V${p.h * 0.406}M${p.w * 0.475} 0V${p.h * 0.406}M${p.w * 0.2} ${p.h * 0.203}H${p.w * 0.475}`} />
                          <path d={`M${p.w * 0.3375} -2V${p.h * 0.406 + 2}`} strokeWidth={2} strokeDasharray="2 1.5" />
                        </g>
                      </g>
                    ))}
                  </>
                ) : (
                  <>
                    <rect x={ix} y={iy} width={cw} height={ch} fill={col.campo} />
                    <g transform={`translate(${ix} ${iy})`}><Linee w={cw} h={ch} /></g>
                  </>
                )}
                {c.copertura === "pallone" && <rect x={2} y={2} width={p.w - 4} height={p.h - 4} rx={8} fill="#FFFFFF" fillOpacity={0.07} stroke="#F3F6F1" strokeWidth={1.6} strokeDasharray="5 3" />}
                {c.copertura === "coperto" && <rect x={2.5} y={2.5} width={p.w - 5} height={p.h - 5} rx={8} fill="#000" fillOpacity={0.14} stroke="#9FC4F5" strokeWidth={2.4} />}
                {c.luci && luci.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={2.6} fill="#FFE27A" />)}
                {manut && (
                  <>
                    <rect x={ix} y={iy} width={cw} height={ch} fill="url(#og-hatch)" />
                    <rect x={p.w / 2 - 54} y={p.h / 2 - 10} width={108} height={20} rx={6} fill="#0B0B0C" fillOpacity={0.9} />
                    <text x={p.w / 2} y={p.h / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#FFD54A">{c.stato === "chiuso" ? t.chiuso : t.manutenzione}</text>
                  </>
                )}
              </g>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={10} fill="none" strokeWidth={3} stroke={sel ? "#D8F34A" : "transparent"} />
              <text x={p.x + 2} y={p.y - 6} fontSize={11.5} fontWeight={800} fill={sel ? "#D8F34A" : "#F3F6F1"}>{c.numero}{nome}</text>
              <text x={p.x + p.w - 2} y={p.y - 6} textAnchor="end" fontSize={11} fontWeight={700} fill="#A1A1A6">{copLabel}</text>
            </g>
          );
        })}
      </svg>
      <div className="og-legenda">
        <span><svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true"><rect x="1" y="1" width="14" height="8" rx="2" fill="none" stroke="#F3F6F1" strokeWidth="1.4" strokeDasharray="3 2" /></svg>{t.lPallone}</span>
        <span><svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true"><rect x="1" y="1" width="14" height="8" rx="2" fill="none" stroke="#9FC4F5" strokeWidth="2" /></svg>{t.lTetto}</span>
        <span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3" fill="#FFE27A" /></svg>{t.lLuci}</span>
        <span><svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true"><path d="M0 8L8 0M4 10L12 2" stroke="#FFD54A" strokeWidth="2" /></svg>{t.lManut}</span>
      </div>
    </div>
  );
}
