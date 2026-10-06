-- Publication now always requires a human administrator. Keep scheduled generation enabled.
update public.academy_automation_settings set auto_publish=false,updated_at=now() where id;
alter table public.academy_automation_settings add constraint academy_requires_approval check(not auto_publish);
alter table public.notification_preferences add column academy_updates_enabled boolean not null default true;
alter table public.academy_posts add column approved_by uuid, add column approved_at timestamptz;

create table public.academy_email_events (
 post_id uuid references public.academy_posts(id) on delete cascade,
 kind text check(kind in ('review','published')), created_at timestamptz not null default now(),
 primary key(post_id,kind)
);
create table public.academy_email_deliveries (
 id uuid primary key default gen_random_uuid(), post_id uuid not null, kind text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 recipient_email text not null, recipient_name text, locale text not null, content_locale text not null,
 article_title text not null, article_excerpt text not null, article_slug text not null,
 status text not null default 'pending' check(status in ('pending','processing','retry','sent','skipped','failed','uncertain')),
 attempts integer not null default 0, first_attempt_at timestamptz, next_attempt_at timestamptz not null default now(),
 lease_id uuid, lease_until timestamptz, provider_id text, error_code text, sent_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(post_id,kind) references public.academy_email_events(post_id,kind) on delete cascade,
 unique(post_id,kind,user_id)
);
create index academy_email_pending on public.academy_email_deliveries(next_attempt_at,created_at)
 where status in ('pending','retry','processing');
create index academy_email_user on public.academy_email_deliveries(user_id);
alter table public.academy_email_events enable row level security;
alter table public.academy_email_deliveries enable row level security;
revoke all on public.academy_email_events,public.academy_email_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.academy_email_events,public.academy_email_deliveries to service_role;

create schema if not exists private;
-- Narrow privileged check: service_role cannot SELECT auth.users in production.
-- Called only by trusted triggers or service-only RPCs. Auth email is authoritative.
create function private.academy_email_eligible(person uuid,event_kind text,address text default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.profiles p on p.id=u.id
 left join public.notification_preferences n on n.user_id=u.id
 where u.id=person and u.email_confirmed_at is not null and u.deleted_at is null
 and not coalesce(u.is_anonymous,false) and u.email is not null and btrim(u.email)<>''
 and (address is null or lower(u.email)=lower(address))
 and (u.banned_until is null or u.banned_until<=now())
 and not exists(select 1 from public.account_controls c where c.user_id=u.id)
 and coalesce(n.email_enabled,true)
 and (event_kind='review' and p.role='admin' or event_kind='published' and coalesce(n.academy_updates_enabled,true)));
$$;
revoke all on function private.academy_email_eligible(uuid,text,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.academy_email_eligible(uuid,text,text) to service_role;

create function private.enqueue_academy_email(article uuid,event_kind text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.academy_email_events(post_id,kind) values(article,event_kind) on conflict do nothing;
 if not found then return; end if;
 insert into public.academy_email_deliveries(post_id,kind,user_id,recipient_email,recipient_name,locale,content_locale,article_title,article_excerpt,article_slug)
 select a.id,event_kind,p.id,u.email,p.name,coalesce(p.locale,'pt'),coalesce(t.locale,a.content_locale),
 coalesce(t.title,a.title),coalesce(t.excerpt,a.excerpt,''),a.slug
 from public.academy_posts a cross join public.profiles p join auth.users u on u.id=p.id
 left join public.academy_post_translations t on t.post_id=a.id and t.locale=p.locale and t.quality_passed
 where a.id=article and private.academy_email_eligible(p.id,event_kind);
end $$;
revoke all on function private.enqueue_academy_email(uuid,text) from public,anon,authenticated;
grant execute on function private.enqueue_academy_email(uuid,text) to service_role;

create function private.academy_approval_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare reviewer uuid;
begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
  reviewer=coalesce(auth.uid(),new.approved_by);
  if reviewer is null or not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=reviewer and p.role='admin' and u.deleted_at is null and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until<=now())
    and not exists(select 1 from public.account_controls c where c.user_id=p.id)) then
   raise exception 'A publicação exige aprovação de um administrador.' using errcode='42501';
  end if;
  new.approved_by=reviewer; new.approved_at=now();
  new.published_at=coalesce(new.published_at,now());
 elsif tg_op='UPDATE' then
  new.approved_by=old.approved_by; new.approved_at=old.approved_at;
 else new.approved_by=null;new.approved_at=null;
 end if;
 return new;
end $$;
revoke all on function private.academy_approval_guard() from public,anon,authenticated;
create trigger academy_approval_guard before insert or update on public.academy_posts
 for each row execute function private.academy_approval_guard();

