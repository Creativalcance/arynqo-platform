import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GET} from '../app/api/vagas/[id]/empresa/route';
import {hideCompanyNames} from '../lib/job-visibility';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://visibility.test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
const id='10000000-0000-0000-0000-000000000001';
test('public list redaction preserves order and never mutates authenticated results',()=>{
 const jobs=[{id:'internal',company_name:'Private Company'},{id:'external',company_name:'External Employer'}];
 assert.deepEqual(hideCompanyNames(jobs),[{id:'internal',company_name:''},{id:'external',company_name:''}]);
 assert.equal(jobs[0].company_name,'Private Company');
});
test('anonymous company-detail requests never query the database',async context=>{
 context.mock.method(globalThis,'fetch',async()=>{throw Error('Must not fetch');});
 const response=await GET(new Request('https://arynqo.test'),{params:Promise.resolve({id})});
 assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
test('invalid sessions cannot receive employer identity',async context=>{
 context.mock.method(globalThis,'fetch',async()=>Response.json({message:'Invalid token'},{status:401}));
 const response=await GET(new Request('https://arynqo.test',{headers:{Authorization:'Bearer invalid'}}),{params:Promise.resolve({id})});
 assert.equal(response.status,401);assert.ok(!('company' in await response.json()));
});
test('validated registered accounts receive company details without shared caching',async context=>{
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id,is_anonymous:false});
  if(url.includes('/profiles?'))return Response.json({role:'student',locale:'pt'});
  assert.ok(url.includes('/jobs?'));assert.ok(url.includes('id=eq.'+id));assert.ok(url.includes('is_active=eq.true'));
  return Response.json({company_profiles:{company_name:'Private Company'}});
 });
 const response=await GET(new Request('https://arynqo.test',{headers:{Authorization:'Bearer valid'}}),{params:Promise.resolve({id})});
 assert.equal(response.status,200);assert.equal(response.headers.get('vary'),'Authorization');
 assert.equal((await response.json()).company.company_name,'Private Company');
});
