import { guardia, errore } from "@/lib/ai/guardia";
import { costoTts, registraUso } from "@/lib/ai/costi";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = await guardia();
  if (!g.ok) return g.risposta;
  const { userId, imp } = g.ctx;
  if (!imp.openaiKey) return errore(503, "chiave_mancante", "La voce non è ancora configurata.");

  let body: { testo?: unknown; lingua?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  const testo = typeof body.testo === "string" ? body.testo.trim() : "";
  const lingua: "it" | "en" = body.lingua === "en" ? "en" : "it";
  if (!testo) return errore(400, "richiesta_non_valida", "Testo mancante.");
  if (testo.length > 1500) return errore(413, "testo_troppo_lungo", "Massimo 1500 caratteri.");

  const modello = imp.modelloTts;
  const payload: Record<string, unknown> = { model: modello, voice: imp.voceTts, input: testo, response_format: "mp3" };
  // Solo gpt-4o-mini-tts accetta le istruzioni sul tono.
  if (modello === "gpt-4o-mini-tts") {
    payload.instructions = `Voce di un allenatore di tennis, calda e chiara, in ${lingua === "en" ? "inglese" : "italiano"}`;
  }

  let r: Response;
  try {
    r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${imp.openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[ai] voce:", e instanceof Error ? e.message : "errore");
    return errore(500, "errore_ai", "Voce non disponibile, riprova.");
  }
  if (!r.ok) {
    console.error("[ai] voce: OpenAI ha risposto", r.status);
    return errore(500, "errore_ai", "Voce non disponibile, riprova.");
  }

  const audio = await r.arrayBuffer();
  await registraUso(userId, "openai", modello, "voce", 0, 0, testo.length, costoTts(imp.prezzi, testo.length));
  return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
