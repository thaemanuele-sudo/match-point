// Copia del Motore: non modificare qui, si modifica nel repository motore
// Il motore: percorso di una richiesta, apprendimento, esiti, stato e voce.
// Dipende solo da TypeScript, fetch e Web Crypto: si copia in qualsiasi app.

import type {
  Braccio,
  Chiamata,
  ChiaveBraccio,
  ChiaveTaratura,
  Compito,
  Contenuto,
  EsitoSiNo,
  EventoMotore,
  FasciaTaratura,
  Genere,
  Messaggio,
  ModelloInfo,
  Motore,
  OpzioniChiamata,
  OpzioniMotore,
  Priore,
  RichiestaParla,
  RispostaFornitore,
  Risultato,
  RisultatoParla,
  StatoBraccio,
  StatoCompito,
  StatoTaratura,
  Uso,
  UsoDecisore,
} from "./tipi";
import { chiaveCache, normalizzaTesto, unica } from "./cache";
import { costo, costoAtteso, stimaToken } from "./costi";
import { giudica, type Ripiego } from "./giudice";
import { parlaConCache } from "./voce";
import { limiti, prioreEffettivo, proveVere, prossimoStato, tettoPermette, type RegoleStato } from "./apprendimento";
import { SOSPENSIONE_MS, candidatiAmmessi, candidatiProva, catenaDiServizio, costoStimato, creaSospensioni, tokenUscitaStimati, trovaBraccio, type DipScelta } from "./instradatore";
import { haImmagini, secchioBase, secchioDecisore, ultimoTestoUtente } from "./secchi";
import { fasciaDi, sogliaAutomatica } from "./taratura";

// ===== Costanti =====

const MS_GIORNO = 86_400_000;
const SETTE_GIORNI = 7 * MS_GIORNO;
// Quanto si tengono in memoria bracci, priori e spesa: evita di leggere il database a ogni richiesta.
const TTL_MEMORIA_MS = 60_000;
const DURATA_CACHE_PREDEFINITA_S = 30 * 86_400;
// Peso di un esito dato da una persona: vale più di una prova automatica, che è solo un'opinione del giudice.
const PESO_ESITO_UMANO = 3;
// Quando giudica il decisore, una volta su dieci giudica anche il modello di riferimento: l'accordo
// tra i due è la verità con cui si tara il decisore. Più spesso costerebbe troppo, meno darebbe pochi dati.
const QUOTA_DOPPIO_GIUDIZIO = 0.1;
// Per quanto si ricorda la probabilità data dal decisore a una risposta servita, in attesa di un esito umano.
const DURATA_PROBABILITA_S = 7 * 86_400;
// Un solo utente non deve poter spostare un braccio da solo: per ogni coppia (utente, braccio) contano al massimo
// `tetto_utente` contributi (prove in ombra, controlli, esiti umani) in una finestra di 24 ore.
const TETTO_UTENTE_PREDEFINITO = 3;
const FINESTRA_UTENTE_MS = MS_GIORNO;
// La prova in ombra è esente dal tetto di apprendimento finché il braccio ha poche prove, ma non oltre questa soglia:
// un compito con `minimo_prove` altissimo non deve poter spendere senza freno per migliaia di prove.
const MASSIMO_PROVE_ESENTI = 40;
// Quanti segni di esito si tengono in memoria: da soli reggono per istanza, con `segnaEsito` sono una seconda difesa.
const MASSIMO_ESITI_IN_MEMORIA = 5_000;

type Compito_ = Compito<any>;

type Regole = RegoleStato & { campione: number; controllo: number };

// Una richiesta in lavorazione: tutto ciò che serve ai vari passi senza ricalcolarlo.
type Ctx = {
  c: Compito_;
  ingresso: unknown;
  messaggi: Messaggio[];
  rif: ModelloInfo;
  ammessi: ModelloInfo[];
  o: OpzioniChiamata;
  inizio: number;
  token_in: number;
  token_out: number;
  chiave: string | null;
};

// Un tentativo andato male per qualità (non per errore del fornitore): conta come insuccesso del braccio.
type Insuccesso = { info: ModelloInfo; costo_usd: number; latenza_ms: number };

type Prova = { contenuto: Contenuto; uso: Uso; costo_usd: number; latenza_ms: number };

function nuovoId(): string {
  return globalThis.crypto.randomUUID();
}

const cacheAttiva = (c: Compito_): boolean => (c.cache ? c.cache.attiva : c.genere === "classifica" || c.genere === "estrai");

/** Come testo il contenuto di una risposta per stimare i token in uscita quando manca l'uso vero (cache, regola locale). */
const tokenDaTesto = (testo: string): number => Math.ceil(testo.length / 4);

