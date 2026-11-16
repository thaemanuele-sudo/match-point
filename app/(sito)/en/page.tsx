import { Sito } from "@/components/sito/Sito";
import { en } from "@/lib/sito/en";
import { metaPagina } from "@/lib/sito/meta";

export const metadata = metaPagina(en);

export default function Pagina() {
  return <Sito lang="en" d={en} />;
}
