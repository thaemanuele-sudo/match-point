// Voci delle barre (BRIEF.md e BRIEF2.md). La barra in basso e la barra laterale leggono da qui.
import { rotta, type RotteCentro } from "@/lib/centro/rotte";
import type { Ruolo } from "@/lib/centro/tipi-base";
import type { IconaNome } from "./icone";

export type RuoloBarra = "dt" | "area" | "maestro" | "genitore" | "allievo";

export type VoceBarra = {
  /** Valore da passare a <SchermoCentro tab="...">. */
  id: string;
  /** Chiave di T_BARRE.it per l'etichetta. */
  chiave: string;
  icona: IconaNome;
  href: (r: RotteCentro) => string;
  /** Pulsante "+" centrale della barra del maestro. */
  plus?: boolean;
  /** Solo nella barra laterale (desktop), non in quella in basso. */
  laterale?: boolean;
  /** Voce secondaria della laterale: si accende per indirizzo e non per `tab`. */
  sotto?: boolean;
  /** Titolo del gruppo della laterale che inizia da questa voce. */
  gruppo?: string;
};

const IT = {
  oggi: "Oggi", allievi: "Allievi", nuovo: "Nuova lezione o video", messaggi: "Messaggi", metodo: "Metodo",
  centro: "Centro", maestri: "Maestri", tutela: "Tutela",
  gruppi: "Gruppi", campi: "Campi", organizzazione: "Organizzazione", formazione: "Formazione", avvisi: "Avvisi",
  corsi: "Corsi", pagamenti: "Pagamenti", impostazioni: "Impostazioni", progressi: "Progressi", permessi: "Permessi",
  lineeGuida: "Linee guida", libreria: "Libreria esercizi", modelli: "Modelli di lezione", programmi: "Programmi",
  home: "Home", calendario: "Calendario",
  percorso: "Percorso", compiti: "Compiti", maestro: "Maestro", aiuto: "Aiuto",
  area: "Area", campiOrari: "Campi",
  gruppoCentro: "Centro", gruppoMetodo: "Metodo", gruppoPersone: "Persone e orari", gruppoGestione: "Gestione",
  sezioni: "Sezioni", menu: "Menu", cambiaProfilo: "Cambia profilo",
} as const;
/** Dizionario delle etichette: stessa struttura di tutti gli altri (en uguale a it per ora). */
export const T_BARRE = { it: IT, en: { ...IT } } as { it: Record<string, string>; en: Record<string, string> };

