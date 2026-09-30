create table public.admin_access_log (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 action text not null check(action in ('consultar','exportar','descarregar')),
 dataset text not null, target_id uuid, row_count integer,
 created_at timestamptz not null default now()
);
alter table public.admin_access_log enable row level security;
revoke all on public.admin_access_log from public,anon,authenticated;
grant select,insert on public.admin_access_log to service_role;
create index on public.admin_access_log(created_at desc);

-- SECURITY DEFINER is restricted to the server service role: never granted to browsers.
create function public.admin_accounts(p_search text default '',p_role text default '',p_confirmed text default '',p_from timestamptz default null,p_to timestamptz default null,p_offset integer default 0,p_limit integer default 50,p_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 with accounts as (
 select u.id,coalesce(p.name,'') as name,u.email,p.role,u.created_at,u.email_confirmed_at,u.last_sign_in_at,u.banned_until,
 p.subscription_plan,p.subscription_status,
 exists(select 1 from public.student_profiles s where s.user_id=u.id) as has_candidate_profile,
 exists(select 1 from public.company_profiles c where c.user_id=u.id) as has_company_profile
 from auth.users u left join public.profiles p on p.id=u.id
 where (p_id is null or u.id=p_id)
 and (p_search='' or strpos(lower(coalesce(p.name,'')||' '||coalesce(u.email,'')),lower(p_search))>0)
 and (p_role='' or coalesce(p.role,'missing')=p_role)
 and (p_confirmed='' or (p_confirmed='yes' and u.email_confirmed_at is not null) or (p_confirmed='no' and u.email_confirmed_at is null))
 and (p_from is null or u.created_at>=p_from) and (p_to is null or u.created_at<p_to)
 ), page as (select * from accounts order by created_at desc,id limit greatest(1,least(p_limit,1000)) offset greatest(p_offset,0))
 select jsonb_build_object('total',(select count(*) from accounts),'rows',coalesce((select jsonb_agg(page) from page),'[]'::jsonb));
$$;
revoke all on function public.admin_accounts(text,text,text,timestamptz,timestamptz,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_accounts(text,text,text,timestamptz,timestamptz,integer,integer,uuid) to service_role;

create function public.admin_files(p_offset integer default 0,p_limit integer default 50,p_user uuid default null,p_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 with files as (
 select o.id,o.bucket_id,o.name,o.created_at,o.updated_at,o.metadata->>'mimetype' as mime_type,
 o.metadata->>'size' as size,
 coalesce((select c.user_id from public.company_profiles c where c.id::text=split_part(o.name,'/',1)),
 (select u.id from auth.users u where u.id::text=split_part(o.name,'/',1)),
 (select u.id from auth.users u where u.id::text=o.owner_id)) as user_id
 from storage.objects o
 where o.bucket_id in ('student-cvs','cvs','student-avatars','company-logos') and (p_id is null or o.id=p_id)
 ), filtered as (select * from files where p_user is null or user_id=p_user),
 page as (select * from filtered order by created_at desc,id limit greatest(1,least(p_limit,1000)) offset greatest(p_offset,0))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(page) from page),'[]'::jsonb));
$$;
revoke all on function public.admin_files(integer,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_files(integer,integer,uuid,uuid) to service_role;
