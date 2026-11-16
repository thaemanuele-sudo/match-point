# Match Point — architettura

Un solo progetto Next.js 15 (App Router, React 19, TypeScript, CSS semplice, niente Tailwind), su Vercel, con Supabase.

| Indirizzo | Cosa | Cartelle |
|---|---|---|
| `/` e `/en` | Sito di presentazione IT/EN, nero, stile Apple (come il sito di Archimede) | `app/(sito)/`, `components/sito/`, `lib/sito/`, `public/sito/` |
| `/app/...` | App mobile (PWA) Match Point: Coach AI, Tecnica, Tattica, Atletica | `app/app/`, `components/app/` |
| `/admin` | Super admin, stile iOS come la dashboard di Archimede | `app/admin/`, `components/admin/` |
| `/api/ai/*` | Claude (chat, analisi video) e voce OpenAI o KittenML (motore `voce_motore`, voce scelta `kitten_voce_id` da Impostazioni → «Voce di Match Point», elenco da `/api/admin/voci`), con costo registrato per utente | `app/api/ai/`, `lib/ai/` |
| `/api/admin/*` | Operazioni admin lato server (solo se servono) | `app/api/admin/` |

## Regole per chi scrive codice
- **Niente chiavi nel codice.** Claude, OpenAI e KittenML (`kittenml_api_key`, env `KITTENML_API_KEY`): chiavi salvate dall'admin (tabella `settings`, letta solo dal server con `MP_SERVER_TOKEN`) oppure variabili d'ambiente `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (vincono loro).
- **Due lingue, italiano e inglese**, in app e sito. Ogni schermata ha il suo dizionario `const T = { it: {...}, en: {...} }` e usa `const t = useT(T)` (`lib/i18n/lingua.tsx`). Nessun testo visibile scritto fuori dal dizionario. L'admin è solo in italiano.
- I disegni originali stanno in `/home/claude/mp-design/it/*.dc.html` (italiano) e `/home/claude/mp-design/en/*.dc.html` (inglese, stessi nomi). Ogni schermata va riprodotta **fedelmente** (stessa grafica, stessi testi), adattata a larghezza piena del telefono (max 430px).
- I link `href="X.dc.html"` diventano `<Link href={ROTTE.X}>` (`lib/rotte.ts`).
- Classi grafiche comuni in `components/app/app.css` sotto `.mp`: `card chip chip.on lawn btn btn.ghost sec muted icon field disp brand`. Lo stile specifico di una schermata va in un CSS Module accanto al componente.
- Contenitore: `<Schermo tab="coach|tecnica|tattica|atletica" titolo=… indietro=…>` (`components/app/Schermo.tsx`) — gestisce barra delle schede e intestazione. La cornice dell'iPhone, l'isola dinamica e l'etichetta "01 · ..." dei disegni NON si riproducono.
- Profilo dell'utente: `useProfilo()` (`lib/useProfilo.ts`). Supabase browser: `supabaseBrowser()`.
- Tipi condivisi: `lib/types.ts`. File caricati dall'admin: `urlContenuto(path)` (`lib/contenuti.ts`, bucket pubblico `contenuti`).
- Commenti in italiano, spiegano il perché.

## Contratti delle API AI (le usa l'app, le scrive il gruppo AI)
- `POST /api/ai/chat` body `{ messaggi: {ruolo:"user"|"assistant", testo:string}[], contesto?: string, lingua: "it"|"en" }` → risposta in streaming `text/plain; charset=utf-8` (testo del coach). Errori JSON `{errore}` con 401/402/429/500/503.
- `POST /api/ai/analizza` body `{ colpo: string, fotogrammi: string[] /* data:image/jpeg;base64, max 8 */, nota?: string, lingua }` → JSON `RisultatoAnalisi` (`lib/types.ts`). Salva anche in `analyses`.
- `POST /api/ai/voce` body `{ testo: string (max 1500), lingua }` → `audio/mpeg`.
- Ogni chiamata registra il costo in `ai_usage` (funzione `server_log_usage`) e rispetta `budget_mensile_utente_usd` (402 se superato).

## Database (Supabase `wbnqcsrdlfgaomizghnx`)
Tabelle: `profiles` (nome, cognome, email, telefono obbligatori in registrazione; `ruolo` utente/admin), `settings`, `ai_usage`, `game_schemes` (animazione jsonb, vedi `AnimazioneSchema`), `fitness_videos`, `technique_videos` (errore/correzione collegati), `analyses`, `chat_messages`.
Funzioni: `is_admin()`, `admin_get_settings()`, `admin_set_setting(key,value,secret)`, `admin_users_overview()`, `admin_usage_daily(days,user)`, `server_get_settings(token)`, `server_log_usage(...)`, `server_user_month_cost(token,user)`.
Storage: `contenuti` (pubblico in lettura, scrive solo l'admin), `video-utenti` (privato, cartella = id utente).
