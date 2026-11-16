// Forma comune dei dizionari del sito (it, en, fr, de, es): se manca una chiave, tsc lo segnala.
import type { GruppoId, NomeSchermata } from "./schermate";

export type LinguaSito = "it" | "en" | "fr" | "de" | "es";

/** Lingue del sito con indirizzo, sigla (pillola) e nome nella lingua stessa (piè di pagina). */
export const LINGUE_SITO: readonly { lang: LinguaSito; percorso: string; sigla: string; nome: string }[] = [
  { lang: "it", percorso: "/", sigla: "IT", nome: "Italiano" },
  { lang: "en", percorso: "/en", sigla: "EN", nome: "English" },
  { lang: "fr", percorso: "/fr", sigla: "FR", nome: "Français" },
  { lang: "de", percorso: "/de", sigla: "DE", nome: "Deutsch" },
  { lang: "es", percorso: "/es", sigla: "ES", nome: "Español" },
];

/** Lingua del video/poster da mostrare: per ora il tedesco usa quello inglese (togliere "de" quando presentazione-de.mp4 è nel build). */
export const VIDEO_LINGUA: Partial<Record<LinguaSito, LinguaSito>> = {};
export const linguaVideo = (l: LinguaSito): LinguaSito => VIDEO_LINGUA[l] ?? l;

export type TestoFunzione = {
  occhiello: string;
  titolo: string;
  /** "Cosa fa." in grassetto + frase */
  cosa: string;
  testo: string;
};

export type Dizionario = {
  lang: LinguaSito;
  /** indirizzo di questa lingua */
  percorso: string;
  /** non più usato (le lingue sono 5): ignorato, può restare nei dizionari */
  percorsoAltro?: string;
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
  piede: { diritti: string; lingua?: string };
  /** titolo di ogni schermata (didascalia e testo alternativo) */
  schermate: Record<NomeSchermata, string>;
};
