import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api-auth';
import { fetchCountry, type ExternalAdvert } from './adzuna';
export function externalAdminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new ApiError(503,'Serviço temporariamente indisponível.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function externalReady(){return {appId:!!process.env.ADZUNA_APP_ID,appKey:!!process.env.ADZUNA_APP_KEY,cron:!!process.env.CRON_SECRET};}
export async function syncExternalJobs(db:SupabaseClient=externalAdminClient(),fetcher:typeof fetch=fetch){
 const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;
 if(!id||!key)return {skipped:'credentials'};
 const claim=await db.rpc('claim_external_job_sync');
 if(claim.error)throw new ApiError(503,'Não foi possível iniciar a sincronização.');
 if(claim.data?.skipped)return claim.data as {skipped:string};
 if(!claim.data?.lease||!Array.isArray(claim.data.countries))throw new ApiError(503,'Não foi possível iniciar a sincronização.');
 const rows:ExternalAdvert[]=[],failed:string[]=[];let rejected=0;
 // At most six provider requests per run; countries run concurrently within the route deadline.
 await Promise.all((claim.data.countries as string[]).map(async country=>{
  try{const result=await fetchCountry(country,{id,key},fetcher);rows.push(...result.rows);rejected+=result.rejected;}catch{failed.push(country);}
 }));
 const done=await db.rpc('finish_external_job_sync',{p_lease:claim.data.lease,p_rows:rows,p_failed:failed,p_rejected:rejected});
 if(done.error)throw new ApiError(503,'Não foi possível concluir a sincronização.');
 return {imported:done.data as number,rejected,failed_countries:failed};
}
