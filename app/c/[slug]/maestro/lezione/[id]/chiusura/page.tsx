"use client";
import { useParams } from "next/navigation";
import { Chiusura } from "@/components/centro/maestro/Chiusura";

// M7 · Chiusura lezione
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <Chiusura id={id} />;
}
