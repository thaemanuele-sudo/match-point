// Copia del Motore: non modificare qui, si modifica nel repository motore
// Deposito su Supabase Storage, con l'API REST e `fetch` (nessun SDK).
//
//   lettura:   GET  {url}/storage/v1/object/{secchio}/{chiave}
//   scrittura: POST {url}/storage/v1/object/{secchio}/{chiave}   con `x-upsert: true`
//
// Intestazioni: Authorization: Bearer {chiave} e apikey: {chiave}. `chiave` è la
// chiave di servizio (o un token con i permessi sul secchio): va tenuta sul
// server, mai nel browser.
//
// In lettura un file mancante dà `null`. Storage lo segnala in due modi: 404, oppure
// 400 con "not found" nel messaggio (succede sui secchi privati). Ogni altro
// errore è un errore vero e si propaga.

import type { Deposito } from "../tipi";

export function depositoSupabase(opz: {
  url: string;
  chiave: string;
  secchio: string;
  fetchFn?: typeof fetch;
}): Deposito {
  // Si avvolge `fetch` globale: chiamato come metodo di un altro oggetto darebbe "Illegal invocation".
  const richiedi: typeof fetch = opz.fetchFn ?? ((input, init) => fetch(input, init));
  const base = opz.url.replace(/\/+$/, "");

  function indirizzo(chiave: string): string {
    // Le barre della chiave ("voce/abc.mp3") restano, ogni pezzo si codifica.
    const percorso = chiave
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");
    return `${base}/storage/v1/object/${encodeURIComponent(opz.secchio)}/${percorso}`;
  }

  const autorizzazione = { Authorization: `Bearer ${opz.chiave}`, apikey: opz.chiave };

  return {
    async leggi(chiave) {
      const r = await richiedi(indirizzo(chiave), { method: "GET", headers: autorizzazione });
      if (r.ok) {
        return {
          dati: new Uint8Array(await r.arrayBuffer()),
          mime: r.headers.get("content-type") ?? "application/octet-stream",
        };
      }
      const corpo = await r.text().catch(() => "");
      if (r.status === 404 || (r.status === 400 && /not[ _-]?found/i.test(corpo))) return null;
      throw new Error(`deposito: lettura di "${chiave}" fallita (${r.status}) ${corpo}`.trim());
    },

    async scrivi(chiave, dati, mime) {
      const r = await richiedi(indirizzo(chiave), {
        method: "POST",
        headers: { ...autorizzazione, "Content-Type": mime, "x-upsert": "true" },
        // Copia in un buffer "normale": è il tipo che `fetch` accetta senza ambiguità.
        body: new Uint8Array(dati),
      });
      if (!r.ok) {
        const corpo = await r.text().catch(() => "");
        throw new Error(`deposito: scrittura di "${chiave}" fallita (${r.status}) ${corpo}`.trim());
      }
    },
  };
}
