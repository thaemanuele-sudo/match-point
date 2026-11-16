import Anthropic from "@anthropic-ai/sdk";
import { guardia, errore, type Contesto } from "@/lib/ai/guardia";
import { costoToken, registraUso } from "@/lib/ai/costi";
import type { RisultatoAnalisi } from "@/lib/types";
import { linguaAI, type LinguaAI } from "@/lib/ai/lingue";
import { ID_ANALISI, ISTRUZIONI, testoFinaleAnalisi, type IngressoAnalisi } from "@/lib/ai/compiti";
import { motoreApp, registraUsoMotore } from "@/lib/ai/motore";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FOTOGRAMMI = 8;
const MAX_BYTE = 6 * 1024 * 1024;

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

  const base64: string[] = [];
  for (const f of frames) {
    const m = /^data:image\/jpeg;base64,(.+)$/s.exec(f);
    if (!m) return errore(400, "formato_non_valido", "I fotogrammi devono essere JPEG in base64.");
    base64.push(m[1]);
  }

  const nota = typeof body.nota === "string" ? body.nota.slice(0, 500) : "";

  // Strada del motore; se è spento o dà errore si passa alla strada di sempre.
  let testo: string | null = null;
  const motore = motoreApp(imp);
  if (motore) {
    try {
      const ingresso: IngressoAnalisi = { lingua, colpo, fotogrammi: base64, nota };
      const r = await motore.motore.esegui(ID_ANALISI, ingresso, { utente: userId, segnale: req.signal });
      await registraUsoMotore(userId, "analisi", r);
      testo = r.testo;
    } catch (e) {
      console.error("[ai] analisi col motore, ripiego sulla strada di sempre:", e instanceof Error ? e.message : "errore");
    }
  }
  if (testo === null) {
    try {
      testo = await analisiDiSempre(g.ctx, lingua, colpo, base64, nota);
    } catch (e) {
      console.error("[ai] analisi:", e instanceof Error ? e.message : "errore");
      return errore(500, "errore_ai", "Analisi non riuscita, riprova.");
    }
  }

  const risultato = ripara(testo, colpo);

  const { data, error } = await sb.from("analyses").insert({ user_id: userId, colpo, risultato }).select("id").single();
  if (error) console.error("[ai] salvataggio analisi:", error.message);

  return Response.json({ id: data?.id ?? null, ...risultato });
}

/** La strada di prima, senza motore: chiamata diretta ad Anthropic con lo stesso prompt. Resta come ripiego. */
async function analisiDiSempre(ctx: Contesto, lingua: LinguaAI, colpo: string, base64: string[], nota: string): Promise<string> {
  const { userId, imp } = ctx;
  const contenuto: Anthropic.ContentBlockParam[] = [];
  base64.forEach((data, i) => {
    contenuto.push({ type: "text", text: `Fotogramma ${i + 1}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  contenuto.push({ type: "text", text: testoFinaleAnalisi(nota) });

  const modello = imp.modelloAnalisi;
  const finale = await new Anthropic({ apiKey: imp.anthropicKey ?? "" }).messages.create({
    model: modello,
    max_tokens: 2500,
    system: ISTRUZIONI(lingua, colpo),
    messages: [{ role: "user", content: contenuto }],
  });
  const tin = finale.usage.input_tokens;
  const tout = finale.usage.output_tokens;
  await registraUso(userId, "anthropic", modello, "analisi", tin, tout, 0, costoToken(imp.prezzi, modello, tin, tout));
  return finale.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
