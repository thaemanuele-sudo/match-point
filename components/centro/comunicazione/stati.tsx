import type { ReactNode } from "react";

/** Stati vuoti, di caricamento e di errore: piccoli e uguali per tutte le schermate dell'area F2. */
export function Caric({ testo }: { testo: string }) {
  return (
    <div className="cm-stato" role="status">
      {testo}
    </div>
  );
}
export function VuotoC({ children }: { children: ReactNode }) {
  return <div className="cm-stato">{children}</div>;
}
export function ErroreC({ testo }: { testo: string | null }) {
  return testo ? (
    <div className="cm-err" role="alert">
      {testo}
    </div>
  ) : null;
}
export function Interr({ on, onChange, label, disabled }: { on: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className="cm-sw" onClick={() => onChange?.(!on)}>
      <i />
    </button>
  );
}
