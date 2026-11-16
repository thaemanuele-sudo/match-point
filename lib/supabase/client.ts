"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Client Supabase del browser (sessione nei cookie, condivisa con il server). */
export function supabaseBrowser() {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return client;
}
