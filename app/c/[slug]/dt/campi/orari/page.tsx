"use client";
// C19 Campi e maestri
import { Suspense } from "react";
import CentroCampiOrari from "@/components/centro/org/CampiOrari";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroCampiOrari />
    </Suspense>
  );
}
