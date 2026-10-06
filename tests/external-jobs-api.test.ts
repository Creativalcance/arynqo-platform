import assert from 'node:assert/strict';
import {test,type TestContext} from 'node:test';
import {GET as readOffer} from '../app/api/external-jobs/[id]/route';
import {GET as readAdmin,POST as writeAdmin} from '../app/api/admin/external-jobs/route';
import {GET as cron} from '../app/api/cron/external-jobs/route';
import {safeReturnPath} from '../lib/seo';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://external.test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.CRON_SECRET='test-cron';
const id='10000000-0000-0000-0000-000000000001';
function mock(context:TestContext,role:string,expired=false){const calls:string[]=[];context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL)=>{
 const url=String(input);calls.push(url);
 if(url.endsWith('/auth/v1/user'))return Response.json({id,is_anonymous:false});
 if(url.includes('/profiles?'))return Response.json({role,locale:'pt'});
 if(url.includes('/rpc/consume_api_limit'))return Response.json(null);
 if(url.includes('/rpc/configure_external_jobs'))return Response.json(null);
 if(url.includes('/external_job_details?'))return Response.json({description:'Private excerpt',source_url:'https://www.adzuna.fr/jobs/land/ad/1',external_jobs:{id,title:'Developer',company_name:'Example',location:'Paris',country_code:'FR',created_at:new Date().toISOString(),last_seen_at:new Date().toISOString(),expires_at:new Date(Date.now()+(expired?-1:1)*86400000).toISOString()}});
 throw new Error('Unexpected request');
 });return calls;}
function request(token=true){return new Request('https://arynqo.test.invalid/api/external-jobs/'+id,{headers:token?{authorization:'Bearer test'}:{}});}
test('anonymous and company accounts never receive an external destination',async context=>{
 const calls=mock(context,'company');const anon=await readOffer(request(false),{params:Promise.resolve({id})});assert.equal(anon.status,401);assert.equal((await readOffer(request(),{params:Promise.resolve({id})})).status,403);assert.ok(!calls.some(url=>url.includes('external_job_details')));
 assert.equal((await readAdmin(request())).status,403);assert.equal((await writeAdmin(request())).status,403);
});
test('registered candidates receive details without shared caching; expired offers remain inaccessible',async context=>{
 mock(context,'student');const response=await readOffer(request(),{params:Promise.resolve({id})});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Authorization');assert.equal((await response.json()).source_url,'https://www.adzuna.fr/jobs/land/ad/1');
});
test('expired details do not return an application URL',async context=>{mock(context,'student',true);const response=await readOffer(request(),{params:Promise.resolve({id})});assert.equal(response.status,404);assert.ok(!('source_url' in await response.json()));});
test('cron requires its secret and does no work before configuration',async()=>{
 assert.equal((await cron(request(false))).status,401);delete process.env.ADZUNA_APP_ID;delete process.env.ADZUNA_APP_KEY;
 const response=await cron(new Request('https://arynqo.test.invalid/api/cron/external-jobs',{headers:{authorization:'Bearer test-cron'}}));assert.deepEqual(await response.json(),{skipped:'credentials'});
});
test('registration return paths allow an external job but block arbitrary or cross-origin redirects',()=>{
 assert.equal(safeReturnPath('/vagas/externas/'+id),'/vagas/externas/'+id);assert.equal(safeReturnPath('/fr/vagas/externas/'+id),'/fr/vagas/externas/'+id);
 for(const unsafe of ['https://evil.test','//evil.test','/admin','/vagas/externas/'+id+'?next=https://evil.test'])assert.equal(safeReturnPath(unsafe),'/dashboard');
});

test('administrators can save a paused source and cannot enable it without provider credentials',async context=>{
 const calls=mock(context,'admin');delete process.env.ADZUNA_APP_ID;delete process.env.ADZUNA_APP_KEY;
 const req=(enabled:boolean)=>new Request('https://arynqo.test.invalid/api/admin/external-jobs',{method:'POST',headers:{authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({action:'settings',settings:{enabled,countries:['fr'],terms_confirmed:true}})});
 assert.equal((await writeAdmin(req(false))).status,200);assert.equal((await writeAdmin(req(true))).status,400);assert.equal(calls.filter(url=>url.includes('/rpc/configure_external_jobs')).length,1);
});
