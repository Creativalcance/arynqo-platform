-- All means an explicit absence of professional-area restriction. No records are rewritten.
create or replace function public.validate_matching_preferences() returns trigger language plpgsql security invoker set search_path='' as $$
declare v jsonb:=new.matching_preferences; x text; k text; max_levels integer;
begin
 if tg_op='INSERT' then new.matching_revision:=0; else new.matching_revision:=old.matching_revision; end if;
 if v is not null then
  if jsonb_typeof(v)<>'object' then raise exception 'Invalid matching preferences'; end if;
  if (select count(*) from jsonb_object_keys(v))<>6 or not (v ?& array['profession','area','levels','models','skills','confirmed']) then raise exception 'Invalid matching preferences'; end if;
  if jsonb_typeof(v->'confirmed')<>'boolean' or jsonb_typeof(v->'profession')<>'string' or jsonb_typeof(v->'area')<>'string' then raise exception 'Invalid matching preferences'; end if;
  if v->>'profession'<>'' and not exists(select 1 from public.matching_occupations where id::text=v->>'profession') then raise exception 'Unknown occupation'; end if;
  if v->>'area'<>'' and not(v->>'area'=any(array['Todas','Administração e Gestão','Agricultura, Floresta e Ambiente','Arquitetura e Design de Interiores','Artes, Cultura e Indústrias Criativas','Atendimento ao Cliente','Automóvel e Mobilidade','Banca, Seguros e Serviços Financeiros','Comercial e Vendas','Compras e Procurement','Comunicação, Marketing e Publicidade','Construção Civil e Obras Públicas','Consultoria','Contabilidade, Auditoria e Fiscalidade','Design, UX e Produto Digital','Educação, Formação e Ensino','Engenharia Civil','Engenharia Eletrotécnica','Engenharia Industrial','Engenharia Informática','Engenharia Mecânica','Engenharia Química','Farmacêutica e Biotecnologia','Hotelaria, Turismo e Restauração','Imobiliário','Indústria e Produção','Jurídico','Logística, Transportes e Distribuição','Manutenção e Assistência Técnica','Operações','Qualidade, Segurança e Ambiente','Recursos Humanos','Retalho e Grande Distribuição','Saúde','Tecnologia, Software e Dados','Telecomunicações'])) then raise exception 'Unknown professional area'; end if;
  max_levels:=case when tg_table_name='student_profiles' then 1 else 8 end;
  foreach k in array array['levels','models','skills'] loop
   if jsonb_typeof(v->k)<>'array' then raise exception 'Invalid matching list'; end if;
   if jsonb_array_length(v->k)>(case k when 'levels' then max_levels when 'models' then 3 else 50 end) then raise exception 'Matching list too long'; end if;
   if exists(select 1 from jsonb_array_elements(v->k) e where jsonb_typeof(e)<>'string') then raise exception 'Invalid matching list value'; end if;
   if (select count(distinct e) from jsonb_array_elements_text(v->k) e)<>jsonb_array_length(v->k) then raise exception 'Duplicate matching value'; end if;
   for x in select jsonb_array_elements_text(v->k) loop
    if k='levels' and not(x=any(array['entry','junior','mid','senior','specialist','lead','manager','director'])) then raise exception 'Invalid seniority'; end if;
    if k='models' and not(x=any(array['onsite','hybrid','remote'])) then raise exception 'Invalid work model'; end if;
    if k='skills' and (length(x)<1 or length(x)>150 or btrim(x)<>x) then raise exception 'Invalid skill'; end if;
   end loop;
  end loop;
  if (v->>'confirmed')::boolean and (v->>'profession'='' or v->>'area'='' or jsonb_array_length(v->'levels')=0 or jsonb_array_length(v->'models')=0 or jsonb_array_length(v->'skills')=0) then raise exception 'Complete the five matching fields before confirmation'; end if;
 end if;
 if tg_table_name='jobs' then
  if tg_op='INSERT' then
   if new.is_active and not coalesce((v->>'confirmed')::boolean,false) then raise exception 'Preenche e confirma os cinco campos do perfil procurado.'; end if;
  elsif new.is_active and (not old.is_active or old.matching_preferences is not null) and not coalesce((v->>'confirmed')::boolean,false) then raise exception 'Preenche e confirma os cinco campos do perfil procurado.';
  end if;
 end if;
 if coalesce((v->>'confirmed')::boolean,false) then
  select label into new.role_title from public.matching_occupations where id::text=v->>'profession';
  new.role_family:=v->>'area';
  new.seniority:=case v->'levels'->>0 when 'entry' then 'Sem experiência' when 'junior' then 'Júnior' when 'mid' then 'Pleno' when 'senior' then 'Sénior' when 'specialist' then 'Especialista' when 'lead' then 'Coordenação' when 'manager' then 'Gestão' when 'director' then 'Direção' end;
  new.work_model:=case v->'models'->>0 when 'onsite' then 'Presencial' when 'hybrid' then 'Híbrido' when 'remote' then 'Remoto' end;
  if tg_table_name='jobs' then
   new.area:=v->>'area';new.required_skills:=array(select jsonb_array_elements_text(v->'skills'));
  else
   new.main_role:=new.role_title;new.desired_area:=v->>'area';new.skills_normalized:=array(select jsonb_array_elements_text(v->'skills'));
  end if;
 end if;
 if tg_op='INSERT' then
  if v is not null then new.matching_revision:=1; end if;
 elsif v is distinct from old.matching_preferences then new.matching_revision:=old.matching_revision+1; end if;
 return new;
end $$;
