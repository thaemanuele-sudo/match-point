"use client";
// C15 Impostazioni centro
import { Suspense } from "react";
import CentroImpostazioni from "@/components/centro/org/Impostazioni";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroImpostazioni />
    </Suspense>
  );
}
