-- Client inserts supply only entity identifiers. Status and timestamps are server defaults.
revoke insert on public.applications from authenticated;
revoke insert(id,job_id,student_id,status,created_at) on public.applications from authenticated;
grant insert(job_id,student_id) on public.applications to authenticated;

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
  perform 1 from public.jobs j where j.id=new.job_id and j.is_active=true for share;
  if not found then raise exception 'This vacancy is not accepting applications'; end if;
  new.created_at=now();
 else
  if (new.id,new.student_id,new.job_id,new.created_at) is distinct from (old.id,old.student_id,old.job_id,old.created_at) then
   raise exception 'Application identity is immutable';
  end if;
  if new.status not in ('pending','accepted','rejected') or new.status is null or not exists(
   select 1 from public.jobs j join public.company_profiles cp on cp.id=j.company_id
   join public.profiles p on p.id=cp.user_id
   where j.id=new.job_id and cp.user_id=auth.uid() and p.role='company') then
   raise exception 'Application status change not authorized';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_application_write() from public,anon,authenticated;
create trigger validate_application before insert or update on public.applications
 for each row execute function public.guard_application_write();

revoke update on public.company_candidate_actions from authenticated;
revoke update(id,company_id,student_id,job_id,action_type,created_at) on public.company_candidate_actions from authenticated;
revoke insert on public.company_candidate_actions from authenticated;
revoke insert(id,company_id,student_id,job_id,action_type,created_at) on public.company_candidate_actions from authenticated;
grant insert(company_id,student_id,job_id,action_type) on public.company_candidate_actions to authenticated;
create unique index company_candidate_action_once on public.company_candidate_actions(company_id,student_id,job_id,action_type);

create or replace function public.guard_company_candidate_action()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then return new; end if;
 if new.action_type is null or new.action_type not in ('shortlisted','accepted') or not exists(
  select 1 from public.company_profiles cp join public.profiles p on p.id=cp.user_id
  join public.jobs j on j.company_id=cp.id
  where cp.id=new.company_id and cp.user_id=auth.uid() and p.role='company' and j.id=new.job_id) then
  raise exception 'Company candidate action not authorized';
 end if;
 if not exists(select 1 from public.ai_matches m where m.student_id=new.student_id and m.job_id=new.job_id)
 and not exists(select 1 from public.applications a where a.student_id=new.student_id and a.job_id=new.job_id) then
  raise exception 'Candidate is not associated with this vacancy';
 end if;
 if new.action_type='accepted' and not (
  exists(select 1 from public.applications a where a.student_id=new.student_id and a.job_id=new.job_id)
  or exists(select 1 from public.student_profiles s where s.id=new.student_id and s.contact_visibility='open')
  or exists(select 1 from public.candidate_contact_requests r join public.student_profiles s on s.id=r.student_id
   where r.company_id=new.company_id and r.student_id=new.student_id and r.job_id=new.job_id
   and r.status='accepted' and s.contact_visibility='approval_required')) then
  raise exception 'Candidate consent required for this vacancy';
 end if;
 new.created_at=now();
 return new;
end $$;
revoke all on function public.guard_company_candidate_action() from public,anon,authenticated;
create trigger validate_company_action before insert on public.company_candidate_actions
 for each row execute function public.guard_company_candidate_action();

-- Saved/ignored are preferences, not applications. Historical applied rows are preserved.
revoke update on public.candidate_actions from authenticated;
revoke insert on public.candidate_actions from authenticated;
revoke insert(id,student_id,job_id,action_type,created_at) on public.candidate_actions from authenticated;
grant insert(student_id,job_id,action_type) on public.candidate_actions to authenticated;
create unique index candidate_preference_once on public.candidate_actions(student_id,job_id,action_type);
create or replace function public.guard_candidate_preference()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then return new; end if;
 if new.action_type is null or new.action_type not in ('saved','ignored') or not exists(
  select 1 from public.student_profiles s join public.profiles p on p.id=s.user_id
  where s.id=new.student_id and s.user_id=auth.uid() and p.role='student') then
  raise exception 'Invalid candidate preference';
 end if;
 perform 1 from public.jobs j where j.id=new.job_id and j.is_active=true for share;
 if not found then raise exception 'Vacancy unavailable'; end if;
 new.created_at=now(); return new;
end $$;
revoke all on function public.guard_candidate_preference() from public,anon,authenticated;
create trigger validate_candidate_preference before insert on public.candidate_actions
 for each row execute function public.guard_candidate_preference();
