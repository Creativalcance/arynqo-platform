import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const id = n => `20000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.test_user'',true),'''')::uuid';
    grant usage on schema auth to authenticated,service_role;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
    create table profiles(id uuid primary key,role text,name text,email text,locale text default 'pt');
    grant select on profiles to authenticated,service_role;
    create table account_controls(user_id uuid primary key,status text); grant select on account_controls to service_role;
    create table notification_preferences(user_id uuid primary key,email_enabled boolean default true); grant select on notification_preferences to service_role;
    create table academy_posts(id uuid primary key default gen_random_uuid(),title text,slug text unique,excerpt text,content text,category text,audience text,reading_time text,status text,source_type text,trend_topic text,seo_title text,seo_description text,published_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
    alter table academy_posts enable row level security;
    create policy published on academy_posts for select to anon,authenticated using(status='published');
    grant select on academy_posts to anon,authenticated; grant all on academy_posts to service_role;
    insert into auth.users(id,email,email_confirmed_at) values('${id(1)}','admin@example.invalid',now());
    insert into profiles(id,role,email) values('${id(1)}','admin','admin@example.invalid');
  `);
  for (const name of ['20261001233305_academy_multilingual_automation', '20261006081956_academy_approval_email_outbox', '20261011224500_academy_manual_retry', '20261018215739_academy_regenerate_draft', '20261023214302_academy_delete_content']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'));
  }
  await db.exec(`set role service_role;
    update academy_topics set enabled=false;
    insert into academy_topics(id,title,category,audience,source_urls) values('${id(2)}','Deletion test topic','Carreira','Todos','["https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]');
    update academy_automation_settings set enabled=true,next_due_at=now()-interval '1 day';
    insert into academy_monthly_usage values(date_trunc('month',now())::date,12);
  `);
  return db;
}
const remove = (db, post = null, run = null) => db.query('select academy_delete_content($1,$2) as result', [post,run]);
async function seed(db, n, state = 'review', parent = null) {
  const post = id(n), run = id(n + 100);
  await db.query("insert into academy_posts(id,title,slug,excerpt,content,status,multilingual,approved_by) values($1,'Article',$2,'Summary','Article text',$3,true,$4)", [post,`article-${n}`,state==='published'?'published':'draft',id(1)]);
  for (const language of ['pt','en','fr','es','de','it']) {
    await db.query("insert into academy_post_translations(post_id,locale,title,excerpt,content,seo_title,seo_description,reading_time,quality_passed) values($1,$2,'Title','Summary','Full text','Title','Summary','1 min',true)", [post,language]);
  }
  await db.query("insert into academy_generation_runs(id,topic_id,slot_at,post_id,status,attempts,input_tokens,output_tokens,regenerated_from) values($1,$2,now()+($3*interval '1 second'),$4,$5,2,100,200,$6)", [run,id(2),n,post,state,parent]);
  return { post,run };
}

test('deletion is service-only, atomic, idempotent and preserves separate regenerated articles and usage', async () => {
  const db = await fixture();
  try {
    const original = await seed(db, 10, 'published');
    const child = await seed(db, 11, 'review', original.run);
    assert.ok((await db.query('select id from academy_email_deliveries where post_id=$1', [original.post])).rows.length);
    for (const role of ['anon','authenticated']) {
      await db.exec(`reset role;set role ${role}`);
      await assert.rejects(remove(db, original.post), /permission denied/);
    }
    await db.exec('reset role;set role service_role');
    await assert.rejects(remove(db), /invalid_deletion/);
    await assert.rejects(remove(db, original.post, original.run), /invalid_deletion/);
    await remove(db, original.post);
    for (const table of ['academy_post_translations','academy_email_deliveries','academy_email_events']) {
      assert.equal((await db.query(`select * from ${table} where post_id=$1`,[original.post])).rows.length, 0);
    }
    assert.equal((await db.query('select * from academy_posts where id=$1',[original.post])).rows.length, 0);
    const marker = (await db.query('select status,post_id,input_tokens,output_tokens from academy_generation_runs where id=$1',[original.run])).rows[0];
    assert.deepEqual(marker, {status:'deleted',post_id:null,input_tokens:100,output_tokens:200});
    assert.equal((await db.query('select status from academy_generation_runs where id=$1',[child.run])).rows[0].status,'review');
    assert.equal((await db.query('select * from academy_posts where id=$1',[child.post])).rows.length,1);
    assert.equal((await db.query('select reserved_requests from academy_monthly_usage')).rows[0].reserved_requests,12);
    assert.equal((await remove(db,null,original.run)).rows[0].result.already_deleted,true);
    assert.equal((await remove(db,original.post)).rows[0].result.success,true);
    assert.equal((await db.query('select academy_claim_regeneration($1,$2) as result',[original.run,id(900)])).rows[0].result.reason,'not_regeneratable');
    await db.exec('reset role;set role anon');
    assert.equal((await db.query('select * from academy_posts where id=$1',[original.post])).rows.length,0);
  } finally { await db.close(); }
});

