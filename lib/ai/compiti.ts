import "server-only";
import type { Catalogo, Compito, Contenuto, Messaggio, ModelloInfo, Parte } from "@/lib/motore";
import type { Impostazioni } from "./impostazioni";
import { NOME_LINGUA, type LinguaAI } from "./lingue";

/*
 * Compiti di Match Point per il motore. I prompt sono quelli di sempre, spostati qui dalle rotte (non riscritti):
 * la strada vecchia e quella del motore leggono gli stessi testi, quindi non possono divergere.
 * Le parti che non cambiano da una richiesta all'altra sono marcate `stabile`: Anthropic le tiene in cache.
 */

export const ID_CHAT = "matchpoint/chat";
export const ID_ANALISI = "matchpoint/analisi-video";
export const ID_RIASSUNTO = "matchpoint/riassunto-lezione";

// Si alza quando cambia un prompt o la forma della risposta: cache e statistiche ripartono da zero.
const VERSIONE_BASE = 1;

// ===================== Coach AI (chat) =====================

export const SISTEMA_CHAT = {
  it: "Sei il Coach AI di Match Point, allenatore di tennis esperto per allievi dai 10 ai 18 anni e adulti: tecnica, tattica, atletica; risposte brevi, concrete, sicure per i ragazzi; se si parla di dolore o infortuni consiglia di fermarsi e sentire maestro/medico. Rispondi in italiano.",
  en: "You are the Match Point AI Coach, an expert tennis coach for players aged 10 to 18 and adults: technique, tactics, fitness; short, concrete answers that are safe for young players; if pain or injuries come up, advise stopping and speaking to a coach/doctor. Answer in English.",
};

/** Parte fissa del prompt di sistema della chat, nella lingua dell'utente. */
export function baseSistemaChat(lingua: LinguaAI): string {
  // il prompt base è in italiano o inglese; per francese, tedesco e spagnolo si chiede di rispondere in quella lingua
  return lingua === "it" ? SISTEMA_CHAT.it : SISTEMA_CHAT.en.replace("Answer in English.", `Answer in ${NOME_LINGUA[lingua]}.`);
}

export type MsgChat = { ruolo: "user" | "assistant"; testo: string };
/** `base` + `coda` = il prompt di sistema intero; la coda (profilo, contesto) cambia a ogni utente. */
export type IngressoChat = { base: string; coda: string; messaggi: MsgChat[] };

// ===================== Analisi video =====================

const ISTRUZIONI_INTRO = (lingua: LinguaAI, colpo: string) =>
  lingua !== "it"
    ? "You are a tennis biomechanics expert. You receive sequential video frames (numbered from 1) of a player performing: " + colpo + ". Analyse the technique, aimed at players aged 10-18 and adults; be concrete and safe. Write every text field in " + NOME_LINGUA[lingua] + "."
    : "Sei un biomeccanico del tennis esperto. Ricevi fotogrammi in sequenza (numerati da 1) di un giocatore che esegue: " + colpo + ". Analizza la tecnica, per allievi dai 10 ai 18 anni e adulti; sii concreto e prudente. Scrivi ogni testo in italiano.";

const ISTRUZIONI_CODA = `Codici errore: prefisso del colpo (DR diritto, RV rovescio, SV servizio, VL volée, SM smash, BK back) + "-" + numero a due cifre, es. "DR-02".
Rispondi SOLO con un oggetto JSON, senza testo prima o dopo e senza markdown, con questa forma:
{"colpo":string,"punteggio":0-100,"sintesi":string,"fasi":[{"nome":string,"voto":0-10,"nota":string}],"errori":[{"codice":string,"titolo":string,"descrizione":string,"gravita":"alta"|"media"|"bassa","fotogramma":numero del fotogramma}],"correzioni":[{"titolo":string,"descrizione":string}],"esercizi":[{"titolo":string,"dosaggio":string}]}`;

/** Prompt di sistema dell'analisi, per intero (strada vecchia). */
export const ISTRUZIONI = (lingua: LinguaAI, colpo: string) => `${ISTRUZIONI_INTRO(lingua, colpo)}\n\n${ISTRUZIONI_CODA}`;

export type IngressoAnalisi = { lingua: LinguaAI; colpo: string; fotogrammi: string[]; /* JPEG in base64, senza prefisso */ nota: string };

