import { Sito } from "@/components/sito/Sito";
import { es } from "@/lib/sito/es";
import { metaPagina } from "@/lib/sito/meta";

export const metadata = metaPagina(es);

export default function Pagina() {
  return <Sito lang="es" d={es} />;
}
