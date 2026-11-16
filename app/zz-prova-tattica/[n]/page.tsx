"use client";
// PROVA TEMPORANEA (da cancellare): mostra una schermata del gruppo tattica senza login.
import { useParams } from "next/navigation";
import { LinguaProvider } from "@/lib/i18n/lingua";
import "@/components/app/app.css";
import { Tattica } from "@/components/app/tattica/Tattica";
import { TatticaStrategia } from "@/components/app/tattica/TatticaStrategia";
import { Combinazioni } from "@/components/app/tattica/Combinazioni";
import { SchemiFascia } from "@/components/app/tattica/SchemiFascia";
import { CatalogoStrategie } from "@/components/app/tattica/CatalogoStrategie";
import { MatriceRischio } from "@/components/app/tattica/MatriceRischio";
import { RegoleMaestro } from "@/components/app/tattica/RegoleMaestro";
import { ProfiliAvversario } from "@/components/app/tattica/ProfiliAvversario";
import { TieBreak } from "@/components/app/tattica/TieBreak";
import { SchedaEta } from "@/components/app/tattica/SchedaEta";
import { PartitaLive } from "@/components/app/tattica/PartitaLive";
import { MappaColpi } from "@/components/app/tattica/MappaColpi";
import { StatSet } from "@/components/app/tattica/StatSet";
import { StatPartita } from "@/components/app/tattica/StatPartita";
import { Distribuzione } from "@/components/app/tattica/Distribuzione";
import { SchemaDettaglio } from "@/components/app/tattica/SchemaDettaglio";
const M: Record<string, JSX.Element> = { Tattica: <Tattica />, TatticaStrategia: <TatticaStrategia />, Combinazioni: <Combinazioni />, SchemiFascia: <SchemiFascia />, CatalogoStrategie: <CatalogoStrategie />, MatriceRischio: <MatriceRischio />, RegoleMaestro: <RegoleMaestro />, ProfiliAvversario: <ProfiliAvversario />, TieBreak: <TieBreak />, SchedaEta: <SchedaEta />, PartitaLive: <PartitaLive />, MappaColpi: <MappaColpi />, StatSet: <StatSet />, StatPartita: <StatPartita />, Distribuzione: <Distribuzione />, Dettaglio: <SchemaDettaglio id="esempio" /> };
export default function P() {
  const { n } = useParams<{ n: string }>();
  return <LinguaProvider><div className="mp">{M[n]}</div></LinguaProvider>;
}
