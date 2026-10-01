import { getLocale, getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { getPublicJob } from "@/lib/public-content";
import { pageMetadata } from "@/lib/seo";
import {jobPostingSchema, serializeStructuredData} from "@/lib/job-schema";
import JobClient, { type Job } from "./JobClient";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{id: string}> };
export async function generateMetadata({params}: Props) {
  const {id} = await params; const job = await getPublicJob(id);
  if (!job) return { title: (await getT())("Vaga indisponível"), robots: {index:false} };
  return pageMetadata(`${job.title}${job.location ? ` · ${job.location}` : ""}`, (job.description || `Consulta os requisitos de ${job.title}.`).slice(0,160), `/vagas/${id}`, false);
}
export default async function Page({params}: Props) {
  const {id} = await params; const job = await getPublicJob(id);
  if (!job) notFound();
  const schema = jobPostingSchema(job, await getLocale());
  return <>{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeStructuredData(schema)}} />}<JobClient key={id} params={params} initialJob={job as unknown as Job} /></>;

}
