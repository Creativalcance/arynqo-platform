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

for (const invalid of [false, true]) {
  test(invalid
    ? "invalid provider content records usage and fails without staging or publishing"
    : "six generated articles are staged with server-calculated reading time", async (context) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://db.test.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-key";
    process.env.OPENAI_API_KEY = "fixture-provider-key";
    const staged: { language: Locale; payload: { content: string; reading_time: string } }[] = [];
    let usage = 0, finished = 0, failure: string | undefined;
    context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (url.pathname.endsWith("/academy_claim_run"))
        return Response.json({ id: "run-test", lease_token: "lease-test", topic_id: "topic-test" });
      if (url.pathname.endsWith("/academy_topics"))
        return Response.json({ title: "Experience", category: "Skills", audience: "Todos", source_urls: ["https://europass.europa.eu/en/create-europass-cv"] });
      if (url.pathname.endsWith("/academy_posts")) return Response.json([]);
      if (url.hostname === "europass.europa.eu")
        return new Response(`<main>${"Describe relevant professional experience. ".repeat(30)}</main>`, { headers: { "content-type": "text/html" } });
      if (url.pathname.endsWith("/academy_generation_runs")) return new Response(null, { status: 204 });
      if (url.pathname.endsWith("/chat/completions")) {
        assert.equal(body.response_format.type, "json_schema");
        assert.equal(body.response_format.json_schema.strict, true);
        const locale: Locale = body.response_format.json_schema.schema.properties.locale.enum[0];
        const content = invalid ? "Too short" : `## One\n${sentences[locale].repeat(65)}\n## Two\n- Checklist\n## Three\nExamples.`;
        // No reading_time field: the provider need not guess a display value or type.
        return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ locale, title: "Experience", excerpt: "Practical examples", content, seo_title: "Experience", seo_description: "Practical examples", review_required: false }) } }], usage: { prompt_tokens: 100, completion_tokens: 200 } });
      }
      if (url.pathname.endsWith("/academy_record_usage")) { usage++; return new Response(null, { status: 204 }); }
      if (url.pathname.endsWith("/academy_stage_translation")) { staged.push(body); return new Response(null, { status: 204 }); }
      if (url.pathname.endsWith("/academy_finish_run")) { finished++; return Response.json({ status: "review", post_id: "post-test" }); }
      if (url.pathname.endsWith("/academy_fail_run")) { failure = body.error_code; return new Response(null, { status: 204 }); }
      throw new Error(`Unexpected fixture request: ${url.pathname}`);
    });
    const result = await runAcademyAutomation(undefined, true);
    if (invalid) {
      assert.equal(result.success, false);
      assert.equal(failure, "invalid_length");
      assert.equal(usage, 1);
      assert.equal(staged.length, 0);
      assert.equal(finished, 0);
    } else {
      assert.equal(result.success, true);
      assert.deepEqual(staged.map(row => row.language).sort(), [...locales].sort());
      for (const row of staged) {
        assert.equal(row.payload.reading_time, `${Math.ceil(row.payload.content.split(/\s+/u).length / 200)} min`);
      }
      assert.equal(usage, 6);
      assert.equal(finished, 1);
      assert.equal(failure, undefined);
    }
  });
}
