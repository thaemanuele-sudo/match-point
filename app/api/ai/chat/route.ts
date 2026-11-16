import Anthropic from "@anthropic-ai/sdk";
import { guardia, errore } from "@/lib/ai/guardia";
import { costoToken, registraUso } from "@/lib/ai/costi";
import { linguaAI, NOME_LINGUA } from "@/lib/ai/lingue";

export const runtime = "nodejs";
export const maxDuration = 60;

const SISTEMA = {
  it: "Sei il Coach AI di Match Point, allenatore di tennis esperto per allievi dai 10 ai 18 anni e adulti: tecnica, tattica, atletica; risposte brevi, concrete, sicure per i ragazzi; se si parla di dolore o infortuni consiglia di fermarsi e sentire maestro/medico. Rispondi in italiano.",
  en: "You are the Match Point AI Coach, an expert tennis coach for players aged 10 to 18 and adults: technique, tactics, fitness; short, concrete answers that are safe for young players; if pain or injuries come up, advise stopping and speaking to a coach/doctor. Answer in English.",
};

type Msg = { ruolo: "user" | "assistant"; testo: string };

export async function POST(req: Request) {
  const g = await guardia();
  if (!g.ok) return g.risposta;
  const { userId, sb, imp } = g.ctx;
  if (!imp.anthropicKey) return errore(503, "chiave_mancante", "Il Coach AI non è ancora configurato.");

  let body: { messaggi?: unknown; contesto?: unknown; lingua?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  const lingua = linguaAI(body.lingua);

  const grezzi = Array.isArray(body.messaggi) ? body.messaggi : [];
  let messaggi: Msg[] = grezzi
    .filter((m): m is Msg => !!m && typeof m === "object" && (m.ruolo === "user" || m.ruolo === "assistant") && typeof m.testo === "string" && m.testo.trim() !== "")
    .map((m) => ({ ruolo: m.ruolo, testo: m.testo.slice(0, 4000) }))
    .slice(-20);
  // L'API richiede che la conversazione inizi con "user".
  while (messaggi.length && messaggi[0].ruolo !== "user") messaggi.shift();
  if (!messaggi.length || messaggi[messaggi.length - 1].ruolo !== "user") {
    return errore(400, "richiesta_non_valida", "Serve almeno un messaggio dell'utente.");
  }

  // Profilo per personalizzare le risposte (RLS: l'utente legge il proprio).
  // il prompt base è in italiano o inglese; per francese, tedesco e spagnolo si chiede di rispondere in quella lingua
  let sistema = lingua === "it" ? SISTEMA.it : SISTEMA.en.replace("Answer in English.", `Answer in ${NOME_LINGUA[lingua]}.`);
  try {
    const { data: p } = await sb.from("profiles").select("nome,fascia,tipo_utente").eq("id", userId).maybeSingle();
    if (p) {
      sistema += lingua !== "it"
        ? `\n\nUser profile: name ${p.nome || "n/a"}, age group ${p.fascia || "n/a"}, type ${p.tipo_utente}.`
        : `\n\nProfilo utente: nome ${p.nome || "n.d."}, fascia ${p.fascia || "n.d."}, tipo ${p.tipo_utente}.`;
    }
  } catch { /* profilo opzionale */ }
  if (typeof body.contesto === "string" && body.contesto.trim()) {
    sistema += (lingua !== "it" ? "\n\nContext: " : "\n\nContesto: ") + body.contesto.slice(0, 2000);
  }

  const client = new Anthropic({ apiKey: imp.anthropicKey });
  const modello = imp.modelloChat;
  const ultimaDomanda = messaggi[messaggi.length - 1].testo;

  const stream = client.messages.stream({
    model: modello,
    max_tokens: 900,
    system: sistema,
    messages: messaggi.map((m) => ({ role: m.ruolo, content: m.testo })),
  });

  const enc = new TextEncoder();
  let risposta = "";
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        stream.on("text", (t) => {
          risposta += t;
          controller.enqueue(enc.encode(t));
        });
        const finale = await stream.finalMessage();
        const tin = finale.usage.input_tokens;
        const tout = finale.usage.output_tokens;
        await registraUso(userId, "anthropic", modello, "chat", tin, tout, 0, costoToken(imp.prezzi, modello, tin, tout));
        if (risposta.trim()) {
          const { error } = await sb.from("chat_messages").insert([
            { user_id: userId, ruolo: "user", testo: ultimaDomanda },
            { user_id: userId, ruolo: "assistant", testo: risposta },
          ]);
          if (error) console.error("[ai] salvataggio chat:", error.message);
        }
        controller.close();
      } catch (e) {
        console.error("[ai] chat:", e instanceof Error ? e.message : "errore");
        controller.error(e);
      }
    },
    cancel() { stream.abort(); },
  });

  return new Response(body$, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
