import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "../app/api/admin/academy-automation/route";
import { GET as cron } from "../app/api/cron/generate-academy-post/route";
test("automation admin endpoints deny anonymous requests before any network call", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected_network_call");
  });
  assert.equal((await DELETE(new NextRequest("https://test.invalid/api/admin/academy-automation", { method: "DELETE" }))).status, 401);
  assert.equal(
    (
      await GET(
        new NextRequest("https://test.invalid/api/admin/academy-automation?post_id=10000000-0000-0000-0000-000000000002"),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await POST(
        new NextRequest("https://test.invalid/api/admin/academy-automation", {
          method: "POST",
          body: JSON.stringify({ action: "preview" }),
        }),
      )
    ).status,
    401,
  );
});
test("candidate cannot claim admin privileges or start an AI generation", async (context) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const calls: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/auth/v1/user"))
      return Response.json({
        id: "10000000-0000-0000-0000-000000000001",
        user_metadata: { role: "admin" },
        is_anonymous: false,
      });
    if (url.includes("/rest/v1/profiles"))
      return Response.json({ role: "student", locale: "pt" });
    throw new Error("unexpected_privileged_call");
  });
  const request = new NextRequest(
    "https://test.invalid/api/admin/academy-automation",
    {
      method: "POST",
      headers: { authorization: "Bearer test-token" },
      body: JSON.stringify({ action: "preview" }),
    },
  );
  assert.equal((await POST(request)).status, 403);
  assert.equal((await GET(new NextRequest(
    "https://test.invalid/api/admin/academy-automation?post_id=10000000-0000-0000-0000-000000000002",
    { headers: { authorization: "Bearer test-token" } },
  ))).status, 403);
  assert.equal(calls.length, 4);
});
test("cron fails closed without secret and denies the wrong token without generation", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected_network_call");
  });
  delete process.env.CRON_SECRET;
  assert.equal(
    (
      await cron(
        new NextRequest("https://test.invalid/api/cron/generate-academy-post"),
      )
    ).status,
    503,
  );
  process.env.CRON_SECRET = "fixture-secret-not-real";
  assert.equal(
    (
      await cron(
        new NextRequest("https://test.invalid/api/cron/generate-academy-post", {
          headers: { authorization: "Bearer wrong" },
        }),
      )
    ).status,
    401,
  );
  delete process.env.CRON_SECRET;
});


test("administrator can pause the schedule through the supported quota operation",async context=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://auth.test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-key';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
 const operations:string[]=[];let saved=false;
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.includes('/auth/v1/user'))return Response.json({id:'10000000-0000-0000-0000-000000000001',is_anonymous:false});
  if(url.includes('/rest/v1/profiles'))return Response.json({role:'admin',locale:'pt'});
  if(url.includes('/rpc/consume_api_limit')){const body=JSON.parse(String(init?.body));operations.push(body.p_operation);return new Response(null,{status:204});}
  if(url.includes('/rest/v1/academy_automation_settings')){const body=JSON.parse(String(init?.body));assert.equal(body.enabled,false);assert.equal(body.auto_publish,false);assert.equal(body.monthly_request_limit,300);saved=true;return Response.json({...body,next_due_at:"2026-10-26T09:00:00Z",interval_days:4});}
  throw new Error('unexpected_provider_or_database_call');
 });
 const request=new NextRequest('https://test.invalid/api/admin/academy-automation',{method:'POST',headers:{authorization:'Bearer test-token'},body:JSON.stringify({action:'settings',enabled:false,auto_publish:false,monthly_request_limit:300})});
 const response=await POST(request);assert.equal(response.status,200);assert.equal((await response.json()).settings.monthly_request_limit,300);assert.deepEqual(operations,['academy_admin']);assert.equal(saved,true);
 saved=false;
 const automatic=new NextRequest('https://test.invalid/api/admin/academy-automation',{method:'POST',headers:{authorization:'Bearer test-token'},body:JSON.stringify({action:'settings',enabled:false,auto_publish:true,monthly_request_limit:300})});
 assert.equal((await POST(automatic)).status,400);assert.equal(saved,false);
});


test("saving settings requires a returned row and rejects invalid limits before writing", async context => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  let writes = 0;
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json({ id: "10000000-0000-0000-0000-000000000001", is_anonymous: false });
    if (url.pathname === "/rest/v1/profiles") return Response.json({ role: "admin", locale: "pt" });
    if (url.pathname.endsWith("/consume_api_limit")) return new Response(null, { status: 204 });
    if (url.pathname.endsWith("/academy_automation_settings")) { writes++; return Response.json(null); }
    throw new Error("unexpected_request");
  });
  const request = (limit: unknown) => new NextRequest("https://test.invalid/api/admin/academy-automation", {
    method: "POST", headers: { authorization: "Bearer test-token" },
    body: JSON.stringify({ action: "settings", enabled: false, auto_publish: false, monthly_request_limit: limit }),
  });
  for (const limit of [0, 601, 6.5, "300", null]) assert.equal((await POST(request(limit))).status, 400);
  assert.equal(writes, 0);
  assert.equal((await POST(request(300))).status, 500, "never acknowledge a save that returned no settings");
  assert.equal(writes, 1);
});

