import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";
import type { CentroPubblico as RigaPubblica } from "./tipi";

export type CentroPubblico = Pick<RigaPubblica, "slug" | "nome" | "nome_app" | "colore" | "colore_ink" | "logo_path">;

/**
 * Dati di marchio del centro per metadata e manifest, tramite la RPC `centro_pubblico(slug)`: è eseguibile anche
 * da anonimi (il browser scarica il manifest senza cookie) ed espone solo i campi di marchio, mai le tabelle.
 * Si usa la chiave anonima del progetto, non la sessione né la service role: il risultato è identico per tutti.
 * Se il centro non esiste o la lettura fallisce si torna null e si usano i valori di Match Point.
 * `cache` evita di leggere due volte nella stessa richiesta (layout + generateMetadata).
 */
export const centroPubblico = cache(async (slug: string): Promise<CentroPubblico | null> => {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.rpc("centro_pubblico", { slug });
    if (error || !data) return null;
    return data as CentroPubblico;
  } catch {
    return null;
  }
});
