// Tutte le rotte dell'app dei centri (tabella di docs/CENTRI.md). Un solo posto: chi cambia un indirizzo lo cambia qui.
const enc = encodeURIComponent;

/** Indirizzi fuori da /c/[slug] (profili, inviti, registrazione). */
export const ROTTE_APP = {
  profili: "/app/profili",
  unisciti: (codice?: string) => (codice ? `/app/unisciti?c=${enc(codice)}` : "/app/unisciti"),
  registraCentro: "/app/registra-centro",
  accesso: "/app/benvenuto",
  admin: "/admin",
} as const;

export function rotta(slug: string) {
  const b = `/c/${enc(slug)}`;
  return {
    /** /c/slug: smista al ruolo. */
    base: b,
    /** /centro/slug: indirizzo comodo, porta a /dt. */
    comodo: `/centro/${enc(slug)}`,
    chat: (id: string) => `${b}/chat/${enc(id)}`,
    manifest: `${b}/manifest.webmanifest`,
    dt: {
      base: `${b}/dt`,
      maestri: `${b}/dt/maestri`,
      maestro: (id: string) => `${b}/dt/maestri/${enc(id)}`,
      osservazione: (id: string) => `${b}/dt/osservazione/${enc(id)}`,
      formazione: `${b}/dt/formazione`,
      metodo: {
        lineeGuida: `${b}/dt/metodo/linee-guida`,
        libreria: `${b}/dt/metodo/libreria`,
        modelli: `${b}/dt/metodo/modelli`,
        programmi: `${b}/dt/metodo/programmi`,
      },
      gruppi: `${b}/dt/gruppi`,
      allievi: `${b}/dt/allievi`,
      progressi: `${b}/dt/progressi`,
      campi: `${b}/dt/campi`,
      campiOrari: `${b}/dt/campi/orari`,
      organizzazione: `${b}/dt/organizzazione`,
      permessi: `${b}/dt/permessi`,
      impostazioni: `${b}/dt/impostazioni`,
      segnalazioni: `${b}/dt/segnalazioni`,
      avvisi: `${b}/dt/avvisi`,
      corsi: `${b}/dt/corsi`,
      pagamenti: `${b}/dt/pagamenti`,
    },
    area: {
      base: `${b}/area`,
      avviso: `${b}/area/avviso`,
    },
    maestro: {
      base: `${b}/maestro`,
      gruppi: `${b}/maestro/gruppi`,
      allievi: `${b}/maestro/allievi`,
      allievo: (id: string) => `${b}/maestro/allievi/${enc(id)}`,
      lezione: (id: string) => `${b}/maestro/lezione/${enc(id)}`,
      inCorso: (id: string) => `${b}/maestro/lezione/${enc(id)}/in-corso`,
      chiusura: (id: string) => `${b}/maestro/lezione/${enc(id)}/chiusura`,
      valutazioni: `${b}/maestro/valutazioni`,
      metodo: `${b}/maestro/metodo`,
      formazione: `${b}/maestro/formazione`,
      messaggi: `${b}/maestro/messaggi`,
      avviso: `${b}/maestro/avviso`,
      notifiche: `${b}/maestro/notifiche`,
    },
    genitore: {
      base: `${b}/genitore`,
      calendario: `${b}/genitore/calendario`,
      progressi: `${b}/genitore/progressi`,
      report: `${b}/genitore/report`,
      figli: `${b}/genitore/figli`,
      messaggi: `${b}/genitore/messaggi`,
      segnala: `${b}/genitore/segnala`,
      pagamenti: `${b}/genitore/pagamenti`,
    },
    allievo: {
      base: `${b}/allievo`,
      compiti: `${b}/allievo/compiti`,
      chat: `${b}/allievo/chat`,
      segnala: `${b}/allievo/segnala`,
      assenza: `${b}/allievo/assenza`,
      notifiche: `${b}/allievo/notifiche`,
    },
  } as const;
}

export type RotteCentro = ReturnType<typeof rotta>;
