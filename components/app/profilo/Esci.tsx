"use client";
import { useEffect } from "react";
import { useT } from "@/lib/i18n/lingua";
import { Schermo } from "@/components/app/Schermo";
import { esci } from "./auth";

const T = { it: { uscita: "Uscita in corso…" }, en: { uscita: "Signing out…" } };

/** /app/esci: scollega l'utente e torna a Benvenuto. */
export default function Esci() {
  const t = useT(T);
  useEffect(() => { void esci(); }, []);
  return <Schermo><p className="muted" role="status">{t.uscita}</p></Schermo>;
}
