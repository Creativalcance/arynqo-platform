import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('admin vacancy deletion is isolated, atomic, retryable and preserves candidate history', async () => {
  const db = new PGlite();
  const actor = '11111111-1111-1111-1111-111111111111';
  const companyUser = '22222222-2222-2222-2222-222222222222';
  const job = '33333333-3333-3333-3333-333333333333';
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
      create table profiles(id uuid primary key, role text);
      create table account_controls(user_id uuid primary key, status text);
      create table company_profiles(id uuid primary key, user_id uuid);
      create table jobs(id uuid primary key, company_id uuid references company_profiles(id), title text,
        is_active boolean, is_featured boolean, renewal_requested_at timestamptz, renewal_deadline timestamptz);
      create table applications(id int primary key, job_id uuid references jobs(id) on delete cascade);
      create table admin_access_log(id uuid primary key default gen_random_uuid(), actor_id uuid, action text,
        dataset text, target_id uuid, row_count int, created_at timestamptz default now(),
        constraint admin_access_log_action_check check(action in ('consultar','exportar','descarregar')));
      alter table admin_access_log enable row level security;
      grant usage on schema public to anon, authenticated, service_role;
      grant select on profiles, account_controls, jobs to service_role;
      grant update on jobs to service_role;
      grant select, insert on admin_access_log to service_role;
      insert into profiles values('${actor}','admin'),('${companyUser}','company');
      insert into company_profiles values('${companyUser}','${companyUser}');
      insert into jobs values('${job}','${companyUser}','Designer',true,true,now(),now());
      insert into applications values(1,'${job}');
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/20261006212609_job_archive_delete.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261007111235_admin_delete_job.sql', import.meta.url), 'utf8'));
    const remove = (user = actor, title = 'Designer', id = job) => db.query('select admin_delete_job($1,$2,$3)', [user, id, title]);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(remove(), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    await assert.rejects(remove(companyUser), /Administrator required/);
    for (const title of [null, '', 'Other title']) await assert.rejects(remove(actor, title), /Confirmation mismatch/);
    await assert.rejects(remove(actor, 'Designer', actor), /Vacancy not found/);
    await db.exec(`reset role; insert into account_controls values('${actor}','suspended'); set role service_role;`);
    await assert.rejects(remove(), /Administrator required/);
    await db.exec(`reset role; delete from account_controls;
      alter table admin_access_log add constraint simulate_audit_failure check(action <> 'eliminar');
      set role service_role;`);
    await assert.rejects(remove(), /simulate_audit_failure/);
    let vacancy = (await db.query('select * from jobs')).rows[0];
    assert.equal(vacancy.deleted_at, null);
    assert.equal(vacancy.is_active, true);
    await db.exec('reset role; alter table admin_access_log drop constraint simulate_audit_failure; set role service_role;');
    await remove();
    vacancy = (await db.query('select * from jobs')).rows[0];
    assert.ok(vacancy.deleted_at);
    assert.equal(vacancy.is_active, false);
    assert.equal(vacancy.is_featured, false);
    assert.equal(vacancy.renewal_deadline, null);
    await remove();
    const logs = (await db.query('select actor_id, action, dataset, target_id, row_count from admin_access_log')).rows;
    assert.deepEqual(logs, [{ actor_id: actor, action: 'eliminar', dataset: 'vagas', target_id: job, row_count: 1 }]);
    await assert.rejects(db.exec('update jobs set deleted_at=null'), /cannot be restored/);
    await assert.rejects(db.exec('delete from admin_access_log'), /permission denied/);
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int as n from applications')).rows[0].n, 1);
  } finally { await db.close(); }
});
