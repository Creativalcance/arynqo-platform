-- Explicit admin retries can recover exhausted runs after a generation fix.
-- Automatic retries stay capped at three; preserve attempts, budget, leases and saved versions.
create or replace function public.academy_claim_run(retry_id uuid default null, manual boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg public.academy_automation_settings; r public.academy_generation_runs; topic uuid; used integer; month_key date=date_trunc('month',now())::date;
begin
 select * into cfg from public.academy_automation_settings where id=true for update;
 if retry_id is null and not manual and not cfg.enabled then return jsonb_build_object('reason','paused'); end if;
 update public.academy_generation_runs set status='failed',error_code='worker_timeout',lease_token=null,lease_until=null where status='running' and lease_until<=now();
 if exists(select 1 from public.academy_generation_runs where status='running' and lease_until>now()) then return jsonb_build_object('reason','already_running'); end if;
 if retry_id is not null then
   select * into r from public.academy_generation_runs where id=retry_id and status in ('failed','queued','running') and (attempts<3 or manual) for update;
   if r.id is null then return jsonb_build_object('reason','not_retryable'); end if;
 else
   select * into r from public.academy_generation_runs where status in ('queued','failed','running') and attempts<3 order by created_at limit 1 for update;
 end if;
 if r.id is null and not manual and cfg.next_due_at>now() then return jsonb_build_object('reason','not_due'); end if;
 insert into public.academy_monthly_usage(month) values(month_key) on conflict do nothing;
 select reserved_requests into used from public.academy_monthly_usage where month=month_key for update;
 if used+6>cfg.monthly_request_limit then return jsonb_build_object('reason','monthly_limit'); end if;
 if r.id is null then
  select t.id into topic from public.academy_topics t where t.enabled and not exists(select 1 from public.academy_generation_runs g where g.topic_id=t.id) order by t.priority,t.created_at,t.id limit 1;
  if topic is null then return jsonb_build_object('reason','calendar_empty'); end if;
  insert into public.academy_generation_runs(topic_id,slot_at,preview_only) values(topic,cfg.next_due_at,manual) returning * into r;
  -- Anchor nominal two-day slots at 09:00 UTC; daily cron jitter must not add another day. No backlog burst after downtime.
  update public.academy_automation_settings set next_due_at=greatest(next_due_at,date_trunc('day',now())+interval '9 hours')+interval '48 hours',updated_at=now() where id;
 end if;
 update public.academy_monthly_usage set reserved_requests=reserved_requests+6 where month=month_key;
 update public.academy_generation_runs set status='running',preview_only=preview_only or manual,attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes',started_at=now(),error_code=null where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.academy_claim_run(uuid,boolean) from public,anon,authenticated;
grant execute on function public.academy_claim_run(uuid,boolean) to service_role;
