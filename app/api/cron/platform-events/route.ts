import {createClient} from '@supabase/supabase-js';
import {sendNotificationEmail} from '@/lib/notification-email';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return Response.json({error:'Tarefa não configurada.'},{status:503});
 if(request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Não autorizado.'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return Response.json({error:'Serviço indisponível.'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const lifecycle=await db.rpc('process_job_lifecycle');
 if(lifecycle.error)return Response.json({error:'Falha na atualização das vagas.'},{status:503});
 if(!process.env.RESEND_API_KEY)return Response.json({lifecycle:lifecycle.data,email:'not_configured'},{status:503});
 const batch=await db.rpc('claim_notification_emails',{batch_size:20});
 if(batch.error)return Response.json({error:'Falha ao consultar a fila.'},{status:503});
 let sent=0,failed=0;
 // Four parallel workers fit the bounded batch and 10-second provider timeout.
 const rows=(batch.data||[]) as {id:string;lease_id:string;user_id:string;related_type:string;email:string;recipient_name:string|null;title:string;message:string;related_url:string;action_label:string;event_key:string;attempt:number}[];
 for(let offset=0;offset<rows.length;offset+=4){
  await Promise.all(rows.slice(offset,offset+4).map(async row=>{
   const {data:preferences,error}=await db.from('notification_preferences').select('email_enabled,application_updates_enabled,contact_requests_enabled,match_updates_enabled').eq('user_id',row.user_id).maybeSingle();
   const category=row.related_type==='application'||row.related_type==='candidate_action'?'application_updates_enabled':row.related_type?.includes('contact')?'contact_requests_enabled':row.related_type?.includes('match')?'match_updates_enabled':null;
   const disabled=!error&&(preferences?.email_enabled===false||(category&&preferences?.[category]===false));
   // Retry keys are stable inside Resend's 24h idempotency window; later attempts get a fresh key.
   const result=disabled?{sent:false,disabled:true}:error?{sent:false,disabled:false}:await sendNotificationEmail({to:row.email,name:row.recipient_name,title:row.title,message:row.message,relatedUrl:row.related_url,actionLabel:row.action_label,eventKey:row.attempt===1?row.event_key:`${row.event_key}:retry:${row.attempt}`},{apiKey:process.env.RESEND_API_KEY,from:process.env.NOTIFICATION_FROM_EMAIL||'ARYNQO <no-reply@arynqo.com>',baseUrl:process.env.NEXT_PUBLIC_APP_URL||'https://www.arynqo.com'});
   const done=await db.rpc('finish_notification_email',{target:row.id,lease:row.lease_id,delivered:result.sent,disabled:!!result.disabled});
   if(done.error||(!result.sent&&!result.disabled))failed++;else if(result.sent)sent++;
  }));
 }
 return Response.json({lifecycle:lifecycle.data,sent,failed},{headers:{'Cache-Control':'no-store'}});
}
