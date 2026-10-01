
import { LText } from "@/lib/i18n/client";
import Link from "@/lib/i18n/link";
export default function NotFound(){return <main className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-3xl font-bold"><LText text={"Esta página não está disponível."} /></h1><p className="mt-5"><LText text={"A ligação pode estar incorreta ou a oportunidade já não estar ativa."} /></p><Link className="mt-6 inline-block underline" href="/vagas"><LText text={"Explorar vagas disponíveis"} /></Link></main>;}
