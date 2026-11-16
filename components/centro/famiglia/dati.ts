"use client";
// Dati condivisi dalle schermate di genitori e allievi: figli, gruppo, maestri, campo e programma.
// I tipi sono locali e minimi (solo le colonne lette qui) con gli stessi nomi snake_case del database.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCentro } from "@/lib/centro/contesto";
import { isoGiorno, prossimeLezioni, aggiungiGiorni, fmtOra } from "@/lib/centro/date";
import { trovaCampo } from "./util";

export type RAllievo = {
  id: string; nome: string; cognome: string | null; data_nascita: string | null; membro_id: string | null;
  note_mediche: string | null; certificato_scade: string | null;
};
export type RGruppo = {
  id: string; nome: string; fascia: string | null; livello: string | null; giorni: number[] | null; ora: string | null;
  durata_min: number | null; campo_id: string | null; programma_id: string | null; attivo: boolean | null; area_id: string | null;
};
export type RCampo = { id: string; numero: number; nome: string | null; superficie: string | null; copertura: string | null; luci: boolean | null; stato: string | null };
export type RProgramma = { id: string; nome: string; fascia: string | null; anno: number | null; mesi: unknown; settimane_test: string[] | null };
export type RMembroBreve = { id: string; nome: string; cognome: string | null; ruolo: string };
export type RCambio = { id: string; gruppo_id: string; data: string; campo_da: string | null; campo_a: string | null; motivo: string | null };
export type RLezione = {
  id: string; gruppo_id: string; data: string; ora: string | null; campo_id: string | null; maestro_id: string | null;
  stato: string; riassunto: string | null; riassunto_ok: boolean | null; compito: string | null;
};

export type Figlio = {
  allievo: RAllievo;
  gruppo: RGruppo | null;
  maestri: RMembroBreve[];
  programma: RProgramma | null;
};

export const nomeCompleto = (p: { nome: string; cognome: string | null }) => [p.nome, p.cognome].filter(Boolean).join(" ");
/** "Tommaso R." come nei mockup: nome e iniziale del cognome. */
export const nomeBreve = (p: { nome: string; cognome: string | null }) => (p.cognome ? `${p.nome} ${p.cognome.charAt(0)}.` : p.nome);

export function maestroPrincipale(f: Figlio): RMembroBreve | null {
  return f.maestri[0] ?? null;
}

const chiaveFiglio = (centroId: string) => `mp-figlio-${centroId}`;

/**
 * Figli del genitore (o l'allievo stesso, per le pagine dell'allievo) con gruppo, maestri e programma.
 * Usa sempre il membro "attivo" (vistaCome ?? membro), mai auth.uid(): così il titolare può vedere come un genitore.
 */
