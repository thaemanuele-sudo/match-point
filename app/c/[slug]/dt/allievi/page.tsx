"use client";
// C10 Allievi del centro
import { Suspense } from "react";
import CentroAllievi from "@/components/centro/org/Allievi";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroAllievi />
    </Suspense>
  );
}
