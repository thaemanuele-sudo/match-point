import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/components/centro/centro.css";
import { CentroProvider } from "@/lib/centro/contesto";
import { coloriCentro, nomeApp, urlLogo } from "@/lib/centro/brand";
import { centroPubblico } from "@/lib/centro/pubblico";

type P = { params: Promise<{ slug: string }> };

// Ogni centro ha la sua app: nome, icona e colori vengono dal centro (manifest dinamico incluso).
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = await centroPubblico(slug);
  const nome = nomeApp(c);
  const logo = urlLogo(c?.logo_path);
  return {
    title: { default: nome, template: `%s · ${nome}` },
    applicationName: nome,
    manifest: `/c/${encodeURIComponent(slug)}/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: nome },
    icons: logo ? { icon: logo, apple: logo } : { icon: "/icona.svg", apple: "/icona-180.png" },
    // l'app del centro non va nei motori di ricerca
    robots: { index: false, follow: false },
  };
}

export async function generateViewport({ params }: P): Promise<Viewport> {
  await params;
  // barra di stato nera come lo sfondo dell'app; il colore del centro è solo un accento
  return { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "dark" };
}

export default async function CentroLayout({ params, children }: P & { children: ReactNode }) {
  const { slug } = await params;
  const c = await centroPubblico(slug);
  const { brand } = coloriCentro(c);
  // il marchio arriva già dal server: niente lampo di colore prima che il browser carichi il centro
  return (
    <CentroProvider slug={slug} brandIniziale={c ? { colore: c.colore, colore_ink: c.colore_ink } : { colore: brand }}>
      {children}
    </CentroProvider>
  );
}
