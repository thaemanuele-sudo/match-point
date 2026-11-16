"use client";
// C20 Organizzazione del centro
import { Suspense } from "react";
import CentroOrganigramma from "@/components/centro/org/Organigramma";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <CentroOrganigramma />
    </Suspense>
  );
}
