import "server-only";
import type { Deposito } from "@/lib/motore";

type Rpc = (nome: string, argomenti: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Deposito della voce su tabella (motore_audio), l'MP3 in base64.
 * Serve quando su Vercel manca MP_SUPABASE_SERVICE_ROLE_KEY: senza quella chiave Storage non si può scrivere dal server,
 * mentre le funzioni motore_audio_* si aprono col token del server come tutte le altre funzioni server_*.
 * Una frase di voce pesa poche decine di KB: la base64 in una riga di tabella è sopportabile e si può spostare su Storage più avanti.
 *
 * Non si salvano gli audio più grandi di SOGLIA_AUDIO_BYTE: la voce si pronuncia lo stesso, solo non resta in memoria.
 * Perché 256 KB: un MP3 di una frase breve (5-10 secondi, anche a 128 kbit/s = 16 KB al secondo) pesa tra 40 e 160 KB;
 * 256 KB sono circa 16 secondi a 128 kbit/s, cioè una frase lunga. Oltre, di solito è un testo scritto apposta per riempire il
 * database (e una frase così lunga non tornerebbe uguale abbastanza spesso da far risparmiare). In base64 diventano circa 340 KB.
 * Il database ha in più un tetto sul totale conservato (migrazione 0012d).
 */
export const SOGLIA_AUDIO_BYTE = 256 * 1024;

export function depositoTabella(opz: { rpc: Rpc; token?: string }): Deposito {
  return {
    async leggi(chiave) {
      const { data, error } = await opz.rpc("motore_audio_leggi", { p_token: opz.token, p_chiave: chiave });
      if (error) throw new Error(error.message);
      const r = data as { mime?: unknown; dati?: unknown } | null;
      if (!r || typeof r.dati !== "string") return null;
      return { dati: new Uint8Array(Buffer.from(r.dati, "base64")), mime: typeof r.mime === "string" ? r.mime : "audio/mpeg" };
    },
    async scrivi(chiave, dati, mime) {
      if (dati.byteLength > SOGLIA_AUDIO_BYTE) return; // troppo grande per conservarlo: si è già pronunciato, basta così
      // Se il database ha raggiunto il tetto non scrive e non dà errore: la voce di adesso è buona lo stesso.
      const { error } = await opz.rpc("motore_audio_scrivi", {
        p_token: opz.token,
        p_chiave: chiave,
        p_mime: mime,
        p_dati: Buffer.from(dati).toString("base64"),
      });
      if (error) throw new Error(error.message);
    },
  };
}
