"use client";
/**
 * Unico punto in cui l'area F2 usa <SchermoCentro> della fondazione (components/centro/Schermo.tsx):
 * se la fondazione cambia le proprietà si corregge qui e non in ogni schermata.
 */
import type { ReactNode } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import type { RuoloBarra } from "@/components/centro/barre";

type Props = {
  ruolo: RuoloBarra;
  tab?: string;
  titolo?: ReactNode;
  sopra?: ReactNode;
  indietro?: string | true;
  azioni?: ReactNode;
  largo?: boolean;
  children: ReactNode;
};

export default function Sch(p: Props) {
  return <SchermoCentro {...p} />;
}
