# Match Point Centri: piano tecnico (contratto comune per tutti gli agenti)

Questo documento è la fonte unica. Ogni agente lo segue alla lettera e non cambia i nomi qui definiti. Se qualcosa manca, lo aggiunge nel file della propria area e lo scrive nel rapporto finale. Non deve modificare i file di un'altra area.

## Obiettivo
Ogni schermata dei mockup in `/home/claude/mp-design/ruoli/*.dc.html` (52 schermate) diventa una pagina vera dell'app, con dati veri da Supabase e funzioni che funzionano.
- Testi e numeri dei mockup: in `ref/elenco.txt` (numero e titolo), `ref/BRIEF.md`, `ref/BRIEF2.md` e `ref/voce.json` (descrizione parlata di ogni schermata).
- **Solo italiano per ora**: ogni componente ha `const T = { it: {...}, en: {...} }`, dove `en` è una copia di `it` (le traduzioni arriveranno dopo), e usa `useT(T)`. Nessun testo visibile fuori dal dizionario.
- Grafica: fedele ai mockup, cioè nero, giallo palla `#D8F34A`, verde campo, Barlow Condensed per titoli e numeri, Hanken Grotesk per i testi, icone SVG a tratto, mai emoji. Larghezza telefono fino a 430 px.
- Le pagine del centro (direttore tecnico e responsabili) sono **responsive**:
  - sul telefono, colonna singola con la barra in basso;
  - sopra 900 px diventano la **dashboard del centro**, con barra laterale a sinistra, contenuto largo e griglie a più colonne.

## Multi-centro: ogni centro ha il suo "clone" dell'app
- Un solo codice e un solo database. Ogni centro è un **tenant** con i dati isolati da RLS (`centro_id` su ogni tabella).
- Ogni centro ha la sua app brandizzata all'indirizzo `/c/[slug]`:
  - nome dell'app, logo e colori del centro, applicati come variabili CSS `--brand` e `--brand-ink`;
  - manifest PWA dinamico in `/c/[slug]/manifest.webmanifest`, con nome, icona e colori del centro, così le famiglie installano "TC Brera" sul telefono.
- Il super admin crea un centro da zero oppure **clona** un centro esistente o il modello Match Point, con la RPC `clona_centro`:
  - si copiano Metodo, aree, campi, corsi, permessi e impostazioni;
  - non si copiano persone, allievi, messaggi e pagamenti.
- Il centro può anche **registrarsi da solo con prova gratuita** (P3): parte da 30 giorni di prova con stato `prova`, partendo dal modello Match Point.