export const BARRE: Record<RuoloBarra, VoceBarra[]> = {
  maestro: [
    { id: "oggi", chiave: "oggi", icona: "cal", href: (r) => r.maestro.base },
    { id: "allievi", chiave: "allievi", icona: "users", href: (r) => r.maestro.allievi },
    // "nuova" è un id convenzionale: l'area E lo interpreta come "crea una lezione dal programma".
    { id: "nuovo", chiave: "nuovo", icona: "plus", href: (r) => r.maestro.lezione("nuova"), plus: true },
    { id: "messaggi", chiave: "messaggi", icona: "chat", href: (r) => r.maestro.messaggi },
    { id: "metodo", chiave: "metodo", icona: "layers", href: (r) => r.maestro.metodo },
  ],
  dt: [
    { id: "centro", chiave: "centro", icona: "chart", href: (r) => r.dt.base, gruppo: "gruppoCentro" },
    { id: "maestri", chiave: "maestri", icona: "users", href: (r) => r.dt.maestri },
    { id: "metodo", chiave: "metodo", icona: "layers", href: (r) => r.dt.metodo.programmi },
    { id: "linee-guida", chiave: "lineeGuida", icona: "doc", href: (r) => r.dt.metodo.lineeGuida, laterale: true, sotto: true },
    { id: "libreria", chiave: "libreria", icona: "video", href: (r) => r.dt.metodo.libreria, laterale: true, sotto: true },
    { id: "modelli", chiave: "modelli", icona: "layers", href: (r) => r.dt.metodo.modelli, laterale: true, sotto: true },
    { id: "programmi", chiave: "programmi", icona: "cal", href: (r) => r.dt.metodo.programmi, laterale: true, sotto: true },
    { id: "allievi", chiave: "allievi", icona: "user", href: (r) => r.dt.allievi },
    { id: "tutela", chiave: "tutela", icona: "shield", href: (r) => r.dt.segnalazioni },
    { id: "gruppi", chiave: "gruppi", icona: "users", href: (r) => r.dt.gruppi, laterale: true, gruppo: "gruppoPersone" },
    { id: "campi", chiave: "campi", icona: "grid", href: (r) => r.dt.campi, laterale: true },
    { id: "progressi", chiave: "progressi", icona: "chart", href: (r) => r.dt.progressi, laterale: true },
    { id: "organizzazione", chiave: "organizzazione", icona: "star", href: (r) => r.dt.organizzazione, laterale: true },
    { id: "formazione", chiave: "formazione", icona: "target", href: (r) => r.dt.formazione, laterale: true },
    { id: "avvisi", chiave: "avvisi", icona: "bell", href: (r) => r.dt.avvisi, laterale: true, gruppo: "gruppoGestione" },
    { id: "corsi", chiave: "corsi", icona: "doc", href: (r) => r.dt.corsi, laterale: true },
    { id: "pagamenti", chiave: "pagamenti", icona: "share", href: (r) => r.dt.pagamenti, laterale: true },
    { id: "permessi", chiave: "permessi", icona: "lock", href: (r) => r.dt.permessi, laterale: true },
    { id: "impostazioni", chiave: "impostazioni", icona: "gear", href: (r) => r.dt.impostazioni, laterale: true },
  ],
  genitore: [
    { id: "home", chiave: "home", icona: "home", href: (r) => r.genitore.base },
    { id: "calendario", chiave: "calendario", icona: "cal", href: (r) => r.genitore.calendario },
    { id: "progressi", chiave: "progressi", icona: "chart", href: (r) => r.genitore.progressi },
    { id: "messaggi", chiave: "messaggi", icona: "chat", href: (r) => r.genitore.messaggi },
  ],
  allievo: [
    { id: "percorso", chiave: "percorso", icona: "star", href: (r) => r.allievo.base },
    { id: "compiti", chiave: "compiti", icona: "target", href: (r) => r.allievo.compiti },
    { id: "maestro", chiave: "maestro", icona: "chat", href: (r) => r.allievo.chat },
    { id: "aiuto", chiave: "aiuto", icona: "shield", href: (r) => r.allievo.segnala },
  ],
  // Responsabile d'area: gruppi e campi dell'area riusano le pagine D (RLS filtra per area).
  area: [
    { id: "area", chiave: "area", icona: "chart", href: (r) => r.area.base },
    { id: "gruppi", chiave: "gruppi", icona: "users", href: (r) => r.dt.gruppi },
    { id: "campi", chiave: "campiOrari", icona: "grid", href: (r) => r.dt.campiOrari },
    { id: "messaggi", chiave: "messaggi", icona: "chat", href: (r) => r.area.avviso },
  ],
};

/** Ruolo del database → barra da usare. Segreteria usa la barra del direttore (stesse pagine, RLS limita). */
export function ruoloBarra(ruolo: Ruolo): RuoloBarra {
  switch (ruolo) {
    case "responsabile_area": return "area";
    case "maestro": return "maestro";
    case "genitore": return "genitore";
    case "allievo": return "allievo";
    default: return "dt";
  }
}

/** Pagina iniziale di ogni ruolo. */
export function homeRuolo(slug: string, r: RuoloBarra): string {
  const x = rotta(slug);
  return r === "dt" ? x.dt.base : x[r].base;
}
