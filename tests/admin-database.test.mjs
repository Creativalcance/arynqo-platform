import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
test('Administrative SQL includes incomplete accounts and isolates RPCs and audit log from browser roles',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;
 create schema auth;create schema storage;
 create table auth.users(id uuid,email text,created_at timestamptz,email_confirmed_at timestamptz,last_sign_in_at timestamptz,banned_until timestamptz);
 create table public.profiles(id uuid,name text,role text,subscription_plan text,subscription_status text);
 create table public.student_profiles(id uuid,user_id uuid);
 create table public.company_profiles(id uuid,user_id uuid);
 create table storage.objects(id uuid,bucket_id text,name text,created_at timestamptz,updated_at timestamptz,metadata jsonb,owner_id text);
 insert into auth.users values('11111111-1111-1111-1111-111111111111','test@example.invalid',now(),now(),null,null),('22222222-2222-2222-2222-222222222222','pending@example.invalid',now(),null,null,null);
 insert into public.profiles values('11111111-1111-1111-1111-111111111111','João','student','free','active');
 insert into storage.objects values('33333333-3333-3333-3333-333333333333','student-cvs','11111111-1111-1111-1111-111111111111/test.pdf',now(),now(),'{"size":42,"mimetype":"application/pdf"}',null);
 `);
 await db.exec(await readFile(new URL('../supabase/migrations/20260930160910_admin_account_inventory.sql',import.meta.url),'utf8'));
 const all=(await db.query('select public.admin_accounts() as result')).rows[0].result;assert.equal(all.total,2);assert.ok(all.rows.some(x=>x.role===null));assert.ok(all.rows.every(x=>!Object.hasOwn(x,'encrypted_password')));
 assert.equal((await db.query("select public.admin_accounts(p_search=>'pending') as result")).rows[0].result.total,1);
 assert.equal((await db.query("select public.admin_accounts(p_confirmed=>'no') as result")).rows[0].result.total,1);
 assert.equal((await db.query("select public.admin_files(p_user=>'22222222-2222-2222-2222-222222222222') as result")).rows[0].result.total,0);
 assert.equal((await db.query("select public.admin_files(p_user=>'11111111-1111-1111-1111-111111111111') as result")).rows[0].result.total,1);
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select public.admin_accounts()'),/permission denied/);
 await assert.rejects(db.query('select public.admin_files()'),/permission denied/);
 await assert.rejects(db.query('select * from public.admin_access_log'),/permission denied/);
 await db.exec('reset role;set role service_role');
 assert.equal((await db.query('select public.admin_accounts() as result')).rows[0].result.total,2);
 await db.exec("insert into public.admin_access_log(actor_id,action,dataset) values('11111111-1111-1111-1111-111111111111','consultar','contas')");
 await assert.rejects(db.query('delete from public.admin_access_log'),/permission denied/);
 }finally{await db.close();}
});
