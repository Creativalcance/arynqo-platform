import assert from "node:assert/strict";
import { test } from "node:test";
import { runAcademyAutomation } from "../lib/academy/service";
import { locales, type Locale } from "../lib/i18n/config";

const sentences: Record<Locale, string> = {
  pt: "Para o teu trabalho, descreve uma experiência e as competências relevantes.",
  en: "Describe your skills and the experience relevant to your career with examples.",
  fr: "Décrivez votre expérience et les compétences utiles pour votre emploi avec vous.",
  es: "Describe tus habilidades y los ejemplos de una experiencia para tu trabajo.",
  de: "Beschreiben Sie die Erfahrung und Ihre Fähigkeiten mit Beispielen für Ihren Beruf.",
  it: "Descrivi le tue competenze per il lavoro e gli esempi della tua esperienza.",
};
type Failure = "length" | "empty" | "no_choices" | "invalid_json" | "short" | "metadata" | "refused" | "filtered" | "database";
type Scenario = {
  name: string; saved?: Locale[]; regenerate?: boolean;
  failures?: Partial<Record<Locale, Failure>>; transient?: boolean; nearDeadline?: boolean; compactGerman?: boolean;
  expectedError?: string; expectedRequests: number; expectedStaged: Locale[];
};
const remaining: Locale[] = ["es", "de", "it"];
const resumed: Locale[] = ["pt", "fr"];
const scenarios: Scenario[] = [
  { name: "complete", expectedRequests: 6, expectedStaged: [...locales] },
  { name: "regenerate", regenerate: true, expectedRequests: 6, expectedStaged: [...locales] },
  { name: "short original", failures: { pt: "short" }, expectedError: "invalid_length_pt_2_9", expectedRequests: 1, expectedStaged: [] },
  { name: "invalid original metadata", failures: { pt: "metadata" }, expectedError: "invalid_metadata_seo_description", expectedRequests: 1, expectedStaged: [] },
  { name: "resume PT and EN", saved: ["pt", "en"], expectedRequests: 4, expectedStaged: ["fr", ...remaining] },
  { name: "resume PT and FR", saved: resumed, expectedRequests: 4, expectedStaged: ["en", ...remaining] },
  { name: "full run preserves other languages without exceeding six reservations", failures: { en: "length" }, expectedError: "provider_output_length_en", expectedRequests: 6, expectedStaged: ["pt", "fr", ...remaining] },
  { name: "two repairs stay within six reservations", saved: resumed, failures: { en: "empty", es: "length" }, transient: true, expectedRequests: 6, expectedStaged: ["en", ...remaining] },
  { name: "database failure stops before spending on later languages", saved: resumed, failures: { en: "database" }, expectedError: "academy_database_error", expectedRequests: 1, expectedStaged: [] },
  { name: "no repair starts near the worker deadline", saved: resumed, failures: { en: "length" }, nearDeadline: true, expectedError: "provider_output_length_en", expectedRequests: 4, expectedStaged: remaining },
  { name: "compact German completes the existing five-language draft", saved: ["pt", "en", "fr", "es", "it"], compactGerman: true, expectedRequests: 1, expectedStaged: ["de"] },
];
for (const failure of ["length", "empty", "no_choices", "invalid_json", "short", "metadata", "refused", "filtered"] as const) {
  const error = failure === "short" ? "invalid_translation_length_en_2_9_350_2000" : failure === "metadata" ? "invalid_metadata_seo_description" : `provider_output_${failure === "no_choices" ? "empty" : failure}_en`;
  const repairable = failure !== "refused" && failure !== "filtered";
  scenarios.push({ name: `persistent ${failure}`, saved: resumed, failures: { en: failure }, expectedError: error, expectedRequests: repairable ? 5 : 4, expectedStaged: remaining });
  if (repairable) scenarios.push({ name: `recover ${failure}`, saved: resumed, failures: { en: failure }, transient: true, expectedRequests: 5, expectedStaged: ["en", ...remaining] });
}

