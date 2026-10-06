import { ApiError, apiErrorResponse, enforceApiLimit, requireActor } from '@/lib/api-auth';
import { validateSourceSettings } from '@/lib/external-jobs/adzuna';
import { externalAdminClient, externalReady, syncExternalJobs } from '@/lib/external-jobs/service';
export const runtime='nodejs';
export const maxDuration=60;
const json=(data:unknown)=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 try{
  await requireActor(request,['admin']);const db=externalAdminClient();
  const [settings,state,count,countries]=await Promise.all([db.from('external_job_sources').select('*').eq('provider','adzuna').single(),db.from('external_job_sync_state').select('started_at,finished_at,status,imported,rejected,failed_countries').eq('provider','adzuna').single(),db.from('external_jobs').select('id',{count:'exact',head:true}).gt('expires_at',new Date().toISOString()),db.from('external_job_country_sync').select('country,status,error_code,last_success_at,next_run_at,imported').order('country')]);
  if(settings.error||state.error||count.error||countries.error)throw new ApiError(503,'Não foi possível consultar as vagas externas.');
  return json({settings:settings.data,state:state.data,available:count.count,ready:externalReady(),countries:countries.data});
 }catch(error){return apiErrorResponse(error)||Response.json({error:'Serviço temporariamente indisponível.'},{status:503});}
}
export async function POST(request:Request){
 try{
  const actor=await requireActor(request,['admin']);await enforceApiLimit(actor,'external_jobs_admin',10);
  const body=await request.json().catch(()=>null);if(!body||typeof body!=='object'||Array.isArray(body))throw new ApiError(400,'Pedido inválido.');
  const db=externalAdminClient();
  if(body.action==='sync')return json(await syncExternalJobs(db));
  if(body.action!=='settings')throw new ApiError(400,'Pedido inválido.');
  const settings=validateSourceSettings(body.settings);if(!settings)throw new ApiError(400,'Seleciona os países suportados e confirma a autorização da fonte.');
  const ready=externalReady();if(settings.enabled&&(!ready.appId||!ready.appKey||!ready.cron))throw new ApiError(400,'Configura as credenciais da integração e da sincronização automática antes de ativar.');
  const result=await db.rpc('configure_external_jobs',{p_actor:actor.id,p_enabled:settings.enabled,p_countries:settings.countries,p_terms:settings.terms_confirmed});
  if(result.error)throw new ApiError(503,'Não foi possível guardar a configuração.');
  return json({saved:true});
 }catch(error){return apiErrorResponse(error)||Response.json({error:'Serviço temporariamente indisponível.'},{status:503});}
}
