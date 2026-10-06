import { apiErrorResponse, requireActor, requireUuid, ApiError } from '@/lib/api-auth';
import { safeAdzunaURL } from '@/lib/external-jobs/adzuna';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const actor=await requireActor(request,['student','admin']);const {id}=await params;requireUuid(id,'ID da vaga');
  const {data,error}=await actor.client.from('external_job_details').select('description,source_url,external_jobs!inner(id,title,company_name,location,country_code,created_at,last_seen_at,expires_at)').eq('job_id',id).maybeSingle();
  if(error)throw new ApiError(503,'Não foi possível consultar esta oferta.');
  const job=Array.isArray(data?.external_jobs)?data.external_jobs[0]:data?.external_jobs;
  const url=safeAdzunaURL(data?.source_url);
  if(!job||!url||Date.parse(job.expires_at)<=Date.now())throw new ApiError(404,'Esta oferta já não está disponível.');
  return Response.json({...job,description:data!.description,source_url:url},{headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Robots-Tag':'noindex, nofollow'}});
 }catch(error){const response=apiErrorResponse(error)||Response.json({error:'Serviço temporariamente indisponível.'},{status:503});response.headers.set('Cache-Control','private, no-store');return response;}
}
