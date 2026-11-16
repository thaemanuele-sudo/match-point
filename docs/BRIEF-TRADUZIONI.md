# Brief per gli agenti di traduzione (app Match Point → francese, tedesco, spagnolo)

L'app ora ha cinque lingue: `it`, `en`, `fr`, `de`, `es` (tipo `Lingua` in `lib/i18n/lingua.tsx`; non modificarlo).
Ogni componente ha dizionari con le chiavi `it` ed `en`: `const T = { it: {...}, en: {...} }` usato con `useT(T)`, oppure strutture dati del tipo `DATI[lang]`, `{ it: [...], en: [...] }`, `Record<"it" | "en", ...>`, oggetti con campi `it`/`en` dentro array, ecc.

Compito: nei SOLI file assegnati aggiungi accanto a OGNI `en` le versioni `fr`, `de`, `es`, con le stesse chiavi e la stessa forma (array della stessa lunghezza, stessi tipi).
- Riferimenti: le schermate originali tradotte sono in `/home/claude/mp-design/fr/<Nome>.dc.html`, `/home/claude/mp-design/es/<Nome>.dc.html`, `/home/claude/mp-design/de/<Nome>.dc.html` (stesso layout di `/home/claude/mp-design/en/`). Quando un testo esiste nel disegno della lingua, usa ESATTAMENTE quella traduzione, così app e schermate del sito coincidono. Per i testi che non sono nei disegni (errori, caricamento, accesso…) traduci tu dall'inglese/italiano.
- Francese di Francia, tedesco con "du", spagnolo di Spagna con "tú". Terminologia tennis corretta (FR: coup droit, revers, service, volée, smash, amorti, slice; DE: Vorhand, Rückhand, Aufschlag, Volley, Schmetterball, Stopp, Slice; ES: derecha, revés, saque, volea, smash/remate, dejada, cortado). Tab: FR "Coach IA / Technique / Tactique / Physique", DE "KI-Coach / Technik / Taktik / Athletik", ES "Coach IA / Técnica / Táctica / Físico".
- Numeri: in FR/DE/ES la virgola decimale (1,8 m) e i formati locali; unità e codici (DR-02, U12, km/h) invariati. Nomi propri invariati.
- Dove il codice usa tipi limitati a `"it" | "en"` (es. `Record<"it" | "en", X>`, `lang === "en" ? ... : ...`, `as "it" | "en"`) adattali alle cinque lingue nei tuoi file. Le date con `toLocaleDateString` devono usare la lingua corrente (it-IT, en-GB, fr-FR, de-DE, es-ES).
- Componenti condivisi: `CampoAnimato` accetta già `lingua` di tipo `Lingua`.
- Non toccare file non assegnati, non fare commit, build o install. Verifica con `npx tsc --noEmit -p . 2>&1 | grep -F "<tuo file>"` che i tuoi file non abbiano errori (gli errori degli altri file non sono tuoi).
- Rapporto finale in italiano, breve: file fatti, esito tsc dei tuoi file.
