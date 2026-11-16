"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ROTTE } from "@/lib/rotte";
import { Schermo } from "@/components/app/Schermo";
import { useT, useLang } from "@/lib/i18n/lingua";
import { SCHEMA_ESEMPIO } from "@/components/schemi/CampoAnimato";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useProfilo } from "@/lib/useProfilo";
import { FASCE, type Fascia, type SchemaGioco } from "@/lib/types";
import { useVoce } from "./voce";
import { SchemaCard, useEtichettaFascia } from "./SchemaCard";
import SC from "./Schemi.module.css";
import K from "./comune.module.css";

const T = {
  it: {
    back: "Indietro",
    tacticsAnimatedPattern: "Tattica · schema animato",
    deep: "profondo",
    aStudent: "A allievo",
    bOpponent: "B avversario",
    aSShot: "colpo di A",
    bSShot: "colpo di B",
    voiceExplanation: "Spiegazione a voce",
    strategies: "Strategie",
    animati: "Schemi animati",
    carico: "Carico gli schemi…",
    errore: "Non riesco a caricare gli schemi. Mostro un esempio.",
    vuoto: "Gli schemi animati arrivano a breve: intanto ecco un esempio.",
    demoTit: "Servizio esterno e diritto nello spazio",
    demoObi: "Aprire il campo con il servizio e chiudere il punto con il diritto nella parte libera.",
  },
  en: {
    back: "Back",
    tacticsAnimatedPattern: "Tactics · animated pattern",
    deep: "deep",
    aStudent: "A student",
    bOpponent: "B opponent",
    aSShot: "A's shot",
    bSShot: "B's shot",
    voiceExplanation: "Voice explanation",
    strategies: "Strategies",
    animati: "Animated patterns",
    carico: "Loading patterns…",
    errore: "Couldn't load the patterns. Showing an example.",
    vuoto: "Animated patterns are coming soon: here's an example in the meantime.",
    demoTit: "Wide serve and forehand into space",
    demoObi: "Open the court with the serve and finish the point with the forehand into the free area.",
  },
};

// Punti chiave per fascia (dai disegni IT/EN): titolo, quattro punti, nota. ADULTI = "PRO" dei disegni.
const FASCE_DATI = {
  it: {
    U10: ["Costanza e campo intero", ["Superare la rete con 1-2 m di margine", "Giocare profondo oltre la linea di servizio", "Muovere l'avversario a destra e a sinistra", "Riconoscere la palla corta ed entrare"], "Campo rosso/arancio e palle a bassa compressione"],
    U12: ["Diagonale e primo cambio", ["Costruire con la diagonale di diritto", "Lungolinea solo su palla corta e centrale", "Servire verso il rovescio", "Recuperare il centro dopo ogni colpo"], "L'AI propone sequenze semplici da 2-3 colpi"],
    U14: ["Inside-out e attacco", ["Girare intorno al rovescio, inside-out", "Attaccare la palla corta e chiudere a rete", "Back difensivo per guadagnare tempo", "Risposta profonda al centro sulla prima"], "Prime combinazioni condizionate dal punteggio"],
    U16: ["Servizio + 1 e approccio", ["Servizio esterno e primo colpo nello spazio", "Approccio lungolinea e volée incrociata", "Kick al rovescio sulla seconda", "Alternare topspin carico e back"], "Punteggio e rischio entrano nei suggerimenti"],
    U18: ["Rischio, variazione, palla corta", ["Strategia in base a punteggio e rischio", "Palla corta dopo colpi profondi", "Chip and charge sulla seconda", "Tie-break con combinazioni fisse"], "Combinazioni AI per set e tie-break"],
    ADULTI: ["Modelli dal circuito", ["Servizio e volée sui campi veloci", "Servizio esterno e diritto nello spazio", "Risposta profonda e rovescio lungolinea", "Difesa e pallonetto in contrattacco"], "Schemi noti del circuito, senza statistiche inventate"],
  },
  en: {
    U10: ["Consistency and full court", ["Clear the net by 1-2 m", "Play deep past the service line", "Move the opponent left and right", "Recognize the short ball and move in"], "Red/orange court and low-compression balls"],
    U12: ["Crosscourt and first change", ["Build with the forehand crosscourt", "Down the line only on short, central balls", "Serve to the backhand", "Recover to the middle after every shot"], "The AI suggests simple 2-3 shot sequences"],
    U14: ["Inside-out and attack", ["Run around the backhand, inside-out", "Attack the short ball and finish at the net", "Defensive slice to buy time", "Deep return to the middle on first serve"], "First score-based combinations"],
    U16: ["Serve + 1 and approach", ["Wide serve and first shot into space", "Down-the-line approach and crosscourt volley", "Kick to the backhand on second serve", "Mix heavy topspin and slice"], "Score and risk shape the suggestions"],
    U18: ["Risk, variation, drop shot", ["Strategy based on score and risk", "Drop shot after deep shots", "Chip and charge on second serve", "Tiebreak with set combinations"], "AI combinations for sets and tiebreaks"],
    ADULTI: ["Tour models", ["Serve and volley on fast courts", "Wide serve and forehand into space", "Deep return and down-the-line backhand", "Defense and counterattacking lob"], "Known tour patterns, no made-up stats"],
  },
} satisfies Record<"it" | "en", Record<Fascia, [string, string[], string]>>;

