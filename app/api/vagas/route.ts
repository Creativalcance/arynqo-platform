import { searchPublicJobs } from '@/lib/public-job-search';
import { requireActor, apiErrorResponse } from '@/lib/api-auth';
export async function GET(request:Request){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization'};
 try{
  const actor=request.headers.has('authorization') ? await requireActor(request) : null;
  return Response.json(await searchPublicJobs(new URL(request.url).searchParams,actor?.client),{headers});
 }catch(error){
  const response=apiErrorResponse(error)||Response.json({error:'Não foi possível carregar as vagas.'},{status:503});
  for(const [key,value] of Object.entries(headers))response.headers.set(key,value);
  return response;
 }
}
