create or replace function public.contact_request_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare company_user uuid; student_user uuid; company_name text; job_title text; heading text;
begin
 select c.user_id,c.company_name,j.title into company_user,company_name,job_title from public.jobs j join public.company_profiles c on c.id=j.company_id where j.id=new.job_id and c.id=new.company_id;
 select s.user_id into student_user from public.student_profiles s where s.id=new.student_id;
 if tg_op='INSERT' then
  perform public.enqueue_platform_notification(student_user,'candidate_contact_request:'||new.id||':'||student_user||':pending','Pedido de contacto recebido',
   'A empresa '||coalesce(company_name,'ARYNQO')||' quer contactar-te sobre a vaga "'||job_title||'".','candidate_contact_request',new.id,'/dashboard/notificacoes','Responder ao pedido');
 elsif new.status is distinct from old.status and new.status in ('accepted','rejected') then
  update public.notifications set is_read=true,action_label='Pedido respondido'
  where user_id=student_user and related_id=new.id and related_type in ('candidate_contact_request','contact_request');
  heading:=case when new.status='accepted' then 'Pedido de contacto aceite' else 'Pedido de contacto recusado' end;
  perform public.enqueue_platform_notification(company_user,'candidate_contact_request:'||new.id||':'||company_user||':'||new.status,heading,
   'O candidato '||case when new.status='accepted' then 'aceitou' else 'recusou' end||' o pedido relativo à vaga "'||job_title||'".','candidate_contact_request',new.id,
   case when new.status='accepted' then '/empresa/candidatos/'||new.student_id||'?jobId='||new.job_id else '/empresa/talentos' end,'Ver pedido');
 end if;
 return new;
end $$;
revoke all on function public.contact_request_notifications() from public,anon,authenticated;

-- Caller RLS remains in force. A repeated response returns the recorded decision.
create function public.respond_candidate_contact_request(request_id uuid, decision text) returns text
language plpgsql security invoker set search_path='' as $$
declare recorded text;
begin
 if decision is null or decision not in ('accepted','rejected') then raise exception 'Invalid contact response'; end if;
 select r.status into recorded from public.candidate_contact_requests r
 join public.student_profiles s on s.id=r.student_id join public.profiles p on p.id=s.user_id
 where r.id=request_id and s.user_id=auth.uid() and p.role='student' for update of r;
 if not found then raise exception 'Contact response not authorized'; end if;
 if recorded='pending' then
  update public.candidate_contact_requests set status=decision where id=request_id;
  recorded:=decision;
 end if;
 update public.notifications set is_read=true
 where user_id=auth.uid() and related_id=request_id and related_type in ('candidate_contact_request','contact_request');
 return recorded;
end $$;
revoke all on function public.respond_candidate_contact_request(uuid,text) from public,anon;
grant execute on function public.respond_candidate_contact_request(uuid,text) to authenticated;

-- Clear existing candidate reminders for requests that were already answered.
update public.notifications n set is_read=true,action_label='Pedido respondido'
from public.candidate_contact_requests r join public.student_profiles s on s.id=r.student_id
where n.user_id=s.user_id and n.related_id=r.id and r.status in ('accepted','rejected')
and n.related_type in ('candidate_contact_request','contact_request');
