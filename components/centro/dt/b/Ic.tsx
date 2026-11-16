import { ICONE, type IconaNome } from "../../icone";

/** Icona a tratto dei mockup (stesso tracciato di ref/icone.json). Decorativa: il significato sta nel testo accanto. */
export function Ic({ n, s = 20, w = 2 }: { n: IconaNome; s?: number; w?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONE[n] }} />
  );
}
