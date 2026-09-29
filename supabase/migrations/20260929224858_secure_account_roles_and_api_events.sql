-- Apply before deploying the API changes. No existing user data is rewritten.
-- Table grants otherwise override column-level restrictions.
revoke insert, update on public.profiles from public, anon, authenticated;
revoke insert (id, role, name, email, avatar_url, created_at, subscription_plan, subscription_status, job_view_limit)
  on public.profiles from public, anon, authenticated;
revoke update (id, role, name, email, avatar_url, created_at, subscription_plan, subscription_status, job_view_limit)
  on public.profiles from public, anon, authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- Public registration can select only a normal talent or company account.
-- Admin assignment and commercial entitlements remain privileged operations.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  account_role text := case when new.raw_user_meta_data->>'role' = 'company' then 'company' else 'student' end;
begin
  insert into public.profiles (id, role, name, email)
  values (new.id, account_role, coalesce(new.raw_user_meta_data->>'name', new.email), new.email);
  if account_role = 'student' then
    insert into public.student_profiles (user_id, headline, location, bio)
    values (new.id, '', '', '');
  else
    insert into public.company_profiles (user_id, company_name, description, location)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Empresa'), '', '');
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- End users can mark a notification read, but cannot forge its content or delivery.
revoke insert, update on public.notifications from public, anon, authenticated;
revoke update (id, user_id, title, message, is_read, created_at, related_type, related_id,
  related_url, action_label, email_status, email_sent_at, push_status, push_sent_at, channels)
  on public.notifications from public, anon, authenticated;
grant update (is_read) on public.notifications to authenticated;
drop policy if exists "Authenticated users can create notifications" on public.notifications;

-- Enforce idempotency before sending email, including concurrent duplicate requests.
alter table public.notifications add column event_key text;
create unique index notifications_event_key_unique on public.notifications (event_key);

create schema if not exists private;
create table private.api_limits (
  user_id uuid not null,
  operation text not null,
  window_start timestamptz not null,
  request_count integer not null,
  primary key (user_id, operation)
);
alter table private.api_limits enable row level security;
revoke all on private.api_limits from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on private.api_limits to service_role;

create function public.consume_api_limit(p_user_id uuid, p_operation text, p_limit integer, p_seconds integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  started timestamptz;
  consumed integer;
begin
  if p_user_id is null or p_operation not in ('ai', 'matching', 'notifications')
     or p_limit < 1 or p_seconds < 1 then
    raise exception 'Invalid API limit parameters' using errcode = '22023';
  end if;
  started := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_seconds) * p_seconds);
  insert into private.api_limits as quota (user_id, operation, window_start, request_count)
  values (p_user_id, p_operation, started, 1)
  on conflict (user_id, operation) do update
    set window_start = excluded.window_start,
        request_count = case when quota.window_start = excluded.window_start
          then quota.request_count + 1 else 1 end
    where quota.window_start <> excluded.window_start or quota.request_count < p_limit
  returning request_count into consumed;
  if consumed is null then
    raise exception 'API request limit reached' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.consume_api_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_limit(uuid, text, integer, integer) to service_role;
