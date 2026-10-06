import {requireActor,requireUuid,apiErrorResponse,ApiError} from '@/lib/api-auth';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization'};
 try {
  const actor=await requireActor(request);const {id}=await params;requireUuid(id,'ID da vaga');
  const {data,error}=await actor.client.from('jobs').select('company_profiles(company_name,description,website_url,location,industry,company_type,company_size,logo_url)').eq('id',id).eq('is_active',true).maybeSingle();
  if(error)throw new ApiError(503,'Não foi possível consultar a vaga.');
  if(!data)throw new ApiError(404,'Vaga indisponível');
  const company=Array.isArray(data.company_profiles)?data.company_profiles[0]:data.company_profiles;
  return Response.json({company:company||null},{headers});
 }catch(error){
  const response=apiErrorResponse(error)||Response.json({error:'Não foi possível consultar a vaga.'},{status:503});
  for(const [key,value] of Object.entries(headers))response.headers.set(key,value);
  return response;
 }
}
