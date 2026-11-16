// Forma comune dei dizionari del sito (it.ts ed en.ts): se manca una chiave, tsc lo segnala.
import type { GruppoId, NomeSchermata } from "./schermate";

export type LinguaSito = "it" | "en";

export type TestoFunzione = {
  occhiello: string;
  titolo: string;
  /** "Cosa fa." in grassetto + frase */
  cosa: string;
  testo: string;
};

export type Dizionario = {
  lang: LinguaSito;
  /** indirizzo di questa lingua e dell'altra */
  percorso: string;
  percorsoAltro: string;
  meta: { titolo: string; descrizione: string; locale: string; videoAlt: string };
  salta: string;
  /** etichetta in grassetto prima della frase "cosa" ("Cosa fa.") */
  cosaEtichetta: string;
  barra: {
    marchioAria: string;
    navAria: string;
    voci: { href: string; label: string }[];
    linguaAria: string;
    apriApp: string;
  };
  apertura: {
    titolo1: string;
    titolo2: string;
    sottotitolo: string;
    cta: string;
    ctaSecondaria: string;
    videoTitolo: string;
    videoDurata: string;
    play: string;
  };
  funzioni: Record<string, TestoFunzione>;
  galleria: {
    occhiello: string;
    titolo: string;
    intro: string;
    filtriAria: string;
    tutte: string;
    filtri: Record<GruppoId, string>;
    ingrandisci: string;
    chiudi: string;
    precedente: string;
    successivo: string;
    /** "{n}" e "{tot}" sono sostituiti */
    contatore: string;
    schermata: string;
  };
  chiusura: { titolo: string; testo: string; inizia: string; accedi: string };
  piede: { diritti: string; lingua: string };
  /** titolo di ogni schermata (didascalia e testo alternativo) */
  schermate: Record<NomeSchermata, string>;
};
