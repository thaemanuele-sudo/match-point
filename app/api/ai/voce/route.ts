import { guardia, errore } from "@/lib/ai/guardia";
import { costoTts, registraUso } from "@/lib/ai/costi";
import { audioKitten, MODELLO_KITTEN } from "@/lib/ai/kitten";

import { linguaAI } from "@/lib/ai/lingue";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const g = await guardia();
  if (!g.ok) return g.risposta;
  const { userId, imp } = g.ctx;
  // Motore scelto dall'admin; se manca la chiave del motore scelto (o la scelta) si usa l'altro, se ha la chiave.
  const kitten = imp.kittenKey && (imp.voceMotore === "kittenml" || !imp.openaiKey);
  if (!kitten && !imp.openaiKey) return errore(503, "chiave_mancante", "La voce non è ancora configurata.");

  let body: { testo?: unknown; lingua?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  const testo = typeof body.testo === "string" ? body.testo.trim() : "";
  const lingua = linguaAI(body.lingua);
  if (!testo) return errore(400, "richiesta_non_valida", "Testo mancante.");
  if (testo.length > 1500) return errore(413, "testo_troppo_lungo", "Massimo 1500 caratteri.");

  if (kitten && imp.kittenKey) {
    let audio: ArrayBuffer;
    try {
      // senza voce scelta, audioKitten prende la prima voce italiana dell'elenco
      audio = await audioKitten(imp.kittenKey, testo, imp.kittenVoceId);
    } catch (e) {
      console.error("[ai] voce kitten:", e instanceof Error ? e.message : "errore");
      return errore(500, "errore_ai", "Voce non disponibile, riprova.");
    }
    await registraUso(userId, "kittenml", MODELLO_KITTEN, "voce", 0, 0, testo.length, costoTts(imp.prezzi, testo.length, "tts_kitten_per_milione_caratteri"));
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  }

  const modello = imp.modelloTts;
  const payload: Record<string, unknown> = { model: modello, voice: imp.voceTts, input: testo, response_format: "mp3" };
  // Solo gpt-4o-mini-tts accetta le istruzioni sul tono.
  if (modello === "gpt-4o-mini-tts") {
    payload.instructions = `Voce di un allenatore di tennis, calda e chiara, in ${({ it: "italiano", en: "inglese", fr: "francese", de: "tedesco", es: "spagnolo" } as const)[lingua]}`;
  }

  let r: Response;
  try {
    r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${imp.openaiKey ?? ""}`, "Content-Type": "application/json" },
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
