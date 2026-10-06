-- Logical deletion retains application/contact history and avoids cascading data loss.
alter table public.jobs add column archived_at timestamptz, add column deleted_at timestamptz;

create function public.guard_job_archive() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
  raise exception 'Deleted vacancy cannot be restored' using errcode='23514';
 end if;
 if new.archived_at is not null or new.deleted_at is not null then
  new.is_active=false;
  new.is_featured=false;
  new.renewal_requested_at=null;
  new.renewal_deadline=null;
 end if;
 return new;
end $$;
-- Runs after the existing lifecycle guard, including publication renewal RPCs.
create trigger zz_job_archive before insert or update on public.jobs
for each row execute function public.guard_job_archive();

create function public.manage_owned_job(job_id uuid, action text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if action not in ('archive','restore','delete') or action is null then
  raise exception 'Invalid vacancy action' using errcode='22023';
 end if;
 perform 1 from public.jobs j join public.company_profiles c on c.id=j.company_id
 where j.id=job_id and c.user_id=(select auth.uid()) and j.deleted_at is null
 for update of j;
 if not found then raise exception 'Vacancy not available' using errcode='42501'; end if;
 if action='archive' then
  update public.jobs set is_active=false, archived_at=coalesce(archived_at,now()) where id=job_id;
 elsif action='restore' then
  update public.jobs set is_active=false, archived_at=null where id=job_id;
 else
  update public.jobs set is_active=false, deleted_at=now() where id=job_id;
 end if;
end $$;
revoke all on function public.guard_job_archive() from public,anon,authenticated;
revoke all on function public.manage_owned_job(uuid,text) from public,anon;
grant execute on function public.manage_owned_job(uuid,text) to authenticated;
-- Browser clients use logical deletion; never cascade-delete candidate history.
revoke delete on public.jobs from anon,authenticated;
