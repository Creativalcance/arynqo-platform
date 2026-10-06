import { apiErrorResponse } from '@/lib/api-auth';
import { syncExternalJobs } from '@/lib/external-jobs/service';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return Response.json({error:'Tarefa não configurada.'},{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Não autorizado.'},{status:401});
 try{return Response.json(await syncExternalJobs(),{headers:{'Cache-Control':'no-store'}});}catch(error){return apiErrorResponse(error)||Response.json({error:'Falha na sincronização.'},{status:503});}
}
