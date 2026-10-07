-- Accept the operation used by POST /api/occupations; retain all quota and access checks.
create or replace function public.consume_api_limit(p_user_id uuid, p_operation text, p_limit integer, p_seconds integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  started timestamptz;
  consumed integer;
begin
  if p_user_id is null or p_operation not in ('ai', 'matching', 'notifications', 'admin-read', 'admin-export', 'academy_admin', 'external_jobs_admin', 'occupation-create')
     or p_limit < 1 or p_seconds < 1 then
    raise exception 'Invalid API limit parameters' using errcode = '22023';
  end if;
  started := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_seconds) * p_seconds);
  insert into private.api_limits as quota (user_id, operation, window_start, request_count)
  values (p_user_id, p_operation, started, 1)
  on conflict (user_id, operation) do update
    set window_start = excluded.window_start,
        request_count = case when quota.window_start = excluded.window_start then quota.request_count + 1 else 1 end
    where quota.window_start <> excluded.window_start or quota.request_count < p_limit
  returning request_count into consumed;
  if consumed is null then
    raise exception 'API request limit reached' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.consume_api_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_limit(uuid, text, integer, integer) to service_role;
