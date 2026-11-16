"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

// Indirizzi delle pagine di ingresso (non sono in lib/rotte.ts, che è condiviso).
export const PAG_ACCESSO = "/app/accesso";
export const PAG_REGISTRATI = "/app/registrati";
export const PAG_RECUPERO = "/app/recupero";
export const PAG_ESCI = "/app/esci";

/** Accetta solo percorsi interni dell'app: evita redirect verso siti esterni o verso /app/esci (che scollegherebbe subito). */
export function dopoSicuro(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/app") || raw.startsWith("//") || raw.startsWith(PAG_ESCI)) return "";
  return raw;
}

/** Aggiunge ?dopo=<percorso> a un link, se c'è. */
export const conDopo = (path: string, dopo: string) => (dopo ? `${path}?dopo=${encodeURIComponent(dopo)}` : path);

/** Legge ?dopo dall'indirizzo (nel browser, dopo il montaggio: niente useSearchParams, quindi niente Suspense). */
export function useDopo(): string {
  const [dopo, setDopo] = useState("");
  useEffect(() => {
    setDopo(dopoSicuro(new URLSearchParams(window.location.search).get("dopo")));
  }, []);
  return dopo;
}

/** Esce e torna a Benvenuto con un ricaricamento completo, così il middleware vede i cookie puliti. */
export async function esci() {
  try {
    await supabaseBrowser().auth.signOut();
  } finally {
    window.location.replace("/app/benvenuto");
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Telefono con prefisso internazionale: toglie spazi e simboli, richiede +<prefisso><numero> (7-15 cifre). */
export function normalizzaTelefono(v: string): string | null {
  const s = v.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}
