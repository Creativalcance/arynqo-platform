import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {POST} from '../app/api/ai/generate-matches/route';
import {POST as recalculate} from '../app/api/ai/recalculate-job-matches/route';
const candidate='00000000-0000-0000-0000-000000000001',job='00000000-0000-0000-0000-000000000002',company='00000000-0000-0000-0000-000000000003';
const prefs={profession:'00030d09-2b3a-4efd-87cc-c4ea39d27c34',area:'Todas',levels:['senior'],models:['onsite','remote'],skills:['SQL'],confirmed:true};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://matching.test.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-server-only';

test('candidate and company routes save identical criteria; pagination, pending results, stale writes and expired jobs are handled',async(context)=>{
 let role='student',count=1,active=true,stale=false,confirmed=true;
 const saved: Array<Record<string,unknown>>=[];const sourceQueries:URL[]=[];
 context.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input));const path=url.pathname;
  if(path.endsWith('/auth/v1/user'))return Response.json({id:role==='student'?candidate:company,is_anonymous:false});
  if(path.endsWith('/profiles'))return Response.json({role,locale:'pt'});
  if(path.endsWith('/company_profiles'))return Response.json({id:company});
  if(path.endsWith('/rpc/consume_api_limit'))return Response.json(null);
  if(path.endsWith('/profile_tag_aliases'))return Response.json([]);
  if(path.endsWith('/student_profiles')&&url.searchParams.get('select')==='id')return Response.json({id:candidate});
  if(path.endsWith('/jobs')&&url.searchParams.get('select')==='id')return Response.json({id:job});
  if(path.endsWith('/rpc/save_matching_results')){const rows=JSON.parse(String(init?.body)).p_results;saved.push(...rows);return Response.json(stale?0:rows.length);}
  if(path.endsWith('/student_profiles')||path.endsWith('/jobs')){
   sourceQueries.push(url);const isJob=path.endsWith('/jobs');const offset=Number(url.searchParams.get('offset')||0);const limit=Number(url.searchParams.get('limit')||500);
   const rows=isJob?(active?[{id:job,matching_preferences:prefs,matching_revision:2}]:[]):Array.from({length:count},(_,i)=>({id:i===0?candidate:`00000000-0000-0000-0001-${String(i).padStart(12,'0')}`,matching_preferences:{...prefs,confirmed},matching_revision:1}));
   return Response.json(rows.slice(offset,offset+limit));
  }
  throw new Error('Unexpected request '+url);
 });
 const request=(body:object)=>new NextRequest('https://test.invalid/api/ai/generate-matches',{method:'POST',headers:{Authorization:'Bearer test-session'},body:JSON.stringify(body)});
 let response=await POST(request({studentId:candidate}));assert.equal(response.status,200);assert.equal(saved.length,1);const fromCandidate=saved[0];
 role='company';saved.length=0;response=await recalculate(request({jobId:job}));assert.equal(response.status,200);assert.deepEqual(saved[0],fromCandidate);
 const jobQuery=sourceQueries.find(url=>url.pathname.endsWith('/jobs'))!;assert.equal(jobQuery.searchParams.get('is_active'),'eq.true');assert.equal(jobQuery.searchParams.get('deleted_at'),'is.null');assert.equal(jobQuery.searchParams.get('archived_at'),'is.null');assert.match(jobQuery.searchParams.get('or')||'',/expires_at.gt/);
 count=501;confirmed=false;saved.length=0;response=await recalculate(request({jobId:job}));assert.equal(response.status,200);assert.equal(saved.length,501);assert.equal((await response.json()).matches_pending,501);assert.ok(saved.every(row=>row.match_score===null));
 count=1;stale=true;response=await recalculate(request({jobId:job}));assert.equal(response.status,409);
 active=false;stale=false;saved.length=0;response=await recalculate(request({jobId:job}));assert.equal(response.status,409);assert.equal(saved.length,0);
});
