import type { Metadata, Viewport } from "next";
// caratteri ospitati con il sito (niente richieste a Google Fonts)
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/barlow-condensed/700-italic.css";
import "@fontsource/barlow-condensed/800-italic.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/hanken-grotesk/800.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITO_URL ?? "https://match-point.vercel.app"),
  title: "Match Point · Il coach AI del tennis",
  description: "Carica un colpo, l'AI lo corregge. Tecnica, tattica e atletica per fasce d'età, con il controllo del maestro.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Match Point" },
  icons: { icon: "/icona.svg", apple: "/icona-180.png" },
};
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
