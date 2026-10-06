import { searchPublicJobs } from '@/lib/public-job-search';
export async function GET(request:Request){
 try{return Response.json(await searchPublicJobs(new URL(request.url).searchParams),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'Não foi possível carregar as vagas.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
