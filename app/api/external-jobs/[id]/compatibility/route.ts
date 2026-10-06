import { apiErrorResponse, requireActor, requireUuid, ApiError, enforceApiLimit } from '@/lib/api-auth';
import { externalCompatibility } from '@/lib/external-jobs/compatibility';
import { loadReviewedSkillAliases } from '@/lib/reviewed-skill-aliases';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const actor=await requireActor(request,['student']);const {id}=await params;requireUuid(id,'ID da vaga');
  await enforceApiLimit(actor,'matching',30,60);
  const [offer,profile]=await Promise.all([
   actor.client.from('external_job_details').select('description,external_jobs!inner(title,expires_at)').eq('job_id',id).maybeSingle(),
   actor.client.from('student_profiles').select('skills_normalized,tools_normalized,soft_skills_normalized,tools,soft_skills,student_skills(skills(name))').eq('user_id',actor.id).maybeSingle()
  ]);
  if(offer.error||profile.error)throw new ApiError(503,'Não foi possível consultar a compatibilidade.');
  const job=Array.isArray(offer.data?.external_jobs)?offer.data.external_jobs[0]:offer.data?.external_jobs;
  if(!job||Date.parse(job.expires_at)<=Date.now())throw new ApiError(404,'Esta oferta já não está disponível.');
  const p=profile.data;
  const declared=(p?.student_skills||[]) as unknown as {skills:{name:string}|{name:string}[]|null}[];
  const skills=[...(p?.skills_normalized||[]),...(p?.tools_normalized||[]),...(p?.soft_skills_normalized||[]),...declared.flatMap(row=>Array.isArray(row.skills)?row.skills.map(s=>s.name):row.skills?[row.skills.name]:[]),...[p?.tools,p?.soft_skills].flatMap(s=>s?s.split(/[,;\n|]/):[])].filter((s):s is string=>typeof s==='string');
  const aliases=await loadReviewedSkillAliases(actor.client);
  return Response.json(externalCompatibility(skills,job.title,offer.data!.description,aliases),{headers:{'Cache-Control':'private, no-store',Vary:'Authorization','X-Robots-Tag':'noindex, nofollow'}});
 }catch(error){const response=apiErrorResponse(error)||Response.json({error:'Não foi possível consultar a compatibilidade.'},{status:503});response.headers.set('Cache-Control','private, no-store');return response;}
}
