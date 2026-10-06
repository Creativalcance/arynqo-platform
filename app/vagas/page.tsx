import VagasClient from "./VagasClient";
import { searchPublicJobs } from "@/lib/public-job-search";
import { pageMetadata } from "@/lib/seo";
import { profileOptions } from "@/lib/profile-options";
import { getLocale } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return await pageMetadata("Oportunidades de emprego em todo o mundo", "Pesquisa oportunidades por função, localização e modelo de trabalho. Consulta os requisitos e encontra vagas adequadas ao teu percurso.", "/vagas"); }
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}) {
  const query=await searchParams;
  const q=typeof query.q==='string'?query.q:'';
  const result=await searchPublicJobs(new URLSearchParams({q}));
  return <VagasClient initialSearch={q} initialResult={result} countries={profileOptions(await getLocale()).countries} />;
}
