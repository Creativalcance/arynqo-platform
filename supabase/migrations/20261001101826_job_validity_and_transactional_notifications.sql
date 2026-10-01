alter table public.jobs add column published_at timestamptz, add column expires_at timestamptz,
 add column renewal_requested_at timestamptz, add column renewal_deadline timestamptz,
 add column deactivation_reason text;
-- Existing offers start a fresh initial cycle; no old offer is closed on migration.
update public.jobs set published_at=created_at, expires_at=greatest(created_at+interval '30 days',now()) where is_active;

create function public.guard_job_lifecycle() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and current_user in ('authenticated','anon') and
  (new.published_at,new.expires_at,new.renewal_requested_at,new.renewal_deadline,new.deactivation_reason)
  is distinct from (old.published_at,old.expires_at,old.renewal_requested_at,old.renewal_deadline,old.deactivation_reason) then
  raise exception 'Publication dates are managed by the platform';
 end if;
 if tg_op='INSERT' or (new.is_active and not coalesce(old.is_active,false)) then
  new.published_at=now(); new.expires_at=now()+interval '30 days';
  new.renewal_requested_at=null;new.renewal_deadline=null;new.deactivation_reason=null;
 elsif not new.is_active and old.is_active then
  new.renewal_requested_at=null;new.renewal_deadline=null;
  new.deactivation_reason=coalesce(new.deactivation_reason,'company');
 end if;
 return new;
end $$;
revoke all on function public.guard_job_lifecycle() from public,anon,authenticated;
create trigger job_lifecycle before insert or update on public.jobs for each row execute function public.guard_job_lifecycle();

create function public.enqueue_platform_notification(recipient uuid,event text,heading text,body text,kind text,entity uuid,path text,label text)
returns void language plpgsql security definer set search_path='' as $$
declare enabled boolean;
begin
 select coalesce(p.email_enabled,true) and (kind='job_renewal' or coalesce(p.application_updates_enabled,true)) into enabled
 from (select 1) v left join public.notification_preferences p on p.user_id=recipient;
 insert into public.notifications(user_id,event_key,title,message,related_type,related_id,related_url,action_label,channels,email_status,push_status)
 values(recipient,event,heading,body,kind,entity,path,label,array['in_app','email'],case when enabled then 'pending' else 'disabled' end,'disabled')
 on conflict(event_key) do nothing;
