import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
const countries=['gb','us','at','au','be','br','ca','ch','de','es','fr','in','it','mx','nl','nz','pl','sg','za'];
test('global batches respect budgets, resume countries, reject stale writes and paginate all visible jobs',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as 'select null::uuid';grant usage on schema auth,public to anon,authenticated,service_role;create table public.profiles(id uuid primary key,role text);grant select on public.profiles to authenticated,service_role;
  create table public.company_profiles(id uuid primary key,company_name text);
  create table public.jobs(id uuid primary key,company_id uuid,title text,description text,area text,location text,country_code text,work_mode text,work_model text,contract_type text,seniority text,is_active boolean,created_at timestamptz);
  grant select on public.jobs,public.company_profiles to anon,authenticated,service_role;`);
  for(const file of ['20261006161657_external_job_feed.sql','20261006170117_external_jobs_global.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  const diagnostics=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_external_job_rejection_diagnostics.sql'));assert.ok(diagnostics);await db.exec(await readFile(new URL('../supabase/migrations/'+diagnostics,import.meta.url),'utf8'));
  const priority=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_arynqo_jobs_first.sql'));assert.ok(priority);await db.exec(await readFile(new URL('../supabase/migrations/'+priority,import.meta.url),'utf8'));
  const model=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_job_work_model_filter.sql'));assert.ok(model);await db.exec(await readFile(new URL('../supabase/migrations/'+model,import.meta.url),'utf8'));
  await db.exec('set role service_role');
  await db.query('update external_job_sources set enabled=true,terms_confirmed=true,countries=$1',[countries]);
  const seen=[];
  for(let i=0;i<7;i++){
   const claim=(await db.query('select claim_external_job_batch() c')).rows[0].c;
   assert.ok(claim.countries.length<=3);seen.push(...claim.countries);
   assert.equal((await db.query('select claim_external_job_batch() c')).rows[0].c.skipped,'busy');
   await db.query('select finish_external_job_batch($1,$2,$3,0)',[claim.lease,'[]','{}']);
   await assert.rejects(db.query('select finish_external_job_batch($1,$2,$3,0)',[claim.lease,'[]','{}']),/Stale import/);
   await db.exec("update external_job_sync_state set started_at=now()-interval '2 minutes'");
  }
  assert.equal(new Set(seen).size,19);assert.equal(seen.length,19);
  assert.equal((await db.query('select reserved_requests from external_job_sync_state')).rows[0].reserved_requests,38);
  assert.equal((await db.query('select claim_external_job_batch() c')).rows[0].c.skipped,'up_to_date');
  await db.exec("update external_job_country_sync set next_run_at=now() where country='fr'");
  const failed=(await db.query('select claim_external_job_batch() c')).rows[0].c;
  await db.query('select finish_external_job_batch($1,$2,$3,0)',[failed.lease,'[]',JSON.stringify({fr:'old_adverts'})]);
  assert.equal((await db.query("select error_code from external_job_country_sync where country='fr'")).rows[0].error_code,'old_adverts');
  await db.exec("update external_job_sync_state set started_at=now()-interval '2 minutes',reserved_requests=60");
  assert.equal((await db.query('select claim_external_job_batch() c')).rows[0].c.skipped,'daily_budget');
  await db.exec("update external_job_sync_state set reserved_requests=0;update external_job_country_sync set next_run_at=now() where country='fr'");
  const cancelled=(await db.query('select claim_external_job_batch() c')).rows[0].c;
  await db.exec('update external_job_sources set enabled=false,updated_at=now()');
  assert.equal((await db.query('select finish_external_job_batch($1,$2,$3,0) n',[cancelled.lease,'[]','{}'])).rows[0].n,0);
  await db.exec("update external_job_sources set enabled=true;insert into external_jobs(provider,provider_id,country_code,title,company_name,location,created_at,expires_at) select 'adzuna',n::text,'FR','Developer '||n,'Company '||n,'Paris',now(),now()+interval '1 day' from generate_series(1,650) n;");
  await db.exec('reset role;set role anon');
  const search=async(filter={},page=1)=>(await db.query('select search_public_jobs($1,$2) result',[JSON.stringify(filter),page])).rows[0].result;
  const first=await search();assert.equal(first.total,650);assert.equal(first.jobs.length,20);assert.equal((await search({},33)).jobs.length,10);
  assert.equal((await search({q:'Developer 650'})).total,1);
  assert.equal((await search({country:'DE'})).total,0);
  assert.equal(first.jobs.some(j=>'source_url' in j),false);assert.equal(first.jobs[0].description,null);
  await assert.rejects(db.query('select claim_external_job_batch()'),/permission denied/);
  await assert.rejects(db.query('select * from external_job_country_sync'),/permission denied/);
  await db.exec("reset role;insert into company_profiles values ('10000000-0000-0000-0000-000000000001','Company 650');insert into jobs(id,company_id,title,description,country_code,location,is_active,created_at) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Developer 650','Internal description','FR','Paris',true,now());set role anon");
  const duplicate=await search({q:'Developer 650'});assert.equal(duplicate.total,1);assert.equal(duplicate.jobs[0].origin,null);
  // More internal jobs than fit on one page, all older than the external jobs.
  await db.exec("reset role;update jobs set created_at=now()-interval '10 days';insert into jobs(id,company_id,title,description,country_code,location,is_active,created_at) select gen_random_uuid(),'10000000-0000-0000-0000-000000000001','Priority developer '||n,'Internal','FR','Paris',true,now()-interval '10 days' from generate_series(1,24) n;set role anon");
  for(const filter of [{},{country:'FR'},{q:'developer'},{location:'Paris'}]){
   const page1=await search(filter,1),page2=await search(filter,2);
   assert.equal(page1.jobs.length,20);assert.ok(page1.jobs.every(j=>j.origin===null));
   assert.ok(page2.jobs.slice(0,5).every(j=>j.origin===null));assert.ok(page2.jobs.slice(5).every(j=>j.origin==='external'));
  }
  assert.ok((await search({origin:'external'})).jobs.every(j=>j.origin==='external'));
  assert.equal((await search({origin:'internal'})).total,25);
  await db.exec("reset role;update jobs set work_model='Presencial';set role anon");assert.equal((await search({model:'presential'})).total,25);assert.equal((await search({model:'remote'})).total,0);
  await db.exec('reset role;update external_job_sources set enabled=false;set role anon');assert.equal((await search()).total,25);
 }finally{await db.close();}
});
