// Utilità condivise dalle tre schermate dei pagamenti (C16, C17, G8).
// Gli importi stanno sempre in centesimi; si trasformano in euro solo per mostrarli.

export type Cadenza = "M" | "T" | "A";
export type StatoQuota = "attesa" | "pagata" | "scaduta";
export type MetodoQuota = "carta" | "segreteria" | "bonifico";

export type Corso = {
  id: string;
  centro_id: string;
  nome: string;
  gruppo_id: string | null;
  quota_cent: number | null;
  sconto_fratelli_pct: number | null;
  rate: number | null;
  scadenze: unknown;
};
export type Quota = {
  id: string;
  centro_id: string;
  allievo_id: string;
  corso_id: string | null;
  periodo: string;
  importo_cent: number;
  scade_il: string;
  stato: StatoQuota;
  pagata_il: string | null;
  metodo: MetodoQuota | null;
  stripe_id: string | null;
};
export type GruppoMin = { id: string; nome: string; fascia: string | null; giorni: number[] | null; ora: string | null };
export type AllievoMin = { id: string; nome: string; cognome: string | null };
export type LegameFamiglia = { allievo_id: string; membro_id: string };
export type MembroMin = { id: string; nome: string | null; cognome: string | null };

/** Impostazioni dei pagamenti: stanno dentro `centri.impostazioni.pagamenti` (jsonb), così non serve una colonna nuova. */
export type ImpPagamenti = {
  cadenza: Cadenza;
  sconto_attivo: boolean;
  iscrizione_cent: number | null;
  giorno_scadenza: number;
  auto: { promemoria: boolean; carta: boolean; ricevute: boolean };
};

export function leggiImp(imp: unknown): ImpPagamenti {
  const p = ((imp as { pagamenti?: Partial<ImpPagamenti> } | null | undefined)?.pagamenti ?? {}) as Partial<ImpPagamenti>;
  const giorno = Number(p.giorno_scadenza);
  return {
    cadenza: p.cadenza === "T" || p.cadenza === "A" ? p.cadenza : "M",
    sconto_attivo: p.sconto_attivo !== false,
    iscrizione_cent: typeof p.iscrizione_cent === "number" ? p.iscrizione_cent : null,
    // massimo 28 così il giorno esiste in ogni mese
    giorno_scadenza: Number.isFinite(giorno) && giorno >= 1 && giorno <= 28 ? Math.round(giorno) : 20,
    auto: {
      promemoria: p.auto?.promemoria !== false,
      carta: p.auto?.carta !== false,
      ricevute: p.auto?.ricevute !== false,
    },
  };
}

export function fmt(s: string, v: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : ""));
}

/** Testi dei periodi, delle ricevute e dei metodi, condivisi dai dizionari delle tre schermate. */
export const PER_IT = {
  anno: "Anno",
  iscrizione: "Iscrizione",
  tipoM: "quota mensile",
  tipoT: "quota trimestrale",
  tipoA: "quota annuale",
  tipoI: "quota di iscrizione",
  rata: "{n}ª rata",
  metodoCarta: "carta",
  metodoSegreteria: "in segreteria",
  metodoBonifico: "bonifico",
  pagataIl: "Pagata il {d}",
  ricTitolo: "Ricevuta di pagamento",
  ricNonFiscale: "Documento non fiscale: conserva la ricevuta di Stripe per la carta.",
  ricCentro: "Centro",
  ricAllievo: "Allievo",
  ricCausale: "Causale",
  ricImporto: "Importo",
  ricData: "Data del pagamento",
  ricMetodo: "Metodo",
  ricNumero: "Riferimento",
};

