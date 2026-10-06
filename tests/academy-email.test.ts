import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { academyEmailInput, sendAcademyEmail, type AcademyDelivery } from "../lib/academy/email";
import { processAcademyEmails } from "../lib/academy/email-worker";
import { notificationEmailContent } from "../lib/notification-email";
import { GET } from "../app/api/cron/academy-emails/route";

const row: AcademyDelivery = { id: "delivery-1", lease_id: "lease-1", post_id: "article-1", kind: "published", recipient_email: "user@example.invalid", recipient_name: "<script>name</script>", locale: "en", content_locale: "pt", article_title: "<script>Title</script>", article_excerpt: "Useful <img src=x> excerpt", article_slug: "new-article" };
const config = { apiKey: "synthetic", from: "ARYNQO <no-reply@example.invalid>", baseUrl: "https://www.arynqo.example" };
function configure() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service";
  process.env.RESEND_API_KEY = config.apiKey;
  process.env.NEXT_PUBLIC_APP_URL = config.baseUrl;
}
test("localized review and publication messages escape content, use an available article language and retain the same retry payload", async () => {
  const rendered = notificationEmailContent(academyEmailInput(row), config.baseUrl);
  assert.ok(!rendered.html.includes("<script>")); assert.ok(!rendered.html.includes("<img src=x>"));
  assert.match(rendered.text, /https:\/\/www.arynqo.example\/academia\/new-article/);
  assert.ok(!rendered.text.includes("/en/academia/"));
  const translated = notificationEmailContent(academyEmailInput({ ...row, content_locale: "en" }), config.baseUrl);
  assert.match(translated.text, /\/en\/academia\/new-article/);
  const review = notificationEmailContent(academyEmailInput({ ...row, kind: "review", locale: "pt" }), config.baseUrl);
  assert.match(review.text, /Rever e aprovar artigo/); assert.match(review.text, /admin\/academia\?post=article-1/);
  const requests: { key: string | null; body: string }[] = [];
  const transport: typeof fetch = async (_url, init) => {
    requests.push({ key: new Headers(init?.headers).get("Idempotency-Key"), body: String(init?.body) });
    const payload = JSON.parse(String(init?.body)); assert.equal(payload.to, row.recipient_email); assert.equal(payload.bcc, undefined);
    return Response.json({ id: "accepted" });
  };
  assert.deepEqual(await sendAcademyEmail(row, config, transport), { outcome: "sent", provider: "accepted" });
  await sendAcademyEmail({ ...row, lease_id: "new-lease" }, config, transport);
  assert.deepEqual(requests[0], requests[1]); assert.equal(requests[0].key, "academy-email/delivery-1");
});
test("temporary failure and unknown acceptance are retried; permanent rejection is retained without exposing provider details", async () => {
  for (const status of [429, 500, 503]) assert.equal((await sendAcademyEmail(row, config, async () => Response.json({ error: "private" }, { status }))).outcome, "retry");
  assert.deepEqual(await sendAcademyEmail(row, config, async () => Response.json({ error: "private" }, { status: 403 })), { outcome: "failed", reason: "provider_http_403" });
  assert.equal((await sendAcademyEmail(row, config, async () => { throw new Error("connection interrupted"); })).outcome, "retry");
  assert.equal((await sendAcademyEmail(row, config, async () => Response.json({}))).outcome, "retry");
});
test("worker drains more than 20 recipients, records leases and leaves remaining rows for the next invocation", async () => {
  configure(); let claimed = 0, completed = 0, sent = 0;
  const db = { rpc: async (name: string, params?: Record<string, unknown>) => {
    if (name === "claim_academy_email") return { data: claimed < 61 ? { ...row, id: `delivery-${++claimed}` } : null, error: null };
    assert.equal(name, "finish_academy_email"); assert.equal(params?.lease, row.lease_id); assert.equal(params?.outcome, "sent"); completed++;
    return { error: null };
  } } as unknown as SupabaseClient;
  const transport: typeof fetch = async () => { sent++; return Response.json({ id: "accepted" }); };
  assert.equal((await processAcademyEmails({ db, transport, intervalMs: 0 })).sent, 50);
  assert.equal((await processAcademyEmails({ db, transport, intervalMs: 0 })).sent, 11);
  assert.equal(completed, 61); assert.equal(sent, 61);
});
test("worker stops on provider rate limits and on a lost persistence result without issuing duplicate provider requests", async () => {
  configure(); let claims = 0, sends = 0;
  const db = { rpc: async (name: string) => name === "claim_academy_email" ? (claims++, { data: row, error: null }) : { error: null } } as unknown as SupabaseClient;
  assert.equal((await processAcademyEmails({ db, intervalMs: 0, transport: async () => { sends++; return Response.json({}, { status: 429 }); } })).retry, 1);
  assert.equal(claims, 1); assert.equal(sends, 1);
  const failedDb = { rpc: async (name: string) => name === "claim_academy_email" ? { data: row, error: null } : { error: { message: "lost" } } } as unknown as SupabaseClient;
  await assert.rejects(processAcademyEmails({ db: failedDb, intervalMs: 0, transport: async () => { sends++; return Response.json({ id: "accepted" }); } }), /result_not_saved/);
  assert.equal(sends, 2);
});
test("unconfigured and unauthorized workers never access the queue or provider", async (context) => {
  context.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected_network"); });
  delete process.env.RESEND_API_KEY;
  const db = { rpc: () => { throw new Error("unexpected_claim"); } } as unknown as SupabaseClient;
  assert.equal((await processAcademyEmails({ db })).configured, false);
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request("https://test.invalid/api/cron/academy-emails"))).status, 503);
  process.env.CRON_SECRET = "synthetic-secret";
  assert.equal((await GET(new Request("https://test.invalid/api/cron/academy-emails"))).status, 401);
  assert.equal((await GET(new Request("https://test.invalid/api/cron/academy-emails", { headers: { authorization: "Bearer synthetic-secret" } }))).status, 503);
});
