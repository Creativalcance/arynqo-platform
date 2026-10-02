import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/public-content";
import { SITE_URL } from "@/lib/seo";
import {
  locales,
  localizedPath,
  localeAlternates,
  type Locale,
} from "@/lib/i18n/config";
import { articleAlternates } from "@/lib/academy/public";
import legacy from "@/lib/i18n/academy-source.json";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = publicClient();
  const [jobs, posts] = await Promise.all([
    client.from("jobs").select("id").eq("is_active", true),
    client
      .from("academy_posts")
      .select(
        "slug,title,excerpt,content,updated_at,content_locale,academy_post_translations(locale)",
      )
      .eq("status", "published"),
  ]);
  if (jobs.error || posts.error)
    throw new Error("Não foi possível gerar o sitemap.");
  const paths = [
    "/",
    "/vagas",
    "/empresas",
    "/academia",
    "/politica-de-cookies",
    "/politica-de-privacidade",
    "/aviso-legal",
    ...(jobs.data || []).map((job) => `/vagas/${job.id}`),
  ];
  const entries: MetadataRoute.Sitemap = paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${SITE_URL}${localizedPath(path, locale)}`,
      alternates: { languages: localeAlternates(path) },
    })),
  );
  for (const post of posts.data || []) {
    const versions = post.academy_post_translations as { locale: Locale }[];
    const available = versions.length
      ? versions.map((v) => v.locale)
      : legacy.some(
            (old) =>
              old.slug === post.slug &&
              old.title === post.title &&
              old.excerpt === post.excerpt &&
              old.content === post.content,
          )
        ? [...locales]
        : [post.content_locale as Locale];
    const languages = articleAlternates({
      slug: post.slug,
      available_locales: available,
    });
    for (const locale of available)
      entries.push({
        url: `${SITE_URL}${localizedPath(`/academia/${post.slug}`, locale)}`,
        lastModified: post.updated_at,
        alternates: { languages },
      });
  }
  return entries;
}
