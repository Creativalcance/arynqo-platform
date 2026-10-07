-- Company-level consent requests do not require a vacancy. Existing job requests retain their scope.
alter table public.candidate_contact_requests alter column job_id drop not null;
create unique index candidate_contact_requests_company_profile_unique
 on public.candidate_contact_requests(company_id,student_id) where job_id is null;

create or replace function public.can_company_read_student_profile(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
  where cp.user_id=auth.uid() and p.role in ('company','admin') and (
   exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id
    where a.student_id=target_student_id and j.company_id=cp.id)
   or exists(select 1 from public.candidate_contact_requests r left join public.jobs j on j.id=r.job_id
    join public.student_profiles s on s.id=r.student_id
    where r.student_id=target_student_id and r.company_id=cp.id and (r.job_id is null or j.company_id=cp.id)
      and r.status='accepted' and coalesce(s.contact_visibility,'approval_required')<>'closed')
  )
 );
$$;
revoke all on function public.can_company_read_student_profile(uuid) from public, anon;
grant execute on function public.can_company_read_student_profile(uuid) to authenticated;

create or replace function public.guard_candidate_contact_request()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then
  if current_setting('request.jwt.claim.role',true)='service_role' then return new; end if;
  raise exception 'Authentication required';
 end if;
 if tg_op='UPDATE' and (new.id,new.company_id,new.student_id,new.job_id,new.created_at)
    is distinct from (old.id,old.company_id,old.student_id,old.job_id,old.created_at) then
  raise exception 'Contact request identity is immutable';
 end if;
 if exists(select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
   where cp.id=new.company_id and cp.user_id=auth.uid() and p.role in ('company','admin')) then
  if new.status<>'pending' or (tg_op='UPDATE' and old.status<>'pending') then
   raise exception 'Only the candidate can answer a contact request';
  end if;
  if exists(select 1 from public.account_controls where user_id=auth.uid())
   or not exists(select 1 from auth.users u where u.id=auth.uid() and (u.banned_until is null or u.banned_until<=now())) then
   raise exception 'Company account unavailable';
  end if;
  if new.job_id is not null then
   perform 1 from public.jobs j where j.id=new.job_id and j.company_id=new.company_id
    and j.is_active=true and (j.renewal_deadline is null or j.renewal_deadline>now()) for share;
   if not found then raise exception 'Vacancy unavailable or not authorized'; end if;
  else
   if not exists(select 1 from private.candidate_directory_access where singleton and launch_free)
    and not exists(select 1 from public.profiles where id=auth.uid() and subscription_plan='premium' and subscription_status='active') then
    raise exception 'Candidate directory plan required' using errcode='42501';
   end if;
  end if;
  if not exists(select 1 from public.student_profiles s join public.profiles p on p.id=s.user_id join auth.users u on u.id=s.user_id
   where s.id=new.student_id and p.role='student' and coalesce(s.contact_visibility,'approval_required')<>'closed'
   and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())
   and not exists(select 1 from public.account_controls ac where ac.user_id=s.user_id)) then
   raise exception 'Candidate unavailable or not accepting requests';
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
revoke all on function public.guard_candidate_contact_request() from public,anon,authenticated;

create or replace function public.contact_request_notifications() returns trigger language plpgsql security definer set search_path='' as $$
declare company_user uuid; student_user uuid; company_name text; job_title text; heading text; body text;
begin
 select c.user_id,c.company_name,j.title into company_user,company_name,job_title
 from public.company_profiles c left join public.jobs j on j.id=new.job_id and j.company_id=c.id where c.id=new.company_id;
 select s.user_id into student_user from public.student_profiles s where s.id=new.student_id;
 if tg_op='INSERT' then
  body:=case when new.job_id is null then 'A empresa '||coalesce(company_name,'ARYNQO')||' pede autorização para consultar o teu perfil completo e os teus contactos.'
   else 'A empresa '||coalesce(company_name,'ARYNQO')||' quer contactar-te sobre a vaga "'||job_title||'".' end;
  perform public.enqueue_platform_notification(student_user,'candidate_contact_request:'||new.id||':'||student_user||':pending','Pedido de contacto recebido',
   body,'candidate_contact_request',new.id,'/dashboard/notificacoes','Responder ao pedido');
 elsif new.status is distinct from old.status and new.status in ('accepted','rejected') then
  update public.notifications set is_read=true,action_label='Pedido respondido'
  where user_id=student_user and related_id=new.id and related_type in ('candidate_contact_request','contact_request');
  heading:=case when new.status='accepted' then 'Pedido de contacto aceite' else 'Pedido de contacto recusado' end;
  body:='O candidato '||case when new.status='accepted' then 'aceitou' else 'recusou' end||
   case when new.job_id is null then ' o pedido de acesso ao perfil.' else ' o pedido relativo à vaga "'||job_title||'".' end;
  perform public.enqueue_platform_notification(company_user,'candidate_contact_request:'||new.id||':'||company_user||':'||new.status,heading,
   body,'candidate_contact_request',new.id,
   case when new.status='accepted' then '/empresa/candidatos/'||new.student_id||case when new.job_id is null then '' else '?jobId='||new.job_id end else '/empresa/talentos' end,'Ver pedido');
 end if;
 return new;
