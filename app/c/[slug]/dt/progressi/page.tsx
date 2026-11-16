"use client";
// C11 Progressi per fascia
import { Suspense } from "react";
import CentroProgressi from "@/components/centro/org/Progressi";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroProgressi />
    </Suspense>
  );
}
