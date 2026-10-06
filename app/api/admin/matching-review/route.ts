import {createClient} from '@supabase/supabase-js';
import {ApiError,apiErrorResponse,enforceApiLimit,requireActor} from '@/lib/api-auth';
import {currentFiveFieldResult} from '@/lib/matching-five';
export async function GET(request:Request){
 try{
  const actor=await requireActor(request,['admin']);await enforceApiLimit(actor,'matching_review',20,60);
  const page=Number(new URL(request.url).searchParams.get('page')||1);
  if(!Number.isInteger(page)||page<1||page>10000)throw new ApiError(400,'Página inválida.');
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('ai_matches').select('id,match_score,five_field_shadow,student_profiles(matching_preferences,matching_revision),jobs(matching_preferences,matching_revision,is_active)').order('id').range((page-1)*50,page*50-1);
  if(error)throw new ApiError(503,'Não foi possível consultar os matches.');
  const items=(data||[]).map(row=>{
   const student=Array.isArray(row.student_profiles)?row.student_profiles[0]:row.student_profiles;
   const job=Array.isArray(row.jobs)?row.jobs[0]:row.jobs;
   const current=!!student&&!!job&&job.is_active&&currentFiveFieldResult(row.five_field_shadow,student.matching_revision,job.matching_revision);
   return {pair:row.id,legacyScore:row.match_score,status:current?row.five_field_shadow.status:'pending',preview:current?row.five_field_shadow:null,candidate:student?.matching_preferences||null,job:job?.matching_preferences||null};
  });
  return Response.json({page,items,mode:'shadow',automaticRecommendations:false},{headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});
 }catch(error){return apiErrorResponse(error)||Response.json({error:'Serviço temporariamente indisponível.'},{status:503});}
}
