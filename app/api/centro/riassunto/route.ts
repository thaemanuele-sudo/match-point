import Anthropic from "@anthropic-ai/sdk";
import { guardia, errore, type Contesto } from "@/lib/ai/guardia";
import { costoToken, registraUso } from "@/lib/ai/costi";
import { ID_RIASSUNTO, SISTEMA_RIASSUNTO } from "@/lib/ai/compiti";
import { motoreApp, registraUsoMotore } from "@/lib/ai/motore";

export const runtime = "nodejs";
export const maxDuration = 60;

// Riassunto della lezione per le famiglie (M7). Contratto: POST { lezione_id } → { riassunto }.
// Il testo viene salvato in lezioni.riassunto con riassunto_ok = false: lo approva il maestro, mai l'AI.
// A Claude non si mandano nomi di bambini: il riassunto parla del gruppo, quindi basta il lavoro svolto
// (così non serve nemmeno il consenso "ai" di ogni singola famiglia).

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

  // Strada del motore (cache sulla coppia lezione + lavoro svolto, modello meno caro che basta); se è spento o dà errore si passa alla strada di sempre.
  let riassunto = "";
  let idChiamata: string | null = null;
  const m = motoreApp(imp);
  if (m) {
    try {
      const r = await m.motore.esegui(ID_RIASSUNTO, { lezione_id: id, prompt }, { utente: userId, segnale: req.signal });
      await registraUsoMotore(userId, "riassunto", r);
      riassunto = r.testo.trim();
      // Serve a dare al motore l'esito del maestro (vedi /api/centro/riassunto/esito).
      idChiamata = riassunto ? r.id_chiamata : null;
    } catch (e) {
      console.error("[centro] riassunto col motore, ripiego sulla strada di sempre:", e instanceof Error ? e.message : "errore");
    }
  }
  if (!riassunto) {
    try {
      riassunto = await riassuntoDiSempre(g.ctx, prompt);
      idChiamata = null;
    } catch (e) {
      console.error("[centro] riassunto:", e instanceof Error ? e.message : "errore");
      return errore(502, "ai_non_disponibile", "Il Coach AI non risponde: riprova tra poco.");
    }
  }
  if (!riassunto) return errore(502, "risposta_vuota", "Il Coach AI non ha scritto nulla: riprova.");

  // Sempre in bozza: l'invio alle famiglie è l'approvazione del maestro (riassunto_ok = true).
  // Con la bozza e l'id della chiamata il server potrà dire al motore se il maestro l'ha approvata così com'era o riscritta.
  const { data: salvata, error: eUp } = await sb
    .from("lezioni")
    .update({ riassunto, riassunto_ok: false, riassunto_chiamata_id: idChiamata, riassunto_bozza: idChiamata ? riassunto : null })
    .eq("id", id)
    .select("id");
  if (eUp || !salvata?.length) return errore(403, "salvataggio_negato", "Non puoi salvare il riassunto di questa lezione.");

  return Response.json({ riassunto, riassunto_ok: false }, { headers: { "Cache-Control": "no-store" } });
}

/** La strada di prima, senza motore: chiamata diretta ad Anthropic. Resta come ripiego. */
async function riassuntoDiSempre(ctx: Contesto, prompt: string): Promise<string> {
  const { userId, imp } = ctx;
  const client = new Anthropic({ apiKey: imp.anthropicKey ?? "" });
  const modello = imp.modelloChat;
  const r = await client.messages.create({ model: modello, max_tokens: 400, system: SISTEMA_RIASSUNTO, messages: [{ role: "user", content: prompt }] });
  const testo = r.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  // Il riassunto ha ora la sua voce nel registro dei costi (prima finiva sotto "chat").
  await registraUso(userId, "anthropic", modello, "riassunto", r.usage.input_tokens, r.usage.output_tokens, 0, costoToken(imp.prezzi, modello, r.usage.input_tokens, r.usage.output_tokens));
  return testo;
}
