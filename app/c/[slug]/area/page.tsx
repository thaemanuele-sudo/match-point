"use client";
// R1 Area, panoramica
import { Suspense } from "react";
import AreaPanoramica from "@/components/centro/org/AreaPanoramica";

// useSearchParams (filtro ?area=) richiede un confine Suspense.
export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <AreaPanoramica />
    </Suspense>
  );
}
