"use client";
/*
 * Riquadro "I miei centri" per la home dell'app (/app): compare solo se l'utente ha almeno un profilo in un centro,
 * così chi usa Match Point da solo non vede niente di diverso. Porta a /app/profili (P1).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/lingua";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IcoFrecciaAvanti, IcoGruppoCentri } from "./icone";
import s from "./accesso.module.css";

const IT = {
  titolo: "I miei centri",
  uno: "1 profilo in un centro",
  piu: "{n} profili nei tuoi centri",
  aria: "Apri i miei centri e scegli il profilo",
};
const T = { it: IT, en: IT };

export function MieiCentri() {
  const t = useT(T);
  const [n, setN] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const sb = supabaseBrowser();
        const { data: u } = await sb.auth.getUser();
        if (!u.user) return;
        // si contano solo i profili non sospesi; se le tabelle dei centri non rispondono il riquadro resta nascosto
        const { count, error } = await sb.from("membri").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).neq("stato", "sospeso");
        if (vivo && !error) setN(count ?? 0);
      } catch { /* niente riquadro: l'app funziona come prima */ }
    })();
    return () => { vivo = false; };
  }, []);

  if (n < 1) return null;
  return (
    <div className={s.mieiCentri}>
      <Link href="/app/profili" className={s.mieiCentriLink} aria-label={t.aria}>
        <span className={s.ic}><IcoGruppoCentri size={20} /></span>
        <span className={s.grow}>
          <span className={s.t}>{t.titolo}</span>
          <span className={s.s}>{n === 1 ? t.uno : t.piu.replace("{n}", String(n))}</span>
        </span>
        <IcoFrecciaAvanti />
      </Link>
    </div>
  );
}