## Rotte (cartelle in `app/`)
| Rotta | Schermata | Area |
|---|---|---|
| `/app/profili` | P1 Scegli profilo e centro | A |
| `/app/unisciti` | P2 Unisciti a un centro (codice di 6 caratteri o `/app/unisciti?c=CODICE`) | A |
| `/app/registra-centro` | P3 Registra il tuo centro | A |
| `/c/[slug]` | smista al ruolo scelto | F (fondazione) |
| `/c/[slug]/dt` | C1 Panoramica | B |
| `/c/[slug]/dt/maestri` · `/dt/maestri/[id]` · `/dt/osservazione/[id]` | C2 · C3 · C4 | B |
| `/c/[slug]/dt/formazione` | C12 | B |
| `/c/[slug]/dt/metodo/linee-guida` · `libreria` · `modelli` · `programmi` | C5 · C6 · C7 · C8 | C |
| `/c/[slug]/dt/gruppi` · `allievi` · `progressi` | C9 · C10 · C11 | D |
| `/c/[slug]/dt/campi` · `/dt/campi/orari` | C18 · C19 | D |
| `/c/[slug]/dt/organizzazione` · `/dt/permessi` | C20 · C21 | D |
| `/c/[slug]/dt/impostazioni` | C15 | D |
| `/c/[slug]/area` | R1 Area · panoramica (gruppi e campi dell'area riusano le pagine D filtrate per area) | D |
| `/c/[slug]/dt/segnalazioni` · `/dt/avvisi` | C13 · C14 | F2 (comunicazione) |
| `/c/[slug]/area/avviso` | Avviso all'area (riusa il compositore di M12 e C14) | F2 |
| `/c/[slug]/dt/corsi` · `/dt/pagamenti` | C16 · C17 | H |
| `/c/[slug]/maestro` | M1 Oggi | E |
| `/c/[slug]/maestro/gruppi` · `allievi` · `allievi/[id]` | M2 · M3 · M4 | E |
| `/c/[slug]/maestro/lezione/[id]` · `/in-corso` · `/chiusura` | M5 · M6 · M7 | E |
| `/c/[slug]/maestro/valutazioni` · `metodo` · `formazione` | M8 · M9 (C) · M11 (B) | E, C, B |
| `/c/[slug]/maestro/messaggi` · `avviso` · `notifiche` | M10 · M12 · M13 | F2 |
| `/c/[slug]/genitore` · `calendario` · `progressi` · `report` · `figli` | G1 · G2 · G3 · G4 · G7 | G |
| `/c/[slug]/genitore/messaggi` · `segnala` | G5 · G6 | F2 |
| `/c/[slug]/genitore/pagamenti` | G8 | H |
| `/c/[slug]/allievo` · `compiti` | A1 · A2 | G |
| `/c/[slug]/allievo/chat` · `segnala` · `assenza` · `notifiche` | A3 · A4 · A5 · A6 | F2 |
| `/c/[slug]/chat/[id]` | conversazione singola, per tutti i ruoli | F2 |
| `/admin` → scheda "Centri" | super admin: centri, prove, branding, clona, membri, inviti, sospendi | A |
| `/centro/[slug]` | reindirizza a `/c/[slug]/dt` (indirizzo comodo per la dashboard) | F |

Ogni area scrive solo le sue cartelle `app/c/[slug]/<ruolo>/<pagina>/page.tsx` e i componenti in `components/centro/<area>/`. Le pagine sono `"use client"` e leggono i dati con Supabase dal browser, con RLS.

## Fondazione (area F): componenti e funzioni condivise
I nomi sono fissi. Le altre aree li importano anche prima che esistano, per cui nessuno li cambia.
- `lib/centro/tipi.ts`: tipi TypeScript di tutte le tabelle qui sotto, con **gli stessi nomi snake_case delle colonne**. Esempio: `export type Gruppo = { id: string; centro_id: string; nome: string; ... }`. Li scrive l'area DB.
- `lib/centro/contesto.tsx`:
  - `CentroProvider` (nel layout di `/c/[slug]`) carica il centro dallo slug e il membro corrente;
  - `useCentro()` restituisce `{ centro: Centro, membro: Membro | null, ruolo: Ruolo, vistaCome: Membro | null, sb: SupabaseClient, ricarica }`;
  - `ruolo` è il ruolo con cui si sta usando l'app;
  - il super admin e il titolare possono "vedere come" un altro membro, con `?come=<membro_id>` salvato in sessionStorage. `membroAttivo = vistaCome ?? membro`, e ogni query del ruolo usa `membroAttivo.id` e non `auth.uid()`.
- `components/centro/Schermo.tsx`: `<SchermoCentro ruolo="dt|area|maestro|genitore|allievo" tab="..." titolo={...} sopra={...} indietro={href|true} azioni={...} largo?>`.
  - Sul telefono ha l'intestazione e la barra in basso del ruolo.
  - Per `dt` e `area`, sopra 900 px usa la barra laterale (dashboard).
- `components/centro/barre.ts`: voci delle barre (vedi BRIEF.md e BRIEF2.md).
  - Maestro: Oggi, Allievi, +, Messaggi, Metodo.
  - DT: Centro, Maestri, Metodo, Allievi, Tutela. In laterale anche Gruppi, Campi, Organizzazione, Formazione, Avvisi, Corsi, Pagamenti e Impostazioni.
  - Genitore: Home, Calendario, Progressi, Messaggi.
  - Allievo: Percorso, Compiti, Maestro, Aiuto.
  - Area: Area, Gruppi, Campi, Messaggi.
- `components/centro/ui.tsx`: componenti piccoli e riusabili, uguali ai mockup:
  - `Card`, `Chip`, `Chips`, `Seg`, `Btn`, `Tag`, `Num` (numero grande Barlow), `Barra` (barra di avanzamento %), `Avatar` (iniziali);
  - `Lista`, `Riga`, `Vuoto` (stato vuoto), `Caricamento`, `Errore`, `Interruttore`, `Campo` (input con etichetta), `Foglio` (pannello dal basso), `Ico` (icone del mockup per nome, da `ref/icone.json`);
  - CSS in `components/centro/centro.css` sotto `.mc`, con le stesse classi del template mockup (`card pad li t s tile g2 g3 g4 chip chips btn btn2 sec tag kick h1 big muted num dot bar tbl seg sg note inp hdr`).
- `lib/centro/rotte.ts`: `rotta(slug).dt.maestri` e così via, per tutte le rotte della tabella.
- `lib/centro/notifiche.ts`: `useNotifiche()` (conteggio e lista con realtime) e `segnaLetta(id)`.
- `lib/centro/date.ts`: formati italiani ("mar 17 nov", "17:00") e calcolo delle prossime lezioni da giorni e orario dei gruppi.

## Database: migrazione `0005_centri` (area DB)
Tutte le tabelle hanno `id uuid pk default gen_random_uuid()`, `centro_id uuid not null references centri on delete cascade` (tranne `centri`) e `created_at timestamptz default now()`. RLS è attiva su tutte.

**Ruoli** (enum `ruolo_centro`): `titolare`, `dt`, `responsabile_area`, `maestro`, `segreteria`, `genitore`, `allievo`.

| Tabella | Colonne principali |
|---|---|
| `centri` | `slug unique`, `nome`, `nome_app`, `citta`, `logo_path`, `colore` (default `#D8F34A`), `colore_ink`, `stato` (`prova`, `attivo`, `sospeso`), `prova_fino date`, `piano`, `impostazioni jsonb` (vedi sotto), `creato_da` |
| `membri` | `user_id` (null finché non accetta), `ruolo ruolo_centro`, `nome`, `cognome`, `email`, `telefono`, `area_id` (per responsabile_area), `stato` (`attivo`, `invitato`, `sospeso`). Unique (`centro_id`, `user_id`, `ruolo`, `area_id`) |
| `inviti` | `codice char(6) unique`, `ruolo`, `gruppo_id`, `area_id`, `allievo_id`, `scade_il`, `usi_max`, `usi`, `creato_da` |
| `aree` | `nome`, `sigla`, `fasce text[]`, `ordine` |
| `campi` | `numero int`, `nome`, `superficie` (`terra`, `cemento`, `sintetico`, `erba`), `copertura` (`scoperto`, `coperto`, `pallone`), `luci bool`, `stato` (`disponibile`, `manutenzione`, `chiuso`), `note`, `x`, `y`, `w`, `h` (posizione nella mappa, 0-100) |
| `gruppi` | `area_id`, `nome`, `fascia` (U8…U18, Adulti, Agonisti), `livello`, `giorni int[]` (1 = lunedì), `ora time`, `durata_min`, `campo_id` (campo abituale), `programma_id`, `attivo` |
| `gruppi_maestri` | `gruppo_id`, `membro_id`, `principale bool` |
| `allievi` | `nome`, `cognome`, `data_nascita`, `membro_id` (account proprio, facoltativo), `note_mediche`, `certificato_scade date` |
| `allievi_famiglie` | `allievo_id`, `membro_id` (genitore), `relazione` |
| `iscrizioni` | `allievo_id`, `gruppo_id`, `dal`, `al` |
| `cambi_campo` | `gruppo_id`, `data date`, `campo_da`, `campo_a`, `motivo`, `deciso_da` (membro), `avvisa bool` |
| `lezioni` | `gruppo_id`, `data date`, `ora time`, `campo_id`, `maestro_id`, `modello_id`, `piano jsonb` (blocchi), `svolto jsonb`, `stato` (`programmata`, `in_corso`, `chiusa`), `riassunto`, `riassunto_ok bool`, `compito`, `motivi_scostamento jsonb` |
| `presenze` | `lezione_id`, `allievo_id`, `presente bool`, `voto_rapido int`, `nota`, `nota_audio_path` |
| `assenze` | `allievo_id`, `data date`, `gruppo_id`, `motivo` (`malato`, `scuola`, `viaggio`, `altro`), `testo`, `avvisato_da` (membro) |
| `valutazioni` | `allievo_id`, `maestro_id`, `test` (es. `nov-2026`), `colpo`, `competenza`, `voto int` (1-5), `data` |
| `compiti` | `allievo_id` (null se di gruppo), `gruppo_id`, `maestro_id`, `titolo`, `durata_min`, `esercizio_id`, `scadenza date` |
| `compiti_fatti` | `compito_id`, `allievo_id`, `fatto_il`, `media_path` |
| `note_private` | `allievo_id`, `maestro_id`, `testo` (RLS: solo maestri e staff, mai famiglie) |
| `linee_guida` | `fascia`, `colpo`, `competenze jsonb`, `errori jsonb`, `regola`, `scala jsonb`, `bloccata bool` |
| `esercizi` | `titolo`, `colpo`, `fasce text[]`, `durata_min`, `materiale`, `descrizione`, `video_path`, `fonte` (`matchpoint`, `centro`, `maestro`), `stato` (`approvato`, `proposto`, `rifiutato`), `proposto_da` |
| `modelli_lezione` | `nome`, `durata_min`, `blocchi jsonb` `[{titolo, colpo, minuti, esercizio_id, modo: "bloccato"\|"flessibile"\|"libero", alternative: string[]}]` |
| `programmi` | `nome`, `fascia`, `schema` (`mensile`, `settimanale`, `blocchi`, `periodizzazione`, `libero`), `anno`, `mesi jsonb` `[{mese, tema, colpo, settimane: [{tema, modello_id}]}]`, `settimane_test text[]` |
| `osservazioni` | `maestro_id`, `osservatore_id`, `lezione_id`, `voti jsonb` (tempi, correzione, gruppo, sicurezza), `voto int`, `consigli text[]`, `nota` |
| `corsi_formazione` | `titolo`, `obbligatorio bool`, `moduli int` |
| `formazione` | `corso_id`, `membro_id`, `moduli_fatti`, `certificato_il`, `scadenza` |
| `conversazioni` | `tipo` (`allievo_maestro`, `famiglia_maestro`, `famiglia_segreteria`, `staff`), `allievo_id`, `titolo` |
| `partecipanti` | `conversazione_id`, `membro_id`, `sola_lettura bool` (genitori nella chat figlio-maestro) |
| `messaggi` | `conversazione_id`, `autore_id`, `testo`, `consegna_il timestamptz` (in silenzio dopo le 21, si consegna alle 8:00). **Niente update né delete**: policy assenti e trigger che blocca |
| `avvisi` | `autore_id`, `titolo`, `testo`, `destinatari jsonb` `{tipo: "centro"\|"fascia"\|"gruppo"\|"area"\|"maestro", valori: []}`, `conferma bool`, `promemoria bool`, `consegna_il` |
| `avvisi_letture` | `avviso_id`, `membro_id`, `letto_il` |
| `segnalazioni` | `autore_id` (null se anonima verso tutti), `anonima bool`, `per_allievo_id`, `categoria`, `testo`, `priorita` (`alta`, `media`, `bassa`), `stato` (`nuova`, `presa`, `chiusa`), `riguarda_dt bool`. RLS: le vedono solo dt e titolare; se `riguarda_dt`, solo il titolare. Mai i maestri |
| `segnalazioni_note` | `segnalazione_id`, `autore_id`, `testo` |
| `notifiche` | `membro_id`, `tipo` (`cambio_campo`, `avviso`, `messaggio`, `assenza`, `compito`, `segnalazione`, `pagamento`, `sistema`), `titolo`, `testo`, `link`, `mittente`, `letta_il` |
| `consensi` | `allievo_id`, `tipo` (`privacy`, `foto_video`, `ai`), `valore bool` (default **false**), `firmato_da`, `firmato_il` |
| `permessi_ruolo` | `area_id`, `permessi jsonb` `{gruppi, campi, maestri, avvisi, iscrizioni, pagamenti, metodo: "lettura", tutela: false}` |
| `registro` | `membro_id`, `azione`, `oggetto`, `dettagli jsonb`: tutte le modifiche del Metodo, dei permessi, dei cambi campo e delle sostituzioni di blocco |
| `corsi` | `nome`, `gruppo_id`, `quota_cent int` (null finché non la mette il centro), `sconto_fratelli_pct`, `rate int`, `scadenze jsonb` |
| `quote` | `allievo_id`, `corso_id`, `periodo`, `importo_cent`, `scade_il`, `stato` (`attesa`, `pagata`, `scaduta`), `pagata_il`, `metodo` (`carta`, `segreteria`, `bonifico`), `stripe_id` |

`centri.impostazioni` di default è `{silenzio_da:"21:00", silenzio_a:"08:00", chat_genitori_fino:18, account_ragazzo_da:14, assenza_entro_ore:2, conservazione_mesi:24}`.

**Funzioni** (`security definer`, `search_path = public`):
- `mio_membro(centro uuid)` e `ha_ruolo(centro, ruoli ruolo_centro[])`.
- `is_staff(centro)`: titolare, dt, responsabile_area, segreteria. `is_dt(centro)`: titolare o dt. `is_admin()`: esiste già.
- `unisciti_con_codice(codice text)` → `{centro_slug, ruolo}`.
- `registra_centro(nome, citta, slug, campi int)`: crea il centro in prova, con il chiamante come titolare e dt, e clona il modello.
- `clona_centro(sorgente uuid, nome, slug)`: solo super admin.
- `invia_messaggio(conversazione, testo)`: applica silenzio e sola lettura, e crea le notifiche.
- `invia_avviso(...)`: risolve i destinatari, crea le notifiche e conta i destinatari.
- `cambia_campo(gruppo, data, campo_a, motivo, avvisa)`: controlla i conflitti, crea il cambio, notifica maestro, allievi e famiglie, e scrive nel registro.
- `avvisa_assenza(allievo, data, motivo, testo)`: controlla il limite delle 2 ore e notifica maestro e genitori.
- `segnala(categoria, testo, anonima, per_allievo, riguarda_dt)`.
- `chiudi_lezione(lezione, svolto, presenze, compito)`.
- `panoramica_centro(centro, periodo)`: numeri di C1.
- `aderenza_maestro(membro)`: percentuale dei blocchi bloccati fatti come da piano.

**RLS** (regola generale):
- legge chi è membro del centro, ma limitato al suo perimetro:
  - il maestro vede i suoi gruppi e i loro allievi;
  - il genitore vede i figli;
  - l'allievo vede sé stesso;
  - il responsabile d'area vede la sua area;
  - dt e titolare vedono tutto;
- scrive secondo il ruolo;
- `is_admin()` vede e fa tutto.
- Storage: bucket privato `centri` con cartella `centro_id/...` per loghi, video e note audio. Il logo è pubblico in lettura tramite URL firmato o un bucket `centri-pubblico`.

**Seed dimostrativo** (fonte unica dei dati, risolve le incoerenze dei mockup):
- Centro "Tennis Club Brera", slug `tc-brera`, Milano, stato `attivo`. Più un centro modello `matchpoint-modello` (stato `attivo`, non elencato).
- **Campi:**
  - 1 Centrale, terra, pallone, luci;
  - 2, terra, scoperto, luci;
  - 3, cemento, coperto, luci;
  - 4 Mini, sintetico, scoperto.
- **Aree e responsabili:**
  - SAT (U8-U12): Giulia Sala, Marco Ferri;
  - Pre-accademia (U12-U14): Marco Ferri;
  - Accademia (U14-U18): Paolo Riva;
  - Agonistica: Paolo Riva, Davide Neri;
  - Adulti: Sara Conti, Elena Gatti;
  - DT: Laura Neri.
- **Gruppi** (orario, campo, maestro, allievi):

| Gruppo | Area | Giorni e ora | Campo | Maestro | Allievi |
|---|---|---|---|---|---|
| U8 Mini | SAT | sab 10:00 | 4 | Giulia | 6 |
| U10 Base | SAT | lun-mer 17:00 | 4 | Giulia | 8, fra cui Sofia M. e Leo P. |
| U12 Intermedio | SAT | mar-gio 17:00 | 2 | Marco | 8: Tommaso R., Luca B., Matteo B., Giulia L., Davide C., Irene P., Nicolò F., Chiara V. |
| U12 Pre-accademia | Pre-accademia | lun-mer 18:30 | 3 | Marco | 6 |
| U14 Agonisti | Accademia | lun-mer-ven 18:30 | 1 | Paolo | 8 |
| Squadra U16 | Agonistica | sab 14:00 | 1 | Paolo e Davide Neri | 6 |
| Adulti sera | Adulti | mar 20:00 | 3 | Sara | 9 |

  Totale 51 allievi.
- **Famiglie:** Chiara Rossi, mamma di Tommaso R. (U12) e di Anna R. (U8).
- **Programma** "Novembre · Dritto", settimana 3 di 4. Modello "Multicolpo a quarti" da 60 minuti: dritto 15 bloccato, rovescio 15 bloccato, servizio e risposta 15 flessibile, volée e gioco 15 flessibile.
- **Cambio campo:** martedì 17/11/2026, U12 Intermedio dal Campo 2 al Campo 3 per manutenzione del fondo (il Campo 2 ha stato `disponibile` e la manutenzione vale solo per quella data).
- Lezioni delle ultime 6 settimane con presenze, valutazioni del test di ottobre e novembre, messaggi, avvisi e 3 segnalazioni.
- Corsi senza quote (`quota_cent` null): il centro le inserisce, non si inventano prezzi.
- **Persone senza account:** sono `membri` con `user_id` null. L'utente super admin (profilo con ruolo admin) viene aggiunto a `tc-brera` come titolare, così può "vedere come" chiunque.

## Pagamenti (area H)
- Le quote e lo stato si gestiscono sempre, e c'è "registra incasso in segreteria".
- La carta passa da **Stripe Checkout** con `POST /api/centro/pagamenti/checkout` e il webhook `/api/centro/pagamenti/webhook`, solo se esistono le variabili d'ambiente `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`. Senza, il bottone "Paga con carta" mostra "Pagamento con carta non ancora attivo per questo centro".
- Niente chiavi nel codice.

## AI (area E)
- `POST /api/centro/riassunto` con body `{lezione_id}`.
- Usa Claude come le API già esistenti (`lib/ai/`, chiave dalla tabella settings, costo registrato).
- Scrive il riassunto per le famiglie, in italiano, salvato in `lezioni.riassunto` con `riassunto_ok = false`. Il maestro lo approva.
- I consigli del Coach AI nel piano lezione si calcolano in locale dai dati (assenze, valutazioni basse). Se c'è tempo, si chiama Claude con la stessa route `?tipo=piano`.

## Super admin (area A, dentro `components/admin/`)
Nuova scheda "Centri" in `Admin.tsx`:
- lista dei centri con stato, prova, numero di membri e allievi;
- crea un centro (vuoto o clonato dal modello o da un altro centro);
- branding (nome app, logo, colore) con anteprima;
- passa a attivo, sospeso o proroga la prova;
- membri e ruoli (aggiungi, cambia ruolo, sospendi);
- inviti con codice;
- apri l'app del centro e la dashboard (`/c/slug?come=...`).

## Regole di lavoro
- **Niente chiavi o segreti nel codice.** Commenti in italiano che spiegano il perché.
- Prima di finire: `npx tsc --noEmit` deve passare **per i propri file**. Gli errori nei file altrui non si correggono, si segnalano.
- Non toccare `package.json`. Per una dipendenza nuova (es. `stripe`), scriverlo nel rapporto: la aggiunge l'organizzatore. Per Stripe usare `fetch` sulla REST API, senza SDK.
- Non fare commit né push: li fa l'organizzatore alla fine.
- Riprodurre fedelmente ogni mockup. Gli stati interattivi dei mockup (chip, seg, pannelli) diventano funzioni vere sui dati.
