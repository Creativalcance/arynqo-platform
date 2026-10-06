import 'server-only';
import { publicClient } from '@/lib/public-content';
import type { Job } from '@/app/vagas/VagasClient';
export async function publicExternalJobs():Promise<Job[]>{
 const {data,error}=await publicClient().from('external_jobs').select('id,title,company_name,area,location,country_code,contract_type,created_at,last_seen_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(600);
 if(error){console.error('External vacancies unavailable');return [];}
 return (data||[]).map(row=>({...row,id:`external:${row.id}`,external_id:row.id,origin:'external' as const,description:null,work_mode:null,work_model:null,seniority:null,is_active:true}));
}