end $$;
revoke all on function public.contact_request_notifications() from public,anon,authenticated;

create or replace function private.search_company_candidates(target_job_id uuid, search_text text, page_number integer, filters jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare company uuid; entitled boolean; result jsonb;
begin
 if auth.uid() is null then raise exception 'Company account required'; end if;
 select cp.id, (coalesce((select launch_free from private.candidate_directory_access where singleton),false)
   or (p.subscription_plan='premium' and p.subscription_status='active'))
 into company,entitled
 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
 join auth.users u on u.id=p.id
 where cp.user_id=auth.uid() and p.role in ('company','admin')
 and (u.banned_until is null or u.banned_until<=now())
 and not exists(select 1 from public.account_controls ac where ac.user_id=p.id);
 if company is null then raise exception 'Company account required'; end if;
 if not coalesce(entitled,false) then raise exception 'Candidate directory plan required' using errcode='42501'; end if;
 if target_job_id is not null and not exists(select 1 from public.jobs where id=target_job_id and company_id=company) then
  raise exception 'Vacancy not authorized';
 end if;
 if page_number is null or page_number<1 or page_number>100000 or length(search_text)>100
 or filters is null or jsonb_typeof(filters)<>'object' then raise exception 'Invalid directory filters'; end if;
 if exists(select 1 from jsonb_each(filters) f where f.key not in ('location','seniority','work_model','availability','skill')
  or jsonb_typeof(f.value)<>'string' or length(f.value #>> '{}')>100) then raise exception 'Invalid directory filters'; end if;
 with available as materialized (
  select s.id,o.label as profession from public.student_profiles s join public.profiles p on p.id=s.user_id
  join auth.users u on u.id=s.user_id
  left join public.matching_occupations o on o.id::text=s.matching_preferences->>'profession'
  where p.role='student' and (u.banned_until is null or u.banned_until<=now()) and u.email_confirmed_at is not null
  and not exists(select 1 from public.account_controls ac where ac.user_id=s.user_id)
  and coalesce(s.contact_visibility,'approval_required')<>'closed'
  and (coalesce(btrim(search_text),'')='' or strpos(lower(concat_ws(' ',s.headline,s.main_role,s.desired_area,s.location,o.label)),lower(btrim(search_text)))>0)
  and (coalesce(filters->>'location','')='' or strpos(lower(coalesce(s.location,'')),lower(filters->>'location'))>0)
  and (coalesce(filters->>'seniority','')='' or coalesce(s.matching_preferences->'levels','[]'::jsonb) ? (filters->>'seniority') or (s.matching_preferences is null and lower(s.seniority)=lower(case filters->>'seniority' when 'entry' then 'Sem experiência' when 'junior' then 'Júnior' when 'mid' then 'Pleno' when 'senior' then 'Sénior' when 'specialist' then 'Especialista' when 'lead' then 'Coordenação' when 'manager' then 'Gestão' when 'director' then 'Direção' else filters->>'seniority' end)))
  and (coalesce(filters->>'work_model','')='' or coalesce(s.matching_preferences->'models','[]'::jsonb) ? (filters->>'work_model') or (s.matching_preferences is null and lower(s.work_model) in (lower(filters->>'work_model'),case filters->>'work_model' when 'onsite' then 'presencial' when 'hybrid' then 'híbrido' when 'remote' then 'remoto' end,case when filters->>'work_model'='onsite' then 'presential' end)))
  and (coalesce(filters->>'availability','')='' or s.availability=filters->>'availability')
  and (coalesce(filters->>'skill','')='' or exists(select 1 from jsonb_array_elements_text(coalesce(s.matching_preferences->'skills','[]'::jsonb)) sk(name) where strpos(lower(sk.name),lower(filters->>'skill'))>0) or exists(select 1 from public.student_skills ss join public.skills sk on sk.id=ss.skill_id
   where ss.student_id=s.id and strpos(lower(sk.name),lower(filters->>'skill'))>0))
 ), batch as (select id,profession from available order by id limit 24 offset (page_number-1)*24),
 snapshots as (
  select snapshot from public.company_candidate_snapshots(coalesce((select array_agg(id) from batch),array[]::uuid[])) snapshot
 )
 select jsonb_build_object('total',(select count(*) from available),'items',coalesce(
  (select jsonb_agg(snapshot || jsonb_build_object(
    'profession',(select b.profession from batch b where b.id=(snapshot->>'id')::uuid),
    'has_application',exists(select 1 from public.applications a where a.student_id=(snapshot->>'id')::uuid and a.job_id=target_job_id),
    'contact_request_status',(select r.status from public.candidate_contact_requests r where r.student_id=(snapshot->>'id')::uuid and r.company_id=company and r.job_id is not distinct from target_job_id)
   ) order by snapshot->>'id') from snapshots),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function private.search_company_candidates(uuid,text,integer,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.search_company_candidates(uuid,text,integer,jsonb) to authenticated;

notify pgrst,'reload schema';
