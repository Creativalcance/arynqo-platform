-- Preserve existing occupation identities and policies. Only the server can create terms.
alter table public.matching_occupations
 add column source text not null default 'esco' check(source in ('esco','community')),
 add column normalized_name text unique,
 add column original_locale text check(original_locale in ('pt','en','fr','es','de','it')),
 add constraint community_occupation_name check(source <> 'community' or
  (normalized_name is not null and length(normalized_name) between 2 and 150 and length(label) between 2 and 150));

create function public.ensure_custom_occupation(p_label text,p_key text,p_locale text)
returns table(id uuid,label text)
language plpgsql security invoker set search_path = '' as $$
begin
 if p_label is null or length(btrim(p_label)) not between 2 and 150
 or p_label ~ '[<>[:cntrl:]]' or p_key is null or length(p_key) not between 2 and 150
 or p_locale is null or p_locale not in ('pt','en','fr','es','de','it') then
 raise exception 'Invalid occupation' using errcode='22023';
 end if;
 return query insert into public.matching_occupations as o(id,label,source,normalized_name,original_locale)
 values(gen_random_uuid(),p_label,'community',p_key,p_locale)
 on conflict(normalized_name) do update set normalized_name=excluded.normalized_name
 returning o.id,o.label;
end;$$;
revoke all on function public.ensure_custom_occupation(text,text,text) from public,anon,authenticated;
grant execute on function public.ensure_custom_occupation(text,text,text) to service_role;
