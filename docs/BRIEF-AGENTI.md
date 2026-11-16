# Brief comune per gli agenti che costruiscono Match Point

Repository: `/home/claude/match-point` (Next.js 15 App Router, React 19, TS strict). Leggi PRIMA `docs/ARCHITETTURA.md`, poi i file condivisi:
`lib/i18n/lingua.tsx`, `lib/rotte.ts`, `lib/types.ts`, `lib/contenuti.ts`, `lib/useProfilo.ts`, `components/app/Schermo.tsx`, `components/app/TabBar.tsx`, `components/app/LinguaChip.tsx`, `components/app/app.css`, `components/schemi/CampoAnimato.tsx`.

Regole di lavoro (obbligatorie):
1. Lavori SOLO nelle cartelle/file che ti sono assegnati. Altri agenti lavorano in parallelo sulle altre cartelle: non toccare file condivisi (se ti serve una modifica a un file condiviso, scrivila nel rapporto finale e trova un modo locale).
2. Non fare `git commit`, `git add`, né `npx next build`, né `npm install` (le dipendenze sono già installate: next, react, @supabase/ssr, @supabase/supabase-js, @anthropic-ai/sdk). Per verificare usa `npx tsc --noEmit -p .` e correggi SOLO gli errori dei tuoi file.
3. Ogni pagina dell'app è un Client Component (`"use client"`) in `app/app/<slug>/page.tsx` con lo slug esatto di `lib/rotte.ts`. Il componente della schermata sta in `components/app/<gruppo>/<Nome>.tsx` con il suo `<Nome>.module.css`.
4. Fedeltà ai disegni: riproduci ogni schermata da `/home/claude/mp-design/it/<Nome>.dc.html` (testi italiani) e `/home/claude/mp-design/en/<Nome>.dc.html` (testi inglesi, stesso layout). Copia gli stili in linea in CSS Module (classi con nomi chiari). La parte interattiva dei disegni (`class Component extends DCLogic`, `this.state`, `renderVals`) diventa `useState` in React. Ignora la cornice dell'iPhone, l'isola dinamica, la riga del titolo "01 · ..." e il wrapper 473×1010: la schermata riempie `.mp-screen` (larghezza piena del telefono, max 430px). La `<nav class="tabbar">` dei disegni si sostituisce con `<Schermo tab="...">`.
5. Testi: niente stringhe visibili fuori dal dizionario. In ogni componente `const T = { it: {...}, en: {...} }` + `const t = useT(T)`. I testi inglesi li prendi dal disegno EN. Per i dati ripetuti (liste, tabelle), dizionari con array: `T.it.righe` / `T.en.righe`. `useT` accetta un oggetto con valori stringa: per array e oggetti usa invece `const { lang } = useLang()` e `DATI[lang]`.
6. Il cambio lingua nelle intestazioni usa `<LinguaChip />`. L'avatar con le iniziali usa `useProfilo()` + `iniziali()`. Il nome "Ciao Coach" ecc. diventa il nome vero dell'utente quando c'è.
7. Accessibilità: bottoni veri (`<button type="button">`) per le azioni, `aria-label` sulle icone, contrasti come nei disegni.
8. Commenti in italiano, brevi, spiegano il perché. Niente chiavi o segreti nel codice.
9. Alla fine: rapporto breve in italiano con l'elenco dei file creati, cosa è collegato a dati veri e cosa resta dimostrativo, e l'esito di `npx tsc --noEmit` per i tuoi file.
