-- Scores are unavailable until both sides confirm the same five structured fields.
alter table public.ai_matches
 add column matching_details jsonb,
 alter column match_score drop not null,
 alter column skills_score drop not null,
 alter column role_score drop not null,
 alter column seniority_score drop not null,
 alter column location_score drop not null,
 alter column work_model_score drop not null,
 alter column salary_score drop not null,
 alter column education_language_score drop not null,
 alter column opportunity_type_score drop not null;

-- Internal cache maintenance, deliberately outside the exposed API schemas.
-- Owners may edit their own source rows under existing RLS, but never write scores.
create schema matching_private;
revoke all on schema matching_private from public, anon, authenticated;
create function matching_private.invalidate_matches() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 if tg_table_name='student_profiles' then
  if new.matching_preferences is not distinct from old.matching_preferences then return new; end if;
  owner_id:=new.user_id;
 else
  if new.matching_preferences is not distinct from old.matching_preferences
   and new.is_active is not distinct from old.is_active
   and new.expires_at is not distinct from old.expires_at
   and new.archived_at is not distinct from old.archived_at
   and new.deleted_at is not distinct from old.deleted_at then return new; end if;
  select user_id into owner_id from public.company_profiles where id=new.company_id;
 end if;
 if auth.uid() is not null then
  if auth.uid() is distinct from owner_id and not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Forbidden matching invalidation'; end if;
 elsif coalesce(current_setting('role',true),'') not in ('service_role','postgres','none') then
  raise exception 'Authentication required';
 end if;
 update public.ai_matches set match_score=null,skills_score=null,role_score=null,seniority_score=null,location_score=null,work_model_score=null,salary_score=null,education_language_score=null,opportunity_type_score=null,
 matching_details=jsonb_build_object('version','five-fields-v3','status','incomplete','score',null,'contributions',null),
 match_category='low_compatibility',is_relevant=true,strengths='{}',gaps=array['Os campos profissionais foram alterados. É necessário recalcular o match.'],matching_skills='{}',missing_skills='{}',ai_recommendations='{}',
 ai_reason='Por calcular: os campos profissionais foram alterados.',updated_at=now()
 where (tg_table_name='student_profiles' and student_id=new.id) or (tg_table_name='jobs' and job_id=new.id);
 return new;
end $$;
revoke all on function matching_private.invalidate_matches() from public,anon,authenticated;
create trigger invalidate_matching_results after update on public.student_profiles for each row execute function matching_private.invalidate_matches();
create trigger invalidate_matching_results after update on public.jobs for each row execute function matching_private.invalidate_matches();

-- Only the authenticated application server writes derived results. Lock source rows
-- before comparing revisions, so a delayed calculation cannot restore an old score.
create function public.save_matching_results(p_results jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare item jsonb; r public.ai_matches; saved integer:=0;
begin
 if jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)>100 then raise exception 'Invalid matching batch'; end if;
 perform 1 from public.student_profiles s where s.id in(select (value->>'student_id')::uuid from jsonb_array_elements(p_results)) order by s.id for share;
 perform 1 from public.jobs j where j.id in(select (value->>'job_id')::uuid from jsonb_array_elements(p_results)) order by j.id for share;
 for item in select value from jsonb_array_elements(p_results) loop
  r:=jsonb_populate_record(null::public.ai_matches,item);
  if r.matching_details->>'version' is distinct from 'five-fields-v3' then raise exception 'Invalid matching version'; end if;
  if not exists(select 1 from public.student_profiles s, public.jobs j where s.id=r.student_id and j.id=r.job_id
   and s.matching_revision=(r.matching_details->>'candidateRevision')::integer and j.matching_revision=(r.matching_details->>'jobRevision')::integer
   and j.is_active and j.archived_at is null and j.deleted_at is null and (j.expires_at is null or j.expires_at>clock_timestamp())) then
   continue;
  end if;
  if (r.matching_details->>'status'='evaluated' and (r.match_score is null or r.match_score<0 or r.match_score>100 or r.match_score is distinct from (r.matching_details->>'score')::integer))
    or (r.matching_details->>'status'='incomplete' and r.match_score is not null)
    or coalesce(r.matching_details->>'status','') not in ('evaluated','incomplete') then raise exception 'Invalid matching score'; end if;
  insert into public.ai_matches(student_id,job_id,match_score,skills_score,role_score,seniority_score,location_score,work_model_score,salary_score,education_language_score,opportunity_type_score,match_category,is_relevant,strengths,gaps,matching_skills,missing_skills,ai_recommendations,ai_reason,matching_details,updated_at)
  values(r.student_id,r.job_id,r.match_score,r.skills_score,r.role_score,r.seniority_score,r.location_score,r.work_model_score,r.salary_score,r.education_language_score,r.opportunity_type_score,r.match_category,r.is_relevant,r.strengths,r.gaps,r.matching_skills,r.missing_skills,r.ai_recommendations,r.ai_reason,r.matching_details,now())
  on conflict(student_id,job_id) do update set
  match_score=excluded.match_score,skills_score=excluded.skills_score,role_score=excluded.role_score,seniority_score=excluded.seniority_score,location_score=excluded.location_score,work_model_score=excluded.work_model_score,salary_score=excluded.salary_score,education_language_score=excluded.education_language_score,opportunity_type_score=excluded.opportunity_type_score,match_category=excluded.match_category,is_relevant=excluded.is_relevant,strengths=excluded.strengths,gaps=excluded.gaps,matching_skills=excluded.matching_skills,missing_skills=excluded.missing_skills,ai_recommendations=excluded.ai_recommendations,ai_reason=excluded.ai_reason,matching_details=excluded.matching_details,updated_at=excluded.updated_at;
  saved:=saved+1;
 end loop;
 return saved;
end $$;
revoke all on function public.save_matching_results(jsonb) from public,anon,authenticated;
grant execute on function public.save_matching_results(jsonb) to service_role;
