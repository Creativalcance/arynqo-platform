-- Admins with an owned company use the same candidate consent and vacancy boundaries.
-- Launch access never replaces candidate consent.
create or replace function public.can_company_read_student_profile(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
  where cp.user_id=auth.uid() and p.role in ('company','admin') and (
   exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id
    where a.student_id=target_student_id and j.company_id=cp.id)
   or exists(select 1 from public.candidate_contact_requests r join public.jobs j on j.id=r.job_id
    join public.student_profiles s on s.id=r.student_id
    where r.student_id=target_student_id and r.company_id=cp.id and j.company_id=cp.id
      and r.status='accepted' and coalesce(s.contact_visibility,'approval_required')<>'closed')
  )
 );
$$;
revoke all on function public.can_company_read_student_profile(uuid) from public, anon;
grant execute on function public.can_company_read_student_profile(uuid) to authenticated;

-- Return only an explicit preview allowlist until the candidate grants access.
create or replace function public.company_candidate_snapshots(student_ids uuid[])
returns setof jsonb language sql stable security definer set search_path = '' as $$
 select case when public.can_company_read_student_profile(s.id) then
  (to_jsonb(s) - 'ai_embedding') || jsonb_build_object('profiles',
    (select jsonb_build_object('id',p.id,'name',p.name,'email',p.email) from public.profiles p where p.id=s.user_id))
 else jsonb_build_object('id',s.id,'user_id',s.user_id,'headline',s.headline,
  'location',s.location,'desired_area',s.desired_area,'seniority',s.seniority,
  'work_model',s.work_model,'talent_type',s.talent_type,'contact_visibility',s.contact_visibility,
  'profiles',null,'ai_summary',null,'avatar_url',null) end
 from public.student_profiles s
 where s.id=any(student_ids) and cardinality(student_ids)<=200
 and exists(select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
  where cp.user_id=auth.uid() and p.role in ('company','admin'));
$$;
revoke all on function public.company_candidate_snapshots(uuid[]) from public, anon;
grant execute on function public.company_candidate_snapshots(uuid[]) to authenticated;


create or replace function public.guard_candidate_contact_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then
  if current_user='postgres' or current_setting('request.jwt.claim.role',true)='service_role' then return new; end if;
  raise exception 'Authentication required';
 end if;
 if tg_op='UPDATE' and (new.id,new.company_id,new.student_id,new.job_id,new.created_at)
    is distinct from (old.id,old.company_id,old.student_id,old.job_id,old.created_at) then
  raise exception 'Contact request identity is immutable';
 end if;
 if exists(select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
    join public.jobs j on j.company_id=cp.id where cp.id=new.company_id and cp.user_id=auth.uid()
    and p.role in ('company','admin') and j.id=new.job_id)
 then
  if new.status<>'pending' or (tg_op='UPDATE' and old.status<>'pending') then
    raise exception 'Only the candidate can answer a contact request';
  end if;
  perform 1 from public.jobs j where j.id=new.job_id and j.is_active=true
    and (j.renewal_deadline is null or j.renewal_deadline>now()) for share;
  if not found then raise exception 'Vacancy unavailable'; end if;
  if not exists(select 1 from public.student_profiles s join public.profiles p on p.id=s.user_id
    where s.id=new.student_id and p.role='student' and coalesce(s.contact_visibility,'approval_required')<>'closed') then
    raise exception 'Contact request requires a compatible candidate accepting requests';
  end if;
 elsif tg_op='UPDATE' and exists(select 1 from public.student_profiles s where s.id=new.student_id and s.user_id=auth.uid()) then
  if old.status<>'pending' or new.status not in ('accepted','rejected') or new.message is distinct from old.message then
    raise exception 'Invalid contact response';
  end if;
 else raise exception 'Contact request not authorized';
 end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function public.guard_candidate_contact_request() from public, anon, authenticated;



create or replace function public.guard_company_candidate_action()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then return new; end if;
 if new.action_type is null or new.action_type not in ('shortlisted','accepted') or not exists(
  select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
  join public.jobs j on j.company_id=cp.id
  where cp.id=new.company_id and cp.user_id=auth.uid() and p.role in ('company','admin') and j.id=new.job_id) then
  raise exception 'Company candidate action not authorized';
 end if;
 if not exists(select 1 from public.ai_matches m where m.student_id=new.student_id and m.job_id=new.job_id)
 and not exists(select 1 from public.applications a where a.student_id=new.student_id and a.job_id=new.job_id)
 and not exists(select 1 from public.candidate_contact_requests r where r.student_id=new.student_id and r.job_id=new.job_id and r.company_id=new.company_id) then
  raise exception 'Candidate is not associated with this vacancy';
 end if;
 if new.action_type='accepted' and not (
  exists(select 1 from public.applications a where a.student_id=new.student_id and a.job_id=new.job_id)
  or exists(select 1 from public.candidate_contact_requests r join public.student_profiles s on s.id=r.student_id
   where r.company_id=new.company_id and r.student_id=new.student_id and r.job_id=new.job_id
   and r.status='accepted' and coalesce(s.contact_visibility,'approval_required')<>'closed')) then
  raise exception 'Candidate consent required for this vacancy';
 end if;
 new.created_at=now();
 return new;
