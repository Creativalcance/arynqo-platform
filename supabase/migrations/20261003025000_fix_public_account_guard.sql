-- Keep public requests out of the authenticated-only expression entirely.
-- PostgreSQL can check permissions while planning an AND expression even
-- when its first operand is false.
create or replace function public.check_account_request() returns void
language plpgsql security invoker set search_path='' as $$
begin
 if current_user='authenticated' then
  if not public.account_session_active() then
   raise exception 'Conta suspensa ou indisponível. Contacta o suporte.' using errcode='42501';
  end if;
 end if;
end $$;
notify pgrst, 'reload schema';
