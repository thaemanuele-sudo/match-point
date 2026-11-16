import Anthropic from "@anthropic-ai/sdk";
import { guardia, errore } from "@/lib/ai/guardia";
import { costoToken, registraUso } from "@/lib/ai/costi";
import type { RisultatoAnalisi } from "@/lib/types";
import { linguaAI, NOME_LINGUA, type LinguaAI } from "@/lib/ai/lingue";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FOTOGRAMMI = 8;
const MAX_BYTE = 6 * 1024 * 1024;

const ISTRUZIONI = (lingua: LinguaAI, colpo: string) => `${
  lingua !== "it"
    ? "You are a tennis biomechanics expert. You receive sequential video frames (numbered from 1) of a player performing: " + colpo + ". Analyse the technique, aimed at players aged 10-18 and adults; be concrete and safe. Write every text field in " + NOME_LINGUA[lingua] + "."
    : "Sei un biomeccanico del tennis esperto. Ricevi fotogrammi in sequenza (numerati da 1) di un giocatore che esegue: " + colpo + ". Analizza la tecnica, per allievi dai 10 ai 18 anni e adulti; sii concreto e prudente. Scrivi ogni testo in italiano."
}

Codici errore: prefisso del colpo (DR diritto, RV rovescio, SV servizio, VL volée, SM smash, BK back) + "-" + numero a due cifre, es. "DR-02".
Rispondi SOLO con un oggetto JSON, senza testo prima o dopo e senza markdown, con questa forma:
{"colpo":string,"punteggio":0-100,"sintesi":string,"fasi":[{"nome":string,"voto":0-10,"nota":string}],"errori":[{"codice":string,"titolo":string,"descrizione":string,"gravita":"alta"|"media"|"bassa","fotogramma":numero del fotogramma}],"correzioni":[{"titolo":string,"descrizione":string}],"esercizi":[{"titolo":string,"dosaggio":string}]}`;

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const lista = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];

/** Estrae il JSON tra la prima { e l'ultima } e riempie i valori mancanti. */
function ripara(testo: string, colpo: string): RisultatoAnalisi {
  let o: Record<string, unknown> = {};
  const a = testo.indexOf("{");
  const b = testo.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { o = JSON.parse(testo.slice(a, b + 1)); } catch { /* JSON rotto: valori di default */ }
  }
  return {
    colpo: str(o.colpo, colpo),
    punteggio: Math.round(num(o.punteggio, 0, 0, 100)),
    sintesi: str(o.sintesi),
    fasi: lista(o.fasi).map((f) => ({ nome: str(f.nome), voto: num(f.voto, 0, 0, 10), nota: str(f.nota) })),
    errori: lista(o.errori).map((e) => ({
      codice: str(e.codice),
      titolo: str(e.titolo),
      descrizione: str(e.descrizione),
      gravita: e.gravita === "alta" || e.gravita === "bassa" ? e.gravita : "media",
      fotogramma: Math.round(num(e.fotogramma, 1, 1, MAX_FOTOGRAMMI)),
    })),
    correzioni: lista(o.correzioni).map((c) => ({ titolo: str(c.titolo), descrizione: str(c.descrizione) })),
    esercizi: lista(o.esercizi).map((x) => ({ titolo: str(x.titolo), dosaggio: str(x.dosaggio) })),
  };
}

export async function POST(req: Request) {
  const g = await guardia();
  if (!g.ok) return g.risposta;
  const { userId, sb, imp } = g.ctx;
  if (!imp.anthropicKey) return errore(503, "chiave_mancante", "L'analisi AI non è ancora configurata.");

  let body: { colpo?: unknown; fotogrammi?: unknown; nota?: unknown; lingua?: unknown };
  try { body = await req.json(); } catch { return errore(400, "richiesta_non_valida", "Corpo della richiesta non valido."); }
  const lingua = linguaAI(body.lingua);
  const colpo = str(body.colpo, "tennis").slice(0, 40);
  const frames = Array.isArray(body.fotogrammi) ? body.fotogrammi.filter((f): f is string => typeof f === "string") : [];

  if (frames.length < 1) return errore(400, "richiesta_non_valida", "Servono dei fotogrammi.");
  if (frames.length > MAX_FOTOGRAMMI) return errore(413, "troppi_fotogrammi", `Massimo ${MAX_FOTOGRAMMI} fotogrammi.`);
  if (frames.reduce((s, f) => s + f.length, 0) > MAX_BYTE) return errore(413, "troppo_grande", "I fotogrammi superano i 6 MB.");

  const immagini: Anthropic.ImageBlockParam[] = [];
  for (const f of frames) {
    const m = /^data:image\/jpeg;base64,(.+)$/s.exec(f);
    if (!m) return errore(400, "formato_non_valido", "I fotogrammi devono essere JPEG in base64.");
    immagini.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: m[1] } });
  }

  const nota = typeof body.nota === "string" ? body.nota.slice(0, 500) : "";
  const contenuto: Anthropic.ContentBlockParam[] = [];
  immagini.forEach((img, i) => {
    contenuto.push({ type: "text", text: `Fotogramma ${i + 1}:` }, img);
  });
  contenuto.push({ type: "text", text: nota ? `Nota del giocatore: ${nota}\nAnalizza e rispondi solo con il JSON.` : "Analizza e rispondi solo con il JSON." });

  const modello = imp.modelloAnalisi;
  let finale: Anthropic.Message;
  try {
    finale = await new Anthropic({ apiKey: imp.anthropicKey }).messages.create({
      model: modello,
      max_tokens: 2500,
      system: ISTRUZIONI(lingua, colpo),
      messages: [{ role: "user", content: contenuto }],
    });
  } catch (e) {
    console.error("[ai] analisi:", e instanceof Error ? e.message : "errore");
    return errore(500, "errore_ai", "Analisi non riuscita, riprova.");
  }

  const tin = finale.usage.input_tokens;
  const tout = finale.usage.output_tokens;
  await registraUso(userId, "anthropic", modello, "analisi", tin, tout, 0, costoToken(imp.prezzi, modello, tin, tout));

  const testo = finale.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const risultato = ripara(testo, colpo);

  const { data, error } = await sb.from("analyses").insert({ user_id: userId, colpo, risultato }).select("id").single();
  if (error) console.error("[ai] salvataggio analisi:", error.message);

  return Response.json({ id: data?.id ?? null, ...risultato });
}
