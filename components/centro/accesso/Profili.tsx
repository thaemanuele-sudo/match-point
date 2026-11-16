"use client";
/*
 * P1 · Scegli profilo e centro  (/app/profili)
 * Elenca tutti i profili (membri) dell'utente in tutti i centri: nome del centro, ruolo e, per il genitore, il figlio.
 * Si sceglie con quale entrare, la scelta si salva (vedi comune.ts) e si apre /c/<slug>/<ruolo>.
 * I dati arrivano da Supabase con le regole RLS del database: ogni ruolo legge solo il suo perimetro.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Schermo } from "@/components/app/Schermo";
import { elencoNomi, leggiUltimo, percorsoRuolo, prossimaLezione, salvaScelta, type RuoloCentro } from "./comune";
import { IcoFrecciaAvanti, IcoOrologio, IcoPiu, IcoSpunta, STILE_RUOLO } from "./icone";
import s from "./accesso.module.css";

const IT = {
  marchio: "Match Point",
  titolo: "Chi sei oggi?",
  introUno: "Il tuo account ha 1 profilo in 1 centro. Scegli con quale entrare.",
  introPiu: "Il tuo account ha {p} profili in {c} {centri}. Scegli con quale entrare.",
  centroS: "centro",
  centroP: "centri",
  introPiuUno: "Il tuo account ha {p} profili in 1 centro. Scegli con quale entrare.",
  titolare: "Titolare",
  dt: "Direttore tecnico",
  responsabile_area: "Responsabile",
  maestro: "Maestro",
  segreteria: "Segreteria",
  genitore: "Genitore",
  allievo: "Allievo",
  genitoreDi: "Genitore di {n}",
  genitoreDiMin: "genitore di {n}",
  e: "e",
  area: "area {a}",
  lezioniOggiUna: "1 lezione oggi",
  lezioniOggi: "{n} lezioni oggi",
  nessunaOggi: "Nessuna lezione oggi",
  segnalazioneUna: "1 segnalazione da vedere",
  segnalazioni: "{n} segnalazioni da vedere",
  prossima: "Prossima lezione {quando}",
  oggi: "oggi",
  domani: "domani",
  unisciti: "Unisciti a un centro",
  uniscitiSotto: "Hai un codice invito o un link?",
  nota: "Cambio rapido: dopo l'accesso tocca il tuo avatar in alto per passare da un profilo all'altro, senza uscire. Ogni profilo vede solo i dati del suo centro.",
  entra: "Entra come {r}",
  entraNessuno: "Scegli un profilo",
  sospeso: "Sospeso",
  centroSospeso: "Centro sospeso",
  caricamento: "Carico i tuoi profili…",
  errore: "Non riesco a caricare i tuoi profili. Controlla la connessione e riprova.",
  riprova: "Riprova",
  vuotoTitolo: "Non fai ancora parte di nessun centro",
  vuotoTesto: "Unisciti con un codice invito oppure registra il tuo centro: la prova è gratuita per 30 giorni.",
  registra: "Registra il tuo centro",
  tornaApp: "Torna all'app Match Point",
};
const T = { it: IT, en: IT };
type Dizionario = typeof IT;

type MembroDb = { id: string; centro_id: string; ruolo: RuoloCentro; area_id: string | null; stato: string };
type CentroDb = { id: string; slug: string; nome: string; nome_app: string | null; citta: string | null; stato: string };
type AreaDb = { id: string; nome: string; sigla: string | null; fasce: string[] | null };
type GruppoDb = { id: string; nome: string; giorni: number[] | null; ora: string | null };

type Dati = {
  membri: MembroDb[];
  centri: Map<string, CentroDb>;
  aree: Map<string, AreaDb>;
  /** nomi dei figli (genitore) o dell'allievo stesso (account allievo), per membro */
  allievi: Map<string, { id: string; nome: string }[]>;
  gruppiAllievo: Map<string, GruppoDb[]>;
  gruppiOggi: Map<string, string[]>;
  segnalazioni: Map<string, number>;
};