create function private.academy_post_email_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
  perform private.enqueue_academy_email(new.id,'published');
 elsif tg_op='INSERT' and new.status='draft' and not new.multilingual then
  perform private.enqueue_academy_email(new.id,'review');
 end if;
 return new;
end $$;
create function private.academy_review_email_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='review' and old.status is distinct from 'review' and new.post_id is not null then
  perform private.enqueue_academy_email(new.post_id,'review');
 end if;
 return new;
end $$;
revoke all on function private.academy_post_email_event(),private.academy_review_email_event() from public,anon,authenticated;
create trigger academy_post_email_event after insert or update of status on public.academy_posts
 for each row execute function private.academy_post_email_event();
create trigger academy_review_email_event after update of status on public.academy_generation_runs
 for each row execute function private.academy_review_email_event();
-- Never announce existing articles, including after an archive/restore cycle.
insert into public.academy_email_events(post_id,kind) select id,'published' from public.academy_posts where published_at is not null or status='published';

create or replace function public.academy_finish_run(run_id uuid,token uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.academy_generation_runs;
begin
 select * into r from public.academy_generation_runs where id=run_id and lease_token=token and status='running' and lease_until>now() for update;
 if r.id is null then raise exception 'lease_lost'; end if;
 if (select count(*) from public.academy_post_translations where post_id=r.post_id and quality_passed)<>6 then raise exception 'six_versions_required'; end if;
 update public.academy_generation_runs set status='review',completed_at=now(),lease_token=null,lease_until=null where id=run_id;
 return jsonb_build_object('post_id',r.post_id,'status','review','review_required',true);
end $$;
drop function public.academy_publish_reviewed(uuid);
create function public.academy_publish_reviewed(post uuid,reviewer uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.academy_posts where id=post for update;
 if not found then raise exception 'article_missing'; end if;
 if exists(select 1 from public.academy_posts where id=post and status='published') then return; end if;
 perform 1 from public.academy_generation_runs where post_id=post and status='review' for update;
 if not found then raise exception 'article_not_reviewable'; end if;
 if (select count(*) from public.academy_post_translations where post_id=post and quality_passed)<>6 then raise exception 'six_versions_required'; end if;
 update public.academy_posts set status='published',approved_by=reviewer,published_at=coalesce(published_at,now()),updated_at=now() where id=post;
 update public.academy_generation_runs set status='published',completed_at=now() where post_id=post;
end $$;
revoke all on function public.academy_publish_reviewed(uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_publish_reviewed(uuid,uuid) to service_role;

create function public.claim_academy_email() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare delivery public.academy_email_deliveries;
begin
 -- Do not retry an ambiguous acceptance outside Resend's 24-hour deduplication window.
 update public.academy_email_deliveries set status='uncertain',error_code='idempotency_window_expired',lease_id=null,lease_until=null
 where status in ('retry','processing') and first_attempt_at<now()-interval '23 hours' and (lease_until is null or lease_until<now());
 update public.academy_email_deliveries d set status='skipped',error_code='recipient_or_article_ineligible',lease_id=null,lease_until=null
 where d.status in ('pending','retry','processing') and (d.lease_until is null or d.lease_until<now()) and
 (not private.academy_email_eligible(d.user_id,d.kind,d.recipient_email) or not exists(
 select 1 from public.academy_posts a where a.id=d.post_id and
 (d.kind='published' and a.status='published' or d.kind='review' and a.status='draft')));
 select * into delivery from public.academy_email_deliveries
 where status in ('pending','retry','processing') and attempts<8 and next_attempt_at<=now()
 and (lease_until is null or lease_until<now()) order by created_at,id limit 1 for update skip locked;
 if not found then return null; end if;
 update public.academy_email_deliveries set status='processing',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 where id=delivery.id returning * into delivery;
 return to_jsonb(delivery);
end $$;
create function public.finish_academy_email(target uuid,lease uuid,outcome text,provider text default null,reason text default null) returns void
language plpgsql security invoker set search_path='' as $$
declare delivery public.academy_email_deliveries;
begin
 select * into delivery from public.academy_email_deliveries where id=target and lease_id=lease and status='processing' and lease_until>now() for update;
 if not found then raise exception 'email_lease_lost'; end if;
 if outcome not in ('sent','retry','failed') then raise exception 'invalid_email_outcome'; end if;
 update public.academy_email_deliveries set status=case when outcome='retry' and attempts>=8 then 'uncertain' else outcome end,
 provider_id=provider,error_code=left(reason,80),sent_at=case when outcome='sent' then now() else sent_at end,
 lease_id=null,lease_until=null,next_attempt_at=now()+least(interval '1 hour',interval '1 minute'*power(2,attempts-1))
 where id=target;
end $$;
revoke all on function public.claim_academy_email(),public.finish_academy_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_academy_email(),public.finish_academy_email(uuid,uuid,text,text,text) to service_role;
