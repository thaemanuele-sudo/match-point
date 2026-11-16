"use client";
/* Impostazioni: chiavi API (mai mostrate), modelli, voce, budget e tabella prezzi. Tutto passa da admin_get_settings / admin_set_setting. */
import { useCallback, useEffect, useState } from "react";
import { Campo, Errore, errMsg, useAdmin } from "./comuni";

type Riga = { key: string; value: string; is_secret: boolean; impostata: boolean; aggiornato_il: string };
type Prezzi = Record<string, { in: number; out: number } | number>;

const MODELLI_CHAT = ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"];
const MODELLI_TTS = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"];
const VOCI = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];
const PREZZI_BASE: Prezzi = {
  "claude-opus-5-5": { in: 4, out: 20 }, "claude-sonnet-5-5": { in: 2, out: 10 }, "claude-haiku-5-5": { in: 0.1, out: 0.5 }, tts_per_milione_caratteri: 15,
};

/** Mostra solo la coda della chiave: il valore intero non deve mai finire a schermo. */
function maschera(r: Riga | undefined) {
  if (!r?.impostata) return null;
  const v = r.value || "";
  if (v.startsWith("•") || v.startsWith("*")) return v;
  return "••••" + (v.length > 8 ? v.slice(-4) : "");
}

export function Impostazioni() {
  const { sb, avvisa } = useAdmin();
  const [righe, setRighe] = useState<Record<string, Riga> | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [f, setF] = useState({ chat: "", analisi: "", tts: "", voce: "", budget: "0" });
  const [prezzi, setPrezzi] = useState<Prezzi>(PREZZI_BASE);
  const [chiavi, setChiavi] = useState({ anthropic_api_key: "", openai_api_key: "" });
  const [occ, setOcc] = useState<string | null>(null);

  const carica = useCallback(async () => {
    const { data, error } = await sb.rpc("admin_get_settings");
    if (error) return setErrore(errMsg(error));
    setErrore(null);
    const m: Record<string, Riga> = {};
    (data as Riga[]).forEach((r) => { m[r.key] = r; });
    setRighe(m);
    setF({
      chat: m.anthropic_model_chat?.value || MODELLI_CHAT[0], analisi: m.anthropic_model_analisi?.value || MODELLI_CHAT[0],
      tts: m.openai_tts_model?.value || MODELLI_TTS[0], voce: m.openai_tts_voice?.value || VOCI[0], budget: m.budget_mensile_utente_usd?.value ?? "0",
    });
    try { setPrezzi({ ...PREZZI_BASE, ...(JSON.parse(m.prezzi?.value || "{}") as Prezzi) }); } catch { setErrore("La tabella prezzi salvata non è un JSON valido: ho caricato i valori di base."); }
  }, [sb]);
  useEffect(() => { void carica(); }, [carica]);

  const scrivi = async (nome: string, coppie: [string, string, boolean][], ok: string) => {
    setOcc(nome); setErrore(null);
    for (const [k, v, s] of coppie) {
      const { error } = await sb.rpc("admin_set_setting", { p_key: k, p_value: v, p_secret: s });
      if (error) { setOcc(null); return setErrore(errMsg(error)); }
    }
    setOcc(null);
    avvisa(ok);
    void carica();
  };
  const salvaChiave = async (k: "anthropic_api_key" | "openai_api_key") => {
    const v = chiavi[k].trim();
    if (!v) return;
    await scrivi(k, [[k, v, true]], "Chiave salvata");
    setChiavi((c) => ({ ...c, [k]: "" }));
  };
  const salvaGenerali = () => {
    const b = Number(f.budget.replace(",", "."));
    if (!Number.isFinite(b) || b < 0) return setErrore("Il budget deve essere un numero maggiore o uguale a 0.");
    void scrivi("generali", [
      ["anthropic_model_chat", f.chat, false], ["anthropic_model_analisi", f.analisi, false], ["openai_tts_model", f.tts, false],
      ["openai_tts_voice", f.voce, false], ["budget_mensile_utente_usd", String(b), false],
    ], "Impostazioni salvate");
  };
  const salvaPrezzi = () => void scrivi("prezzi", [["prezzi", JSON.stringify(prezzi), false]], "Prezzi salvati");

  if (!righe) return errore ? <Errore testo={errore} /> : <div className="db-caric"><span className="db-spin" aria-label="Caricamento" /></div>;

  const modelliPrezzi = Object.keys(prezzi).filter((k) => typeof prezzi[k] === "object");
  const setPrezzo = (m: string, c: "in" | "out", v: string) =>
    setPrezzi((p) => ({ ...p, [m]: { ...(p[m] as { in: number; out: number }), [c]: Number(v.replace(",", ".")) || 0 } }));

  const Chiave = ({ k, nome }: { k: "anthropic_api_key" | "openai_api_key"; nome: string }) => {
    const m = maschera(righe[k]);
    return (
      <div className="db-campo intera">
        <span>{nome}</span>
        <div className="db-sec-pwd">
          <span className={"db-badge " + (m ? "verde" : "arancio")}>{m ? `Impostata ${m}` : "Non impostata"}</span>
        </div>
        <div className="db-sec-pwd">
          <input type="password" autoComplete="new-password" placeholder={m ? "Incolla una nuova chiave per sostituirla" : "Incolla la chiave"} aria-label={nome}
            value={chiavi[k]} onChange={(e) => setChiavi((c) => ({ ...c, [k]: e.target.value }))} style={{ flex: "1 1 220px", minHeight: 44, border: 0, borderRadius: 10, background: "var(--campo)", padding: "0 12px", fontSize: 16 }} />
          <button type="button" className="db-btn2 acc" disabled={!chiavi[k].trim() || occ === k} onClick={() => void salvaChiave(k)}>{occ === k ? "Salvo…" : "Salva chiave"}</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="db-testa">
        <div><h1 className="db-titolo">Impostazioni</h1>
          <p className="db-sotto">Le variabili d&apos;ambiente di Vercel (ANTHROPIC_API_KEY, OPENAI_API_KEY), se impostate, hanno la precedenza su quanto salvato qui.</p></div>
      </div>
      <Errore testo={errore} />

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Chiavi API</h2><span className="db-nota">il valore non viene mai mostrato</span></div>
        <div className="db-form">
          <Chiave k="anthropic_api_key" nome="Chiave API Claude (Anthropic)" />
          <Chiave k="openai_api_key" nome="Chiave API OpenAI (voce)" />
        </div>
      </section>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Modelli, voce e budget</h2></div>
        <div className="db-form">
          <Campo lab="Modello chat"><select value={f.chat} onChange={(e) => setF({ ...f, chat: e.target.value })}>{MODELLI_CHAT.map((m) => <option key={m}>{m}</option>)}</select></Campo>
          <Campo lab="Modello analisi video"><select value={f.analisi} onChange={(e) => setF({ ...f, analisi: e.target.value })}>{MODELLI_CHAT.map((m) => <option key={m}>{m}</option>)}</select></Campo>
          <Campo lab="Modello voce (TTS)"><select value={f.tts} onChange={(e) => setF({ ...f, tts: e.target.value })}>{MODELLI_TTS.map((m) => <option key={m}>{m}</option>)}</select></Campo>
          <Campo lab="Voce"><select value={f.voce} onChange={(e) => setF({ ...f, voce: e.target.value })}>{VOCI.map((m) => <option key={m}>{m}</option>)}</select></Campo>
          <Campo lab="Budget mensile per utente (USD)" nota="0 = illimitato. Oltre il limite l'AI risponde con errore 402."><input type="text" inputMode="decimal" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Campo>
        </div>
        <div className="db-azioni"><button type="button" className="db-btn2 acc" disabled={occ === "generali"} onClick={salvaGenerali}>{occ === "generali" ? "Salvo…" : "Salva"}</button></div>
      </section>

      <section className="db-card">
        <div className="db-card-testa"><h2 className="db-h2">Tabella prezzi</h2><span className="db-nota">dollari per milione di token</span></div>
        <div className="db-form"><div className="intera" style={{ overflowX: "auto" }}>
          <table className="db-tabprezzi">
            <thead><tr><th>Modello</th><th>Input</th><th>Output</th></tr></thead>
            <tbody>
              {modelliPrezzi.map((m) => {
                const p = prezzi[m] as { in: number; out: number };
                return (
                  <tr key={m}>
                    <td>{m}</td>
                    <td><input type="text" inputMode="decimal" aria-label={`${m} input`} defaultValue={p.in} onBlur={(e) => setPrezzo(m, "in", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" aria-label={`${m} output`} defaultValue={p.out} onBlur={(e) => setPrezzo(m, "out", e.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Campo lab="Voce: dollari per milione di caratteri"><input type="text" inputMode="decimal" defaultValue={Number(prezzi.tts_per_milione_caratteri) || 0}
          onBlur={(e) => setPrezzi((p) => ({ ...p, tts_per_milione_caratteri: Number(e.target.value.replace(",", ".")) || 0 }))} /></Campo>
        </div>
        <div className="db-azioni"><button type="button" className="db-btn2 acc" disabled={occ === "prezzi"} onClick={salvaPrezzi}>{occ === "prezzi" ? "Salvo…" : "Salva prezzi"}</button></div>
      </section>
    </>
  );
}