const sostituisci = (txt: string, v: Record<string, string | number>) => txt.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const oggiLocale = () => new Date().toLocaleDateString("sv-SE");

/** Carica tutto quello che serve alle righe. Le parti accessorie (conteggi, orari) non bloccano mai l'elenco. */
async function caricaDati(): Promise<Dati | "accesso"> {
  const sb = supabaseBrowser();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return "accesso";
  const { data: m, error } = await sb.from("membri").select("id, centro_id, ruolo, area_id, stato").eq("user_id", u.user.id);
  if (error) throw error;
  const membri = (m ?? []) as MembroDb[];
  const dati: Dati = { membri, centri: new Map(), aree: new Map(), allievi: new Map(), gruppiAllievo: new Map(), gruppiOggi: new Map(), segnalazioni: new Map() };
  if (!membri.length) return dati;

  const idCentri = [...new Set(membri.map((x) => x.centro_id))];
  const { data: c, error: errC } = await sb.from("centri").select("id, slug, nome, nome_app, citta, stato").in("id", idCentri);
  if (errC) throw errC;
  (c as CentroDb[]).forEach((x) => dati.centri.set(x.id, x));

  const oggi = oggiLocale();
  const accessorio = async (f: () => Promise<void>) => { try { await f(); } catch { /* dato facoltativo: la riga resta senza questa riga di dettaglio */ } };

  await Promise.all([
    // aree dei responsabili
    accessorio(async () => {
      const ids = [...new Set(membri.map((x) => x.area_id).filter((x): x is string => !!x))];
      if (!ids.length) return;
      const { data } = await sb.from("aree").select("id, nome, sigla, fasce").in("id", ids);
      (data as AreaDb[] | null)?.forEach((a) => dati.aree.set(a.id, a));
    }),
    // figli dei genitori e allievo dell'account allievo, poi i loro gruppi e la prossima lezione
    accessorio(async () => {
      const genitori = membri.filter((x) => x.ruolo === "genitore").map((x) => x.id);
      const allievi = membri.filter((x) => x.ruolo === "allievo").map((x) => x.id);
      const perAllievo = new Map<string, string[]>(); // id allievo → membri che lo vedono
      const nomi = new Map<string, string>();
      if (genitori.length) {
        const { data: fam } = await sb.from("allievi_famiglie").select("allievo_id, membro_id").in("membro_id", genitori);
        const idA = [...new Set((fam ?? []).map((f: { allievo_id: string }) => f.allievo_id))];
        if (idA.length) {
          const { data: al } = await sb.from("allievi").select("id, nome").in("id", idA);
          (al ?? []).forEach((a: { id: string; nome: string }) => nomi.set(a.id, a.nome));
        }
        (fam ?? []).forEach((f: { allievo_id: string; membro_id: string }) => {
          const nome = nomi.get(f.allievo_id);
          if (!nome) return;
          dati.allievi.set(f.membro_id, [...(dati.allievi.get(f.membro_id) ?? []), { id: f.allievo_id, nome }]);
          perAllievo.set(f.allievo_id, [...(perAllievo.get(f.allievo_id) ?? []), f.membro_id]);
        });
      }
      if (allievi.length) {
        const { data: al } = await sb.from("allievi").select("id, nome, membro_id").in("membro_id", allievi);
        (al ?? []).forEach((a: { id: string; nome: string; membro_id: string }) => {
          dati.allievi.set(a.membro_id, [...(dati.allievi.get(a.membro_id) ?? []), { id: a.id, nome: a.nome }]);
          perAllievo.set(a.id, [...(perAllievo.get(a.id) ?? []), a.membro_id]);
        });
      }
      const idAllievi = [...perAllievo.keys()];
      if (!idAllievi.length) return;
      // solo le iscrizioni in corso: la storia dei gruppi passati non serve a questa schermata
      const { data: isc } = await sb.from("iscrizioni").select("allievo_id, gruppo_id").in("allievo_id", idAllievi).or(`al.is.null,al.gte.${oggi}`);
      const attive = (isc ?? []) as { allievo_id: string; gruppo_id: string }[];
      const idG = [...new Set(attive.map((i) => i.gruppo_id))];
      if (!idG.length) return;
      const { data: gr } = await sb.from("gruppi").select("id, nome, giorni, ora").in("id", idG);
      const perId = new Map((gr as GruppoDb[] | null)?.map((g) => [g.id, g]) ?? []);
      attive.forEach((i) => {
        const g = perId.get(i.gruppo_id);
        if (!g) return;
        (perAllievo.get(i.allievo_id) ?? []).forEach((mid) => dati.gruppiAllievo.set(mid, [...(dati.gruppiAllievo.get(mid) ?? []), g]));
      });
    }),
    // lezioni di oggi dei maestri
    accessorio(async () => {
      const maestri = membri.filter((x) => x.ruolo === "maestro").map((x) => x.id);
      if (!maestri.length) return;
      const { data: lez } = await sb.from("lezioni").select("maestro_id, gruppo_id").in("maestro_id", maestri).eq("data", oggi);
      const idG = [...new Set((lez ?? []).map((l: { gruppo_id: string }) => l.gruppo_id))];
      const nomiG = new Map<string, string>();
      if (idG.length) {
        const { data: gr } = await sb.from("gruppi").select("id, nome").in("id", idG);
        (gr ?? []).forEach((g: { id: string; nome: string }) => nomiG.set(g.id, g.nome));
      }
      (lez ?? []).forEach((l: { maestro_id: string; gruppo_id: string }) =>
        dati.gruppiOggi.set(l.maestro_id, [...(dati.gruppiOggi.get(l.maestro_id) ?? []), nomiG.get(l.gruppo_id) ?? ""]));
    }),
    // segnalazioni nuove per direttore e titolare (le vedono solo loro: lo decide l'RLS)
    accessorio(async () => {
      // un conteggio per centro, non per ruolo: chi è sia titolare sia direttore nello stesso centro non lo fa due volte
      const direzione = membri.filter((x) => x.ruolo === "dt" || x.ruolo === "titolare");
      const perCentro = new Map<string, number>();
      await Promise.all(
        [...new Set(direzione.map((x) => x.centro_id))].map(async (centroId) => {
          const { count } = await sb.from("segnalazioni").select("id", { count: "exact", head: true }).eq("centro_id", centroId).eq("stato", "nuova");
          perCentro.set(centroId, count ?? 0);
        }),
      );
      direzione.forEach((x) => dati.segnalazioni.set(x.id, perCentro.get(x.centro_id) ?? 0));
    }),
  ]);
  return dati;
}

