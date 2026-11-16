"use client";
import { useCentro } from "@/lib/centro/contesto";
import { useT } from "@/lib/i18n/lingua";
import { homeRuolo, ruoloBarra, type RuoloBarra } from "./barre";
import { SchermoCentro } from "./Schermo";
import { Vuoto } from "./ui";

// Titoli per codice schermata (ref/elenco.txt). Solo italiano per ora: en è una copia di it.
const IT = {
  C1: "Panoramica centro", C2: "Maestri", C3: "Scheda maestro", C4: "Osservazione in campo", C5: "Metodo · Linee guida", C6: "Metodo · Libreria esercizi",
  C7: "Metodo · Modelli di lezione", C8: "Metodo · Programmi", C9: "Gruppi e orari", C10: "Allievi del centro", C11: "Progressi per fascia",
  C12: "Formazione maestri", C13: "Segnalazioni", C14: "Avvisi", C15: "Impostazioni centro", C16: "Corsi e quote", C17: "Pagamenti e incassi",
  C18: "Mappa dei campi", C19: "Campi e maestri", C20: "Organizzazione del centro", C21: "Ruolo e permessi", R1: "Area · panoramica", R2: "Avviso all'area",
  M1: "Oggi", M2: "I miei gruppi", M3: "I miei allievi", M4: "Scheda allievo", M5: "Piano lezione", M6: "Lezione in corso", M7: "Chiusura lezione",
  M8: "Valutazioni periodiche", M9: "Il mio Metodo", M10: "Messaggi", M11: "La mia formazione", M12: "Avviso ai miei allievi", M13: "Notifiche e cambi",
  G1: "Home genitore", G2: "Calendario", G3: "Progressi", G4: "Report del mese", G5: "Messaggi", G6: "Qualcosa non va?", G7: "Figli e consensi", G8: "Pagamenti",
  A1: "Il mio percorso", A2: "Compiti a casa", A3: "Parla con il maestro", A4: "Qualcosa non va?", A5: "Avvisa che non vieni", A6: "Le mie notifiche",
  CHAT: "Conversazione", inArrivo: "In arrivo", testo: "Questa schermata è in costruzione.",
};
const T = { it: IT, en: { ...IT } } as { it: Record<string, string>; en: Record<string, string> };

/** Pagina provvisoria: tiene viva la navigazione finché l'area responsabile non scrive la schermata vera. */
export function Segnaposto({ codice, ruolo, tab }: { codice: keyof typeof IT; ruolo?: RuoloBarra; tab?: string }) {
  const t = useT(T);
  const { centro, ruolo: r } = useCentro();
  const rb = ruolo ?? ruoloBarra(r);
  const home = homeRuolo(centro.slug, rb);
  return (
    <SchermoCentro ruolo={rb} tab={tab} sopra={String(codice) === "CHAT" ? undefined : codice} titolo={t[codice]} indietro={tab && tab !== "centro" && tab !== "oggi" && tab !== "home" && tab !== "percorso" && tab !== "area" ? home : undefined}>
      <Vuoto titolo={t.inArrivo} testo={t.testo} icona="clock" />
    </SchermoCentro>
  );
}