export function SchemiFascia() {
  const t = useT(T);
  const { lang } = useLang();
  const etichetta = useEtichettaFascia();
  const { profilo } = useProfilo();
  const { inLettura, leggi } = useVoce();
  const [fascia, setFascia] = useState<Fascia>("U12");
  const [schemi, setSchemi] = useState<SchemaGioco[]>([]);
  const [stato, setStato] = useState<"carico" | "ok" | "errore">("carico");
  // la fascia del profilo, se c'è, è quella di partenza
  useEffect(() => { if (profilo?.fascia) setFascia(profilo.fascia); }, [profilo?.fascia]);
  // schemi veri del super admin: pubblicati, della fascia scelta, nell'ordine dato dall'admin
  useEffect(() => {
    let vivo = true;
    setStato("carico");
    supabaseBrowser().from("game_schemes").select("*").contains("fasce", [fascia]).eq("pubblicato", true).order("ordine").order("creato_il")
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (!vivo) return;
        if (error) { setSchemi([]); setStato("errore"); return; }
        setSchemi((data as SchemaGioco[]) ?? []); setStato("ok");
      });
    return () => { vivo = false; };
  }, [fascia]);
  const [titolo, pts, nota] = FASCE_DATI[lang][fascia];
  return (
    <Schermo tab="tattica">
      <div className={K.scr} style={{ gap: 10 }}>
        <header className={K.hdr}>
          <Link href={ROTTE.Tattica} className={K.icon} aria-label={t.back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6"></path>
            </svg>
          </Link>
          <div className={K.grow}>
            <div className={K.kick}>{t.tacticsAnimatedPattern}</div>
            <h1 className={K.h1}>{titolo}</h1>
          </div>
        </header>
        <div className={K.seg} style={{ gridTemplateColumns: "repeat(6,minmax(0,1fr))" }}>
          {FASCE.map((f) => (
            <button key={f} type="button" className={f === fascia ? `${K.sg} ${K.on}` : K.sg} aria-pressed={f === fascia} onClick={() => setFascia(f)}>{etichetta(f)}</button>
          ))}
        </div>
        <div style={{ position: "relative", borderRadius: "22px", overflow: "hidden", aspectRatio: "357 / 224", background: "repeating-linear-gradient(0deg,#1E6A44 0 22px,#24764C 22px 44px)", flex: "none" }}>
          <svg width="100%" height="100%" viewBox="0 0 357 224" aria-hidden="true" style={{ position: "absolute", inset: "0" }}>
            <g fill="none" stroke="#fff" strokeWidth="2">
              <rect x="71" y="13" width="214" height="197"></rect>
              <path d="M98 13V211M259 13V211M98 59H259M98 165H259M178 59V165"></path>
            </g>
            <path d="M57 112H300" stroke="#fff" strokeWidth="3.5" opacity=".6"></path>
            <rect x="150" y="26" width="70" height="30" rx="6" fill="#D8F34A" opacity=".85"></rect>
            <text x="185" y="45" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0B0B0C" fontFamily="system-ui">{t.deep}</text>
            <path className={K.trail} d="M179 196 Q 150 120 168 44" fill="none" stroke="#D8F34A" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 6"></path>
            <path d="M168 44 Q 200 110 214 176" fill="none" stroke="#FF9F43" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 6"></path>
            <circle cx="179" cy="204" r="11" fill="#3D8BFF" stroke="#fff" strokeWidth="2"></circle>
            <text x="179" y="209" textAnchor="middle" fontWeight="700" fontSize="14" fill="#fff" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif" }}>A</text>
            <circle cx="190" cy="20" r="11" fill="#FF5A5F" stroke="#fff" strokeWidth="2"></circle>
            <text x="190" y="25" textAnchor="middle" fontWeight="700" fontSize="14" fill="#fff" style={{ fontFamily: "var(--font-barlow), 'Barlow Condensed', sans-serif" }}>B</text>
          </svg>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "11.5px", fontWeight: "700" }}>
          <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span className={K.dot} style={{ background: "#3D8BFF" }}></span>
            {t.aStudent}
          </span>
          <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span className={K.dot} style={{ background: "#FF5A5F" }}></span>
            {t.bOpponent}
          </span>
          <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span className={K.dot} style={{ background: "#D8F34A" }}></span>
            {t.aSShot}
          </span>
          <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span className={K.dot} style={{ background: "#FF9F43" }}></span>
            {t.bSShot}
          </span>
        </div>
        {pts.map((p, n) => (
          <div key={p} style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "14px" }}>
            <span className={K.num} style={{ width: "22px", height: "22px", fontSize: "12px" }}>{n + 1}</span>
            {p}
          </div>
        ))}
        <div className={K.note}>{nota}</div>
        <div className={K.g2}>
          <button type="button" className={K.btn2} aria-pressed={inLettura} onClick={() => leggi(`${titolo}. ${pts.join(". ")}. ${nota}`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9z"></path>
              <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"></path>
            </svg>
            {t.voiceExplanation}
          </button>
          <Link href={ROTTE.CatalogoStrategie} className={K.btn2}>{t.strategies}</Link>
        </div>
        <div className={K.sec} style={{ marginTop: 6 }}><h2>{t.animati}</h2></div>
        {stato === "carico" && <p className={K.muted} role="status" style={{ margin: 0 }}>{t.carico}</p>}
        {stato !== "carico" && schemi.length > 0 && (
          <div className={SC.lista}>
            {schemi.map((sc) => (
              <SchemaCard key={sc.id} href={`/app/schemi/${sc.id}`} titolo={sc.titolo} obiettivo={sc.obiettivo} difficolta={sc.difficolta} fasce={sc.fasce} animazione={sc.animazione} />
            ))}
          </div>
        )}
        {stato !== "carico" && schemi.length === 0 && (
          <>
            {/* database vuoto: schema dimostrativo, così la schermata non resta spoglia */}
            <div className={SC.lista}>
              <SchemaCard demo href="/app/schemi/esempio" titolo={t.demoTit} obiettivo={t.demoObi} difficolta={2} fasce={[fascia]} animazione={SCHEMA_ESEMPIO} />
            </div>
            <div className={K.note}>{stato === "errore" ? t.errore : t.vuoto}</div>
          </>
        )}
      </div>
    </Schermo>
  );
}
