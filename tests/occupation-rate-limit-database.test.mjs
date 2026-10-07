import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';

test('occupation creation passes the real quota check, deduplicates, and stops at 20 requests',async()=>{
 const db=new PGlite();
 const actor='70000000-0000-4000-8000-000000000001';
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema private;grant usage on schema private,public to service_role;
   create table private.api_limits(user_id uuid not null,operation text not null,window_start timestamptz not null,request_count integer not null,primary key(user_id,operation));
   alter table private.api_limits enable row level security;
   grant select,insert,update on private.api_limits to service_role;
   create table public.matching_occupations(id uuid primary key,label text not null);
   alter table public.matching_occupations enable row level security;
   grant all on public.matching_occupations to service_role;`);
  await db.exec(await readFile('supabase/migrations/20261006161924_external_jobs_api_limit.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261007001210_custom_occupations.sql','utf8'));
  await db.exec('set role service_role');
  const consume=()=>db.query("select public.consume_api_limit($1,'occupation-create',20,3600)",[actor]);
  await assert.rejects(consume(),error=>error.code==='22023');
  await db.exec('reset role');
  const file=(await readdir('supabase/migrations')).find(p=>p.endsWith('_allow_occupation_creation_rate_limit.sql'));
  await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  await db.exec('set role service_role');
  let identity;
  for(let i=0;i<20;i++){
   await consume();
   const rows=(await db.query("select * from public.ensure_custom_occupation('Gestor de carreiras digitais','gestor de carreiras digitais','pt')")).rows;
   identity??=rows[0].id;assert.equal(rows[0].id,identity);
  }
  assert.equal((await db.query('select count(*)::int as count from public.matching_occupations')).rows[0].count,1);
  await assert.rejects(consume(),error=>error.code==='P0001');
  for(const operation of ['ai','matching','notifications','admin-read','admin-export','academy_admin','external_jobs_admin']) await db.query('select public.consume_api_limit($1,$2,20,3600)',[actor,operation]);
  await assert.rejects(db.query("select public.consume_api_limit($1,'unknown',20,3600)",[actor]),error=>error.code==='22023');
  await db.exec("update private.api_limits set window_start=now()-interval '2 hours' where operation='occupation-create'");
  await consume();
  assert.equal((await db.query("select request_count from private.api_limits where operation='occupation-create'")).rows[0].request_count,1);
  for(const role of ['anon','authenticated']){
   await db.exec(`reset role;set role ${role}`);
   await assert.rejects(consume(),/permission denied/);
  }
 }finally{await db.close();}
});
