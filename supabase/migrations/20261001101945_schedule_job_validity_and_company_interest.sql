create extension if not exists pg_cron;
select cron.schedule('arynqo-job-validity','5 * * * *','select public.process_job_lifecycle();');
create function public.company_interest_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;job_title text;company_name text;
begin
 if new.action_type='accepted' then
  select s.user_id into recipient from public.student_profiles s where s.id=new.student_id;
  select j.title,c.company_name into job_title,company_name from public.jobs j join public.company_profiles c on c.id=j.company_id where j.id=new.job_id and c.id=new.company_id;
  perform public.enqueue_platform_notification(recipient,'candidate_action:'||new.id||':'||recipient||':accepted',
   'Empresa interessada no teu perfil','A empresa '||company_name||' demonstrou interesse no teu perfil para a vaga "'||job_title||'".',
   'candidate_action',new.student_id,'/dashboard/notificacoes','Ver notificações');
 end if;
 return new;
end $$;
revoke all on function public.company_interest_notification() from public,anon,authenticated;
create trigger company_interest_event after insert on public.company_candidate_actions for each row execute function public.company_interest_notification();
