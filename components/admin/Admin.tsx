"use client";
/*
 * Pannello Match Point (solo italiano). Una pagina, sezioni a schede nella barra come la dashboard di Archimede.
 * Il controllo vero dell'admin è nel database (funzioni admin_* e policy sulle tabelle): qui si legge
 * profiles.ruolo solo per decidere cosa mostrare.
 */
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AdminCtx, I, Ico, Logo } from "./comuni";
import { Accesso } from "./Accesso";
import { Utenti } from "./Utenti";
import { Centri } from "./Centri";
import { Schemi } from "./Schemi";
import { Atletica } from "./Atletica";
import { Tecnica } from "./Tecnica";
import { Impostazioni } from "./Impostazioni";
import { Motore } from "./Motore";

const TEMA_KEY = "matchpoint-admin-tema";
const SCHEDE = [
  { id: "utenti", nome: "Utenti e costi AI" },
  { id: "centri", nome: "Centri" },
  { id: "schemi", nome: "Schemi di gioco" },
  { id: "atletica", nome: "Atletica" },
  { id: "tecnica", nome: "Tecnica" },
  { id: "motore", nome: "Motore" },
  { id: "impostazioni", nome: "Impostazioni" },
] as const;
type Scheda = (typeof SCHEDE)[number]["id"];
type Vista = "caricamento" | "accesso" | "negato" | "pannello";

export function Admin() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [vista, setVista] = useState<Vista>("caricamento");
  const [tema, setTema] = useState<"light" | "dark">("dark");
  const [scheda, setScheda] = useState<Scheda>("utenti");
  const [avviso, setAvviso] = useState<string | null>(null);

  // tema scuro predefinito; se l'admin ne ha scelto uno lo ricordiamo
  useEffect(() => {
    try { const t = localStorage.getItem(TEMA_KEY); if (t === "light" || t === "dark") setTema(t); } catch { /* archivio non disponibile */ }
    try { const s = localStorage.getItem(TEMA_KEY + "-scheda") as Scheda | null; if (s && SCHEDE.some((x) => x.id === s)) setScheda(s); } catch { /* idem */ }
  }, []);
  const cambiaTema = () => {
    const n = tema === "dark" ? "light" : "dark";
    setTema(n);
    try { localStorage.setItem(TEMA_KEY, n); } catch { /* resta solo per questa visita */ }
  };
  const vai = (s: Scheda) => {
    setScheda(s);
    try { localStorage.setItem(TEMA_KEY + "-scheda", s); } catch { /* idem */ }
    document.querySelector(".db")?.scrollTo({ top: 0 });
  };

  const verifica = async () => {
    const { data } = await sb.auth.getUser();
    if (!data.user) return setVista("accesso");
    const { data: p } = await sb.from("profiles").select("ruolo").eq("id", data.user.id).maybeSingle();
    setVista(p?.ruolo === "admin" ? "pannello" : "negato");
  };
  useEffect(() => {
    void verifica();
    const { data: sub } = sb.auth.onAuthStateChange((ev: string) => { if (ev === "SIGNED_OUT") setVista("accesso"); });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  useEffect(() => {
    if (!avviso) return;
    const t = window.setTimeout(() => setAvviso(null), 4000);
    return () => window.clearTimeout(t);
  }, [avviso]);

  const esci = async () => { await sb.auth.signOut(); setVista("accesso"); };
  const btnTema = (
    <button type="button" className="db-icona-btn" onClick={cambiaTema} aria-label={tema === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}>
      <Ico d={tema === "dark" ? I.sole : I.luna} size={20} />
    </button>
  );

  let corpo: React.ReactNode;
  if (vista === "caricamento") corpo = <div className="db-caric"><span className="db-spin" aria-label="Caricamento" /></div>;
  else if (vista === "accesso") corpo = <><div style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>{btnTema}</div><Accesso sb={sb} onEntrato={() => void verifica()} /></>;
  else if (vista === "negato")
    corpo = (
      <div className="db-accesso"><div className="db-foglio">
        <Logo size={36} />
        <h1>Accesso negato</h1>
        <p>Questo account non è un amministratore di Match Point.</p>
        <button type="button" className="db-btn" onClick={esci}>Esci</button>
      </div></div>
    );
  else
    corpo = (
      <AdminCtx.Provider value={{ sb, avvisa: setAvviso }}>
        <nav className="db-nav" aria-label="Barra del pannello">
          <div className="db-nav-in">
            <span className="db-marchio"><Logo /><span className="testo">Match Point Admin</span></span>
            <div className="db-schede db-nav-schede" role="group" aria-label="Sezioni">
              {SCHEDE.map((s) => <button key={s.id} type="button" aria-pressed={scheda === s.id} onClick={() => vai(s.id)}>{s.nome}</button>)}
            </div>
            {btnTema}
            <button type="button" className="db-icona-btn" onClick={esci} aria-label="Esci"><Ico d={I.esci} size={20} /></button>
          </div>
        </nav>
        <main className="db-main">
          {scheda === "utenti" && <Utenti />}
          {scheda === "centri" && <Centri />}
          {scheda === "schemi" && <Schemi />}
          {scheda === "atletica" && <Atletica />}
          {scheda === "tecnica" && <Tecnica />}
          {scheda === "motore" && <Motore />}
          {scheda === "impostazioni" && <Impostazioni />}
        </main>
        {avviso && <div className="db-avviso" role="status">{avviso}</div>}
      </AdminCtx.Provider>
    );

  return <div className="db" data-tema={tema}>{corpo}</div>;
}