test("admin can read full draft versions by post ID without relying on the latest 30 runs", async context => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const postId = "10000000-0000-0000-0000-000000000002";
  const versions = ["pt", "en", "fr", "es", "de", "it"].map(locale => ({
    locale, title: `Draft ${locale}`, content: `Private complete article ${locale}`,
    excerpt: "Introduction", seo_title: "SEO title", seo_description: "SEO description",
    quality_passed: true, review_required: true, reading_time: "5 min",
  }));
  let missing = false;
  let databaseCalls = 0;
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json({ id: postId, is_anonymous: false });
    if (url.pathname === "/rest/v1/profiles") return Response.json({ role: "admin", locale: "pt" });
    databaseCalls++;
    assert.equal(url.searchParams.has("limit"), false);
    if (url.pathname === "/rest/v1/academy_posts") {
      assert.equal(url.searchParams.get("id"), `eq.${postId}`);
      return Response.json(missing ? [] : [{ id: postId, title: "Draft", status: "draft" }]);
    }
    assert.equal(url.searchParams.get("post_id"), `eq.${postId}`);
    if (url.pathname === "/rest/v1/academy_post_translations") return Response.json(versions);
    if (url.pathname === "/rest/v1/academy_generation_runs") return Response.json([{ id: postId, status: "failed", error_code: "provider_output_empty_en", sources: [{ url: "https://europass.europa.eu/en", checked_at: "2026-10-18" }] }]);
    throw new Error("unexpected_generation_or_publication_call");
  });
  const request = (id: string) => new NextRequest(`https://test.invalid/api/admin/academy-automation?post_id=${id}`, {
    headers: { authorization: "Bearer test-token" },
  });
  const response = await GET(request(postId));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const result = await response.json();
  assert.equal(result.post.status, "draft");
  assert.deepEqual(result.versions, versions);
  assert.equal(result.sources.length, 1);
  assert.equal(result.editing_locked, false);
  assert.deepEqual(result.run, { id: postId, status: "failed", error_code: "provider_output_empty_en" });
  assert.equal(databaseCalls, 3);
  assert.equal((await GET(request("invalid"))).status, 400);
  assert.equal(databaseCalls, 3);
  missing = true;
  assert.equal((await GET(request(postId))).status, 404);
});

test("failed regeneration history links its original even outside the latest 30 runs", async context => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const parentId = "10000000-0000-0000-0000-000000000001";
  const postId = "10000000-0000-0000-0000-000000000002";
  let parentReads = 0;
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.ok(!init?.method || init.method === "GET" || init.method === "HEAD", "reading history must never generate, publish or clear failures");
    if (url.pathname === "/auth/v1/user") return Response.json({ id: parentId, is_anonymous: false });
    if (url.pathname === "/rest/v1/profiles") return Response.json({ role: "admin", locale: "pt" });
    if (url.pathname.endsWith("/academy_generation_runs")) {
      assert.equal(url.searchParams.get("status"), "neq.deleted");
      if (url.searchParams.has("id")) {
        assert.equal(url.searchParams.get("id"), `in.(${parentId})`);
        assert.equal(url.searchParams.has("limit"), false);
        parentReads++;
        return Response.json([{ id: parentId, post_id: postId, status: "published" }]);
      }
      assert.equal(url.searchParams.get("limit"), "30");
      return Response.json([{ id: "failed-run", post_id: null, status: "failed", error_code: "source_unavailable", regenerated_from: parentId }]);
    }
    if (url.pathname.endsWith("/academy_automation_settings")) return Response.json({ enabled: true });
    if (url.pathname.endsWith("/academy_topics")) { assert.equal(url.searchParams.get("enabled"), "eq.true"); assert.equal(url.searchParams.get("order"), "priority.asc,created_at.asc,id.asc"); return Response.json([]); }
    if (url.pathname.endsWith("/academy_monthly_usage")) return Response.json([]);
    if (url.pathname.endsWith("/academy_email_deliveries")) return new Response(null, { headers: { "content-range": "*/0" } });
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  const response = await GET(new NextRequest("https://test.invalid/api/admin/academy-automation", {
    headers: { authorization: "Bearer test-token" },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const { runs } = await response.json();
  assert.equal(parentReads, 1);
  assert.equal(runs[0].error_code, "source_unavailable", "preserve the historical failure");
  assert.equal(runs[0].post_id, null, "do not present the original as the regenerated draft");
  assert.deepEqual(runs[0].original, { id: parentId, post_id: postId, status: "published" });
});

test("only admins can delete one article or failed attempt; invalid targets never reach deletion", async context => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const target = "10000000-0000-0000-0000-000000000002";
  let role = "company", error: string | null = null;
  const deletions: unknown[] = [];
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json({ id: target, is_anonymous: false, user_metadata: { role: "admin" } });
    if (url.pathname === "/rest/v1/profiles") return Response.json({ role, locale: "pt" });
    if (url.pathname.endsWith("/consume_api_limit")) return new Response(null, { status: 204 });
    if (url.pathname.endsWith("/academy_delete_content")) {
      deletions.push(JSON.parse(String(init?.body)));
      return error ? Response.json({ message: error, code: "P0001" }, { status: 400 }) : Response.json({ success: true, post_id: target });
    }
    throw new Error(`Unexpected operation: ${url.pathname}`);
  });
  const request = (body: unknown) => new NextRequest("https://test.invalid/api/admin/academy-automation", {
    method: "DELETE", headers: { authorization: "Bearer test-token" }, body: JSON.stringify(body),
  });
  for (role of ["company", "student"]) assert.equal((await DELETE(request({ post_id: target }))).status,403);
  role = "admin";
  for (const body of [null, [], {}, { post_id: target, run_id: target }, { run_id: "bad" }, { post_id: "10000000----------------------------" }]) {
    assert.equal((await DELETE(request(body))).status,400);
  }
  assert.equal(deletions.length,0);
  assert.equal((await DELETE(request({post_id:target}))).status,200);
  assert.equal((await DELETE(request({run_id:target}))).status,200);
  assert.deepEqual(deletions,[{target_post:target,target_run:null},{target_post:null,target_run:target}]);
  error="academy_delete_busy";
  const busy=await DELETE(request({run_id:target}));
  assert.equal(busy.status,409);
  assert.equal((await busy.json()).error,"academy_delete_busy");
  error="private database diagnostic";
  const failure=await DELETE(request({post_id:target}));
  assert.equal(failure.status,500);
  assert.equal((await failure.json()).error,"academy_delete_failed");
});


