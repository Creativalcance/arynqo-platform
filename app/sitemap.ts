import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/public-content";
import { SITE_URL } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const client=publicClient();
 const [jobs,posts]=await Promise.all([client.from("jobs").select("id").eq("is_active",true),client.from("academy_posts").select("slug").eq("status","published")]);
 if(jobs.error || posts.error) throw new Error("Não foi possível gerar o sitemap.");
 return [...["","/vagas","/empresas","/academia","/politica-de-cookies","/politica-de-privacidade","/aviso-legal"].map(path=>({url:`${SITE_URL}${path}`})),...(jobs.data||[]).map(job=>({url:`${SITE_URL}/vagas/${job.id}`})),...(posts.data||[]).map(post=>({url:`${SITE_URL}/academia/${post.slug}`}))];
}
