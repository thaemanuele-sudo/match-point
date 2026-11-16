import "server-only";
import { cache } from "react";
import { supabaseAnon, supabaseServer } from "@/lib/supabase/server";
import type { MarchioCentro } from "./brand";

export type CentroPubblico = MarchioCentro & { slug: string; nome: string };
const COLONNE = "slug,nome,nome_app,colore,colore_ink,logo_path";

/**
 * Dati di marchio del centro per metadata e manifest. Prima con la sessione dell'utente (RLS dei membri),
 * poi senza sessione: il manifest viene scaricato dal browser senza cookie, quindi la lettura anonima di questi
 * soli campi serve all'installazione della PWA. Se il database non la consente si usano i valori di Match Point.
 * `cache` evita di leggere due volte nella stessa richiesta (layout + generateMetadata).
 */
export const centroPubblico = cache(async (slug: string): Promise<CentroPubblico | null> => {
  try {
    const sb = await supabaseServer();
    const { data } = await sb.from("centri").select(COLONNE).eq("slug", slug).maybeSingle();
    if (data) return data as CentroPubblico;
  } catch {
    /* nessuna sessione: si prova in anonimo */
  }
  try {
    const { data } = await supabaseAnon().from("centri").select(COLONNE).eq("slug", slug).maybeSingle();
    return (data as CentroPubblico | null) ?? null;
  } catch {
    return null;
  }
});
