"use client";
import { useParams } from "next/navigation";
import { SchedaAllievo } from "@/components/centro/maestro/SchedaAllievo";

// M4 · Scheda allievo
export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return <SchedaAllievo id={id} />;
}
