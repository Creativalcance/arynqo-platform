import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeLinkedInDraft, selectLinkedInDraft, validateLinkedInText, linkedinPreview } from '../lib/linkedin-import';
test('import allowlist excludes account permissions, identity, documents and guessed scores',()=>{
 const result=normalizeLinkedInDraft({headline:' Engineer ',role:'admin',email:'private@example.invalid',cv_url:'overwritten',contact_visibility:'public',salary_min:50000,ai_profile_score:100,skills:['SQL','sql',null,{}],bio:null});
 assert.deepEqual(result,{headline:'Engineer',skills:['SQL']});
});
test('malformed, empty and oversized results are bounded and safely normalized',()=>{
 for(const value of [null,[],42,'text'])assert.deepEqual(normalizeLinkedInDraft(value),{});
 const result=normalizeLinkedInDraft({headline:'a'.repeat(500),professional_experience_items:[null,{role:'Engineer',company:'Example',description:4},{id:'empty'}]});
 assert.equal(result.headline?.length,240);assert.equal(result.professional_experience_items?.length,1);assert.equal(result.professional_experience_items?.[0].description,'');
});
test('only reviewed selections are applied and missing sections cannot erase profile data',()=>{
 const source={headline:'New headline',bio:'New bio',skills:['SQL'],tools:''};
 assert.deepEqual(selectLinkedInDraft(source,['bio','tools','role']),{bio:'New bio'});
 assert.deepEqual(selectLinkedInDraft(source,[]),{});
 const existing={headline:'My headline',bio:'Old bio',cv_url:'existing.pdf'};
 assert.deepEqual({...existing,...selectLinkedInDraft(source,['bio'])},{headline:'My headline',bio:'New bio',cv_url:'existing.pdf'});
});
test('text limits and preview do not promote model content into HTML',()=>{
 assert.equal(validateLinkedInText('https://linkedin.com/in/example'),false);
 assert.equal(validateLinkedInText('a'.repeat(80)),true);
 assert.equal(validateLinkedInText('a'.repeat(40001)),false);
 assert.equal(linkedinPreview(['<script>example</script>']),'<script>example</script>');
});
