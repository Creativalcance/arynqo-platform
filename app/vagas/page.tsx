import VagasClient, { type Job } from "./VagasClient";
import { publicClient } from "@/lib/public-content";
import { publicExternalJobs } from "@/lib/external-jobs/public";
import { deduplicateJobs } from "@/lib/external-jobs/deduplicate";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return await pageMetadata("Oportunidades de emprego em todo o mundo", "Pesquisa oportunidades por função, localização e modelo de trabalho. Consulta os requisitos e encontra vagas adequadas ao teu percurso.", "/vagas"); }
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}) {
  const query=await searchParams;
  const [internal, external] = await Promise.all([publicClient().from("jobs").select("id,title,description,area,location,country_code,work_mode,work_model,contract_type,seniority,is_active,created_at,company_profiles(company_name)").eq("is_active",true).order("created_at",{ascending:false}), publicExternalJobs()]);
  const {data,error}=internal;
  if (error) throw new Error("Não foi possível carregar as vagas.");
  const jobs = deduplicateJobs([...(data||[]).map(row=>({...row,company_name: (Array.isArray(row.company_profiles)?row.company_profiles[0]:row.company_profiles)?.company_name || ""})),...external]).sort((a,b)=>b.created_at.localeCompare(a.created_at));
  return <VagasClient initialSearch={typeof query.q === "string" ? query.q : ""} initialJobs={jobs as Job[]} />;
}
