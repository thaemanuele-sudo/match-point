"use client";
import { useEffect, useState } from "react";

/** Chiede al server se il pagamento con carta è attivo (chiavi Stripe presenti). null = ancora non si sa. */
export function useCartaAttiva(): boolean | null {
  const [v, setV] = useState<boolean | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch("/api/centro/pagamenti/checkout", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { attivo?: boolean }) => vivo && setV(!!j.attivo))
      .catch(() => vivo && setV(false));
    return () => {
      vivo = false;
    };
  }, []);
  return v;
}