end $$;
revoke all on function public.guard_company_candidate_action() from public,anon,authenticated;

-- Paginated discovery returns the same consent-controlled snapshots as matches.
create function public.company_candidate_directory(target_job_id uuid default null, search_text text default '', page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare company uuid; result jsonb;
begin
 select cp.id into company from public.company_profiles cp join public.profiles p on p.id=cp.user_id
 where cp.user_id=auth.uid() and p.role in ('company','admin');
 if company is null then raise exception 'Company account required'; end if;
 if target_job_id is not null and not exists(select 1 from public.jobs where id=target_job_id and company_id=company) then
  raise exception 'Vacancy not authorized';
 end if;
 if page_number is null or page_number<1 or page_number>100000 or length(search_text)>100 then raise exception 'Invalid directory filters'; end if;
 with available as (
  select s.id from public.student_profiles s join public.profiles p on p.id=s.user_id
  where p.role='student' and nullif(btrim(s.headline),'') is not null
  and (coalesce(s.contact_visibility,'approval_required')<>'closed' or public.can_company_read_student_profile(s.id))
  and (coalesce(search_text,'')='' or strpos(lower(concat_ws(' ',s.headline,s.location,s.desired_area)),lower(search_text))>0)
 ), batch as (select id from available order by id limit 24 offset (page_number-1)*24),
 snapshots as (
  select snapshot from public.company_candidate_snapshots(coalesce((select array_agg(id) from batch),array[]::uuid[])) snapshot
 )
 select jsonb_build_object('total',(select count(*) from available),'items',coalesce(
  (select jsonb_agg(snapshot || jsonb_build_object(
    'has_application',exists(select 1 from public.applications a where a.student_id=(snapshot->>'id')::uuid and a.job_id=target_job_id),
    'contact_request_status',(select r.status from public.candidate_contact_requests r where r.student_id=(snapshot->>'id')::uuid and r.company_id=company and r.job_id=target_job_id)
   ) order by snapshot->>'id') from snapshots),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.company_candidate_directory(uuid,text,integer) from public,anon;
grant execute on function public.company_candidate_directory(uuid,text,integer) to authenticated;

create or replace function public.enqueue_platform_notification(recipient uuid,event text,heading text,body text,kind text,entity uuid,path text,label text)
returns void language plpgsql security definer set search_path='' as $$
declare enabled boolean;
begin
 select coalesce(p.email_enabled,true) and (case when kind='job_renewal' then true when kind='candidate_contact_request' then coalesce(p.contact_requests_enabled,true) else coalesce(p.application_updates_enabled,true) end) into enabled
 from (select 1) v left join public.notification_preferences p on p.user_id=recipient;
 insert into public.notifications(user_id,event_key,title,message,related_type,related_id,related_url,action_label,channels,email_status,push_status)
 values(recipient,event,heading,body,kind,entity,path,label,array['in_app','email'],case when enabled then 'pending' else 'disabled' end,'disabled')
 on conflict(event_key) do nothing;
end $$;
revoke all on function public.enqueue_platform_notification(uuid,text,text,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_platform_notification(uuid,text,text,text,text,uuid,text,text) to service_role;

create function public.contact_request_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare company_user uuid; student_user uuid; company_name text; job_title text; heading text;
begin
 select c.user_id,c.company_name,j.title into company_user,company_name,job_title from public.jobs j join public.company_profiles c on c.id=j.company_id where j.id=new.job_id and c.id=new.company_id;
 select s.user_id into student_user from public.student_profiles s where s.id=new.student_id;
 if tg_op='INSERT' then
  perform public.enqueue_platform_notification(student_user,'candidate_contact_request:'||new.id||':'||student_user||':pending','Pedido de contacto recebido',
   'A empresa '||coalesce(company_name,'ARYNQO')||' quer contactar-te sobre a vaga "'||job_title||'".','candidate_contact_request',new.id,'/dashboard/notificacoes','Responder ao pedido');
 elsif new.status is distinct from old.status and new.status in ('accepted','rejected') then
  heading:=case when new.status='accepted' then 'Pedido de contacto aceite' else 'Pedido de contacto recusado' end;
  perform public.enqueue_platform_notification(company_user,'candidate_contact_request:'||new.id||':'||company_user||':'||new.status,heading,
   'O candidato '||case when new.status='accepted' then 'aceitou' else 'recusou' end||' o pedido relativo à vaga "'||job_title||'".','candidate_contact_request',new.id,
   case when new.status='accepted' then '/empresa/candidatos/'||new.student_id||'?jobId='||new.job_id else '/empresa/talentos' end,'Ver pedido');
 end if;
 return new;
end $$;
revoke all on function public.contact_request_notifications() from public,anon,authenticated;
create trigger contact_request_event after insert or update of status on public.candidate_contact_requests for each row execute function public.contact_request_notifications();
