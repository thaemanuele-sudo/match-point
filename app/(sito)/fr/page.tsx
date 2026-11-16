import { Sito } from "@/components/sito/Sito";
import { fr } from "@/lib/sito/fr";
import { metaPagina } from "@/lib/sito/meta";

export const metadata = metaPagina(fr);

export default function Pagina() {
  return <Sito lang="fr" d={fr} />;
}
