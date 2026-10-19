import assert from "node:assert/strict";
import { test } from "node:test";
import { academyRunMessage } from "../lib/academy/admin-copy";
import { locales } from "../lib/i18n/config";
import {
  ARTICLE_CONTENT_SCHEMA,
  ArticleLengthError,
  articleLength,
  validateArticle,
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
