"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useMemo, useState } from "react";
import { useLang, useT } from "@/lib/i18n/lingua";
import type { Colpo } from "@/lib/types";
import { NOME_COLPO } from "./etichette";
import { useVideoTecnica } from "./useVideoTecnica";
import { ROTTE } from "@/lib/rotte";
import s from "./Tecnica.module.css";
import { SVG } from "./Tecnica.svg";

const T = {
  "it": {
    "errors_correct_movement_dr": "Errori, movimento corretto, esercizi",
    "technique": "Tecnica",
    "n_6_strokes": "6 colpi",
    "search": "Cerca",
    "video_unit": "video",
    "nessun_colpo": "Nessun colpo trovato",
    "search_a_stroke_or_error": "Cerca un colpo o un errore",
    "n_24_videos": "24 video",
    "serve": "Servizio",
    "flat_slice_kick": "Piatto · Slice · Kick",
    "n_31_videos": "31 video",
    "forehand": "Diritto",
    "straight_crosscourt_down_t": "Dritto · Incrociato · Lungolinea",
    "n_27_videos": "27 video",
    "backhand": "Rovescio",
    "n_18_videos": "18 video",
    "slice": "Back",
    "n_15_videos": "15 video",
    "volley": "Volée",
    "overhead": "Smash",
    "n_12_videos": "12 video",
    "coming_soon": "In arrivo",
    "swinging_volley": "Schiaffo al volo",
    "inside_out": "Inside-out",
    "inside_in": "Inside-in",
    "drop_shot": "Palla corta"
  },
  "en": {
    "errors_correct_movement_dr": "Errors, correct movement, drills",
    "technique": "Technique",
    "n_6_strokes": "6 strokes",
    "search": "Search",
    "video_unit": "videos",
    "nessun_colpo": "No stroke found",
    "search_a_stroke_or_error": "Search a stroke or error",
    "n_24_videos": "24 videos",
    "serve": "Serve",
    "flat_slice_kick": "Flat · Slice · Kick",
    "n_31_videos": "31 videos",
    "forehand": "Forehand",
    "straight_crosscourt_down_t": "Straight · Crosscourt · Down the line",
    "n_27_videos": "27 videos",
    "backhand": "Backhand",
    "n_18_videos": "18 videos",
    "slice": "Slice",
    "n_15_videos": "15 videos",
    "volley": "Volley",
    "overhead": "Overhead",
    "n_12_videos": "12 videos",
    "coming_soon": "Coming soon",
    "swinging_volley": "Swinging volley",
    "inside_out": "Inside-out",
    "inside_in": "Inside-in",
    "drop_shot": "Drop shot"
  }
};

