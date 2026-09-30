import Client from "./RegistoClient";
import {safeReturnPath} from "@/lib/seo";
export default async function Page({searchParams}:{searchParams:Promise<{next?:string;tipo?:string}>}){const query=await searchParams;return <Client initialNext={safeReturnPath(typeof query.next === "string" ? query.next : null)} initialCompany={query.tipo === "empresa"} />;}
