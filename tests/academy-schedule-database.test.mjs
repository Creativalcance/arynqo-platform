import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = new URL('../supabase/migrations/20261025215806_academy_four_day_schedule.sql', import.meta.url);
async function fixture(limit = 120) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
    create table profiles(id uuid primary key,role text); grant select on profiles to authenticated;
    create table academy_posts(id uuid primary key default gen_random_uuid(),title text,slug text unique,excerpt text,content text,category text,audience text,reading_time text,status text,source_type text,trend_topic text,seo_title text,seo_description text,published_at timestamptz,updated_at timestamptz default now());
    grant all on academy_posts to service_role;`);
  for (const name of ['20261001233305_academy_multilingual_automation','20261011224500_academy_manual_retry','20261018215739_academy_regenerate_draft']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url),'utf8'));
  }
  await db.exec(`update academy_automation_settings set enabled=true,monthly_request_limit=${limit},next_due_at=date_trunc('day',now())+interval '1 day 9 hours';
    insert into academy_monthly_usage values(date_trunc('month',now())::date,120);
    insert into academy_posts(title,slug,status,content) values('Existing article','existing','published','Preserved content');`);
  return db;
}

test('four-day migration raises the applied limit, extends the next slot and preserves usage and articles', async () => {
  const db = await fixture();
  try {
    const previous = (await db.query('select next_due_at from academy_automation_settings')).rows[0].next_due_at;
    await db.exec(await readFile(migration,'utf8'));
    const settings = (await db.query('select * from academy_automation_settings')).rows[0];
    assert.equal(settings.interval_days,4);
    assert.equal(settings.monthly_request_limit,300);
    assert.equal(settings.enabled,true);
    assert.equal(settings.auto_publish,false);
    assert.equal(+new Date(settings.next_due_at)-+new Date(previous),2*86_400_000);
    assert.equal((await db.query('select reserved_requests from academy_monthly_usage')).rows[0].reserved_requests,120);
    assert.equal((await db.query('select content from academy_posts')).rows[0].content,'Preserved content');
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select academy_claim_run()'),/permission denied/);
      await assert.rejects(db.query('update academy_automation_settings set monthly_request_limit=600'),/permission denied/);
      await db.exec('reset role');
    }
  } finally { await db.close(); }
});

test('cron uses four days at 09:00 UTC without catch-up, while retries preserve the slot and respect quota', async () => {
  const db = await fixture(450);
  try {
    await db.exec(await readFile(migration,'utf8'));
    assert.equal((await db.query('select monthly_request_limit from academy_automation_settings')).rows[0].monthly_request_limit,450,'preserve a higher configured limit');
    await db.exec("set role service_role; set time zone 'Pacific/Auckland'");
    assert.equal((await db.query('select academy_claim_run() as claim')).rows[0].claim.reason,'not_due');
    await db.exec("update academy_automation_settings set next_due_at=now()-interval '20 days',monthly_request_limit=300");
    const run = (await db.query('select academy_claim_run() as claim')).rows[0].claim;
    assert.ok(run.id,'120 existing reservations no longer block generation');
    const dates = (await db.query("select next_due_at, ((date_trunc('day',now() at time zone 'UTC')+interval '9 hours') at time zone 'UTC')+interval '96 hours' as expected from academy_automation_settings")).rows[0];
    assert.equal(+new Date(dates.next_due_at),+new Date(dates.expected));
    assert.equal((await db.query('select academy_claim_run() as claim')).rows[0].claim.reason,'already_running');
    await db.query("select academy_fail_run($1,$2,'provider_error')",[run.id,run.lease_token]);
    const retry = (await db.query('select academy_claim_run($1,true) as claim',[run.id])).rows[0].claim;
    assert.equal(retry.id,run.id);
    assert.equal(retry.attempts,2);
    assert.equal(+new Date((await db.query('select next_due_at from academy_automation_settings')).rows[0].next_due_at),+new Date(dates.next_due_at));
    await db.query("update academy_generation_runs set status='review',lease_token=null,lease_until=null where id=$1",[run.id]);
    assert.equal((await db.query('select academy_claim_run() as claim')).rows[0].claim.reason,'not_due');
    await db.exec("update academy_monthly_usage set reserved_requests=300; update academy_automation_settings set next_due_at=now()-interval '1 day'");
    assert.equal((await db.query('select academy_claim_run() as claim')).rows[0].claim.reason,'monthly_limit');
    assert.equal((await db.query('select count(*)::int n from academy_generation_runs')).rows[0].n,1);
    await db.exec('update academy_automation_settings set enabled=false');
    assert.equal((await db.query('select academy_claim_run() as claim')).rows[0].claim.reason,'paused');
  } finally { await db.close(); }
});

test('a long-overdue migration resumes at the next daily check and does not create a run', async () => {
  const db = await fixture();
  try {
    await db.exec("update academy_automation_settings set next_due_at=now()-interval '20 days'");
    await db.exec(await readFile(migration,'utf8'));
    const next = (await db.query("select next_due_at>now() and next_due_at<=now()+interval '1 day' as next_check, to_char(next_due_at at time zone 'UTC','HH24:MI') as time from academy_automation_settings")).rows[0];
    assert.equal(next.next_check,true);
    assert.equal(next.time,'09:00');
    assert.equal((await db.query('select count(*)::int n from academy_generation_runs')).rows[0].n,0);
  } finally { await db.close(); }
});
