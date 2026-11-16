"use client";
/*
 * Pezzi condivisi dell'admin (solo italiano, niente dizionari): icone, formati, dialogo di conferma,
 * campi del modulo, caricamento file su Supabase Storage.
 * L'accesso vero è protetto nel database: qui si mostra solo ciò che il database lascia fare.
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FASCE, type Fascia } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

// ---------- contesto: client e avvisi ----------
type Ctx = { sb: SupabaseClient; avvisa: (t: string) => void };
export const AdminCtx = createContext<Ctx | null>(null);
export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("AdminCtx mancante");
  return c;
}

/** Messaggio leggibile da un errore Supabase/JS. */
export function errMsg(e: unknown): string {
  const x = e as { message?: string; code?: string } | null;
  if (x?.code === "42501") return "Permesso negato: serve un account admin.";
  return x?.message ? x.message : "Qualcosa non ha funzionato. Riprova.";
}

// ---------- formati ----------
const nf = (d: number) => new Intl.NumberFormat("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
export const intero = (n: number) => new Intl.NumberFormat("it-IT").format(Math.round(n || 0));
/** USD con 4 decimali sotto 1 dollaro, 2 sopra. */
export function usd(v: number) {
  const x = Number(v) || 0;
  return "$" + nf(Math.abs(x) < 1 ? 4 : 2).format(x);
}
export const data = (s: string | null | undefined, ora = false) =>
  s ? new Date(s).toLocaleString("it-IT", { day: "numeric", month: "short", year: "numeric", ...(ora ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";
export function mmss(sec: number | null | undefined) {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function iniziali(nome: string, cognome: string) {
  return ((nome[0] || "") + (cognome[0] || "")).toUpperCase() || "?";
}
const COLORI_AVATAR = ["#D8F34A", "#0A84FF", "#30B653", "#AF52DE", "#FF2D55", "#30B0C7", "#5856D6", "#FF9500"];
export function coloreAvatar(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORI_AVATAR[h % COLORI_AVATAR.length];
}

// ---------- icone (tratto, stile SF Symbols) ----------
export function Ico({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
export const I = {
  persone: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20|M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35|M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  dollaro: "M12 3v18|M16.5 7.5C16 6 14.3 5 12 5S8 6.2 8 8c0 4 8 2 8 6 0 1.8-1.8 3-4 3s-4-1-4.5-2.5",
  grafico: "M4 20V10|M10 20V4|M16 20v-7|M22 20H2",
  luna: "M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z",
  sole: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z|M12 1v2|M12 21v2|M4.2 4.2l1.4 1.4|M18.4 18.4l1.4 1.4|M1 12h2|M21 12h2|M4.2 19.8l1.4-1.4|M18.4 5.6l1.4-1.4",
  cerca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M20 20l-3.5-3.5",
  esci: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9",
  avanti: "M9 5l7 7-7 7",
  indietro: "M15 5l-7 7 7 7",
  piu: "M12 5v14|M5 12h14",
  cestino: "M4 7h16|M10 11v6|M14 11v6|M6 7l1 13h10l1-13|M9 7V4h6v3",
  matita: "M4 20h4L19 9l-4-4L4 16z|M13.5 6.5l4 4",
  play: "M8 5v14l11-7z",
  avviso: "M12 9v4|M12 17h.01|M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  freccia: "M5 12h14|M13 6l6 6-6 6",
  scarica: "M12 3v12|M7 11l5 5 5-5|M5 21h14",
  film: "M4 5h16v14H4z|M4 9h16|M4 15h16|M8 5v14|M16 5v14",
};
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <span className="db-logo" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="8" stroke="#1A2000" /><path d="M5 8c4 1 10 1 14 0" stroke="#1A2000" /><path d="M5 16c4-1 10-1 14 0" stroke="#1A2000" /></svg>
    </span>
  );
}
export function Tile({ colore, icona, lab, val, sub }: { colore: string; icona: string; lab: string; val: string; sub?: string }) {
  return (
    <div className="db-tile" style={{ ["--t" as string]: colore }}>
      <span className="db-tile-ico"><Ico d={icona} size={18} /></span>
      <span className="db-tile-lab">{lab}</span>
      <span className="db-tile-val">{val}</span>
      {sub && <span className="db-tile-sub">{sub}</span>}
    </div>
  );
}

// ---------- dialogo di conferma (al posto di window.confirm) ----------
export function Conferma({ titolo, testo, azione = "Elimina", occupato, onSi, onNo }: {
  titolo: string; testo: string; azione?: string; occupato?: boolean; onSi: () => void; onNo: () => void;
}) {
  const no = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    no.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !occupato) onNo(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onNo, occupato]);
  return (
    <div className="db-dialogo-sfondo" onClick={() => { if (!occupato) onNo(); }}>
      <div className="db-dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-p" onClick={(e) => e.stopPropagation()}>
        <h3 id="dlg-t">{titolo}</h3>
        <p id="dlg-p">{testo}</p>
        <div className="bt">
          <button type="button" className="db-btn2 pericolo" onClick={onSi} disabled={occupato}>{occupato ? "Attendi…" : azione}</button>
          <button type="button" ref={no} className="db-btn2" onClick={onNo} disabled={occupato}>Annulla</button>
        </div>
      </div>
    </div>
  );
}

// ---------- campi ----------
export function Campo({ lab, nota, intera, children }: { lab: string; nota?: string; intera?: boolean; children: React.ReactNode }) {
  return (
    <label className={"db-campo" + (intera ? " intera" : "")}>
      <span>{lab}</span>
      {children}
      {nota && <small>{nota}</small>}
    </label>
  );
}
export function Fasce({ valore, onChange }: { valore: Fascia[]; onChange: (f: Fascia[]) => void }) {
  return (
    <div className="db-campo intera">
      <span>Fasce d&apos;età</span>
      <div className="db-chipset" role="group" aria-label="Fasce d'età">
        {FASCE.map((f) => (
          <button key={f} type="button" className="db-chip" aria-pressed={valore.includes(f)}
            onClick={() => onChange(valore.includes(f) ? valore.filter((x) => x !== f) : [...valore, f])}>{f}</button>
        ))}
      </div>
    </div>
  );
}
export function Interruttore({ valore, onChange, lab }: { valore: boolean; onChange: (v: boolean) => void; lab: string }) {
  return (
    <label className="db-interr">
      <input type="checkbox" checked={valore} onChange={(e) => onChange(e.target.checked)} /> {lab}
    </label>
  );
}
export const Errore = ({ testo }: { testo: string | null }) => (testo ? <div className="db-errore" role="alert">{testo}</div> : null);

// ---------- caricamento file nel bucket "contenuti" ----------
/** Nome sicuro: cartella/uuid.estensione (niente nomi dell'utente nel percorso). */
export function nomeSicuro(cartella: string, file: File) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  return `${cartella}/${crypto.randomUUID()}.${ext}`;
}
/**
 * Carica un file con la chiamata REST di Storage (come fa l'SDK) per avere l'avanzamento reale:
 * l'SDK non espone la percentuale. Usa la sessione dell'admin, quindi vale la regola del database.
 */
export async function caricaContenuto(sb: SupabaseClient, file: File, cartella: string, onProgress?: (p: number) => void): Promise<string> {
  const path = nomeSicuro(cartella, file);
  const { data: s } = await sb.auth.getSession();
  const token = s.session?.access_token;
  if (!token) throw new Error("Sessione scaduta: esci e rientra.");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  await new Promise<void>((ok, ko) => {
    const x = new XMLHttpRequest();
    x.open("POST", `${base}/storage/v1/object/contenuti/${path}`);
    x.setRequestHeader("Authorization", `Bearer ${token}`);
    x.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    x.setRequestHeader("x-upsert", "false");
    x.setRequestHeader("cache-control", "max-age=31536000");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) return ok();
      let m = `Caricamento non riuscito (${x.status}).`;
      try { m = JSON.parse(x.responseText).message || m; } catch { /* risposta non JSON */ }
      ko(new Error(x.status === 413 ? "File troppo grande per il limite del bucket Supabase." : m));
    };
    x.onerror = () => ko(new Error("Connessione interrotta durante il caricamento."));
    const f = new FormData();
    f.append("cacheControl", "31536000");
    f.append("", file, file.name);
    x.send(f);
  });
  return path;
}
/** Cancella file dal bucket senza bloccare l'operazione se fallisce (file orfano = solo spazio). */
export async function rimuoviContenuti(sb: SupabaseClient, paths: (string | null | undefined)[]) {
  const p = paths.filter((x): x is string => !!x && !/^https?:/.test(x));
  if (p.length) await sb.storage.from("contenuti").remove(p).catch(() => undefined);
}

