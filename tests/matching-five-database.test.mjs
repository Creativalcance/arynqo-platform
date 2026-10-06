import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
test('server guards enforce confirmation, validated IDs, revisions, drafts and ownership',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table student_profiles(id uuid primary key,user_id uuid,role_title text,role_family text,seniority text,work_model text,main_role text,desired_area text,skills_normalized text[]);
 create table jobs(id uuid primary key,user_id uuid,is_active boolean,role_title text,role_family text,seniority text,work_model text,area text,required_skills text[]);
 create table ai_matches(id uuid primary key);
 grant select,insert,update on student_profiles,jobs to authenticated;
 alter table student_profiles enable row level security;alter table jobs enable row level security;
 create policy owner on student_profiles to authenticated using(user_id::text=current_setting('test.uid')) with check(user_id::text=current_setting('test.uid'));
 create policy owner on jobs to authenticated using(user_id::text=current_setting('test.uid')) with check(user_id::text=current_setting('test.uid'));
 insert into jobs(id,is_active) values('00000000-0000-0000-0000-000000000010',true);`);
 await db.exec(await readFile('supabase/migrations/20261006231557_matching_five_fields.sql','utf8'));
 assert.equal((await db.query('select matching_preferences from jobs')).rows[0].matching_preferences,null);
 const id=(await db.query('select id from matching_occupations limit 1')).rows[0].id;
 const prefs={profession:id,area:'Tecnologia, Software e Dados',levels:['senior'],models:['remote'],skills:['SQL'],confirmed:true};
 await db.exec(`set role authenticated;set test.uid='00000000-0000-0000-0000-000000000001';`);
 await assert.rejects(db.query(`insert into jobs(id,user_id,is_active) values('00000000-0000-0000-0000-000000000020',current_setting('test.uid')::uuid,true)`),/cinco campos/);
 await db.query(`insert into jobs(id,user_id,is_active) values('00000000-0000-0000-0000-000000000020',current_setting('test.uid')::uuid,false)`);
 await assert.rejects(db.query(`update jobs set is_active=true where id='00000000-0000-0000-0000-000000000020'`),/cinco campos/);
 await db.query(`update jobs set matching_preferences=$1,is_active=true,matching_revision=999 where id='00000000-0000-0000-0000-000000000020'`,[JSON.stringify(prefs)]);
 let row=(await db.query('select matching_revision,required_skills from jobs')).rows[0];assert.equal(row.matching_revision,1);assert.deepEqual(row.required_skills,['SQL']);
 await db.query(`update jobs set matching_revision=999 where id='00000000-0000-0000-0000-000000000020'`);assert.equal((await db.query('select matching_revision from jobs')).rows[0].matching_revision,1);
 for(const p of [{...prefs,profession:'fake'},{...prefs,levels:['senior','senior']},{...prefs,skills:[]},{...prefs,extra:1},{...prefs,models:['fake']}])await assert.rejects(db.query(`update jobs set matching_preferences=$1`,[JSON.stringify(p)]));
 await db.query(`insert into student_profiles(id,user_id,matching_preferences) values('00000000-0000-0000-0000-000000000030',current_setting('test.uid')::uuid,$1)`,[JSON.stringify(prefs)]);
 assert.deepEqual((await db.query('select skills_normalized from student_profiles')).rows[0].skills_normalized,['SQL']);
 await db.exec(`set test.uid='00000000-0000-0000-0000-000000000002';`);assert.equal((await db.query('select * from student_profiles')).rows.length,0);assert.equal((await db.query('update jobs set is_active=false returning id')).rows.length,0);
 await assert.rejects(db.query(`insert into matching_occupations values('00000000-0000-0000-0000-000000000099','fake')`),/permission denied/);
 await db.exec('reset role;set role anon;');await assert.rejects(db.query('select * from matching_occupations'),/permission denied/);
 }finally{await db.close();}
});
