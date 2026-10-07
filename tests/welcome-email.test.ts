import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { welcomeEmailContent, sendWelcomeEmail, type WelcomeDelivery } from '../lib/welcome-email';
import { processWelcomeEmails } from '../lib/welcome-email-worker';
import { GET } from '../app/api/cron/welcome-emails/route';
const row: WelcomeDelivery = { id:'delivery-1',lease_id:'lease-1',user_id:'user-1',recipient_email:'user@example.invalid',recipient_name:'<script>Name</script>',locale:'pt',article:{title:'<script>Title</script>',excerpt:'Useful <img src=x> summary',slug:'latest-article',locale:'pt'} };
const config={apiKey:'synthetic',from:'ARYNQO <no-reply@example.invalid>',baseUrl:'https://arynqo.example'};
function configure(){process.env.NEXT_PUBLIC_SUPABASE_URL='https://database.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic';process.env.RESEND_API_KEY=config.apiKey;process.env.NEXT_PUBLIC_APP_URL=config.baseUrl;}

test('welcome is localized, includes the published article, escapes text and has no activation token',()=>{
  for(const locale of ['pt','en','fr','es','de','it']) {
    const content=welcomeEmailContent({...row,locale},config.baseUrl);
    assert.ok(!content.html.includes('<script>'));assert.ok(!content.html.includes('<img src=x>'));
    assert.ok(content.text.includes(`https://arynqo.example${locale==='pt'?'':`/${locale}`}/login`));
    assert.ok(content.text.includes('https://arynqo.example/academia/latest-article'),'fallback article keeps original language');
    assert.ok(!content.html.includes('token_hash'));assert.ok(content.text.includes('Title'));
  }
  const translated=welcomeEmailContent({...row,article:{title:'English article',excerpt:'Summary',slug:'latest-article',locale:'en'}},config.baseUrl);
  assert.ok(translated.text.includes('/en/academia/latest-article'));
  for(const article of [null,{title:'Unsafe',slug:'//evil.example',locale:'pt'}]) {
    const content=welcomeEmailContent({...row,article},config.baseUrl);
    assert.ok(!content.text.includes('/academia/'));assert.ok(content.text.includes('/login'));
  }
  assert.throws(()=>welcomeEmailContent(row,'http://arynqo.example'));
});

test('retries send identical content with the same idempotency key; provider failures expose no private details',async()=>{
  const requests:{key:string|null;body:string}[]=[];
  const transport:typeof fetch=async(_url,init)=>{requests.push({key:new Headers(init?.headers).get('Idempotency-Key'),body:String(init?.body)});return Response.json({id:'accepted'});};
  assert.deepEqual(await sendWelcomeEmail(row,config,transport),{outcome:'sent',provider:'accepted'});
  await sendWelcomeEmail({...row,lease_id:'second-lease'},config,transport);
  assert.deepEqual(requests[0],requests[1]);assert.equal(requests[0].key,'welcome-email/delivery-1');
  assert.equal(JSON.parse(requests[0].body).to,row.recipient_email);
  for(const status of [429,500,503]) assert.equal((await sendWelcomeEmail(row,config,async()=>Response.json({private:'secret'},{status}))).outcome,'retry');
  assert.deepEqual(await sendWelcomeEmail(row,config,async()=>Response.json({private:'secret'},{status:403})),{outcome:'failed',reason:'provider_http_403'});
  assert.equal((await sendWelcomeEmail(row,config,async()=>{throw Error('network');})).outcome,'retry');
  assert.equal((await sendWelcomeEmail(row,config,async()=>Response.json({}))).outcome,'retry');
});

test('activation worker processes only its account and persists the delivery lease',async()=>{
  configure();let sends=0,claims=0,completed=0;
  const db={rpc:async(name:string,params:Record<string,unknown>)=>{
    if(name==='claim_welcome_email'){claims++;assert.equal(params.person,row.user_id);return {data:row,error:null};}
    assert.equal(name,'finish_welcome_email');assert.equal(params.lease,row.lease_id);assert.equal(params.outcome,'sent');completed++;return {error:null};
  }} as unknown as SupabaseClient;
  const result=await processWelcomeEmails({userId:row.user_id,db,transport:async()=>{sends++;return Response.json({id:'accepted'});}});
  assert.equal(result.sent,1);assert.equal(sends,1);assert.equal(claims,1);assert.equal(completed,1);
});

test('worker stops on rate limits or failed persistence and never starts without configuration',async context=>{
  configure();let sends=0;
  const db={rpc:async(name:string)=>name==='claim_welcome_email'?{data:row,error:null}:{error:null}} as unknown as SupabaseClient;
  assert.equal((await processWelcomeEmails({db,intervalMs:0,transport:async()=>{sends++;return Response.json({},{status:429});}})).retry,1);assert.equal(sends,1);
  const failedDb={rpc:async(name:string)=>name==='claim_welcome_email'?{data:row,error:null}:{error:{message:'private'}}} as unknown as SupabaseClient;
  await assert.rejects(processWelcomeEmails({db:failedDb,transport:async()=>Response.json({id:'accepted'})}),/result_not_saved/);
  context.mock.method(globalThis,'fetch',async()=>{throw Error('unexpected network');});
  delete process.env.RESEND_API_KEY;assert.equal((await processWelcomeEmails()).configured,false);
  delete process.env.CRON_SECRET;assert.equal((await GET(new Request('https://test.invalid'))).status,503);
  process.env.CRON_SECRET='test-secret';assert.equal((await GET(new Request('https://test.invalid'))).status,401);
  assert.equal((await GET(new Request('https://test.invalid',{headers:{authorization:'Bearer test-secret'}}))).status,503);
});
