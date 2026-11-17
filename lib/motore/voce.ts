// Copia del Motore: non modificare qui, si modifica nel repository motore
// Voce con cache: il testo si divide in frasi e ogni frase si paga una volta sola.
// Solo TypeScript, Web Crypto e i tipi del contratto: niente Buffer né API solo-Node.

import { chiaveCache, normalizzaTesto } from "./cache";
import { costo } from "./costi";
import type { Deposito, Fornitore, ModelloInfo, RichiestaParla, RisultatoParla } from "./tipi";

// ===== Divisione in frasi =====

// Abbreviazioni dopo le quali il punto NON chiude la frase (minuscole, senza il punto finale).
// "ecc" e simili restano fuori di proposito: spesso chiudono davvero la frase, e se dopo
// c'è una minuscola ci pensa già la regola generale.
const ABBREVIAZIONI = new Set([
  "sig", "sigg", "sig.ra", "sig.na", "dott", "dott.ssa", "dr", "prof", "proff", "prof.ssa",
  "ing", "avv", "arch", "geom", "rag", "on", "sen", "gen", "col", "cap", "ten", "mons",
  "s.e", "cfr", "pag", "pagg", "fig", "tel", "art", "artt", "vs", "sez", "vol", "ca",
  "mr", "mrs", "ms", "jr", "sr", "st", "nn", "es",
]);