export function creaMotore(opz: OpzioniMotore): Motore {
  const adesso = (): number => (opz.adesso ? opz.adesso() : Date.now());
  const casuale = opz.casuale ?? Math.random;
  const modo = opz.modo ?? "attivo";
  const emivita = opz.emivita_giorni ?? 30;
  const pesoPriori = opz.peso_priori ?? 8;
  const tetto = opz.tetto_apprendimento ?? 0.2;
  const tettoUtente = opz.tetto_utente ?? TETTO_UTENTE_PREDEFINITO;
  const { archivio, catalogo, fornitori } = opz;

  const compiti = new Map<string, Compito_>();
  const sospensioni = creaSospensioni(adesso);

  // Un evento al registro non deve mai far fallire una richiesta.
  const emetti = (e: EventoMotore): void => {
    try {
      opz.registro?.(e);
    } catch {
      /* il registro è un aiuto, non una dipendenza */
    }
  };

  const regoleDi = (c: Compito_): Regole => ({
    qualita: c.qualita ?? 0.9,
    fiducia: c.fiducia ?? 0.9,
    minimo_prove: c.minimo_prove ?? 20,
    campione: c.campione ?? 0.15,
    controllo: c.controllo ?? 0.03,
    peso_priori: pesoPriori,
  });

  // ===== Memorie a breve termine =====

  const memBracci = new Map<string, { t: number; bracci: Braccio[] }>();
  const memPriori = new Map<Genere, { t: number; priori: Record<string, Priore> }>();
  // `base` = quanto il compito sarebbe costato con il solo riferimento (somma di `costo_riferimento_usd`
  // delle chiamate servite); `apprendimento` = quanto si è speso in prove, controlli e giudizi.
  type Spesa = { t: number; base: number; apprendimento: number };
  const memSpesa = new Map<string, Spesa>();
  const memTaratura = new Map<string, { t: number; fasce: FasciaTaratura[] }>();

  const chiaveCompito = (c: Compito_) => `${c.id}#${c.versione}`;

  /** Bracci del compito. Se l'archivio non risponde si usa l'ultima copia nota: si serve comunque. */
  async function bracciDi(c: Compito_, fresco = false): Promise<Braccio[]> {
    const k = chiaveCompito(c);
    const e = memBracci.get(k);
    if (!fresco && e && adesso() - e.t < TTL_MEMORIA_MS) return e.bracci;
    try {
      const lista = await archivio.leggiBracci(opz.app, c.id, c.versione);
      memBracci.set(k, { t: adesso(), bracci: lista.slice() });
      return memBracci.get(k)!.bracci;
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "leggiBracci", messaggio: String(err) } });
      return e ? e.bracci : [];
    }
  }

  /** Dopo un aggiornamento si sostituisce il braccio nella copia in memoria, senza aspettare la scadenza. */
  function ricordaBraccio(c: Compito_, b: Braccio): void {
    const e = memBracci.get(chiaveCompito(c));
    if (!e) return;
    const i = e.bracci.findIndex((x) => x.secchio === b.secchio && x.modello === b.modello);
    if (i >= 0) e.bracci[i] = b;
    else e.bracci.push(b);
  }

  async function prioriDi(genere: Genere): Promise<Record<string, Priore>> {
    const e = memPriori.get(genere);
    if (e && adesso() - e.t < TTL_MEMORIA_MS) return e.priori;
    try {
      const priori = await archivio.leggiPriori(genere);
      memPriori.set(genere, { t: adesso(), priori });
      return priori;
    } catch (err) {
      emetti({ tipo: "errore_archivio", dettagli: { operazione: "leggiPriori", messaggio: String(err) } });
      return e ? e.priori : {};
    }
  }

  /**
   * Spesa del compito negli ultimi 7 giorni, divisa in `base` e `apprendimento`.
   * L'archivio tiene le chiamate in ombra in righe separate da quelle servite (`ombra === chiamate`
   * per le prime, `ombra === 0` per le altre): la spesa in ombra è quindi esatta. Un archivio che
   * mescola le due cose nella stessa riga (`0 < ombra < chiamate`) si stima con la quota di
   * chiamate in ombra. Le chiamate in ombra non hanno costo del riferimento (non c'è nulla da
   * risparmiare), quindi la somma di `costo_riferimento_usd` conta solo le chiamate servite.
   */
  async function spesaDi(c: Compito_): Promise<Spesa> {
    const e = memSpesa.get(c.id);
    if (e && adesso() - e.t < TTL_MEMORIA_MS) return e;
    let base = 0;
    let apprendimento = 0;
    try {
      const righe = await archivio.riepilogo(opz.app, adesso() - SETTE_GIORNI, adesso());
      for (const r of righe) {
        if (r.compito !== c.id) continue;
        if (r.chiamate > 0 && r.ombra >= r.chiamate) {
          apprendimento += r.costo_usd;
          continue;
        }
        base += r.costo_riferimento_usd;
        if (r.ombra > 0) apprendimento += r.costo_usd * (r.ombra / r.chiamate);
      }
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "riepilogo", messaggio: String(err) } });
      if (e) return e;
    }
    const nuova = { t: adesso(), base, apprendimento };
    memSpesa.set(c.id, nuova);
    return nuova;
  }

  /**
   * Aggiorna subito i conti in memoria: il tetto deve valere anche prima della prossima lettura
   * dell'archivio. Senza una copia in memoria non c'è nulla da aggiornare: la prossima lettura
   * troverà già la chiamata, che si registra prima di contarla.
   */
  function contaSpesa(c: Compito_, tipo: "base" | "apprendimento", usd: number): void {
    if (!(usd > 0)) return;
    const s = memSpesa.get(c.id);
    if (s) s[tipo] += usd;
  }

  /** Il tetto: la spesa per l'apprendimento non supera `tetto` volte quanto il compito sarebbe costato col solo riferimento. */
  async function tettoDi(c: Compito_, esente: boolean): Promise<{ consentito: boolean; spesa: number; tetto: number }> {
    const s = await spesaDi(c);
    return {
      consentito: tettoPermette({ apprendimento: s.apprendimento, totale: s.base, tetto, esente }),
      spesa: s.apprendimento,
      tetto: tetto * s.base,
    };
  }

  // ===== Tetto per utente =====

  // Ripiego in memoria, per gli archivi senza `prenotaContributo` o quando non rispondono: vale per istanza.
  const memContributi = new Map<string, number[]>();

  /**
   * Prenota un contributo di `utente` al braccio. Falso = ha già dato il massimo nelle ultime 24 ore: il contributo
   * non deve toccare il braccio (né costare una prova). Senza utente il tetto non si applica. Se l'archivio ha
   * `prenotaContributo` il conto è condiviso tra tutte le istanze; altrimenti, o se l'archivio dà errore, si conta in memoria.
   */
  async function contributoConsentito(chiave: ChiaveBraccio, utente: string | undefined): Promise<boolean> {
    if (!utente || !Number.isFinite(tettoUtente)) return true;
    const ora = adesso();
    if (archivio.prenotaContributo) {
      try {
        return await archivio.prenotaContributo({ chiave, utente, tetto: tettoUtente, finestra_ms: FINESTRA_UTENTE_MS, adesso: ora });
      } catch (err) {
        emetti({ tipo: "errore_archivio", compito: chiave.compito, dettagli: { operazione: "prenotaContributo", messaggio: String(err) } });
      }
    }
    // Senza il secchio: il secchio dipende dal testo, e chi scrive potrebbe moltiplicare il tetto per il numero di secchi.
    const k = JSON.stringify([chiave.app, utente, chiave.compito, chiave.versione, chiave.modello]);
    const recenti = (memContributi.get(k) ?? []).filter((t) => ora - t < FINESTRA_UTENTE_MS);
    if (recenti.length >= tettoUtente) {
      memContributi.set(k, recenti);
      return false;
    }
    recenti.push(ora);
    memContributi.set(k, recenti);
    // Le chiavi non crescono senza limite: ogni tanto si buttano quelle senza contributi recenti.
    if (memContributi.size > 10_000) {
      for (const [chiaveVecchia, v] of memContributi) if (!v.some((t) => ora - t < FINESTRA_UTENTE_MS)) memContributi.delete(chiaveVecchia);
    }
    return true;
  }

  const chiaveDi = (c: Compito_, secchio: string, modello: string): ChiaveBraccio => ({
    app: opz.app,
    compito: c.id,
    versione: c.versione,
    secchio,
    modello,
  });

  // ===== Registro delle chiamate =====

  async function registra(ch: Chiamata): Promise<void> {
    try {
      await archivio.registraChiamata(ch);
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: ch.compito, dettagli: { operazione: "registraChiamata", messaggio: String(err) } });
    }
  }

  // ===== Dopo la risposta =====

  /** Lavoro dopo la risposta: con `dopo` (per esempio after() di Next.js) l'utente non aspetta; senza, parte e non si attende. */
  function programma(lavoro: () => Promise<void>): void {
    const sicuro = async () => {
      try {
        await lavoro();
      } catch (err) {
        emetti({ tipo: "errore_dopo", dettagli: { messaggio: String(err) } });
      }
    };
    if (opz.dopo) {
      try {
        opz.dopo(sicuro);
      } catch (err) {
        emetti({ tipo: "errore_dopo", dettagli: { messaggio: String(err) } });
      }
    } else {
      void sicuro();
    }
  }

  // ===== Aggiornamento dei bracci =====

  /**
   * Aggiorna un braccio in modo atomico (lo fa l'archivio) e poi guarda se deve cambiare stato.
   * Lo stato si calcola sul braccio restituito dall'archivio, che include gli aggiornamenti
   * simultanei di altre richieste: due richieste insieme non si pestano i piedi.
   */
  async function applica(
    c: Compito_,
    secchio: string,
    modello: string,
    delta: { ok: number; ko: number; costo_usd?: number; latenza_ms?: number },
  ): Promise<Braccio | null> {
    const chiave: ChiaveBraccio = { app: opz.app, compito: c.id, versione: c.versione, secchio, modello };
    let b: Braccio;
    try {
      b = await archivio.aggiornaBraccio(chiave, delta, { emivita_giorni: emivita, adesso: adesso() });
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: c.id, modello, dettagli: { operazione: "aggiornaBraccio", messaggio: String(err) } });
      return null;
    }
    ricordaBraccio(c, b);
    const priori = await prioriDi(c.genere);
    const reg = regoleDi(c);
    const nuovo = prossimoStato(b, priori[modello] ?? { ok: 0, ko: 0 }, reg);
    if (nuovo !== b.stato) {
      try {
        await archivio.impostaStato(chiave, nuovo);
      } catch (err) {
        emetti({ tipo: "errore_archivio", compito: c.id, modello, dettagli: { operazione: "impostaStato", messaggio: String(err) } });
        return b;
      }
      b = { ...b, stato: nuovo };
      ricordaBraccio(c, b);
      // Gli stessi limiti con cui si è deciso (priore compreso), così chi legge l'evento vede perché.
      const { a0, b0 } = prioreEffettivo(priori[modello], reg.peso_priori);
      const l = limiti(b.ok + a0, b.ko + b0, reg.fiducia);
      emetti({
        tipo: nuovo === "attivo" ? "promosso" : "retrocesso",
        compito: c.id,
        modello,
        dettagli: { modello, secchio, basso: l.basso, alto: l.alto, prove: proveVere(b) },
      });
    }
    return b;
  }

  // ===== Registrazione =====

  function registra_compito<I>(c: Compito<I>): void {
    compiti.set(c.id, c as Compito_);
  }

  function preparaCtx(nome: string, ingresso: unknown, o: OpzioniChiamata): Ctx {
    const c = compiti.get(nome);
    if (!c) throw new Error(`Motore: compito "${nome}" non registrato`);
    const rif = catalogo.modello(c.riferimento);
    if (!rif) throw new Error(`Motore: il riferimento "${c.riferimento}" del compito "${nome}" non è nel catalogo`);
    if (!fornitori[rif.fornitore]) throw new Error(`Motore: nessun fornitore "${rif.fornitore}" per il riferimento del compito "${nome}"`);
    const messaggi = c.prepara(ingresso);
    return {
      c,
      ingresso,
      messaggi,
      rif,
      ammessi: candidatiAmmessi(c, { catalogo, fornitori }, messaggi),
      o,
      inizio: adesso(),
      token_in: stimaToken(messaggi),
      token_out: tokenUscitaStimati(c),
      chiave: null,
    };
  }

  // ===== Chiave di cache =====

  /** Come `messaggi` ma con l'ultimo messaggio dell'utente normalizzato: istruzioni e storia restano esatte, perché cambiano la risposta. */
  function messaggiNormalizzati(messaggi: Messaggio[]): unknown[] {
    let ultimo = -1;
    for (let i = messaggi.length - 1; i >= 0; i--) {
      if (messaggi[i].ruolo === "utente") {
        ultimo = i;
        break;
      }
    }
    return messaggi.map((m, i) => {
      if (i !== ultimo) return m;
      const contenuto =
        typeof m.contenuto === "string"
          ? normalizzaTesto(m.contenuto)
          : m.contenuto.map((p) => (p.tipo === "testo" ? { tipo: "testo", testo: normalizzaTesto(p.testo) } : p));
      return { ruolo: m.ruolo, contenuto };
    });
  }

  /** Chiave di cache e di "richiesta in corso": [app, compito, versione, chiave(ingresso) o messaggi, schema]. Il modello non entra. */
  async function calcolaChiave(ctx: Ctx): Promise<string | null> {
    const { c } = ctx;
    try {
      const norm = !!c.cache?.normalizza;
      let base: unknown;
      if (c.cache?.chiave) {
        base = c.cache.chiave(ctx.ingresso);
        if (norm && typeof base === "string") base = normalizzaTesto(base);
      } else {
        base = norm ? messaggiNormalizzati(ctx.messaggi) : ctx.messaggi;
      }
      return await chiaveCache([opz.app, c.id, c.versione, base, c.schema ?? null]);
    } catch (err) {
      // Una funzione `chiave` dell'app che si rompe non deve rompere la richiesta: si rinuncia alla cache.
      emetti({ tipo: "errore_chiave", compito: c.id, dettagli: { messaggio: String(err) } });
      return null;
    }
  }

  // ===== Secchio =====

  async function assegnaSecchio(ctx: Ctx): Promise<{ secchio: string; costo_usd: number }> {
    const { c } = ctx;
    // Ogni assegnazione si racconta: `decisore` e `probabilita` sono null se il secchio non l'ha deciso il decisore.
    const assegnato = (secchio: string, costo_usd: number, decisore: string | null = null, probabilita: number | null = null) => {
      emetti({ tipo: "secchio", compito: c.id, dettagli: { secchio, decisore, probabilita } });
      return { secchio, costo_usd };
    };
    const base = () => assegnato(secchioBase(ctx.messaggi), 0);
    if (typeof c.secchio === "function") {
      try {
        return assegnato(String(c.secchio(ctx.ingresso)), 0);
      } catch (err) {
        emetti({ tipo: "errore_secchio", compito: c.id, dettagli: { messaggio: String(err) } });
        return base();
      }
    }
    if (c.secchio === "decisore" && opz.decisore) {
      const r = await secchioDecisore({
        decisore: opz.decisore,
        archivio,
        app: opz.app,
        compito: c,
        messaggi: ctx.messaggi,
        adesso,
        segnale: ctx.o.segnale,
      });
      return assegnato(r.secchio, r.costo_usd, opz.decisore.id, r.probabilita ?? null);
    }
    return base();
  }

  /** Secchio per una risposta in cache, senza chiamare nessuno: serve solo a collegare l'esito umano al braccio giusto. */
  async function secchioSenzaChiamate(ctx: Ctx): Promise<string> {
    const { c } = ctx;
    if (typeof c.secchio === "function") {
      try {
        return String(c.secchio(ctx.ingresso));
      } catch {
        return secchioBase(ctx.messaggi);
      }
    }
    if (c.secchio === "decisore" && opz.decisore) {
      const r = await secchioDecisore(
        { decisore: opz.decisore, archivio, app: opz.app, compito: c, messaggi: ctx.messaggi, adesso },
        { soloCache: true },
      );
      return r ? r.secchio : "cache";
    }
    return secchioBase(ctx.messaggi);
  }

  // ===== Chiamate ai fornitori =====

  async function chiamaModello(ctx: Ctx, info: ModelloInfo, conSegnale: boolean): Promise<RispostaFornitore> {
    const f = fornitori[info.fornitore];
    if (!f) throw new Error(`Motore: nessun fornitore "${info.fornitore}"`);
    return f.genera({
      modello: info,
      messaggi: ctx.messaggi,
      schema: ctx.c.schema,
      max_token: ctx.c.max_token,
      temperatura: ctx.c.temperatura,
      // Il lavoro in ombra gira dopo la risposta: non deve morire con la richiesta dell'utente.
      segnale: conSegnale ? ctx.o.segnale : undefined,
    });
  }

  const contenutoDi = (r: RispostaFornitore): Contenuto => ({ testo: r.testo, dati: r.dati });

  const valido = (ctx: Ctx, cont: Contenuto): boolean => {
    if (!ctx.c.valida) return true;
    try {
      return ctx.c.valida(cont, ctx.ingresso);
    } catch {
      // Una `valida` che lancia vuol dire che la risposta non ha la forma attesa.
      return false;
    }
  };

  // ===== Taratura del decisore =====

  /** La taratura vive solo se c'è un decisore e l'archivio sa tenerla: altrimenti resta spenta, senza errori. */
  const taraturaAttiva = (): boolean => !!opz.decisore && !!archivio.aggiornaTaratura && !!archivio.leggiTaratura;

  const chiaveTar = (c: Compito_, uso: UsoDecisore, decisore: string = opz.decisore?.id ?? ""): ChiaveTaratura => ({
    app: opz.app,
    decisore,
    uso,
    compito: c.id,
  });

  /** Le fasce del decisore per un uso del compito; `null` se la taratura è spenta o l'archivio non risponde. */
  async function tarature(c: Compito_, uso: UsoDecisore): Promise<FasciaTaratura[] | null> {
    if (!taraturaAttiva()) return null;
    const k = `${c.id}|${uso}`;
    const e = memTaratura.get(k);
    if (e && adesso() - e.t < TTL_MEMORIA_MS) return e.fasce;
    try {
      const fasce = await archivio.leggiTaratura!(chiaveTar(c, uso));
      memTaratura.set(k, { t: adesso(), fasce });
      return fasce;
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "leggiTaratura", messaggio: String(err) } });
      return e ? e.fasce : null;
    }
  }

  /**
   * Conta una verità sulla fascia della probabilità che il decisore aveva dichiarato.
   * `punteggio` da 0 a 1 è quanto la risposta era davvero buona (1 = il decisore aveva ragione a fidarsi);
   * `peso` è quanto conta la prova (3 per un esito umano, 1 per un confronto automatico).
   */
  async function registraTaratura(c: Compito_, uso: UsoDecisore, dichiarata: number, punteggio: number, peso = 1, decisore?: string): Promise<void> {
    if (!taraturaAttiva()) return;
    const fascia = fasciaDi(dichiarata);
    try {
      await archivio.aggiornaTaratura!(chiaveTar(c, uso, decisore), fascia, { ok: punteggio * peso, ko: (1 - punteggio) * peso }, { emivita_giorni: emivita, adesso: adesso() });
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "aggiornaTaratura", messaggio: String(err) } });
      return;
    }
    // Il prossimo calcolo della soglia deve vedere subito il dato nuovo.
    memTaratura.delete(`${c.id}|${uso}`);
    emetti({ tipo: "taratura", compito: c.id, dettagli: { uso, fascia, ok: punteggio >= 0.5 } });
  }

  /** La soglia di verifica: quella del compito, o quella che la taratura suggerisce se `verifica.auto` e i casi bastano. */
  async function sogliaVerifica(c: Compito_): Promise<number> {
    const v = c.verifica!;
    if (!v.auto) return v.soglia;
    const fasce = await tarature(c, "verifica");
    if (!fasce) return v.soglia;
    const reg = regoleDi(c);
    return sogliaAutomatica(fasce, { qualita: reg.qualita, fiducia: reg.fiducia }) ?? v.soglia;
  }

  /** La domanda di verifica al decisore. Un errore non fa fallire nulla: si racconta e si risponde `null`. */
  async function chiediVerifica(ctx: Ctx, cont: Contenuto, conSegnale: boolean): Promise<EsitoSiNo | null> {
    if (!opz.decisore) return null;
    try {
      return await opz.decisore.sino({
        contenuto: `Richiesta:\n${ultimoTestoUtente(ctx.messaggi, 4000)}\n\nRisposta:\n${cont.testo}`,
        domanda: "La risposta soddisfa la richiesta?",
        ragiona: "auto",
        segnale: conSegnale ? ctx.o.segnale : undefined,
      });
    } catch (err) {
      emetti({ tipo: "errore_verifica", compito: ctx.c.id, dettagli: { messaggio: String(err) } });
      return null;
    }
  }

  /** Verifica prima di rispondere: il decisore dice se la risposta soddisfa la richiesta. Senza decisore non si può verificare. */
  async function verificata(ctx: Ctx, info: ModelloInfo, cont: Contenuto): Promise<{ ok: boolean; costo_usd: number; probabilita?: number }> {
    if (!ctx.c.verifica) return { ok: true, costo_usd: 0 };
    if (!opz.decisore) {
      emetti({ tipo: "verifica_senza_decisore", compito: ctx.c.id });
      return { ok: true, costo_usd: 0 };
    }
    const soglia = await sogliaVerifica(ctx.c);
    const e = await chiediVerifica(ctx, cont, true);
    if (!e) return { ok: false, costo_usd: 0 };
    // "Non so" non basta: nel dubbio si sale al modello successivo.
    const ok = e.risposta !== null && e.probabilita >= soglia;
    emetti({
      tipo: ok ? "verifica_ok" : "verifica_bocciata",
      compito: ctx.c.id,
      modello: info.id,
      dettagli: { modello: info.id, probabilita: e.probabilita, soglia },
    });
    return { ok, costo_usd: e.costo_usd, probabilita: e.risposta === null ? undefined : e.probabilita };
  }

  /** Ricorda la probabilità data a una risposta servita: se poi arriva un esito umano, serve a tarare il decisore. */
  async function ricordaVerifica(ctx: Ctx, id: string, probabilita: number): Promise<void> {
    if (!taraturaAttiva()) return;
    try {
      await archivio.scriviCache(
        await chiaveCache(["verifica", opz.app, id]),
        { testo: String(probabilita), modello: opz.decisore!.id, creato_il: adesso() },
        { app: opz.app, compito: ctx.c.id, durata_s: DURATA_PROBABILITA_S },
      );
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: ctx.c.id, dettagli: { operazione: "scriviCache", messaggio: String(err) } });
    }
  }

  // ===== Percorso di una richiesta =====

  function fallitaPerAnnullamento(ctx: Ctx): void {
    const s = ctx.o.segnale;
    if (s?.aborted) throw s.reason instanceof Error ? s.reason : new Error("Richiesta annullata");
  }

  function dipScelta(ctx: Ctx, bracci: Braccio[], secchio: string): DipScelta {
    return { c: ctx.c, rif: ctx.rif, ammessi: ctx.ammessi, bracci, secchio, token_in: ctx.token_in, token_out: ctx.token_out };
  }

  /**
   * Registra una richiesta interrotta (il cliente ha chiuso, il flusso è caduto a metà, la catena è finita) con la sua
   * spesa stimata. Il fornitore fattura l'ingresso anche se la risposta non arriva mai: se il motore non lo registrasse,
   * chi apre tanti flussi costosi e li chiude subito spenderebbe fuori da ogni conteggio. Si stima l'ingresso (token
   * dai caratteri, perché il fornitore non li ha comunicati) più l'uscita emessa fino a quel momento.
   */
  async function registraInterrotta(ctx: Ctx, secchio: string, speso: number, corrente: ModelloInfo | null, testoEmesso: string): Promise<void> {
    let usd = speso;
    let token_in = 0;
    let token_out = 0;
    if (corrente) {
      token_in = ctx.token_in;
      token_out = tokenDaTesto(testoEmesso);
      usd += costo(corrente, { token_in, token_out });
    }
    await registra({
      id: nuovoId(),
      app: opz.app,
      compito: ctx.c.id,
      versione: ctx.c.versione,
      secchio,
      modello: corrente?.id ?? ctx.c.riferimento,
      esito: "errore",
      ombra: false,
      token_in,
      token_out,
      caratteri: 0,
      costo_usd: usd,
      costo_riferimento_usd: 0,
      latenza_ms: Math.max(0, adesso() - ctx.inizio),
      utente: ctx.o.utente,
      creato_il: adesso(),
    });
    emetti({ tipo: "richiesta_interrotta", compito: ctx.c.id, modello: corrente?.id, dettagli: { costo_usd: usd } });
  }

  // Cosa serve a registrare una richiesta che si interrompe: chi la scrive aggiorna questi campi mentre procede.
  type Percorso = { secchio: string; speso: number; corrente: ModelloInfo | null; testo: string; chiusa: boolean };

  /** Percorso dal passo 3 (secchio) in poi. Ogni uscita registra la chiamata una volta sola, anche se la richiesta viene annullata. */
  async function servi(ctx: Ctx): Promise<Risultato> {
    const p: Percorso = { secchio: secchioBase(ctx.messaggi), speso: 0, corrente: null, testo: "", chiusa: false };
    try {
      return await serviPassi(ctx, p);
    } catch (err) {
      if (!p.chiusa) {
        p.chiusa = true;
        await registraInterrotta(ctx, p.secchio, p.speso, p.corrente, p.testo);
      }
      throw err;
    }
  }

  /** Percorso dal passo 3 (secchio) in poi: scelta, chiamata con ripiego, valida, verifica, registrazione. */
  async function serviPassi(ctx: Ctx, perc: Percorso): Promise<Risultato> {
    const { c } = ctx;
    const sec = await assegnaSecchio(ctx);
    perc.secchio = sec.secchio;
    let spesa = sec.costo_usd;
    perc.speso = spesa;
    const bracci = await bracciDi(c);
    const catena = catenaDiServizio(dipScelta(ctx, bracci, sec.secchio), { osserva: modo === "osserva", sospeso: sospensioni.sospeso });
    const insuccessi: Insuccesso[] = [];
    let ultimoErrore: unknown = null;

    for (let i = 0; i < catena.length; i++) {
      const info = catena[i].info;
      const èRiferimento = info.id === c.riferimento;
      // A chi si passa se questo modello non va: il riferimento chiude sempre la catena.
      const prossimo = catena[i + 1]?.info.id;
      const ripiego = (motivo: string) => {
        if (prossimo) emetti({ tipo: "ripiego", compito: c.id, modello: info.id, dettagli: { da: info.id, a: prossimo, motivo } });
      };
      fallitaPerAnnullamento(ctx);

      let r: RispostaFornitore;
      try {
        perc.corrente = info;
        r = await chiamaModello(ctx, info, true);
        perc.corrente = null;
        sospensioni.successo(info.id);
      } catch (err) {
        // Se è un annullamento la chiamata in corso è stata pagata in ingresso: `corrente` resta, e la registra chi cattura.
        fallitaPerAnnullamento(ctx);
        perc.corrente = null;
        ultimoErrore = err;
        const sospeso = sospensioni.errore(info.id);
        emetti({ tipo: "errore_fornitore", compito: c.id, modello: info.id, dettagli: { messaggio: String(err), sospeso } });
        if (sospeso) emetti({ tipo: "sospeso", compito: c.id, modello: info.id, dettagli: { modello: info.id, minuti: SOSPENSIONE_MS / 60_000 } });
        ripiego("errore");
        continue;
      }
      const costoTentativo = costo(info, r.uso);
      spesa += costoTentativo;
      perc.speso = spesa;
      const cont = contenutoDi(r);

      let accettata = valido(ctx, cont);
      let motivo = "valida";
      let probabilitaVerifica: number | undefined;
      if (!accettata) emetti({ tipo: "valida_bocciata", compito: c.id, modello: info.id, dettagli: { modello: info.id } });
      if (accettata && !èRiferimento && c.verifica) {
        const v = await verificata(ctx, info, cont);
        spesa += v.costo_usd;
        perc.speso = spesa;
        accettata = v.ok;
        probabilitaVerifica = v.probabilita;
        motivo = "verifica";
      }

      if (!accettata && !èRiferimento) {
        insuccessi.push({ info, costo_usd: costoTentativo, latenza_ms: r.latenza_ms });
        ripiego(motivo);
        continue;
      }
      // Se perfino il riferimento non supera `valida` non resta nulla da provare: si risponde comunque
      // con la sua risposta (e non la si mette in cache), perché un errore sicuro è peggio di una risposta imperfetta.
      perc.chiusa = true;
      return finalizza(ctx, sec.secchio, info, r, spesa, insuccessi, accettata, probabilitaVerifica);
    }

    // Nessun modello ha risposto: si registra l'errore e lo si passa all'app.
    perc.chiusa = true;
    await registra({
      id: nuovoId(),
      app: opz.app,
      compito: c.id,
      versione: c.versione,
      secchio: sec.secchio,
      modello: c.riferimento,
      esito: "errore",
      ombra: false,
      token_in: 0,
      token_out: 0,
      caratteri: 0,
      costo_usd: spesa,
      costo_riferimento_usd: 0,
      latenza_ms: Math.max(0, adesso() - ctx.inizio),
      utente: ctx.o.utente,
      creato_il: adesso(),
    });
    // I fallimenti per qualità dei candidati contano comunque come insuccessi.
    if (insuccessi.length) programma(() => registraInsuccessi(c, sec.secchio, insuccessi, ctx.o.utente));
    const dettaglio = ultimoErrore instanceof Error ? ultimoErrore.message : String(ultimoErrore ?? "nessuna risposta");
    throw new Error(`Motore: nessun modello ha risposto per "${c.id}" (${dettaglio})`);
  }

  async function registraInsuccessi(c: Compito_, secchio: string, lista: Insuccesso[], utente?: string): Promise<void> {
    for (const i of lista) {
      // Anche i fallimenti sono contributi: chi prepara testi che fanno bocciare il modello economico non lo ritira da solo.
      // La risposta all'utente è già partita per il suo percorso: qui si decide solo se il braccio ne risente.
      if (!(await contributoConsentito(chiaveDi(c, secchio, i.info.id), utente))) {
        emetti({ tipo: "tetto_utente", compito: c.id, modello: i.info.id, dettagli: { uso: "insuccesso" } });
        continue;
      }
      await applica(c, secchio, i.info.id, { ok: 0, ko: 1, costo_usd: i.costo_usd, latenza_ms: i.latenza_ms });
    }
  }

  /**
   * Passi 7 e 8: risposta all'app, scrittura in cache, registrazione della chiamata, lavoro dopo la risposta.
   * `probabilitaVerifica` è la probabilità che il decisore ha dato alla risposta servita (solo se c'è `verifica`).
   */
  async function finalizza(
    ctx: Ctx,
    secchio: string,
    info: ModelloInfo,
    r: RispostaFornitore,
    spesa: number,
    insuccessi: Insuccesso[],
    daCacheare: boolean,
    probabilitaVerifica?: number,
  ): Promise<Risultato> {
    const { c } = ctx;
    const id = nuovoId();
    const servitoRif = info.id === c.riferimento;
    const costoServito = costo(info, r.uso);
    const costoRif = servitoRif ? costoServito : costo(ctx.rif, r.uso);
    // Il tempo che l'utente ha aspettato non può essere inferiore a quello dichiarato dal fornitore.
    const latenza = Math.max(adesso() - ctx.inizio, r.latenza_ms);
    const metteInCache = daCacheare && cacheAttiva(c) && ctx.chiave !== null;

    const risultato: Risultato = {
      testo: r.testo,
      dati: r.dati,
      id_chiamata: id,
      modello: info.id,
      secchio,
      da_cache: false,
      locale: false,
      costo_usd: spesa,
      costo_riferimento_usd: costoRif,
      latenza_ms: latenza,
      uso: r.uso,
    };
    const chiamata: Chiamata = {
      id,
      app: opz.app,
      compito: c.id,
      versione: c.versione,
      secchio,
      modello: info.id,
      esito: "risposta",
      ombra: false,
      token_in: r.uso.token_in,
      token_out: r.uso.token_out,
      caratteri: r.uso.caratteri ?? 0,
      costo_usd: spesa,
      costo_riferimento_usd: costoRif,
      latenza_ms: latenza,
      utente: ctx.o.utente,
      chiave_cache: metteInCache ? ctx.chiave! : undefined,
      creato_il: adesso(),
    };

    await Promise.all([
      registra(chiamata),
      metteInCache
        ? archivio
            .scriviCache(
              ctx.chiave!,
              { testo: r.testo, dati: r.dati, modello: info.id, creato_il: adesso() },
              { app: opz.app, compito: c.id, durata_s: c.cache?.durata_s ?? DURATA_CACHE_PREDEFINITA_S },
            )
            .catch((err) => emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "scriviCache", messaggio: String(err) } }))
        : Promise.resolve(),
    ]);
    // Il tetto si misura sul costo del riferimento, non sulla spesa vera: vedi `spesaDi`.
    contaSpesa(c, "base", costoRif);
    emetti({
      tipo: "risposta",
      compito: c.id,
      modello: info.id,
      dettagli: { modello: info.id, secchio, costo_usd: spesa, costo_riferimento_usd: costoRif },
    });

    programma(() =>
      lavoroDopo(ctx, secchio, info, contenutoDi(r), { costo_usd: costoServito, latenza_ms: r.latenza_ms }, insuccessi, { id, probabilitaVerifica }),
    );
    return risultato;
  }

  // ===== Apprendimento (passo 8) =====

  /** Scrive una chiamata in ombra (spesa di apprendimento: nessun riferimento da risparmiare) e la conta per il tetto. */
  async function registraCostoOmbra(c: Compito_, secchio: string, modello: string, info: { costo_usd: number; uso?: Uso; latenza_ms?: number }): Promise<void> {
    await registra({
      id: nuovoId(),
      app: opz.app,
      compito: c.id,
      versione: c.versione,
      secchio,
      modello,
      esito: "risposta",
      ombra: true,
      token_in: info.uso?.token_in ?? 0,
      token_out: info.uso?.token_out ?? 0,
      caratteri: info.uso?.caratteri ?? 0,
      costo_usd: info.costo_usd,
      costo_riferimento_usd: 0,
      latenza_ms: info.latenza_ms ?? 0,
      creato_il: adesso(),
    });
    contaSpesa(c, "apprendimento", info.costo_usd);
  }

  /** Esegue un modello in ombra: la risposta non va all'utente, ma la spesa si registra e conta per il tetto. */
  async function eseguiInOmbra(ctx: Ctx, info: ModelloInfo, secchio: string): Promise<Prova | null> {
    const { c } = ctx;
    let r: RispostaFornitore;
    try {
      r = await chiamaModello(ctx, info, false);
      sospensioni.successo(info.id);
    } catch (err) {
      const sospeso = sospensioni.errore(info.id);
      emetti({ tipo: "errore_fornitore", compito: c.id, modello: info.id, dettagli: { messaggio: String(err), sospeso, ombra: true } });
      return null;
    }
    const costo_usd = costo(info, r.uso);
    await registraCostoOmbra(c, secchio, info.id, { costo_usd, uso: r.uso, latenza_ms: r.latenza_ms });
    return { contenuto: contenutoDi(r), uso: r.uso, costo_usd, latenza_ms: r.latenza_ms };
  }

  /** Il decisore dà la sua probabilità a una risposta in ombra: costa, quindi si registra come spesa di apprendimento. */
  async function probabilitaInOmbra(ctx: Ctx, secchio: string, cont: Contenuto): Promise<number | undefined> {
    const { c } = ctx;
    if (!c.verifica || !taraturaAttiva()) return undefined;
    const e = await chiediVerifica(ctx, cont, false);
    if (!e) return undefined;
    if (e.costo_usd > 0) await registraCostoOmbra(c, secchio, `decisore/${opz.decisore!.id}`, { costo_usd: e.costo_usd });
    return e.risposta === null ? undefined : e.probabilita;
  }

  /**
   * Dà un punteggio da 0 a 1 al candidato rispetto al riferimento; il costo del giudizio si registra come spesa
   * di apprendimento. Se giudica il decisore: il punteggio è tarato sulla fascia della sua probabilità e, una
   * volta su dieci, giudica anche il riferimento, così l'accordo tra i due insegna quanto fidarsi di lui.
   */
  async function giudicaCoppia(
    ctx: Ctx,
    riferimento: Contenuto,
    candidato: Contenuto,
    secchio: string,
    modello: string,
  ): Promise<{ punteggio: number; metodo: string } | null> {
    const { c } = ctx;
    try {
      const conDecisore = c.giudice === "decisore" && !!opz.decisore;
      const fasce = conDecisore ? await tarature(c, "giudice") : null;
      let dichiarata: number | undefined;
      // Se il decisore è incerto o in errore, il giudizio passa al modello: lo si scrive nell'evento, altrimenti
      // un decisore rotto resterebbe invisibile (il giudizio riuscirebbe lo stesso, ma a un altro prezzo).
      let ripiego = undefined as Ripiego | undefined; // il cast evita che TS lo creda sempre vuoto: lo scrive la funzione sotto
      const richiesta = { compito: c, ingresso: ctx.ingresso, messaggi: ctx.messaggi, riferimento, candidato };
      const g = await giudica(
        { fornitori, catalogo, decisore: opz.decisore, casuale, taratura: fasce ?? undefined, suDecisore: (p) => (dichiarata = p), suRipiego: (r) => (ripiego = r) },
        richiesta,
      );
      if (g.costo_usd > 0) {
        const chi = g.metodo === "decisore" ? `decisore/${opz.decisore?.id ?? "?"}` : c.giudice && c.giudice !== "decisore" ? c.giudice : c.riferimento;
        await registraCostoOmbra(c, secchio, chi, { costo_usd: g.costo_usd });
      }
      const punteggio = Math.min(1, Math.max(0, g.punteggio));
      emetti({
        tipo: "giudizio",
        compito: c.id,
        modello,
        dettagli: { modello, punteggio, metodo: g.metodo, costo_usd: g.costo_usd, ...(ripiego ? { ripiego: ripiego.motivo, ...(ripiego.dettaglio ? { errore_decisore: ripiego.dettaglio } : {}) } : {}) },
      });

      if (g.metodo === "decisore" && dichiarata !== undefined && fasce && casuale() < QUOTA_DOPPIO_GIUDIZIO) {
        await verificaConRiferimento(ctx, richiesta, secchio, dichiarata);
      }
      return { punteggio, metodo: g.metodo };
    } catch (err) {
      emetti({ tipo: "errore_giudice", compito: c.id, dettagli: { messaggio: String(err) } });
      return null;
    }
  }

  /** Fa giudicare la stessa coppia al modello di riferimento: il suo verdetto è la verità per la taratura del decisore giudice. */
  async function verificaConRiferimento(
    ctx: Ctx,
    richiesta: Parameters<typeof giudica>[1],
    secchio: string,
    dichiarata: number,
  ): Promise<void> {
    const { c } = ctx;
    try {
      const g = await giudica({ fornitori, catalogo, casuale }, { ...richiesta, compito: { ...c, giudice: c.riferimento } });
      if (g.costo_usd > 0) await registraCostoOmbra(c, secchio, c.riferimento, { costo_usd: g.costo_usd });
      // Solo il verdetto di un modello conta: se `valida` o `confronta` avessero risposto, il decisore non sarebbe stato interpellato.
      if (g.metodo === "modello") await registraTaratura(c, "giudice", dichiarata, Math.min(1, Math.max(0, g.punteggio)));
    } catch (err) {
      emetti({ tipo: "errore_giudice", compito: c.id, dettagli: { messaggio: String(err), doppio: true } });
    }
  }

  /**
   * Cosa fa il motore dopo aver risposto:
   * 1. segna gli insuccessi dei candidati scartati e ricorda la probabilità data dalla verifica;
   * 2. controllo (con probabilità `controllo`): se è stato servito un candidato, esegue anche il
   *    riferimento e giudica la risposta servita, così un modello promosso che peggiora si scopre;
   * 3. prova in ombra (con probabilità `campione`): mette alla prova il braccio meno provato e meno
   *    caro di quello servito, confrontandolo col riferimento.
   * Si pesca prima il numero per il controllo, poi quello per la prova (utile per i test ripetibili).
   * Dove c'è `verifica`, il confronto col riferimento è anche la verità con cui si tara il decisore.
   */
  async function lavoroDopo(
    ctx: Ctx,
    secchio: string,
    servito: ModelloInfo,
    risposta: Contenuto,
    costoServito: { costo_usd: number; latenza_ms: number },
    insuccessi: Insuccesso[],
    verifica: { id: string; probabilitaVerifica?: number },
  ): Promise<void> {
    const { c } = ctx;
    const reg = regoleDi(c);
    if (insuccessi.length) await registraInsuccessi(c, secchio, insuccessi, ctx.o.utente);
    if (verifica.probabilitaVerifica !== undefined) await ricordaVerifica(ctx, verifica.id, verifica.probabilitaVerifica);

    const servitoRif = servito.id === c.riferimento;
    let rifRisposta: Contenuto | null = servitoRif ? risposta : null;

    // --- Controllo del braccio servito ---
    if (!servitoRif && casuale() < reg.controllo) {
      const t = await tettoDi(c, false);
      if (!t.consentito) {
        emetti({ tipo: "tetto_raggiunto", compito: c.id, modello: servito.id, dettagli: { spesa: t.spesa, tetto: t.tetto } });
      } else if (!(await contributoConsentito(chiaveDi(c, secchio, servito.id), ctx.o.utente))) {
        emetti({ tipo: "tetto_utente", compito: c.id, modello: servito.id, dettagli: { uso: "controllo" } });
      } else {
        const p = await eseguiInOmbra(ctx, ctx.rif, secchio);
        if (p) {
          emetti({ tipo: "controllo", compito: c.id, modello: servito.id, dettagli: { modello: servito.id, costo_usd: p.costo_usd } });
          rifRisposta = p.contenuto;
          const g = await giudicaCoppia(ctx, p.contenuto, risposta, secchio, servito.id);
          if (g) {
            await applica(c, secchio, servito.id, {
              ok: g.punteggio,
              ko: 1 - g.punteggio,
              costo_usd: costoServito.costo_usd,
              latenza_ms: costoServito.latenza_ms,
            });
            if (verifica.probabilitaVerifica !== undefined) await registraTaratura(c, "verifica", verifica.probabilitaVerifica, g.punteggio);
          }
        }
      }
    }

    // --- Prova in ombra ---
    const bracci = await bracciDi(c);
    const d = dipScelta(ctx, bracci, secchio);
    const costoDelServito = costoStimato(servito, trovaBraccio(bracci, secchio, servito.id), ctx.token_in, ctx.token_out);
    const eleggibili = candidatiProva(d, { costo_servito: costoDelServito, osserva: modo === "osserva", sospeso: sospensioni.sospeso });
    if (!eleggibili.length || !(casuale() < reg.campione)) return;

    const scelto = eleggibili[0];
    // Finché il braccio ha poche prove il tetto non vale: senza dati non si potrebbe mai cominciare.
    // L'esenzione però ha un limite fisso, anche se il compito chiede `minimo_prove` più alto.
    const esente = (scelto.braccio ? proveVere(scelto.braccio) : 0) < Math.min(reg.minimo_prove, MASSIMO_PROVE_ESENTI);
    const t = await tettoDi(c, esente);
    if (!t.consentito) {
      emetti({ tipo: "tetto_raggiunto", compito: c.id, modello: scelto.info.id, dettagli: { spesa: t.spesa, tetto: t.tetto } });
      return;
    }
    // Il tetto per utente si controlla prima di spendere: se non c'è posto, la prova non parte nemmeno.
    if (!(await contributoConsentito(chiaveDi(c, secchio, scelto.info.id), ctx.o.utente))) {
      emetti({ tipo: "tetto_utente", compito: c.id, modello: scelto.info.id, dettagli: { uso: "prova_ombra" } });
      return;
    }
    if (!rifRisposta) {
      const p = await eseguiInOmbra(ctx, ctx.rif, secchio);
      if (!p) return;
      emetti({ tipo: "riferimento_per_prova", compito: c.id, modello: ctx.rif.id, dettagli: { modello: ctx.rif.id } });
      rifRisposta = p.contenuto;
    }
    const cand = await eseguiInOmbra(ctx, scelto.info, secchio);
    if (!cand) return;
    emetti({ tipo: "prova_ombra", compito: c.id, modello: scelto.info.id, dettagli: { modello: scelto.info.id, costo_usd: cand.costo_usd } });
    // Nei compiti con `verifica` il decisore dà la sua probabilità anche a questa risposta: è il dato che serve a tararlo.
    const probabilitaCand = await probabilitaInOmbra(ctx, secchio, cand.contenuto);
    const g = await giudicaCoppia(ctx, rifRisposta, cand.contenuto, secchio, scelto.info.id);
    if (!g) return;
    await applica(c, secchio, scelto.info.id, {
      ok: g.punteggio,
      ko: 1 - g.punteggio,
      costo_usd: cand.costo_usd,
      latenza_ms: cand.latenza_ms,
    });
    if (probabilitaCand !== undefined) await registraTaratura(c, "verifica", probabilitaCand, g.punteggio);
  }

  // ===== Risposte senza chiamata: regola locale e cache =====

  async function registraSenzaChiamata(
    ctx: Ctx,
    esito: "locale" | "cache",
    secchio: string,
    cont: Contenuto,
    chiave: string | undefined,
  ): Promise<Risultato> {
    const { c } = ctx;
    const id = nuovoId();
    // Il risparmio è il costo che avrebbe avuto il riferimento per una risposta lunga quanto questa.
    const costoRif = costoAtteso(ctx.rif, ctx.token_in, tokenDaTesto(cont.testo));
    const latenza = Math.max(0, adesso() - ctx.inizio);
    await registra({
      id,
      app: opz.app,
      compito: c.id,
      versione: c.versione,
      secchio,
      // "locale" e "cache" al posto del modello: i righi dei modelli veri restano solo di chiamate a pagamento.
      modello: esito,
      esito,
      ombra: false,
      token_in: 0,
      token_out: 0,
      caratteri: 0,
      costo_usd: 0,
      costo_riferimento_usd: costoRif,
      latenza_ms: latenza,
      utente: ctx.o.utente,
      chiave_cache: chiave,
      creato_il: adesso(),
    });
    // Anche una risposta senza chiamata fa parte di quanto il compito sarebbe costato col solo riferimento.
    contaSpesa(c, "base", costoRif);
    emetti({ tipo: esito, compito: c.id });
    return {
      testo: cont.testo,
      dati: cont.dati,
      id_chiamata: id,
      modello: esito,
      secchio,
      da_cache: esito === "cache",
      locale: esito === "locale",
      costo_usd: 0,
      costo_riferimento_usd: costoRif,
      latenza_ms: latenza,
      uso: { token_in: 0, token_out: 0 },
    };
  }

  async function provaLocale(ctx: Ctx): Promise<Risultato | null> {
    const { c } = ctx;
    if (!c.locale) return null;
    let cont: Contenuto | null = null;
    try {
      cont = await c.locale(ctx.ingresso);
    } catch (err) {
      // Una regola che si rompe non deve togliere la risposta all'utente: si prosegue col percorso normale.
      emetti({ tipo: "errore_locale", compito: c.id, dettagli: { messaggio: String(err) } });
      return null;
    }
    if (!cont) return null;
    return registraSenzaChiamata(ctx, "locale", "locale", cont, undefined);
  }

  async function daCache(ctx: Ctx): Promise<Risultato | null> {
    if (!cacheAttiva(ctx.c) || ctx.chiave === null || ctx.o.senza_cache) return null;
    let voce;
    try {
      voce = await archivio.leggiCache(ctx.chiave);
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: ctx.c.id, dettagli: { operazione: "leggiCache", messaggio: String(err) } });
      return null;
    }
    if (!voce) return null;
    const secchio = await secchioSenzaChiamate(ctx);
    const r = await registraSenzaChiamata(ctx, "cache", secchio, { testo: voce.testo, dati: voce.dati }, ctx.chiave);
    // Chi ha prodotto la risposta si sa dalla voce, non dalla chiamata (che dice "cache").
    return { ...r, modello: voce.modello };
  }

  // ===== Modo spento =====

  async function eseguiSpento(ctx: Ctx): Promise<Risultato> {
    // Spento = il motore non esiste: chiamata diretta al riferimento, senza cache, registro né regole.
    const r = await chiamaModello(ctx, ctx.rif, true);
    const c = costo(ctx.rif, r.uso);
    return {
      testo: r.testo,
      dati: r.dati,
      id_chiamata: nuovoId(),
      modello: ctx.rif.id,
      secchio: "spento",
      da_cache: false,
      locale: false,
      costo_usd: c,
      costo_riferimento_usd: c,
      latenza_ms: Math.max(adesso() - ctx.inizio, r.latenza_ms),
      uso: r.uso,
    };
  }

  // ===== esegui =====

  async function esegui<I>(nome: string, ingresso: I, o: OpzioniChiamata = {}): Promise<Risultato> {
    const ctx = preparaCtx(nome, ingresso, o);
    if (modo === "spento") return eseguiSpento(ctx);

    const locale = await provaLocale(ctx);
    if (locale) return locale;

    ctx.chiave = await calcolaChiave(ctx);
    const hit = await daCache(ctx);
    if (hit) return hit;

    // Richieste uguali in corso insieme condividono una sola chiamata. `senza_cache` le esclude:
    // chi vuole una risposta fresca non vuole quella di un altro.
    if (ctx.chiave !== null && !o.senza_cache) {
      let eseguitaQui = false;
      const r = await unica(ctx.chiave, () => {
        eseguitaQui = true;
        return servi(ctx);
      });
      // Chi si è agganciato a una chiamata altrui non ha speso nulla: per lui è come una cache.
      return eseguitaQui ? r : { ...r, da_cache: true, costo_usd: 0 };
    }
    return servi(ctx);
  }

  // ===== flusso =====

  async function* flusso<I>(nome: string, ingresso: I, o: OpzioniChiamata = {}): AsyncGenerator<{ delta?: string; fine?: Risultato }> {
    const ctx = preparaCtx(nome, ingresso, o);
    const { c } = ctx;

    if (modo === "spento") {
      const f = fornitori[ctx.rif.fornitore];
      if (f.flusso) {
        let ultimo: RispostaFornitore | undefined;
        const inizio = adesso();
        for await (const p of f.flusso({ modello: ctx.rif, messaggi: ctx.messaggi, schema: c.schema, max_token: c.max_token, temperatura: c.temperatura, segnale: o.segnale })) {
          if (p.delta) yield { delta: p.delta };
          if (p.fine) ultimo = p.fine;
        }
        const uso = ultimo?.uso ?? { token_in: 0, token_out: 0 };
        const cc = costo(ctx.rif, uso);
        yield {
          fine: {
            testo: ultimo?.testo ?? "",
            dati: ultimo?.dati,
            id_chiamata: nuovoId(),
            modello: ctx.rif.id,
            secchio: "spento",
            da_cache: false,
            locale: false,
            costo_usd: cc,
            costo_riferimento_usd: cc,
            latenza_ms: Math.max(adesso() - inizio, ultimo?.latenza_ms ?? 0),
            uso,
          },
        };
        return;
      }
      const r = await eseguiSpento(ctx);
      yield { delta: r.testo };
      yield { fine: r };
      return;
    }

    // Regola locale e cache escono in un solo pezzo.
    const locale = await provaLocale(ctx);
    if (locale) {
      yield { delta: locale.testo };
      yield { fine: locale };
      return;
    }
    ctx.chiave = await calcolaChiave(ctx);
    const hit = await daCache(ctx);
    if (hit) {
      yield { delta: hit.testo };
      yield { fine: hit };
      return;
    }

    // Ogni uscita (risposta, errore, cliente che chiude a metà) registra la chiamata una volta sola.
    const perc: Percorso = { secchio: secchioBase(ctx.messaggi), speso: 0, corrente: null, testo: "", chiusa: false };
    try {
      const sec = await assegnaSecchio(ctx);
      perc.secchio = sec.secchio;
      perc.speso = sec.costo_usd;
      const bracci = await bracciDi(c);
      const catena = catenaDiServizio(dipScelta(ctx, bracci, sec.secchio), { osserva: modo === "osserva", sospeso: sospensioni.sospeso });
      let ultimoErrore: unknown = null;

      for (let i = 0; i < catena.length; i++) {
        const info = catena[i].info;
        fallitaPerAnnullamento(ctx);
        const f = fornitori[info.fornitore];
        perc.corrente = info;
        perc.testo = "";
        let testo = "";
        let emesso = false;
        let fine: RispostaFornitore | undefined;
        try {
          const rich = { modello: info, messaggi: ctx.messaggi, schema: c.schema, max_token: c.max_token, temperatura: c.temperatura, segnale: o.segnale };
          if (f.flusso) {
            for await (const p of f.flusso(rich)) {
              if (p.delta) {
                testo += p.delta;
                perc.testo = testo;
                emesso = true;
                yield { delta: p.delta };
              }
              if (p.fine) fine = p.fine;
            }
          } else {
            const r = await f.genera(rich);
            fine = r;
            testo = r.testo;
            perc.testo = testo;
            emesso = true;
            yield { delta: r.testo };
          }
          sospensioni.successo(info.id);
        } catch (err) {
          fallitaPerAnnullamento(ctx);
          const sospeso = sospensioni.errore(info.id);
          emetti({ tipo: "errore_fornitore", compito: c.id, modello: info.id, dettagli: { messaggio: String(err), sospeso } });
          if (sospeso) emetti({ tipo: "sospeso", compito: c.id, modello: info.id, dettagli: { modello: info.id, minuti: SOSPENSIONE_MS / 60_000 } });
          // Se l'utente ha già ricevuto dei pezzi non si può più cambiare modello a metà frase.
          if (emesso) throw err;
          perc.corrente = null;
          ultimoErrore = err;
          const prossimo = catena[i + 1]?.info.id;
          if (prossimo) emetti({ tipo: "ripiego", compito: c.id, modello: info.id, dettagli: { da: info.id, a: prossimo, motivo: "errore" } });
          continue;
        }
        const r: RispostaFornitore = fine ?? {
          testo,
          uso: { token_in: ctx.token_in, token_out: tokenDaTesto(testo) },
          latenza_ms: Math.max(0, adesso() - ctx.inizio),
        };
        const cont: Contenuto = { testo: fine?.testo ?? testo, dati: fine?.dati };
        // Nel flusso `valida` arriva quando i pezzi sono già partiti: non si può tornare indietro,
        // ma la bocciatura conta come insuccesso del braccio, così il modello si ritira da solo.
        const ok = valido(ctx, cont);
        const insuccessi: Insuccesso[] = [];
        if (!ok && info.id !== c.riferimento) {
          emetti({ tipo: "valida_bocciata", compito: c.id, modello: info.id, dettagli: { modello: info.id } });
          insuccessi.push({ info, costo_usd: costo(info, r.uso), latenza_ms: r.latenza_ms });
        }
        perc.chiusa = true;
        yield { fine: await finalizza(ctx, sec.secchio, info, { ...r, testo: cont.testo, dati: cont.dati }, sec.costo_usd + costo(info, r.uso), insuccessi, ok) };
        return;
      }
      const dettaglio = ultimoErrore instanceof Error ? ultimoErrore.message : String(ultimoErrore ?? "nessuna risposta");
      throw new Error(`Motore: nessun modello ha risposto per "${c.id}" (${dettaglio})`);
    } finally {
      if (!perc.chiusa) {
        perc.chiusa = true;
        await registraInterrotta(ctx, perc.secchio, perc.speso, perc.corrente, perc.testo);
      }
    }
  }

  // ===== esito umano =====

  /** Se alla risposta servita il decisore aveva dato una probabilità, l'esito umano dice se aveva ragione. Una volta sola. */
  async function taraturaDaEsito(c: Compito_, id: string, ok: boolean, peso: number): Promise<void> {
    if (!taraturaAttiva()) return;
    try {
      const chiave = await chiaveCache(["verifica", opz.app, id]);
      const voce = await archivio.leggiCache(chiave);
      if (!voce) return;
      await archivio.togliCache(chiave);
      const p = Number(voce.testo);
      if (!Number.isFinite(p)) return;
      // Il decisore è quello che aveva verificato, anche se nel frattempo ne è stato collegato un altro.
      await registraTaratura(c, "verifica", p, ok ? 1 : 0, peso, voce.modello || undefined);
    } catch (err) {
      emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "taraturaDaEsito", messaggio: String(err) } });
    }
  }

  // Seconda difesa in memoria: se l'archivio non risponde, la stessa istanza non somma comunque due esiti alla stessa chiamata.
  const esitiDati = new Set<string>();

  /**
   * Dice se questo è il primo esito umano della chiamata. Con `segnaEsito` il segno sta sulla chiamata ed è atomico
   * (vale tra istanze); senza, regge solo la memoria di questa istanza.
   * Senza questo, ripetere `esito` sulla stessa chiamata sommerebbe ogni volta il peso e sposterebbe il braccio.
   * Se il segno non si riesce a scrivere l'esito è "incerto" e non conta: con il database in difficoltà
   * gli esiti ripetuti passerebbero tutti.
   */
  async function primoEsito(ch: Chiamata): Promise<"primo" | "ripetuto" | "incerto"> {
    if (esitiDati.has(ch.id)) return "ripetuto";
    if (archivio.segnaEsito) {
      let primo: boolean;
      try {
        primo = await archivio.segnaEsito(ch.id, adesso());
      } catch (err) {
        emetti({ tipo: "errore_archivio", compito: ch.compito, dettagli: { operazione: "segnaEsito", messaggio: String(err) } });
        return "incerto";
      }
      if (!primo) return "ripetuto";
    }
    if (esitiDati.size >= MASSIMO_ESITI_IN_MEMORIA) esitiDati.clear();
    esitiDati.add(ch.id);
    return "primo";
  }

  async function esito(id_chiamata: string, e: { ok: boolean; peso?: number }): Promise<void> {
    let ch: Chiamata | null;
    try {
      ch = await archivio.leggiChiamata(id_chiamata);
    } catch (err) {
      emetti({ tipo: "errore_archivio", dettagli: { operazione: "leggiChiamata", messaggio: String(err) } });
      return;
    }
    if (!ch) {
      emetti({ tipo: "esito_senza_chiamata", dettagli: { id_chiamata } });
      return;
    }
    // Un esito umano per chiamata: dal secondo in poi non si cambia più nulla.
    const segno = await primoEsito(ch);
    if (segno === "incerto") {
      emetti({ tipo: "esito_non_segnato", compito: ch.compito, dettagli: { id_chiamata } });
      return;
    }
    if (segno === "ripetuto") {
      emetti({ tipo: "esito_ripetuto", compito: ch.compito, dettagli: { id_chiamata } });
      return;
    }
    const peso = e.peso ?? PESO_ESITO_UMANO;
    const c = compiti.get(ch.compito);
    // Un giudizio umano è la verità migliore che c'è: insegna al motore quanto fidarsi del decisore che aveva verificato la risposta.
    if (c?.verifica && !ch.ombra) await taraturaDaEsito(c, ch.id, e.ok, peso);

    // Chi ha prodotto la risposta: per la cache lo dice la voce, per una chiamata vera la chiamata stessa.
    let modello = ch.modello;
    if (ch.esito === "cache" || modello === "cache") {
      modello = "";
      if (ch.chiave_cache) {
        try {
          modello = (await archivio.leggiCache(ch.chiave_cache))?.modello ?? "";
        } catch {
          /* voce non leggibile: l'esito vale comunque per la cache */
        }
      }
    }
    // Un giudizio negativo toglie la risposta dalla cache, da qualunque chiamata arrivi: altrimenti
    // la stessa risposta sbagliata verrebbe ripetuta a tutti per 30 giorni.
    if (!e.ok && ch.chiave_cache) {
      try {
        await archivio.togliCache(ch.chiave_cache);
      } catch (err) {
        emetti({ tipo: "errore_archivio", compito: ch.compito, dettagli: { operazione: "togliCache", messaggio: String(err) } });
      }
    }

    // Il riferimento è la misura: non ha statistiche da aggiornare. Le chiamate in ombra non sono andate all'utente.
    if (!c || ch.ombra || !modello || modello === "locale" || modello === c.riferimento) return;
    if (ch.esito === "errore" || ch.secchio === "cache" || ch.secchio === "locale") return;
    // Un solo utente non sposta il braccio con tanti esiti su chiamate diverse: oltre il tetto non conta.
    if (!(await contributoConsentito(chiaveDi(c, ch.secchio, modello), ch.utente))) {
      emetti({ tipo: "tetto_utente", compito: ch.compito, modello, dettagli: { uso: "esito" } });
      return;
    }
    await applica(c, ch.secchio, modello, e.ok ? { ok: peso, ko: 0 } : { ok: 0, ko: peso });
  }

  // ===== stato =====

  async function stato(nome?: string): Promise<StatoCompito[]> {
    const lista = nome ? [compiti.get(nome)].filter((x): x is Compito_ => !!x) : [...compiti.values()];
    const out: StatoCompito[] = [];
    for (const c of lista) {
      const bracci = await bracciDi(c, true);
      const priori = await prioriDi(c.genere);
      const reg = regoleDi(c);
      const ammessi = candidatiAmmessi(c, { catalogo, fornitori }, []);
      const rif = catalogo.modello(c.riferimento);
      const tin = 500;
      const tout = tokenUscitaStimati(c);
      const secchi = [...new Set(bracci.map((b) => b.secchio))].sort();
      for (const secchio of secchi) {
        const dello = bracci.filter((b) => b.secchio === secchio);
        const arricchiti = dello.map((b) => {
          const { a0, b0 } = prioreEffettivo(priori[b.modello], reg.peso_priori);
          const l = limiti(b.ok + a0, b.ko + b0, reg.fiducia);
          return { ...b, basso: l.basso, alto: l.alto, prove: proveVere(b) };
        });
        let servito = c.riferimento;
        if (rif && modo !== "osserva") {
          const attivi = ammessi
            .map((info) => ({ info, b: trovaBraccio(bracci, secchio, info.id) }))
            .filter((x) => x.b?.stato === "attivo")
            .map((x) => ({ id: x.info.id, costo: costoStimato(x.info, x.b, tin, tout) }))
            .sort((a, b) => a.costo - b.costo);
          if (attivi.length) servito = attivi[0].id;
        }
        out.push({ compito: c.id, versione: c.versione, secchio, servito, bracci: arricchiti });
      }
    }
    return out;
  }

  // ===== taratura =====

  /** Quanto ci si può fidare del decisore, per compito e uso. Vuoto se non c'è decisore o l'archivio non tiene la taratura. */
  async function taratura(nome?: string): Promise<StatoTaratura[]> {
    if (!taraturaAttiva()) return [];
    const lista = nome ? [compiti.get(nome)].filter((x): x is Compito_ => !!x) : [...compiti.values()];
    const out: StatoTaratura[] = [];
    for (const c of lista) {
      const reg = regoleDi(c);
      for (const uso of ["verifica", "giudice"] as UsoDecisore[]) {
        const previsto = uso === "verifica" ? !!c.verifica : c.giudice === "decisore";
        let fasce: FasciaTaratura[];
        try {
          fasce = await archivio.leggiTaratura!(chiaveTar(c, uso));
        } catch (err) {
          emetti({ tipo: "errore_archivio", compito: c.id, dettagli: { operazione: "leggiTaratura", messaggio: String(err) } });
          continue;
        }
        // Un uso che il compito non prevede si mostra solo se ha lasciato dati (per esempio prima di un cambio di configurazione).
        if (!previsto && !fasce.some((f) => f.ok + f.ko > 0)) continue;
        out.push({
          chiave: chiaveTar(c, uso),
          fasce,
          // La soglia automatica ha senso solo per la verifica: il giudice non ha una soglia.
          soglia: uso === "verifica" ? sogliaAutomatica(fasce, { qualita: reg.qualita, fiducia: reg.fiducia }) : null,
        });
      }
    }
    return out;
  }

  // ===== parla =====

  async function parla(r: RichiestaParla): Promise<RisultatoParla> {
    const modello = catalogo.modello(r.modello);
    if (!modello) throw new Error(`Motore: modello vocale "${r.modello}" non nel catalogo`);
    const fornitore = fornitori[modello.fornitore];
    if (!fornitore) throw new Error(`Motore: nessun fornitore "${modello.fornitore}" per la voce`);
    const inizio = adesso();
    // Spento: niente deposito, quindi niente cache; e niente registro.
    const res = await parlaConCache(r, { fornitore, modello, app: opz.app, deposito: modo === "spento" ? undefined : opz.deposito });
    if (modo !== "spento") {
      await registra({
        id: nuovoId(),
        app: opz.app,
        compito: "parla",
        versione: 1,
        secchio: "voce",
        modello: modello.id,
        esito: res.da_cache ? "cache" : "risposta",
        ombra: false,
        token_in: 0,
        token_out: 0,
        caratteri: res.caratteri_pagati,
        costo_usd: res.costo_usd,
        costo_riferimento_usd: res.costo_pieno_usd,
        latenza_ms: Math.max(0, adesso() - inizio),
        utente: r.utente,
        creato_il: adesso(),
      });
    }
    return res;
  }

  return {
    registra: registra_compito,
    esegui,
    flusso,
    parla,
    esito,
    stato,
    taratura,
  };
}
