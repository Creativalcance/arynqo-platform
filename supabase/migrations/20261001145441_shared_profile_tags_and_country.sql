-- Shared professional vocabulary; no personal data or public writes.
alter table public.student_profiles add column if not exists country text;
create table public.profile_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80 and label !~ '[[:cntrl:]<>@,;]'),
  normalized_label text generated always as (translate(lower(regexp_replace(btrim(label), '\s+', ' ', 'g')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')) stored unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index profile_tags_creator_date on public.profile_tags(created_by, created_at);
alter table public.profile_tags enable row level security;
revoke all on public.profile_tags from anon, authenticated;
grant select(label, normalized_label) on public.profile_tags to authenticated;
grant all on public.profile_tags to service_role;
create policy profile_tags_known_accounts on public.profile_tags for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('student','company','admin')));

create function public.ensure_profile_tag(p_label text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  cleaned text := regexp_replace(btrim(p_label), '\s+', ' ', 'g');
  tag_key text;
  canonical text;
begin
  if actor is null or not exists(select 1 from public.profiles p where p.id=actor and p.role in ('student','company','admin')) then
    raise exception 'Inicia sessão para adicionar competências.' using errcode='42501';
  end if;
  if p_label is null or char_length(cleaned) not between 1 and 80 or p_label ~ '[[:cntrl:]<>@,;]' then
    raise exception 'Usa uma competência com até 80 caracteres, sem dados pessoais.' using errcode='22023';
  end if;
  tag_key := translate(lower(cleaned),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc');
  select t.label into canonical from public.profile_tags t where t.normalized_label=tag_key;
  if canonical is not null then return canonical; end if;
  -- Serialize new creations per account so simultaneous requests cannot bypass the quota.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 6179));
  if (select count(*) from public.profile_tags t where t.created_by=actor and t.created_at > now()-interval '1 hour') >= 60 then
    raise exception 'Atingiste o limite de novas competências. Tenta mais tarde.' using errcode='P0001';
  end if;
  insert into public.profile_tags(label,created_by) values(cleaned,actor)
  on conflict(normalized_label) do nothing;
  select t.label into canonical from public.profile_tags t where t.normalized_label=tag_key;
  return canonical;
end;
$$;
revoke all on function public.ensure_profile_tag(text) from public, anon;
grant execute on function public.ensure_profile_tag(text) to authenticated;

insert into public.profile_tags(label)
select distinct btrim(name) from public.skills
where char_length(btrim(name)) between 1 and 80 and name !~ '[[:cntrl:]<>@,;]'
on conflict(normalized_label) do nothing;
insert into public.profile_tags(label)
select distinct btrim(value) from public.jobs j,
lateral unnest(coalesce(j.required_skills,'{}'::text[]) || coalesce(j.preferred_skills,'{}'::text[])) as value
where char_length(btrim(value)) between 1 and 80 and value !~ '[[:cntrl:]<>@,;]'
on conflict(normalized_label) do nothing;

insert into public.profile_tags(label) values
('Comunicação'),
('Trabalho em equipa'),
('Organização'),
('Proatividade'),
('Resolução de problemas'),
('Gestão de tempo'),
('Microsoft Office'),
('Excel'),
('Inglês'),
('Atendimento ao cliente'),
('Vendas'),
('Marketing Digital'),
('Redes Sociais'),
('Análise de dados'),
('Gestão de projetos'),
('React'),
('Next.js'),
('TypeScript'),
('JavaScript'),
('TailwindCSS'),
('Supabase'),
('PostgreSQL'),
('OpenAI API'),
('Figma'),
('Comunicação'),
('Trabalho em equipa'),
('Liderança'),
('Pensamento crítico'),
('Adaptabilidade'),
('Organização'),
('Negociação'),
('Gestão de conflitos'),
('Criatividade'),
('Empatia'),
('Python'),
('Java'),
('C'),
('C++'),
('C#'),
('SQL'),
('Power BI'),
('Tableau'),
('SAP'),
('Salesforce'),
('HubSpot'),
('AutoCAD'),
('SolidWorks'),
('Adobe Photoshop'),
('Adobe Illustrator'),
('Microsoft Teams'),
('Microsoft Word'),
('Microsoft Excel'),
('Microsoft PowerPoint'),
('Gestão de projetos'),
('Contabilidade'),
('Recrutamento'),
('Logística'),
('Segurança alimentar'),
('Enfermagem'),
('Manutenção industrial'),
('Soldadura'),
('CNC'),
('SEO'),
('Google Analytics'),
('Google Ads'),
('Gestão de redes sociais')
on conflict(normalized_label) do nothing;
