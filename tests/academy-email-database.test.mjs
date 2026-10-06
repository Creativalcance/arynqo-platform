import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const id = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
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
    create policy admin on academy_posts for all to authenticated using(exists(select 1 from profiles where id=auth.uid() and role='admin')) with check(exists(select 1 from profiles where id=auth.uid() and role='admin'));
    grant select on academy_posts to anon; grant select,insert,update on academy_posts to authenticated; grant all on academy_posts to service_role;
    insert into academy_posts(id,title,slug,excerpt,status,published_at) values('${id(100)}','Old article','old','Old excerpt','published',now());
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261001233305_academy_multilingual_automation.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261006081956_academy_approval_email_outbox.sql', import.meta.url), 'utf8'));
  for (let n=1;n<=8;n++) {
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id(n), `account${n}@example.invalid`]);
    await db.query('insert into profiles(id,role,name,email,locale) values($1,$2,$3,$4,$5)', [id(n), n===1?'admin':n===3?'company':'student', `User ${n}`, 'obsolete@example.invalid', n===3?'en':'pt']);
  }
  await db.exec(`insert into notification_preferences(user_id,email_enabled,academy_updates_enabled) values('${id(4)}',false,true),('${id(5)}',true,false);
    insert into account_controls values('${id(6)}','suspended');
    update auth.users set email_confirmed_at=null where id='${id(7)}';
    update auth.users set banned_until=now()+interval '1 day' where id='${id(8)}';
    set role service_role;`);
  return db;
}
const claim = async db => (await db.query('select claim_academy_email() as delivery')).rows[0].delivery;
const finish = (db,row,outcome='sent') => db.query('select finish_academy_email($1,$2,$3,$4,$5)', [row.id,row.lease_id,outcome,outcome==='sent'?'provider-id':null,outcome==='sent'?null:'provider_acceptance_unknown']);

test('draft notifies only admin; human approval announces once to eligible accounts; edits and republishing never repeat it', async () => {
  const db=await fixture();
  try {
    await db.exec(`insert into academy_posts(id,title,slug,excerpt,status) values('${id(101)}','New article','new-article','A useful excerpt','draft');`);
    let rows=(await db.query('select * from academy_email_deliveries')).rows;
    assert.equal(rows.length,1); assert.equal(rows[0].kind,'review'); assert.equal(rows[0].user_id,id(1));
    assert.equal(rows[0].recipient_email,'account1@example.invalid');
    const review=await claim(db); assert.equal(await claim(db),null); await finish(db,review);
    await assert.rejects(db.exec(`update academy_posts set status='published' where id='${id(101)}'`),/aprovação/);
    await db.exec(`reset role;set role authenticated;set request.test_user='${id(1)}';update academy_posts set status='published' where id='${id(101)}';reset role;set request.test_user='';set role service_role;`);
    rows=(await db.query("select * from academy_email_deliveries where kind='published' order by user_id")).rows;
    assert.deepEqual(rows.map(r=>r.user_id),[id(1),id(2),id(3)]);
    assert.equal(rows[2].locale,'en'); assert.equal(rows[2].content_locale,'pt');
    assert.equal((await db.query(`select approved_by from academy_posts where id='${id(101)}'`)).rows[0].approved_by,id(1));
    await db.exec(`update academy_posts set title='Edited title' where id='${id(101)}';
      reset role;set role authenticated;set request.test_user='${id(1)}';
      update academy_posts set status='archived' where id in('${id(100)}','${id(101)}');
      update academy_posts set status='published' where id in('${id(100)}','${id(101)}');reset role;set request.test_user='';set role service_role;`);
    assert.equal((await db.query("select count(*)::int as n from academy_email_deliveries where kind='published'")).rows[0].n,3);
    assert.equal((await db.query("select article_title from academy_email_deliveries where kind='published' limit 1")).rows[0].article_title,'New article');
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select * from academy_email_deliveries'),/permission denied/);
    await assert.rejects(db.query('select claim_academy_email()'),/permission denied/);
    await db.exec(`reset role;set role authenticated;set request.test_user='${id(2)}'`);
    await assert.rejects(db.query('select * from academy_email_events'),/permission denied/);
    await assert.rejects(db.query('select academy_publish_reviewed($1,$2)',[id(101),id(1)]),/permission denied/);
  } finally { await db.close(); }
});

