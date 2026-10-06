import assert from 'node:assert/strict';
import {test} from 'node:test';
import {externalCompatibility} from '../lib/external-jobs/compatibility';
import {assessExternalJob} from '../lib/external-jobs/assessment';

test('explicit non-requirements in all platform languages do not become positive evidence',()=>{
 for(const text of ['SQL não é necessário.','No SQL required.','SQL is not required.','SQL n’est pas requis.','SQL no es necesario.','SQL ist nicht erforderlich.','SQL non è richiesto.','Sem experiência em SQL.']){
  const result=externalCompatibility(['SQL'],'Analyst',text);
  assert.equal(result.mentions.length,0,text);assert.equal(result.notRequired.length,1,text);
  assert.equal(result.score,null);
 }
 assert.equal(externalCompatibility(['SQL'],'SQL analyst','SQL is not required.').mentions.length,0);
 assert.equal(externalCompatibility(['SQL'],'Analyst','Not only SQL but also Python.').mentions.length,1);
});
test('missing candidate skills differ from no overlap and reviewed multilingual evidence',()=>{
 assert.equal(externalCompatibility([],'Analyst','SQL').evidenceStatus,'profile_incomplete');
 assert.equal(externalCompatibility(['Java'],'Analyst','JavaScript').evidenceStatus,'no_explicit_matches');
 const aliases=new Map([['projektmanagement','Gestão de projetos'],['gestao de projetos','Gestão de projetos']]);
 const result=externalCompatibility(['Gestão de projetos','Projektmanagement'],'Projektmanagement','',aliases);
 assert.equal(result.mentions.length,1);assert.equal(result.evidenceStatus,'evidence_found');
});
test('comparison uses declared preferences and source facts; unknowns never become failures',()=>{
 const result=assessExternalJob(['SQL'],{main_role:'Data Analyst',regions:['Paris'],preferred_opportunity_type:'Permanente',expected_salary:'2000',languages:'Inglês (C1)'},{title:'Senior Data Analyst',description:'SQL and Excel.',location:'Paris, Ile-de-France',contract_type:'Permanente'});
 assert.deepEqual(result.criteria.slice(0,3).map(c=>c.state),['aligned','aligned','aligned']);
 assert.ok(result.criteria.slice(3).every(c=>c.state==='unknown'));
 assert.equal(result.score,null);assert.equal(result.mentions[0].skill,'SQL');
});
test('full-time does not mean permanent; a different location or title needs confirmation',()=>{
 const result=assessExternalJob(['SQL'],{main_role:'Chef',regions:['Porto'],preferred_opportunity_type:'Full time'},{title:'Software developer',description:'SQL',location:'Paris',contract_type:'Permanente'});
 assert.deepEqual(result.criteria.slice(0,3).map(c=>c.state),['review','review','review']);
 assert.equal(result.score,null);
 const empty=assessExternalJob([],{}, {title:'Developer',description:'',location:'Berlin'});
 assert.equal(empty.criteria[1].state,'missing_profile');
 assert.equal(empty.criteria[2].state,'unknown');
});
