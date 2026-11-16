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

## Ancora da fare (non ancora applicate)

`panoramica_centro`, `riepilogo_maestri`, `ultime_lezioni_maestro`, `esercizi_cerca`, `statistiche_allievi_maestro`, `aderenza_gruppi` e gli aggregati
(`allievi_stato_lista`, `allievi_riepilogo`, `conteggi_gruppi`, `progressi_per_unita`, `area_presenze_mese`, `consensi_riepilogo`,
`admin_conteggi_centri`, `admin_membri_conteggi_ruolo`, `riepilogo_pagamenti`, `progressi_allievo`, `badge_allievo`, `report_mensile_allievo`).

## Funzioni interne (non chiamabili dal client)

`_nome_membro`, `_data_it`, `_consegna_dopo_silenzio`, `_gruppi_destinatari`, `membri_destinatari`, `_rimappa_uuid`, `_clona_contenuti`.
