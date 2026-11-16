import "server-only";
/**
 * Voce di KittenML (solo server). API https://api.kittenml.com/v1, stesso formato di OpenAI.
 * L'elenco delle voci comprende anche quelle clonate dall'account (id «voice_…»), che si passano come { id }.
 * La forma esatta dell'elenco non è documentata in modo stabile, quindi la si legge con prudenza.
 */

const API = "https://api.kittenml.com/v1";
export const MODELLO_KITTEN = "kitten-tts-2-latest";
// Il telefono non aspetta all'infinito: meglio un errore chiaro che una voce che non arriva mai.
const ATTESA_ELENCO_MS = 6000;
const ATTESA_AUDIO_MS = 25000;

export type VoceKitten = {
  id: string;
  nome: string;
  genere: "maschile" | "femminile" | null;
  clonata: boolean;
};

const testo = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Voce di serie (per nome) oppure clonata (per id «voice_…»), nel formato che Kitten si aspetta. */
export const campoVoce = (id: string): string | { id: string } => (id.startsWith("voice_") ? { id } : id);

function leggiGenere(o: Record<string, unknown>): VoceKitten["genere"] {
  const g = (testo(o.gender) ?? testo(o.sex) ?? "").toLowerCase();
  if (g.startsWith("m")) return "maschile";
  if (g.startsWith("f")) return "femminile";
  return null;
}

/** Una voce è italiana se lo dice la lingua o se «italian/italiano» compare nei suoi dati. Le clonate si tengono sempre. */
function eItaliana(o: Record<string, unknown>, clonata: boolean): boolean {
  if (clonata) return true;
  const lingua = (testo(o.language) ?? testo(o.lang) ?? testo(o.locale) ?? "").toLowerCase();
  if (lingua) return lingua === "it" || lingua.startsWith("it-") || lingua.startsWith("it_") || lingua.includes("ital");
  return JSON.stringify(o).toLowerCase().includes("ital");
}

/** Elenco delle sole voci italiane (più le clonate) dell'account. Lancia un Error leggibile se Kitten non risponde. */
export async function vociItaliane(chiave: string): Promise<VoceKitten[]> {
  const r = await fetch(`${API}/voices?model=${MODELLO_KITTEN}`, {
    headers: { authorization: `Bearer ${chiave}` },
    signal: AbortSignal.timeout(ATTESA_ELENCO_MS),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "Chiave KittenML non valida." : `KittenML ha risposto ${r.status}.`);
  const j: unknown = await r.json().catch(() => null);
  const lista = Array.isArray(j) ? j : j && typeof j === "object" ? Object.values(j as Record<string, unknown>).find(Array.isArray) : null;
  const out: VoceKitten[] = [];
  for (const v of Array.isArray(lista) ? lista : []) {
    const o: Record<string, unknown> = typeof v === "string" ? { name: v } : v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    const id = testo(o.id) ?? testo(o.voice_id) ?? testo(o.name);
    if (!id) continue;
    const tipo = JSON.stringify([o.type, o.category, o.source, o.kind]).toLowerCase();
    const clonata = id.startsWith("voice_") || o.cloned === true || o.custom === true || /clon|custom|user/.test(tipo);
    if (!eItaliana(o, clonata)) continue;
    out.push({ id, nome: testo(o.display_name) ?? testo(o.name) ?? id, genere: leggiGenere(o), clonata });
  }
  // le clonate in testa: sono quelle che il cliente cerca
  return out.sort((a, b) => Number(b.clonata) - Number(a.clonata) || a.nome.localeCompare(b.nome, "it"));
}

/** Audio mp3 di Kitten. `voceId` vuoto = prima voce italiana dell'elenco. Lancia un Error con messaggio leggibile. */
export async function audioKitten(chiave: string, input: string, voceId: string | null): Promise<ArrayBuffer> {
  let voce = voceId;
  if (!voce) {
    try { voce = (await vociItaliane(chiave))[0]?.id ?? null; } catch { /* si prova comunque con la lingua */ }
  }
  const r = await fetch(`${API}/audio/speech`, {
    method: "POST",
    headers: { authorization: `Bearer ${chiave}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODELLO_KITTEN, input, voice: voce ? campoVoce(voce) : "Italian", response_format: "mp3", stream: false }),
    signal: AbortSignal.timeout(ATTESA_AUDIO_MS),
  });
  if (!r.ok) {
    // nel registro resta il motivo (voce sbagliata, credito finito…), mai la chiave
    console.error("[ai] kitten:", r.status, (await r.text().catch(() => "")).slice(0, 200));
    throw new Error(r.status === 401 || r.status === 403 ? "Chiave KittenML non valida." : "KittenML non ha prodotto l'audio.");
  }
  const audio = await r.arrayBuffer();
  if (audio.byteLength < 200) throw new Error("KittenML ha restituito un audio vuoto.");
  return audio;
}
