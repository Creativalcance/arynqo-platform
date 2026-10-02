-- Existing posts and their URLs remain unchanged. Automation starts paused.
alter table public.academy_posts add column multilingual boolean not null default false,
  add column editorial_sources jsonb not null default '[]',
  add column author_name text not null default 'ARYNQO Editorial',
  add column content_locale text not null default 'pt' check(content_locale in ('pt','en','fr','es','de','it'));
create table public.academy_post_translations (
  post_id uuid not null references public.academy_posts(id) on delete cascade,
  locale text not null check (locale in ('pt','en','fr','es','de','it')),
  title text not null, excerpt text not null, content text not null,
  seo_title text not null, seo_description text not null, reading_time text not null,
  quality_passed boolean not null default false, review_required boolean not null default true,
  updated_at timestamptz not null default now(), primary key(post_id,locale)
);
create table public.academy_automation_settings (
  id boolean primary key default true check(id), enabled boolean not null default false,
  auto_publish boolean not null default false, next_due_at timestamptz not null default now(),
  monthly_request_limit integer not null default 120 check(monthly_request_limit between 6 and 600),
  updated_at timestamptz not null default now()
);
insert into public.academy_automation_settings(id) values(true);
create table public.academy_topics (
  id uuid primary key default gen_random_uuid(), title text not null unique,
  category text not null, audience text not null check(audience in ('Candidatos','Empresas','Todos')),
  source_urls jsonb not null check(jsonb_typeof(source_urls)='array' and jsonb_array_length(source_urls) between 1 and 2),
  priority integer not null default 100, enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.academy_generation_runs (
  id uuid primary key default gen_random_uuid(), topic_id uuid not null unique references public.academy_topics(id),
  slot_at timestamptz not null unique, post_id uuid unique references public.academy_posts(id) on delete set null,
  status text not null default 'queued' check(status in ('queued','running','failed','review','published')),
  attempts integer not null default 0, preview_only boolean not null default false, lease_token uuid, lease_until timestamptz,
  error_code text, sources jsonb not null default '[]', input_tokens bigint not null default 0,
  output_tokens bigint not null default 0, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.academy_monthly_usage (
  month date primary key, reserved_requests integer not null default 0
);
create index academy_runs_status on public.academy_generation_runs(status,created_at);
create index academy_topics_calendar on public.academy_topics(priority,created_at) where enabled;
alter table public.academy_post_translations enable row level security;
alter table public.academy_automation_settings enable row level security;
alter table public.academy_topics enable row level security;
alter table public.academy_generation_runs enable row level security;
alter table public.academy_monthly_usage enable row level security;
revoke all on public.academy_post_translations, public.academy_automation_settings, public.academy_topics, public.academy_generation_runs, public.academy_monthly_usage from anon, authenticated;
grant select on public.academy_post_translations to anon,authenticated;
grant select on public.academy_automation_settings,public.academy_topics,public.academy_generation_runs,public.academy_monthly_usage to authenticated;
grant all on public.academy_post_translations,public.academy_automation_settings,public.academy_topics,public.academy_generation_runs,public.academy_monthly_usage to service_role;
create policy published_translations on public.academy_post_translations for select to anon, authenticated
 using(exists(select 1 from public.academy_posts p where p.id=post_id and p.status='published'));
create policy admin_translations on public.academy_post_translations for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy admin_settings on public.academy_automation_settings for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy admin_topics on public.academy_topics for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy admin_runs on public.academy_generation_runs for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
create policy admin_usage on public.academy_monthly_usage for select to authenticated
 using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
-- Invoker functions are service-only: no publicly callable privileged RPC.
create function public.academy_claim_run(retry_id uuid default null, manual boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare cfg public.academy_automation_settings; r public.academy_generation_runs; topic uuid; used integer; month_key date=date_trunc('month',now())::date;
begin
 select * into cfg from public.academy_automation_settings where id=true for update;
 if retry_id is null and not manual and not cfg.enabled then return jsonb_build_object('reason','paused'); end if;
 update public.academy_generation_runs set status='failed',error_code='worker_timeout',lease_token=null,lease_until=null where status='running' and lease_until<=now();
 if exists(select 1 from public.academy_generation_runs where status='running' and lease_until>now()) then return jsonb_build_object('reason','already_running'); end if;
 if retry_id is not null then
   select * into r from public.academy_generation_runs where id=retry_id and status in ('failed','queued','running') and attempts<3 for update;
   if r.id is null then return jsonb_build_object('reason','not_retryable'); end if;
 else
   select * into r from public.academy_generation_runs where status in ('queued','failed','running') and attempts<3 order by created_at limit 1 for update;
 end if;
 if r.id is null and not manual and cfg.next_due_at>now() then return jsonb_build_object('reason','not_due'); end if;
 insert into public.academy_monthly_usage(month) values(month_key) on conflict do nothing;
 select reserved_requests into used from public.academy_monthly_usage where month=month_key for update;
 if used+6>cfg.monthly_request_limit then return jsonb_build_object('reason','monthly_limit'); end if;
 if r.id is null then
  select t.id into topic from public.academy_topics t where t.enabled and not exists(select 1 from public.academy_generation_runs g where g.topic_id=t.id) order by t.priority,t.created_at,t.id limit 1;
  if topic is null then return jsonb_build_object('reason','calendar_empty'); end if;
  insert into public.academy_generation_runs(topic_id,slot_at,preview_only) values(topic,cfg.next_due_at,manual) returning * into r;
  -- Anchor nominal two-day slots at 09:00 UTC; daily cron jitter must not add another day. No backlog burst after downtime.
  update public.academy_automation_settings set next_due_at=greatest(next_due_at,date_trunc('day',now())+interval '9 hours')+interval '48 hours',updated_at=now() where id;
 end if;
 update public.academy_monthly_usage set reserved_requests=reserved_requests+6 where month=month_key;
 update public.academy_generation_runs set status='running',preview_only=preview_only or manual,attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes',started_at=now(),error_code=null where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
create function public.academy_record_usage(run_id uuid,token uuid,input_tokens integer,output_tokens integer) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.academy_generation_runs r set input_tokens=r.input_tokens+greatest(0,academy_record_usage.input_tokens),output_tokens=r.output_tokens+greatest(0,academy_record_usage.output_tokens) where r.id=run_id and r.lease_token=token and r.status='running' and r.lease_until>now();
 if not found then raise exception 'lease_lost'; end if;
end $$;
create function public.academy_stage_translation(run_id uuid,token uuid,language text,payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare r public.academy_generation_runs; post uuid;
begin
 select * into r from public.academy_generation_runs where id=run_id and lease_token=token and status='running' and lease_until>now() for update;
 if r.id is null then raise exception 'lease_lost'; end if;
 if language not in ('pt','en','fr','es','de','it') or payload->>'locale'<>language or length(payload->>'content')<2000 then raise exception 'invalid_translation'; end if;
 post=r.post_id;
 if post is null then
  if language<>'pt' then raise exception 'portuguese_required'; end if;
  insert into public.academy_posts(title,slug,excerpt,content,category,audience,reading_time,status,source_type,trend_topic,seo_title,seo_description,multilingual,editorial_sources)
  values(payload->>'title',payload->>'slug',payload->>'excerpt',payload->>'content',payload->>'category',payload->>'audience',payload->>'reading_time','draft','trend_ai',(select title from public.academy_topics where id=r.topic_id),payload->>'seo_title',payload->>'seo_description',true,r.sources) returning id into post;
  update public.academy_generation_runs set post_id=post where id=run_id;
 end if;
 insert into public.academy_post_translations(post_id,locale,title,excerpt,content,seo_title,seo_description,reading_time,quality_passed,review_required)
 values(post,language,payload->>'title',payload->>'excerpt',payload->>'content',payload->>'seo_title',payload->>'seo_description',payload->>'reading_time',true,coalesce((payload->>'review_required')::boolean,true))
 on conflict(post_id,locale) do update set title=excluded.title,excerpt=excluded.excerpt,content=excluded.content,seo_title=excluded.seo_title,seo_description=excluded.seo_description,reading_time=excluded.reading_time,quality_passed=true,review_required=excluded.review_required,updated_at=now();
end $$;
create function public.academy_finish_run(run_id uuid,token uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.academy_generation_runs; publish boolean; versions integer; needs_review boolean;
begin
 select * into r from public.academy_generation_runs where id=run_id and lease_token=token and status='running' and lease_until>now() for update;
 if r.id is null then raise exception 'lease_lost'; end if;
 select count(*),bool_or(review_required) into versions,needs_review from public.academy_post_translations where post_id=r.post_id and quality_passed;
 if versions<>6 then raise exception 'six_versions_required'; end if;
 select enabled and auto_publish and not needs_review and not r.preview_only into publish from public.academy_automation_settings where id;
 if publish then update public.academy_posts set status='published',published_at=now(),updated_at=now() where id=r.post_id; end if;
 update public.academy_generation_runs set status=case when publish then 'published' else 'review' end,completed_at=now(),lease_token=null,lease_until=null where id=run_id;
 return jsonb_build_object('post_id',r.post_id,'status',case when publish then 'published' else 'review' end,'review_required',needs_review);
end $$;
create function public.academy_fail_run(run_id uuid,token uuid,error_code text) returns void language sql security invoker set search_path='' as $$
 update public.academy_generation_runs set status='failed',error_code=left(academy_fail_run.error_code,100),lease_token=null,lease_until=null where id=run_id and lease_token=token and status='running';
$$;
-- Existing editor can still edit the Portuguese original. Keep that version coherent.
create function public.academy_sync_original() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.multilingual and new.status='published' and old.status<>'published' and
   (select count(*) from public.academy_post_translations where post_id=new.id and quality_passed)<>6 then raise exception 'As seis versões têm de estar completas antes da publicação.'; end if;
 if new.multilingual and (new.title,new.excerpt,new.content,new.seo_title,new.seo_description,new.reading_time) is distinct from (old.title,old.excerpt,old.content,old.seo_title,old.seo_description,old.reading_time) then
  -- Browser admins cannot write translations directly; use the protected API for multilingual edits.
  if current_user<>'service_role' then raise exception 'Edita este artigo na área de versões por idioma.'; end if;
  update public.academy_post_translations set title=new.title,excerpt=new.excerpt,content=new.content,seo_title=coalesce(new.seo_title,new.title),seo_description=coalesce(new.seo_description,new.excerpt),reading_time=new.reading_time,updated_at=now() where post_id=new.id and locale='pt';
 end if;
 return new;
end $$;
create trigger academy_sync_original before update on public.academy_posts for each row execute function public.academy_sync_original();
revoke all on function public.academy_claim_run(uuid,boolean),public.academy_record_usage(uuid,uuid,integer,integer),public.academy_stage_translation(uuid,uuid,text,jsonb),public.academy_finish_run(uuid,uuid),public.academy_fail_run(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.academy_claim_run(uuid,boolean),public.academy_record_usage(uuid,uuid,integer,integer),public.academy_stage_translation(uuid,uuid,text,jsonb),public.academy_finish_run(uuid,uuid),public.academy_fail_run(uuid,uuid,text) to service_role;
revoke all on function public.academy_sync_original() from public,anon,authenticated;

insert into public.academy_topics(title,category,audience,priority,source_urls) values
('Como escolher experiências relevantes para o CV','CV e Perfil','Candidatos',1,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como preparar exemplos para uma entrevista','Entrevistas','Candidatos',2,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como escrever requisitos claros numa oferta de emprego','Empresas e Recrutamento','Empresas',3,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como organizar uma procura de emprego sustentável','Carreira','Candidatos',4,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como usar IA para melhorar a escrita sem inventar experiência','IA e Matching','Todos',5,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como criar uma grelha de entrevista baseada em competências','Empresas e Recrutamento','Empresas',6,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como documentar competências adquiridas em projetos','Skills','Candidatos',7,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como preparar o primeiro dia num novo emprego','Primeiro Emprego','Candidatos',8,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como dar feedback útil depois de uma entrevista','Empresas e Recrutamento','Empresas',9,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como adaptar o CV a uma mudança de carreira','Carreira','Candidatos',10,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como definir um plano de aprendizagem profissional','Skills','Todos',11,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como organizar a integração de uma nova pessoa na equipa','Empresas e Recrutamento','Empresas',12,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como apresentar competências linguísticas num perfil','CV e Perfil','Candidatos',13,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como preparar uma entrevista remota','Entrevistas','Candidatos',14,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como explicar o processo de seleção aos candidatos','Empresas e Recrutamento','Empresas',15,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como rever respostas geradas por IA numa candidatura','IA e Matching','Todos',16,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como criar um portefólio com projetos académicos','Primeiro Emprego','Candidatos',17,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como definir critérios relevantes antes de pesquisar candidatos','Empresas e Recrutamento','Empresas',18,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como organizar uma candidatura espontânea','Candidaturas','Candidatos',19,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como avaliar uma oferta de trabalho com perguntas concretas','Carreira','Candidatos',20,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como preparar perguntas úteis para uma entrevista','Entrevistas','Todos',21,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como reduzir tarefas repetidas na gestão do recrutamento','Empresas e Recrutamento','Empresas',22,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb),
('Como atualizar o perfil após uma formação','CV e Perfil','Candidatos',23,'["https://europass.europa.eu/en/create-europass-cv", "https://europass.europa.eu/en/learn-europe/plan-your-learning"]'::jsonb),
('Como documentar decisões de recrutamento com critérios claros','Empresas e Recrutamento','Empresas',24,'["https://europass.europa.eu/en/learn-europe/plan-your-learning", "https://www.ilo.org/topics-and-sectors/skills-and-lifelong-learning"]'::jsonb);
create function public.academy_edit_translation(post uuid,language text,payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.academy_posts where id=post and multilingual for update;
 if not found or exists(select 1 from public.academy_generation_runs where post_id=post and status='running') then raise exception 'article_not_editable'; end if;
 update public.academy_post_translations set title=payload->>'title',excerpt=payload->>'excerpt',content=payload->>'content',seo_title=payload->>'seo_title',seo_description=payload->>'seo_description',reading_time=payload->>'reading_time',review_required=(payload->>'review_required')::boolean,quality_passed=true,updated_at=now() where post_id=post and locale=language;
 if not found then raise exception 'translation_missing'; end if;
 if language='pt' then
  update public.academy_posts set title=payload->>'title',excerpt=payload->>'excerpt',content=payload->>'content',seo_title=payload->>'seo_title',seo_description=payload->>'seo_description',reading_time=payload->>'reading_time',updated_at=now() where id=post;
 else update public.academy_posts set updated_at=now() where id=post; end if;
end $$;
create function public.academy_publish_reviewed(post uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.academy_generation_runs where post_id=post and status='review' for update;
 if not found then raise exception 'article_not_reviewable'; end if;
 if (select count(*) from public.academy_post_translations where post_id=post and quality_passed)<>6 then raise exception 'six_versions_required'; end if;
 update public.academy_posts set status='published',published_at=coalesce(published_at,now()),updated_at=now() where id=post;
 update public.academy_generation_runs set status='published',completed_at=now() where post_id=post;
end $$;
revoke all on function public.academy_edit_translation(uuid,text,jsonb),public.academy_publish_reviewed(uuid) from public,anon,authenticated;
grant execute on function public.academy_edit_translation(uuid,text,jsonb),public.academy_publish_reviewed(uuid) to service_role;
