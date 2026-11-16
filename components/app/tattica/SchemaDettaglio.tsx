"use client";
import { useEffect, useState } from "react";
import { Schermo } from "@/components/app/Schermo";
import { CampoAnimato, SCHEMA_ESEMPIO } from "@/components/schemi/CampoAnimato";
import { useLang, useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { SchemaGioco } from "@/lib/types";
import { Difficolta, useEtichettaFascia } from "./SchemaCard";
import S from "./Schemi.module.css";

const T = {
  it: {
    kick: "Tattica · schema animato", obiettivo: "Obiettivo", descrizione: "Descrizione", fasce: "Fasce d'età", difficolta: "Difficoltà",
    carico: "Carico lo schema…", nonTrovato: "Schema non trovato o non ancora pubblicato.", errore: "Non riesco a caricare lo schema. Riprova.",
    demoTit: "Servizio esterno e diritto nello spazio",
    demoObi: "Aprire il campo con il servizio e chiudere il punto con il diritto nella parte libera.",
    demoDesc: "Schema dimostrativo: presto arriveranno gli schemi del tuo maestro. Guarda come si muovono giocatore, avversario e palla.",
  },
  en: {
    kick: "Tactics · animated pattern", obiettivo: "Goal", descrizione: "Description", fasce: "Age bands", difficolta: "Difficulty",
    carico: "Loading the pattern…", nonTrovato: "Pattern not found or not published yet.", errore: "Couldn't load the pattern. Try again.",
    demoTit: "Wide serve and forehand into space",
    demoObi: "Open the court with the serve and finish the point with the forehand into the free area.",
    demoDesc: "Demo pattern: your coach's patterns are coming soon. Watch how the player, opponent and ball move.",
  },
  fr: {
    kick: "Tactique · schéma animé", obiettivo: "Objectif", descrizione: "Description", fasce: "Tranches d'âge", difficolta: "Difficulté",
    carico: "Chargement du schéma…", nonTrovato: "Schéma introuvable ou pas encore publié.", errore: "Impossible de charger le schéma. Réessayez.",
    demoTit: "Service extérieur et coup droit dans l'espace",
    demoObi: "Ouvrir le court avec le service et finir le point avec le coup droit dans la zone libre.",
    demoDesc: "Schéma de démonstration : bientôt les schémas de ton entraîneur arriveront. Regarde comment bougent le joueur, l'adversaire et la balle.",
  },
  de: {
    kick: "Taktik · animiertes Muster", obiettivo: "Ziel", descrizione: "Beschreibung", fasce: "Altersgruppen", difficolta: "Schwierigkeit",
    carico: "Muster wird geladen…", nonTrovato: "Muster nicht gefunden oder noch nicht veröffentlicht.", errore: "Das Muster kann nicht geladen werden. Versuche es erneut.",
    demoTit: "Außen-Aufschlag und Vorhand in den Raum",
    demoObi: "Das Feld mit dem Aufschlag öffnen und den Punkt mit der Vorhand in den freien Bereich abschließen.",
    demoDesc: "Demomuster: Die Muster deines Trainers kommen bald. Schau dir an, wie sich Spieler, Gegner und Ball bewegen.",
  },
  es: {
    kick: "Táctica · patrón animado", obiettivo: "Objetivo", descrizione: "Descripción", fasce: "Franjas de edad", difficolta: "Dificultad",
    carico: "Cargando el patrón…", nonTrovato: "Patrón no encontrado o todavía no publicado.", errore: "No se puede cargar el patrón. Inténtalo de nuevo.",
    demoTit: "Saque abierto y derecha al espacio",
    demoObi: "Abrir la pista con el saque y cerrar el punto con la derecha en la zona libre.",
    demoDesc: "Patrón de demostración: pronto llegarán los patrones de tu entrenador. Mira cómo se mueven el jugador, el rival y la bola.",
  },
};

/** Schema di gioco a tutto schermo: campo animato grande (con le note che scorrono), obiettivo, descrizione, fasce, difficoltà. */
export function SchemaDettaglio({ id }: { id: string }) {
  const t = useT(T);
  const { lang } = useLang();
  const etichetta = useEtichettaFascia();
  const [schema, setSchema] = useState<SchemaGioco | null>(null);
  const [stato, setStato] = useState<"carico" | "ok" | "mancante" | "errore">("carico");

  useEffect(() => {
    // "esempio" è lo schema dimostrativo mostrato quando il database è vuoto
    if (id === "esempio") { setStato("ok"); setSchema(null); return; }
    let vivo = true;
    setStato("carico");
    supabaseBrowser().from("game_schemes").select("*").eq("id", id).eq("pubblicato", true).maybeSingle()
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (!vivo) return;
        if (error) { setStato("errore"); return; }
        if (!data) { setStato("mancante"); return; }
        setSchema(data as SchemaGioco); setStato("ok");
      });
    return () => { vivo = false; };
  }, [id]);

  const demo = id === "esempio";
  const titolo = demo ? t.demoTit : schema?.titolo ?? "";
  const obiettivo = demo ? t.demoObi : schema?.obiettivo ?? "";
  const descrizione = demo ? t.demoDesc : schema?.descrizione ?? "";
  const fasce = demo ? (["U12", "U14"] as const).slice() : schema?.fasce ?? [];
  const animazione = demo ? SCHEMA_ESEMPIO : schema?.animazione;

  return (
    <Schermo tab="tattica" indietro={ROTTE.SchemiFascia}>
      <div className={S.pagina}>
        {stato === "carico" && <p className={S.vuoto} role="status">{t.carico}</p>}
        {stato === "mancante" && <p className={S.vuoto}>{t.nonTrovato}</p>}
        {stato === "errore" && <p className={S.vuoto} role="alert">{t.errore}</p>}
        {stato === "ok" && animazione && (
          <>
            <div>
              <div className={S.kick}>{t.kick}</div>
              <h1 className={S.h1}>{titolo}</h1>
            </div>
            <div className={S.campo}>
              <CampoAnimato animazione={animazione} auto lingua={lang} />
            </div>
            {obiettivo && (
              <div className={S.blocco}><span className={S.k}>{t.obiettivo}</span><span className={S.v}>{obiettivo}</span></div>
            )}
            {descrizione && (
              <div className={S.blocco}><span className={S.k}>{t.descrizione}</span><span className={S.v}>{descrizione}</span></div>
            )}
            <div className={S.blocco}>
              <div className={S.riga}>
                <span className={S.k}>{t.difficolta}</span>
                <Difficolta valore={demo ? 2 : schema?.difficolta ?? 1} />
              </div>
            </div>
            <div className={S.blocco}>
              <span className={S.k}>{t.fasce}</span>
              <span className={S.tagsRiga}>{fasce.map((f) => <span key={f} className={S.tag}>{etichetta(f)}</span>)}</span>
            </div>
          </>
        )}
      </div>
    </Schermo>
  );
}
