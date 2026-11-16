import Anthropic from "@anthropic-ai/sdk";
import { guardia, errore } from "@/lib/ai/guardia";
import { costoToken, registraUso } from "@/lib/ai/costi";

export const runtime = "nodejs";
export const maxDuration = 60;

// Riassunto della lezione per le famiglie (M7). Contratto: POST { lezione_id } → { riassunto }.
// Il testo viene salvato in lezioni.riassunto con riassunto_ok = false: lo approva il maestro, mai l'AI.
// A Claude non si mandano nomi di bambini: il riassunto parla del gruppo, quindi basta il lavoro svolto
// (così non serve nemmeno il consenso "ai" di ogni singola famiglia).

const SISTEMA =
  "Sei il Coach AI di un centro di tennis. Scrivi per le famiglie un breve riassunto della lezione appena svolta dal gruppo, " +
  "in italiano, con tono caldo, concreto e positivo, in 3-4 frasi (massimo 70 parole), senza elenchi e senza emoji. " +
  "Racconta su cosa ha lavorato il gruppo e come è andata, e chiudi con il compito per casa se c'è. " +
  "Non nominare singoli bambini, non dare giudizi sul corpo o sul talento, non inventare fatti che non ti vengono dati. " +
  "Rispondi solo con il testo del riassunto.";

type Blocco = { titolo?: unknown; colpo?: unknown; minuti?: unknown; sostituto?: unknown; esercizio?: unknown };
type Svolto = { indice?: unknown; minuti?: unknown; fatto?: unknown; saltato?: unknown; sostituito?: unknown };

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const txt = (v: unknown) => (typeof v === "string" ? v : "");

function leggiPiano(j: unknown): Blocco[] {
  const a = Array.isArray(j) ? j : j && typeof j === "object" && Array.isArray((j as { blocchi?: unknown }).blocchi) ? (j as { blocchi: unknown[] }).blocchi : [];
  return a.filter((x): x is Blocco => !!x && typeof x === "object");
}

export async function POST(req: Request) {
  const g = await guardia();
  if (!g.ok) return g.risposta;
  const { userId, sb, imp } = g.ctx;
  if (!imp.anthropicKey) return errore(503, "chiave_mancante", "Il Coach AI non è ancora configurato.");

  let body: { lezione_id?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  const id = typeof body.lezione_id === "string" ? body.lezione_id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return errore(400, "richiesta_non_valida", "Serve lezione_id.");

  // La lettura passa dalla sessione dell'utente: se la RLS non gli fa vedere la lezione, non esiste per lui.
  const { data: lez, error: eLez } = await sb
    .from("lezioni")
    .select("id,gruppo_id,data,piano,svolto,compito,motivi_scostamento,stato")
    .eq("id", id)
    .maybeSingle();
  if (eLez) return errore(500, "lettura_fallita", "Non riesco a leggere la lezione.");
  if (!lez) return errore(404, "non_trovata", "Lezione non trovata.");

  let nomeGruppo = "il gruppo";
  let fascia = "";
  if (lez.gruppo_id) {
    const { data: g2 } = await sb.from("gruppi").select("nome,fascia").eq("id", lez.gruppo_id).maybeSingle();
    if (g2?.nome) nomeGruppo = String(g2.nome);
    if (g2?.fascia) fascia = String(g2.fascia);
  }
  const { data: pres } = await sb.from("presenze").select("presente").eq("lezione_id", id);
  const presenti = (pres ?? []).filter((p: { presente: boolean | null }) => p.presente).length;
  const totale = (pres ?? []).length;

  const piano = leggiPiano(lez.piano);
  const svolto: Svolto[] = Array.isArray(lez.svolto) ? (lez.svolto as Svolto[]) : [];
  const righe = piano.map((b, i) => {
    const s = svolto.find((x) => num(x.indice, -1) === i);
    const fatto = s ? s.fatto === true && s.saltato !== true : true;
    const minuti = s ? num(s.minuti, num(b.minuti)) : num(b.minuti);
    const sost = b.sostituto && typeof b.sostituto === "object" ? txt((b.sostituto as { titolo?: unknown }).titolo) : "";
    const esercizio = sost || txt(b.esercizio);
    return `- ${txt(b.titolo) || txt(b.colpo) || "Blocco"}${esercizio ? ` (${esercizio})` : ""}: ${fatto ? `${minuti} minuti` : "non svolto"}`;
  });

  const prompt = [
    `Gruppo: ${nomeGruppo}${fascia ? ` (${fascia})` : ""}`,
    `Data: ${txt(lez.data)}`,
    `Presenti: ${presenti} su ${totale}`,
    "Lavoro svolto:",
    righe.length ? righe.join("\n") : "- (piano non registrato)",
    lez.compito ? `Compito per casa: ${txt(lez.compito)}` : "Nessun compito per casa.",
  ].join("\n");

  const client = new Anthropic({ apiKey: imp.anthropicKey });
  const modello = imp.modelloChat;
  let riassunto = "";
  try {
    const r = await client.messages.create({ model: modello, max_tokens: 400, system: SISTEMA, messages: [{ role: "user", content: prompt }] });
    riassunto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    await registraUso(userId, "anthropic", modello, "chat", r.usage.input_tokens, r.usage.output_tokens, 0, costoToken(imp.prezzi, modello, r.usage.input_tokens, r.usage.output_tokens));
  } catch (e) {
    console.error("[centro] riassunto:", e instanceof Error ? e.message : "errore");
    return errore(502, "ai_non_disponibile", "Il Coach AI non risponde: riprova tra poco.");
  }
  if (!riassunto) return errore(502, "risposta_vuota", "Il Coach AI non ha scritto nulla: riprova.");

  // Sempre in bozza: l'invio alle famiglie è l'approvazione del maestro (riassunto_ok = true).
  const { data: salvata, error: eUp } = await sb.from("lezioni").update({ riassunto, riassunto_ok: false }).eq("id", id).select("id");
  if (eUp || !salvata?.length) return errore(403, "salvataggio_negato", "Non puoi salvare il riassunto di questa lezione.");

  return Response.json({ riassunto, riassunto_ok: false }, { headers: { "Cache-Control": "no-store" } });
}
