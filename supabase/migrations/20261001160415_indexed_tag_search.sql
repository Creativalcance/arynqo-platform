-- Separate alias lookups from label matching so the substring index can be used.
create index profile_tag_aliases_text_search on public.profile_tag_aliases using gin(normalized_alias extensions.gin_trgm_ops);
create or replace function public.search_profile_tags(p_query text default '',p_limit integer default 20)
returns table(label text,status text,source text) language sql stable security invoker set search_path='' as $$
 with input as (select public.profile_tag_key(left(coalesce(p_query,''),80)) as q),
 pattern as (select q,replace(replace(replace(q,E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') as escaped from input),
 matches as (
  select t.id from public.profile_tags t cross join pattern p
  where p.q='' or t.normalized_label like '%'||p.escaped||'%' escape E'\\'
  union
  select a.tag_id from public.profile_tag_aliases a cross join pattern p
  where p.q<>'' and a.normalized_alias like '%'||p.escaped||'%' escape E'\\'
 )
 select t.label,t.status,t.source from public.profile_tags t join matches m on m.id=t.id cross join pattern p
 where t.status<>'rejected'
 order by (t.normalized_label=p.q) desc,(t.normalized_label like p.escaped||'%' escape E'\\') desc,
 (t.source='legacy') desc,char_length(t.label),t.label
 limit greatest(1,least(coalesce(p_limit,20),20));
$$;
