-- Fields already used by profile forms but absent from the inspected database.
alter table public.student_profiles
 add column if not exists phone text,
 add column if not exists main_role text,
 add column if not exists expected_salary text,
 add column if not exists preferred_regions text;

-- Full candidate rows require an application, accepted consent, or an open matched profile.
create or replace function public.can_company_read_student_profile(target_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
  where cp.user_id=auth.uid() and p.role='company' and (
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
  where cp.user_id=auth.uid() and p.role='company' and (
   exists(select 1 from public.ai_matches m join public.jobs j on j.id=m.job_id where m.student_id=s.id and j.company_id=cp.id)
   or exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id where a.student_id=s.id and j.company_id=cp.id)
  ));
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
    and p.role='company' and j.id=new.job_id)
 then
  if new.status<>'pending' or (tg_op='UPDATE' and old.status<>'pending') then
    raise exception 'Only the candidate can answer a contact request';
  end if;
  if not exists(select 1 from public.student_profiles s join public.ai_matches m on m.student_id=s.id
    where s.id=new.student_id and m.job_id=new.job_id and s.contact_visibility='approval_required') then
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
create trigger protect_contact_request before insert or update on public.candidate_contact_requests
 for each row execute function public.guard_candidate_contact_request();

-- Companies can change only an application's status, never its candidate or vacancy.
revoke update on public.applications from authenticated;
grant update(status) on public.applications to authenticated;

-- Logo paths start with the company id (not the user id).
drop policy "Authenticated users can upload company logos" on storage.objects;
drop policy "Authenticated users can update company logos" on storage.objects;
drop policy "Authenticated users can delete company logos" on storage.objects;
create policy "Company can insert own logo" on storage.objects for insert to authenticated with check (
 bucket_id='company-logos' and exists(select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
 where cp.id::text=(storage.foldername(storage.objects.name))[1] and cp.user_id=auth.uid() and p.role='company'));
create policy "Company can update own logo" on storage.objects for update to authenticated using (
 bucket_id='company-logos' and exists(select 1 from public.company_profiles cp where cp.id::text=(storage.foldername(storage.objects.name))[1] and cp.user_id=auth.uid())) with check (
 bucket_id='company-logos' and exists(select 1 from public.company_profiles cp where cp.id::text=(storage.foldername(storage.objects.name))[1] and cp.user_id=auth.uid()));
create policy "Company can delete own logo" on storage.objects for delete to authenticated using (
 bucket_id='company-logos' and exists(select 1 from public.company_profiles cp where cp.id::text=(storage.foldername(storage.objects.name))[1] and cp.user_id=auth.uid()));

create policy "Company can read authorized CV" on storage.objects for select to authenticated using (
 bucket_id in ('student-cvs','cvs') and exists(select 1 from public.student_profiles s
 where s.user_id::text=(storage.foldername(storage.objects.name))[1] and public.can_company_read_student_profile(s.id)));
update storage.buckets set file_size_limit=10485760,
 allowed_mime_types=array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
 where id in ('student-cvs','cvs');
update storage.buckets set file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='company-logos';
