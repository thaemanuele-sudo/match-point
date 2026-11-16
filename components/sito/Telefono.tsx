// Cornice dell'iPhone 16 disegnata in CSS (titanio scuro, bordo nero, isola dinamica) attorno alla schermata.
// Le misure sono in cqw (unità del contenitore): la stessa cornice vale per un telefono grande o per una miniatura.
// Nessuno stato: si usa sia nel server sia nella galleria.
import type { LinguaSito } from "@/lib/sito/tipi";

export function Telefono({
  nome,
  lang,
  alt,
  eager = false,
  className = "",
}: {
  nome: string;
  lang: LinguaSito;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  // le tre schermate dell'orologio sono un quadro 420x512 nell'angolo di un'immagine nera 640x1387:
  // niente cornice iPhone, si mostra solo quel quadro (vedi .s-orol in sito.css)
  if (nome.startsWith("Watch")) {
    return (
      <figure className={`s-tel ${className}`}>
        <div className="s-orol">
          {/* eslint-disable-next-line @next/next/no-img-element -- immagini statiche già ottimizzate (webp) */}
          <img
            src={`/sito/schermate/${lang}/${nome}.webp`}
            width={640}
            height={1387}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
        </div>
      </figure>
    );
  }
  return (
    <figure className={`s-tel ${className}`}>
      <div className="s-tel-corpo">
        <div className="s-tel-schermo">
          {/* eslint-disable-next-line @next/next/no-img-element -- immagini statiche già ottimizzate (webp) */}
          <img
            src={`/sito/schermate/${lang}/${nome}.webp`}
            width={640}
            height={1387}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
          <span className="s-tel-isola" aria-hidden="true" />
        </div>
      </div>
    </figure>
  );
}
