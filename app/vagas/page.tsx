import VagasClient, { type Job } from "./VagasClient";
import { publicClient } from "@/lib/public-content";
import { pageMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata() { return await pageMetadata("Oportunidades de emprego em todo o mundo", "Pesquisa oportunidades por função, localização e modelo de trabalho. Consulta os requisitos e encontra vagas adequadas ao teu percurso.", "/vagas"); }
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}) {
  const query=await searchParams;
  const { data, error } = await publicClient().from("jobs").select("id,title,description,area,location,work_mode,work_model,contract_type,seniority,is_active,created_at").eq("is_active",true).order("created_at",{ascending:false});
  if (error) throw new Error("Não foi possível carregar as vagas.");
  return <VagasClient initialSearch={typeof query.q === "string" ? query.q : ""} initialJobs={(data || []) as Job[]} />;
}
