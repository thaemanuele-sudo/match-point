import "server-only";
import type { Deposito } from "@/lib/motore";

type Rpc = (nome: string, argomenti: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Deposito della voce su tabella (motore_audio), l'MP3 in base64.
 * Serve quando su Vercel manca MP_SUPABASE_SERVICE_ROLE_KEY: senza quella chiave Storage non si può scrivere dal server,
 * mentre le funzioni motore_audio_* si aprono col token del server come tutte le altre funzioni server_*.
 * Una frase di voce pesa poche decine di KB: la base64 in una riga di tabella è sopportabile e si può spostare su Storage più avanti.
 */
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
