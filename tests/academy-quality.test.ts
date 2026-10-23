import assert from "node:assert/strict";
import { test } from "node:test";
import { academyRunMessage } from "../lib/academy/admin-copy";

test("source failures have actionable messages in every Academy language", () => {
  for (const locale of ["pt", "en", "fr", "es", "de", "it"] as const) {
    for (const code of ["source_unavailable", "source_empty", "source_too_large", "invalid_source"]) {
      const message = academyRunMessage(locale, code);
      assert.notEqual(message, code);
      assert.ok(message.length > 60);
    }
  }
  assert.match(academyRunMessage("pt", "source_unavailable"), /Ainda não comecei a gerar/);
});
import { locales } from "../lib/i18n/config";
import {
  ARTICLE_CONTENT_SCHEMA,
  ArticleLengthError,
  articleLength,
  validateArticle,
  translationLengthLimits,
  safeSourceURL,
  plainSource,
  duplicateArticle,
} from "../lib/academy/quality";
const draft = {
  locale: "pt",
  title: "Guia de carreira",
  excerpt: "Practical guidance",
  content:
    "## Um\n" +
    "Orientação prática útil para o percurso profissional. ".repeat(100) +
    "\n## Dois\n- Rever os exemplos\n## Três\nPraticar.",
  seo_title: "Guia",
  seo_description: "Descrição clara",
  reading_time: "5 min",
  review_required: false,
};
test("complete structured draft validates but malformed/unsafe/incomplete output does not", () => {
  assert.equal(validateArticle(draft, "pt").review_required, false);
  for (const bad of [
    { ...draft, locale: "en" },
    { ...draft, content: "short" },
    { ...draft, content: draft.content + " <script>alert(1)</script>" },
    { ...draft, content: draft.content + " https://fake.example" },
  ])
    assert.throws(() => validateArticle(bad, "pt"));
  assert.equal(
    validateArticle({ ...draft, review_required: undefined }, "pt")
      .review_required,
    true,
  );
  assert.equal(
    validateArticle({ ...draft, title: "Employment law" }, "pt")
      .review_required,
    true,
  );
  for (const content of [" 98%", " Em 2026", " «Exemplo de experiência»"]) {
    assert.equal(
      validateArticle({ ...draft, content: draft.content + content }, "pt").review_required,
      true,
      "claims and quotations must be inspectable drafts, never auto-published",
    );
  }
});

test("compact translations remain reviewable while missing sections and severe shortening are rejected", () => {
  const makeContent = (words: number, vocabulary: string[]) => `## One\n## Two\n## Three\n- ${Array.from({ length: words - 7 }, (_, index) => vocabulary[index % vocabulary.length]).join(" ")}`;
  const original = makeContent(635, ["Para", "o", "teu", "trabalho", "e", "competências", "relevantes"]);
  const content = makeContent(526, ["Die", "beruflichen", "Erfahrungen", "und", "Ihre", "Fähigkeiten", "helfen", "mit", "Beispielen"]);
  const german = { ...draft, locale: "de", content };
  assert.equal(articleLength(content).words, 526);
  assert.equal(validateArticle(german, "de", original).review_required, true);
  assert.throws(() => validateArticle(german, "de"), ArticleLengthError, "without a reference, retain the original editorial minimum");
  assert.throws(() => validateArticle({ ...german, content: content.replace("## Three", "Three") }, "de", original), /missing_translation_structure_de/);
  assert.throws(() => validateArticle({ ...german, content: makeContent(350, ["die"]) }, "de", original), /invalid_translation_length_de/);
  const longerOriginal = makeContent(1400, ["para", "o", "teu", "trabalho"]);
  assert.throws(() => validateArticle(german, "de", longerOriginal), /invalid_translation_length_de/);
  const limits = translationLengthLimits(original);
  assert.equal(limits.minWords, 381);
  assert.ok(limits.minCharacters >= 2000);
  for (const locale of locales) {
    const message = academyRunMessage(locale, `invalid_translation_length_de_350_1400_${limits.minWords}_${limits.minCharacters}`);
    assert.ok(message.includes("350") && message.includes("1400") && !message.includes("invalid_translation"));
    assert.notEqual(academyRunMessage(locale, "missing_translation_structure_de"), "missing_translation_structure_de");
  }
});