// ---------- importi ----------
/** "" se l'importo non esiste: la quota non si inventa mai. */
export function euro(c: number | null | undefined): string {
  if (c == null || !Number.isFinite(c)) return "";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: c % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(c / 100);
}
/** "85", "85,50", "1.200,50", "85.5" -> centesimi; null se vuoto o non valido. */
export function parseEuro(s: string): number | null {
  let v = s.replace(/[€\s]/g, "");
  if (!v) return null;
  v = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
export function euroInput(c: number | null | undefined): string {
  if (c == null) return "";
  return c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace(".", ",");
}

// ---------- date (stringhe AAAA-MM-GG, sempre in ora locale) ----------
const p2 = (n: number) => String(n).padStart(2, "0");
export const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const daIso = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const oggiISO = () => iso(new Date());
export const aggiungiGiorni = (s: string, n: number) => {
  const d = daIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const fmtCorto = (s: string) => daIso(s).toLocaleDateString("it-IT", { day: "numeric", month: "short" }).replace(".", "");
export const fmtLungo = (s: string) => daIso(s).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
export const fmtMese = (d: Date) => `${MESI[d.getMonth()]} ${d.getFullYear()}`;
export const inizioMese = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const fineMese = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
export function giorniGruppo(g: GruppoMin | null | undefined): string {
  if (!g) return "";
  const gg = (g.giorni ?? []).map((n) => GIORNI[(n + 6) % 7]).join("-");
  const ora = g.ora ? g.ora.slice(0, 5) : "";
  return [gg, ora].filter(Boolean).join(" ");
}

// ---------- periodi ----------
export type PeriodoNuovo = { codice: string; titolo: string; scade_il: string };

/** Periodo di riferimento per generare le quote: 0 = quello in corso, 1 = il successivo. */
export function periodo(cad: Cadenza, giorno: number, offset = 0, rif = new Date()): PeriodoNuovo {
  const g = p2(Math.min(Math.max(giorno, 1), 28));
  if (cad === "M") {
    const d = new Date(rif.getFullYear(), rif.getMonth() + offset, 1);
    return { codice: `${d.getFullYear()}-${p2(d.getMonth() + 1)}`, titolo: MESI[d.getMonth()], scade_il: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${g}` };
  }
  if (cad === "T") {
    const q = Math.floor(rif.getMonth() / 3) + offset;
    const d = new Date(rif.getFullYear(), q * 3, 1);
    const qq = Math.floor(d.getMonth() / 3);
    return {
      codice: `${d.getFullYear()}-T${qq + 1}`,
      titolo: `${MESI[qq * 3]}–${MESI[qq * 3 + 2]}`,
      scade_il: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${g}`,
    };
  }
  // anno sportivo: da settembre ad agosto
  const inizio = (rif.getMonth() >= 8 ? rif.getFullYear() : rif.getFullYear() - 1) + offset;
  return { codice: `${inizio}-${inizio + 1}`, titolo: `${inizio}/${String(inizio + 1).slice(2)}`, scade_il: `${inizio}-09-${g}` };
}
export const codiceIscrizione = (anno: number) => `iscrizione-${anno}`;

export type InfoPeriodo = { tipo: "M" | "T" | "A" | "I" | "?"; mese: number; trimestre: number; anno: number; rata: number | null; grezzo: string };
export function infoPeriodo(periodo: string): InfoPeriodo {
  const rm = periodo.match(/\s·\s(\d)ª rata$/);
  const base = rm ? periodo.slice(0, rm.index) : periodo;
  const rata = rm ? Number(rm[1]) : null;
  const vuoto = { mese: 0, trimestre: 0, anno: 0, rata, grezzo: periodo };
  let m = base.match(/^(\d{4})-(\d{2})$/);
  if (m) return { ...vuoto, tipo: "M", anno: +m[1], mese: +m[2] };
  m = base.match(/^(\d{4})-T([1-4])$/);
  if (m) return { ...vuoto, tipo: "T", anno: +m[1], trimestre: +m[2] };
  m = base.match(/^(\d{4})-(\d{4})$/);
  if (m) return { ...vuoto, tipo: "A", anno: +m[1] };
  m = base.match(/^iscrizione-(\d{4})$/);
  if (m) return { ...vuoto, tipo: "I", anno: +m[1] };
  return { ...vuoto, tipo: "?" };
}
type Dz = Record<string, string>;
/** "Novembre", "Ottobre–Dicembre", "Anno 2026/27", "Iscrizione 2026". */
export function titoloPeriodo(i: InfoPeriodo, t: Dz): string {
  if (i.tipo === "M") return MESI[i.mese - 1] ?? i.grezzo;
  if (i.tipo === "T") return `${MESI[(i.trimestre - 1) * 3]}–${MESI[(i.trimestre - 1) * 3 + 2]}`;
  if (i.tipo === "A") return `${t.anno} ${i.anno}/${String(i.anno + 1).slice(2)}`;
  if (i.tipo === "I") return `${t.iscrizione} ${i.anno}`;
  return i.grezzo;
}
export function tipoPeriodo(i: InfoPeriodo, t: Dz): string {
  return i.tipo === "M" ? t.tipoM : i.tipo === "T" ? t.tipoT : i.tipo === "A" ? t.tipoA : i.tipo === "I" ? t.tipoI : "";
}
/** "Ottobre · quota mensile" (con la rata se c'è). */
export function etichettaQuota(q: Pick<Quota, "periodo">, t: Dz): string {
  const i = infoPeriodo(q.periodo);
  return [titoloPeriodo(i, t), tipoPeriodo(i, t), i.rata ? fmt(t.rata, { n: i.rata }) : ""].filter(Boolean).join(" · ");
}
export function etichettaMetodo(m: MetodoQuota | null, t: Dz): string {
  return m === "carta" ? t.metodoCarta : m === "bonifico" ? t.metodoBonifico : m === "segreteria" ? t.metodoSegreteria : "";
}

/** Stato effettivo: una quota in attesa con la data passata è scaduta anche se nessuno ha aggiornato la riga. */
export type StatoEff = "P" | "A" | "S";
export function statoEff(q: Pick<Quota, "stato" | "scade_il">, oggi = oggiISO()): StatoEff {
  if (q.stato === "pagata") return "P";
  if (q.stato === "scaduta" || q.scade_il < oggi) return "S";
  return "A";
}
export const COLORE_STATO: Record<StatoEff, string> = { P: "#4CD07D", A: "#FFD54A", S: "#FF5A5F" };

// ---------- CSV per il commercialista ----------
export function csv(righe: string[][]): string {
  const cella = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // separatore ";" e BOM: Excel italiano lo apre senza rovinare gli accenti
  return "﻿" + righe.map((r) => r.map(cella).join(";")).join("\r\n");
}
export const importoCSV = (c: number) => (c / 100).toFixed(2).replace(".", ",");
export function scaricaFile(nome: string, contenuto: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- ricevuta ----------
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
export function scaricaRicevuta(
  d: { centro: string; allievo: string; causale: string; importo_cent: number; pagata_il: string | null; metodo: string; riferimento: string },
  t: Dz,
) {
  const riga = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(t.ricTitolo)}</title>
<style>body{font:16px/1.5 -apple-system,Helvetica,Arial,sans-serif;max-width:560px;margin:40px auto;padding:0 20px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse}th{text-align:left;color:#555;font-weight:600;padding:8px 0;width:40%}td{padding:8px 0;font-weight:700}tr{border-bottom:1px solid #ddd}p{color:#666;font-size:13px;margin-top:24px}</style></head>
<body><h1>${esc(t.ricTitolo)}</h1><table>${riga(t.ricCentro, d.centro)}${riga(t.ricAllievo, d.allievo)}${riga(t.ricCausale, d.causale)}${riga(t.ricImporto, euro(d.importo_cent))}${riga(t.ricData, d.pagata_il ? fmtLungo(d.pagata_il) : "")}${riga(t.ricMetodo, d.metodo)}${riga(t.ricNumero, d.riferimento)}</table><p>${esc(t.ricNonFiscale)}</p></body></html>`;
  const nome = `ricevuta-${d.riferimento.slice(0, 8)}-${(d.pagata_il ?? "").slice(0, 10)}.html`;
  scaricaFile(nome, html, "text/html;charset=utf-8");
}
