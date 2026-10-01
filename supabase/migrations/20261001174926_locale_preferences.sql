alter table public.profiles add column locale text not null default 'pt'
  check (locale in ('pt','en','fr','es','de','it'));
grant update(locale) on public.profiles to authenticated;

-- This is a display preference. Authorization continues to use protected roles.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  account_role text := case when new.raw_user_meta_data->>'role' = 'company' then 'company' else 'student' end;
  account_locale text := case when new.raw_user_meta_data->>'locale' in ('pt','en','fr','es','de','it') then new.raw_user_meta_data->>'locale' else 'pt' end;
begin
  insert into public.profiles (id, role, name, email, locale)
  values (new.id, account_role, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, account_locale);
  if account_role = 'student' then
    insert into public.student_profiles (user_id, headline, location, bio) values (new.id, '', '', '');
  else
    insert into public.company_profiles (user_id, company_name, description, location)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Empresa'), '', '');
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

alter table public.jobs add column country_code text check (country_code is null or country_code in ('AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'));
alter table public.jobs add column content_locale text check (content_locale is null or content_locale in ('pt','en','fr','es','de','it'));
