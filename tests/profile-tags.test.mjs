import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("shared tags are canonical, persistent, private by author and bounded", async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.test_user'', true), '''')::uuid';
   grant usage on schema public,auth to anon,authenticated,service_role;
   create table public.profiles(id uuid primary key, role text);
   grant select on public.profiles to authenticated;
   create table public.student_profiles(id uuid); create table public.skills(name text);
   create table public.jobs(required_skills text[],preferred_skills text[]);
   insert into public.skills values ('React');
   insert into public.profiles values ('10000000-0000-0000-0000-000000000001','student'),('20000000-0000-0000-0000-000000000001','company');`);
  await db.exec(await readFile(new URL("../supabase/migrations/20261001145441_shared_profile_tags_and_country.sql",import.meta.url),"utf8"));
  await db.exec(`set role anon`);
  await assert.rejects(db.query("select public.ensure_profile_tag('Test')"),/permission denied/);
  await assert.rejects(db.query("select label from public.profile_tags"),/permission denied/);
  await db.exec(`reset role; set role authenticated; select set_config('request.test_user','10000000-0000-0000-0000-000000000001',false)`);
  assert.equal((await db.query("select public.ensure_profile_tag('Análise de dados') as label")).rows[0].label,"Análise de dados");
  assert.equal((await db.query("select public.ensure_profile_tag('  ÁNALISE DE dados  ') as label")).rows[0].label,"Análise de dados");
  await assert.rejects(db.query("insert into public.profile_tags(label) values ('Bypass')"),/permission denied/);
  await assert.rejects(db.query("select created_by from public.profile_tags"),/permission denied/);
  await assert.rejects(db.query("select public.ensure_profile_tag('a@example.com')"),/80 caracteres/);
  await db.exec(`select set_config('request.test_user','20000000-0000-0000-0000-000000000001',false)`);
  assert.equal((await db.query("select label from public.profile_tags where normalized_label='analise de dados'")).rows[0].label,"Análise de dados");
  for(let i=0;i<60;i++) await db.query("select public.ensure_profile_tag($1)",[`Test skill ${i}`]);
  await assert.rejects(db.query("select public.ensure_profile_tag('Quota bypass')"),/limite/);
  assert.equal((await db.query("select public.ensure_profile_tag('React') as label")).rows[0].label,"React");
 } finally { await db.close(); }
});
