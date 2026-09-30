import Client from "./ConfirmClient";
import {safeReturnPath} from "@/lib/seo";
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const query=await searchParams;return <Client initialNext={safeReturnPath(typeof query.next === "string" ? query.next : null)} />;}
