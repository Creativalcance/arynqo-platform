-- One transactional welcome per account, queued only after email activation.
create table public.welcome_email_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 recipient_email text not null, recipient_name text, locale text not null,
 article jsonb,
 status text not null default 'pending' check(status in ('pending','processing','retry','sent','skipped','failed','uncertain')),
 attempts integer not null default 0, first_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(), lease_id uuid, lease_until timestamptz,
 provider_id text, error_code text, sent_at timestamptz, created_at timestamptz not null default now()
);
create index welcome_email_pending on public.welcome_email_deliveries(next_attempt_at,created_at)
 where status in ('pending','retry','processing');
alter table public.welcome_email_deliveries enable row level security;
revoke all on public.welcome_email_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.welcome_email_deliveries to service_role;

create schema if not exists private;
create function private.welcome_email_eligible(person uuid,address text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=person
 and u.email_confirmed_at is not null and u.deleted_at is null
 and not coalesce(u.is_anonymous,false) and lower(u.email)=lower(address)
 and (u.banned_until is null or u.banned_until<=now())
 and not exists(select 1 from public.account_controls c where c.user_id=u.id));
$$;
revoke all on function private.welcome_email_eligible(uuid,text) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.welcome_email_eligible(uuid,text) to service_role;

create function private.enqueue_account_welcome() returns trigger
language plpgsql security definer set search_path='' as $$
declare language text; person_name text; latest jsonb;
begin
 if new.email_confirmed_at is null or (tg_op='UPDATE' and old.email_confirmed_at is not null)
 or new.email is null or btrim(new.email)='' or not private.welcome_email_eligible(new.id,new.email)
 then return new; end if;
 select p.locale,p.name into language,person_name from public.profiles p where p.id=new.id;
 language=coalesce(language,new.raw_user_meta_data->>'locale','pt');
 if language not in ('pt','en','fr','es','de','it') then language='pt'; end if;
 person_name=left(coalesce(person_name,new.raw_user_meta_data->>'name'),160);
 -- Snapshot at activation: later articles or edits cannot change a retried email.
 select jsonb_build_object('title',coalesce(t.title,a.title),'excerpt',coalesce(t.excerpt,a.excerpt,''),
 'slug',a.slug,'locale',coalesce(t.locale,a.content_locale)) into latest
 from public.academy_posts a
 left join public.academy_post_translations t on t.post_id=a.id and t.locale=language and t.quality_passed
 where a.status='published' and a.published_at<=now()
 order by a.published_at desc,a.id desc limit 1;
 insert into public.welcome_email_deliveries(user_id,recipient_email,recipient_name,locale,article)
 values(new.id,new.email,person_name,language,latest) on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function private.enqueue_account_welcome() from public,anon,authenticated;
create trigger account_activated_welcome after insert or update of email_confirmed_at on auth.users
 for each row execute function private.enqueue_account_welcome();
-- Existing confirmed accounts are deliberately not backfilled.

create function public.claim_welcome_email(person uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare delivery public.welcome_email_deliveries;
begin
 -- Resend deduplicates for 24 hours. Stop uncertain deliveries before that expires.
 update public.welcome_email_deliveries set status='uncertain',error_code='idempotency_window_expired',lease_id=null,lease_until=null
 where (person is null or user_id=person) and status in ('retry','processing')
 and first_attempt_at<now()-interval '23 hours' and (lease_until is null or lease_until<now());
 update public.welcome_email_deliveries d set status='skipped',error_code='recipient_ineligible',lease_id=null,lease_until=null
 where (person is null or d.user_id=person) and d.status in ('pending','retry','processing')
 and (d.lease_until is null or d.lease_until<now())
 and not private.welcome_email_eligible(d.user_id,d.recipient_email);
 select * into delivery from public.welcome_email_deliveries
 where (person is null or user_id=person) and status in ('pending','retry','processing')
 and attempts<8 and next_attempt_at<=now() and (lease_until is null or lease_until<now())
 order by created_at,id limit 1 for update skip locked;
 if not found then return null; end if;
 update public.welcome_email_deliveries set status='processing',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 where id=delivery.id returning * into delivery;
 return to_jsonb(delivery);
end $$;

create function public.finish_welcome_email(target uuid,lease uuid,outcome text,provider text default null,reason text default null) returns void
language plpgsql security invoker set search_path='' as $$
declare delivery public.welcome_email_deliveries;
begin
 select * into delivery from public.welcome_email_deliveries
 where id=target and lease_id=lease and status='processing' and lease_until>now() for update;
 if not found then raise exception 'welcome_email_lease_lost'; end if;
 if outcome not in ('sent','retry','failed') then raise exception 'invalid_email_outcome'; end if;
 update public.welcome_email_deliveries set status=case when outcome='retry' and attempts>=8 then 'uncertain' else outcome end,
 provider_id=provider,error_code=left(reason,80),sent_at=case when outcome='sent' then now() else sent_at end,
 lease_id=null,lease_until=null,next_attempt_at=now()+least(interval '1 hour',interval '1 minute'*power(2,attempts-1))
 where id=target;
end $$;
revoke all on function public.claim_welcome_email(uuid),public.finish_welcome_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_welcome_email(uuid),public.finish_welcome_email(uuid,uuid,text,text,text) to service_role;