test('failed attempts without a draft disappear without deleting the original or resetting the calendar', async () => {
  const db = await fixture();
  try {
    const original = await seed(db,20,'published');
    await db.query("insert into academy_generation_runs(id,topic_id,slot_at,status,regenerated_from,error_code) values($1,$2,now(),'failed',$3,'source_unavailable')",[id(121),id(2),original.run]);
    await remove(db,null,id(121));
    assert.equal((await db.query('select status from academy_posts where id=$1',[original.post])).rows[0].status,'published');
    const partial = await seed(db,22,'failed',original.run);
    await remove(db,null,partial.run);
    assert.equal((await db.query('select * from academy_posts where id=$1',[partial.post])).rows.length,0);
    assert.equal((await db.query('select status from academy_posts where id=$1',[original.post])).rows[0].status,'published');
    assert.equal((await db.query('select academy_claim_run($1,true) as result',[id(121)])).rows[0].result.reason,'not_retryable');
    await remove(db,original.post);
    assert.equal((await db.query('select academy_claim_run() as result')).rows[0].result.reason,'calendar_empty');
    assert.equal((await db.query("select * from academy_generation_runs where status <> 'deleted'")).rows.length,0);
  } finally { await db.close(); }
});

test('active generation and sending leases protect content; expired workers cannot recreate deleted text', async () => {
  const db = await fixture();
  try {
    const item = await seed(db,30,'running');
    await db.query("update academy_generation_runs set lease_token=$2,lease_until=now()+interval '5 minutes' where id=$1",[item.run,id(700)]);
    await assert.rejects(remove(db,item.post),/academy_delete_busy/);
    await db.query("update academy_generation_runs set lease_until=now()-interval '1 minute' where id=$1",[item.run]);
    await remove(db,item.post);
    await assert.rejects(db.query("select academy_stage_translation($1,$2,'pt','{}')",[item.run,id(700)]),/lease/);
    const published = await seed(db,31,'published');
    await db.query("update academy_email_deliveries set status='processing',lease_until=now()+interval '2 minutes' where post_id=$1",[published.post]);
    await assert.rejects(remove(db,published.post),/academy_delete_busy/);
    assert.equal((await db.query('select status from academy_generation_runs where id=$1',[published.run])).rows[0].status,'published');
    await db.query("update academy_email_deliveries set status='sent',lease_until=null where post_id=$1",[published.post]);
    await remove(db,published.post);
  } finally { await db.close(); }
});

test('manual articles can be deleted without any generation run', async () => {
  const db = await fixture();
  try {
    await db.query("insert into academy_posts(id,title,slug,status) values($1,'Manual draft','manual-draft','draft')",[id(50)]);
    await remove(db,id(50));
    assert.equal((await db.query('select * from academy_posts where id=$1',[id(50)])).rows.length,0);
    assert.equal((await db.query('select * from academy_email_events where post_id=$1',[id(50)])).rows.length,0);
  } finally { await db.close(); }
});
