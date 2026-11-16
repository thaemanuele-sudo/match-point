"use client";
import { useParams } from "next/navigation";
import { LezioneInCorso } from "@/components/centro/maestro/LezioneInCorso";

// M6 · Lezione in corso
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <LezioneInCorso id={id} />;
}
