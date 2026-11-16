"use client";
// Foto e video sul bucket privato "centri" (cartella centro_id/...): link firmati a tempo e caricamento.
import type { SupabaseClient } from "@supabase/supabase-js";
import { estensione } from "./util";

const BUCKET = "centri";

// Il link dura un'ora: si riusa per 50 minuti, così riaprire lo stesso video non chiede un nuovo link ogni volta.
// I link si chiedono solo quando servono (all'apertura del file), mai in anticipo per tutta la lista.
const DURATA_S = 3600;
const RIUSO_MS = 50 * 60_000;
const firmati = new Map<string, { url: string; quando: number }>();

/** Link a tempo (1 ora) per guardare un file privato; null se il file non c'è o non si può leggere. */
export async function urlFirmato(sb: SupabaseClient, path: string): Promise<string | null> {
  const c = firmati.get(path);
  if (c && Date.now() - c.quando < RIUSO_MS) return c.url;
  const r = await sb.storage.from(BUCKET).createSignedUrl(path, DURATA_S);
  if (r.error) return null;
  firmati.set(path, { url: r.data.signedUrl, quando: Date.now() });
  return r.data.signedUrl;
}

export const eVideo = (path: string) => /\.(mp4|mov|m4v|webm|3gp)$/i.test(path);

/** Carica un file in centro_id/<cartella>/<nome>.<ext> e restituisce il percorso, oppure l'errore. */
export async function caricaMedia(
  sb: SupabaseClient, centroId: string, cartella: string, nome: string, file: File,
): Promise<{ path: string; errore: null } | { path: null; errore: string }> {
  const path = `${centroId}/${cartella}/${nome}-${Date.now()}.${estensione(file.name)}`;
  const r = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  return r.error ? { path: null, errore: r.error.message } : { path, errore: null };
}
