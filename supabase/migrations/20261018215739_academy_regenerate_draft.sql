-- A regenerated article is a separate draft. Never discard an existing text or
-- change the publication state of the source article.
alter table public.academy_generation_runs drop constraint academy_generation_runs_topic_id_key;
alter table public.academy_generation_runs add column regenerated_from uuid references public.academy_generation_runs(id) on delete set null;
create index academy_runs_topic on public.academy_generation_runs(topic_id);
create index academy_runs_regenerated_from on public.academy_generation_runs(regenerated_from) where regenerated_from is not null;

create function public.academy_claim_regeneration(source_run uuid, regeneration_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare source public.academy_generation_runs; existing public.academy_generation_runs; claimed jsonb;
begin
 if source_run is null or regeneration_id is null or source_run=regeneration_id then raise exception 'invalid_regeneration'; end if;
 -- Use the same lock order as normal claims, serializing budget and lease checks.
 perform 1 from public.academy_automation_settings where id=true for update;
 select * into existing from public.academy_generation_runs where id=regeneration_id;
 if existing.id is not null then
  if existing.regenerated_from is distinct from source_run then raise exception 'invalid_regeneration'; end if;
  return jsonb_build_object('reason',case when existing.status='running' then 'already_running' else 'regeneration_exists' end,'existing_run_id',existing.id,'post_id',existing.post_id);
 end if;
 select * into source from public.academy_generation_runs where id=source_run for update;
 if source.id is null or source.status not in ('failed','review','published') then
  return jsonb_build_object('reason','not_regeneratable');
 end if;
 insert into public.academy_generation_runs(id,topic_id,slot_at,preview_only,regenerated_from)
 values(regeneration_id,source.topic_id,clock_timestamp(),true,source.id);
 -- Reservation, global concurrency, lease and manual retry rules stay centralized.
 claimed=public.academy_claim_run(regeneration_id,true);
 if not (claimed ? 'id') then
  delete from public.academy_generation_runs where id=regeneration_id;
 end if;
 return claimed;
end $$;
revoke all on function public.academy_claim_regeneration(uuid,uuid) from public,anon,authenticated;
grant execute on function public.academy_claim_regeneration(uuid,uuid) to service_role;
