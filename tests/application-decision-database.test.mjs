import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('one final decision and one notification, including retries and competing decisions', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create table company_profiles(id uuid primary key,user_id uuid);
   create table student_profiles(id uuid primary key,user_id uuid);
   create table jobs(id uuid primary key,company_id uuid,title text);
   create table applications(id uuid primary key,job_id uuid,student_id uuid,status text);
   create table notification_preferences(user_id uuid,email_enabled boolean,application_updates_enabled boolean);
   create table notifications(user_id uuid,event_key text unique,title text,message text,related_type text,related_id uuid,related_url text,action_label text,channels text[],email_status text,push_status text);
   insert into company_profiles values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000011');
   insert into student_profiles values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012');
   insert into jobs values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Test vacancy');
   grant select,update on applications to authenticated;
  `);
  const original = await readFile(new URL('../supabase/migrations/20261001101826_job_validity_and_transactional_notifications.sql',import.meta.url),'utf8');
  await db.exec(original.slice(original.indexOf('create function public.enqueue_platform_notification'),original.indexOf('create function public.process_job_lifecycle')));
  const dir=new URL('../supabase/migrations/',import.meta.url);
  const file=(await readdir(dir)).find(x=>x.endsWith('_application_decision_once.sql'));
  await db.exec(await readFile(new URL(file,dir),'utf8'));
  for (const [i,winner,loser] of [[4,'accepted','rejected'],[5,'rejected','accepted']]) {
   const id=`00000000-0000-0000-0000-00000000000${i}`;
   await db.exec(`reset role; insert into applications values('${id}','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','pending'); set role authenticated;`);
   // PGlite queues calls; these cover both orders of the serialized row updates.
   const results=await Promise.all([winner,loser].map(status=>db.query(`update applications set status=$1 where id=$2 and status='pending' returning status`,[status,id])));
   assert.deepEqual(results.map(r=>r.rows.length),[1,0]);
   await db.exec(`update applications set status='${winner}' where id='${id}'`);
   await assert.rejects(db.exec(`update applications set status='${loser}' where id='${id}'`),/already decided/);
   await assert.rejects(db.exec(`update applications set status='pending' where id='${id}'`),/already decided/);
   await db.exec('reset role');
   assert.equal((await db.query(`select status from applications where id=$1`,[id])).rows[0].status,winner);
   const notifications=(await db.query(`select event_key,email_status from notifications where related_id=$1 and event_key not like '%:created'`,[id])).rows;
   assert.equal(notifications.length,1);
   assert.ok(notifications[0].event_key.endsWith(':'+winner));
   assert.equal(notifications[0].email_status,'pending');
  }
 } finally { await db.close(); }
});
