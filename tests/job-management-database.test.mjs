import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';

test('vacancy ownership, archive, restore, logical deletion and history preservation',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated;
   create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   grant usage on schema auth to authenticated;
   create table company_profiles(id uuid primary key,user_id uuid);
   create table jobs(id uuid primary key,company_id uuid references company_profiles(id),is_active boolean,is_featured boolean,renewal_requested_at timestamptz,renewal_deadline timestamptz);
   create table applications(id int primary key,job_id uuid references jobs(id) on delete cascade);
   grant select on company_profiles to authenticated;
   grant all on jobs to authenticated;
   alter table jobs enable row level security;
   create policy own_jobs on jobs for all to authenticated using(company_id in(select id from company_profiles where user_id=auth.uid())) with check(company_id in(select id from company_profiles where user_id=auth.uid()));
   create policy active_jobs on jobs for select to authenticated using(is_active);
   insert into company_profiles values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011'),('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012');
   insert into jobs values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001',true,true,now(),now());
   insert into applications values(1,'00000000-0000-0000-0000-000000000003');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261006212609_job_archive_delete.sql',import.meta.url),'utf8'));
  const id='00000000-0000-0000-0000-000000000003';
  const act=action=>db.query('select manage_owned_job($1,$2)',[id,action]);
  await db.exec(`set role authenticated; set test.uid='00000000-0000-0000-0000-000000000012'`);
  for(const action of ['archive','restore','delete']) await assert.rejects(act(action),/not available/);
  await db.exec(`set test.uid='00000000-0000-0000-0000-000000000011'`);
  await assert.rejects(act('unknown'),/Invalid vacancy action/);
  await act('archive');await act('archive');
  let job=(await db.query('select * from jobs')).rows[0];
  assert.ok(job.archived_at);assert.equal(job.is_active,false);assert.equal(job.is_featured,false);assert.equal(job.renewal_deadline,null);
  await db.exec('update jobs set is_active=true');
  assert.equal((await db.query('select is_active from jobs')).rows[0].is_active,false);
  await act('restore');job=(await db.query('select * from jobs')).rows[0];
  assert.equal(job.archived_at,null);assert.equal(job.is_active,false);
  await act('delete');job=(await db.query('select * from jobs')).rows[0];
  assert.ok(job.deleted_at);assert.equal(job.is_active,false);
  await assert.rejects(act('restore'),/not available/);
  await assert.rejects(db.exec('update jobs set deleted_at=null'),/cannot be restored/);
  await assert.rejects(db.exec('delete from jobs'),/permission denied/);
  await db.exec('reset role');assert.equal((await db.query('select count(*)::int as n from applications')).rows[0].n,1);
  await db.exec('set role anon');await assert.rejects(act('archive'),/permission denied/);
 } finally {await db.close();}
});