test('claims recheck suspension, preferences, email and article state; retry leases expire safely without automatic duplicate sends', async () => {
  const db=await fixture();
  try {
    await db.exec(`insert into academy_posts(id,title,slug,excerpt,status) values('${id(102)}','Queued article','queued','Excerpt','draft');`);
    const first=await claim(db); await finish(db,first,'retry');
    assert.equal(await claim(db),null);
    await db.exec("reset role;update academy_email_deliveries set next_attempt_at=now()-interval '1 second';set role service_role");
    const second=await claim(db); assert.equal(second.id,first.id); assert.notEqual(second.lease_id,first.lease_id);
    await assert.rejects(finish(db,first),/lease_lost/);
    await finish(db,second);
    assert.equal(await claim(db),null);
    await db.exec(`update academy_posts set status='published',approved_by='${id(1)}' where id='${id(102)}';
      reset role;insert into account_controls values('${id(2)}','suspended');
      update auth.users set email='changed@example.invalid' where id='${id(3)}';set role service_role;`);
    const admin=await claim(db);assert.equal(admin.user_id,id(1));await finish(db,admin,'retry');
    assert.equal((await db.query("select count(*)::int as n from academy_email_deliveries where status='skipped'")).rows[0].n,2);
    await db.exec("reset role;update academy_email_deliveries set first_attempt_at=now()-interval '25 hours',next_attempt_at=now()-interval '1 second' where status='retry';set role service_role");
    assert.equal(await claim(db),null);
    assert.equal((await db.query("select count(*)::int as n from academy_email_deliveries where status='uncertain'")).rows[0].n,1);
    await db.exec(`insert into academy_posts(id,title,slug,excerpt,status) values('${id(103)}','Withdrawn','withdrawn','Excerpt','draft');update academy_posts set status='archived' where id='${id(103)}';`);
    assert.equal(await claim(db),null);
  } finally { await db.close(); }
});

test('multilingual generation waits for six versions and always requests human approval, even without quality flags', async () => {
  const db=await fixture();
  try {
    await assert.rejects(db.exec('update academy_automation_settings set auto_publish=true'),/academy_requires_approval/);
    const run=(await db.query('select academy_claim_run(null,true) as run')).rows[0].run;
    const draft={title:'Multilingual',slug:'multilingual',excerpt:'Excerpt',content:'Useful words '.repeat(650),category:'Carreira',audience:'Todos',reading_time:'5 min',seo_title:'Title',seo_description:'Description',review_required:false};
    for (const language of ['pt','en','fr','es','de']) await db.query('select academy_stage_translation($1,$2,$3,$4)',[run.id,run.lease_token,language,JSON.stringify({...draft,locale:language})]);
    assert.equal(await claim(db),null);
    await assert.rejects(db.query('select academy_finish_run($1,$2)',[run.id,run.lease_token]),/six_versions_required/);
    await db.query('select academy_stage_translation($1,$2,$3,$4)',[run.id,run.lease_token,'it',JSON.stringify({...draft,locale:'it'})]);
    const result=(await db.query('select academy_finish_run($1,$2) as result',[run.id,run.lease_token])).rows[0].result;
    assert.equal(result.status,'review'); assert.equal(result.review_required,true);
    const notification=await claim(db); assert.equal(notification.kind,'review');await finish(db,notification);
    await assert.rejects(db.query('select academy_publish_reviewed($1,$2)',[result.post_id,id(2)]),/aprovação/);
    await db.query('select academy_publish_reviewed($1,$2)',[result.post_id,id(1)]);
    await db.query('select academy_publish_reviewed($1,$2)',[result.post_id,id(1)]);
    assert.equal((await db.query("select count(*)::int as n from academy_email_deliveries where kind='published'")).rows[0].n,3);
    assert.equal((await db.query("select content_locale from academy_email_deliveries where kind='published' and user_id=$1",[id(3)])).rows[0].content_locale,'en');
  } finally { await db.close(); }
});
