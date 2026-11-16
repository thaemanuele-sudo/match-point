"use client";
// Invio di un messaggio dalla famiglia: trova (o apre) la conversazione giusta e poi usa invia_messaggio,
// che applica da solo silenzio dopo le 21, sola lettura e notifiche. Qui non si scrive mai direttamente in `messaggi`.
import type { SupabaseClient } from "@supabase/supabase-js";
import { rpcTollerante } from "./util";

type Tipo = "famiglia_segreteria" | "famiglia_maestro";

/** Restituisce il testo dell'errore, oppure null se il messaggio è partito. */
export async function inviaMessaggioFamiglia(
  sb: SupabaseClient, centroId: string, membroId: string, allievoId: string, tipo: Tipo, titolo: string, testo: string,
): Promise<string | null> {
  const esiste = await sb.from("conversazioni").select("id").eq("centro_id", centroId).eq("tipo", tipo).eq("allievo_id", allievoId).limit(1);
  if (esiste.error) return esiste.error.message;
  let id: string | undefined = (esiste.data ?? [])[0]?.id;
  if (!id) {
    const nuova = await sb.from("conversazioni").insert({ centro_id: centroId, tipo, allievo_id: allievoId, titolo }).select("id").single();
    if (nuova.error || !nuova.data) return nuova.error?.message ?? "Conversazione non creata";
    id = nuova.data.id as string;
    const io = await sb.from("partecipanti").insert({ centro_id: centroId, conversazione_id: id, membro_id: membroId, sola_lettura: false });
    if (io.error) return io.error.message;
    if (tipo === "famiglia_segreteria") {
      // la segreteria entra nella conversazione per ricevere la richiesta; se la RLS non lo permette resta solo il genitore
      // e ci pensa invia_messaggio a notificare chi di dovere
      const seg = await sb.from("membri").select("id").eq("centro_id", centroId).eq("ruolo", "segreteria").eq("stato", "attivo");
      const righe = ((seg.data ?? []) as { id: string }[]).map((m) => ({ centro_id: centroId, conversazione_id: id, membro_id: m.id, sola_lettura: false }));
      if (righe.length) await sb.from("partecipanti").insert(righe);
    }
  }
  const r = await rpcTollerante(sb, "invia_messaggio", { conversazione: id, testo });
  return r.error ? r.error.message : null;
}
