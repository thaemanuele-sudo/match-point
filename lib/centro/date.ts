// Date in italiano. Tutto in ora locale del dispositivo: le lezioni sono "alle 17:00 di Milano",
// non un istante UTC, quindi niente toISOString() sui giorni (sposterebbe la data a cavallo della mezzanotte).
const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const GIORNI_LUNGHI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const p2 = (n: number) => String(n).padStart(2, "0");

/** Accetta "2026-11-17", un timestamp ISO o una Date. Le sole date (senza ora) sono lette come giorno locale. */
export function leggiData(d: string | Date): Date {
  if (d instanceof Date) return d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
}

/** "2026-11-17" (giorno locale). */
export function isoGiorno(d: Date = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Giorno della settimana come nel database: 1 = lunedì … 7 = domenica. */
export function giornoSettimana(d: string | Date): number {
  const g = leggiData(d).getDay();
  return g === 0 ? 7 : g;
}

export function aggiungiGiorni(d: string | Date, n: number): Date {
  const x = new Date(leggiData(d));
  x.setDate(x.getDate() + n);
  return x;
}

/** Lunedì della settimana che contiene la data. */
export function inizioSettimana(d: string | Date = new Date()): Date {
  return aggiungiGiorni(d, 1 - giornoSettimana(d));
}

/** "mar 17 nov" */
export function fmtData(d: string | Date): string {
  const x = leggiData(d);
  return `${GIORNI_BREVI[x.getDay()]} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
}

/** "martedì 17 novembre" */
export function fmtDataLunga(d: string | Date): string {
  const x = leggiData(d);
  return `${GIORNI_LUNGHI[x.getDay()]} ${x.getDate()} ${MESI_LUNGHI[x.getMonth()]}`;
}

/** "17 nov" */
export function fmtGiornoMese(d: string | Date): string {
  const x = leggiData(d);
  return `${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
}

/** "17:00" da "17:00:00", da "17:00" o da un timestamp. */
export function fmtOra(o: string | Date | null | undefined): string {
  if (!o) return "";
  if (o instanceof Date) return `${p2(o.getHours())}:${p2(o.getMinutes())}`;
  const m = /^(\d{1,2}):(\d{2})/.exec(o);
  if (m) return `${p2(+m[1])}:${m[2]}`;
  const x = new Date(o);
  return isNaN(+x) ? "" : `${p2(x.getHours())}:${p2(x.getMinutes())}`;
}

/** "mar 17 nov · 17:00" */
export function fmtDataOra(d: string | Date): string {
  const x = leggiData(d);
  return `${fmtData(x)} · ${fmtOra(x)}`;
}

/** [1,3] → "lun-mer"; [2] → "mar"; [1,3,5] → "lun-mer-ven" (stesso formato dei mockup). */
export function fmtGiorni(giorni: number[] | null | undefined): string {
  if (!giorni?.length) return "";
  return [...giorni].sort((a, b) => a - b).map((g) => GIORNI_BREVI[g % 7]).join("-");
}

/** "tra 2 ore", "2 ore fa", "ieri": per messaggi e notifiche. */
export function tempoFa(d: string | Date, adesso: Date = new Date()): string {
  const x = leggiData(d);
  const min = Math.round((+adesso - +x) / 60000);
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  const ore = Math.round(min / 60);
  if (ore < 24) return ore === 1 ? "1 ora fa" : `${ore} ore fa`;
  const gg = Math.round(ore / 24);
  if (gg === 1) return "ieri";
  if (gg < 7) return `${gg} giorni fa`;
  return fmtData(x);
}

/** Forma minima di un gruppo per calcolare le lezioni: la tabella `gruppi` la rispetta. */
export type GruppoOrario = {
  id: string;
  giorni: number[] | null;
  ora: string | null;
  durata_min?: number | null;
  campo_id?: string | null;
  attivo?: boolean | null;
};

export type ProssimaLezione<G extends GruppoOrario = GruppoOrario> = {
  gruppo: G;
  /** "2026-11-17" */
  data: string;
  /** "17:00" */
  ora: string;
  /** Data e ora locali, per ordinare e confrontare. */
  quando: Date;
};

/**
 * Prossime lezioni calcolate da giorni e orario dei gruppi (senza leggere la tabella `lezioni`).
 * Parte da `da` (adesso) e guarda `giorniAvanti` giorni; una lezione di oggi già iniziata è esclusa
 * a meno di `includiOggiPassato`. Risultato ordinato per data e ora, tagliato a `max`.
 */
export function prossimeLezioni<G extends GruppoOrario>(
  gruppi: G[],
  opzioni: { da?: Date; giorniAvanti?: number; max?: number; includiOggiPassato?: boolean } = {},
): ProssimaLezione<G>[] {
  const { da = new Date(), giorniAvanti = 14, max = 50, includiOggiPassato = false } = opzioni;
  const out: ProssimaLezione<G>[] = [];
  const base = leggiData(isoGiorno(da));
  // ora e minuti di ogni gruppo si leggono una volta sola, non a ogni giorno del ciclo (con 80 gruppi e 400 giorni sono decine di migliaia di analisi di testo)
  const attivi = gruppi
    .filter((g) => g.attivo !== false && g.ora && g.giorni?.length)
    .map((g) => {
      const ora = fmtOra(g.ora);
      const [h, m] = ora.split(":").map(Number);
      return { g, ora, h, m, giorni: new Set(g.giorni) };
    });
  for (let i = 0; i < giorniAvanti; i++) {
    const giorno = aggiungiGiorni(base, i);
    const gs = giornoSettimana(giorno);
    const iso = isoGiorno(giorno);
    for (const { g, ora, h, m, giorni } of attivi) {
      if (!giorni.has(gs)) continue;
      const quando = new Date(giorno.getFullYear(), giorno.getMonth(), giorno.getDate(), h, m);
      if (!includiOggiPassato && quando < da) continue;
      out.push({ gruppo: g, data: iso, ora, quando });
    }
  }
  out.sort((a, b) => +a.quando - +b.quando);
  return out.slice(0, max);
}
