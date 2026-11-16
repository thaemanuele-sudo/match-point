import { coloriCentro, nomeApp, urlLogo } from "@/lib/centro/brand";
import { centroPubblico } from "@/lib/centro/pubblico";

// Manifest PWA del centro: le famiglie installano "TC Brera" sul telefono, con nome e icona del centro.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await centroPubblico(slug);
  const nome = nomeApp(c);
  const logo = urlLogo(c?.logo_path);
  const { brand } = coloriCentro(c);
  const base = `/c/${encodeURIComponent(slug)}`;
  const icone = logo
    ? [
        { src: logo, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: logo, sizes: "192x192", type: "image/png", purpose: "any" },
      ]
    : [
        { src: "/icona.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/icona-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icona-180.png", sizes: "180x180", type: "image/png" },
      ];
  const corpo = {
    name: nome,
    short_name: nome.length > 12 ? nome.slice(0, 12) : nome,
    start_url: base,
    scope: `${base}/`,
    id: base,
    display: "standalone",
    background_color: "#000000",
    theme_color: brand,
    lang: "it",
    icons: icone,
  };
  return new Response(JSON.stringify(corpo), {
    headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
