alter table public.account_profiles drop constraint account_profiles_code_format;
alter table public.account_profiles add constraint account_profiles_code_format check (
 (role='consultor' and profile_code ~ '^CO[0-9]{7}$') or
 (role in ('master','admin','familia') and profile_code is null)
);
create or replace function private.assign_profile_code() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='consultor' and new.profile_code is null then new.profile_code:='CO'||lpad(nextval('private.consultant_code_seq')::text,7,'0'); end if;
 if new.role<>'consultor' then new.profile_code:=null; end if;
 return new;
end $$;
