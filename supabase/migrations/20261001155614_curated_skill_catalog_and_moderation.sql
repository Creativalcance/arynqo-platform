-- Preserve existing choices; moderate only future additions to the shared catalog.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
alter table public.profile_tags add column status text not null default 'approved' check(status in ('approved','pending','rejected'));
alter table public.profile_tags add column source text not null default 'legacy' check(source in ('legacy','community','esco'));
alter table public.profile_tags add column source_uri text;
alter table public.profile_tags add column source_version text;
create unique index profile_tags_source_uri on public.profile_tags(source_uri) where source_uri is not null;
create index profile_tags_text_search on public.profile_tags using gin(normalized_label extensions.gin_trgm_ops);
create index profile_tags_status_created on public.profile_tags(status,created_at);
create schema if not exists private;
create table private.profile_tag_reviews (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles(id),
 tag_id uuid not null references public.profile_tags(id), action text not null,
 target_id uuid references public.profile_tags(id), previous_status text not null,
 created_at timestamptz not null default now()
);
create table private.profile_taxonomy_imports (
 version text primary key, manifest jsonb not null, imported_at timestamptz not null default now()
);
alter table private.profile_tag_reviews enable row level security;
alter table private.profile_taxonomy_imports enable row level security;
revoke all on private.profile_tag_reviews,private.profile_taxonomy_imports from public,anon,authenticated;
grant all on private.profile_tag_reviews,private.profile_taxonomy_imports to service_role;

create table public.profile_tag_aliases (
 normalized_alias text primary key, alias text not null, tag_id uuid not null references public.profile_tags(id),
 created_at timestamptz not null default now()
);
alter table public.profile_tag_aliases enable row level security;
revoke all on public.profile_tag_aliases from public,anon,authenticated;
grant select on public.profile_tag_aliases to authenticated;
grant all on public.profile_tag_aliases to service_role;
create policy profile_tag_aliases_approved on public.profile_tag_aliases for select to authenticated
using(exists(select 1 from public.profile_tags t where t.id=tag_id and t.status='approved'));

