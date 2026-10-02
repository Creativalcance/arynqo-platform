import { isLocale, type Locale } from "../i18n/config";
export type ArticleDraft = {
  locale: Locale;
  title: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
  reading_time: string;
  review_required: boolean;
};
export function validateArticle(
  value: unknown,
  expected: Locale,
): ArticleDraft {
  if (!value || typeof value !== "object") throw new Error("invalid_json");
  const v = value as Record<string, unknown>;
  if (!isLocale(v.locale) || v.locale !== expected)
    throw new Error("wrong_locale");
  for (const key of [
    "title",
    "excerpt",
    "content",
    "seo_title",
    "seo_description",
    "reading_time",
  ]) {
    if (typeof v[key] !== "string" || !String(v[key]).trim())
      throw new Error(`missing_${key}`);
  }
  const draft: ArticleDraft = {
    locale: expected,
    title: String(v.title).trim(),
    excerpt: String(v.excerpt).trim(),
    content: String(v.content).trim(),
    seo_title: String(v.seo_title).trim(),
    seo_description: String(v.seo_description).trim(),
    reading_time: String(v.reading_time).trim(),
    review_required: v.review_required !== false,
  };
  const words = draft.content.split(/\s+/u).length;
  if (words < 600 || words > 1500 || draft.content.length > 18000)
    throw new Error("invalid_length");
  if (
    draft.title.length > 160 ||
    draft.excerpt.length > 600 ||
    draft.seo_title.length > 100 ||
    draft.seo_description.length > 200
  )
    throw new Error("invalid_metadata");
  if (
    (draft.content.match(/^## /gm) || []).length < 3 ||
    !/^\- /m.test(draft.content)
  )
    throw new Error("missing_structure");
  // References are added exclusively from sources actually fetched by the server.
  // Unsafe markup/links block generation; factual claims and quotes instead require
  // editorial review so the original remains available for inspection and correction.
  if (/<[^>]+>/u.test(draft.content)) throw new Error("unsupported_html");
  if (/https?:\/\/|\[[^\]]+\]\(/u.test(draft.content))
    throw new Error("unsupported_link");
  const claimsNeedReview = /\d\s*%|\b\d{4}\b|[“”«»]/u.test(
    draft.title + " " + draft.content,
  );
  const tokens = draft.content.toLocaleLowerCase().match(/\p{L}+/gu) || [];
  const markers: Record<Locale, string[]> = {
    pt: ["não", "uma", "teu", "para", "competências", "emprego", "trabalho"],
    en: ["the", "with", "your", "and", "skills", "career"],
    fr: ["vous", "votre", "une", "les", "pour", "emploi"],
    es: ["los", "una", "tus", "empleo", "trabajo", "habilidades"],
    de: ["die", "und", "mit", "für", "ihre", "beruf"],
    it: ["gli", "il", "per", "lavoro", "competenze", "tua"],
  };
  const scores = Object.entries(markers).map(([code, words]) => ({
    code,
    score: tokens.filter((token) => words.includes(token)).length,
  }));
  const target = scores.find((score) => score.code === expected)!.score;
  if (
    target < 5 ||
    Math.max(...scores.map((score) => score.score)) > target * 2.5
  )
    throw new Error("wrong_language_suspected");
  const risky =
    /\b(legisla[çc]|lei laboral|direito laboral|legal advice|employment law|labour law|labor law|droit du travail|arbeitsrecht|derecho laboral|diritto del lavoro|discrimina|medical|médic|medicin|garanti|guarantee|garantiz)/iu.test(
      draft.title + " " + draft.content,
    );
  draft.review_required = v.review_required !== false || risky || claimsNeedReview;
  return draft;
}
export function articleSlug(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "arynqo-academy"
  );
}
export function plainSource(html: string) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] || html;
  return main
    .replace(/<(script|style|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|quot|lt|gt);/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6500);
}
export function safeSourceURL(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      [
        "europass.europa.eu",
        "www.ilo.org",
        "www.oecd.org",
        "www.weforum.org",
      ].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function duplicateArticle(
  draft: Pick<ArticleDraft, "title" | "content">,
  previous: { title: string; content: string }[],
) {
  const normalized = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const shingles = (text: string) => {
    const words = normalized(text).split(" ");
    return new Set(
      words.slice(0, -4).map((_, i) => words.slice(i, i + 5).join(" ")),
    );
  };
  const current = shingles(draft.content);
  return previous.some((post) => {
    if (normalized(post.title) === normalized(draft.title)) return true;
    const old = shingles(post.content);
    const overlap = [...current].filter((part) => old.has(part)).length;
    return overlap / Math.max(1, current.size + old.size - overlap) > 0.65;
  });
}