/** Campo per scegliere e caricare un file (video o immagine) con barra di avanzamento e anteprima. */
export function CaricaFile({ lab, tipo, cartella, path, maxMB, onCaricato, onRimosso, onFile, urlPubblico }: {
  lab: string; tipo: "video" | "immagine"; cartella: string; path: string | null; maxMB: number;
  onCaricato: (path: string) => void; onRimosso: () => void; onFile?: (f: File) => void;
  urlPubblico: (p: string | null) => string | null;
}) {
  const { sb } = useAdmin();
  const [prog, setProg] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const url = urlPubblico(path);
  const ammessi = tipo === "video" ? ["video/mp4", "video/quicktime", "video/webm"] : ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const scegli = async (f: File | undefined) => {
    if (!f) return;
    setErr(null);
    const okTipo = ammessi.includes(f.type) || (tipo === "video" && /\.(mp4|mov|webm)$/i.test(f.name));
    if (!okTipo) return setErr(tipo === "video" ? "Formato non valido: usa mp4, mov o webm." : "Formato non valido: usa jpg, png o webp.");
    if (f.size > maxMB * 1024 * 1024) return setErr(`File troppo grande: massimo ${maxMB} MB.`);
    onFile?.(f);
    setProg(0);
    try {
      onCaricato(await caricaContenuto(sb, f, cartella, setProg));
    } catch (e) { setErr(errMsg(e)); }
    setProg(null);
  };
  return (
    <div className="db-campo intera">
      <span>{lab}</span>
      {url && prog === null && (tipo === "video"
        // eslint-disable-next-line jsx-a11y/media-has-caption
        ? <video className="db-video" src={url} controls preload="metadata" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img className="db-anteprima" src={url} alt="Anteprima copertina" />)}
      {prog !== null && (
        <div role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Caricamento in corso">
          <div className="db-prog"><span style={{ width: `${Math.round(prog * 100)}%` }} /></div>
          <small>In caricamento… {Math.round(prog * 100)}%</small>
        </div>
      )}
      <div className="db-sottoazioni" style={{ padding: 0 }}>
        <label className="db-btn2 piccolo" style={{ cursor: "pointer" }}>
          {path ? "Sostituisci" : "Scegli file"}
          <input type="file" hidden accept={ammessi.join(",") + (tipo === "video" ? ",.mp4,.mov,.webm" : "")} disabled={prog !== null}
            onChange={(e) => { void scegli(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {path && prog === null && <button type="button" className="db-btn2 piccolo pericolo" onClick={onRimosso}>Rimuovi</button>}
      </div>
      <Errore testo={err} />
    </div>
  );
}

/** Legge la durata (secondi) di un file video con un <video> nascosto. */
export function durataVideo(file: File): Promise<number | null> {
  return new Promise((ok) => {
    const v = document.createElement("video");
    const u = URL.createObjectURL(file);
    const fine = (r: number | null) => { URL.revokeObjectURL(u); ok(r); };
    v.preload = "metadata";
    v.onloadedmetadata = () => fine(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
    v.onerror = () => fine(null);
    v.src = u;
  });
}

/** Piccolo hook per le liste caricate da una tabella. */
export function useClient() { return supabaseBrowser(); }
