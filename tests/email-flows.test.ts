import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../app/api/auth/confirm/route";
import { notificationEmailContent, sendNotificationEmail } from "../lib/notification-email";

const email = { to: "recipient@example.invalid", name: "<script>name</script>", title: "Candidatura recebida", message: "Teste <img src=x>", relatedUrl: "/dashboard/candidaturas", eventKey: "application:test:created" };
test("branded notification escapes user content and rejects external destinations", () => {
  const c=notificationEmailContent(email,"https://arynqo.example");
  assert.match(c.html,/logo-arynqo.png/);assert.match(c.html,/Gerir preferências/);assert.ok(!c.html.includes("<script>"));assert.ok(!c.html.includes("<img src=x>"));assert.match(c.text,/https:\/\/arynqo.example\/dashboard\/candidaturas/);
  for(const relatedUrl of ["https://evil.example","//evil.example","javascript:alert(1)"]) assert.throws(()=>notificationEmailContent({...email,relatedUrl},"https://arynqo.example"));
});
test("provider acceptance, rejection, missing configuration and timeout remain distinct",async()=>{
 const config={apiKey:"synthetic-key",from:"ARYNQO <noreply@example.invalid>",baseUrl:"https://arynqo.example"};
 let calls=0;
 const transport:typeof fetch=async(_url,init)=>{calls++;assert.equal(new Headers(init?.headers).get("Idempotency-Key"),email.eventKey);const body=JSON.parse(String(init?.body));assert.match(body.subject,/^ARYNQO/);assert.ok(body.text);return Response.json({id:"test-delivery"});};
 assert.equal((await sendNotificationEmail(email,config,transport)).sent,true);
 assert.equal((await sendNotificationEmail(email,{...config,apiKey:undefined},transport)).disabled,true);assert.equal(calls,1);
 assert.equal((await sendNotificationEmail(email,config,async()=>Response.json({error:"private provider detail"},{status:403}))).sent,false);
 assert.equal((await sendNotificationEmail(email,config,async()=>{throw new Error("network");})).sent,false);
 assert.equal((await sendNotificationEmail(email,config,async()=>Response.json({}))).sent,false);
});
test("confirmation rejects malformed input and foreign origins without contacting Auth",async()=>{
 const request=(body:unknown,origin="https://arynqo.example")=>new Request("https://arynqo.example/api/auth/confirm",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
 assert.equal((await POST(request({token_hash:"bad"}))).status,400);
 assert.equal((await POST(request({token_hash:"a".repeat(64)},"https://evil.example"))).status,403);
});
test("confirmation returns no session and handles expired tokens",async()=>{
 const originalFetch=globalThis.fetch;
 const previousUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,previousKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://auth.example";process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="synthetic-key";
 const request=()=>new Request("https://arynqo.example/api/auth/confirm",{method:"POST",headers:{origin:"https://arynqo.example","Content-Type":"application/json"},body:JSON.stringify({token_hash:"a".repeat(64),type:"recovery"})});
 try {
  globalThis.fetch=async(_url,init)=>{assert.equal(JSON.parse(String(init?.body)).type,"email");return Response.json({user:{id:"test",email_confirmed_at:"2026-09-30T00:00:00Z"}});};
  const success=await POST(request());assert.equal(success.status,200);assert.deepEqual(await success.json(),{confirmed:true});assert.equal(success.headers.get("set-cookie"),null);
  globalThis.fetch=async()=>Response.json({msg:"Token has expired",code:"otp_expired"},{status:403});
  assert.equal((await POST(request())).status,400);
 } finally {globalThis.fetch=originalFetch;if(previousUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=previousUrl;if(previousKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=previousKey;}
});
