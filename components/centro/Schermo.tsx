"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BannerVista, useCentro } from "@/lib/centro/contesto";
import { nomeApp, urlLogo } from "@/lib/centro/brand";
import { rotta, ROTTE_APP } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { BARRE, ruoloBarra, T_BARRE, type RuoloBarra, type VoceBarra } from "./barre";
import { Ico } from "./ui";

const T = { it: { indietro: "Indietro" }, en: { indietro: "Indietro" } };

/**
 * Contenitore di ogni pagina del centro.
 *  - ruolo: barra da mostrare ("dt" | "area" | "maestro" | "genitore" | "allievo"); se manca, quella del ruolo corrente.
 *  - tab: id della voce accesa (vedi BARRE in barre.ts); senza tab si accende la voce il cui indirizzo coincide.
 *  - sopra: riga piccola sopra il titolo; titolo; indietro: href oppure true (pagina precedente); azioni: a destra del titolo.
 *  - largo: il contenuto occupa tutta la larghezza sul computer (tabelle, mappe) invece di fermarsi a 1240px.
 *  - senzaBarra: schermata a tutto schermo (lezione in corso).
 * Telefono: colonna fino a 430px con la barra in basso. dt e area sopra 900px: barra laterale e contenuto largo.
 */
export function SchermoCentro({ ruolo, tab, titolo, sopra, indietro, azioni, largo, senzaBarra, children }: {
  ruolo?: RuoloBarra; tab?: string; titolo?: ReactNode; sopra?: ReactNode; indietro?: string | true; azioni?: ReactNode; largo?: boolean; senzaBarra?: boolean; children: ReactNode;
}) {
  const t = useT(T);
  const tb = useT(T_BARRE);
  const router = useRouter();
  const pathname = usePathname();
  const { centro, ruolo: ruoloCorrente, membroAttivo } = useCentro();
  const r: RuoloBarra = ruolo ?? ruoloBarra(ruoloCorrente);
  const rotte = rotta(centro.slug);
  const dash = r === "dt" || r === "area";
  const tutte = BARRE[r];
  const inBasso = tutte.filter((v) => !v.laterale);
  const accesa = (v: VoceBarra) => (v.sotto ? pathname === v.href(rotte) : tab ? v.id === tab : pathname === v.href(rotte));
  const logo = urlLogo(centro.logo_path);
  const nome = nomeApp(centro);
  const persona = membroAttivo ? [membroAttivo.nome, membroAttivo.cognome].filter(Boolean).join(" ") : "";

  return (
    <div className={`mc-screen${dash ? " dash" : ""}`}>
      {dash && (
        <aside className="mc-side">
          <div className="mc-side-logo">
            {logo ? <img src={logo} alt="" width={40} height={40} /> : <span className="mc-logo-ini disp" aria-hidden="true">{nome.slice(0, 2).toUpperCase()}</span>}
            <div className="grow"><div className="disp mc-side-nome">{nome}</div>{centro.citta && <div className="kick">{centro.citta}</div>}</div>
          </div>
          <nav aria-label={tb.menu} className="mc-side-nav">
            {tutte.map((v) => (
              <div key={v.id} className="mc-side-voce-wrap">
                {v.gruppo && <div className="mc-side-gruppo k">{tb[v.gruppo]}</div>}
                <Link href={v.href(rotte)} className={`mc-side-voce${accesa(v) ? " on" : ""}${v.sotto ? " sotto" : ""}`} aria-current={accesa(v) ? "page" : undefined}>
                  <Ico nome={v.icona} size={18} /><span>{tb[v.chiave]}</span>
                </Link>
              </div>
            ))}
          </nav>
          <div className="mc-side-piede">
            {persona && <div className="kick">{persona}</div>}
            <Link href={ROTTE_APP.profili} className="mc-side-voce"><Ico nome="swap" size={18} /><span>{tb.cambiaProfilo}</span></Link>
          </div>
        </aside>
      )}
      <div className="mc-colonna">
        <BannerVista />
        <main className={`mc-main${largo ? " largo" : ""}${senzaBarra ? " senza-barra" : ""}`}>
          {(titolo || indietro || sopra || azioni) && (
            <header className="hdr">
              {indietro &&
                (typeof indietro === "string" ? (
                  <Link href={indietro} className="icon" aria-label={t.indietro}><Ico nome="back" size={16} tratto={2.4} /></Link>
                ) : (
                  <button type="button" className="icon" aria-label={t.indietro} onClick={() => router.back()}><Ico nome="back" size={16} tratto={2.4} /></button>
                ))}
              <div className="grow">{sopra && <div className="kick">{sopra}</div>}{titolo && <h1 className="h1">{titolo}</h1>}</div>
              {azioni}
            </header>
          )}
          {children}
        </main>
        {!senzaBarra && (
          <nav className="mc-tabbar tabbar" aria-label={tb.sezioni} style={{ gridTemplateColumns: `repeat(${inBasso.length},minmax(0,1fr))` }}>
            {inBasso.map((v) =>
              v.plus ? (
                <Link key={v.id} href={v.href(rotte)} className="plus" aria-label={tb[v.chiave]}><Ico nome={v.icona} size={28} tratto={2.6} /></Link>
              ) : (
                <Link key={v.id} href={v.href(rotte)} className={`tab${accesa(v) ? " on" : ""}`} aria-current={accesa(v) ? "page" : undefined}>
                  <Ico nome={v.icona} size={24} tratto={1.8} /><span>{tb[v.chiave]}</span>
                </Link>
              ),
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
