-- Keep legacy RPCs for deployment compatibility. New workers use persistent country batches.
alter table public.external_job_sources drop constraint external_job_sources_countries_check;
alter table public.external_job_sources add constraint external_job_sources_country_count check(cardinality(countries)<=19);
alter table public.external_job_sync_state add column batch_countries text[] not null default '{}';
alter table public.external_job_sync_state add column budget_day date;
alter table public.external_job_sync_state add column reserved_requests integer not null default 0;
create table public.external_job_country_sync (
 country text primary key check(country in ('gb','us','at','au','be','br','ca','ch','de','es','fr','in','it','mx','nl','nz','pl','sg','za')),
 next_run_at timestamptz not null default now(),
 last_success_at timestamptz,
 last_attempt_at timestamptz,
 status text not null default 'pending' check(status in ('pending','running','success','failed')),
 error_code text check(error_code in ('credentials','rate_limit','timeout','provider','invalid_response')),
 imported integer not null default 0
);
alter table public.external_job_country_sync enable row level security;
revoke all on public.external_job_country_sync from public,anon,authenticated;
grant all on public.external_job_country_sync to service_role;
create function public.claim_external_job_batch() returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.external_job_sources; r public.external_job_sync_state; selected text[]; token uuid; used integer;
begin
 select * into s from public.external_job_sources where provider='adzuna' for update;
 if not s.enabled then return jsonb_build_object('skipped','disabled'); end if;
 select * into r from public.external_job_sync_state where provider='adzuna' for update;
 if r.status='running' and r.started_at>now()-interval '10 minutes' then return jsonb_build_object('skipped','busy'); end if;
 if r.started_at>now()-interval '1 minute' then return jsonb_build_object('skipped','cooldown'); end if;
 used:=case when r.budget_day=(now() at time zone 'UTC')::date then r.reserved_requests else 0 end;
 if used>=60 then return jsonb_build_object('skipped','daily_budget'); end if;
 insert into public.external_job_country_sync(country) select distinct unnest(s.countries) on conflict do nothing;
 select array_agg(country order by next_run_at,country) into selected from (
  select country,next_run_at from public.external_job_country_sync where country=any(s.countries) and next_run_at<=now() order by next_run_at,country limit least(3,(60-used)/2)
 ) due;
 if selected is null then return jsonb_build_object('skipped','up_to_date'); end if;
 token:=gen_random_uuid();
 update public.external_job_country_sync set last_attempt_at=now(),status='running',next_run_at=now()+interval '10 minutes',error_code=null where country=any(selected);
 update public.external_job_sync_state set lease=token,started_at=now(),finished_at=null,status='running',imported=0,rejected=0,failed_countries='{}',batch_countries=selected,budget_day=(now() at time zone 'UTC')::date,reserved_requests=used+cardinality(selected)*2 where provider='adzuna';
 return jsonb_build_object('lease',token,'countries',selected);
