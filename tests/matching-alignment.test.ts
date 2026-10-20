import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildMatchRecord, calculateFiveFieldMatch} from '../lib/matching-five';
import {averageMatchScore, formatMatchScore, matchMetrics} from '../lib/match-presentation';
import type {MatchingPreferences} from '../lib/matching-preferences';
const preferences: MatchingPreferences = {profession:'00030d09-2b3a-4efd-87cc-c4ea39d27c34',area:'Todas',levels:['senior'],models:['onsite','remote'],skills:['SQL','React'],confirmed:true};
const source = (changes: Partial<MatchingPreferences> = {}) => ({id:'00000000-0000-0000-0000-000000000001', matching_revision:3,matching_preferences:{...preferences,...changes}});

test('stored score and both UI breakdowns use the five confirmed fields, not optional legacy data',()=>{
 const result=buildMatchRecord({...source(),work_model:'Presencial',seniority:'Júnior',skills_normalized:['Java']} as ReturnType<typeof source>,source({levels:['mid','senior'],models:['remote']}));
 assert.equal(result.match_score,100);assert.equal(result.work_model_score,100);assert.equal(result.seniority_score,100);
 assert.equal(result.location_score,null);assert.equal(result.salary_score,null);
 const metrics=matchMetrics(result);assert.equal(metrics.length,5);assert.equal(metrics.reduce((n,m)=>n+(m.weight||0),0),100);assert.ok(metrics.every(m=>m.value===100));
 assert.equal(result.matching_details.candidateRevision,3);assert.equal(result.matching_details.jobRevision,3);
});
test('model and accepted seniority order do not alter the result',()=>{
 for(const models of [['onsite','remote'],['remote','onsite']]) for(const levels of [['mid','senior'],['senior','mid']]) assert.equal(buildMatchRecord(source({models}),source({models:['remote'],levels})).match_score,100);
 assert.equal(buildMatchRecord(source({models:['onsite']}),source({models:['hybrid']})).work_model_score,0);
});
test('unconfirmed, incomplete and pre-transition profiles stay pending, not zero percent',()=>{
 for(const matching_preferences of [null,{...preferences,confirmed:false},{...preferences,skills:[]}]) {
  const row=buildMatchRecord({...source(),matching_preferences},source());
  assert.equal(row.match_score,null);assert.equal(row.skills_score,null);assert.equal(row.match_category,'low_compatibility');assert.deepEqual(matchMetrics(row),[]);assert.equal(formatMatchScore(row.match_score),'Por calcular');
 }
 assert.equal(formatMatchScore(0),'0%');assert.equal(averageMatchScore([null,0,100]),50);assert.equal(averageMatchScore([null]),null);
});
test('confirmed profession identity is independent of displayed language and sector; Todas affects only area',()=>{
 const result=calculateFiveFieldMatch(preferences,{...preferences,area:'Saúde',profession:'000e93a3-d956-4e45-aacb-f12c83fedf84',skills:['Java']});
 assert.equal(result.contributions?.area,5);assert.equal(result.contributions?.profession,0);assert.equal(result.contributions?.skills,0);
});
test('reviewed aliases deduplicate requirements, keep display labels, and never invent partial skill matches',()=>{
 const aliases=new Map([['js','JavaScript']]);
 const row=buildMatchRecord(source({skills:['JS','C#']}),source({skills:['JS','JavaScript','C++']}),aliases);
 assert.equal(row.skills_score,50);assert.deepEqual(row.matching_skills,['JavaScript']);assert.deepEqual(row.missing_skills,['C++']);assert.notEqual(row.match_category,'recommended');
});

test('unrelated professions without essential skill evidence are not recommended by incidental preferences',()=>{
 const row=buildMatchRecord(source(),source({profession:'000e93a3-d956-4e45-aacb-f12c83fedf84',skills:['Java']}));
 assert.equal(row.match_score,30);assert.equal(row.is_relevant,false);assert.equal(row.match_category,'not_relevant');
});
