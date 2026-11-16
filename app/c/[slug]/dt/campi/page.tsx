"use client";
// C18 Mappa dei campi
import { Suspense } from "react";
import CentroCampi from "@/components/centro/org/Campi";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroCampi />
    </Suspense>
  );
}
