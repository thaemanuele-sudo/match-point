// Le 13 sezioni "funzione" del sito: id (ancora) e schermate mostrate negli iPhone.
// I testi stanno nei dizionari, così le due lingue condividono la stessa struttura.
import type { NomeSchermata } from "./schermate";

export const FUNZIONI: readonly { id: string; schermate: readonly NomeSchermata[] }[] = [
  { id: "coach", schermate: ["Main", "Carica", "Analisi"] },
  { id: "analisi", schermate: ["AnalisiInCorso", "PoseEstimation", "ErroreDettaglio"] },
  { id: "chat", schermate: ["ChatAI", "Vocale"] },
  { id: "videolab", schermate: ["VideoLab", "BallTracking", "Heatmap", "Confronto"] },
  { id: "tecnica", schermate: ["Tecnica", "TecnicaColpo", "Servizio"] },
  { id: "errori", schermate: ["ErroriServizio", "LibreriaVideo"] },
  { id: "tattica", schermate: ["Tattica", "SchemiFascia", "CatalogoStrategie"] },
  { id: "partita", schermate: ["PartitaLive", "MappaColpi", "StatPartita"] },
  { id: "atletica", schermate: ["Atletica", "ProfiloAtletico", "SessioneAtletica"] },
  { id: "microciclo", schermate: ["Microciclo", "Obiettivi", "Progressi"] },
  { id: "famiglia", schermate: ["HomeAllievo", "FeedbackBambino", "ReportFamiglia"] },
  { id: "maestri", schermate: ["Allievi", "RegoleMaestro", "DashboardClub"] },
  { id: "watch", schermate: ["WatchOut", "WatchPunteggio", "WatchAllenamento"] },
] as const;

export type IdFunzione = (typeof FUNZIONI)[number]["id"];