/** Testo che chiude il messaggio con i fotogrammi. */
export const testoFinaleAnalisi = (nota: string) =>
  nota ? `Nota del giocatore: ${nota}\nAnalizza e rispondi solo con il JSON.` : "Analizza e rispondi solo con il JSON.";

/** L'analisi chiede JSON nel prompt (non nello schema, come sempre): qui si controlla che la risposta lo contenga davvero. */
export function formatoAnalisiValido(r: Contenuto): boolean {
  const a = r.testo.indexOf("{");
  const b = r.testo.lastIndexOf("}");
  if (a < 0 || b <= a) return false;
  try {
    const o = JSON.parse(r.testo.slice(a, b + 1)) as Record<string, unknown> | null;
    return !!o && typeof o === "object" && typeof o.sintesi === "string" && Array.isArray(o.fasi) && Array.isArray(o.errori) && Number.isFinite(Number(o.punteggio));
  } catch {
    return false;
  }
}

// ===================== Riassunto della lezione =====================

export const SISTEMA_RIASSUNTO =
  "Sei il Coach AI di un centro di tennis. Scrivi per le famiglie un breve riassunto della lezione appena svolta dal gruppo, " +
  "in italiano, con tono caldo, concreto e positivo, in 3-4 frasi (massimo 70 parole), senza elenchi e senza emoji. " +
  "Racconta su cosa ha lavorato il gruppo e come è andata, e chiudi con il compito per casa se c'è. " +
  "Non nominare singoli bambini, non dare giudizi sul corpo o sul talento, non inventare fatti che non ti vengono dati. " +
  "Rispondi solo con il testo del riassunto.";

export type IngressoRiassunto = { lezione_id: string; prompt: string };

// ===================== Definizione dei compiti =====================

const stabile = (testo: string): Parte => ({ tipo: "testo", testo, stabile: true });
const normale = (testo: string): Parte => ({ tipo: "testo", testo });

/** Modelli Claude meno cari del riferimento (per prezzo in uscita), dal più economico: sono i candidati da mettere alla prova. */
export function candidatiPiuEconomici(rif: ModelloInfo, catalogo: Catalogo): string[] {
  return catalogo
    .tutti()
    .filter((m) => m.fornitore === "anthropic" && m.prezzo_out < rif.prezzo_out)
    .sort((a, b) => a.prezzo_out - b.prezzo_out)
    .map((m) => m.id);
}

/**
 * Versione del compito = versione base × 10 + posizione del riferimento per prezzo (0 il più economico).
 * Se l'admin cambia il modello di riferimento le statistiche dei candidati (confrontati col vecchio riferimento) non valgono più:
 * con un'altra versione ripartono da zero, e per la stessa ragione la cache delle risposte non si mescola.
 */
function versioneDi(rif: ModelloInfo, catalogo: Catalogo): number {
  const anthropic = catalogo.tutti().filter((m) => m.fornitore === "anthropic").sort((a, b) => a.prezzo_out - b.prezzo_out);
  return VERSIONE_BASE * 10 + Math.max(0, anthropic.findIndex((m) => m.id === rif.id));
}