export function useFigli(modo: "famiglia" | "allievo" = "famiglia") {
  const { centro, membro, vistaCome, sb, ruolo } = useCentro();
  const ma = vistaCome ?? membro;
  const [figli, setFigli] = useState<Figlio[]>([]);
  const [campi, setCampi] = useState<RCampo[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);

  const ricarica = useCallback(() => setGiro((g) => g + 1), []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!ma) {
        setFigli([]);
        setCaricamento(false);
        return;
      }
      setErrore(null);
      // 1) gli allievi: i figli (allievi_famiglie) oppure, per l'account del ragazzo, il proprio profilo (allievi.membro_id)
      let allievi: RAllievo[] = [];
      if (modo === "allievo" && ruolo === "allievo") {
        const r = await sb.from("allievi").select("*").eq("centro_id", centro.id).eq("membro_id", ma.id);
        if (r.error) return void (vivo && (setErrore(r.error.message), setCaricamento(false)));
        allievi = (r.data ?? []) as RAllievo[];
      } else {
        const fam = await sb.from("allievi_famiglie").select("allievo_id").eq("centro_id", centro.id).eq("membro_id", ma.id);
        if (fam.error) return void (vivo && (setErrore(fam.error.message), setCaricamento(false)));
        const ids = [...new Set((fam.data ?? []).map((x: { allievo_id: string }) => x.allievo_id))];
        if (ids.length) {
          const r = await sb.from("allievi").select("*").eq("centro_id", centro.id).in("id", ids).order("data_nascita", { ascending: true });
          if (r.error) return void (vivo && (setErrore(r.error.message), setCaricamento(false)));
          allievi = (r.data ?? []) as RAllievo[];
        }
      }
      if (!allievi.length) {
        if (vivo) { setFigli([]); setCampi([]); setCaricamento(false); }
        return;
      }
      const idAll = allievi.map((a) => a.id);
      // 2) iscrizione in corso (al vuoto o futuro), la più recente per allievo
      const oggi = isoGiorno();
      const isc = await sb.from("iscrizioni").select("allievo_id,gruppo_id,dal,al").eq("centro_id", centro.id).in("allievo_id", idAll).order("dal", { ascending: false });
      const gruppoDi = new Map<string, string>();
      for (const i of (isc.data ?? []) as { allievo_id: string; gruppo_id: string; al: string | null }[]) {
        if ((!i.al || i.al >= oggi) && !gruppoDi.has(i.allievo_id)) gruppoDi.set(i.allievo_id, i.gruppo_id);
      }
      const idGr = [...new Set(gruppoDi.values())];
      let gruppi: RGruppo[] = [];
      let programmi: RProgramma[] = [];
      let maestri: { gruppo_id: string; membro_id: string; principale: boolean | null }[] = [];
      let membri: RMembroBreve[] = [];
      if (idGr.length) {
        const g = await sb.from("gruppi").select("*").eq("centro_id", centro.id).in("id", idGr);
        gruppi = (g.data ?? []) as RGruppo[];
        const idPr = [...new Set(gruppi.map((x) => x.programma_id).filter(Boolean))] as string[];
        if (idPr.length) {
          const p = await sb.from("programmi").select("*").eq("centro_id", centro.id).in("id", idPr);
          programmi = (p.data ?? []) as RProgramma[];
        }
        const gm = await sb.from("gruppi_maestri").select("gruppo_id,membro_id,principale").eq("centro_id", centro.id).in("gruppo_id", idGr);
        maestri = (gm.data ?? []) as typeof maestri;
        const idM = [...new Set(maestri.map((x) => x.membro_id))];
        if (idM.length) {
          // se la RLS non lascia leggere i membri, i nomi mancano e le schermate ripiegano su "il maestro"
          const m = await sb.from("membri").select("id,nome,cognome,ruolo").in("id", idM);
          membri = (m.data ?? []) as RMembroBreve[];
        }
      }
      const c = await sb.from("campi").select("*").eq("centro_id", centro.id).order("numero", { ascending: true });
      const out: Figlio[] = allievi.map((a) => {
        const g = gruppi.find((x) => x.id === gruppoDi.get(a.id)) ?? null;
        const ms = g
          ? maestri
              .filter((x) => x.gruppo_id === g.id)
              .sort((x, y) => Number(!!y.principale) - Number(!!x.principale))
              .map((x) => membri.find((m) => m.id === x.membro_id))
              .filter(Boolean) as RMembroBreve[]
          : [];
        return { allievo: a, gruppo: g, maestri: ms, programma: programmi.find((p) => p.id === g?.programma_id) ?? null };
      });
      if (!vivo) return;
      setFigli(out);
      setCampi((c.data ?? []) as RCampo[]);
      setCaricamento(false);
    })().catch((e: unknown) => {
      if (vivo) { setErrore(e instanceof Error ? e.message : String(e)); setCaricamento(false); }
    });
    return () => { vivo = false; };
  }, [centro.id, ma?.id, modo, ruolo, sb, giro]); // eslint-disable-line react-hooks/exhaustive-deps

  // il figlio scelto si ricorda per la sessione (stesso figlio in Home, Calendario, Progressi…)
  useEffect(() => {
    if (!figli.length) return;
    let salvato: string | null = null;
    try { salvato = sessionStorage.getItem(chiaveFiglio(centro.id)); } catch { /* storage non disponibile */ }
    setSelId((cur) => (cur && figli.some((f) => f.allievo.id === cur) ? cur : figli.find((f) => f.allievo.id === salvato)?.allievo.id ?? figli[0].allievo.id));
  }, [figli, centro.id]);

  const scegli = useCallback((id: string) => {
    setSelId(id);
    try { sessionStorage.setItem(chiaveFiglio(centro.id), id); } catch { /* ok */ }
  }, [centro.id]);

  const figlio = useMemo(() => figli.find((f) => f.allievo.id === selId) ?? figli[0] ?? null, [figli, selId]);
  return { figli, figlio, scegli, campi, caricamento, errore, ricarica, ma };
}

/** Lezione dell'agenda: calcolata da giorni e orario del gruppo, arricchita dalla riga in `lezioni` e dai cambi campo. */
export type VoceLezione = {
  data: string;
  ora: string;
  campo: RCampo | null;
  campoOriginale: RCampo | null;
  cambiato: boolean;
  motivoCambio: string | null;
  lezione: RLezione | null;
};

/**
 * Elenco delle lezioni di un gruppo tra due date: quelle del calendario settimanale più le righe vere di `lezioni`
 * (recuperi e lezioni fuori orario). Il campo effettivo considera sempre i cambi campo di quella data.
 */
export function agendaLezioni(
  gruppo: RGruppo, campi: RCampo[], dal: Date, giorni: number, cambi: RCambio[], righe: RLezione[], oggiPassato: boolean,
): VoceLezione[] {
  const calc = prossimeLezioni([gruppo], { da: dal, giorniAvanti: giorni, max: 400, includiOggiPassato: oggiPassato });
  const perData = new Map(righe.map((r) => [r.data, r]));
  const voci: VoceLezione[] = calc.map((c) => ({ data: c.data, ora: c.ora, ...risolviCampo(gruppo, campi, c.data, cambi, perData.get(c.data) ?? null) }));
  const fine = isoGiorno(aggiungiGiorni(dal, giorni));
  const inizio = isoGiorno(dal);
  for (const r of righe) {
    if (r.data < inizio || r.data > fine || voci.some((v) => v.data === r.data)) continue;
    voci.push({ data: r.data, ora: fmtOra(r.ora) || fmtOra(gruppo.ora), ...risolviCampo(gruppo, campi, r.data, cambi, r) });
  }
  return voci.sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
}

function risolviCampo(g: RGruppo, campi: RCampo[], data: string, cambi: RCambio[], lez: RLezione | null) {
  const abituale = trovaCampo(lez?.campo_id ?? g.campo_id, campi);
  const cambio = cambi.find((c) => c.gruppo_id === g.id && c.data === data);
  const nuovo = cambio ? trovaCampo(cambio.campo_a, campi) : null;
  const originale = cambio ? trovaCampo(cambio.campo_da, campi) ?? abituale : abituale;
  return {
    campo: nuovo ?? abituale,
    campoOriginale: originale,
    cambiato: !!(cambio && nuovo && originale && nuovo.id !== originale.id),
    motivoCambio: cambio?.motivo ?? null,
    lezione: lez,
  };
}