end $$;
create function public.finish_external_job_batch(p_lease uuid,p_rows jsonb,p_errors jsonb,p_rejected integer)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare s public.external_job_sources; r public.external_job_sync_state; n integer; failed text[];
begin
 select * into s from public.external_job_sources where provider='adzuna' for update;
 select * into r from public.external_job_sync_state where provider='adzuna' for update;
 if r.lease is distinct from p_lease or r.status<>'running' or r.started_at<now()-interval '10 minutes' then raise exception 'Stale import'; end if;
 if not s.enabled or s.updated_at>r.started_at then
  update public.external_job_sync_state set status='cancelled',finished_at=now(),lease=null where provider='adzuna';
  update public.external_job_country_sync set status='pending',next_run_at=now() where country=any(r.batch_countries);
  return 0;
 end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>300 or jsonb_typeof(p_errors)<>'object' then raise exception 'Invalid batch'; end if;
 select coalesce(array_agg(key),'{}') into failed from jsonb_each_text(p_errors);
 if not failed <@ r.batch_countries or exists(select 1 from jsonb_each_text(p_errors) where value not in ('credentials','rate_limit','timeout','provider','invalid_response')) then raise exception 'Invalid errors'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) x where not lower(x->>'country_code')=any(r.batch_countries) or lower(x->>'country_code')=any(failed)) then raise exception 'Invalid country'; end if;
 with incoming as (
  select * from jsonb_to_recordset(p_rows) as x(provider_id text,country_code text,title text,company_name text,description text,location text,area text,contract_type text,source_url text,created_at timestamptz)
  where lower(x.country_code)=any(r.batch_countries) and x.created_at > now()-interval '30 days' and x.created_at <= now()+interval '5 minutes'
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
 update public.external_job_country_sync c set
  status=case when c.country=any(failed) then 'failed' else 'success' end,
  error_code=p_errors->>c.country,
  next_run_at=now()+case when c.country=any(failed) then interval '1 hour' else interval '24 hours' end,
  last_success_at=case when c.country=any(failed) then c.last_success_at else now() end,
  imported=case when c.country=any(failed) then 0 else (select count(*) from jsonb_array_elements(p_rows) x where lower(x->>'country_code')=c.country)::integer end
 where c.country=any(r.batch_countries);
 update public.external_job_sync_state set status=case when cardinality(failed)=0 then 'success' when cardinality(failed)<cardinality(r.batch_countries) then 'partial' else 'failed' end,finished_at=now(),lease=null,imported=n,rejected=greatest(p_rejected,0),failed_countries=failed where provider='adzuna';
 return n;
end $$;
revoke all on function public.claim_external_job_batch(),public.finish_external_job_batch(uuid,jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.claim_external_job_batch(),public.finish_external_job_batch(uuid,jsonb,jsonb,integer) to service_role;

-- One public search over both sources. Invoker security retains all underlying RLS.
create function public.search_public_jobs(p_filters jsonb default '{}',p_page integer default 1)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 with all_jobs as (
  select j.id::text id,null::text external_id,null::text origin,coalesce(c.company_name,'') company_name,
   j.title,j.description,j.area,j.location,j.country_code::text,j.work_mode::text,j.work_model::text,j.contract_type::text,j.seniority::text,j.is_active,j.created_at
  from public.jobs j left join public.company_profiles c on c.id=j.company_id where j.is_active=true
  union all
  select 'external:'||j.id,j.id::text,'external',j.company_name,j.title,null,j.area,j.location,j.country_code,null,null,j.contract_type,null,true,j.created_at
  from public.external_jobs j
 ), ranked as (
  select *,row_number() over(partition by
   case when trim(company_name)='' then id else lower(trim(title))||chr(31)||lower(trim(company_name))||chr(31)||lower(trim(coalesce(location,'')))||chr(31)||coalesce(country_code,'') end
   order by case when origin is null then 0 else 1 end,created_at desc,id) duplicate_rank from all_jobs
 ), base as (
  select * from ranked where duplicate_rank=1
   and (coalesce(p_filters->>'origin','')='' or (p_filters->>'origin'='external' and origin='external') or (p_filters->>'origin'='internal' and origin is null))
   and (coalesce(p_filters->>'country','')='' or country_code=p_filters->>'country')
 ), filtered as (
  select * from base where
   (coalesce(p_filters->>'q','')='' or position(lower(left(p_filters->>'q',200)) in lower(concat_ws(' ',title,description,area,location,company_name)))>0)
   and (coalesce(p_filters->>'location','')='' or location=p_filters->>'location')
   and (coalesce(p_filters->>'area','')='' or area=p_filters->>'area')
   and (coalesce(p_filters->>'contract','')='' or contract_type=p_filters->>'contract')
   and (coalesce(p_filters->>'model','')='' or coalesce(nullif(work_model,''),work_mode)=p_filters->>'model')
 ), totals as (select count(*) total from filtered), paging as (
  select total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(total/20.0)::integer)) page from totals
 ), page_rows as (
  select * from filtered order by created_at desc,id limit 20 offset (select (page-1)*20 from paging)
 )
 select jsonb_build_object('jobs',coalesce((select jsonb_agg(to_jsonb(p)-'duplicate_rank' order by created_at desc,id) from page_rows p),'[]'::jsonb),
  'total',(select total from paging),'page',(select page from paging),
  'areas',coalesce((select jsonb_agg(a order by a) from (select distinct area a from base where coalesce(area,'')<>'') v),'[]'::jsonb),
  'contracts',coalesce((select jsonb_agg(a order by a) from (select distinct contract_type a from base where coalesce(contract_type,'')<>'') v),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(a order by a) from (select distinct location a from base where coalesce(location,'')<>'') v),'[]'::jsonb));
$$;
revoke all on function public.search_public_jobs(jsonb,integer) from public;
grant execute on function public.search_public_jobs(jsonb,integer) to anon,authenticated,service_role;