end $$;
revoke all on function public.enqueue_platform_notification(uuid,text,text,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_platform_notification(uuid,text,text,text,text,uuid,text,text) to service_role;

create function public.application_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare company_user uuid;student_user uuid;job_title text;state text;
begin
 select c.user_id,j.title into company_user,job_title from public.jobs j join public.company_profiles c on c.id=j.company_id where j.id=new.job_id;
 select s.user_id into student_user from public.student_profiles s where s.id=new.student_id;
 if tg_op='INSERT' then
  perform public.enqueue_platform_notification(company_user,'application:'||new.id||':'||company_user||':created','Nova candidatura recebida',
   'Recebeste uma nova candidatura para a vaga "'||job_title||'".','application',new.id,'/empresa/candidatos?jobId='||new.job_id,'Ver candidaturas');
 elsif new.status is distinct from old.status and new.status in ('accepted','rejected') then
  state=case when new.status='accepted' then 'aceite' else 'recusada' end;
  perform public.enqueue_platform_notification(student_user,'application:'||new.id||':'||student_user||':'||new.status,'Candidatura '||state,
   'A tua candidatura à vaga "'||job_title||'" foi '||state||'.','application',new.id,'/dashboard/candidaturas','Ver candidaturas');
 end if;
 return new;
end $$;
revoke all on function public.application_notifications() from public,anon,authenticated;
create trigger application_event after insert or update of status on public.applications for each row execute function public.application_notifications();

create function public.process_job_lifecycle() returns jsonb language plpgsql security definer set search_path='' as $$
declare j record;reminded integer=0;closed integer=0;
begin
 for j in select v.*,c.user_id from public.jobs v join public.company_profiles c on c.id=v.company_id
  where v.is_active and ((v.expires_at<=now() and v.renewal_requested_at is null) or v.renewal_deadline<=now())
  for update of v skip locked loop
  if j.renewal_deadline is not null and j.renewal_deadline<=now() then
   update public.jobs set is_active=false,deactivation_reason='no_renewal_response' where id=j.id;
   perform public.enqueue_platform_notification(j.user_id,'job_closed:'||j.id||':'||j.expires_at,'Vaga desativada',
    'A vaga "'||j.title||'" foi desativada por falta de confirmação. Podes voltar a ativá-la na área da empresa.','job_renewal',j.id,'/empresa/vagas','Ver vagas');
   closed=closed+1;
  else
   update public.jobs set renewal_requested_at=now(),renewal_deadline=now()+interval '7 days' where id=j.id;
   perform public.enqueue_platform_notification(j.user_id,'job_renewal:'||j.id||':'||j.expires_at,'A vaga continua ativa?',
    'Confirma nos próximos sete dias se continuas a recrutar para "'||j.title||'". Sem resposta, a vaga será desativada automaticamente.','job_renewal',j.id,'/empresa/vagas','Confirmar vaga');
   reminded=reminded+1;
  end if;
 end loop;
 return jsonb_build_object('reminded',reminded,'closed',closed);
end $$;
revoke all on function public.process_job_lifecycle() from public,anon,authenticated;
grant execute on function public.process_job_lifecycle() to service_role;

create function public.renew_job_publication(job_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.jobs j join public.company_profiles c on c.id=j.company_id join public.profiles p on p.id=c.user_id
 where j.id=job_id and c.user_id=auth.uid() and p.role in ('company','admin') for update of j;
 if not found then raise exception 'Vacancy renewal not authorized'; end if;
 update public.jobs set is_active=true,published_at=now(),expires_at=now()+interval '30 days',renewal_requested_at=null,renewal_deadline=null,deactivation_reason=null where id=job_id;
end $$;
revoke all on function public.renew_job_publication(uuid) from public,anon;
grant execute on function public.renew_job_publication(uuid) to authenticated;

-- Durable delivery state. Lease claims prevent concurrent workers sending the same event.
create table public.notification_email_queue(notification_id uuid primary key references public.notifications(id) on delete cascade,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), lease_until timestamptz, lease_id uuid);
alter table public.notification_email_queue enable row level security;
revoke all on public.notification_email_queue from public,anon,authenticated;
grant select,insert,update,delete on public.notification_email_queue to service_role;
create function public.queue_notification_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_status='pending' then insert into public.notification_email_queue(notification_id) values(new.id) on conflict do nothing;end if;
 return new;
end $$;
revoke all on function public.queue_notification_email() from public,anon,authenticated;
create trigger queue_notification_email after insert on public.notifications for each row execute function public.queue_notification_email();

create function public.claim_notification_emails(batch_size integer default 20) returns setof jsonb language plpgsql security definer set search_path='' as $$
begin
 return query with claimed as (
 update public.notification_email_queue q set attempts=q.attempts+1,lease_until=now()+interval '10 minutes',lease_id=gen_random_uuid()
 where q.notification_id in(select q2.notification_id from public.notification_email_queue q2 join public.notifications n on n.id=q2.notification_id
 where n.email_status in ('pending','failed') and q2.attempts<5 and q2.next_attempt_at<=now() and (q2.lease_until is null or q2.lease_until<now())
 order by q2.next_attempt_at limit least(greatest(batch_size,1),20) for update of q2 skip locked)
 returning q.notification_id,q.attempts,q.lease_id)
 select to_jsonb(n)||jsonb_build_object('attempt',q.attempts,'lease_id',q.lease_id,'email',p.email,'recipient_name',p.name)
 from claimed q join public.notifications n on n.id=q.notification_id join public.profiles p on p.id=n.user_id;
end $$;
revoke all on function public.claim_notification_emails(integer) from public,anon,authenticated;
grant execute on function public.claim_notification_emails(integer) to service_role;
create function public.finish_notification_email(target uuid,lease uuid,delivered boolean,disabled boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.notification_email_queue where notification_id=target and lease_id=lease for update;
 if not found then raise exception 'Delivery lease expired';end if;
 update public.notifications set email_status=case when delivered then 'sent' when disabled then 'disabled' else 'failed' end,email_sent_at=case when delivered then now() else email_sent_at end where id=target;
 if delivered or disabled then delete from public.notification_email_queue where notification_id=target;
 else update public.notification_email_queue set lease_until=null,lease_id=null,next_attempt_at=now()+interval '1 day' where notification_id=target;end if;
end $$;
revoke all on function public.finish_notification_email(uuid,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.finish_notification_email(uuid,uuid,boolean,boolean) to service_role;
 create or replace function public.guard_application_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then return new; end if; -- Internal operations still obey grants/RLS.
 if tg_op='INSERT' then
  if new.status is distinct from 'pending' or not exists(
   select 1 from public.student_profiles s join public.profiles p on p.id=s.user_id
   where s.id=new.student_id and s.user_id=auth.uid() and p.role='student') then
   raise exception 'Application must be submitted by its candidate with pending status';
  end if;
  perform 1 from public.jobs j where j.id=new.job_id and j.is_active=true and (j.renewal_deadline is null or j.renewal_deadline>now()) for share;
  if not found then raise exception 'This vacancy is not accepting applications'; end if;
  new.created_at=now();
 else
  if (new.id,new.student_id,new.job_id,new.created_at) is distinct from (old.id,old.student_id,old.job_id,old.created_at) then
   raise exception 'Application identity is immutable';
  end if;
  if new.status not in ('pending','accepted','rejected') or new.status is null or not exists(
   select 1 from public.jobs j join public.company_profiles cp on cp.id=j.company_id
   join public.profiles p on p.id=cp.user_id
   where j.id=new.job_id and cp.user_id=auth.uid() and p.role in ('company','admin')) then
   raise exception 'Application status change not authorized';
  end if;
 end if;
 return new;
end $$;
