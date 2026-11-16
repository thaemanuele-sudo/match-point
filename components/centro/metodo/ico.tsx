import type { ReactNode } from "react";

/** Icone a tratto dei mockup (stessi path di ref/icone.json) più poche utili alle funzioni. */
const P: Record<string, ReactNode> = {
  back: <path d="M15 6l-6 6 6 6" />,
  next: <path d="M9 6l6 6-6 6" />,
  play: <path d="M8 5v14l11-7z" />,
  spark: <path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" />,
  check: <path d="M5 12l5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  video: <><rect x="3" y="6" width="13" height="12" rx="3" /><path d="M16 10l5-3v10l-5-3z" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  unlock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 017.5-2" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5" /><path d="M16 4.5a3.5 3.5 0 010 7M18 15c2 .6 3.2 2.2 3.5 5" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
};

export function Ico({ n, s = 18, w = 2, fill = false }: { n: keyof typeof P | string; s?: number; w?: number; fill?: boolean }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {P[n] ?? null}
    </svg>
  );
}