const TERMINATORI = /[.!?…]/u;
const CHIUSURE = /["'”’»)\]]/u;
const APERTURE = /["'“‘«(\[¿¡]/u;

// Decide se il gruppo di terminatori s[i..fine] chiude davvero una frase.
// `prossimo` è la posizione del primo carattere della frase successiva.
function chiudeFrase(s: string, i: number, fine: number, prossimo: number): boolean {
  const gruppo = s.slice(i, fine + 1);
  // Punto esclamativo o interrogativo: chiude sempre.
  if (/[!?]/.test(gruppo)) return true;

  // Dopo un punto o dei puntini, una minuscola vuol dire che la frase continua ("ecc. e poi", "boh... non so").
  let k = prossimo;
  while (k < s.length && APERTURE.test(s[k])) k++;
  if (k >= s.length) return true;
  if (/\p{Ll}/u.test(s[k])) return false;

  // Un punto solo può essere un'abbreviazione o un'iniziale ("dott. Rossi", "G. Verdi").
  if (gruppo === ".") {
    let inizioParola = i;
    while (inizioParola > 0 && s[inizioParola - 1] !== " ") inizioParola--;
    const parola = s.slice(inizioParola, i).replace(/^["'“‘«(\[¿¡]+/u, "");
    if (/^\p{Lu}$/u.test(parola)) return false;
    if (ABBREVIAZIONI.has(parola.toLowerCase())) return false;
  }
  return true;
}

// Divide un paragrafo (spazi già ridotti a uno) nelle sue frasi.
function frasiDelParagrafo(s: string): string[] {
  const frasi: string[] = [];
  let inizio = 0;
  let i = 0;
  while (i < s.length) {
    if (!TERMINATORI.test(s[i])) {
      i++;
      continue;
    }
    let fine = i;
    while (fine + 1 < s.length && TERMINATORI.test(s[fine + 1])) fine++;
    let dopo = fine + 1;
    // Le virgolette o parentesi di chiusura appartengono alla frase che finisce.
    while (dopo < s.length && CHIUSURE.test(s[dopo])) dopo++;
    // Un terminatore non seguito da spazio non chiude nulla: "3.14", "sito.it".
    if (dopo < s.length && s[dopo] === " " && chiudeFrase(s, i, fine, dopo + 1)) {
      frasi.push(s.slice(inizio, dopo));
      inizio = dopo + 1;
    }
    i = dopo;
  }
  if (inizio < s.length) frasi.push(s.slice(inizio));
  return frasi.map((f) => f.trim()).filter((f) => f.length > 0);
}

// Spezza una frase più lunga del massimo: prima alle virgole (e simili), poi agli spazi, in ultimo a forza.
function spezzaLunga(frase: string, massimo: number): string[] {
  const pezzi: string[] = [];
  let resto = frase;
  while (resto.length > massimo) {
    const finestra = resto.slice(0, massimo + 1);
    let taglio = -1;

    // Un pezzo troppo corto suonerebbe a scatti: la virgola vale solo se non è troppo all'inizio.
    const minimo = Math.floor(massimo * 0.25);
    for (let k = massimo - 1; k >= 0; k--) {
      if (/[,;:]/.test(finestra[k]) && k + 1 >= minimo) {
        taglio = k + 1;
        break;
      }
    }
    if (taglio < 0) {
      const spazio = finestra.lastIndexOf(" ");
      if (spazio > 0) taglio = spazio;
    }
    // Nessun separatore: parola più lunga del massimo, si taglia a forza.
    if (taglio < 0) taglio = massimo;

    const pezzo = resto.slice(0, taglio).trim();
    if (pezzo) pezzi.push(pezzo);
    resto = resto.slice(taglio).trim();
  }
  if (resto) pezzi.push(resto);
  return pezzi;
}

/** Divide il testo in frasi di al massimo `massimo` caratteri, rispettando la punteggiatura italiana. */
export function dividiFrasi(testo: string, massimo = 300): string[] {
  const limite = Math.max(1, Math.floor(massimo));
  const frasi: string[] = [];
  // Un a capo è sempre un confine: titoli ed elenchi non hanno il punto.
  for (const riga of testo.split(/\r?\n/)) {
    const paragrafo = riga.replace(/\s+/g, " ").trim();
    if (!paragrafo) continue;
    for (const frase of frasiDelParagrafo(paragrafo)) {
      if (frase.length <= limite) frasi.push(frase);
      else frasi.push(...spezzaLunga(frase, limite));
    }
  }
  return frasi;
}

// ===== Concatenazione degli MP3 =====

// Un MP3 può iniziare con un'intestazione ID3v2 (metadati): in mezzo a un file unico
// farebbe da rumore, quindi sui pezzi successivi al primo la togliamo.
function senzaId3(dati: Uint8Array): Uint8Array {
  if (dati.length < 10 || dati[0] !== 0x49 || dati[1] !== 0x44 || dati[2] !== 0x33) return dati;
  // La dimensione è in 4 byte "syncsafe": 7 bit utili per byte.
  const dimensione = ((dati[6] & 0x7f) << 21) | ((dati[7] & 0x7f) << 14) | ((dati[8] & 0x7f) << 7) | (dati[9] & 0x7f);
  const piede = (dati[5] & 0x10) !== 0 ? 10 : 0;
  const totale = 10 + dimensione + piede;
  return totale >= dati.length ? new Uint8Array(0) : dati.subarray(totale);
}

function unisci(pezzi: Uint8Array[]): Uint8Array {
  const parti = pezzi.map((p, i) => (i === 0 ? p : senzaId3(p)));
  const lunghezza = parti.reduce((s, p) => s + p.length, 0);
  const fuori = new Uint8Array(lunghezza);
  let pos = 0;
  for (const p of parti) {
    fuori.set(p, pos);
    pos += p.length;
  }
  return fuori;
}

// ===== Voce con cache =====

const IN_PARALLELO = 3;
const MIME_PREDEFINITO = "audio/mpeg";

type Pezzo = { dati: Uint8Array; mime: string };

// Esegue `fn` su tutti gli elementi, al massimo `n` alla volta; al primo errore non ne parte nessun altro.
async function conLimite<T>(elementi: T[], n: number, fn: (e: T) => Promise<void>): Promise<void> {
  let prossimo = 0;
  let fallito = false;
  const lavoratore = async () => {
    while (!fallito && prossimo < elementi.length) {
      const e = elementi[prossimo++];
      try {
        await fn(e);
      } catch (errore) {
        fallito = true;
        throw errore;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, elementi.length) }, lavoratore));
}

function costoVoce(modello: ModelloInfo, caratteri: number): number {
  // Con zero caratteri non c'è nulla da pagare: evitiamo di dipendere da come costo() tratta lo zero.
  return caratteri > 0 ? costo(modello, { token_in: 0, token_out: 0, caratteri }) : 0;
}

export async function parlaConCache(
  r: RichiestaParla,
  dip: { fornitore: Fornitore; modello: ModelloInfo; deposito?: Deposito; app?: string },
): Promise<RisultatoParla> {
  const { fornitore, modello, deposito } = dip;
  if (!fornitore.parla) throw new Error(`Il fornitore "${fornitore.id}" non sa sintetizzare la voce`);
  const parla = fornitore.parla.bind(fornitore);

  const frasi = dividiFrasi(r.testo);
  if (frasi.length === 0) {
    return { audio: new Uint8Array(0), mime: MIME_PREDEFINITO, da_cache: true, costo_usd: 0, costo_pieno_usd: 0, caratteri_pagati: 0 };
  }
  const caratteriTotali = frasi.reduce((s, f) => s + f.length, 0);
  const costo_pieno_usd = costoVoce(modello, caratteriTotali);

  // Senza deposito non c'è dove ricordare le frasi: una chiamata sola è più economica e suona più naturale.
  if (!deposito) {
    const testo = r.testo.trim();
    const risposta = await parla({ modello, testo, voce: r.voce, lingua: r.lingua });
    const pagati = risposta.uso.caratteri ?? testo.length;
    return {
      audio: risposta.audio,
      mime: risposta.mime,
      da_cache: false,
      costo_usd: costoVoce(modello, pagati),
      costo_pieno_usd,
      caratteri_pagati: pagati,
    };
  }

  // La chiave usa il testo normalizzato: "Ciao!" e "ciao" sono la stessa frase e si pagano una volta.
  // L'app entra nella chiave: se la cache fosse comune, un'app capirebbe dall'esito "da cache" che cosa ha
  // fatto pronunciare un'altra. Il prezzo è che la stessa frase si paga una volta per app.
  const app = dip.app ?? "";
  const chiavi = await Promise.all(
    frasi.map(async (f) => `voce/${await chiaveCache([app, r.modello, r.voce, r.lingua ?? "", normalizzaTesto(f)])}.mp3`),
  );

  // Le frasi ripetute nello stesso testo si sintetizzano una volta sola.
  const pezzi = new Map<string, Pezzo>();
  const daFare = new Map<string, string>(); // chiave -> frase
  for (let i = 0; i < frasi.length; i++) if (!daFare.has(chiavi[i])) daFare.set(chiavi[i], frasi[i]);

  await Promise.all(
    [...daFare.keys()].map(async (chiave) => {
      try {
        const trovato = await deposito.leggi(chiave);
        if (trovato) {
          pezzi.set(chiave, { dati: trovato.dati, mime: trovato.mime });
          daFare.delete(chiave);
        }
      } catch {
        // Un deposito che non risponde non deve togliere la voce all'utente: si sintetizza e basta.
      }
    }),
  );

  const mancanti = [...daFare.entries()];
  let caratteri_pagati = 0;
  await conLimite(mancanti, IN_PARALLELO, async ([chiave, frase]) => {
    const risposta = await parla({ modello, testo: frase, voce: r.voce, lingua: r.lingua });
    caratteri_pagati += risposta.uso.caratteri ?? frase.length;
    pezzi.set(chiave, { dati: risposta.audio, mime: risposta.mime });
    try {
      await deposito.scrivi(chiave, risposta.audio, risposta.mime);
    } catch {
      // Salvare serve solo alla prossima volta: se fallisce, l'audio di adesso è comunque buono.
    }
  });

  const ordinati = chiavi.map((c) => pezzi.get(c)!);
  return {
    audio: unisci(ordinati.map((p) => p.dati)),
    mime: ordinati[0].mime || MIME_PREDEFINITO,
    da_cache: mancanti.length === 0,
    costo_usd: costoVoce(modello, caratteri_pagati),
    costo_pieno_usd,
    caratteri_pagati,
  };
}
