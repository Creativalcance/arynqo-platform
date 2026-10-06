alter table public.external_job_country_sync drop constraint external_job_country_sync_error_code_check;
alter table public.external_job_country_sync add constraint external_job_country_sync_error_code_check check(error_code in ('credentials','rate_limit','timeout','provider','invalid_response','old_adverts','future_adverts','invalid_date','invalid_advert','unsafe_url'));
create or replace function public.finish_external_job_batch(p_lease uuid,p_rows jsonb,p_errors jsonb,p_rejected integer)
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
 if not failed <@ r.batch_countries or exists(select 1 from jsonb_each_text(p_errors) where value not in ('credentials','rate_limit','timeout','provider','invalid_response','old_adverts','future_adverts','invalid_date','invalid_advert','unsafe_url')) then raise exception 'Invalid errors'; end if;
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
