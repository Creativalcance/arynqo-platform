-- Social Radar: server-only discovery and drafts. No social publishing credentials in the database.
create table public.social_radar_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_requests integer not null default 120 check(daily_requests between 6 and 1000),
 daily_generations integer not null default 20 check(daily_generations between 1 and 200),
 min_score integer not null default 40 check(min_score between 0 and 100),
 interval_minutes integer not null default 60 check(interval_minutes between 15 and 1440),
 max_age_hours integer not null default 48 check(max_age_hours between 1 and 168),
 tone text not null default 'Português europeu. Curto, bem-humorado e pertinente. A marca fala em nome próprio.' check(length(tone) between 1 and 700),
 revision integer not null default 1, updated_at timestamptz not null default now()
);
insert into public.social_radar_settings(id) values(true);
create table public.social_radar_sources (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('account','hashtag')),
 value text not null check(length(value) between 1 and 80), enabled boolean not null default true,
 last_checked_at timestamptz, last_error text, created_at timestamptz not null default now(), unique(kind,value)
);
-- Keep hashtag history independently of source deletion to enforce the rolling window.
create table public.social_radar_hashtags(value text primary key,last_searched_at timestamptz not null);
create table public.social_radar_opportunities (
 id uuid primary key default gen_random_uuid(), source_id uuid references public.social_radar_sources(id) on delete set null,
 media_id text not null unique, permalink text not null unique,
 caption text not null check(length(caption) between 1 and 4000), published_at timestamptz,
 score integer not null check(score between 0 and 100), reason text not null default '',
 status text not null default 'new' check(status in ('new','ready','review','dismissed','used')),
 suggestions jsonb not null default '[]' check(jsonb_typeof(suggestions)='array'),
 selected_comment text not null default '' check(length(selected_comment)<=240),
 feedback text not null default '' check(length(feedback)<=300),
 generation_attempts integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index social_radar_opportunities_queue on public.social_radar_opportunities(status,score desc,published_at desc);
create table public.social_radar_usage(day date primary key,requests integer not null default 0,generations integer not null default 0,tokens integer not null default 0);
create table public.social_radar_runs (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('scan','draft')),
 opportunity_id uuid references public.social_radar_opportunities(id) on delete set null,
 settings_revision integer not null, status text not null default 'running' check(status in ('running','success','partial','failed','cancelled')),
 started_at timestamptz not null default now(), finished_at timestamptz, imported integer not null default 0, error_code text
);
create index social_radar_runs_recent on public.social_radar_runs(started_at desc);
create table public.social_radar_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
 action text not null, target_id uuid, created_at timestamptz not null default now(), detail jsonb not null default '{}'
);
do $$ declare t text; begin
 foreach t in array array['social_radar_settings','social_radar_sources','social_radar_hashtags','social_radar_opportunities','social_radar_usage','social_radar_runs','social_radar_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.social_radar_mutate(p_actor uuid,p_action text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare target uuid; s social_radar_settings; result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception 'Administrator required'; end if;
 select * into s from social_radar_settings where id for update;
 if p_action='settings' then
  update social_radar_settings set enabled=(p_payload->>'enabled')::boolean,daily_requests=(p_payload->>'daily_requests')::integer,
   daily_generations=(p_payload->>'daily_generations')::integer,min_score=(p_payload->>'min_score')::integer,
   interval_minutes=(p_payload->>'interval_minutes')::integer,max_age_hours=(p_payload->>'max_age_hours')::integer,
   tone=p_payload->>'tone',revision=revision+1,updated_at=now() where id;
 elsif p_action='source' then
  if (select count(*) from social_radar_sources)>=200 then raise exception 'Source limit reached'; end if;
  insert into social_radar_sources(kind,value) values(p_payload->>'kind',p_payload->>'value') returning id into target;
 elsif p_action='toggle_source' then
  target:=(p_payload->>'id')::uuid;
  update social_radar_sources set enabled=(p_payload->>'enabled')::boolean where id=target;
  if not found then raise exception 'Source not found'; end if;
  update social_radar_settings set revision=revision+1 where id;
 elsif p_action='opportunity' then
  target:=(p_payload->>'id')::uuid;
  update social_radar_opportunities set selected_comment=p_payload->>'selected_comment',status=p_payload->>'status',feedback=p_payload->>'feedback',updated_at=now() where id=target;
  if not found then raise exception 'Opportunity not found'; end if;
 elsif p_action='import' then
  insert into social_radar_opportunities(media_id,permalink,caption,published_at,score,reason,status)
   values(p_payload->>'media_id',p_payload->>'permalink',p_payload->>'caption',(p_payload->>'published_at')::timestamptz,(p_payload->>'score')::integer,p_payload->>'reason',p_payload->>'status')
   on conflict(permalink) do nothing returning id into target;
 else raise exception 'Invalid action'; end if;
 insert into social_radar_audit(actor_id,action,target_id,detail) values(p_actor,p_action,target,p_payload);
 result:=jsonb_build_object('saved',true,'id',target); return result;
end $$;

-- A global lease and quota reservation serialize manual and cron work.
create function public.social_radar_claim(p_kind text,p_opportunity uuid default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s social_radar_settings; u social_radar_usage; sources jsonb:='[]'; src social_radar_sources;
 target social_radar_opportunities; token uuid; request_day date:=(now() at time zone 'Europe/Lisbon')::date;
begin
 select * into s from social_radar_settings where id for update;
 if not s.enabled then return jsonb_build_object('skipped','paused'); end if;
 if p_kind not in ('scan','draft') then raise exception 'Invalid kind'; end if;
 if exists(select 1 from social_radar_runs where status='running' and started_at>now()-interval '3 minutes') then return jsonb_build_object('skipped','busy'); end if;
 update social_radar_runs set status='failed',error_code='interrupted',finished_at=now() where status='running';
 insert into social_radar_usage(day) values(request_day) on conflict do nothing;
 select * into u from social_radar_usage where day=request_day for update;
 if p_kind='scan' then
  if u.requests+6>s.daily_requests then return jsonb_build_object('skipped','request_budget'); end if;
  for src in select * from social_radar_sources where enabled and (last_checked_at is null or last_checked_at<now()-make_interval(mins=>s.interval_minutes)) order by last_checked_at nulls first,created_at limit 200 loop
   if src.kind='hashtag' then
    if not exists(select 1 from social_radar_hashtags where value=src.value and last_searched_at>now()-interval '7 days') and (select count(*) from social_radar_hashtags where last_searched_at>now()-interval '7 days')>=30 then
     update social_radar_sources set last_error='hashtag_budget',last_checked_at=now() where id=src.id; continue;
    end if;
    insert into social_radar_hashtags(value,last_searched_at) values(src.value,now()) on conflict(value) do update set last_searched_at=excluded.last_searched_at;
   end if;
   sources:=sources||jsonb_build_array(to_jsonb(src));
   update social_radar_sources set last_checked_at=now(),last_error=null where id=src.id;
   exit when jsonb_array_length(sources)=3;
  end loop;
  if jsonb_array_length(sources)=0 then return jsonb_build_object('skipped','not_due'); end if;
  update social_radar_usage set requests=requests+2*jsonb_array_length(sources) where day=request_day;
 else
  if u.generations>=s.daily_generations then return jsonb_build_object('skipped','generation_budget'); end if;
  select * into target from social_radar_opportunities where (p_opportunity is null or id=p_opportunity)
   and status='new' and generation_attempts<2 and score>=s.min_score
   and coalesce(published_at,created_at-interval '24 hours')>now()-make_interval(hours=>s.max_age_hours)
   order by score desc,coalesce(published_at,created_at-interval '24 hours') desc limit 1 for update;
  if target.id is null then return jsonb_build_object('skipped','no_opportunities'); end if;
  update social_radar_usage set generations=generations+1 where day=request_day;
  update social_radar_opportunities set generation_attempts=generation_attempts+1 where id=target.id;
 end if;
 insert into social_radar_runs(kind,settings_revision,opportunity_id) values(p_kind,s.revision,target.id) returning id into token;
 return jsonb_build_object('id',token,'settings',to_jsonb(s),'sources',sources,'opportunity',to_jsonb(target));
end $$;

create function public.social_radar_finish(p_run uuid,p_rows jsonb default '[]',p_errors jsonb default '{}',p_draft jsonb default null,p_tokens integer default 0)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare s social_radar_settings; r social_radar_runs; item jsonb; n integer:=0; added integer; err text; current_status text;
begin
 select * into s from social_radar_settings where id for update;
 select * into r from social_radar_runs where id=p_run for update;
 if r.id is null or r.status<>'running' or r.started_at<now()-interval '3 minutes' then raise exception 'Stale run'; end if;
 if not s.enabled or s.revision<>r.settings_revision then
  update social_radar_runs set status='cancelled',finished_at=now() where id=p_run;
  return jsonb_build_object('cancelled',true);
 end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>150 then raise exception 'Invalid batch'; end if;
 if r.kind='scan' then
  for item in select value from jsonb_array_elements(p_rows) loop
   if exists(select 1 from social_radar_sources where id=(item->>'source_id')::uuid and enabled) then
    insert into social_radar_opportunities(source_id,media_id,permalink,caption,published_at,score,reason,status)
    values((item->>'source_id')::uuid,item->>'media_id',item->>'permalink',item->>'caption',(item->>'published_at')::timestamptz,(item->>'score')::integer,item->>'reason',item->>'status') on conflict do nothing;
    get diagnostics added=row_count; n:=n+added;
   end if;
  end loop;
  for item in select jsonb_build_object('id',key,'error',value) from jsonb_each_text(p_errors) loop
   update social_radar_sources set last_error=item->>'error' where id=(item->>'id')::uuid;
  end loop;
 else
  select status into current_status from social_radar_opportunities where id=r.opportunity_id for update;
  if current_status<>'new' then
   update social_radar_runs set status='cancelled',finished_at=now() where id=p_run;
   return jsonb_build_object('cancelled',true);
  end if;
  if p_draft is not null then
   if jsonb_typeof(p_draft->'suggestions')<>'array' then raise exception 'Invalid draft'; end if;
   update social_radar_opportunities set suggestions=p_draft->'suggestions',selected_comment=coalesce(p_draft->'suggestions'->>0,''),
    reason=p_draft->>'reason',status=case when (p_draft->>'relevant')::boolean then 'ready' else 'review' end,updated_at=now() where id=r.opportunity_id;
   n:=1;
  else
   update social_radar_opportunities set status=case when generation_attempts>=2 then 'review' else 'new' end,reason='A geração falhou. Revê o contexto ou tenta novamente.',updated_at=now() where id=r.opportunity_id;
  end if;
  update social_radar_usage set tokens=tokens+greatest(0,least(p_tokens,10000)) where day=(r.started_at at time zone 'Europe/Lisbon')::date;
 end if;
 select value into err from jsonb_each_text(p_errors) limit 1;
 update social_radar_runs set status=case when err is null then 'success' when n>0 then 'partial' else 'failed' end,error_code=err,imported=n,finished_at=now() where id=p_run;
 -- Bounded operational retention; preserve used/dismissed decisions for duplicate prevention.
 delete from social_radar_opportunities where created_at<now()-interval '90 days' and status in ('new','review','ready');
 return jsonb_build_object('imported',n,'errors',p_errors);
end $$;
revoke all on function public.social_radar_mutate(uuid,text,jsonb),public.social_radar_claim(text,uuid),public.social_radar_finish(uuid,jsonb,jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.social_radar_mutate(uuid,text,jsonb),public.social_radar_claim(text,uuid),public.social_radar_finish(uuid,jsonb,jsonb,jsonb,integer) to service_role;
