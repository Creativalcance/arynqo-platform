-- Administrative state is not writable by account holders. Deletion state survives
-- partial Storage/Auth failures so a retry cannot accidentally restore access.
create table public.account_controls (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null check(status in ('suspended','deleting')),
 operation_id uuid, busy_until timestamptz
);
create table public.admin_account_operations (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, target_id uuid not null,
 action text not null check(action in ('suspend','restore','delete')),
 reason text not null, status text not null default 'running' check(status in ('running','succeeded','failed')),
 created_at timestamptz not null default now(), finished_at timestamptz
);
alter table public.account_controls enable row level security;
alter table public.admin_account_operations enable row level security;
revoke all on public.account_controls,public.admin_account_operations from public,anon,authenticated;
grant select,insert,update,delete on public.account_controls to service_role;
grant select,insert,update on public.admin_account_operations to service_role;
create index on public.admin_account_operations(target_id,created_at desc);

create function public.account_session_active() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid()
 and (u.banned_until is null or u.banned_until<=now())
 and not exists(select 1 from public.account_controls c where c.user_id=u.id));
$$;
revoke all on function public.account_session_active() from public,anon;
grant execute on function public.account_session_active() to authenticated,service_role;

-- Restrictive policies complement existing ownership rules, including Storage
-- and Realtime. A JWT issued before suspension/deletion cannot bypass them.
do $$ declare t record; begin
 for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and c.relrowsecurity and (n.nspname='public' or (n.nspname='storage' and c.relname='objects')) loop
 execute format('create policy active_account_required on %I.%I as restrictive for all to authenticated using ((select public.account_session_active())) with check ((select public.account_session_active()))',t.nspname,t.relname);
 end loop;
end $$;

-- PostgREST also exposes SECURITY DEFINER RPCs, which do not use table RLS.
create function public.check_account_request() returns void language plpgsql security invoker set search_path='' as $$
begin
 if current_user='authenticated' and not public.account_session_active() then
  raise exception 'Conta suspensa ou indisponível. Contacta o suporte.' using errcode='42501';
 end if;
end $$;
revoke all on function public.check_account_request() from public;
grant execute on function public.check_account_request() to anon,authenticated,service_role;
alter role authenticator set pgrst.db_pre_request='public.check_account_request';
notify pgrst, 'reload config';

create function public.begin_account_operation(p_actor uuid,p_target uuid,p_action text,p_reason text,p_confirmation text)
returns uuid language plpgsql security definer set search_path='' as $$
declare operation uuid; state public.account_controls%rowtype; target_email text; target_role text;
begin
 if p_actor=p_target or p_action not in ('suspend','restore','delete') or length(btrim(p_reason)) not between 5 and 500 then
  raise exception 'Invalid account operation' using errcode='22023';
 end if;
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor and p.role='admin'
 and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from public.account_controls where user_id=p_actor)) then
  raise exception 'Administrator required' using errcode='42501';
 end if;
 select u.email,p.role into target_email,target_role from auth.users u join public.profiles p on p.id=u.id where u.id=p_target for update of u;
 if not found or target_role not in ('student','company') then raise exception 'Account not eligible' using errcode='42501'; end if;
 if lower(btrim(p_confirmation))<>lower(target_email) then raise exception 'Confirmation mismatch' using errcode='22023'; end if;
 select * into state from public.account_controls where user_id=p_target for update;
 if state.busy_until>now() then raise exception 'Operation already running' using errcode='55P03'; end if;
 if state.status='deleting' and p_action<>'delete' then raise exception 'Deletion must be completed' using errcode='55000'; end if;
 if state.operation_id is not null then update public.admin_account_operations set status='failed',finished_at=now() where id=state.operation_id and status='running'; end if;
 insert into public.admin_account_operations(actor_id,target_id,action,reason) values(p_actor,p_target,p_action,btrim(p_reason)) returning id into operation;
 insert into public.account_controls(user_id,status,operation_id,busy_until) values(p_target,case when p_action='delete' then 'deleting' else 'suspended' end,operation,now()+interval '5 minutes')
 on conflict(user_id) do update set status=excluded.status,operation_id=excluded.operation_id,busy_until=excluded.busy_until;
 if p_action in ('suspend','delete') then
  update public.jobs set is_active=false where company_id in(select id from public.company_profiles where user_id=p_target) and is_active;
 end if;
 return operation;
