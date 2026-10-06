-- External adverts never become company accounts, applications or internal matches.
create table public.external_job_sources (
 provider text primary key check (provider = 'adzuna'),
 enabled boolean not null default false,
 countries text[] not null default '{}',
 terms_confirmed boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 check (cardinality(countries) <= 3),
 check (countries <@ array['gb','us','at','au','be','br','ca','ch','de','es','fr','in','it','mx','nl','nz','pl','sg','za']),
 check (not enabled or (terms_confirmed and cardinality(countries) > 0))
);
insert into public.external_job_sources(provider) values ('adzuna');
create table public.external_jobs (
 id uuid primary key default gen_random_uuid(),
 provider text not null references public.external_job_sources(provider),
 provider_id text not null check (length(provider_id) between 1 and 100),
 country_code text not null,
 title text not null check (length(title) between 1 and 300),
 company_name text not null default '',
 location text not null default '',
 area text not null default '',
 contract_type text,
 created_at timestamptz not null,
 last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null,
 unique(provider,country_code,provider_id)
);
create table public.external_job_details (
 job_id uuid primary key references public.external_jobs(id) on delete cascade,
 description text not null default '',
 source_url text not null check (source_url ~ '^https://')
);
create index external_jobs_expiry_idx on public.external_jobs(expires_at desc,created_at desc);
create table public.external_job_sync_state (
 provider text primary key references public.external_job_sources(provider),
 lease uuid,
 started_at timestamptz,
 finished_at timestamptz,
 status text not null default 'never' check (status in ('never','running','success','partial','failed','cancelled')),
 imported integer not null default 0,
 rejected integer not null default 0,
 failed_countries text[] not null default '{}'
);
insert into public.external_job_sync_state(provider) values ('adzuna');
create table public.external_job_settings_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 enabled boolean not null,
 countries text[] not null,
 terms_confirmed boolean not null,
 created_at timestamptz not null default now()
);
alter table public.external_job_sources enable row level security;
alter table public.external_jobs enable row level security;
alter table public.external_job_details enable row level security;
alter table public.external_job_sync_state enable row level security;
alter table public.external_job_settings_audit enable row level security;
revoke all on public.external_job_sources,public.external_jobs,public.external_job_details,public.external_job_sync_state,public.external_job_settings_audit from public,anon,authenticated;
grant select(provider,enabled,countries) on public.external_job_sources to anon,authenticated;
grant select on public.external_jobs to anon,authenticated;
grant select on public.external_job_details to authenticated;
grant all on public.external_job_sources,public.external_jobs,public.external_job_details,public.external_job_sync_state,public.external_job_settings_audit to service_role;
grant usage,select on sequence public.external_job_settings_audit_id_seq to service_role;
create policy external_source_public on public.external_job_sources for select to anon,authenticated using(true);
create policy external_jobs_public on public.external_jobs for select to anon,authenticated using (
 expires_at > now() and exists (
  select 1 from public.external_job_sources s where s.provider=external_jobs.provider and s.enabled and lower(external_jobs.country_code)=any(s.countries)
 )
);
create policy external_details_candidates on public.external_job_details for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('student','admin'))
 and exists(select 1 from public.external_jobs j where j.id=external_job_details.job_id)
);
-- Server-only, invoker functions: no new privilege bypass or client write grants.
create function public.configure_external_jobs(p_actor uuid,p_enabled boolean,p_countries text[],p_terms boolean)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'Administrator required'; end if;
 update public.external_job_sources set enabled=p_enabled,countries=p_countries,terms_confirmed=p_terms,updated_at=now(),updated_by=p_actor where provider='adzuna';
 insert into public.external_job_settings_audit(actor_id,enabled,countries,terms_confirmed) values(p_actor,p_enabled,p_countries,p_terms);
end $$;
create function public.claim_external_job_sync()
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.external_job_sources; r public.external_job_sync_state; token uuid;
begin
 select * into s from public.external_job_sources where provider='adzuna' for update;
 if not s.enabled then return jsonb_build_object('skipped','disabled'); end if;
 select * into r from public.external_job_sync_state where provider='adzuna' for update;
 if r.started_at > now()-interval '20 hours' then return jsonb_build_object('skipped','cooldown'); end if;
 token:=gen_random_uuid();
 update public.external_job_sync_state set lease=token,started_at=now(),finished_at=null,status='running',imported=0,rejected=0,failed_countries='{}' where provider='adzuna';
 return jsonb_build_object('lease',token,'countries',s.countries);
end $$;
create function public.finish_external_job_sync(p_lease uuid,p_rows jsonb,p_failed text[],p_rejected integer)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.external_job_sources; r public.external_job_sync_state; n integer;
begin
 select * into s from public.external_job_sources where provider='adzuna' for update;
 select * into r from public.external_job_sync_state where provider='adzuna' for update;
 if r.lease is distinct from p_lease or r.status <> 'running' or r.started_at < now()-interval '10 minutes' then raise exception 'Stale import'; end if;
 if not s.enabled or s.updated_at > r.started_at then
  update public.external_job_sync_state set status='cancelled',finished_at=now(),lease=null where provider='adzuna'; return 0;
 end if;
 if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows)>300 then raise exception 'Invalid batch'; end if;
 with incoming as (
  select * from jsonb_to_recordset(p_rows) as x(provider_id text,country_code text,title text,company_name text,description text,location text,area text,contract_type text,source_url text,created_at timestamptz)
  where lower(x.country_code)=any(s.countries) and x.created_at > now()-interval '30 days' and x.created_at <= now()+interval '5 minutes'
 ), saved as (
  insert into public.external_jobs(provider,provider_id,country_code,title,company_name,location,area,contract_type,created_at,last_seen_at,expires_at)
  select 'adzuna',x.provider_id,upper(x.country_code),x.title,x.company_name,x.location,x.area,x.contract_type,x.created_at,now(),least(now()+interval '48 hours',x.created_at+interval '30 days') from incoming x
  on conflict(provider,country_code,provider_id) do update set title=excluded.title,company_name=excluded.company_name,location=excluded.location,area=excluded.area,contract_type=excluded.contract_type,created_at=excluded.created_at,last_seen_at=excluded.last_seen_at,expires_at=excluded.expires_at
  returning id,provider_id,country_code
 )
 insert into public.external_job_details(job_id,description,source_url)
 select saved.id,incoming.description,incoming.source_url from saved join incoming on incoming.provider_id=saved.provider_id and upper(incoming.country_code)=saved.country_code
 on conflict(job_id) do update set description=excluded.description,source_url=excluded.source_url;
 get diagnostics n = row_count;
 update public.external_job_sync_state set status=case when cardinality(p_failed)=0 then 'success' when n>0 then 'partial' else 'failed' end,finished_at=now(),lease=null,imported=n,rejected=greatest(p_rejected,0),failed_countries=p_failed where provider='adzuna';
 return n;
end $$;
revoke all on function public.configure_external_jobs(uuid,boolean,text[],boolean),public.claim_external_job_sync(),public.finish_external_job_sync(uuid,jsonb,text[],integer) from public,anon,authenticated;
grant execute on function public.configure_external_jobs(uuid,boolean,text[],boolean),public.claim_external_job_sync(),public.finish_external_job_sync(uuid,jsonb,text[],integer) to service_role;
