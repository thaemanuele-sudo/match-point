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

/** Campi che indicano una voce dell'account (e non di serie). */
const CAMPI_PROPRIETARIO = ["owner", "owner_id", "user_id", "created_by"];
/** Nome dell'array nella risposta che fa pensare a voci dell'utente: custom_voices, user_voices, cloned, my_voices… */
const NOME_ARRAY_CLONATE = /custom|user|clon|(^|[._-])my|(^|[._-])own|mine/i;

type Grezza = { dato: unknown; daArrayClonate: boolean };

/** Raccoglie TUTTI gli array della risposta (anche annidati di un livello): KittenML può separare voci di serie e voci dell'utente. */
function raccogliArray(j: unknown): Grezza[] {
  const out: Grezza[] = [];
  const aggiungi = (arr: unknown[], nome: string) => { for (const dato of arr) out.push({ dato, daArrayClonate: NOME_ARRAY_CLONATE.test(nome) }); };
  if (Array.isArray(j)) { aggiungi(j, ""); return out; }
  if (!j || typeof j !== "object") return out;
  for (const [k1, v1] of Object.entries(j as Record<string, unknown>)) {
    if (Array.isArray(v1)) { aggiungi(v1, k1); continue; }
    if (v1 && typeof v1 === "object") {
      for (const [k2, v2] of Object.entries(v1 as Record<string, unknown>)) {
        if (Array.isArray(v2)) aggiungi(v2, `${k1}.${k2}`);
      }
    }
  }
  return out;
}

/** Legge un elenco di voci da un indirizzo; null se KittenML non lo offre (così si può unire con altri elenchi). */
async function leggiElenco(url: string, chiave: string, obbligatorio: boolean): Promise<unknown | null> {
  try {
    const r = await fetch(url, { headers: { authorization: `Bearer ${chiave}` }, signal: AbortSignal.timeout(ATTESA_ELENCO_MS), cache: "no-store" });
    if (!r.ok) {
      if (obbligatorio) throw new Error(r.status === 401 || r.status === 403 ? "Chiave KittenML non valida." : `KittenML ha risposto ${r.status}.`);
      return null;
    }
    return await r.json().catch(() => null);
  } catch (e) {
    if (obbligatorio) throw e instanceof Error ? e : new Error("KittenML non risponde.");
    return null;
  }
}

export type ElencoVoci = { voci: VoceKitten[]; ricevute: number; clonate: number };

/**
 * Elenco delle voci di KittenML. Unisce tutti gli array della risposta (voci di serie + voci dell'account/clonate),
 * senza doppioni. Le clonate si mostrano sempre, in qualunque lingua; le altre solo italiane, salvo `tutte`.
 * Lancia un Error leggibile se Kitten non risponde.
 */
export async function elencoVoci(chiave: string, tutte = false): Promise<ElencoVoci> {
  // Un solo indirizzo è documentato (/voices?model=…). Si prova anche /voices senza filtro del modello:
  // il filtro potrebbe escludere le voci clonate, e se non c'è si ignora in silenzio.
  const [principale, senzaFiltro] = await Promise.all([
    leggiElenco(`${API}/voices?model=${MODELLO_KITTEN}`, chiave, true),
    leggiElenco(`${API}/voices`, chiave, false),
  ]);
  const grezze = [...raccogliArray(principale), ...raccogliArray(senzaFiltro)];
  const perId = new Map<string, { voce: VoceKitten; o: Record<string, unknown> }>();
  for (const { dato: v, daArrayClonate } of grezze) {
    const o: Record<string, unknown> = typeof v === "string" ? { name: v } : v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    const id = testo(o.id) ?? testo(o.voice_id) ?? testo(o.name);
    if (!id) continue;
    const tipo = JSON.stringify([o.type, o.category, o.source, o.kind]).toLowerCase();
    const clonata =
      daArrayClonate || id.startsWith("voice_") || o.cloned === true || o.custom === true ||
      CAMPI_PROPRIETARIO.some((c) => o[c] != null && o[c] !== "") || /clon|custom|user/.test(tipo);
    const gia = perId.get(id);
    if (gia) { if (clonata) gia.voce.clonata = true; continue; } // doppione: si tiene una sola voce, clonata se lo è in una delle due
    perId.set(id, { voce: { id, nome: testo(o.display_name) ?? testo(o.name) ?? id, genere: leggiGenere(o), clonata }, o });
  }
  const tutteLeVoci = [...perId.values()];
  const voci = tutteLeVoci.filter(({ voce, o }) => tutte || voce.clonata || eItaliana(o, false)).map((x) => x.voce);
  // le clonate in testa: sono quelle che il cliente cerca
  voci.sort((a, b) => Number(b.clonata) - Number(a.clonata) || a.nome.localeCompare(b.nome, "it"));
  return { voci, ricevute: tutteLeVoci.length, clonate: tutteLeVoci.filter((x) => x.voce.clonata).length };
}

/** Elenco delle sole voci italiane (più le clonate, sempre) dell'account. */
export async function vociItaliane(chiave: string): Promise<VoceKitten[]> {
  return (await elencoVoci(chiave, false)).voci;
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