for (const scenario of scenarios) {
  test(`Academy generation: ${scenario.name}`, async context => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.test.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-key";
    process.env.OPENAI_API_KEY = "fixture-provider-key";
    const saved = scenario.saved ?? [];
    const staged: { language: Locale; payload: { content: string; reading_time: string; review_required: boolean } }[] = [];
    const calls = new Map<Locale, number>();
    let usage = 0, finished = 0, failure: string | undefined;
    let clock = Date.now();
    if (scenario.nearDeadline) context.mock.method(Date, "now", () => clock);
    context.mock.method(console, "warn", (event: string, diagnostic: Record<string, unknown>) => {
      assert.equal(event, "academy_provider_output");
      assert.deepEqual(Object.keys(diagnostic).sort(), ["finish_reason", "input_tokens", "locale", "output_tokens", "reason", "run_id"]);
    });
    context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.pathname.endsWith("/academy_claim_regeneration")) {
        assert.equal(scenario.regenerate, true);
        assert.equal(body.source_run, "original-run");
        assert.equal(body.regeneration_id, "run-test");
        return Response.json({ id: "run-test", lease_token: "lease-test", topic_id: "topic-test", post_id: null });
      }
      if (url.pathname.endsWith("/academy_claim_run")) {
        assert.equal(body.manual, true);
        assert.equal(body.retry_id, saved.length ? "run-test" : null);
        return Response.json({ id: "run-test", lease_token: "lease-test", topic_id: "topic-test", post_id: saved.length ? "post-test" : null });
      }
      if (url.pathname.endsWith("/academy_post_translations"))
        return Response.json(saved.map(locale => ({ locale, quality_passed: true, title: "Saved original", content: scenario.compactGerman ? `## One\n${sentences.pt.repeat(57)}\n## Two\n- Checklist\n## Three\nExamples.` : "Saved complete article", id: "private-row-id" })));
      if (url.pathname.endsWith("/academy_topics"))
        return Response.json({ title: "Experience", category: "Skills", audience: "Todos", source_urls: ["https://europass.europa.eu/en/create-europass-cv"] });
      if (url.pathname.endsWith("/academy_posts")) return Response.json([]);
      if (url.hostname === "europass.europa.eu")
        return new Response(`<main>${"Describe relevant professional experience. ".repeat(30)}</main>`, { headers: { "content-type": "text/html" } });
      if (url.pathname.endsWith("/academy_generation_runs")) {
        if (init?.method === "PATCH") return new Response(null, { status: 204 });
        return Response.json([{ post_id: saved.length || staged.length ? "post-test" : null }]);
      }
      if (url.pathname.endsWith("/chat/completions")) {
        assert.equal(body.response_format.type, "json_schema");
        assert.equal(body.response_format.json_schema.strict, true);
        const properties = body.response_format.json_schema.schema.properties;
        for (const [field, limit] of Object.entries({ title: 160, excerpt: 600, seo_title: 100, seo_description: 200 })) {
          assert.equal(properties[field].maxLength, limit);
          assert.equal(properties[field].minLength, 1);
        }
        assert.equal(properties.content.pattern, undefined, "word counts belong in server validation, not constrained decoding");
        assert.equal(properties.content.maxLength, 18000);
        const locale: Locale = properties.locale.enum[0];
        const count = (calls.get(locale) ?? 0) + 1;
        calls.set(locale, count);
        if (scenario.nearDeadline && locale === "it") clock += 140000;
        assert.ok(!saved.includes(locale), "saved versions must not be regenerated");
        const prompt = JSON.parse(body.messages[1].content);
        if (saved.length) {
          assert.equal(prompt.original.title, "Saved original");
          assert.equal(prompt.original.id, undefined, "database row metadata is not provider input");
        }
        if (count > 1) {
          assert.ok(prompt.correction);
          assert.equal(body.max_completion_tokens, scenario.failures?.[locale] === "length" ? 8500 : 6500);
          assert.ok(remaining.every(language => calls.has(language)), "give every missing language a first attempt before repairs");
        }
        const issue = count > 1 && scenario.transient ? undefined : scenario.failures?.[locale];
        const content = issue === "short" ? "Too short" : `## One\n${sentences[locale].repeat(scenario.compactGerman ? 46 : 65)}\n## Two\n- Checklist\n## Three\nExamples.`;
        const message = {
          refusal: issue === "refused" ? "Provider refusal" : null,
          content: issue === "empty" ? "" : issue === "invalid_json" ? '{"content":' : JSON.stringify({ locale, title: "Experience", excerpt: "Practical examples", content, seo_title: "Experience", seo_description: issue === "metadata" ? "a".repeat(201) : "Practical examples", review_required: false }),
        };
        return Response.json({ choices: issue === "no_choices" ? [] : [{ finish_reason: issue === "length" ? "length" : issue === "filtered" ? "content_filter" : "stop", message }], usage: { prompt_tokens: 100, completion_tokens: issue === "empty" || issue === "no_choices" ? 0 : 200 } });
      }
      if (url.pathname.endsWith("/academy_record_usage")) { usage++; return new Response(null, { status: 204 }); }
      if (url.pathname.endsWith("/academy_stage_translation")) {
        if (scenario.failures?.[body.language as Locale] === "database") return Response.json({ message: "lease lost" }, { status: 400 });
        staged.push(body); return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith("/academy_finish_run")) { finished++; return Response.json({ status: "review", post_id: "post-test" }); }
      if (url.pathname.endsWith("/academy_fail_run")) { failure = body.error_code; return new Response(null, { status: 204 }); }
      throw new Error(`Unexpected fixture request: ${url.pathname}`);
    });
    const result = await runAcademyAutomation(saved.length ? "run-test" : undefined, !saved.length, scenario.regenerate ? { sourceRunId: "original-run", requestId: "run-test" } : undefined);
    assert.equal(result.success, !scenario.expectedError);
    assert.equal(failure, scenario.expectedError);
    assert.equal(finished, scenario.expectedError ? 0 : 1, "partial articles must never finish or publish");
    assert.equal(usage, scenario.expectedRequests, "every response, including rejected output, records usage");
    assert.ok([...calls.values()].reduce((a, b) => a + b, 0) <= 6, "never exceed the six reserved requests");
    assert.deepEqual(staged.map(row => row.language).sort(), [...scenario.expectedStaged].sort());
    assert.equal(result.post_id, saved.length || staged.length ? "post-test" : undefined, "partial draft remains accessible after failure");
    for (const row of staged) assert.equal(row.payload.reading_time, `${Math.ceil(row.payload.content.split(/\s+/u).length / 200)} min`);
    if (scenario.compactGerman) assert.equal(staged[0].payload.review_required, true);
  });
}
