import "server-only";
import { publicClient } from "../public-content";
import {
  type Locale,
  locales,
  languageTags,
  localizedPath,
} from "../i18n/config";
import { getMessages } from "../i18n/server";
import { translator } from "../i18n/translate";
import legacyArticles from "../i18n/academy-source.json";
export type PublicAcademyPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  audience: "Candidatos" | "Empresas" | "Todos";
  reading_time: string;
  featured: boolean;
  published_at: string | null;
  updated_at: string;
  seo_title: string;
  seo_description: string;
  multilingual: boolean;
  content_locale: Locale;
  author_name: string;
  editorial_sources: { url: string; checked_at: string }[];
  available_locales: Locale[];
};
type Translation = {
  locale: Locale;
  title: string;
  excerpt: string;
  content?: string;
  seo_title: string;
  seo_description: string;
  reading_time: string;
  updated_at: string;
};
type Row = Omit<PublicAcademyPost, "available_locales"> & {
  academy_post_translations: Translation[];
};
const fields =
  "id,slug,title,excerpt,category,audience,reading_time,featured,published_at,updated_at,seo_title,seo_description,multilingual,content_locale,author_name,editorial_sources";
const translatedFields =
  "locale,title,excerpt,seo_title,seo_description,reading_time,updated_at";
function legacy(row: Row) {
  const snapshot = legacyArticles.find((article) => article.slug === row.slug);
  return (
    !!snapshot &&
    snapshot.title === row.title &&
    snapshot.excerpt === row.excerpt &&
    snapshot.content === row.content
  );
}
async function localize(
  row: Row,
  locale: Locale,
): Promise<PublicAcademyPost | null> {
  const versions = row.academy_post_translations || [];
  const translated = versions.find((t) => t.locale === locale);
  const old = legacy(row),
    available = versions.length
      ? versions.map((t) => t.locale)
      : old
        ? [...locales]
        : [row.content_locale];
  if (!translated && !old && row.content_locale !== locale) return null;
  const base = { ...row };
  delete (base as Partial<Row>).academy_post_translations;
  if (translated)
    return {
      ...base,
      ...translated,
      content: translated.content || "",
      available_locales: available,
      content_locale: locale,
    };
  if (old) {
    const t = translator(await getMessages(locale));
    return {
      ...base,
      title: t(row.title),
      excerpt: t(row.excerpt),
      content: (row.content || "")
        .split("\n")
        .map((line) => {
          const prefix = line.match(/^(?:#{2,3} |- )/)?.[0] || "";
          return prefix + t(line.slice(prefix.length).trimEnd());
        })
        .join("\n"),
      // Legacy SEO fields have no translations and still contain an obsolete brand.
      // Preserve the translated titles/excerpts until real per-locale metadata exists.
      seo_title: t(row.title),
      seo_description: t(row.excerpt),
      available_locales: available,
      content_locale: locale,
    };
  }
  return { ...base, available_locales: available };
}
export async function readAcademyPost(slug: string, locale: Locale) {
  if (slug.length > 160 || !/^[a-z0-9-]+$/.test(slug)) return null;
  const { data, error } = await publicClient()
    .from("academy_posts")
    .select(
      `${fields},content,academy_post_translations(${translatedFields},content)`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .abortSignal(AbortSignal.timeout(20000))
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar o artigo.");
  return data ? localize(data as unknown as Row, locale) : null;
}
export async function readAcademyPosts(locale: Locale, offset = 0, limit = 60) {
  const query = publicClient()
    .from("academy_posts")
    .select(`${fields},content,academy_post_translations(${translatedFields})`)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .abortSignal(AbortSignal.timeout(20000));
  query.or(
    `multilingual.eq.true,content_locale.eq.${locale},slug.in.(${legacyArticles.map((a) => a.slug).join(",")})`,
  );
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível consultar os artigos.");
  const localized = await Promise.all(
    (data || []).map(async (row) => {
      const post = await localize(row as unknown as Row, locale);
      return post ? { ...post, content: "" } : null;
    }),
  );
  return localized.filter((post): post is PublicAcademyPost => post !== null);
}
export function articleAlternates(
  post: Pick<PublicAcademyPost, "slug" | "available_locales">,
) {
  const path = `/academia/${post.slug}`;
  return Object.fromEntries(
    post.available_locales.map((locale) => [
      languageTags[locale],
      `https://www.arynqo.com${localizedPath(path, locale)}`,
    ]),
  );
}
