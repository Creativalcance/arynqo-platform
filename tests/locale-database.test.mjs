import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("account locale is persisted at signup, limited to supported languages and protected by ownership", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.test_user'',true),'''')::uuid';
      grant usage on schema public,auth to authenticated;
      create table profiles(id uuid primary key,role text,name text,email text);
      create table student_profiles(user_id uuid,headline text,location text,bio text);
      create table company_profiles(user_id uuid,company_name text,description text,location text);
      create table jobs(id uuid primary key);
      grant select on profiles to authenticated;
      alter table profiles enable row level security;
      create policy own_read on profiles for select to authenticated using(id=auth.uid());
      create policy own_update on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());`);
    const files = await readdir("supabase/migrations");
    const file = files.find(name => name.endsWith("_locale_preferences.sql"));
    await db.exec(await readFile(file ? `supabase/migrations/${file}` : "supabase/pending_locale_preferences.sql", "utf8"));
    await db.exec(`create trigger new_user after insert on auth.users for each row execute function handle_new_user();
      insert into auth.users values('00000000-0000-0000-0000-000000000001','test@example.invalid','{"role":"company","locale":"fr"}'),
        ('00000000-0000-0000-0000-000000000002','other@example.invalid','{"role":"admin","locale":"unsupported"}');`);
    assert.deepEqual((await db.query("select role,locale from profiles order by id")).rows, [{ role: "company", locale: "fr" }, { role: "student", locale: "pt" }]);
    await db.exec("set request.test_user='00000000-0000-0000-0000-000000000001'; set role authenticated;");
    assert.equal((await db.query("update profiles set locale='de' where id='00000000-0000-0000-0000-000000000001' returning locale")).rows[0].locale, "de");
    assert.equal((await db.query("update profiles set locale='it' where id='00000000-0000-0000-0000-000000000002' returning locale")).rows.length, 0);
    await assert.rejects(db.query("update profiles set role='admin'"), /permission denied/i);
    await assert.rejects(db.query("update profiles set locale='xx'"), /check constraint/i);
    await db.exec("reset role;");
    await assert.rejects(db.query("insert into jobs(id,country_code) values(gen_random_uuid(),'ZZ')"), /check constraint/i);
  } finally { await db.close(); }
});
