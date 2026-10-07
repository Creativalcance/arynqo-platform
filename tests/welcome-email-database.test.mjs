import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const id = n => `20000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;
    grant usage on schema public to anon,authenticated,service_role;
    create schema auth;grant usage on schema auth to supabase_auth_admin;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,is_anonymous boolean default false,raw_user_meta_data jsonb default '{}');
    grant select,insert,update on auth.users to supabase_auth_admin;
    create table profiles(id uuid primary key,name text,locale text);
    create table account_controls(user_id uuid primary key);
    create table academy_posts(id uuid primary key,title text,excerpt text,slug text,content_locale text,status text,published_at timestamptz);
    create table academy_post_translations(post_id uuid,locale text,title text,excerpt text,quality_passed boolean,primary key(post_id,locale));
    insert into auth.users(id,email,email_confirmed_at) values('${id(1)}','old@example.invalid',now());
    insert into auth.users(id,email) values('${id(2)}','new@example.invalid'),('${id(3)}','original@example.invalid');
    insert into profiles values('${id(2)}','New user','en'),('${id(3)}','Original user','fr');
    insert into academy_posts values
      ('${id(100)}','Older','Older summary','older','pt','published',now()-interval '2 days'),
      ('${id(101)}','Latest','Latest summary','latest','pt','published',now()-interval '1 day'),
      ('${id(102)}','Draft','Draft summary','draft','pt','draft',now()),
      ('${id(103)}','Future','Future summary','future','pt','published',now()+interval '1 day');
    insert into academy_post_translations values('${id(101)}','en','Latest in English','English summary',true),('${id(101)}','fr','Unapproved French','French summary',false);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261007114451_account_welcome_email.sql', import.meta.url), 'utf8'));
  return db;
}
const activate = (db,n) => db.exec(`reset role;set role supabase_auth_admin;update auth.users set email_confirmed_at=now() where id='${id(n)}';reset role;set role service_role;`);
const claim = async (db,n=null) => (await db.query('select claim_welcome_email($1) as delivery',[n===null?null:id(n)])).rows[0].delivery;
const finish = (db,row,outcome='sent') => db.query('select finish_welcome_email($1,$2,$3,$4,$5)',[row.id,row.lease_id,outcome,outcome==='sent'?'provider-id':null,null]);

test('activation queues once, selects the latest published article and snapshots the approved translation',async()=>{
  const db=await fixture();
  try {
    assert.equal((await db.query('select count(*)::int as n from welcome_email_deliveries')).rows[0].n,0,'existing and unconfirmed accounts receive nothing');
    await activate(db,2);
    const first=(await db.query('select * from welcome_email_deliveries')).rows[0];
    assert.equal(first.recipient_email,'new@example.invalid');
    assert.deepEqual(first.article,{title:'Latest in English',excerpt:'English summary',slug:'latest',locale:'en'});
    await activate(db,2);await activate(db,1);
    await db.exec(`reset role;update auth.users set email_confirmed_at=null where id='${id(2)}';`);
    await activate(db,2);
    assert.equal((await db.query('select count(*)::int as n from welcome_email_deliveries')).rows[0].n,1);
    await db.exec(`reset role;update academy_posts set title='Edited',published_at=now() where id='${id(100)}';set role service_role;`);
    assert.deepEqual((await claim(db,2)).article,first.article,'later publication does not change a queued retry payload');
    assert.equal(await claim(db,2),null,'a concurrent claim cannot reserve the same account');
    await activate(db,3);
    assert.equal((await claim(db,3)).article.locale,'pt','missing approved translation uses the original language');
  } finally {await db.close();}
});

test('no article still allows activation; privileged Auth trigger works without table permissions; anonymous clients cannot send welcomes',async()=>{
  const db=await fixture();
  try {
    await db.exec('delete from academy_posts');
    await activate(db,2);
    const row=await claim(db,2);assert.equal(row.article,null);await finish(db,row);
    assert.equal(await claim(db,2),null);
    await db.exec(`reset role;set role supabase_auth_admin;insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('${id(4)}','verified@example.invalid',now(),'{}');reset role;set role service_role;`);
    assert.equal((await claim(db,4)).locale,'pt','already-verified new accounts also work before their profile exists');
    for(const role of ['anon','authenticated']) {
      await db.exec(`reset role;set role ${role}`);
      await assert.rejects(db.query('select * from welcome_email_deliveries'),/permission denied/);
      await assert.rejects(db.query('select claim_welcome_email(null)'),/permission denied/);
      await assert.rejects(finish(db,row),/permission denied/);
    }
  } finally {await db.close();}
});

test('retries retain the same delivery, reject lost leases and stop before provider deduplication expires',async()=>{
  const db=await fixture();
  try {
    await activate(db,2);const first=await claim(db,2);await finish(db,first,'retry');
    assert.equal(await claim(db,2),null);
    await db.exec("update welcome_email_deliveries set next_attempt_at=now()-interval '1 second'");
    const second=await claim(db,2);assert.equal(second.id,first.id);assert.notEqual(second.lease_id,first.lease_id);
    await assert.rejects(finish(db,first),/lease_lost/);
    await finish(db,second,'retry');
    await db.exec("update welcome_email_deliveries set first_attempt_at=now()-interval '25 hours',next_attempt_at=now()-interval '1 second'");
    assert.equal(await claim(db,2),null);
    assert.equal((await db.query('select status from welcome_email_deliveries')).rows[0].status,'uncertain');
    await activate(db,3);
    await db.exec(`reset role;update auth.users set email='different@example.invalid' where id='${id(3)}';set role service_role;`);
    assert.equal(await claim(db,3),null);
    assert.equal((await db.query('select status from welcome_email_deliveries where user_id=$1',[id(3)])).rows[0].status,'skipped');
    await db.exec(`reset role;insert into auth.users(id,email,banned_until) values('${id(4)}','banned@example.invalid',now()+interval '1 day');`);
    await activate(db,4);assert.equal(await claim(db,4),null);
    await db.exec(`reset role;delete from auth.users where id='${id(2)}';set role service_role;`);
    assert.equal((await db.query('select count(*)::int as n from welcome_email_deliveries where user_id=$1',[id(2)])).rows[0].n,0);
  } finally {await db.close();}
});
