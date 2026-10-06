-- Reuse approved concepts and their existing translations. Never infer equivalence from free text.
create index if not exists profile_tag_translations_exact_key on public.profile_tag_translations(normalized_label,tag_id);
create function public.external_skill_equivalences(p_labels text[])
returns jsonb language sql stable security invoker set search_path='' as $$
 with input as (
  select distinct public.profile_tag_key(left(label,500)) key from unnest(p_labels[1:200]) label
 ), matches as (
  select i.key,t.id from input i join public.profile_tags t on t.normalized_label=i.key where t.status='approved'
  union
  select i.key,t.id from input i join public.profile_tag_translations l on l.normalized_label=i.key join public.profile_tags t on t.id=l.tag_id where t.status='approved'
  union
  select i.key,t.id from input i join public.profile_tag_aliases a on a.normalized_alias=i.key join public.profile_tags t on t.id=a.tag_id where t.status='approved'
 ), unambiguous as (
  select key from matches group by key having count(distinct id)=1
 ), concepts as (
  select distinct t.id,t.label from matches m join unambiguous u on u.key=m.key join public.profile_tags t on t.id=m.id
 ), terms as (
  select c.id,c.label canonical,c.label term,public.profile_tag_key(c.label) key from concepts c
  union
  select c.id,c.label,l.label,l.normalized_label from concepts c join public.profile_tag_translations l on l.tag_id=c.id
  union
  select c.id,c.label,a.alias,a.normalized_alias from concepts c join public.profile_tag_aliases a on a.tag_id=c.id
 ), dictionary as (
  select t.normalized_label key,t.id from public.profile_tags t where t.status='approved' and t.normalized_label in (select key from terms)
  union
  select l.normalized_label,t.id from public.profile_tag_translations l join public.profile_tags t on t.id=l.tag_id where t.status='approved' and l.normalized_label in (select key from terms)
  union
  select a.normalized_alias,t.id from public.profile_tag_aliases a join public.profile_tags t on t.id=a.tag_id where t.status='approved' and a.normalized_alias in (select key from terms)
 ), unique_terms as (
  select key from dictionary group by key having count(distinct id)=1
 )
 select coalesce(jsonb_agg(jsonb_build_object('canonical',canonical,'term',term) order by canonical,term),'[]'::jsonb)
 from terms t join unique_terms u on u.key=t.key;
$$;
revoke all on function public.external_skill_equivalences(text[]) from public,anon;
grant execute on function public.external_skill_equivalences(text[]) to authenticated,service_role;
