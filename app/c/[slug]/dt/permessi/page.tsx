"use client";
// C21 Ruolo e permessi
import { Suspense } from "react";
import CentroRuoloPermessi from "@/components/centro/org/Permessi";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroRuoloPermessi />
    </Suspense>
  );
}