test("regeneration rejects a missing request ID before AI or database generation", async context => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/auth/v1/user")) return Response.json({ id: "10000000-0000-0000-0000-000000000001", is_anonymous: false });
    if (url.includes("/rest/v1/profiles")) return Response.json({ role: "admin", locale: "pt" });
    if (url.includes("/rpc/consume_api_limit")) {
      assert.equal(JSON.parse(String(init?.body)).p_operation, "academy_admin");
      return new Response(null, { status: 204 });
    }
    throw new Error("unexpected_generation_call");
  });
  const response = await POST(new NextRequest("https://test.invalid/api/admin/academy-automation", {
    method: "POST", headers: { authorization: "Bearer test-token" },
    body: JSON.stringify({ action: "regenerate", run_id: "10000000-0000-0000-0000-000000000002" }),
  }));
  assert.equal(response.status, 400);
});

test("admin can edit a compact translation using the saved Portuguese reference", async context => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const postId = "10000000-0000-0000-0000-000000000002";
  const original = `## One\n${"Para o teu trabalho, descreve uma experiência e as competências relevantes. ".repeat(57)}\n## Two\n- Checklist\n## Three\nExamples.`;
  const content = `## One\n${"Beschreiben Sie die Erfahrung und Ihre Fähigkeiten mit Beispielen für Ihren Beruf. ".repeat(43)}\n## Two\n- Checklist\n## Three\nExamples.`;
  let edits = 0;
  context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json({ id: postId, is_anonymous: false });
    if (url.pathname === "/rest/v1/profiles") return Response.json({ role: "admin", locale: "pt" });
    if (url.pathname.endsWith("/consume_api_limit")) return new Response(null, { status: 204 });
    if (url.pathname.endsWith("/academy_post_translations")) {
      assert.equal(url.searchParams.get("post_id"), `eq.${postId}`);
      assert.equal(url.searchParams.get("locale"), "eq.pt");
      return Response.json({ content: original });
    }
    if (url.pathname.endsWith("/academy_edit_translation")) {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.payload.content, content);
      assert.equal(body.payload.review_required, true);
      edits++; return new Response(null, { status: 204 });
    }
    throw new Error("unexpected_generation_or_publication_call");
  });
  const response = await POST(new NextRequest("https://test.invalid/api/admin/academy-automation", {
    method: "POST", headers: { authorization: "Bearer test-token" },
    body: JSON.stringify({ action: "translation", post_id: postId, locale: "de", article: { title: "Feedback", excerpt: "Hinweise", content, seo_title: "Feedback", seo_description: "Hinweise", reading_time: "3 min", review_required: false } }),
  }));
  assert.equal(response.status, 200);
  assert.equal(edits, 1);
});
