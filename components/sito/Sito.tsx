// Sito di presentazione di Match Point (server component): una sola struttura per italiano ("/") e inglese ("/en").
// I testi vengono dal dizionario; i piccoli componenti client sono solo video, galleria e animazione "appare".
import Link from "next/link";
import "./sito.css";
import { Pallina } from "./Pallina";
import { Telefono } from "./Telefono";
import { Rivela } from "./Rivela";
import { LinguaHtml } from "./LinguaHtml";
import { VideoPresentazione } from "./VideoPresentazione";
import { Galleria } from "./Galleria";
import { FUNZIONI } from "@/lib/sito/funzioni";
import { SCHERMATE } from "@/lib/sito/schermate";
import type { Dizionario, LinguaSito } from "@/lib/sito/tipi";

export function Sito({ lang, d }: { lang: LinguaSito; d: Dizionario }) {
  const anno = new Date().getFullYear();
  const voci = SCHERMATE.map((s) => ({ n: s.n, g: s.g, t: d.schermate[s.n] }));
  const alt = (nome: (typeof SCHERMATE)[number]["n"]) => `${d.galleria.schermata}: ${d.schermate[nome]}`;

  return (
    <div className="sito" lang={lang}>
      {lang !== "it" && <LinguaHtml lang={lang} />}
      <Rivela />
      <a className="s-salta" href="#contenuto">
        {d.salta}
      </a>

      {/* ---------- Barra in vetro ---------- */}
      <header className="s-barra">
        <div className="s-barra-in">
          <Link className="s-marchio" href={d.percorso} aria-label={d.barra.marchioAria}>
            <Pallina />
            <span>Match Point</span>
          </Link>
          <nav className="s-voci" aria-label={d.barra.navAria}>
            {d.barra.voci.map((v) => (
              <a key={v.href} href={v.href}>
                {v.label}
              </a>
            ))}
          </nav>
          <div className="s-barra-az">
            <div className="s-lingua" role="group" aria-label={d.barra.linguaAria}>
              <Link href="/" hrefLang="it" lang="it" aria-current={lang === "it" ? "true" : undefined}>
                IT
              </Link>
              <Link href="/en" hrefLang="en" lang="en" aria-current={lang === "en" ? "true" : undefined}>
                EN
              </Link>
            </div>
            <Link className="s-pillola" href="/app">
              {d.barra.apriApp}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenuto">
        {/* ---------- Apertura ---------- */}
        <section className="s-apertura">
          <div className="s-wrap">
            <h1 className="s-titolo">
              <span>{d.apertura.titolo1}</span> <span className="s-acc">{d.apertura.titolo2}</span>
            </h1>
            <p className="s-sotto">{d.apertura.sottotitolo}</p>
            <div className="s-cta">
              <Link className="s-btn s-btn-acc" href="/app/registrati">
                {d.apertura.cta}
              </Link>
              <a className="s-btn-link" href="#coach">
                {d.apertura.ctaSecondaria}
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <div className="s-apertura-video">
              <VideoPresentazione
                src={`/sito/video/presentazione-${lang}.mp4`}
                poster={`/sito/video/poster-${lang}.jpg`}
                titolo={d.apertura.videoTitolo}
                durata={d.apertura.videoDurata}
                play={d.apertura.play}
                etichetta={d.meta.videoAlt}
              />
            </div>
          </div>
        </section>

        {/* ---------- Funzioni ---------- */}
        {FUNZIONI.map((f, i) => {
          const t = d.funzioni[f.id];
          const n = f.schermate.length;
          return (
            <section key={f.id} id={f.id} className={`s-funz${i % 2 === 1 ? " s-inverso" : ""}${n >= 3 ? " s-largo" : ""}`} aria-labelledby={`t-${f.id}`}>
              <div className="s-wrap s-funz-in">
                <div className="s-f-testo s-appare">
                  <p className="s-occhiello">{t.occhiello}</p>
                  <h2 id={`t-${f.id}`}>{t.titolo}</h2>
                  <p className="s-cosa">
                    <strong>{d.cosaEtichetta}</strong> {t.cosa}
                  </p>
                  <p className="s-par">{t.testo}</p>
                </div>
                <div
                  className={`s-f-imm s-n${n} s-appare`}
                  {...(n >= 3 ? { tabIndex: 0, role: "group", "aria-label": t.occhiello } : {})}
                >
                  {f.schermate.map((nome) => (
                    <Telefono key={nome} nome={nome} lang={lang} alt={alt(nome)} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* ---------- Tutte le schermate ---------- */}
        <section id="schermate" className="s-galleria" aria-labelledby="t-schermate">
          <div className="s-wrap">
            <div className="s-gal-testa s-appare">
              <p className="s-occhiello">{d.galleria.occhiello}</p>
              <h2 id="t-schermate">{d.galleria.titolo}</h2>
              <p className="s-intro">{d.galleria.intro}</p>
            </div>
            <Galleria
              voci={voci}
              lang={lang}
              testi={{
                tutte: d.galleria.tutte,
                filtri: d.galleria.filtri,
                filtriAria: d.galleria.filtriAria,
                ingrandisci: d.galleria.ingrandisci,
                chiudi: d.galleria.chiudi,
                precedente: d.galleria.precedente,
                successivo: d.galleria.successivo,
                contatore: d.galleria.contatore,
                schermata: d.galleria.schermata,
              }}
            />
          </div>
        </section>

        {/* ---------- Chiusura ---------- */}
        <section className="s-chiusura" aria-labelledby="t-chiusura">
          <div className="s-wrap s-appare">
            <div className="s-logo-grande" aria-hidden="true">
              <Pallina size={72} />
            </div>
            <h2 id="t-chiusura">{d.chiusura.titolo}</h2>
            <p className="s-intro">{d.chiusura.testo}</p>
            <div className="s-cta s-cta-centro">
              <Link className="s-btn s-btn-acc" href="/app/registrati">
                {d.chiusura.inizia}
              </Link>
              <Link className="s-btn s-btn-vuoto" href="/app/accesso">
                {d.chiusura.accedi}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="s-piede">
        <div className="s-wrap s-piede-in">
          <span>{d.piede.diritti.replace("{anno}", String(anno))}</span>
          <Link href={d.percorsoAltro} hrefLang={lang === "it" ? "en" : "it"} lang={lang === "it" ? "en" : "it"}>
            {d.piede.lingua}
          </Link>
        </div>
      </footer>
    </div>
  );
}
