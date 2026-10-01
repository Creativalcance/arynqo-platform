import { getLocale, getT } from "@/lib/i18n/server";
import { localizedPath } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { getPublicPost } from "@/lib/public-content";
import { serializeStructuredData } from "@/lib/job-schema";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import ArticleClient, {type AcademyPost} from "./ArticleClient";
export const dynamic = "force-dynamic";
type Props = {params: Promise<{slug:string}>};
export async function generateMetadata({params}:Props) {
 const {slug}=await params; const post=await getPublicPost(slug);
 if (!post) return {title:"Artigo indisponível",robots:{index:false}};
 return pageMetadata(post.title,post.excerpt,`/academia/${slug}`);
}
export default async function Page({params}:Props) {
 const {slug}=await params; const post=await getPublicPost(slug); if (!post) notFound();
 const locale=await getLocale(); const t=await getT();
 const article={"@context":"https://schema.org","@type":"Article",headline:t(post.title),description:t(post.excerpt),inLanguage:locale,mainEntityOfPage:`${SITE_URL}${localizedPath(`/academia/${slug}`,locale)}`,...(post.published_at?{datePublished:post.published_at}:{})};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeStructuredData(article)}}/><ArticleClient key={slug} params={params} initialPost={post as AcademyPost} /></>;
}
