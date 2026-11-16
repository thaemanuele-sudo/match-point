import type { Colpo, VideoTecnica } from "@/lib/types";
import type { Lingua } from "@/lib/i18n/lingua";

/** Nomi dei colpi nelle due lingue (gli stessi dei disegni della scheda Tecnica). */
export const NOME_COLPO: Record<Lingua, Record<Colpo, string>> = {
  it: { diritto: "Diritto", rovescio: "Rovescio", servizio: "Servizio", volee: "Volée", smash: "Smash", back: "Back", risposta: "Risposta" },
  en: { diritto: "Forehand", rovescio: "Backhand", servizio: "Serve", volee: "Volley", smash: "Overhead", back: "Slice", risposta: "Return" },
};

export const NOME_TIPO: Record<Lingua, Record<VideoTecnica["tipo"], string>> = {
  it: { errore: "Errore", correzione: "Correzione" },
  en: { errore: "Error", correzione: "Correction" },
};

/** Colori dei disegni: rosso per l'errore (A), verde per il corretto (B). */
export const COLORE_TIPO: Record<VideoTecnica["tipo"], string> = { errore: "#FF5A5F", correzione: "#4CD07D" };
export const LETTERA_TIPO: Record<VideoTecnica["tipo"], string> = { errore: "A", correzione: "B" };

/** Indirizzo del lettore di un video. */
export const hrefVideo = (id: string) => `/app/tecnica/video/${id}`;