type Voce = { id: string; slug: string; ruolo: RuoloCentro; titolo: string; riga2: string; riga3: string; entra: string; blocco: string | null };

/** Trasforma i dati grezzi nelle righe del mockup. */
function costruisciVoci(d: Dati, t: Dizionario): Voce[] {
  const ordineRuolo: RuoloCentro[] = ["titolare", "dt", "responsabile_area", "maestro", "segreteria", "genitore", "allievo"];
  const ordinati = [...d.membri].sort((a, b) => {
    const ca = d.centri.get(a.centro_id)?.nome ?? "";
    const cb = d.centri.get(b.centro_id)?.nome ?? "";
    return ca.localeCompare(cb, "it") || ordineRuolo.indexOf(a.ruolo) - ordineRuolo.indexOf(b.ruolo);
  });
  return ordinati.flatMap((m): Voce[] => {
    const c = d.centri.get(m.centro_id);
    if (!c) return [];
    const breve = c.nome_app || c.nome;
    const figli = (d.allievi.get(m.id) ?? []).map((a) => a.nome);
    const gruppi = d.gruppiAllievo.get(m.id) ?? [];
    let nomeRuolo = t[m.ruolo];
    let entra = t[m.ruolo];
    if (m.ruolo === "genitore" && figli.length) {
      nomeRuolo = sostituisci(t.genitoreDi, { n: elencoNomi(figli, t.e) });
      entra = sostituisci(t.genitoreDiMin, { n: elencoNomi(figli, t.e) });
    }
    if (m.ruolo === "responsabile_area") {
      const a = m.area_id ? d.aree.get(m.area_id) : undefined;
      const sigla = a?.sigla || a?.nome;
      if (sigla) { nomeRuolo = `${t.responsabile_area} ${sigla}`; entra = nomeRuolo; }
    }
    let riga2 = c.nome + (c.citta ? ` · ${c.citta}` : "");
    let riga3 = "";
    if (m.ruolo === "responsabile_area") {
      const a = m.area_id ? d.aree.get(m.area_id) : undefined;
      const f = a?.fasce ?? [];
      riga2 = `${c.nome} · ` + sostituisci(t.area, { a: f.length > 1 ? `${f[0]}-${f[f.length - 1]}` : f[0] ?? a?.nome ?? "" });
    } else if (m.ruolo === "maestro") {
      const oggi = d.gruppiOggi.get(m.id) ?? [];
      if (oggi.length) {
        const brevi = [...new Set(oggi.map((n) => n.split(" ")[0]).filter(Boolean))];
        riga3 = (oggi.length === 1 ? t.lezioniOggiUna : sostituisci(t.lezioniOggi, { n: oggi.length })) + (brevi.length ? ` · ${elencoNomi(brevi, t.e)}` : "");
      } else riga3 = t.nessunaOggi;
    } else if (m.ruolo === "genitore" || m.ruolo === "allievo") {
      if (gruppi[0]) riga2 = `${c.nome} · ${gruppi[0].nome}`;
      // la lezione più vicina tra tutti i gruppi del profilo
      const prox = gruppi
        .map((g) => prossimaLezione(g.giorni, g.ora))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .sort((a, b) => a.giorni - b.giorni || a.ora.localeCompare(b.ora))[0];
      if (prox) {
        const quando = prox.giorni === 0 ? t.oggi : prox.giorni === 1 ? t.domani : prox.giorno.toLocaleDateString("it-IT", { weekday: "long" });
        riga3 = sostituisci(t.prossima, { quando: `${quando} ${prox.ora}` });
      }
    } else if (m.ruolo === "dt" || m.ruolo === "titolare") {
      const n = d.segnalazioni.get(m.id) ?? 0;
      if (n > 0) riga3 = n === 1 ? t.segnalazioneUna : sostituisci(t.segnalazioni, { n });
    }
    const blocco = c.stato === "sospeso" ? t.centroSospeso : m.stato === "sospeso" ? t.sospeso : null;
    return [{ id: m.id, slug: c.slug, ruolo: m.ruolo, titolo: `${nomeRuolo} · ${breve}`, riga2, riga3, entra, blocco }];
  });
}

