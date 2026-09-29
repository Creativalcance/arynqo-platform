import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("migration blocks privilege changes, preserves registration and bounds API calls", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as
        'select nullif(current_setting(''request.test_user'', true), '''')::uuid';
      grant usage on schema auth to authenticated;
      create table public.profiles (
        id uuid primary key, role text not null, name text not null, email text not null,
        avatar_url text, created_at timestamptz default now(), subscription_plan text default 'free',
        subscription_status text default 'active', job_view_limit integer default 5
      );
      alter table public.profiles enable row level security;
      create policy own_profile on public.profiles for all to authenticated
        using (id = auth.uid()) with check (id = auth.uid());
      create table public.student_profiles (user_id uuid, headline text, location text, bio text);
      create table public.company_profiles (user_id uuid, company_name text, description text, location text);
      create table public.notifications (
        id uuid default gen_random_uuid(), user_id uuid, title text, message text, is_read boolean,
        created_at timestamptz, related_type text, related_id uuid, related_url text,
        action_label text, email_status text, email_sent_at timestamptz, push_status text,
        push_sent_at timestamptz, channels text[]
      );
      grant all on all tables in schema public to authenticated, service_role;
      create table auth.test_users (id uuid, email text, raw_user_meta_data jsonb);
      insert into public.profiles(id,role,name,email) values
        ('10000000-0000-0000-0000-000000000001','student','Test','test@example.invalid');
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20260929224858_secure_account_roles_and_api_events.sql", import.meta.url), "utf8"));
    await db.exec(`create trigger register_test after insert on auth.test_users
      for each row execute function public.handle_new_user();`);
    await db.exec(`insert into auth.test_users values
      ('20000000-0000-0000-0000-000000000001','other@example.invalid','{"role":"admin","subscription_plan":"premium"}'),
      ('30000000-0000-0000-0000-000000000001','company@example.invalid','{"role":"company"}');`);
    const registered = await db.query("select role,subscription_plan from public.profiles where id <> '10000000-0000-0000-0000-000000000001' order by id");
    assert.deepEqual(registered.rows, [{ role: "student", subscription_plan: "free" }, { role: "company", subscription_plan: "free" }]);
    await db.exec("set role authenticated; set request.test_user = '10000000-0000-0000-0000-000000000001';");
    await db.exec("update public.profiles set name='Updated' where id=auth.uid();");
    for (const change of ["role='admin'", "subscription_plan='premium'", "subscription_status='active'", "job_view_limit=999", "email='forged@example.invalid'"]) {
      await assert.rejects(db.exec(`update public.profiles set ${change} where id=auth.uid();`), /permission denied/);
    }
    await assert.rejects(db.exec("insert into public.profiles(id,role,name,email) values(gen_random_uuid(),'admin','Forged','forged@example.invalid');"), /permission denied/);
    await assert.rejects(db.exec("insert into public.notifications(title) values('Forged');"), /permission denied/);
    await assert.rejects(db.exec("select public.consume_api_limit(auth.uid(),'ai',2,900);"), /permission denied/);
    await db.exec("reset role; set role service_role;");
    await db.exec("select public.consume_api_limit('10000000-0000-0000-0000-000000000001','ai',2,3600);");
    await db.exec("select public.consume_api_limit('10000000-0000-0000-0000-000000000001','ai',2,3600);");
    await assert.rejects(db.exec("select public.consume_api_limit('10000000-0000-0000-0000-000000000001','ai',2,3600);"), /API request limit reached/);
    await db.exec("insert into public.notifications(event_key) values('same-event');");
    await assert.rejects(db.exec("insert into public.notifications(event_key) values('same-event');"), /duplicate key/);
  } finally {
    await db.close();
  }
});
