"use client";
/**
 * Unico punto in cui l'area F2 usa <SchermoCentro> della fondazione (components/centro/Schermo.tsx).
 * Così, se la fondazione cambia l'esportazione o il tipo delle schede, si corregge qui e non in 15 file.
 */
import type { ReactNode } from "react";
import * as Mod from "@/components/centro/Schermo";
import type { RuoloSchermo } from "./comuni";

type Props = {
  ruolo: RuoloSchermo;
  tab?: string;
  titolo: ReactNode;
  sopra?: ReactNode;
  indietro?: string | boolean;
  azioni?: ReactNode;
  largo?: boolean;
  children: ReactNode;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Base: (p: any) => ReactNode = (Mod as any).SchermoCentro ?? (Mod as any).default;

export default function Sch(p: Props) {
  return <Base {...p} />;
}
