import { pageMetadata } from "@/lib/seo";
export async function generateMetadata() { return {...await pageMetadata("Criar conta","Cria uma conta de candidato ou empresa na ARYNQO.","/registo"), robots: {index:false,follow:true}}; }
export default function Layout({children}:{children:React.ReactNode}) {return children;}
