import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ADZUNA_COUNTRIES,fetchCountry,normalizeAdvert,safeAdzunaURL,validateSourceSettings} from '../lib/external-jobs/adzuna';
import {deduplicateJobs} from '../lib/external-jobs/deduplicate';
const now=new Date('2026-10-06T12:00:00Z');
const advert={id:'123',title:'<b>Developer</b>',company:{display_name:'Example'},description:'React &amp; SQL',created:'2026-10-05T12:00:00Z',redirect_url:'http://www.adzuna.co.uk/jobs/land/ad/123',location:{display_name:'London'}};
test('provider payload is normalized, bounded and cannot inject a foreign URL or old offer',()=>{
 const row=normalizeAdvert(advert,'gb',now)!;assert.equal(row.title,'Developer');assert.equal(row.description,'React & SQL');assert.equal(row.country_code,'GB');assert.match(row.source_url,/^https:/);
 for(const url of ['javascript:alert(1)','https://adzuna.co.uk.evil.test/job','https://evil.test/','https://user:password@adzuna.co.uk/job','https://adzuna.co.uk:8443/job'])assert.equal(safeAdzunaURL(url),null);
 assert.equal(normalizeAdvert({...advert,created:'2026-09-01'},'gb',now),null);assert.equal(normalizeAdvert({...advert,created:'2027-01-01'},'gb',now),null);assert.equal(normalizeAdvert(advert,'pt',now),null);
});
test('source activation requires explicit countries and authorization',()=>{
 assert.equal(validateSourceSettings({enabled:true,countries:['fr'],terms_confirmed:false}),null);
 assert.equal(validateSourceSettings({enabled:true,countries:['pt'],terms_confirmed:true}),null);
 assert.equal(validateSourceSettings({enabled:true,countries:[],terms_confirmed:true}),null);
 assert.equal(validateSourceSettings({enabled:true,countries:[...ADZUNA_COUNTRIES],terms_confirmed:true})?.countries.length,19);
 assert.deepEqual(validateSourceSettings({enabled:true,countries:['fr','fr'],terms_confirmed:true}),{enabled:true,countries:['fr'],terms_confirmed:true});
});
test('fetching is bounded and de-duplicates provider IDs; failed second pages are never a partial country snapshot',async()=>{
 let calls=0;const fetcher:typeof fetch=async(input,init)=>{calls++;const url=new URL(String(input));assert.equal(url.host,'api.adzuna.com');assert.equal(url.searchParams.get('sort_by'),'date');assert.equal(init?.redirect,'error');return Response.json({results:Array.from({length:50},()=>advert)});};
 const result=await fetchCountry('gb',{id:'test',key:'test'},fetcher,now);assert.equal(calls,2);assert.equal(result.rows.length,1);
 calls=0;await assert.rejects(fetchCountry('gb',{id:'test',key:'test'},async()=>{calls++;return calls===1?Response.json({results:Array.from({length:50},()=>advert)}):new Response(null,{status:429});},now),/rate_limit/);
});
test('duplicate internal and external adverts retain the internal offer; unknown companies stay separate',()=>{
 const internal={title:'Developer',company_name:'Example',location:'London',country_code:'GB'};
 assert.deepEqual(deduplicateJobs([internal,{...internal,origin:'external'}]),[internal]);
 assert.equal(deduplicateJobs([{...internal,company_name:''},{...internal,company_name:'',origin:'external'}]).length,2);
});

import { externalCompatibility } from '../lib/external-jobs/compatibility';
test('external evidence never invents a score, requirements or unreviewed translations',()=>{
 const result=externalCompatibility(['Java','SQL','C++','Gestão de projetos'],'JavaScript developer','SQL and C#; Projektmanagement',new Map([['projektmanagement','Gestão de projetos']]));
 assert.equal(result.score,null);assert.equal(result.status,'insufficient_information');assert.deepEqual(result.mentions.map(m=>m.skill),['SQL','Gestão de projetos']);
 assert.equal(externalCompatibility(['Gestão de projetos'],'Projektmanagement','').mentions.length,0);
 assert.equal(externalCompatibility([],'Developer','').hasProfileSkills,false);
 assert.equal(externalCompatibility(['SQL'],'No SQL required','').score,null);
});
test('provider failures have safe categories without leaking credentials',async()=>{
 for(const [status,code] of [[410,'credentials'],[429,'rate_limit'],[503,'provider']] as const){
  await assert.rejects(fetchCountry('fr',{id:'secret-id',key:'secret-key'},async()=>new Response(null,{status})),error=>error instanceof Error&&error.message===code);
 }
});
