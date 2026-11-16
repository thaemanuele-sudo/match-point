// Marchio del centro: colori e logo. Usato sia dal server (metadata, manifest) sia dal browser.
import { SUPABASE_URL } from "@/lib/supabase/config";

export const COLORE_PREDEFINITO = "#D8F34A";
export const INK_PREDEFINITO = "#0B0B0C";

const HEX = /^#[0-9a-fA-F]{6}$/;
export const coloreValido = (c: string | null | undefined): c is string => !!c && HEX.test(c);

/** Nero o bianco, quale legge meglio sopra il colore (luminanza relativa). Serve se il centro non ha scelto `colore_ink`. */
export function inchiostroPer(hex: string): string {
  if (!coloreValido(hex)) return INK_PREDEFINITO;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? INK_PREDEFINITO : "#FFFFFF";
}

export type MarchioCentro = { colore?: string | null; colore_ink?: string | null; nome?: string | null; nome_app?: string | null; logo_path?: string | null };

export function coloriCentro(c: MarchioCentro | null | undefined): { brand: string; ink: string } {
  const brand = coloreValido(c?.colore) ? c!.colore! : COLORE_PREDEFINITO;
  const ink = coloreValido(c?.colore_ink) ? c!.colore_ink! : inchiostroPer(brand);
  return { brand, ink };
}

/** Nome con cui si presenta l'app del centro (es. "TC Brera"). */
export const nomeApp = (c: MarchioCentro | null | undefined) => c?.nome_app || c?.nome || "Match Point";

/** Indirizzo pubblico del logo (bucket pubblico `centri-pubblico`, percorso `centro_id/...`). Senza logo: null. */
export function urlLogo(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  if (/^https?:\/\//.test(logoPath)) return logoPath;
  return `${SUPABASE_URL}/storage/v1/object/public/centri-pubblico/${logoPath.split("/").map(encodeURIComponent).join("/")}`;
}
