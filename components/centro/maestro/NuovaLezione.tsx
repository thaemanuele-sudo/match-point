"use client";
// "+" della barra del maestro: crea la prossima lezione dal programma del gruppo (si sceglie il gruppo se sono più d'uno)
// e porta al suo piano (M5).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Lista, Riga, Sezione, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { fmtData, prossimeLezioni } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { assicuraLezione, messaggioErrore, useMaestroDati } from "./dati";
import { StatoPagina } from "./piccoli";
import { campoEffettivo, fmt, nomeCampo, type RGruppo } from "./util";

const IT = {
  sopra: "Nuova lezione", titolo: "Scegli il gruppo", prossime: "Prossime lezioni dal programma", nessuno: "Nessun gruppo", nessunoTesto: "Non sei ancora assegnato a un gruppo con un orario: lo fa la direzione tecnica.",
  creo: "Preparo la lezione dal programma…", errCrea: "Non riesco a creare la lezione: {e}", alle: "{data} · {ora}",
};
const T = { it: IT, en: { ...IT } };

export function NuovaLezione() {
  const t = useT(T);
  const router = useRouter();
  const { centro, membroAttivo: ma, sb } = useCentro();
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const [err, setErr] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const partito = useRef(false);

  // le prossime lezioni dei miei gruppi, calcolate da giorni e orario (la lezione vera si crea solo alla scelta)
  const prossime = useMemo(() => (dati ? prossimeLezioni<RGruppo>(dati.gruppi, { giorniAvanti: 14, max: 8, includiOggiPassato: true }) : []), [dati]);

  async function crea(g: RGruppo, data: string) {
    if (!dati || !ma || occupato) return;
    setOccupato(true);
    try {
      const id = await assicuraLezione(sb, centro.id, ma.id, g, data, dati);
      router.replace(rotta(centro.slug).maestro.lezione(id));
    } catch (e) {
      setErr(fmt(t.errCrea, { e: messaggioErrore(e) }));
      setOccupato(false);
    }
  }

  // un solo gruppo: niente scelta, si va dritti al piano della sua prossima lezione
  useEffect(() => {
    if (!dati || partito.current || dati.gruppi.length !== 1 || !prossime[0]) return;
    partito.current = true;
    void crea(prossime[0].gruppo, prossime[0].data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dati, prossime]);

  const stato = StatoPagina({ caricamento, errore: errore ?? err, onRiprova: ricarica });
  return (
    <SchermoCentro ruolo="maestro" tab="nuovo" sopra={t.sopra} titolo={t.titolo} indietro>
      {stato ?? (occupato || (dati?.gruppi.length === 1 && prossime[0]) ? (
        <div className="s muted" role="status">{t.creo}</div>
      ) : prossime.length === 0 ? (
        <Vuoto titolo={t.nessuno} testo={t.nessunoTesto} icona="cal" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Sezione titolo={t.prossime} />
          <Lista>
            {prossime.map((p) => {
              const { campo } = campoEffettivo(p.gruppo, p.data, dati!.cambi, dati!.campi, null);
              return (
                <Riga key={`${p.gruppo.id}-${p.data}`} icona="cal" titolo={p.gruppo.nome} sotto={[fmt(t.alle, { data: fmtData(p.data), ora: p.ora }), nomeCampo(campo)].filter(Boolean).join(" · ")} onClick={() => crea(p.gruppo, p.data)} chevron />
              );
            })}
          </Lista>
        </div>
      ))}
    </SchermoCentro>
  );
}
