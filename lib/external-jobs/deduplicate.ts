// Collapse exact company/title/location duplicates only. Never infer company identity.
export function deduplicateJobs<T extends {title:string;company_name?:string;location:string|null;country_code:string|null;origin?:string}>(jobs:T[]):T[]{
 const seen=new Set<string>();
 const normalize=(s:string)=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
 return jobs.filter(job=>{
  if(!job.company_name)return true;
  const key=[job.title,job.company_name,job.location||'',job.country_code||''].map(normalize).join('\u0000');
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
