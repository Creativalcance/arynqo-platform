import assert from "node:assert/strict";
import { test } from "node:test";
import {
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
