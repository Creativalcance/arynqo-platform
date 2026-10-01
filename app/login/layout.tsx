import { pageMetadata } from "@/lib/seo";
export async function generateMetadata() { return {...await pageMetadata("Entrar","Acede \u00e0 tua conta ARYNQO.","/login"), robots: {index:false,follow:true}}; }
export default function Layout({children}:{children:React.ReactNode}) {return children;}
