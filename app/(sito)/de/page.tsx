import { Sito } from "@/components/sito/Sito";
import { de } from "@/lib/sito/de";
import { metaPagina } from "@/lib/sito/meta";

export const metadata = metaPagina(de);

export default function Pagina() {
  return <Sito lang="de" d={de} />;
}
