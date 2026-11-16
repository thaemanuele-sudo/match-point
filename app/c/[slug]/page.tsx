"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCentro } from "@/lib/centro/contesto";
import { homeRuolo, ruoloBarra, type RuoloBarra } from "@/components/centro/barre";
import { ROTTE_APP } from "@/lib/centro/rotte";
import { Btn, Caricamento, Vuoto } from "@/components/centro/ui";
import { useT } from "@/lib/i18n/lingua";

const T = {
  it: { titolo: "Non fai parte di questo centro", testo: "Chiedi un codice invito al centro e usalo qui sotto.", unisciti: "Unisciti con un codice" },
  en: { titolo: "Non fai parte di questo centro", testo: "Chiedi un codice invito al centro e usalo qui sotto.", unisciti: "Unisciti con un codice" },
};
const VALIDI: RuoloBarra[] = ["dt", "area", "maestro", "genitore", "allievo"];

/** /c/[slug]: manda al ruolo giusto. Più ruoli → scelta in /app/profili. `?ruolo=maestro` forza un ruolo tra i propri. */
export default function Page() {
  const t = useT(T);
  const router = useRouter();
  const { centro, miei, vistaCome, eAdmin } = useCentro();
  const [vuoto, setVuoto] = useState(false);

  useEffect(() => {
    const disponibili = [...new Set((vistaCome ? [vistaCome] : miei).map((m) => ruoloBarra(m.ruolo)))];
    if (eAdmin && !vistaCome && disponibili.length === 0) disponibili.push("dt"); // super admin non membro: dashboard
    if (disponibili.length === 0) { setVuoto(true); return; }
    const richiesto = new URLSearchParams(window.location.search).get("ruolo") as RuoloBarra | null;
    const scelto = richiesto && VALIDI.includes(richiesto) && disponibili.includes(richiesto) ? richiesto : disponibili.length === 1 ? disponibili[0] : null;
    if (scelto) router.replace(homeRuolo(centro.slug, scelto));
    else router.replace(`${ROTTE_APP.profili}?centro=${encodeURIComponent(centro.slug)}`);
  }, [centro.slug, miei, vistaCome, eAdmin, router]);

  if (!vuoto) return <div style={{ padding: 18 }}><Caricamento righe={2} /></div>;
  return (
    <div className="mc-schermo-pieno">
      <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <Vuoto titolo={t.titolo} testo={t.testo} icona="lock" />
        <Btn href={ROTTE_APP.unisciti()}>{t.unisciti}</Btn>
      </div>
    </div>
  );
}
