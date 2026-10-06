import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
test('external equivalences use only approved concepts, exclude ambiguity and have no anonymous access',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create table profile_tags(id int primary key,label text,normalized_label text,status text);create table profile_tag_translations(tag_id int,locale text,label text,normalized_label text);create table profile_tag_aliases(tag_id int,alias text,normalized_alias text);create function profile_tag_key(text) returns text language sql immutable as 'select lower(trim($1))';grant select on profile_tags,profile_tag_translations,profile_tag_aliases to authenticated;
 insert into profile_tags values (1,'Gestão de projetos','gestão de projetos','approved'),(2,'SQL','sql','rejected'),(3,'Gestão de produto','gestão de produto','approved'),(4,'Rascunho','rascunho','pending');
 insert into profile_tag_translations values (1,'de','Projektmanagement','projektmanagement'),(1,'en','Project management','project management'),(2,'en','SQL','sql'),(3,'en','Project management','project management'),(4,'en','Draft','draft');`);
 const file=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_external_skill_evidence.sql'));assert.ok(file);
 await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.exec('set role authenticated');
 const query=async labels=>(await db.query('select external_skill_equivalences($1) terms',[labels])).rows[0].terms;
 assert.ok((await query(['Gestão de projetos'])).some(t=>t.term==='Projektmanagement'));
 assert.ok(!(await query(['Gestão de projetos'])).some(t=>t.term==='Project management'));
 assert.ok((await query(['Projektmanagement'])).some(t=>t.canonical==='Gestão de projetos'));
 assert.deepEqual(await query(['SQL','Draft']),[]);
 assert.deepEqual(await query(['Project management']),[]);
 assert.ok(!(await query(['Gestão de projetos','Gestão de produto'])).some(t=>t.term==='Project management'));
 await db.exec('reset role;set role anon');await assert.rejects(query(['Gestão de projetos']),/permission denied/);
 }finally{await db.close();}
});
