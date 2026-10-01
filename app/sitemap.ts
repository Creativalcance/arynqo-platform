import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/public-content";
import { SITE_URL } from "@/lib/seo";
import { locales, localizedPath, localeAlternates } from "@/lib/i18n/config";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const client=publicClient();
 const [jobs,posts]=await Promise.all([client.from("jobs").select("id").eq("is_active",true),client.from("academy_posts").select("slug").eq("status","published")]);
 if(jobs.error || posts.error) throw new Error("Não foi possível gerar o sitemap.");
 const paths = [...["/","/vagas","/empresas","/academia","/politica-de-cookies","/politica-de-privacidade","/aviso-legal"], ...(jobs.data||[]).map(job=>`/vagas/${job.id}`), ...(posts.data||[]).map(post=>`/academia/${post.slug}`)];
 return paths.flatMap(path => locales.map(locale => ({url:`${SITE_URL}${localizedPath(path, locale)}`, alternates:{languages:localeAlternates(path)}})));
}
