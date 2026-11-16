"use client";
import { Main } from "@/components/app/coach/Main";
import { MieiCentri } from "@/components/centro/accesso/MieiCentri";

export default function Pagina() {
  return (
    <>
      {/* compare solo a chi ha un profilo in un centro */}
      <MieiCentri />
      <Main />
    </>
  );
}
