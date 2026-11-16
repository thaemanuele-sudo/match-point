// Pallina gialla del marchio: stesso disegno di public/icona.svg (cerchio giallo con due archi bianchi), senza lo sfondo scuro.
export function Pallina({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="72 72 368 368" aria-hidden="true" focusable="false">
      <circle cx="256" cy="256" r="168" fill="#D8F34A" />
      <path d="M120 150c64 52 64 160 0 212M392 150c-64 52-64 160 0 212" fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" />
    </svg>
  );
}
