"use client";
import Link from "next/link";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { useT } from "@/lib/i18n/lingua";
import { ICONE, type IconaNome } from "./icone";

const T = {
  it: { carico: "Caricamento…", riprova: "Riprova", chiudi: "Chiudi", errore: "Qualcosa non ha funzionato" },
  en: { carico: "Caricamento…", riprova: "Riprova", chiudi: "Chiudi", errore: "Qualcosa non ha funzionato" },
};

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Icona del mockup per nome (SVG a tratto, mai emoji). Decorativa se non ha `etichetta`. */
export function Ico({ nome, size = 20, className, etichetta, tratto = 2 }: { nome: IconaNome; size?: number; className?: string; etichetta?: string; tratto?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tratto} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden={etichetta ? undefined : true} aria-label={etichetta} role={etichetta ? "img" : undefined}
      dangerouslySetInnerHTML={{ __html: ICONE[nome] }} />
  );
}

type Cliccabile = { href?: string; onClick?: () => void };

/** Contenitore `.card`. `pad` aggiunge il padding di 14px. Con href o onClick diventa un link o un bottone. */
export function Card({ children, pad = true, className, style, href, onClick }: { children: ReactNode; pad?: boolean; className?: string; style?: CSSProperties } & Cliccabile) {
  const c = cx("card", pad && "pad", (href || onClick) && "cliccabile", className);
  if (href) return <Link href={href} className={c} style={style}>{children}</Link>;
  if (onClick) return <button type="button" className={c} style={style} onClick={onClick}>{children}</button>;
  return <div className={c} style={style}>{children}</div>;
}

/** Pillola di filtro. `on` = scelta. Con href è un link. */
export function Chip({ children, on, onClick, href, ariaLabel }: { children: ReactNode; on?: boolean; ariaLabel?: string } & Cliccabile) {
  const c = cx("chip", on && "on");
  if (href) return <Link href={href} className={c} aria-label={ariaLabel}>{children}</Link>;
  return <button type="button" className={c} onClick={onClick} aria-pressed={on === undefined ? undefined : on} aria-label={ariaLabel}>{children}</button>;
}

export function Chips({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("chips", className)}>{children}</div>;
}

/** Segmented control (`.seg`): sceglie un valore tra pochi. Le colonne sono tante quante le voci. */
export function Seg<V extends string>({ valori, valore, onChange, ariaLabel }: { valori: { id: V; etichetta: ReactNode }[]; valore: V; onChange: (v: V) => void; ariaLabel?: string }) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel} style={{ gridTemplateColumns: `repeat(${valori.length},minmax(0,1fr))` }}>
      {valori.map((v) => (
        <button key={v.id} type="button" className={cx("sg", v.id === valore && "on")} aria-pressed={v.id === valore} onClick={() => onChange(v.id)}>{v.etichetta}</button>
      ))}
    </div>
  );
}

/** Bottone. `variante`: primario (giallo, 52px), secondario (`.btn2`, grigio), fantasma (trasparente). Con href è un link. */
export function Btn({ children, variante = "primario", onClick, href, type = "button", disabled, piccolo, icona, ariaLabel, className, pieno = true }: {
  children?: ReactNode; variante?: "primario" | "secondario" | "fantasma"; type?: "button" | "submit"; disabled?: boolean; piccolo?: boolean;
  icona?: IconaNome; ariaLabel?: string; className?: string; pieno?: boolean;
} & Cliccabile) {
  const c = cx(variante === "primario" ? "btn" : variante === "secondario" ? "btn2" : "btn2 fantasma", piccolo && "piccolo", !pieno && "auto", className);
  const dentro = <>{icona && <Ico nome={icona} size={piccolo ? 16 : 20} />}{children}</>;
  if (href && !disabled) return <Link href={href} className={c} aria-label={ariaLabel}>{dentro}</Link>;
  return <button type={type} className={c} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{dentro}</button>;
}

/** Etichettina (`.tag`). `colore` facoltativo per stati (es. var(--brand)). */
export function Tag({ children, colore, sfondo }: { children: ReactNode; colore?: string; sfondo?: string }) {
  return <span className="tag" style={colore || sfondo ? { color: colore, background: sfondo } : undefined}>{children}</span>;
}

