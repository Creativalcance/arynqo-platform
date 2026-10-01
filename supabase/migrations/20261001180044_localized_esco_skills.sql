-- Official translations share the existing ESCO concept; canonical matching values do not change.
create table public.profile_tag_translations (
 tag_id uuid not null references public.profile_tags(id) on delete cascade,
 locale text not null check(locale in ('pt','en','fr','es','de','it')),
 label text not null check(char_length(label) between 1 and 500),
 normalized_label text not null,
 primary key(tag_id,locale)
);
create index profile_tag_translations_search on public.profile_tag_translations using gin(normalized_label extensions.gin_trgm_ops);
create index profile_tag_translations_locale on public.profile_tag_translations(locale);
alter table public.profile_tag_translations enable row level security;
revoke all on public.profile_tag_translations from public,anon,authenticated;
grant select on public.profile_tag_translations to authenticated;
grant all on public.profile_tag_translations to service_role;
create policy profile_tag_translations_visible on public.profile_tag_translations for select to authenticated
 using(exists(select 1 from public.profile_tags t where t.id=tag_id and t.status<>'rejected'));

create function public.search_profile_tags_localized(p_query text default '',p_locale text default 'pt',p_limit integer default 20)
returns table(label text,display_label text,status text,source text)
language sql stable security invoker set search_path='' as $$
 with input as (select public.profile_tag_key(left(coalesce(p_query,''),80)) q),
 pattern as (select q,replace(replace(replace(q,E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_') escaped from input),
 matches as (
 select t.id from public.profile_tags t cross join pattern p where p.q='' or t.normalized_label like '%'||p.escaped||'%' escape E'\\'
 union select a.tag_id from public.profile_tag_aliases a cross join pattern p where p.q<>'' and a.normalized_alias like '%'||p.escaped||'%' escape E'\\'
 union select l.tag_id from public.profile_tag_translations l cross join pattern p where l.locale=p_locale and p.q<>'' and l.normalized_label like '%'||p.escaped||'%' escape E'\\'
 )
 select t.label,coalesce(l.label,t.label),t.status,t.source from public.profile_tags t join matches m on m.id=t.id
 left join public.profile_tag_translations l on l.tag_id=t.id and l.locale=p_locale cross join pattern p
 where t.status<>'rejected'
 order by (coalesce(l.normalized_label,t.normalized_label)=p.q) desc,
 (coalesce(l.normalized_label,t.normalized_label) like p.escaped||'%' escape E'\\') desc,
 (t.source='legacy') desc,char_length(coalesce(l.label,t.label)),t.label
 limit greatest(1,least(coalesce(p_limit,20),20));
$$;
create function public.profile_tag_display_labels(p_labels text[],p_locale text default 'pt')
returns table(label text,display_label text) language sql stable security invoker set search_path='' as $$
 select t.label,coalesce(l.label,t.label) from public.profile_tags t
 left join public.profile_tag_translations l on l.tag_id=t.id and l.locale=p_locale
 where t.label=any(p_labels[1:200]) and t.status<>'rejected';
$$;
revoke all on function public.search_profile_tags_localized(text,text,integer),public.profile_tag_display_labels(text[],text) from public,anon;
grant execute on function public.search_profile_tags_localized(text,text,integer),public.profile_tag_display_labels(text[],text) to authenticated;
