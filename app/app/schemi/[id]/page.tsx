"use client";
import { useParams } from "next/navigation";
import { SchemaDettaglio } from "@/components/app/tattica/SchemaDettaglio";

// Dettaglio di uno schema animato caricato dal super admin (tabella game_schemes).
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <SchemaDettaglio id={id} />;
}
