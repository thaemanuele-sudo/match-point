// Metadata di ogni pagina del sito (5 lingue: "/", "/en", "/fr", "/de", "/es"): titolo, lingue alternative e anteprima social col poster del video.
import type { Metadata } from "next";
import { LINGUE_SITO, linguaVideo, type Dizionario } from "./tipi";

const LOCALE: Record<string, string> = { it: "it_IT", en: "en_US", fr: "fr_FR", de: "de_DE", es: "es_ES" };

export function metaPagina(d: Dizionario): Metadata {
  const poster = `/sito/video/poster-${linguaVideo(d.lang)}.jpg`;
  return {
    title: { absolute: d.meta.titolo },
    description: d.meta.descrizione,
    alternates: {
      canonical: d.percorso,
      languages: {
        ...Object.fromEntries(LINGUE_SITO.map((l) => [l.lang, l.percorso])),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      url: d.percorso,
      siteName: "Match Point",
      title: d.meta.titolo,
      description: d.meta.descrizione,
      locale: d.meta.locale,
      alternateLocale: LINGUE_SITO.filter((l) => l.lang !== d.lang).map((l) => LOCALE[l.lang]),
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
