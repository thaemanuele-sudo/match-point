"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/lingua";
import { comune, fmt } from "./testi";
import "./metodo.css";

const it = { ...comune };
const T = { it, en: { ...it } };

const SCHEDE = [
  { k: "lg", p: "linee-guida", t: "mat_lg" },
  { k: "lib", p: "libreria", t: "mat_lib" },
  { k: "mod", p: "modelli", t: "mat_mod" },
  { k: "prog", p: "programmi", t: "mat_prog" },
] as const;

/** Selettore dei quattro mattoni del Metodo (Linee guida, Libreria, Modelli, Programmi). */
export function BarraMattoni({ slug, attiva }: { slug: string; attiva: "lg" | "lib" | "mod" | "prog" }) {
  const t = useT(T) as Record<string, string>;
  return (
    <nav className="mm-seg" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }} aria-label={t.mattoni_aria}>
      {SCHEDE.map((s) => (
        <Link key={s.k} className={`mm-sg${s.k === attiva ? " on" : ""}`} href={`/c/${slug}/dt/metodo/${s.p}`} aria-current={s.k === attiva ? "page" : undefined}>
          {t[s.t]}
        </Link>
      ))}
    </nav>
  );
}

export function kickMattone(t: Record<string, string>, n: number, centro: string) {
  return fmt(t.kick_mattone, { n, centro });
}
