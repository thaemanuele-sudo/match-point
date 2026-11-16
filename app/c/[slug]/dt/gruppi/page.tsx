"use client";
// C9 Gruppi e orari
import { Suspense } from "react";
import CentroGruppi from "@/components/centro/org/Gruppi";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroGruppi />
    </Suspense>
  );
}
