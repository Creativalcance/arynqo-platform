import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assess,
  defaults,
  instagramURL,
  settingsValue,
  sourceValue,
  validSuggestions,
  type Source,
} from "../lib/social-radar/domain";
import { discover, MetaError } from "../lib/social-radar/meta";

test("source and permalink validation reject field injection, credential URLs and foreign hosts", () => {
  assert.equal(sourceValue("account", "@jornaldenoticias"), "jornaldenoticias");
  assert.equal(sourceValue("hashtag", "#estágios"), "estágios");
  for (const input of ["foo){id}", "https://instagram.com/foo", "a b", "a/b"])
    assert.equal(sourceValue("account", input), null);
  assert.equal(
    instagramURL("https://instagram.com/p/abc_123/?utm_source=test"),
    "https://www.instagram.com/p/abc_123/",
  );
  for (const url of [
    "javascript:alert(1)",
    "https://instagram.com.evil.test/p/abc/",
    "https://user:pass@instagram.com/p/abc/",
    "http://instagram.com/p/abc/",
    "https://instagram.com:8080/p/abc/",
    "https://instagram.com/direct/inbox/",
  ])
    assert.equal(instagramURL(url), null);
});
test("settings reject unlimited budgets and triage diverts sensitive employment stories", () => {
  assert.deepEqual(settingsValue(defaults), defaults);
  for (const settings of [
    { ...defaults, daily_requests: 1001 },
    { ...defaults, min_score: -1 },
    { ...defaults, enabled: "yes" },
    { ...defaults, daily_generations: 3.5 },
  ])
    assert.equal(settingsValue(settings), null);
  assert.ok(assess("Trabalho e horários: semana de quatro dias").score >= 40);
  assert.equal(
    assess("Despedimento de trabalhadores após falência").status,
    "review",
  );
  assert.equal(assess("O melhor bolo de chocolate").score, 0);
});
test("model output needs distinct bounded suggestions and must not promise a vacancy", () => {
  const valid = {
    relevant: true,
    reason: "Emprego",
    suggestions: [
      "O horário também conta.",
      "Quatro dias para fazer melhor.",
      "Uma oportunidade para mudar de rumo.",
    ],
  };
  assert.ok(validSuggestions(valid, []));
  assert.equal(validSuggestions(valid, ["O horário também conta."]), null);
  assert.equal(
    validSuggestions(
      {
        ...valid,
        suggestions: ["Temos uma vaga!", "Uma boa ideia.", "Outro comentário."],
      },
      [],
    ),
    null,
  );
  assert.equal(
    validSuggestions(
      {
        ...valid,
        suggestions: ["A mesma frase.", "A mesma frase.", "Outra frase."],
      },
      [],
    ),
    null,
  );
  assert.equal(
    validSuggestions(
      {
        ...valid,
        suggestions: [
          "https://evil.test",
          "Uma boa ideia.",
          "Outro comentário.",
        ],
      },
      [],
    ),
    null,
  );
  assert.deepEqual(
    validSuggestions(
      { relevant: false, reason: "Falta contexto", suggestions: [] },
      [],
    ),
    { relevant: false, reason: "Falta contexto", suggestions: [] },
  );
});
const source: Source = {
  id: "10000000-0000-0000-0000-000000000001",
  kind: "account",
  value: "jornaldenoticias",
  enabled: true,
  last_checked_at: null,
  last_error: null,
};
function config() {
  process.env.SOCIAL_META_ACCESS_TOKEN = "private-test-token";
  process.env.SOCIAL_INSTAGRAM_USER_ID = "123";
  process.env.SOCIAL_META_API_VERSION = "v25.0";
}
test("discovery reads a fixed host without token in URL and rejects unsafe, stale or incomplete media", async () => {
  config();
  const now = Date.now();
  let calls = 0;
  const item = {
    id: "12345",
    caption: "Trabalho com horários flexíveis.",
    timestamp: new Date(now).toISOString(),
    permalink: "https://www.instagram.com/p/abcd/",
  };
  const fetcher = (async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.hostname, "graph.facebook.com");
    assert.ok(!url.searchParams.has("access_token"));
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer private-test-token",
    );
    assert.equal(init?.redirect, "error");
    assert.equal(init?.method, undefined);
    return Response.json({
      business_discovery: {
        media: {
          data: [
            item,
            { ...item, id: "2", permalink: "https://evil.test" },
            {
              ...item,
              id: "3",
              timestamp: new Date(now - 200 * 3600000).toISOString(),
            },
            { ...item, id: "4", caption: "" },
          ],
          paging: { next: "https://evil.test/steal" },
        },
      },
    });
  }) as typeof fetch;
  const rows = await discover(source, 48, fetcher, now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_id, source.id);
  assert.equal(calls, 1);
});
test("hashtag discovery is bounded to two requests and provider errors never leak token or message", async () => {
  config();
  let calls = 0;
  const fetcher = (async (input) => {
    calls++;
    const url = new URL(String(input));
    return Response.json(
      url.pathname.endsWith("ig_hashtag_search")
        ? { data: [{ id: "9876" }] }
        : { data: [] },
    );
  }) as typeof fetch;
  assert.deepEqual(
    await discover(
      { ...source, kind: "hashtag", value: "emprego" },
      48,
      fetcher,
    ),
    [],
  );
  assert.equal(calls, 2);
  await assert.rejects(
    discover(source, 48, (async () =>
      Response.json(
        { error: { code: 190, message: "private-test-token" } },
        { status: 400 },
      )) as typeof fetch),
    (error) => error instanceof MetaError && error.message === "credentials",
  );
});
test("hashtag media without timestamp keeps the publication date unknown", async () => {
  config();
  let calls = 0;
  const fetcher = (async (input) => {
    calls++;
    const url = new URL(String(input));
    if (calls === 1) return Response.json({ data: [{ id: "123" }] });
    assert.equal(url.searchParams.get("fields"), "id,caption,permalink");
    return Response.json({
      data: [
        {
          id: "456",
          caption: "Novas oportunidades de emprego.",
          permalink: "https://instagram.com/p/abc/",
        },
      ],
    });
  }) as typeof fetch;
  const rows = await discover(
    { ...source, kind: "hashtag", value: "emprego" },
    48,
    fetcher,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].published_at, null);
});
