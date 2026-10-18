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

for (const scenario of ["complete", "invalid_length", "invalid_metadata_seo_description", "resume", "resume_fr", "short_english", "incomplete_translation"] as const) {
  test(`Academy generation: ${scenario}`, async (context) => {
    const resuming = ["resume", "resume_fr", "short_english", "incomplete_translation"].includes(scenario);
    const savedLocales: Locale[] = resuming ? (scenario === "resume" ? ["pt", "en"] : ["pt", "fr"]) : [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.test.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-key";
    process.env.OPENAI_API_KEY = "fixture-provider-key";
    const staged: { language: Locale; payload: { content: string; reading_time: string } }[] = [];
    let usage = 0, finished = 0, failure: string | undefined;
    context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.pathname.endsWith("/academy_claim_run")) {
        assert.equal(body.manual, true);
        assert.equal(body.retry_id, resuming ? "run-test" : null);
        return Response.json({ id: "run-test", lease_token: "lease-test", topic_id: "topic-test", post_id: resuming ? "post-test" : null });
      }
      if (url.pathname.endsWith("/academy_post_translations"))
        return Response.json(savedLocales.map(locale => ({ locale, quality_passed: true, title: "Saved original", content: "Saved complete article" })));
      if (url.pathname.endsWith("/academy_topics"))
        return Response.json({ title: "Experience", category: "Skills", audience: "Todos", source_urls: ["https://europass.europa.eu/en/create-europass-cv"] });
      if (url.pathname.endsWith("/academy_posts")) return Response.json([]);
      if (url.hostname === "europass.europa.eu")
        return new Response(`<main>${"Describe relevant professional experience. ".repeat(30)}</main>`, { headers: { "content-type": "text/html" } });
      if (url.pathname.endsWith("/academy_generation_runs")) return new Response(null, { status: 204 });
      if (url.pathname.endsWith("/chat/completions")) {
        assert.equal(body.response_format.type, "json_schema");
        assert.equal(body.response_format.json_schema.strict, true);
        const properties = body.response_format.json_schema.schema.properties;
        for (const [field, limit] of Object.entries({ title: 160, excerpt: 600, seo_title: 100, seo_description: 200 })) {
          assert.equal(properties[field].maxLength, limit);
          assert.equal(properties[field].minLength, 1);
          assert.ok(body.messages[0].content.includes(`${field} até ${limit}`));
        }
        const locale: Locale = properties.locale.enum[0];
        if (resuming) {
          assert.ok(!savedLocales.includes(locale), "saved versions must not be regenerated");
          assert.equal(JSON.parse(body.messages[1].content).original.title, "Saved original");
        }
        const content = (scenario === "invalid_length" || scenario === "short_english" && locale === "en") ? "Too short" : `## One\n${sentences[locale].repeat(65)}\n## Two\n- Checklist\n## Three\nExamples.`;
        assert.equal(properties.content.maxLength, 18000);
        const wordConstraint = new RegExp(properties.content.pattern, "u");
        for (const count of [599, 600, 1500, 1501]) {
          assert.equal(wordConstraint.test(Array(count).fill("word").join(" ")), count >= 600 && count <= 1500);
        }
        assert.equal(wordConstraint.test(content), !(scenario === "invalid_length" || scenario === "short_english" && locale === "en"));
        // No reading_time field: the provider need not guess a display value or type.
        return Response.json({ choices: [{ finish_reason: scenario === "incomplete_translation" && locale === "en" ? "length" : "stop", message: { content: JSON.stringify({ locale, title: "Experience", excerpt: "Practical examples", content, seo_title: "Experience", seo_description: scenario === "invalid_metadata_seo_description" ? "a".repeat(201) : "Practical examples", review_required: false }) } }], usage: { prompt_tokens: 100, completion_tokens: 200 } });
      }
      if (url.pathname.endsWith("/academy_record_usage")) { usage++; return new Response(null, { status: 204 }); }
      if (url.pathname.endsWith("/academy_stage_translation")) { staged.push(body); return new Response(null, { status: 204 }); }
      if (url.pathname.endsWith("/academy_finish_run")) { finished++; return Response.json({ status: "review", post_id: "post-test" }); }
      if (url.pathname.endsWith("/academy_fail_run")) { failure = body.error_code; return new Response(null, { status: 204 }); }
      throw new Error(`Unexpected fixture request: ${url.pathname}`);
    });
    const result = await runAcademyAutomation(resuming ? "run-test" : undefined, !resuming);
    if (scenario.startsWith("invalid_")) {
      assert.equal(result.success, false);
      assert.equal(failure, scenario === "invalid_length" ? "invalid_length_pt_2_9" : scenario);
      assert.equal(usage, 1);
      assert.equal(staged.length, 0);
      assert.equal(finished, 0);
    } else if (scenario === "short_english" || scenario === "incomplete_translation") {
      assert.equal(result.success, false);
      assert.equal(failure, scenario === "short_english" ? "invalid_length_en_2_9" : "provider_output_incomplete");
      assert.equal(finished, 0, "partial articles must never finish or publish");
      assert.equal(usage, scenario === "short_english" ? 4 : 1);
      assert.deepEqual(staged.map(row => row.language).sort(), scenario === "short_english" ? ["de", "es", "it"] : []);
    } else {
      assert.equal(result.success, true);
      assert.deepEqual(staged.map(row => row.language).sort(), locales.filter(locale => !savedLocales.includes(locale)).sort());
      for (const row of staged) {
        assert.equal(row.payload.reading_time, `${Math.ceil(row.payload.content.split(/\s+/u).length / 200)} min`);
      }
      assert.equal(usage, resuming ? 4 : 6);
      assert.equal(finished, 1);
      assert.equal(failure, undefined);
    }
  });
}