/** Numero grande Barlow Condensed (come `.big` e `.tile b`). */
export function Num({ valore, unita, etichetta, colore, grande = false }: { valore: ReactNode; unita?: ReactNode; etichetta?: ReactNode; colore?: string; grande?: boolean }) {
  return (
    <span className="mc-num">
      <span className={grande ? "big" : "mc-num-v"} style={colore ? { color: colore } : undefined}>{valore}{unita && <small>{unita}</small>}</span>
      {etichetta && <span className="mc-num-e">{etichetta}</span>}
    </span>
  );
}

/** Riquadro con numero e didascalia (`.tile`), per le righe di numeri delle panoramiche. */
export function Tile({ valore, etichetta, colore }: { valore: ReactNode; etichetta: ReactNode; colore?: string }) {
  return <div className="tile"><b style={colore ? { color: colore } : undefined}>{valore}</b><span>{etichetta}</span></div>;
}

/** Barra di avanzamento (`.bar`), pct da 0 a 100. */
export function Barra({ pct, colore, etichetta }: { pct: number; colore?: string; etichetta?: string }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={etichetta}>
      <i style={{ width: `${v}%`, background: colore ?? "var(--brand)" }} />
    </div>
  );
}

/** Cerchio con le iniziali. Il colore di sfondo dipende dal nome, così la stessa persona ha sempre lo stesso. */
const SFONDI = ["#2C2C2E", "#1E6A44", "#3A3A5C", "#5C3A3A", "#3A5C58", "#5C543A"];
export function Avatar({ nome, cognome, size = 38 }: { nome: string; cognome?: string | null; size?: number }) {
  const ini = ((nome?.[0] ?? "") + (cognome?.[0] ?? (nome?.split(" ")[1]?.[0] ?? ""))).toUpperCase() || "?";
  let h = 0;
  for (const ch of `${nome}${cognome ?? ""}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span className="mc-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: SFONDI[h % SFONDI.length] }}>{ini}</span>
  );
}

/** Titolo di sezione (`.sec`) con azione facoltativa a destra. */
export function Sezione({ titolo, azione }: { titolo: ReactNode; azione?: ReactNode }) {
  return <div className="sec"><h2>{titolo}</h2>{azione}</div>;
}

/** Nota piccola su fondo scuro (`.note`). */
export function Nota({ children, icona }: { children: ReactNode; icona?: IconaNome }) {
  return <div className="note">{icona && <Ico nome={icona} size={16} className="mc-nota-ico" />}<span>{children}</span></div>;
}

/** Colonna di righe (`.li`) con spazio fra l'una e l'altra. */
export function Lista({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mc-lista", className)}>{children}</div>;
}

/** Riga di lista (`.li`): icona o avatar a sinistra, titolo e sottotitolo, contenuto a destra. Link o bottone se ha href/onClick. */
export function Riga({ titolo, sotto, icona, avatar, destra, href, onClick, chevron }: {
  titolo: ReactNode; sotto?: ReactNode; icona?: IconaNome; avatar?: { nome: string; cognome?: string | null }; destra?: ReactNode; chevron?: boolean;
} & Cliccabile) {
  const corpo = (
    <>
      {avatar ? <Avatar nome={avatar.nome} cognome={avatar.cognome} /> : icona ? <span className="ic"><Ico nome={icona} size={20} /></span> : null}
      <div className="grow"><div className="t">{titolo}</div>{sotto && <div className="s">{sotto}</div>}</div>
      {destra}
      {(chevron ?? !!href) && <Ico nome="next" size={16} className="mc-chev" />}
    </>
  );
  if (href) return <Link href={href} className="li">{corpo}</Link>;
  if (onClick) return <button type="button" className="li" onClick={onClick}>{corpo}</button>;
  return <div className="li">{corpo}</div>;
}

/** Griglia che sul telefono resta a `mobile` colonne e sopra 900px passa a `desktop` (dashboard del centro). */
export function Griglia({ children, mobile = 1, desktop = 2, className }: { children: ReactNode; mobile?: 1 | 2; desktop?: 2 | 3 | 4; className?: string }) {
  return <div className={cx("mc-griglia", `m${mobile}`, `d${desktop}`, className)}>{children}</div>;
}

/** Stato vuoto: nessun dato (mai inventare numeri). */
export function Vuoto({ titolo, testo, icona = "doc", azione }: { titolo: ReactNode; testo?: ReactNode; icona?: IconaNome; azione?: ReactNode }) {
  return (
    <div className="mc-vuoto">
      <span className="ic"><Ico nome={icona} size={22} /></span>
      <div className="t">{titolo}</div>
      {testo && <div className="s">{testo}</div>}
      {azione}
    </div>
  );
}

export function Caricamento({ righe = 3 }: { righe?: number }) {
  const t = useT(T);
  return (
    <div className="mc-carico" role="status" aria-live="polite" aria-label={t.carico}>
      {Array.from({ length: righe }, (_, i) => <div key={i} className="mc-scheletro" />)}
    </div>
  );
}

export function Errore({ messaggio, onRiprova }: { messaggio?: string | null; onRiprova?: () => void }) {
  const t = useT(T);
  return (
    <div className="mc-errore" role="alert">
      <Ico nome="x" size={18} />
      <div className="grow">{t.errore}{messaggio ? <div className="s">{messaggio}</div> : null}</div>
      {onRiprova && <button type="button" className="chip on" onClick={onRiprova}>{t.riprova}</button>}
    </div>
  );
}

/** Interruttore (permessi, impostazioni, consensi). Usa role="switch". */
export function Interruttore({ valore, onChange, etichetta, descrizione, disabled }: { valore: boolean; onChange: (v: boolean) => void; etichetta: ReactNode; descrizione?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="mc-sw-riga">
      <div className="grow"><div className="t" id={id}>{etichetta}</div>{descrizione && <div className="s">{descrizione}</div>}</div>
      <button type="button" role="switch" aria-checked={valore} aria-labelledby={id} disabled={disabled} className={cx("mc-sw", valore && "on")} onClick={() => onChange(!valore)}><i /></button>
    </div>
  );
}

/** Campo con etichetta: testo, numero, data, ora, area di testo o menu a tendina (se passi `opzioni`). */
export function Campo({ etichetta, valore, onChange, tipo = "text", multiriga, righe = 3, placeholder, aiuto, errore, opzioni, disabled, maxLength, required, id: idEsterno }: {
  etichetta: ReactNode; valore: string; onChange: (v: string) => void; tipo?: "text" | "email" | "tel" | "number" | "date" | "time" | "password";
  multiriga?: boolean; righe?: number; placeholder?: string; aiuto?: ReactNode; errore?: string | null; opzioni?: { valore: string; etichetta: string }[];
  disabled?: boolean; maxLength?: number; required?: boolean; id?: string;
}) {
  const auto = useId();
  const id = idEsterno ?? auto;
  const comuni = { id, disabled, required, "aria-invalid": errore ? true : undefined, "aria-describedby": aiuto || errore ? `${id}-a` : undefined } as const;
  return (
    <div className="mc-campo">
      <label htmlFor={id} className="k">{etichetta}</label>
      {opzioni ? (
        <select {...comuni} className="mc-input" value={valore} onChange={(e) => onChange(e.target.value)}>
          {opzioni.map((o) => <option key={o.valore} value={o.valore}>{o.etichetta}</option>)}
        </select>
      ) : multiriga ? (
        <textarea {...comuni} className="mc-input" rows={righe} value={valore} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...comuni} className="mc-input" type={tipo} value={valore} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      )}
      {(aiuto || errore) && <div id={`${id}-a`} className={cx("s", errore && "mc-err")}>{errore ?? aiuto}</div>}
    </div>
  );
}

/** Pannello dal basso (sul computer diventa una finestra al centro). Si chiude con Esc, tocco fuori o il bottone. */
export function Foglio({ aperto, onChiudi, titolo, children }: { aperto: boolean; onChiudi: () => void; titolo?: ReactNode; children: ReactNode }) {
  const t = useT(T);
  const ref = useRef<HTMLDivElement>(null);
  const titoloId = useId();
  useEffect(() => {
    if (!aperto) return;
    const prima = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const tasto = (e: KeyboardEvent) => { if (e.key === "Escape") onChiudi(); };
    document.addEventListener("keydown", tasto);
    return () => { document.removeEventListener("keydown", tasto); prima?.focus?.(); };
  }, [aperto, onChiudi]);
  if (!aperto) return null;
  return (
    <div className="mc-foglio-fondo" onClick={onChiudi}>
      <div ref={ref} tabIndex={-1} className="mc-foglio" role="dialog" aria-modal="true" aria-labelledby={titolo ? titoloId : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="mc-foglio-testa">
          {titolo && <h2 id={titoloId}>{titolo}</h2>}
          <button type="button" className="icon" aria-label={t.chiudi} onClick={onChiudi}><Ico nome="x" size={18} /></button>
        </div>
        <div className="mc-foglio-corpo">{children}</div>
      </div>
    </div>
  );
}
