import { redirect } from "next/navigation";

/** La voce "Metodo" della barra del DT apre i Programmi (come nel mockup). */
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/c/${slug}/dt/metodo/programmi`);
}
