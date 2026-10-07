-- The launch offer is enforced by the database, independently of browser state.
create table private.candidate_directory_access (
 singleton boolean primary key default true check(singleton),
 launch_free boolean not null default true
);
alter table private.candidate_directory_access enable row level security;
revoke all on private.candidate_directory_access from public, anon, authenticated;
grant select, update on private.candidate_directory_access to service_role;
insert into private.candidate_directory_access(singleton,launch_free) values(true,true);

-- Privileged lookup is private: every entry point checks the caller and returns
-- the existing consent-controlled snapshots, never unrestricted profile rows.
create function private.search_company_candidates(target_job_id uuid, search_text text, page_number integer, filters jsonb)
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
    'contact_request_status',(select r.status from public.candidate_contact_requests r where r.student_id=(snapshot->>'id')::uuid and r.company_id=company and r.job_id=target_job_id)
   ) order by snapshot->>'id') from snapshots),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function private.search_company_candidates(uuid,text,integer,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.search_company_candidates(uuid,text,integer,jsonb) to authenticated;

create function public.company_candidate_search(target_job_id uuid default null, search_text text default '', page_number integer default 1, filters jsonb default '{}'::jsonb)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.search_company_candidates(target_job_id,search_text,page_number,filters);
$$;
revoke all on function public.company_candidate_search(uuid,text,integer,jsonb) from public,anon;
grant execute on function public.company_candidate_search(uuid,text,integer,jsonb) to authenticated;

-- Keep older clients working with the same access checks and closed-profile rule.
-- Legacy search used a combined function/area/location field; preserve it by
-- using the same combined search. Current clients also have explicit filters.
create or replace function public.company_candidate_directory(target_job_id uuid default null, search_text text default '', page_number integer default 1)
returns jsonb language sql stable security invoker set search_path='' as $$
 select public.company_candidate_search(target_job_id,search_text,page_number,'{}'::jsonb);
$$;
revoke all on function public.company_candidate_directory(uuid,text,integer) from public,anon;
grant execute on function public.company_candidate_directory(uuid,text,integer) to authenticated;
notify pgrst,'reload schema';
