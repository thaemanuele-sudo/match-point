"use client";
/*
 * Anteprima di come le famiglie vedono l'app del centro: nome, logo e colori.
 * Usa le stesse variabili CSS dell'app vera (--brand e --brand-ink), così quello che si vede qui è quello che arriva.
 */
export function AnteprimaTelefono({ nomeApp, logoUrl, colore, ink }: { nomeApp: string; logoUrl: string | null; colore: string; ink: string }) {
  const sigla = (nomeApp || "?").trim().slice(0, 2).toUpperCase();
  return (
    <div className="db-tel" style={{ ["--brand" as string]: colore, ["--brand-ink" as string]: ink }} role="img" aria-label={`Anteprima dell'app ${nomeApp}`}>
      <div className="db-tel-schermo">
        <div className="db-tel-testa">
          <span className="db-tel-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoUrl ? <img src={logoUrl} alt="" /> : <b>{sigla}</b>}
          </span>
          <span className="db-tel-nome">{nomeApp || "Nome dell'app"}</span>
        </div>
        <div className="db-tel-corpo">
          <span className="db-tel-ciao">Oggi</span>
          <span className="db-tel-titolo">U12 Intermedio</span>
          <div className="db-tel-card">
            <span className="db-tel-riga"><i /><i style={{ width: "60%" }} /></span>
            <span className="db-tel-barra"><span /></span>
          </div>
          <span className="db-tel-btn">Vedi il piano</span>
          <div className="db-tel-card piccola"><span className="db-tel-riga"><i style={{ width: "80%" }} /></span></div>
        </div>
        <div className="db-tel-tab">
          {[0, 1, 2, 3].map((i) => <span key={i} className={i === 0 ? "on" : ""}><i /></span>)}
        </div>
      </div>
    </div>
  );
}
