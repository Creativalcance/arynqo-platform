/** Local, anonymized recruiter labels only. No network or writes. */
import {readFileSync} from 'node:fs';
import {calculateFiveFieldMatch} from '../lib/matching-five';
import {validPreferences} from '../lib/matching-preferences';
import occupations from '../lib/data/occupations.json';
const path=process.argv[2],threshold=Number(process.argv[3]);
if(!path||!Number.isFinite(threshold)||threshold<0||threshold>100)throw Error('Usage: npx tsx scripts/evaluate-five-field-matching.ts labelled-cases.json threshold-0-to-100');
const cases=JSON.parse(readFileSync(path,'utf8'));
if(!Array.isArray(cases)||!cases.length)throw Error('Expected a non-empty array of independently labelled cases');
const ids=new Set(occupations.map(o=>o.id));let tp=0,fp=0,fn=0,tn=0,incomplete=0;
for(const row of cases){
 if(!validPreferences(row.candidate,'candidate',id=>ids.has(id))||!validPreferences(row.job,'job',id=>ids.has(id))||typeof row.suitable!=='boolean')throw Error('Invalid labelled case');
 const result=calculateFiveFieldMatch(row.candidate,row.job);
 if(result.score===null){incomplete++;continue;}
 const selected=result.score>=threshold;
 if(selected&&row.suitable)tp++;else if(selected)fp++;else if(row.suitable)fn++;else tn++;
}
console.log(JSON.stringify({threshold,cases:cases.length,incomplete,tp,fp,fn,tn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,note:'No automatic deployment. Use independent recruiter labels and separate development and validation samples; score threshold does not verify mandatory qualifications.'},null,2));
