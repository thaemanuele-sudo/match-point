"use client";
import { AvvisiPagina } from "./CentroAvvisi";

/** Avviso all'area: stesso compositore di C14 e M12, ma i destinatari sono solo l'area (o suoi gruppi) del responsabile. */
export default function AreaAvviso() {
  return <AvvisiPagina modo="area" />;
}
