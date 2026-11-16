// Metadata di ogni pagina del sito (IT su "/", EN su "/en"): titolo, lingue alternative e anteprima social col poster del video.
import type { Metadata } from "next";
import type { Dizionario } from "./tipi";

export function metaPagina(d: Dizionario): Metadata {
  const poster = `/sito/video/poster-${d.lang}.jpg`;
  return {
    title: { absolute: d.meta.titolo },
    description: d.meta.descrizione,
    alternates: {
      canonical: d.percorso,
      languages: { it: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      url: d.percorso,
      siteName: "Match Point",
      title: d.meta.titolo,
      description: d.meta.descrizione,
      locale: d.meta.locale,
      alternateLocale: d.lang === "it" ? ["en_US"] : ["it_IT"],
      images: [{ url: poster, width: 1280, height: 720, alt: d.meta.videoAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: d.meta.titolo,
      description: d.meta.descrizione,
      images: [poster],
    },
  };
}
