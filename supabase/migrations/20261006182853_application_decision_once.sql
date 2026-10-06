-- A final decision is immutable, including for stale clients and concurrent writes.
-- Keep the existing ownership/role trigger and RLS policies unchanged.
create function public.guard_application_decision_once()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.status is distinct from old.status and old.status in ('accepted','rejected') then
  raise exception using errcode = '23514', message = 'Application already decided';
 end if;
 return new;
end $$;
revoke all on function public.guard_application_decision_once() from public, anon, authenticated;
create trigger application_decision_once before update of status on public.applications
for each row execute function public.guard_application_decision_once();
