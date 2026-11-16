"use client";
// M2 · I miei gruppi: programma e settimana del ciclo, schema e aderenza al Metodo di ogni gruppo.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Chip, Chips, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { fmtGiorni, fmtOra, giornoSettimana, isoGiorno, prossimeLezioni } from "@/lib/centro/date";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { assicuraLezione, messaggioErrore, useMaestroDati } from "./dati";
import { SegGruppiAllievi, StatoPagina } from "./piccoli";
import { useAderenza } from "./statistiche";
import { campoEffettivo, etichettaProgramma, fmt, nomeCampo, SCHEMI, situazioneProgramma, type RGruppo } from "./util";

const IT = {
  sopra: "{nome} · {centro}", titolo: "Gruppi", tutti: "Tutti", oggi: "Oggi", allievi: "allievi", settimana: "settimana {n} di {t}", aderenza: "Aderenza al Metodo",
  aria: "Apri il piano di {nome}", vuoto: "Nessun gruppo", vuotoTesto: "Non sei ancora assegnato a nessun gruppo. Lo fa la direzione tecnica.", vuotoOggi: "Oggi nessuno dei tuoi gruppi si allena.",
  senzaProgramma: "Nessun programma assegnato", errApri: "Non riesco ad aprire la lezione: {e}", schemaLibero: "Libero guidato",
};
const T = { it: IT, en: { ...IT } };

export function Gruppi() {
  const t = useT(T);
  const router = useRouter();
  const { centro, membroAttivo: ma, sb } = useCentro();
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const ad = useAderenza(dati);
  const [filtro, setFiltro] = useState<"tutti" | "oggi">("tutti");
  const [err, setErr] = useState<string | null>(null);
  const oggi = isoGiorno();

  async function apri(g: RGruppo) {
    if (!dati || !ma) return;
    // la lezione che interessa è la prossima del gruppo (oggi compresa, anche se è già iniziata)
    const prossima = prossimeLezioni([g], { includiOggiPassato: true, giorniAvanti: 14, max: 1 })[0];
    try {
      const id = await assicuraLezione(sb, centro.id, ma.id, g, prossima?.data ?? oggi, dati);
      router.push(rotta(centro.slug).maestro.lezione(id));
    } catch (e) {
      setErr(fmt(t.errApri, { e: messaggioErrore(e) }));
    }
  }

  const nAllievi = dati ? dati.allievi.size : 0;
  const lista = (dati?.gruppi ?? []).filter((g) => filtro === "tutti" || (g.giorni?.includes(giornoSettimana(oggi)) ?? false));
  const stato = StatoPagina({ caricamento, errore: errore ?? err, onRiprova: ricarica });
  return (
    <SchermoCentro ruolo="maestro" tab="allievi" sopra={fmt(t.sopra, { nome: [ma?.nome, ma?.cognome].filter(Boolean).join(" "), centro: centro.nome })} titolo={t.titolo}>
      {stato ?? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SegGruppiAllievi slug={centro.slug} attivo="gruppi" nGruppi={dati?.gruppi.length ?? 0} nAllievi={nAllievi} />
          <Chips>
            <Chip on={filtro === "tutti"} onClick={() => setFiltro("tutti")}>{t.tutti}</Chip>
            <Chip on={filtro === "oggi"} onClick={() => setFiltro("oggi")}>{t.oggi}</Chip>
          </Chips>
          {lista.length === 0 && <Vuoto titolo={dati?.gruppi.length ? t.vuotoOggi : t.vuoto} testo={dati?.gruppi.length ? undefined : t.vuotoTesto} icona="users" />}
          {lista.map((g) => {
            const prog = g.programma_id ? dati!.programmi.get(g.programma_id) : null;
            const sit = situazioneProgramma(prog, oggi);
            const { campo } = campoEffettivo(g, oggi, dati!.cambi, dati!.campi, null);
            const a = ad?.get(g.id) ?? null;
            const sigla = (g.fascia ?? g.nome).slice(0, 3).toUpperCase();
            const quando = [[fmtGiorni(g.giorni), fmtOra(g.ora)].filter(Boolean).join(" "), nomeCampo(campo ?? (g.campo_id ? dati!.campi.get(g.campo_id) : null))].filter(Boolean).join(" · ");
            return (
              <button key={g.id} type="button" className="card" aria-label={fmt(t.aria, { nome: g.nome })} onClick={() => apri(g)}
                style={{ display: "flex", flexDirection: "column", gap: 7, padding: "9px 13px", textAlign: "left", color: "inherit", cursor: "pointer", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="code" style={{ fontSize: 17, minWidth: 34, textAlign: "center" }}>{sigla}</span>
                  <span className="grow"><span style={{ display: "block", fontSize: 15.5, fontWeight: 700 }}>{g.nome}</span><span className="muted" style={{ display: "block", fontSize: 12.5, marginTop: 1 }}>{quando}</span></span>
                  <span style={{ textAlign: "right" }}><span className="disp" style={{ display: "block", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{dati!.iscritti.get(g.id)?.length ?? 0}</span><span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>{t.allievi}</span></span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700 }}>{sit ? etichettaProgramma(sit) : t.senzaProgramma}</span>
                    {sit && <span className="muted">{fmt(t.settimana, { n: sit.settimana, t: sit.totale })}</span>}
                  </div>
                  {sit && (
                    <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
                      {Array.from({ length: sit.totale }, (_, i) => i + 1).map((n) => (
                        <span key={n} style={{ flex: 1, height: 6, borderRadius: 3, background: n < sit.settimana ? "#4CD07D" : n === sit.settimana ? "var(--brand)" : "#2C2C2E" }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span className="tag">{prog?.schema ? SCHEMI[prog.schema] ?? prog.schema : t.schemaLibero}</span>
                  {a !== null && <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{t.aderenza} <b style={{ color: a >= 85 ? "#4CD07D" : a >= 70 ? "#FFD54A" : "#FF9F43" }}>{a}%</b></span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </SchermoCentro>
  );
}
