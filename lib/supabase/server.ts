import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/** Client Supabase lato server con la sessione dell'utente (cookie). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* chiamato da un Server Component: il middleware rinnova i cookie */
        }
      },
    },
  });
}

/**
 * Client senza sessione utente per le funzioni server_* (impostazioni, registro dei costi).
 * Se su Vercel c'è la chiave service_role (la aggiunge l'integrazione Supabase) il database riconosce il server
 * da quella; altrimenti le funzioni chiedono il token MP_SERVER_TOKEN.
 */
export function supabaseAnon() {
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chiave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