drop policy profile_tags_known_accounts on public.profile_tags;
create policy profile_tags_known_accounts on public.profile_tags for select to authenticated
using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in('student','company','admin'))
 and (status='approved' or created_by=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')));
grant select(id,status,source,source_uri,source_version) on public.profile_tags to authenticated;

create function public.profile_tag_key(p_value text) returns text language sql immutable set search_path='' as $$
 select translate(lower(regexp_replace(btrim(p_value),'\s+',' ','g')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc');
$$;
revoke all on function public.profile_tag_key(text) from public,anon;
grant execute on function public.profile_tag_key(text) to authenticated,service_role;

create function public.search_profile_tags(p_query text default '',p_limit integer default 20)
returns table(label text,status text,source text) language sql stable security invoker set search_path='' as $$
 with input as (select public.profile_tag_key(left(coalesce(p_query,''),80)) as q),
 pattern as (select q,replace(replace(replace(q,E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') as escaped from input)
 select t.label,t.status,t.source from public.profile_tags t cross join pattern p
 where t.status <> 'rejected' and (p.q='' or t.normalized_label like '%'||p.escaped||'%' escape E'\\'
  or exists(select 1 from public.profile_tag_aliases a where a.tag_id=t.id and a.normalized_alias like '%'||p.escaped||'%' escape E'\\'))
 order by (t.normalized_label=p.q) desc, (t.normalized_label like p.escaped||'%' escape E'\\') desc,
 (t.source='legacy') desc, char_length(t.label),t.label
 limit greatest(1,least(coalesce(p_limit,20),20));
$$;
revoke all on function public.search_profile_tags(text,integer) from public,anon;
grant execute on function public.search_profile_tags(text,integer) to authenticated;

create or replace function public.ensure_profile_tag(p_label text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); cleaned text:=regexp_replace(btrim(p_label),'\s+',' ','g');
 actor_role text; tag_key text; canonical text; existing_status text;
begin
 select p.role into actor_role from public.profiles p where p.id=actor;
 if actor is null or actor_role is null or actor_role not in('student','company','admin') then
  raise exception 'Inicia sessão para adicionar competências.' using errcode='42501'; end if;
 if p_label is null or char_length(cleaned) not between 1 and 80 or p_label ~ '[[:cntrl:]<>@,;]' then
  raise exception 'Usa uma competência com até 80 caracteres, sem dados pessoais.' using errcode='22023'; end if;
 tag_key:=public.profile_tag_key(cleaned);
 select t.label into canonical from public.profile_tag_aliases a join public.profile_tags t on t.id=a.tag_id
 where a.normalized_alias=tag_key and t.status='approved';
 if canonical is not null then return canonical; end if;
 select t.label,t.status into canonical,existing_status from public.profile_tags t where t.normalized_label=tag_key;
 if canonical is not null then
  if existing_status='rejected' then raise exception 'Esta tag foi retirada do catálogo. Seleciona outra competência.' using errcode='22023'; end if;
  return canonical;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,6179));
 if (select count(*) from public.profile_tags t where t.created_by=actor and t.created_at>now()-interval '1 hour')>=60 then
  raise exception 'Atingiste o limite de novas competências. Tenta mais tarde.' using errcode='P0001'; end if;
 insert into public.profile_tags(label,created_by,source,status) values(cleaned,actor,'community',case when actor_role='admin' then 'approved' else 'pending' end)
 on conflict(normalized_label) do nothing;
 select t.label,t.status into canonical,existing_status from public.profile_tags t where t.normalized_label=tag_key;
 if existing_status='rejected' then raise exception 'Esta tag foi retirada do catálogo.' using errcode='22023'; end if;
 return canonical;
end;
$$;

create function public.moderate_profile_tag(p_id uuid,p_action text,p_expected_status text,p_target uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.profile_tags%rowtype; target public.profile_tags%rowtype;
 result text;
begin
 if actor is null or not exists(select 1 from public.profiles p where p.id=actor and p.role='admin') then
  raise exception 'Acesso reservado a administradores.' using errcode='42501'; end if;
 if p_action not in('approve','reject','alias','unlink') or p_action is null then raise exception 'Ação inválida.' using errcode='22023'; end if;
 select * into item from public.profile_tags t where t.id=p_id for update;
 if not found then raise exception 'Competência não encontrada.' using errcode='22023'; end if;
 if p_expected_status is null or item.status<>p_expected_status then raise exception 'O estado mudou. Atualiza a lista antes de decidir.' using errcode='40001'; end if;
 result:=case when p_action='approve' then 'approved' else 'rejected' end;
 if p_action='alias' then
  if item.source='esco' or item.source_uri is not null then raise exception 'Não associes conceitos ESCO distintos como equivalentes.' using errcode='22023'; end if;
  select * into target from public.profile_tags t where t.id=p_target for share;
  if not found or target.status<>'approved' or target.id=item.id then raise exception 'Seleciona uma competência aprovada diferente.' using errcode='22023'; end if;
  if exists(select 1 from public.profile_tag_aliases a where a.tag_id=item.id) then raise exception 'Esta competência já tem equivalências. Revê-as antes de associar.' using errcode='22023'; end if;
  insert into public.profile_tag_aliases(normalized_alias,alias,tag_id) values(item.normalized_label,item.label,target.id)
  on conflict(normalized_alias) do update set tag_id=excluded.tag_id;
 elsif p_action='unlink' then
  select t.* into target from public.profile_tag_aliases a join public.profile_tags t on t.id=a.tag_id where a.normalized_alias=item.normalized_label;
  if not found then raise exception 'Esta tag não tem uma equivalência associada.' using errcode='22023'; end if;
  delete from public.profile_tag_aliases where normalized_alias=item.normalized_label;
  result:=case when item.source='community' then 'pending' else 'approved' end;
 elsif p_action='approve' and exists(select 1 from public.profile_tag_aliases a where a.normalized_alias=item.normalized_label) then
  raise exception 'Esta tag já é uma equivalência. Mantém a competência de destino.' using errcode='22023';
 end if;
 update public.profile_tags set status=result where id=item.id;
 insert into private.profile_tag_reviews(actor_id,tag_id,action,target_id,previous_status) values(actor,item.id,p_action,case when p_action in('alias','unlink') then target.id else null end,item.status);
 return result;
end;
$$;
revoke all on function public.moderate_profile_tag(uuid,text,text,uuid) from public,anon;
grant execute on function public.moderate_profile_tag(uuid,text,text,uuid) to authenticated;

-- Import runs are service-only, idempotent and capped at 150 validated terms per transaction.
create function public.import_esco_profile_tags(p_rows jsonb,p_version text) returns integer
language plpgsql security invoker set search_path='' as $$
declare entry jsonb; concept text; label text; total integer:=0;
begin
 if p_rows is null or p_version<>'v1.2.1' or p_version is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>150 then
  raise exception 'Importação ESCO inválida.' using errcode='22023'; end if;
 for entry in select value from jsonb_array_elements(p_rows) loop
  concept:=entry->>0;label:=entry->>1;
  if concept is null or concept !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or label is null or char_length(label) not between 1 and 80 or label ~ '[[:cntrl:]<>@,;]' then
   raise exception 'Termo ESCO inválido.' using errcode='22023'; end if;
  insert into public.profile_tags(label,source,status,source_uri,source_version)
  values(label,'esco','approved','http://data.europa.eu/esco/skill/'||concept,p_version)
  on conflict(normalized_label) do update set source_uri=excluded.source_uri,source_version=excluded.source_version
   where public.profile_tags.source_uri is null and public.profile_tags.status='approved';
  total:=total+1;
 end loop;
 return total;
end;
$$;
revoke all on function public.import_esco_profile_tags(jsonb,text) from public,anon,authenticated;
grant execute on function public.import_esco_profile_tags(jsonb,text) to service_role;
