-- Sources are fetched before any provider call. Release only those unused
-- reservations; failures after a provider call keep their conservative budget.
create or replace function public.academy_fail_run(run_id uuid,token uuid,error_code text)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.academy_generation_runs;
begin
 -- Same lock order as claim: settings, run, monthly budget.
 perform 1 from public.academy_automation_settings where id=true for update;
 select * into r from public.academy_generation_runs g
 where g.id=run_id and g.lease_token=token and g.status='running' for update;
 if r.id is null then return; end if;
 if error_code in ('source_unavailable','source_too_large','source_empty','invalid_source') then
  update public.academy_monthly_usage set reserved_requests=greatest(0,reserved_requests-6)
  where month=date_trunc('month',r.started_at)::date;
 end if;
 update public.academy_generation_runs g set status='failed',
 error_code=left(academy_fail_run.error_code,100),lease_token=null,lease_until=null where g.id=r.id;
end $$;
revoke all on function public.academy_fail_run(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.academy_fail_run(uuid,uuid,text) to service_role;

-- Repair only first attempts proven to have failed before spending any tokens.
-- Migration history ensures this historical reconciliation is applied once.
update public.academy_monthly_usage u set reserved_requests=greatest(0,u.reserved_requests-f.unused)
from (
 select date_trunc('month',started_at)::date as month,count(*)::integer*6 as unused
 from public.academy_generation_runs
 where status='failed' and attempts=1 and input_tokens=0 and output_tokens=0
 and error_code in ('source_unavailable','source_too_large','source_empty','invalid_source')
 group by 1
) f where u.month=f.month;
