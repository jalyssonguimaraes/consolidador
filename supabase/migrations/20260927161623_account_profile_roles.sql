alter table public.account_profiles drop constraint account_profiles_role_check;
alter table public.account_profiles add constraint account_profiles_role_check check(role in ('master','admin','consultor','familia'));
comment on column public.account_profiles.role is 'Perfil de acesso: master, admin, consultor ou familia.';
