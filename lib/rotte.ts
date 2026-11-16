// Mappa schermata del progetto grafico (NomeSchermata.dc.html) → indirizzo nell'app.
// I link href="X.dc.html" dei disegni diventano <Link href={ROTTE.X}>.
export const ROTTE = {
  Main: "/app", // 01 · Coach AI · Home
  Carica: "/app/carica", // 02 · Nuovo video (+)
  ChatAI: "/app/chat", // 03 · Coach AI · Chat
  Analisi: "/app/analisi", // 04 · Analisi del colpo
  AnalisiAtletica: "/app/analisi-atletica", // 05 · Analisi atletica
  Tecnica: "/app/tecnica", // 06 · Tecnica · Colpi
  TecnicaColpo: "/app/tecnica-colpo", // 07 · Tecnica · Diritto
  Tattica: "/app/tattica", // 08 · Tattica · Fasce d'età
  TatticaStrategia: "/app/tattica-strategia", // 09 · Tattica · Strategia
  Combinazioni: "/app/combinazioni", // 10 · Tattica · Combinazioni
  Atletica: "/app/atletica", // 11 · Atletica · Percorsi
  Benvenuto: "/app/benvenuto", // 12 · Benvenuto e lingua
  SceltaProfilo: "/app/scelta-profilo", // 13 · Chi sei?
  Consenso: "/app/consenso", // 14 · Consenso genitore
  ProfiloAllievo: "/app/profilo-allievo", // 15 · Profilo allievo
  Allievi: "/app/allievi", // 16 · I miei allievi
  HomeAllievo: "/app/home-allievo", // 17 · Home allievo (Bambino)
  AnalisiInCorso: "/app/analisi-in-corso", // 18 · Analisi in corso
  PoseEstimation: "/app/pose-estimation", // 19 · Pose estimation
  Feedback: "/app/feedback", // 20 · Feedback in 3 passi
  PianoProposto: "/app/piano-proposto", // 21 · Piano proposto
  FeedbackBambino: "/app/feedback-bambino", // 22 · Feedback Modalità Bambino
  Progressi: "/app/progressi", // 23 · Monitoraggio progressi
  ProfiloAtletico: "/app/profilo-atletico", // 24 · Profilo atletico
  SegnaliAtletici: "/app/segnali-atletici", // 25 · Segnali atletici dal video
  SchedaAtletica: "/app/scheda-atletica", // 26 · Scheda atletica generata
  Vocale: "/app/vocale", // 27 · Assistente vocale
  VideoLab: "/app/video-lab", // 40 · Video Lab
  BallTracking: "/app/ball-tracking", // 41 · Tracciamento palla
  Heatmap: "/app/heatmap", // 42 · Heatmap rimbalzi e posizioni
  Confronto: "/app/confronto", // 43 · Confronto affiancato
  Strumenti: "/app/strumenti", // 44 · Disegna e misura
  TimelineColpi: "/app/timeline-colpi", // 45 · Colpi riconosciuti
  Velocita: "/app/velocita", // 46 · Velocità palla e racchetta
  StatPartita: "/app/stat-partita", // 47 · Partita e highlight
  BaseComune: "/app/base-comune", // 28 · Apertura e preparazione
  Servizio: "/app/servizio", // 29 · Servizio · fasi e varianti
  ErroriServizio: "/app/errori-servizio", // 30 · Catalogo errori · servizio
  ErroreDettaglio: "/app/errore-dettaglio", // 31 · Errore SV-03 · confronto
  MetricheAI: "/app/metriche-a-i", // 32 · Metriche AI e soglie
  EserciziMaestro: "/app/esercizi-maestro", // 33 · Esercizi per il maestro
  Rovescio: "/app/rovescio", // 34 · Rovescio · tipo rilevato
  Back: "/app/back", // 35 · Back (slice) · colpo
  Volee: "/app/volee", // 36 · Volée · colpo
  Smash: "/app/smash", // 37 · Smash · colpo
  LibreriaVideo: "/app/libreria-video", // 38 · Libreria video di correzione
  ColpiFuturi: "/app/colpi-futuri", // 39 · Colpi specifici in arrivo
  SchemiFascia: "/app/schemi-fascia", // 48 · Schemi per fascia d'età
  CatalogoStrategie: "/app/catalogo-strategie", // 49 · Catalogo strategie S1-S10
  LivelliAllenamento: "/app/livelli-allenamento", // 50 · Livelli di allenamento
  MatriceRischio: "/app/matrice-rischio", // 51 · Matrice punteggio × rischio
  RegoleMaestro: "/app/regole-maestro", // 52 · Regole del maestro
  ProfiliAvversario: "/app/profili-avversario", // 53 · Profili avversario
  TieBreak: "/app/tie-break", // 54 · Piano del tie-break
  Capacita: "/app/capacita", // 55 · Capacità allenate
  SchedaEta: "/app/scheda-eta", // 56 · Schede per fascia d'età
  SpiderDrill: "/app/spider-drill", // 57 · Spider drill
  Scaletta: "/app/scaletta", // 58 · Scaletta di coordinazione
  SessioneAtletica: "/app/sessione-atletica", // 59 · Sessione in corso
  Microciclo: "/app/microciclo", // 60 · Microciclo settimanale
  ReportFamiglia: "/app/report-famiglia", // 61 · Report per la famiglia
  Abbonamenti: "/app/abbonamenti", // 62 · Abbonamenti
  Impostazioni: "/app/impostazioni", // 63 · Impostazioni
  DashboardClub: "/app/dashboard-club", // 64 · Dashboard club e gruppi
  PartitaLive: "/app/partita-live", // 65 · Partita live · video con overlay
  MappaColpi: "/app/mappa-colpi", // 66 · Mappa dei colpi e statistiche
  StatSet: "/app/stat-set", // 67 · Statistiche per set
  DaMigliorare: "/app/da-migliorare", // 68 · Cosa migliorare dopo la sessione
  Obiettivi: "/app/obiettivi", // 69 · Obiettivi settimanali
  Distribuzione: "/app/distribuzione", // 70 · Distribuzione dei colpi
  RisultatoServizio: "/app/risultato-servizio", // 71 · Risultato del servizio in 3D
  Highlight: "/app/highlight", // 72 · Highlight degli scambi
  WatchOut: "/app/watch-out", // 73 · Watch · chiamata OUT
  WatchPunteggio: "/app/watch-punteggio", // 74 · Watch · punteggio live
  WatchAllenamento: "/app/watch-allenamento", // 75 · Watch · allenamento
} as const;
export type NomeSchermata = keyof typeof ROTTE;
