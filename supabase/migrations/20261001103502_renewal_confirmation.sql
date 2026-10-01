create function public.confirm_job_renewal(job_id uuid, expected_expiry timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare j public.jobs%rowtype; expiry timestamptz;
begin
 select v.* into j from public.jobs v join public.company_profiles c on c.id=v.company_id join public.profiles p on p.id=c.user_id
 where v.id=job_id and c.user_id=auth.uid() and p.role in ('company','admin') for update of v;
 if not found then raise exception 'Vacancy renewal not authorized'; end if;
 if j.expires_at is distinct from expected_expiry or j.renewal_deadline is null or not j.is_active then
  raise exception 'Renewal request is no longer pending';
 end if;
 expiry:=now()+interval '30 days';
 update public.jobs set published_at=now(),expires_at=expiry,renewal_requested_at=null,renewal_deadline=null,deactivation_reason=null where id=job_id;
 update public.notifications set action_label='Vaga confirmada',is_read=true
 where user_id=auth.uid() and event_key='job_renewal:'||job_id||':'||expected_expiry;
 return expiry;
end $$;
revoke all on function public.confirm_job_renewal(uuid,timestamptz) from public,anon;
grant execute on function public.confirm_job_renewal(uuid,timestamptz) to authenticated;

create function public.confirm_job_renewal_notification(notification_id uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare n public.notifications%rowtype; j public.jobs%rowtype;
begin
 select * into n from public.notifications where id=notification_id and user_id=auth.uid() and related_type='job_renewal' and event_key like 'job_renewal:%';
 if not found then raise exception 'Renewal notification not authorized'; end if;
 select v.* into j from public.jobs v join public.company_profiles c on c.id=v.company_id where v.id=n.related_id and c.user_id=auth.uid() for update of v;
 if not found then raise exception 'Vacancy renewal not authorized'; end if;
 -- Re-read after the job lock: concurrent repeated clicks must not extend validity again.
 select * into n from public.notifications where id=notification_id and user_id=auth.uid();
 if n.action_label='Vaga confirmada' then return j.expires_at; end if;
 if n.event_key is distinct from 'job_renewal:'||j.id||':'||j.expires_at then raise exception 'Renewal request is no longer pending'; end if;
 return public.confirm_job_renewal(j.id,j.expires_at);
end $$;
revoke all on function public.confirm_job_renewal_notification(uuid) from public,anon;
grant execute on function public.confirm_job_renewal_notification(uuid) to authenticated;
