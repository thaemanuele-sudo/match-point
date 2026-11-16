"use client";
// M3 · I miei allievi: lista con errore principale e progresso, filtri "in ritardo" e "assenze ripetute".
import Link from "next/link";
import { useMemo, useState } from "react";
import { SchermoCentro } from "@/components/centro/Schermo";
import { Avatar, Chip, Chips, Ico, Tile, Vuoto } from "@/components/centro/ui";
import { useCentro } from "@/lib/centro/contesto";
import { rotta } from "@/lib/centro/rotte";
import { useT } from "@/lib/i18n/lingua";
import { useMaestroDati } from "./dati";
import { SegGruppiAllievi, StatoPagina, stileIconaTonda } from "./piccoli";
import { useStatAllievi, type StatAllievo } from "./statistiche";
import { coloreVoto, fmt, nomeBreve, norm, type RAllievo } from "./util";

const IT = {
  sopra: "{nome} · {centro}", titolo: "Allievi", cerca: "Cerca un allievo", cercaPlaceholder: "Nome o cognome", allievi: "allievi", inRitardo: "in ritardo", assenzeRipetute: "assenze ripetute",
  tutti: "Tutti", fRitardo: "In ritardo", fAssenze: "Assenze ripetute", tagRitardo: "In ritardo", tagAssenze: "Assenze", aria: "Scheda di {nome}", vsPrec: "vs test prec.",
  nessunVoto: "Ancora nessun voto", vuoto: "Nessun allievo", vuotoTesto: "Qui compaiono gli allievi dei tuoi gruppi.", vuotoFiltro: "Nessun allievo con questo filtro.", chiudiCerca: "Chiudi la ricerca",
};
const T = { it: IT, en: { ...IT } };
type Filtro = "tutti" | "ritardo" | "assenze";

export function Allievi() {
  const t = useT(T);
  const { centro, membroAttivo: ma } = useCentro();
  const r = rotta(centro.slug).maestro;
  const { dati, errore, ricarica, caricamento } = useMaestroDati();
  const { stat, errore: errStat } = useStatAllievi(dati);
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [cerca, setCerca] = useState<string | null>(null);

  const righe = useMemo(() => {
    if (!dati || !stat) return [];
    const gruppoDi = new Map<string, string>();
    for (const g of dati.gruppi) for (const a of dati.iscritti.get(g.id) ?? []) if (!gruppoDi.has(a.id)) gruppoDi.set(a.id, g.fascia ?? g.nome);
    return [...dati.allievi.values()]
      .map((a) => ({ a, g: gruppoDi.get(a.id) ?? "", s: stat.get(a.id)! }))
      .filter((x) => x.s)
      // chi è in ritardo o ha assenze ripetute sale in cima: è lì che serve l'attenzione del maestro
      .sort((p, q) => Number(q.s.inRitardo || q.s.assenzeRipetute) - Number(p.s.inRitardo || p.s.assenzeRipetute) || (p.a.cognome ?? "").localeCompare(q.a.cognome ?? "", "it"));
  }, [dati, stat]);

  const nRitardo = righe.filter((x) => x.s.inRitardo).length;
  const nAssenze = righe.filter((x) => x.s.assenzeRipetute).length;
  const q = norm(cerca ?? "");
  const visibili = righe.filter((x) => (filtro === "tutti" || (filtro === "ritardo" ? x.s.inRitardo : x.s.assenzeRipetute)) && (!q || norm(`${x.a.nome} ${x.a.cognome ?? ""}`).includes(q)));
  const stato = StatoPagina({ caricamento: caricamento || (!stat && !errStat), errore: errore ?? errStat, onRiprova: ricarica });

  const lente = (
    <button type="button" className="icon" style={stileIconaTonda} aria-label={cerca === null ? t.cerca : t.chiudiCerca} onClick={() => setCerca(cerca === null ? "" : null)}>
      <Ico nome={cerca === null ? "search" : "x"} size={20} />
    </button>
  );
  return (
    <SchermoCentro ruolo="maestro" tab="allievi" sopra={fmt(t.sopra, { nome: [ma?.nome, ma?.cognome].filter(Boolean).join(" "), centro: centro.nome })} titolo={t.titolo} azioni={lente}>
      {stato ?? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SegGruppiAllievi slug={centro.slug} attivo="allievi" nGruppi={dati?.gruppi.length ?? 0} nAllievi={righe.length} />
          {cerca !== null && <input className="mc-input" autoFocus type="search" value={cerca} placeholder={t.cercaPlaceholder} aria-label={t.cerca} onChange={(e) => setCerca(e.target.value)} />}
          <div className="g3">
            <Tile valore={righe.length} etichetta={t.allievi} />
            <Tile valore={nRitardo} etichetta={t.inRitardo} colore="#FF9F43" />
            <Tile valore={nAssenze} etichetta={t.assenzeRipetute} colore="#FF5A5F" />
          </div>
          <Chips>
            <Chip on={filtro === "tutti"} onClick={() => setFiltro("tutti")}>{t.tutti}</Chip>
            <Chip on={filtro === "ritardo"} onClick={() => setFiltro("ritardo")}>{t.fRitardo}</Chip>
            <Chip on={filtro === "assenze"} onClick={() => setFiltro("assenze")}>{t.fAssenze}</Chip>
          </Chips>
          {visibili.length === 0 && <Vuoto titolo={righe.length ? t.vuotoFiltro : t.vuoto} testo={righe.length ? undefined : t.vuotoTesto} icona="users" />}
          {visibili.map(({ a, g, s }) => <RigaAllievo key={a.id} a={a} gruppo={g} s={s} href={r.allievo(a.id)} t={t} />)}
        </div>
      )}
    </SchermoCentro>
  );
}

function RigaAllievo({ a, gruppo, s, href, t }: { a: RAllievo; gruppo: string; s: StatAllievo; href: string; t: Record<string, string> }) {
  const tag = s.inRitardo ? { testo: t.tagRitardo, sfondo: "#3A2A12", colore: "#FF9F43" } : s.assenzeRipetute ? { testo: t.tagAssenze, sfondo: "#3A1517", colore: "#FF5A5F" } : null;
  const errore = s.peggiore ? `${s.peggiore.colpo}: ${s.peggiore.competenza}` : t.nessunVoto;
  return (
    <Link href={href} className="li" style={{ padding: "9px 12px" }} aria-label={fmt(t.aria, { nome: nomeBreve(a) })}>
      <Avatar nome={a.nome} cognome={a.cognome} size={40} />
      <span className="grow">
        <span className="t" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14.5 }}>
          {nomeBreve(a)}<span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{gruppo}</span>
          {tag && <span className="tag" style={{ background: tag.sfondo, color: tag.colore, fontSize: 10.5 }}>{tag.testo}</span>}
        </span>
        <span className="s" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{errore}</span>
      </span>
      {s.pct !== null && (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
          <span className="disp" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: coloreVoto(s.pct) }}>{s.pct}%</span>
          {s.delta !== null && <span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>{s.delta > 0 ? `+${s.delta}` : s.delta} {t.vsPrec}</span>}
        </span>
      )}
    </Link>
  );
}
