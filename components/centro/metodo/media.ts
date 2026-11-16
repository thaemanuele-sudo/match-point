import type { SupabaseClient } from "@supabase/supabase-js";

/** Bucket privato dei centri: i file stanno in `centro_id/...`. */
const BUCKET = "centri";
export const MAX_VIDEO_MB = 100;

/** Carica un video dell'esercizio e restituisce il percorso nel bucket. */
export async function caricaVideo(sb: SupabaseClient, centroId: string, cartella: string, file: File): Promise<string> {
  const pulito = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-60);
  const percorso = `${centroId}/${cartella}/${Date.now()}-${pulito}`;
  const { error } = await sb.storage.from(BUCKET).upload(percorso, file, { contentType: file.type || "video/mp4", upsert: false });
  if (error) throw error;
  return percorso;
}

/** Link firmato a tempo (il bucket è privato). */
export async function urlVideo(sb: SupabaseClient, percorso: string): Promise<string | null> {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(percorso, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}
