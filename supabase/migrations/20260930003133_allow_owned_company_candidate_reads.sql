-- Admins with an owned company use the same candidate consent and vacancy boundaries.
-- Full candidate rows require an application, accepted consent, or an open matched profile.
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
      and r.status='accepted' and s.contact_visibility='approval_required')
   or exists(select 1 from public.ai_matches m join public.jobs j on j.id=m.job_id
    join public.student_profiles s on s.id=m.student_id
    where m.student_id=target_student_id and j.company_id=cp.id and s.contact_visibility='open')
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
  where cp.user_id=auth.uid() and p.role in ('company','admin') and (
   exists(select 1 from public.ai_matches m join public.jobs j on j.id=m.job_id where m.student_id=s.id and j.company_id=cp.id)
   or exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id where a.student_id=s.id and j.company_id=cp.id)
  ));
$$;
revoke all on function public.company_candidate_snapshots(uuid[]) from public, anon;
grant execute on function public.company_candidate_snapshots(uuid[]) to authenticated;

