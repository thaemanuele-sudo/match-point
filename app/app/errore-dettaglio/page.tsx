"use client";
import { Suspense } from "react";
import { ErroreDettaglio } from "@/components/app/tecnica/ErroreDettaglio";

// useSearchParams (?id=) richiede un Suspense nelle pagine che si generano in anticipo
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ErroreDettaglio />
    </Suspense>
  );
}
