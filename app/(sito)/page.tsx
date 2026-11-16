import { Sito } from "@/components/sito/Sito";
import { it } from "@/lib/sito/it";
import { metaPagina } from "@/lib/sito/meta";

export const metadata = metaPagina(it);

export default function Pagina() {
  return <Sito lang="it" d={it} />;
}
