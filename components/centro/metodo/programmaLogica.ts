import { norm } from "./dati";

/** Calendario annuale dei programmi: da settembre ad agosto, 4 settimane per mese. */
export const MESI_K = ["set", "ott", "nov", "dic", "gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago"] as const;
export const TEST_DEFAULT = ["ott-4", "gen-4", "mag-4"];
export type Schema = "mensile" | "settimanale" | "blocchi" | "periodizzazione" | "libero";
export const SCHEMI: Schema[] = ["mensile", "settimanale", "blocchi", "periodizzazione", "libero"];
export const SCHEMA_PER_FASCIA: Record<string, Schema> = { U8: "settimanale", U10: "settimanale", U12: "mensile", U14: "periodizzazione", U16: "periodizzazione", U18: "periodizzazione", Adulti: "libero", Agonisti: "periodizzazione" };

export type Sett = { tema: string; colore: string; modello_id: string | null; test?: boolean; carico?: number };
export type Mese = { mese: string; tema: string; colpo: string; colore: string; fase?: string; settimane: Sett[] };

export const GRIGIO = "#8E8E93";
const BIANCO = "#FFFFFF";

/** [chiave testo, abbreviazione, colore] dei temi del mese. */
export const TH: Record<string, [string, string, string]> = {
  pal: ["th_pal", "Pa", "#2DD4BF"],
  gam: ["th_gam", "Ga", "#FFB020"],
  dri: ["th_dri", "Dr", "#4CD07D"],
  rov: ["th_rov", "Rv", "#3D8BFF"],
  ser: ["th_ser", "Se", "#FF7A45"],
  ris: ["th_ris", "Ri", "#F472B6"],
  vol: ["th_vol", "Vo", "#A78BFA"],
  tat: ["th_tat", "Ta", "#FF5A5F"],
  rip: ["th_rip", "Rp", "#D8F34A"],
  tor: ["th_tor", "To", "#FFD54A"],
  cam: ["th_cam", "Ca", "#7FD3FF"],
  pau: ["th_pau", "—", "#636366"],
};
export const TH_ORDINE = ["pal", "gam", "dri", "rov", "ser", "ris", "vol", "tat", "rip", "tor", "cam", "pau"];
const MENS = TH_ORDINE;
const SETT: string[][] = [["pal", "gam", "dri", "rov"], ["ser", "ris", "vol", "T"], ["dri", "rov", "ser", "ris"], ["vol", "tat", "dri", "rov"], ["ser", "ris", "vol", "T"], ["dri", "rov", "gam", "tat"], ["ser", "ris", "vol", "pal"], ["dri", "rov", "ser", "tat"], ["vol", "gam", "rip", "T"], ["tor", "tor", "rip", "rip"], ["cam", "cam", "cam", "cam"], ["pau", "pau", "pau", "pau"]];
const BLK: string[][] = [["T", "T", "T", "M"], ["M", "U", "U", "X"], ["U", "U", "U", "M"], ["U", "U", "U", "M"], ["M", "U", "U", "X"], ["U", "U", "U", "M"], ["U", "U", "M", "U"], ["M", "M", "U", "M"], ["M", "U", "M", "X"], ["T", "T", "T", "T"], ["T", "T", "T", "T"], ["P", "P", "P", "P"]];
/** Codice modello → [chiave nome breve, colore, chiave nome modello salvato]. */
export const MOD: Record<string, [string, string, string]> = {
  M: ["mo_multi", "#3D8BFF", "mod_multi"],
  U: ["mo_uno", "#4CD07D", "mod_uno"],
  T: ["mo_gio", "#FFB020", "mod_gio"],
  P: ["mo_pausa", "#636366", ""],
};
const PH: [string, string][] = [["ph_base", "#3D8BFF"], ["ph_base", "#3D8BFF"], ["ph_spec", "#4CD07D"], ["ph_spec", "#4CD07D"], ["ph_pre", "#FFB020"], ["ph_pre", "#FFB020"], ["ph_gara", "#FF5A5F"], ["ph_gara", "#FF5A5F"], ["ph_gara", "#FF5A5F"], ["ph_scarico", "#A78BFA"], ["ph_camp", "#7FD3FF"], ["ph_rec", "#636366"]];
const LOAD: Record<string, number[]> = { ph_base: [50, 60, 70, 40], ph_spec: [60, 70, 80, 50], ph_pre: [70, 80, 90, 55], ph_gara: [75, 85, 95, 50], ph_scarico: [40, 40, 30, 30], ph_camp: [60, 70, 60, 40], ph_rec: [20, 20, 20, 20] };

const titoloSett = (t: Record<string, string>, th: string, w: number) => (["dri", "rov", "ser"].includes(th) ? t[`wk_${th}_${w + 1}`] : t[`wk_gen_${w + 1}`]);

/** Prima settimana di test di quel mese (week = indice 0-3) → "ott-4". */
export const chiaveTest = (mese: string, w: number) => `${mese}-${w + 1}`;
export function leggiTest(a: unknown): string[] {
  if (!Array.isArray(a)) return [...TEST_DEFAULT];
  return a.map((x) => {
    const s = String(x).toLowerCase();
    return /-\d$/.test(s) ? s : `${s}-4`;
  });
}

