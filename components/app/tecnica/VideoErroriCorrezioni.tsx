"use client";
import Link from "next/link";
import { urlContenuto } from "@/lib/contenuti";
import { useT, useLang } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import type { Colpo } from "@/lib/types";
import { COLORE_TIPO, NOME_TIPO, hrefVideo } from "./etichette";
import { useVideoTecnica } from "./useVideoTecnica";
import s from "./VideoErroriCorrezioni.module.css";

const T = {
  it: { titolo: "Video di errori e correzioni", libreria: "Libreria" },
  en: { titolo: "Error and correction videos", libreria: "Library" },
  fr: { titolo: "Vidéos d'erreurs et de corrections", libreria: "Bibliothèque" },
  de: { titolo: "Fehler- und Korrekturvideos", libreria: "Bibliothek" },
  es: { titolo: "Vídeos de errores y correcciones", libreria: "Biblioteca" },
};

/**
 * Sezione in fondo alle schermate dei colpi: i video veri caricati dall'admin per quel colpo.
 * Nessuna sezione (nemmeno il titolo) finché carica, se non ce ne sono o se la lettura fallisce:
 * in quel caso la schermata resta quella del disegno.
 */
export function VideoErroriCorrezioni({ colpo }: { colpo: Colpo }) {
  const t = useT(T);
  const { lang } = useLang();
  const { video, stato } = useVideoTecnica(colpo);
  if (stato !== "pronto" || video.length === 0) return null;
  return (
    <section className={s.r} aria-label={t.titolo}>
      <div className={s.sec}>
        <h2>{t.titolo}</h2>
        <Link href={ROTTE.LibreriaVideo}>{t.libreria}</Link>
      </div>
      <div className={s.lista}>
        {video.map((v) => {
          const cop = urlContenuto(v.copertina_path);
          return (
            <Link key={v.id} href={hrefVideo(v.id)} className={s.li}>
              <span className={s.thumb} aria-hidden="true">
                {cop && /* eslint-disable-next-line @next/next/no-img-element */ <img src={cop} alt="" loading="lazy" />}
                <span className={s.play}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
              <span className={s.grow}>
                <span className={s.code}>{v.codice}</span>
                <span className={s.t}>{v.titolo}</span>
              </span>
              <span className={s.tag}>{NOME_TIPO[lang][v.tipo]}</span>
              <span className={s.dot} style={{ background: COLORE_TIPO[v.tipo] }} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