/** Null se il modello configurato non è nel catalogo: in quel caso si resta sulla strada di sempre. */
export function creaCompiti(imp: Impostazioni, catalogo: Catalogo): Compito<any>[] | null {
  const rifChat = catalogo.modello(`anthropic/${imp.modelloChat}`);
  const rifAnalisi = catalogo.modello(`anthropic/${imp.modelloAnalisi}`);
  if (!rifChat || !rifAnalisi) return null;

  const chat: Compito<IngressoChat> = {
    id: ID_CHAT,
    versione: versioneDi(rifChat, catalogo),
    genere: "genera",
    prepara: (i) => {
      const sistema: Parte[] = [stabile(i.base)];
      if (i.coda) sistema.push(normale(i.coda));
      return [
        { ruolo: "sistema", contenuto: sistema },
        ...i.messaggi.map((m): Messaggio => ({ ruolo: m.ruolo === "user" ? "utente" : "assistente", contenuto: m.testo })),
      ];
    },
    riferimento: rifChat.id,
    candidati: candidatiPiuEconomici(rifChat, catalogo),
    // Ogni conversazione è diversa e il coach non deve ripetere una risposta data a un altro ragazzo.
    cache: { attiva: false },
    secchio: "decisore",
    rubrica:
      "Risposte di un coach di tennis a ragazzi dai 10 ai 18 anni e adulti. Una risposta è buona almeno quanto l'altra se: " +
      "(1) è tecnicamente corretta sul tennis; (2) è adatta all'età, con parole semplici e consigli sicuri per i ragazzi; " +
      "(3) è chiara, breve e concreta; (4) in caso di dolore o infortuni consiglia di fermarsi e sentire maestro o medico; " +
      "(5) risponde nella lingua della domanda. Un consiglio pericoloso o un errore tecnico grave rende la risposta peggiore, anche se scritta bene.",
    valida: (r) => r.testo.trim() !== "",
    max_token: 900,
    fornitori_ammessi: ["anthropic"],
  };

  const analisi: Compito<IngressoAnalisi> = {
    id: ID_ANALISI,
    versione: versioneDi(rifAnalisi, catalogo),
    genere: "vedi",
    prepara: (i) => {
      const contenuto: Parte[] = [];
      i.fotogrammi.forEach((b64, n) => {
        contenuto.push(normale(`Fotogramma ${n + 1}:`), { tipo: "immagine", mime: "image/jpeg", base64: b64 });
      });
      contenuto.push(normale(testoFinaleAnalisi(i.nota)));
      return [
        // L'introduzione dipende da colpo e lingua; la parte con codici e forma del JSON è sempre la stessa.
        { ruolo: "sistema", contenuto: [normale(`${ISTRUZIONI_INTRO(i.lingua, i.colpo)}\n\n`), stabile(ISTRUZIONI_CODA)] },
        { ruolo: "utente", contenuto },
      ];
    },
    riferimento: rifAnalisi.id,
    candidati: candidatiPiuEconomici(rifAnalisi, catalogo),
    cache: { attiva: false }, // i fotogrammi sono unici: una cache non scatterebbe mai
    rubrica:
      "Analisi biomeccanica di un colpo di tennis in JSON. Una analisi è buona almeno quanto l'altra se: " +
      "(1) il punteggio e i voti delle fasi sono coerenti con gli errori trovati; (2) gli errori hanno codici nel formato richiesto e descrizioni concrete; " +
      "(3) correzioni ed esercizi sono utili, prudenti e adatti a ragazzi dai 10 ai 18 anni; (4) è nella lingua richiesta; " +
      "(5) il JSON ha tutti i campi. Un'analisi che inventa errori evidentemente assenti o che consiglia esercizi rischiosi è peggiore.",
    valida: formatoAnalisiValido,
    max_token: 2500,
    fornitori_ammessi: ["anthropic"],
  };

  const riassunto: Compito<IngressoRiassunto> = {
    id: ID_RIASSUNTO,
    versione: versioneDi(rifChat, catalogo),
    genere: "genera",
    prepara: (i) => [
      { ruolo: "sistema", contenuto: [stabile(SISTEMA_RIASSUNTO)] },
      { ruolo: "utente", contenuto: i.prompt },
    ],
    riferimento: rifChat.id,
    candidati: candidatiPiuEconomici(rifChat, catalogo),
    // Stessa lezione e stesso lavoro svolto = stesso riassunto: se la bozza non piace il maestro la riscrive lui,
    // e se la rifiuta il motore la toglie dalla cache (esito negativo).
    cache: { attiva: true, durata_s: 30 * 86_400, chiave: (i) => [i.lezione_id, i.prompt] },
    rubrica:
      "Riassunto di una lezione di tennis per le famiglie. Un riassunto è buono almeno quanto l'altro se: " +
      "(1) è fedele ai blocchi svolti e non inventa fatti; (2) il tono è caldo, concreto e positivo, adatto alle famiglie; " +
      "(3) sta in 3-4 frasi (massimo 70 parole), senza elenchi né emoji; (4) non nomina singoli bambini e non giudica corpo o talento; " +
      "(5) chiude con il compito per casa se c'è. Un nome di bambino o un fatto inventato rende il riassunto peggiore.",
    valida: (r) => r.testo.trim() !== "" && r.testo.length <= 1200,
    max_token: 400,
    fornitori_ammessi: ["anthropic"],
  };

  return [chat, analisi, riassunto];
}
