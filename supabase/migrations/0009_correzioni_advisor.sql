-- 0009_correzioni_advisor: correzioni degli avvisi di get_advisors (performance e sicurezza) sulle tabelle
-- e funzioni dei centri, dopo 0008_aggregati.
--
-- Esito dell'analisi (progetto wbnqcsrdlfgaomizghnx):
--   * auth_rls_initplan, multiple_permissive_policies, unindexed_foreign_keys: nessun avviso sulle tabelle dei
--     centri (le policy usano gia' "(select ...)" e le FK sono tutte coperte). Gli avvisi rimasti riguardano solo
--     tabelle della vecchia app (profiles, ai_usage, analyses, chat_messages, technique_videos): fuori perimetro.
--   * function_search_path_mutable: una sola funzione dei centri, _rimappa_uuid (corretta qui sotto).
--   * unused_index (INFO): indici mai usati perche' il database e' appena stato popolato; non si tolgono finche'
--     non c'e' traffico reale.

-- Funzione di supporto della clonazione dei centri: senza search_path fissato un utente potrebbe
-- farle risolvere nomi in uno schema scelto da lui.
alter function public._rimappa_uuid(jsonb) set search_path = public;

-- E' interna (la usa solo _clona_contenuti): nessun motivo che sia chiamabile dal client.
revoke all on function public._rimappa_uuid(jsonb) from public, anon, authenticated;
