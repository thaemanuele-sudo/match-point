import { SUPABASE_URL } from "@/lib/supabase/config";

/** Indirizzo pubblico di un file del bucket "contenuti" (video e copertine caricati dall'admin). */
export function urlContenuto(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/contenuti/${path.replace(/^\/+/, "")}`;
}