end $$;

create function public.finish_account_operation(p_operation uuid,p_success boolean) returns void
language plpgsql security definer set search_path='' as $$
declare op public.admin_account_operations%rowtype;
begin
 select * into op from public.admin_account_operations where id=p_operation and status='running' for update;
 if not found then raise exception 'Operation not running'; end if;
 if p_success and op.action='restore' then delete from public.account_controls where user_id=op.target_id and operation_id=op.id;
 else update public.account_controls set busy_until=null where user_id=op.target_id and operation_id=op.id; end if;
 update public.admin_account_operations set status=case when p_success then 'succeeded' else 'failed' end,finished_at=now() where id=op.id;
end $$;
revoke all on function public.begin_account_operation(uuid,uuid,text,text,text),public.finish_account_operation(uuid,boolean) from public,anon,authenticated;
grant execute on function public.begin_account_operation(uuid,uuid,text,text,text),public.finish_account_operation(uuid,boolean) to service_role;

-- Exact-email lookup is available only to the rate-limited server endpoint.
create table private.registration_checks (fingerprint text primary key,window_start timestamptz not null,attempts integer not null);
create function public.registration_status(p_email text,p_fingerprint text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare attempts integer; window_time timestamptz:=to_timestamp(floor(extract(epoch from now())/900)*900);
begin
 if length(p_email)>254 or p_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'Invalid request'; end if;
 delete from private.registration_checks where window_start<now()-interval '1 day';
 insert into private.registration_checks as checks values(p_fingerprint,window_time,1)
 on conflict(fingerprint) do update set window_start=excluded.window_start,
 attempts=case when checks.window_start=excluded.window_start then checks.attempts+1 else 1 end returning checks.attempts into attempts;
 if attempts>15 then return jsonb_build_object('limited',true); end if;
 return jsonb_build_object('exists',exists(select 1 from auth.users where lower(email)=lower(btrim(p_email))));
end $$;
revoke all on function public.registration_status(text,text) from public,anon,authenticated;
grant execute on function public.registration_status(text,text) to service_role;

-- Do not offer suspended candidates in new company searches.
create or replace function public.company_candidate_directory(target_job_id uuid default null, search_text text default '', page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare company uuid; result jsonb;
begin
 select cp.id into company from public.company_profiles cp join public.profiles p on p.id=cp.user_id
 where cp.user_id=auth.uid() and p.role in ('company','admin');
 if company is null then raise exception 'Company account required'; end if;
 if target_job_id is not null and not exists(select 1 from public.jobs where id=target_job_id and company_id=company) then
  raise exception 'Vacancy not authorized';
 end if;
 if page_number is null or page_number<1 or page_number>100000 or length(search_text)>100 then raise exception 'Invalid directory filters'; end if;
 with available as (
  select s.id from public.student_profiles s join public.profiles p on p.id=s.user_id
  where p.role='student' and not exists(select 1 from public.account_controls ac where ac.user_id=s.user_id) and exists(select 1 from auth.users u where u.id=s.user_id and (u.banned_until is null or u.banned_until<=now())) and nullif(btrim(s.headline),'') is not null
  and (coalesce(s.contact_visibility,'approval_required')<>'closed' or public.can_company_read_student_profile(s.id))
  and (coalesce(search_text,'')='' or strpos(lower(concat_ws(' ',s.headline,s.location,s.desired_area)),lower(search_text))>0)
 ), batch as (select id from available order by id limit 24 offset (page_number-1)*24),
 snapshots as (
  select snapshot from public.company_candidate_snapshots(coalesce((select array_agg(id) from batch),array[]::uuid[])) snapshot
 )
 select jsonb_build_object('total',(select count(*) from available),'items',coalesce(
  (select jsonb_agg(snapshot || jsonb_build_object(
    'has_application',exists(select 1 from public.applications a where a.student_id=(snapshot->>'id')::uuid and a.job_id=target_job_id),
    'contact_request_status',(select r.status from public.candidate_contact_requests r where r.student_id=(snapshot->>'id')::uuid and r.company_id=company and r.job_id=target_job_id)
   ) order by snapshot->>'id') from snapshots),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.company_candidate_directory(uuid,text,integer) from public,anon;
grant execute on function public.company_candidate_directory(uuid,text,integer) to authenticated;


notify pgrst, 'reload schema';
