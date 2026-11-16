"use client";
import { useParams } from "next/navigation";
import { PianoLezione } from "@/components/centro/maestro/PianoLezione";

// M5 · Piano lezione. L'id "nuova" (il + della barra) crea la prossima lezione dal programma del gruppo.
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <PianoLezione id={id} />;
}