export function Tecnica() {
  const t = useT(T);
  const { lang } = useLang();
  const { tutti, stato } = useVideoTecnica();
  const [q, setQ] = useState("");
  const reali = stato === "pronto" && tutti.length > 0;
  // numero di video: veri se l'admin ne ha pubblicati, altrimenti i numeri del disegno
  const n = (colpo: Colpo, demo: string) => (reali ? `${tutti.filter((v) => v.colpo === colpo).length} ${t.video_unit}` : demo);
  // la ricerca guarda il nome del colpo, le varianti e, con dati veri, codici e titoli dei video
  const testi = useMemo(() => {
    const m: Partial<Record<Colpo, string>> = {};
    for (const v of tutti) m[v.colpo] = `${m[v.colpo] ?? ""} ${v.codice} ${v.titolo}`;
    return m;
  }, [tutti]);
  const ricerca = q.trim().toLowerCase();
  const ok = (colpo: Colpo, ...parti: string[]) =>
    !ricerca || [NOME_COLPO[lang][colpo], ...parti, testi[colpo] ?? ""].join(" ").toLowerCase().includes(ricerca);
  const nessuno = !!ricerca && !(["servizio", "diritto", "rovescio", "back", "volee", "smash"] as Colpo[]).some((c) => ok(c, t.flat_slice_kick, t.straight_crosscourt_down_t));
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "16px" }}><div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}><div><div className={"muted"} style={{ fontSize: "13px", fontWeight: "600" }}>{t.errors_correct_movement_dr}</div><h1 className={"disp"} style={{ margin: "0", fontSize: "44px", lineHeight: "1", fontWeight: "800", fontStyle: "italic" }}>{t.technique}</h1></div><span className={"disp"} style={{ fontSize: "15px", fontWeight: "700", color: "#D8F34A" }}>{t.n_6_strokes}</span></div><label style={{ display: "flex", alignItems: "center", gap: "10px", height: "44px", borderRadius: "14px", background: "#161618", padding: "0 14px", color: "#A1A1A6" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg><span style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden" }}>{t.search}</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search_a_stroke_or_error} style={{ flex: "1", background: "transparent", border: "0", color: "#F3F6F1", fontSize: "15px", fontFamily: "inherit", outline: "none" }} /></label>{ok("servizio", t.flat_slice_kick) && (<Link href={ROTTE.Servizio} className={[s.shot, "lawn"].join(" ")} style={{ minHeight: "118px", position: "relative", overflow: "hidden" }}><span style={{ position: "absolute", right: "0", top: "0", width: "130px", height: "120px" }}><svg width="130" height="120" viewBox="0 0 130 120" aria-hidden="true" style={{ position: "absolute", inset: "0" }} dangerouslySetInnerHTML={{ __html: SVG[0] }} /></span><span className={s.cnt} style={{ color: "#F3F6F1" }}>{n("servizio", t.n_24_videos)}</span><div><h3>{t.serve}</h3><p style={{ color: "#E8F3EC" }}>{t.flat_slice_kick}</p></div></Link>)}<div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "10px" }}>{ok("diritto", t.straight_crosscourt_down_t) && (<Link href={ROTTE.TecnicaColpo} className={s.shot} style={{ borderColor: "#D8F34A" }}><span className={s.cnt}>{n("diritto", t.n_31_videos)}</span><div><h3>{t.forehand}</h3><p>{t.straight_crosscourt_down_t}</p></div></Link>)}{ok("rovescio", t.straight_crosscourt_down_t) && (<Link href={ROTTE.Rovescio} className={s.shot}><span className={s.cnt}>{n("rovescio", t.n_27_videos)}</span><div><h3>{t.backhand}</h3><p>{t.straight_crosscourt_down_t}</p></div></Link>)}{ok("back", t.straight_crosscourt_down_t) && (<Link href={ROTTE.Back} className={s.shot}><span className={s.cnt}>{n("back", t.n_18_videos)}</span><div><h3>{t.slice}</h3><p>{t.straight_crosscourt_down_t}</p></div></Link>)}{ok("volee", t.straight_crosscourt_down_t) && (<Link href={ROTTE.Volee} className={s.shot}><span className={s.cnt}>{n("volee", t.n_15_videos)}</span><div><h3>{t.volley}</h3><p>{t.straight_crosscourt_down_t}</p></div></Link>)}</div>{ok("smash", t.straight_crosscourt_down_t) && (<Link href={ROTTE.Smash} className={s.shot} style={{ minHeight: "84px", flexDirection: "row", alignItems: "center" }}><div><h3>{t.overhead}</h3><p>{t.straight_crosscourt_down_t}</p></div><span className={s.cnt}>{n("smash", t.n_12_videos)}</span></Link>)}{nessuno && <div className={s.vuoto} role="status">{t.nessun_colpo}</div>}<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}><Link href={ROTTE.ColpiFuturi} style={{ fontSize: "13px", fontWeight: "700", textDecoration: "none" }}>{t.coming_soon}</Link><div style={{ display: "flex", gap: "6px", overflow: "hidden" }}><span className={s.chip}>{t.swinging_volley}</span><span className={s.chip}>{t.inside_out}</span><span className={s.chip}>{t.inside_in}</span><span className={s.chip}>{t.drop_shot}</span></div></div></div>
      </div>
    </Schermo>
  );
}
