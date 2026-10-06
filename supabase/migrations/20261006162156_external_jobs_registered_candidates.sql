-- Supabase anonymous sign-ins also use the authenticated database role.
alter policy external_details_candidates on public.external_job_details using (
 (select auth.jwt()->>'is_anonymous') is distinct from 'true'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('student','admin'))
 and exists(select 1 from public.external_jobs j where j.id=external_job_details.job_id)
);
