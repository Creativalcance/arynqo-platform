import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { ApiError, authorizeMatchScope, requireActor, requireOwnedJob, type ApiActor } from "../lib/api-auth";
import { resolveNotificationEvent } from "../lib/notification-event";
import { isPublicAddress, publicWebsiteUrl } from "../lib/public-website";

const candidateId = "10000000-0000-0000-0000-000000000001";
const otherId = "20000000-0000-0000-0000-000000000001";
const jobId = "30000000-0000-0000-0000-000000000001";
const companyId = "40000000-0000-0000-0000-000000000001";
const applicationId = "50000000-0000-0000-0000-000000000001";
type Row = Record<string, string>;

function database(tables: Record<string, Row[]>): SupabaseClient {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        limit() { return query; },
        async single() { return query.maybeSingle(); },
        async maybeSingle() {
          return { data: tables[table]?.find(row => filters.every(([key, value]) => row[key] === value)) ?? null, error: null };
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}
const actor = (role: ApiActor["role"], id = candidateId, client = database({})) => ({ role, id, client });
const status = (expected: number) => (error: unknown) => error instanceof ApiError && error.status === expected;

test("missing bearer token is rejected before contacting a service", async () => {
  await assert.rejects(requireActor(new Request("https://test.invalid")), status(401));
  await assert.rejects(requireActor(new Request("https://test.invalid", { headers: { authorization: "Basic forged" } })), status(401));
});

test("website scraping rejects internal addresses and credential-bearing URLs", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "172.16.1.1", "192.168.1.1", "100.64.0.1", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1", "not-an-ip"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  assert.throws(() => publicWebsiteUrl("https://user:pass@example.invalid"));
  assert.throws(() => publicWebsiteUrl("http://example.invalid:8080"));
  assert.throws(() => publicWebsiteUrl("file:///etc/passwd"));
});

test("Auth validates tokens and user_metadata never grants admin access", async (context) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/auth/v1/user")) return Response.json({ id: candidateId, user_metadata: { role: "admin" }, is_anonymous: false });
    return Response.json({ role: "student" });
  });
  const request = new Request("https://test.invalid", { headers: { authorization: "Bearer test-token" } });
  assert.equal((await requireActor(request)).role, "student");
  await assert.rejects(requireActor(request, ["admin"]), status(403));
});

test("a candidate cannot recalculate another candidate or trigger a global run", async () => {
  const student = actor("student", candidateId, database({ student_profiles: [{ id: candidateId, user_id: candidateId }] }));
  await assert.rejects(authorizeMatchScope(student, {}), status(400));
  await assert.rejects(authorizeMatchScope(student, { studentId: otherId }), status(403));
  assert.deepEqual(await authorizeMatchScope(student, { jobId }), { jobId, studentId: candidateId });
});

test("a company can change only its own vacancy", async () => {
  const company = actor("company", companyId, database({ company_profiles: [{ id: companyId, user_id: companyId }], jobs: [{ id: jobId, company_id: companyId }] }));
  await requireOwnedJob(company, jobId);
  await assert.rejects(requireOwnedJob(company, otherId), status(403));
  await assert.rejects(authorizeMatchScope(company, { studentId: candidateId }), status(400));
  await assert.rejects(requireOwnedJob(company, "bad-id"), status(400));
});

test("notification recipient and text come from an owned event", async () => {
  const admin = database({
    applications: [{ id: applicationId, student_id: candidateId, job_id: jobId, status: "pending" }],
    student_profiles: [{ id: candidateId, user_id: candidateId }],
    jobs: [{ id: jobId, company_id: companyId, title: "Torneiro" }],
    company_profiles: [{ id: companyId, user_id: companyId }],
  });
  const input = { relatedId: applicationId, relatedType: "application", userId: otherId, title: "forged", relatedUrl: "https://evil.invalid" };
  const result = await resolveNotificationEvent(actor("student"), admin, input);
  assert.equal(result.userId, companyId);
  assert.equal(result.title, "Nova candidatura recebida");
  assert.ok(result.relatedUrl.startsWith("/empresa/candidatos/"));
  await assert.rejects(resolveNotificationEvent(actor("student", otherId), admin, input), status(403));
  await assert.rejects(resolveNotificationEvent(actor("company", companyId), admin, input), status(403));
  await assert.rejects(resolveNotificationEvent(actor("student"), admin, { relatedId: applicationId, relatedType: "general" }), status(400));
});

test("all privileged POST routes reject unauthenticated requests", async () => {
  process.env.OPENAI_API_KEY = "test-only-not-a-real-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-not-a-real-key";
  const routes = ["academy-post", "company-profile", "company-scraper", "generate-matches", "job-assistant", "parse-cv", "recalculate-job-matches", "structure-job", "student-profile"];
  for (const route of routes) {
    const handler = await import(`../app/api/ai/${route}/route`);
    const response = await handler.POST(new NextRequest("https://test.invalid", { method: "POST", body: "{}" }));
    assert.equal(response.status, 401, route);
  }
  const notifications = await import("../app/api/notifications/create/route");
  assert.equal((await notifications.POST(new NextRequest("https://test.invalid", { method: "POST", body: "{}" }))).status, 401);
  const legacy = await import("../app/api/matching/calculate/route");
  assert.equal((await legacy.GET()).status, 410);
});
