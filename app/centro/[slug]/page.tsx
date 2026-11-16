import { redirect } from "next/navigation";
import { rotta } from "@/lib/centro/rotte";

// Indirizzo comodo: /centro/tc-brera porta alla dashboard del direttore tecnico.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(rotta(slug).dt.base);
}
