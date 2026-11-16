"use client";
import Link from "next/link";
import { Schermo } from "@/components/app/Schermo";
import { useT } from "@/lib/i18n/lingua";
import { ROTTE } from "@/lib/rotte";
import s from "./DaMigliorare.module.css";

const T = {
  "it": {
    "back": "Indietro",
    "today_vs_your_average": "Oggi rispetto alla tua media",
    "what_to_improve": "Cosa migliorare",
    "first_serve_points_won": "Prime di servizio vinte",
    "today": "OGGI",
    "average": "MEDIA",
    "more_serve_speed_sv_04": "Più velocità sul servizio · SV-04",
    "forehand_unforced_errors": "Errori non forzati di diritto",
    "less_variable_forehand_dr_": "Meno variabili nel diritto · DR-03",
    "coach_ai_added_both_videos": " Il Coach AI ha aggiunto entrambi i video al piano della prossima settimana."
  },
  "en": {
    "back": "Back",
    "today_vs_your_average": "Today vs. your average",
    "what_to_improve": "What to improve",
    "first_serve_points_won": "First serve points won",
    "today": "TODAY",
    "average": "AVERAGE",
    "more_serve_speed_sv_04": "More serve speed · SV-04",
    "forehand_unforced_errors": "Forehand unforced errors",
    "less_variable_forehand_dr_": "Less variable forehand · DR-03",
    "coach_ai_added_both_videos": " Coach AI added both videos to next week's plan."
  }
};

export function DaMigliorare() {
  const t = useT(T);
  return (
    <Schermo tab="tecnica">
      <div className={s.r}>
        <div className={s.scr} style={{ gap: "12px" }}><header className={s.hdr}><Link href={ROTTE.StatPartita} className={s.icon} aria-label={t.back}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></Link><div className={s.grow}><div className={s.kick}>{t.today_vs_your_average}</div><h1 className={s.h1}>{t.what_to_improve}</h1></div></header><div className={[s.card, s.pad].join(" ")} style={{ display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ fontWeight: "800" }}>{t.first_serve_points_won}</div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className={s.k} style={{ width: "52px" }}>{t.today}</span><div className={[s.grow, s.bar].join(" ")} style={{ height: "22px", borderRadius: "7px" }}><i style={{ width: "54%", background: "#FF5A5F", borderRadius: "7px" }}></i></div><span className={"disp"} style={{ fontWeight: "700", width: "38px", textAlign: "right" }}>54%</span></div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className={s.k} style={{ width: "52px" }}>{t.average}</span><div className={[s.grow, s.bar].join(" ")} style={{ height: "22px", borderRadius: "7px" }}><i style={{ width: "79%", background: "#4A4A4E", borderRadius: "7px" }}></i></div><span className={"disp"} style={{ fontWeight: "700", width: "38px", textAlign: "right" }}>79%</span></div><Link href={ROTTE.TecnicaColpo} style={{ display: "flex", gap: "10px", alignItems: "center", textDecoration: "none", color: "#F3F6F1", marginTop: "2px" }}><span className={"lawn"} style={{ width: "74px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></span><span><span style={{ display: "block", fontWeight: "700", fontSize: "14px" }}>{t.more_serve_speed_sv_04}</span><span className={"muted"} style={{ fontSize: "12px" }}>3:54</span></span></Link></div><div className={[s.card, s.pad].join(" ")} style={{ display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ fontWeight: "800" }}>{t.forehand_unforced_errors}</div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className={s.k} style={{ width: "52px" }}>{t.today}</span><div className={[s.grow, s.bar].join(" ")} style={{ height: "22px", borderRadius: "7px" }}><i style={{ width: "22%", background: "#FF5A5F", borderRadius: "7px" }}></i></div><span className={"disp"} style={{ fontWeight: "700", width: "38px", textAlign: "right" }}>22%</span></div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span className={s.k} style={{ width: "52px" }}>{t.average}</span><div className={[s.grow, s.bar].join(" ")} style={{ height: "22px", borderRadius: "7px" }}><i style={{ width: "16%", background: "#4A4A4E", borderRadius: "7px" }}></i></div><span className={"disp"} style={{ fontWeight: "700", width: "38px", textAlign: "right" }}>16%</span></div><Link href={ROTTE.TecnicaColpo} style={{ display: "flex", gap: "10px", alignItems: "center", textDecoration: "none", color: "#F3F6F1", marginTop: "2px" }}><span className={"lawn"} style={{ width: "74px", height: "48px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></span><span><span style={{ display: "block", fontWeight: "700", fontSize: "14px" }}>{t.less_variable_forehand_dr_}</span><span className={"muted"} style={{ fontSize: "12px" }}>3:30</span></span></Link></div><div className={s.note}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"></path></svg>{t.coach_ai_added_both_videos}</div></div>
      </div>
    </Schermo>
  );
}
