import { isLocale, type Locale } from "../i18n/config";
// Shared by the provider schema and server validation (Unicode characters).
export const ARTICLE_METADATA_LIMITS = {
  title: 160,
  excerpt: 600,
  seo_title: 100,
  seo_description: 200,
} as const;
export const ARTICLE_CONTENT_LIMITS = {
  minWords: 600,
  maxWords: 1500,
  maxCharacters: 18000,
} as const;
// Keep prose out of a large word-count regex in constrained decoding. Enforce
// word counts after generation; the schema only bounds the size of the string.
export const ARTICLE_CONTENT_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: ARTICLE_CONTENT_LIMITS.maxCharacters,
  description: "Artigo completo com 800–1100 palavras, pelo menos cinco secções ## e uma lista. Não resumir.",
} as const;
export function articleLength(content: string) {
  const text = content.trim();
  return {
    words: text ? text.split(/\s+/u).length : 0,
    characters: Array.from(text).length,
  };
}
export class ArticleLengthError extends Error {
  constructor(locale: Locale, words: number, characters: number) {
    // Persist diagnostic counts, never the rejected article or provider response.
    super(`invalid_length_${locale}_${words}_${characters}`);
    this.name = "ArticleLengthError";
  }
}
export function translationLengthLimits(originalContent: string) {
  const original = articleLength(originalContent);
  // Editorial screening, not proof of semantic fidelity: translations may use
  // fewer words than Portuguese. Reject drastic shortening and retain human review.
  return {
    minWords: Math.max(350, Math.ceil(original.words * 0.6)),
    minCharacters: Math.max(2000, Math.ceil(original.characters * 0.65)),
  };
}
function structureCounts(content: string) {
  return [/^## /gm, /^### /gm, /^[-*+] /gm, /^\d+[.)] /gm, /^> /gm]
    .map(pattern => (content.match(pattern) || []).length);
}
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
  originalContent?: string,
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
  const { words, characters } = articleLength(draft.content);
  const translation = expected !== "pt" && originalContent
    ? translationLengthLimits(originalContent) : null;
  if (
    words < (translation?.minWords ?? ARTICLE_CONTENT_LIMITS.minWords) ||
    (translation && characters < translation.minCharacters) ||
    words > ARTICLE_CONTENT_LIMITS.maxWords ||
    characters > ARTICLE_CONTENT_LIMITS.maxCharacters
  ) {
    if (translation) throw new Error(`invalid_translation_length_${expected}_${words}_${characters}_${translation.minWords}_${translation.minCharacters}`);
    throw new ArticleLengthError(expected, words, characters);
  }
  if (translation && originalContent) {
    const actual = structureCounts(draft.content);
    if (structureCounts(originalContent).some((count, index) => actual[index] < count))
      throw new Error(`missing_translation_structure_${expected}`);
  }
  for (const [field, limit] of Object.entries(ARTICLE_METADATA_LIMITS)) {
    if (Array.from(draft[field as keyof typeof ARTICLE_METADATA_LIMITS]).length > limit)
      throw new Error(`invalid_metadata_${field}`);
  }
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
  draft.review_required = v.review_required !== false || risky || claimsNeedReview ||
    Boolean(translation && words < ARTICLE_CONTENT_LIMITS.minWords);
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
