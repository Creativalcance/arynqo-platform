import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { GET, POST } from "../app/api/admin/social-radar/route";
import { GET as cron } from "../app/api/cron/social-radar/route";
import { defaults } from "../lib/social-radar/domain";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://radar.test.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
process.env.CRON_SECRET = "test-cron";
const id = "10000000-0000-0000-0000-000000000001";
function mock(context: TestContext, role: string) {
  const calls: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/auth/v1/user"))
      return Response.json({ id, is_anonymous: false });
    if (url.includes("/profiles?"))
      return Response.json({ role, locale: "pt" });
    if (url.includes("/rpc/consume_api_limit")) return Response.json(null);
    if (url.includes("/rpc/social_radar_mutate"))
      return Response.json({ saved: true });
    if (url.includes("/social_radar_settings?")) return Response.json(defaults);
    if (url.includes("/social_radar_")) return Response.json([]);
    throw new Error("Unexpected request");
  });
  return calls;
}
function request(body?: unknown, token = true) {
  return new Request("https://arynqo.test.invalid/api/admin/social-radar", {
    method: body ? "POST" : "GET",
    headers: token ? { authorization: "Bearer test" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test("Radar denies anonymous, company and candidate access before touching social tables", async (context) => {
  const calls = mock(context, "company");
  assert.equal((await GET(request(undefined, false))).status, 401);
  assert.equal((await GET(request())).status, 403);
  assert.equal((await POST(request({ action: "scan" }))).status, 403);
  assert.ok(!calls.some((url) => url.includes("social_radar_")));
});
test("admin read is private and credentials are exposed only as availability flags", async (context) => {
  mock(context, "admin");
  const result = await GET(request());
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.equal((await result.json()).ready.externalPublishing, false);
});
test("admin can save a pause but cannot enable unconfigured integration or send arbitrary actions", async (context) => {
  mock(context, "admin");
  delete process.env.SOCIAL_META_ACCESS_TOKEN;
  assert.equal(
    (await POST(request({ action: "settings", settings: defaults }))).status,
    200,
  );
  assert.equal(
    (
      await POST(
        request({
          action: "settings",
          settings: { ...defaults, enabled: true },
        }),
      )
    ).status,
    400,
  );
  assert.equal((await POST(request({ action: "publish", id }))).status, 400);
  assert.equal(
    (
      await POST(
        request({ action: "source", kind: "account", value: "x){token}" }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await POST(
        request({
          action: "opportunity",
          id,
          status: "used",
          selected_comment: "",
          feedback: "",
        }),
      )
    ).status,
    400,
  );
});
test("cron never runs without its secret", async () => {
  assert.equal((await cron(request())).status, 401);
});
