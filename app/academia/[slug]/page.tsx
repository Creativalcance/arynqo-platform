import { getLocale } from "@/lib/i18n/server";
import { localizedPath } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { getPublicPost } from "@/lib/public-content";
import { articleAlternates } from "@/lib/academy/public";
import { serializeStructuredData } from "@/lib/job-schema";
import { SITE_URL, pageMetadata } from "@/lib/seo";
import ArticleClient from "./ArticleClient";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params,
    locale = await getLocale(),
    post = await getPublicPost(slug, locale);
  if (!post) return { title: "ARYNQO Academy", robots: { index: false } };
  const meta = await pageMetadata(
    post.seo_title || post.title,
    post.seo_description || post.excerpt,
    `/academia/${slug}`,
    false,
  );
  return {
    ...meta,
    alternates: {
      canonical: `${SITE_URL}${localizedPath(`/academia/${slug}`, locale)}`,
      languages: articleAlternates(post),
    },
    openGraph: {
      ...meta.openGraph,
      type: "article" as const,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
    },
  };
}
export default async function Page({ params }: Props) {
  const { slug } = await params,
    locale = await getLocale(),
    post = await getPublicPost(slug, locale);
  if (!post) notFound();
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    inLanguage: post.content_locale,
    mainEntityOfPage: `${SITE_URL}${localizedPath(`/academia/${slug}`, locale)}`,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author_name, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "ARYNQO",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-arynqo.png` },
    },
    citation: post.editorial_sources.map((source) => source.url),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(article) }}
      />
      <ArticleClient
        key={`${slug}-${locale}`}
        params={params}
        initialPost={post}
      />
    </>
  );
}
