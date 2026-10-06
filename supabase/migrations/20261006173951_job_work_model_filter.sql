-- Preserve legacy Portuguese work models in the public filters.
-- Internal vacancies precede external listings before pagination, for every filter.
create or replace function public.search_public_jobs(p_filters jsonb default '{}',p_page integer default 1)
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
   and (coalesce(p_filters->>'model','')='' or (case lower(coalesce(nullif(work_model,''),work_mode)) when 'presencial' then 'presential' when 'remoto' then 'remote' when 'híbrido' then 'hybrid' when 'hibrido' then 'hybrid' else lower(coalesce(nullif(work_model,''),work_mode)) end)=p_filters->>'model')
 ), totals as (select count(*) total from filtered), paging as (
  select total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(total/20.0)::integer)) page from totals
 ), page_rows as (
  select * from filtered order by case when origin is null then 0 else 1 end,created_at desc,id limit 20 offset (select (page-1)*20 from paging)
 )
 select jsonb_build_object('jobs',coalesce((select jsonb_agg(to_jsonb(p)-'duplicate_rank' order by case when origin is null then 0 else 1 end,created_at desc,id) from page_rows p),'[]'::jsonb),
  'total',(select total from paging),'page',(select page from paging),
  'areas',coalesce((select jsonb_agg(a order by a) from (select distinct area a from base where coalesce(area,'')<>'') v),'[]'::jsonb),
  'contracts',coalesce((select jsonb_agg(a order by a) from (select distinct contract_type a from base where coalesce(contract_type,'')<>'') v),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(a order by a) from (select distinct location a from base where coalesce(location,'')<>'') v),'[]'::jsonb));
$$;
revoke all on function public.search_public_jobs(jsonb,integer) from public;
grant execute on function public.search_public_jobs(jsonb,integer) to anon,authenticated,service_role;
