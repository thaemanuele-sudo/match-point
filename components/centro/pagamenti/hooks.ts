"use client";
import { useEffect, useState } from "react";

// La risposta non cambia finché il server non cambia le variabili d'ambiente: una richiesta sola per caricamento della pagina,
// non una a ogni schermata dei pagamenti che si apre.
let risposta: Promise<boolean> | null = null;
function chiediCartaAttiva(): Promise<boolean> {
  if (!risposta) {
    risposta = fetch("/api/centro/pagamenti/checkout", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { attivo?: boolean }) => !!j.attivo)
      .catch(() => { risposta = null; return false; }); // rete assente: alla prossima apertura si riprova
  }
  return risposta;
}

/** Chiede al server se il pagamento con carta è attivo (chiavi Stripe presenti). null = ancora non si sa. */
export function useCartaAttiva(): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    chiediCartaAttiva().then((x) => vivo && setV(x));
    return () => {
      vivo = false;
    };
  }, []);
  return v;
}
