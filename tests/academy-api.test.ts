import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/admin/academy-automation/route";
import { GET as cron } from "../app/api/cron/generate-academy-post/route";
test("automation admin endpoints deny anonymous requests before any network call", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected_network_call");
  });
  assert.equal(
    (
      await GET(
        new NextRequest("https://test.invalid/api/admin/academy-automation"),
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
  assert.equal(calls.length, 2);
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
  if(url.includes('/rest/v1/academy_automation_settings')){const body=JSON.parse(String(init?.body));assert.equal(body.enabled,false);assert.equal(body.auto_publish,false);assert.equal(body.monthly_request_limit,120);saved=true;return new Response(null,{status:204});}
  throw new Error('unexpected_provider_or_database_call');
 });
 const request=new NextRequest('https://test.invalid/api/admin/academy-automation',{method:'POST',headers:{authorization:'Bearer test-token'},body:JSON.stringify({action:'settings',enabled:false,auto_publish:false,monthly_request_limit:120})});
 assert.equal((await POST(request)).status,200);assert.deepEqual(operations,['academy_admin']);assert.equal(saved,true);
});
