import 'server-only';
import { publicClient } from '@/lib/public-content';
import type { Job } from '@/app/vagas/VagasClient';
export type JobSearchResult={jobs:Job[];total:number;page:number;areas:string[];contracts:string[];locations:string[]};
export async function searchPublicJobs(params:URLSearchParams):Promise<JobSearchResult>{
 const filters=Object.fromEntries(['q','origin','country','location','area','contract','model'].map(key=>[key,(params.get(key)||'').slice(0,key==='q'?200:300)]));
 const rawPage=Number(params.get('page')||1),page=Number.isSafeInteger(rawPage)?Math.max(1,Math.min(rawPage,100000)):1;
 const {data,error}=await publicClient().rpc('search_public_jobs',{p_filters:filters,p_page:page});
 if(error||!data||!Array.isArray(data.jobs))throw new Error('Não foi possível carregar as vagas.');
 return data;
}
