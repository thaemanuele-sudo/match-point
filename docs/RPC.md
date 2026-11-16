# Match Point — RPC dei centri (elenco definitivo)

Applicate sul database `wbnqcsrdlfgaomizghnx` con le migrazioni `0005c1`..`0005c7`.
Tutte sono `security definer` con `search_path = public` e controllano il ruolo dentro la funzione.
Si chiamano con `supabase.rpc(nome, { parametri })`: i nomi dei parametri sono **esattamente** quelli della colonna "Parametri".
Eseguibili solo da utenti autenticati, tranne `centro_pubblico` (anche anonimi).

## Accesso e centri

| RPC | Parametri | Ritorna |
|---|---|---|
| `centro_pubblico` | `slug text` | `jsonb { id, slug, nome, nome_app, colore, colore_ink, logo_path }` (null se non esiste) |
| `anteprima_invito` | `codice text` | `jsonb`: se non valido `{ valido:false, motivo:'non_trovato'\|'scaduto'\|'esaurito' }`; se valido `{ valido:true, centro_nome, citta, dt_nome, n_maestri, n_gruppi, n_allievi, ruolo, scade_il, gruppo_nome, area_nome, allievo_nome }` |
| `unisciti_con_codice` | `codice text` | `json { centro_slug, ruolo }` |
| `registra_centro` | `nome text, citta text, slug text, campi int = 4` | `jsonb { id, slug, centro_slug }` (chi registra diventa titolare e DT; contenuti copiati da `matchpoint-modello`) |
| `clona_centro` | `sorgente uuid, nome text, slug text` | `jsonb { id, slug, centro_slug }` (solo admin; copia Metodo, aree, corsi, permessi, impostazioni, campi; mai persone né messaggi) |

## Messaggi, avvisi, notifiche

| RPC | Parametri | Ritorna |
|---|---|---|
| `invia_messaggio` | `conversazione uuid, testo text` | riga `messaggi` (consegna rimandata fuori orario: silenzio 21:00-08:00 ora di Roma) |
| `conta_destinatari` | `centro uuid, destinatari jsonb` | `jsonb { allievi, famiglie, maestri }` |
| `invia_avviso` | `titolo text, testo text, destinatari jsonb, conferma bool = false, promemoria bool = false, consegna_il timestamptz = null, centro uuid = null` | `jsonb { avviso_id, destinatari, consegna_il }` |
| `letture_avvisi` | `avvisi uuid[]` | tabella `(avviso_id uuid, letti bigint, totale bigint, letti_24h bigint)` |
| `ricorda_avviso` | `avviso uuid` | `int` (quante notifiche di promemoria create) |

`destinatari` = `{ "tipo": "centro"|"fascia"|"gruppo"|"area"|"maestro", "valori": [text] }`.

## Campi

| RPC | Parametri | Ritorna |
|---|---|---|
| `cambia_campo` | `gruppo uuid, data date, campo_a uuid, motivo text, avvisa bool = true` | `jsonb { cambio_id, campo_da, campo_a, notificati }` |
| `cambia_campo` (variante `p_`) | `p_gruppo uuid, p_data date, p_campo_a uuid, p_motivo text, p_avvisa bool = true, p_compat int = 0` | come sopra. Serve ai client che usano il prefisso `p_`; `p_compat` si ignora |
| `letture_cambio_campo` | `cambio uuid` | `jsonb { allievi_letti, allievi_tot, famiglie_letti, famiglie_tot }` |

Un campo non `disponibile` o occupato nello stesso orario dà errore (`P0001`, messaggio in italiano).

## Assenze, segnalazioni, lezioni

