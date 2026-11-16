import type { CSSProperties } from "react";

/** Icone a tratto dei mockup (ref/icone.json + qualche percorso usato nelle schermate di comunicazione). Mai emoji. */
const P: Record<string, string> = {
  back: "M15 6l-6 6 6 6",
  check: "M5 12l5 5 9-10",
  send: "M5 12h14M13 6l6 6-6 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
  clock: "M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0 M12 7v5l3 2",
  moon: "M20 14a8 8 0 11-10-10 6 6 0 0010 10z",
  users: "M9 8m-3.5 0a3.5 3.5 0 107 0a3.5 3.5 0 10-7 0 M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5 M16 4.5a3.5 3.5 0 010 7 M18 15c2 .6 3.2 2.2 3.5 5",
  user: "M12 8m-4 0a4 4 0 108 0a4 4 0 10-8 0 M4 21c1-4 4-6 8-6s7 2 8 6",
  bell: "M6 16V11a6 6 0 0112 0v5l2 2H4z M10 21h4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 018 0v4",
  chat: "M4 5h16v11H8l-4 4z",
  heart: "M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z",
  doc: "M6 3h9l4 4v14H6z M14 3v5h5M9 13h7M9 17h5",
  target: "M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0 M12 12m-5 0a5 5 0 1010 0a5 5 0 10-10 0 M12 12m-1.5 0a1.5 1.5 0 103 0a1.5 1.5 0 10-3 0",
  plane: "M3 12l18-8-7 17-3-7z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  swap: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4",
  alert: "M12 3l10 18H2z M12 10v5M12 18h.01",
  plus: "M12 5v14M5 12h14",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  pen: "M4 20h4L19 9l-4-4L4 16z",
  info: "M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0 M12 11v5M12 8h.01",
  layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5",
  cal: "M3 5h18v16H3z M3 10h18M8 3v4M16 3v4",
  cube: "M4 7l8-4 8 4v10l-8 4-8-4z",
};

export function Ic({ n, size = 16, sw = 2, style }: { n: keyof typeof P | string; size?: number; sw?: number; style?: CSSProperties }) {
  const d = P[n] ?? n; // si può passare anche direttamente un percorso (come nelle notifiche dei mockup)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", ...style }}>
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : "M" + seg} />
      ))}
    </svg>
  );
}