export default function Profili() {
  const t = useT(T);
  const router = useRouter();
  const [dati, setDati] = useState<Dati | null>(null);
  const [errore, setErrore] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErrore(false);
    caricaDati()
      .then((r) => {
        if (!vivo) return;
        // senza sessione il middleware avrebbe già rimandato all'accesso: qui è solo una rete di sicurezza
        if (r === "accesso") return router.replace("/app/benvenuto?dopo=/app/profili");
        setDati(r);
      })
      .catch(() => { if (vivo) setErrore(true); });
    return () => { vivo = false; };
  }, [giro, router]);

  const voci = useMemo(() => (dati ? costruisciVoci(dati, t) : []), [dati, t]);

  // parte dall'ultimo profilo usato; se non c'è, dal primo che si può aprire
  useEffect(() => {
    if (!voci.length || sel) return;
    const ultimo = leggiUltimo();
    const scelta = voci.find((v) => v.id === ultimo?.membro_id && !v.blocco) ?? voci.find((v) => !v.blocco);
    if (scelta) setSel(scelta.id);
  }, [voci, sel]);

  const corrente = voci.find((v) => v.id === sel && !v.blocco) ?? null;
  const entra = () => {
    if (!corrente) return;
    salvaScelta(corrente.slug, corrente.id, corrente.ruolo);
    router.push(percorsoRuolo(corrente.slug, corrente.ruolo));
  };

  const nCentri = new Set(voci.map((v) => v.slug)).size;
  const intro = voci.length === 1
    ? t.introUno
    : nCentri === 1
      ? sostituisci(t.introPiuUno, { p: voci.length })
      : sostituisci(t.introPiu, { p: voci.length, c: nCentri, centri: nCentri === 1 ? t.centroS : t.centroP });

  return (
    <Schermo>
      <div className={s.prato} aria-hidden="true">
        <svg viewBox="0 0 393 250" preserveAspectRatio="xMidYMid slice"><path d="M-20 215 L420 150 M70 260 L350 -20" stroke="#fff" strokeWidth="3" opacity=".45" fill="none" /><circle cx="322" cy="86" r="30" fill="#D8F34A" /><path d="M300 68c12 10 12 28 0 38M344 68c-12 10-12 28 0 38" fill="none" stroke="#fff" strokeWidth="3" /></svg>
        <div className={s.pratoVelo} />
      </div>
      <div className={`${s.q} ${s.alto}`}>
        <div className={s.marchio}>{t.marchio}</div>
        <div className={s.saluto}>
          <h1 className={s.big}>{t.titolo}</h1>
          {voci.length > 0 && <p className={s.intro}>{intro}</p>}
        </div>

        {!dati && !errore && <p className={s.intro} role="status">{t.caricamento}</p>}
        {errore && (
          <div className={s.errore} role="alert">
            {t.errore}{" "}
            <button type="button" className={s.testoLink} style={{ background: "none", border: 0, color: "#D8F34A", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setGiro((g) => g + 1)}>{t.riprova}</button>
          </div>
        )}

        {dati && voci.length === 0 && (
          <div className={`${s.card} ${s.pad}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className={s.ruoloNome}>{t.vuotoTitolo}</div>
            <div className={s.v}>{t.vuotoTesto}</div>
            <Link href="/app/registra-centro" className={s.testoLink} style={{ textAlign: "left" }}>{t.registra}</Link>
          </div>
        )}

        <div role="radiogroup" aria-label={t.titolo} style={{ display: "contents" }}>
          {voci.map((v) => {
            const stile = STILE_RUOLO[v.ruolo];
            const Icona = stile.icona;
            const on = v.id === sel && !v.blocco;
            return (
              <button key={v.id} type="button" role="radio" aria-checked={on} disabled={!!v.blocco}
                className={on ? `${s.li} ${s.on}` : s.li} onClick={() => setSel(v.id)} aria-label={`${v.titolo}. ${v.riga2}`}>
                <span className={s.tondo} style={{ background: stile.colore }}><Icona size={22} /></span>
                <span className={s.grow}>
                  <span className={s.t}>{v.titolo}</span>
                  <span className={s.s}>{v.riga2}</span>
                  {v.riga3 && <span className={`${s.s} ${s.stretto}`}>{v.riga3}</span>}
                </span>
                {v.blocco ? <span className={s.tag}>{v.blocco}</span> : <span className={on ? `${s.radio} ${s.on}` : s.radio}><IcoSpunta /></span>}
              </button>
            );
          })}
        </div>

        {dati && (
          <Link href="/app/unisciti" className={`${s.li} ${s.liNuovo}`}>
            <span className={s.ic}><IcoPiu /></span>
            <span className={s.grow}><span className={s.t}>{t.unisciti}</span><span className={s.s}>{t.uniscitiSotto}</span></span>
            <IcoFrecciaAvanti />
          </Link>
        )}

        {voci.length > 0 && <div className={s.note}><IcoOrologio />{" "}<span>{t.nota}</span></div>}

        {voci.length > 0 ? (
          <button type="button" className={`${s.btn} ${s.spingi}`} onClick={entra} disabled={!corrente}>
            {corrente ? sostituisci(t.entra, { r: corrente.entra }) : t.entraNessuno}
          </button>
        ) : (
          dati && <Link href="/app" className={`${s.testoLink} ${s.spingi}`}>{t.tornaApp}</Link>
        )}
      </div>
    </Schermo>
  );
}
