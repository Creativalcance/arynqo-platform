-- Keep a content-free run marker so deletion does not reset the editorial
-- calendar or the AI budget. Article text, translations and queued mail are
-- removed together; other drafts of the same topic are independent.
alter table public.academy_generation_runs
  drop constraint academy_generation_runs_status_check;
alter table public.academy_generation_runs
  add constraint academy_generation_runs_status_check
  check (status in ('queued','running','failed','review','published','deleted'));

create function public.academy_delete_content(target_post uuid default null, target_run uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  r public.academy_generation_runs;
  article uuid;
begin
  if (target_post is null) = (target_run is null) then
    raise exception 'invalid_deletion';
  end if;

  -- Serialize with claims; NOWAIT also avoids conflicting with an editor or
  -- a publisher that already holds the article lock in a different order.
  perform 1 from public.academy_automation_settings where id=true for update nowait;
  if target_run is not null then
    select * into r from public.academy_generation_runs where id=target_run for update nowait;
  else
    select * into r from public.academy_generation_runs where post_id=target_post for update nowait;
  end if;
  if r.status='deleted' or (target_run is not null and r.id is null) then
    return jsonb_build_object('success',true,'already_deleted',true);
  end if;
  if r.status='running' and (r.lease_until is null or r.lease_until>now()) then
    raise exception 'academy_delete_busy';
  end if;

  article=coalesce(target_post,r.post_id);
  if article is not null then
    perform 1 from public.academy_posts where id=article for update nowait;
    -- Claims skip these locked deliveries. A message already being sent must
    -- finish before deletion; pending messages disappear with their event.
    perform 1 from public.academy_email_deliveries where post_id=article for update nowait;
    if exists(select 1 from public.academy_email_deliveries
      where post_id=article and status='processing' and lease_until>now()) then
      raise exception 'academy_delete_busy';
    end if;
  end if;

  if r.id is not null then
    update public.academy_generation_runs set status='deleted',error_code=null,
      sources='[]',lease_token=null,lease_until=null,completed_at=now()
    where id=r.id;
  end if;
  delete from public.academy_posts where id=article;
  return jsonb_build_object('success',true,'post_id',article,'run_id',r.id);
exception when lock_not_available then
  raise exception 'academy_delete_busy';
end $$;

revoke all on function public.academy_delete_content(uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_delete_content(uuid,uuid) to service_role;