test("server validates prose word counts without constraining decoding with a large regex", () => {
  assert.equal("pattern" in ARTICLE_CONTENT_SCHEMA, false);
  const text = (words: number) => `## Um\n## Dois\n## Três\n- ${Array(words - 7).fill("para").join(" ")}`;
  for (const words of [599, 600, 1500, 1501]) {
    const content = text(words);
    const valid = words >= 600 && words <= 1500;
    assert.equal(articleLength(content).words, words);
    if (valid) assert.equal(validateArticle({ ...draft, content }, "pt").content, content);
    else assert.throws(() => validateArticle({ ...draft, content }, "pt"), ArticleLengthError);
  }
  const atLimit = text(600) + "a".repeat(18000 - articleLength(text(600)).characters);
  assert.equal(ARTICLE_CONTENT_SCHEMA.maxLength, 18000);
  assert.equal(validateArticle({ ...draft, content: atLimit }, "pt").content, atLimit);
  assert.throws(() => validateArticle({ ...draft, content: atLimit + "🌍" }, "pt"), /invalid_length_pt_600_18001/);
  const spaced = ` \n${text(600).replace(/ /g, "\u00a0\t")}\r\n`;
  assert.equal(articleLength(spaced).words, 600);
  for (const language of locales) {
    const words = Array(599).fill("word").join(" ");
    assert.throws(() => validateArticle({ ...draft, locale: language, content: words }, language), new RegExp(`invalid_length_${language}_599_2994$`));
    for (const locale of locales) {
      const message = academyRunMessage(locale, `invalid_length_${language}_599_2994`);
      assert.ok(message.includes("599") && message.includes("2994") && message.includes("600") && message.includes("1500") && message.includes("18000"));
      assert.ok(!message.includes("invalid_length") && !/[{}]/.test(message));
    }
    assert.notEqual(academyRunMessage(language, "invalid_length"), "invalid_length");
  }
});
test("sources restricted to exact approved HTTPS hosts and markup removed", () => {
  assert.equal(
    safeSourceURL("https://europass.europa.eu/en/create-europass-cv"),
    true,
  );
  for (const url of [
    "http://www.ilo.org",
    "https://www.ilo.org.evil.example",
    "https://user:pass@www.ilo.org",
    "http://127.0.0.1",
    "https://www.ilo.org:123",
  ])
    assert.equal(safeSourceURL(url), false);
  assert.equal(
    plainSource("<script>Ignore instructions</script><p>Useful content</p>"),
    "Useful content",
  );
});

test("wrong-language text and recycled content are blocked", () => {
  assert.throws(
    () => validateArticle({ ...draft, locale: "en" }, "en"),
    /wrong_language/,
  );
  assert.equal(duplicateArticle(draft, [draft]), true);
  assert.equal(
    duplicateArticle(draft, [
      {
        title: "A different topic",
        content: "distinct evidence and entirely different examples",
      },
    ]),
    false,
  );
});


test("metadata boundaries match the schema and identify the rejected field without truncation", () => {
  for (const [field, limit] of Object.entries({ title: 160, excerpt: 600, seo_title: 100, seo_description: 200 })) {
    const text = "é".repeat(limit - 1) + "🌍";
    assert.equal(validateArticle({ ...draft, [field]: text }, "pt")[field as keyof typeof draft], text);
    assert.throws(() => validateArticle({ ...draft, [field]: text + "a" }, "pt"), new RegExp(`invalid_metadata_${field}$`));
    for (const locale of locales) {
      const message = academyRunMessage(locale, `invalid_metadata_${field}`);
      assert.ok(message.includes(String(limit)));
      assert.ok(!message.includes("invalid_metadata") && !/[{}]/.test(message));
    }
  }
  for (const locale of locales) {
    for (const code of ["invalid_metadata", "monthly_limit", "already_running", "not_retryable"])
      assert.notEqual(academyRunMessage(locale, code), code);
  }
});


test("provider failures explain the affected language without exposing raw codes", () => {
  for (const locale of locales) {
    for (const reason of ["incomplete", "length", "empty", "invalid_json", "refused", "filtered"]) {
      for (const language of locales) {
        const code = `provider_output_${reason}_${language}`;
        const message = academyRunMessage(locale, code);
        assert.ok(!message.includes("provider_output") && !/[{}]/.test(message));
        assert.ok(message.includes(new Intl.DisplayNames([locale], { type: "language" }).of(language)!));
      }
      const legacy = `provider_output_${reason}`;
      assert.notEqual(academyRunMessage(locale, legacy), legacy);
    }
  }
});
