-- Keep the vacancy and its candidate history, but remove it from circulation.
-- The update and its audit record commit together or both roll back.
alter table public.admin_access_log drop constraint admin_access_log_action_check;
alter table public.admin_access_log add constraint admin_access_log_action_check
  check (action in ('consultar', 'exportar', 'descarregar', 'eliminar'));

create function public.admin_delete_job(p_actor uuid, p_job uuid, p_confirmation text)
returns void language plpgsql security invoker set search_path = '' as $$
declare vacancy public.jobs%rowtype;
begin
  -- This function is callable only by the server after requireActor validates
  -- the live Auth session and the profile's RLS account-status guard.
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin')
     or exists (select 1 from public.account_controls where user_id = p_actor) then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  select * into vacancy from public.jobs where id = p_job for update;
  if not found then
    raise exception 'Vacancy not found' using errcode = 'P0002';
  end if;
  if p_confirmation is null or btrim(p_confirmation) = ''
     or btrim(p_confirmation) is distinct from btrim(vacancy.title) then
    raise exception 'Confirmation mismatch' using errcode = '22023';
  end if;
  -- Safe to retry if a successful response was lost.
  if vacancy.deleted_at is not null then return; end if;
  update public.jobs set is_active = false, deleted_at = now() where id = p_job;
  insert into public.admin_access_log(actor_id, action, dataset, target_id, row_count)
    values (p_actor, 'eliminar', 'vagas', p_job, 1);
end;
$$;
revoke all on function public.admin_delete_job(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_delete_job(uuid, uuid, text) to service_role;