/** Genera un programma di partenza dallo schema scelto (poi il DT lo modifica mese per mese). */
export function generaMesi(schema: Schema, t: Record<string, string>, test: string[], modelloId: (nome: string) => string | null): Mese[] {
  return MESI_K.map((mk, m) => {
    const isTest = (w: number) => test.includes(chiaveTest(mk, w));
    let mese: Mese;
    if (schema === "mensile") {
      const k = MENS[m];
      const [lk, , col] = TH[k];
      mese = { mese: mk, tema: t[lk], colpo: t[lk], colore: col, settimane: [0, 1, 2, 3].map((w) => ({ tema: titoloSett(t, k, w), colore: col, modello_id: null })) };
    } else if (schema === "settimanale") {
      const codes = SETT[m].map((c, w) => (c === "T" || isTest(w) ? "T" : c));
      mese = {
        mese: mk,
        tema: codes.map((c) => (c === "T" ? t.th_test_ab : TH[c][1])).join("·"),
        colpo: "",
        colore: GRIGIO,
        settimane: codes.map((c) => (c === "T" ? { tema: t.sett_test, colore: BIANCO, modello_id: null, test: true } : { tema: fmtSett(t, TH[c][0]), colore: TH[c][2], modello_id: null })),
      };
    } else if (schema === "blocchi") {
      const b = BLK[m].map((c) => (c === "X" ? "M" : c));
      const cnt: Record<string, number> = {};
      b.forEach((c) => (cnt[c] = (cnt[c] || 0) + 1));
      const dom = Object.keys(cnt).sort((a, z) => cnt[z] - cnt[a])[0];
      const th = TH[MENS[m]];
      mese = {
        mese: mk,
        tema: t[MOD[dom][0]],
        colpo: "",
        colore: MOD[dom][1],
        settimane: b.map((c) => ({
          tema: c === "P" ? t.sett_nessuna : `${t[MOD[c][2] || "mod_multi"] ?? ""} · ${t[th[0]].toLowerCase()}`,
          colore: MOD[c][1],
          modello_id: c === "P" ? null : modelloId(t[MOD[c][2]]),
        })),
      };
    } else if (schema === "periodizzazione") {
      const [fk, col] = PH[m];
      const load = LOAD[fk];
      mese = {
        mese: mk,
        tema: t[fk],
        colpo: "",
        colore: col,
        fase: t[fk],
        settimane: load.map((l) => ({ tema: fmt2(t.sett_carico, l, l >= 90 ? t.sett_picco : l <= 45 ? t.sett_scarico : t.sett_crescita), colore: col, modello_id: null, carico: l })),
      };
    } else {
      const haTest = [0, 1, 2, 3].some(isTest);
      mese = {
        mese: mk,
        tema: haTest ? t.sett_test_corto : t.sett_libero,
        colpo: "",
        colore: haTest ? "#D8F34A" : "#3A3A3C",
        settimane: [0, 1, 2, 3].map(() => ({ tema: t.sett_scelto, colore: "#2C2C2E", modello_id: null })),
      };
    }
    // Le settimane di test sono bloccate: nessun modello, nessun tema
    mese.settimane = mese.settimane.map((s, w) => (isTest(w) ? { tema: t.sett_test, colore: BIANCO, modello_id: null, test: true } : s));
    return mese;
  });
}
const fmtSett = (t: Record<string, string>, k: string) => t.sett_di.replace("{c}", t[k].toLowerCase());
const fmt2 = (s: string, l: number, f: string) => s.replace("{l}", String(l)).replace("{f}", f);

/** Legge i mesi salvati nel database in modo tollerante e completa i buchi con la bozza generata. */
export function leggiMesi(j: unknown, fallback: Mese[], t: Record<string, string>): Mese[] {
  if (!Array.isArray(j) || j.length === 0) return fallback;
  const colorePerTema = (tema: string) => {
    const n = norm(tema);
    const hit = Object.values(TH).find(([lk]) => n.length > 0 && norm(t[lk] ?? "") === n);
    return hit ? hit[2] : undefined;
  };
  const out = fallback.map((f) => ({ ...f, settimane: f.settimane.map((s) => ({ ...s })) }));
  j.forEach((x, i) => {
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    let mi = typeof o.mese === "string" ? MESI_K.indexOf(norm(o.mese).slice(0, 3) as (typeof MESI_K)[number]) : -1;
    if (mi < 0 && typeof o.mese === "number") mi = o.mese;
    if (mi < 0) mi = i;
    if (mi < 0 || mi > 11) return;
    const tema = typeof o.tema === "string" ? o.tema : out[mi].tema;
    const colore = typeof o.colore === "string" ? o.colore : colorePerTema(tema) ?? out[mi].colore;
    const sett = Array.isArray(o.settimane)
      ? [0, 1, 2, 3].map((w): Sett => {
          const s = (o.settimane as unknown[])[w];
          const so = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
          return {
            tema: typeof so.tema === "string" ? so.tema : out[mi].settimane[w].tema,
            colore: typeof so.colore === "string" ? so.colore : colore,
            modello_id: so.modello_id ? String(so.modello_id) : null,
            test: so.test === true ? true : undefined,
            carico: typeof so.carico === "number" ? so.carico : undefined,
          };
        })
      : out[mi].settimane.map((s) => ({ ...s, colore }));
    out[mi] = { mese: MESI_K[mi], tema, colpo: typeof o.colpo === "string" ? o.colpo : "", colore, fase: typeof o.fase === "string" ? o.fase : undefined, settimane: sett };
  });
  return out;
}

export function settimanaCorrente(oggi = new Date()): { m: number; w: number } {
  return { m: (oggi.getMonth() - 8 + 12) % 12, w: Math.min(3, Math.ceil(oggi.getDate() / 7) - 1) };
}
/** p = svolta, c = in corso, f = da fare. */
export function statoSett(anno: number, annoOra: number, m: number, w: number, cur: { m: number; w: number }): "p" | "c" | "f" {
  if (anno < annoOra) return "p";
  if (anno > annoOra) return "f";
  if (m < cur.m || (m === cur.m && w < cur.w)) return "p";
  return m === cur.m && w === cur.w ? "c" : "f";
}