| RPC | Parametri | Ritorna |
|---|---|---|
| `avvisa_assenza` | `allievo uuid, data date, motivo text ('malato'\|'scuola'\|'viaggio'\|'altro'), testo text = null` | `jsonb { assenze, gruppi }` (la famiglia deve avvisare almeno `impostazioni.assenza_entro_ore`, default 2) |
| `segnala` | `categoria text, testo text, anonima bool = false, per_allievo uuid = null, riguarda_dt bool = false, centro uuid = null` | `uuid` (id segnalazione; se anonima l'autore non viene salvato) |
| `chiudi_lezione` | `lezione uuid, svolto jsonb, presenze jsonb, compito jsonb = null, motivi jsonb = null` | `void` |
| `aderenza_maestro` | `membro uuid` | `numeric` (0-100, null se nessun blocco bloccato) |

- `presenze` = `[{ allievo_id, presente, voto_rapido?, nota? }]`.
- `compito` = `{ titolo, durata_min?, esercizio_id?, scadenza?, allievo_id? }` (senza `allievo_id` vale per tutto il gruppo).
- `svolto` usa l'indice 0-based dei blocchi del piano.

## Funzioni interne (non chiamabili dal client)

`_nome_membro`, `_data_it`, `_consegna_dopo_silenzio`, `_gruppi_destinatari`, `membri_destinatari`, `_rimappa_uuid`, `_clona_contenuti`,
`_aderenza_maestri`, `_conv_senza_risposta` (queste ultime due: definer senza permesso di esecuzione ai client, le usano solo le RPC definer degli aggregati).
Funzioni di supporto degli aggregati, eseguibili ma senza interesse per il client: `f_unaccent`, `_jarr`, `_blocco_fatto`, `_allievi_ripetute`, `_allievi_test`.

## Aggregati (migrazione `0008_aggregati`)

Calcolano nel database i numeri delle dashboard (regola "Aggregati" di `docs/CENTRI.md`, sezione Scala). Eseguibili solo da utenti autenticati.
Sicurezza: **invoker** = la RLS limita il risultato al perimetro del chiamante (maestro, area, famiglia); **definer** = controllo esplicito dentro la funzione.
Le cinque RPC gia' descritte sopra (`aderenza_maestro`, `conta_destinatari`, `letture_avvisi`, `ricorda_avviso`, `letture_cambio_campo`) esistevano gia' e non sono cambiate.
"Ultimi 30 giorni" = `data > oggi - 30` sulle sole lezioni `chiusa`. Il **livello** (0-100) e' la media dei voti 1-5 di un test per 20; **delta** = punti di livello rispetto al test precedente.
Le funzioni che ritornano un solo oggetto danno `json`; quelle a piu' righe danno una tabella (array di oggetti con le colonne indicate).

### Panoramica e maestri (DT)

| RPC | Sicurezza | Parametri | Ritorna |
|---|---|---|---|
| `panoramica_centro` | definer, `is_dt` | `p_centro uuid, p_giorno date` | `json { oggi:{lezioni_totali, lezioni_chiuse, presenze_totali, presenze_presenti}, settimana:{stessi}, allievi_attivi, nuovi_30g, allievi_con_assenze_ripetute, maestri_in_campo, segnalazioni_aperte, messaggi_senza_risposta_48h, aderenza_media }`. Settimana = lunedi-domenica di `p_giorno`; maestri in campo = con una lezione `in_corso` nel giorno; segnalazioni `riguarda_dt` contate solo per il titolare; messaggi senza risposta = ultimo messaggio di famiglia/allievo ferma da oltre 48 ore (ultimi 30 giorni) |
| `riepilogo_maestri` | definer, `is_dt` | `p_centro uuid` | tabella `(membro_id, aderenza int, lezioni_chiuse int, allievi int, valutazioni_mancanti int, progressi numeric, risposta_mediana_ore numeric, messaggi_senza_risposta int)`: una riga per maestro non sospeso. `lezioni_chiuse` ultimi 30 giorni; `allievi` iscritti attivi nei suoi gruppi; `valutazioni_mancanti` suoi allievi senza valutazioni dal 1 del mese; `progressi` media delta; `risposta_mediana_ore` ultimi 90 giorni |
| `ultime_lezioni_maestro` | invoker | `p_centro uuid, p_membro uuid, p_n int = 12` (1-100) | tabella `(lezione_id, data, ora, gruppo_id, gruppo_nome, stato, presenti, totale, blocchi_bloccati, blocchi_fatti, aderenza int, riassunto_ok)`, dalla piu' recente, fino a oggi |
| `statistiche_allievi_maestro` | invoker | `p_membro uuid` | tabella `(allievo_id, presenze_30g_pct int, media_ultimo_test numeric)` (null se nessun dato) |
| `aderenza_gruppi` | invoker | `p_membro uuid` | tabella `(gruppo_id, aderenza numeric)` sulle lezioni del maestro, ultimi 365 giorni |

### Libreria esercizi

| RPC | Sicurezza | Parametri | Ritorna |
|---|---|---|---|
| `esercizi_cerca` | invoker | `p_centro uuid, p_testo text = null, p_colpo text = null, p_fonte text = null, p_da int = 0, p_a int = 49` | tabella `(id, titolo, colpo, fasce, durata_min, materiale, descrizione, video_path, fonte, stato, proposto_da, created_at, totale bigint)`. Ricerca senza accenti e senza maiuscole su titolo, descrizione e materiale. `p_da`/`p_a` = estremi inclusi della pagina (come `.range()`), massimo 200 righe. Ordine per titolo |

### Allievi e progressi

| RPC | Sicurezza | Parametri | Ritorna |
|---|---|---|---|
| `allievi_stato_lista` | invoker | `p_centro uuid, p_aree uuid[] = null, p_q text = null, p_filtro text = 'tutti', p_colpo text = null, p_limit int = 50, p_offset int = 0` | tabella `(id, nome, cognome, data_nascita, certificato_scade, gruppi text[], maestri text[], perc int, assenti int, su int, ritardo bool, ripetute bool, totale bigint)`. `p_filtro`: `tutti`, `ritardo`, `ripetute`, `certificato` (scaduto, in scadenza entro 30 giorni o mancante); altro valore = errore. `p_aree`: solo iscritti attivi in gruppi di quelle aree. `p_q`: ricerca senza accenti anche a parole invertite. `perc/assenti/su` = presenze ultimi 30 giorni (`perc` null se `su` = 0). `ritardo` = presenze 10 punti sotto la media del gruppo oppure livello calato di 5 punti dal test precedente (con `p_colpo` solo quel colpo). `ripetute` = 3+ assenze nelle ultime 6 lezioni chiuse. `totale` = righe con i filtri, prima di limit/offset. Ordine cognome, nome, id |
| `allievi_riepilogo` | invoker | `p_centro uuid, p_aree uuid[] = null, p_colpo text = null` | `json { attivi, presenze_mese_perc, in_ritardo, assenze_ripetute }` (stessa logica della lista; mese = ultimi 30 giorni) |
| `conteggi_gruppi` | invoker | `p_centro uuid, p_aree uuid[] = null` | tabella `(gruppo_id, n_allievi int)`, anche i gruppi vuoti |
| `progressi_per_unita` | invoker | `p_centro uuid, p_colpo text, p_vista text ('gruppi'\|'maestri'), p_aree uuid[] = null` | tabella `(unita_id, nome, n_allievi int, livello numeric, delta numeric)`; `n_allievi` = iscritti attivi, `livello`/`delta` null se nessuno e' valutato |
| `area_presenze_mese` | invoker | `p_centro uuid, p_area uuid` | `int` presenze % ultimi 30 giorni (null se nessuna lezione) |
| `consensi_riepilogo` | invoker | `p_centro uuid` | `json { allievi, privacy, foto_video, ai, certificati_validi }` |
| `progressi_allievo` | invoker | `p_centro uuid, p_allievo uuid` | tabella `(colpo, competenza, ora int, prima int, periodo_prima text)`: voto 1-5 nell'ultimo test e nel precedente |
| `badge_allievo` | invoker | `p_centro uuid, p_allievo uuid` | `json { lezioni_presenti, serie_presenze, test_fatti, compiti_fatti, competenze_migliorate, badge:[{codice, titolo, descrizione, ottenuto, valore, soglia}] }` (codici: `costante`, `veterano`, `primo_test`, `in_crescita`, `compiti`) |
| `report_mensile_allievo` | invoker | `p_centro uuid, p_allievo uuid, p_mese date` (un giorno qualsiasi del mese) | `json { mese, allievo:{id,nome,cognome}, presenze:{lezioni,presenti,assenti,perc}, voto_rapido_medio, note:[{data,nota}], riassunti:[{data,gruppo,riassunto}] (solo approvati), compiti:{assegnati,fatti}, valutazioni:[{test,colpo,competenza,voto}], progressi:[...] }` |

### Pagamenti

| RPC | Sicurezza | Parametri | Ritorna |
|---|---|---|---|
| `riepilogo_pagamenti` | invoker (RLS di `quote`) | `p_centro uuid, p_dal date, p_al date, p_oggi date = oggi` | `json { pagato_cent, attesa_cent, scaduto_cent, famiglie_pagate, famiglie_attesa, famiglie_scadute }`. Perimetro: quote con `scade_il` tra `p_dal` e `p_al` piu' le arretrate non pagate (scadenza prima di `p_dal`). Stato effettivo: una quota in `attesa` scaduta prima di `p_oggi` vale `scaduta`. Famiglia = il `membro_id` minore in `allievi_famiglie` (senza genitori: l'allievo). Per famiglia conta lo stato peggiore: scaduta, poi attesa, poi pagata |

### Super admin

| RPC | Sicurezza | Parametri | Ritorna |
|---|---|---|---|
| `admin_conteggi_centri` | definer, solo `is_admin` | nessuno | tabella `(centro_id, n_membri bigint, n_allievi bigint)` |
| `admin_membri_conteggi_ruolo` | definer, solo `is_admin` | `p_centro uuid` | tabella `(ruolo text, n bigint)` |

Errori: ruolo non ammesso = `42501` "Non autorizzato"; parametro non valido = `22023` (messaggio in italiano).
