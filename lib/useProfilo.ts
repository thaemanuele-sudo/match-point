"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profilo } from "@/lib/types";

/** Profilo dell'utente collegato (null mentre carica o se non c'è sessione). */
export function useProfilo() {
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    const sb = supabaseBrowser();
    sb.auth.getUser().then(async ({ data }: { data: { user: { id: string } | null } }) => {
      if (!data.user) { if (vivo) setPronto(true); return; }
      const { data: p } = await sb.from("profiles").select("*").eq("id", data.user.id).single();
      if (vivo) { setProfilo((p as Profilo) ?? null); setPronto(true); }
    });
    return () => { vivo = false; };
  }, []);
  return { profilo, pronto };
}

export const iniziali = (p: Pick<Profilo, "nome" | "cognome"> | null) =>
  p ? ((p.nome[0] ?? "") + (p.cognome[0] ?? "")).toUpperCase() || "MP" : "MP";
