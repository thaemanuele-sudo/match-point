import Anthropic from "@anthropic-ai/sdk";
import { guardia, errore, type Contesto } from "@/lib/ai/guardia";
import { costoToken, registraUso } from "@/lib/ai/costi";
import { linguaAI } from "@/lib/ai/lingue";
import { ID_CHAT, baseSistemaChat, type IngressoChat, type MsgChat } from "@/lib/ai/compiti";
import { motoreApp, registraUsoMotore, type MotoreApp } from "@/lib/ai/motore";
import type { Risultato } from "@/lib/motore";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = MsgChat;

const INTESTAZIONI_TESTO = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" };

/** Salva la domanda e la risposta nella cronologia dell'utente. Un errore qui non deve rovinare la risposta già data. */
async function salvaChat(sb: Contesto["sb"], userId: string, domanda: string, risposta: string) {
  if (!risposta.trim()) return;
  const { error } = await sb.from("chat_messages").insert([
    { user_id: userId, ruolo: "user", testo: domanda },
    { user_id: userId, ruolo: "assistant", testo: risposta },
  ]);
  if (error) console.error("[ai] salvataggio chat:", error.message);
}

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
  // Il prompt è in due pezzi: la base (fissa, per lingua) e la coda (profilo e contesto, diversi per ogni utente). Base + coda = prompt di sempre.
  const base = baseSistemaChat(lingua);
  let coda = "";
  try {
    const { data: p } = await sb.from("profiles").select("nome,fascia,tipo_utente").eq("id", userId).maybeSingle();
    if (p) {
      coda += lingua !== "it"
        ? `\n\nUser profile: name ${p.nome || "n/a"}, age group ${p.fascia || "n/a"}, type ${p.tipo_utente}.`
        : `\n\nProfilo utente: nome ${p.nome || "n.d."}, fascia ${p.fascia || "n.d."}, tipo ${p.tipo_utente}.`;
    }
  } catch { /* profilo opzionale */ }
  if (typeof body.contesto === "string" && body.contesto.trim()) {
    coda += (lingua !== "it" ? "\n\nContext: " : "\n\nContesto: ") + body.contesto.slice(0, 2000);
  }

  const ultimaDomanda = messaggi[messaggi.length - 1].testo;
  const ingresso: IngressoChat = { base, coda, messaggi };

  // Strada del motore; se è spento o dà errore prima di rispondere si passa alla strada di sempre.
  const m = motoreApp(imp);
  if (m) {
    try {
      return await rispostaMotore(m, ingresso, g.ctx, ultimaDomanda, req.signal);
    } catch (e) {
      console.error("[ai] chat col motore, ripiego sulla strada di sempre:", e instanceof Error ? e.message : "errore");
    }
  }
  return rispostaDiSempre(ingresso, g.ctx, ultimaDomanda);
}

/** Chat attraverso il motore: stesso testo in streaming, ma con cache dei prompt, modello meno caro che basta e conti veri. */
async function rispostaMotore(m: MotoreApp, ingresso: IngressoChat, ctx: Contesto, ultimaDomanda: string, segnaleRichiesta: AbortSignal): Promise<Response> {
  const { userId, sb } = ctx;
  const ac = new AbortController();
  segnaleRichiesta.addEventListener("abort", () => ac.abort(), { once: true });
  const it = m.motore.flusso(ID_CHAT, ingresso, { utente: userId, segnale: ac.signal })[Symbol.asyncIterator]();
  // Il primo pezzo si attende qui: se il motore fallisce prima di rispondere, la rotta può ancora usare la strada di sempre.
  const primo = await it.next();
  if (primo.done) throw new Error("il motore non ha risposto");

  const enc = new TextEncoder();
  let risposta = "";
  const corpo = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let passo: IteratorResult<{ delta?: string; fine?: Risultato }> = primo;
        let fine: Risultato | undefined;
        while (!passo.done) {
          if (passo.value.delta) {
            risposta += passo.value.delta;
            controller.enqueue(enc.encode(passo.value.delta));
          }
          if (passo.value.fine) fine = passo.value.fine;
          passo = await it.next();
        }
        if (fine) await registraUsoMotore(userId, "chat", fine);
        await salvaChat(sb, userId, ultimaDomanda, risposta);
        controller.close();
      } catch (e) {
        console.error("[ai] chat:", e instanceof Error ? e.message : "errore");
        controller.error(e);
      }
    },
    cancel() { ac.abort(); void it.return?.(undefined); },
  });
  return new Response(corpo, { headers: INTESTAZIONI_TESTO });
}

/** La strada di prima, senza motore: chiamata diretta ad Anthropic. Resta come ripiego. */
async function rispostaDiSempre(ingresso: IngressoChat, ctx: Contesto, ultimaDomanda: string): Promise<Response> {
  const { userId, sb, imp } = ctx;
  const client = new Anthropic({ apiKey: imp.anthropicKey ?? "" });
  const modello = imp.modelloChat;

  const stream = client.messages.stream({
    model: modello,
    max_tokens: 900,
    system: ingresso.base + ingresso.coda,
    messages: ingresso.messaggi.map((m) => ({ role: m.ruolo, content: m.testo })),
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
        await salvaChat(sb, userId, ultimaDomanda, risposta);
        controller.close();
      } catch (e) {
        console.error("[ai] chat:", e instanceof Error ? e.message : "errore");
        controller.error(e);
      }
    },
    cancel() { stream.abort(); },
  });

  return new Response(body$, { headers: INTESTAZIONI_TESTO });
}
