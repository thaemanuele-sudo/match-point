/* Icone a tratto dei mockup di ingresso ai centri (le stesse del disegno). */
import type { ReactNode } from "react";
import type { RuoloCentro } from "./comune";

const Svg = ({ size = 22, sw = 2, children }: { size?: number; sw?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const IcoMaestro = ({ size }: { size?: number }) => (
  <Svg size={size}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5" /><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2 .6 3.2 2.2 3.5 5" /></Svg>
);
export const IcoCuore = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" /></Svg>
);
export const IcoGrafico = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
);
export const IcoArea = ({ size }: { size?: number }) => (
  <Svg size={size}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18M12 3v18" /></Svg>
);
export const IcoChiave = ({ size }: { size?: number }) => (
  <Svg size={size}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></Svg>
);
export const IcoSegreteria = ({ size }: { size?: number }) => (
  <Svg size={size}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6M9 15h4" /></Svg>
);
export const IcoPalla = ({ size }: { size?: number }) => (
  <Svg size={size}><circle cx="12" cy="12" r="9" /><path d="M5 6c4 2 10 2 14 0M5 18c4-2 10-2 14 0" /></Svg>
);
export const IcoPiu = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IcoSpunta = ({ size = 14 }: { size?: number }) => (
  <Svg size={size} sw={3}><path d="M5 12l5 5 9-10" /></Svg>
);
export const IcoFrecciaIndietro = ({ size = 16 }: { size?: number }) => (
  <Svg size={size} sw={2.4}><path d="M15 6l-6 6 6 6" /></Svg>
);
export const IcoFrecciaAvanti = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A1A1A6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
export const IcoOrologio = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D8F34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IcoScudo = ({ size = 14, colore = "#D8F34A" }: { size?: number; colore?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IcoMeno = ({ size = 16 }: { size?: number }) => (
  <Svg size={size} sw={2.4}><path d="M5 12h14" /></Svg>
);
export const IcoPiuPiccolo = ({ size = 16 }: { size?: number }) => (
  <Svg size={size} sw={2.4}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IcoCopia = ({ size = 16 }: { size?: number }) => (
  <Svg size={size}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 012-2h9" /></Svg>
);
export const IcoCondividi = ({ size = 16 }: { size?: number }) => (
  <Svg size={size}><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></Svg>
);
export const IcoGruppoCentri = ({ size }: { size?: number }) => (
  <Svg size={size}><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></Svg>
);

/** Colore del tondo e icona di ogni ruolo (i primi quattro sono quelli del mockup P1). */
export const STILE_RUOLO: Record<RuoloCentro, { colore: string; icona: (p: { size?: number }) => ReactNode }> = {
  maestro: { colore: "#2A6C4C", icona: IcoMaestro },
  genitore: { colore: "#3E5D8A", icona: IcoCuore },
  dt: { colore: "#8A3E6C", icona: IcoGrafico },
  responsabile_area: { colore: "#A65A2E", icona: IcoArea },
  titolare: { colore: "#7A3E8A", icona: IcoChiave },
  segreteria: { colore: "#2F6F7A", icona: IcoSegreteria },
  allievo: { colore: "#5B5BA6", icona: IcoPalla },
};
