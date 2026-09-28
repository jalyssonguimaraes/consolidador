create sequence private.family_code_seq start 1;
create sequence private.consultant_code_seq start 1;
revoke all on sequence private.family_code_seq,private.consultant_code_seq from public,anon,authenticated;

alter table public.account_profiles add column profile_code text unique;
alter table public.account_profiles add constraint account_profiles_code_format check (
 (role='familia' and profile_code ~ '^FA[0-9]{7}$') or
 (role='consultor' and profile_code ~ '^CO[0-9]{7}$') or
 (role in ('master','admin') and profile_code is null)
);

create function private.assign_profile_code() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='familia' and new.profile_code is null then new.profile_code:='FA'||lpad(nextval('private.family_code_seq')::text,7,'0'); end if;
 if new.role='consultor' and new.profile_code is null then new.profile_code:='CO'||lpad(nextval('private.consultant_code_seq')::text,7,'0'); end if;
 return new;
end $$;
revoke all on function private.assign_profile_code() from public,anon,authenticated;
create trigger account_profile_code before insert on public.account_profiles for each row execute function private.assign_profile_code();

grant select(id,display_name,role,profile_code,created_at,updated_at) on public.account_profiles to authenticated;

create table public.consultant_supervision (
 consultant_id uuid primary key references public.account_profiles(id) on delete cascade,
 supervisor_id uuid not null references public.account_profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 check(consultant_id<>supervisor_id)
);
create index consultant_supervision_supervisor on public.consultant_supervision(supervisor_id);

create function private.validate_consultant_supervision() returns trigger language plpgsql security definer set search_path='' as $$
declare consultant_role text; supervisor_role text;
begin
 select role into consultant_role from public.account_profiles where id=new.consultant_id;
 select role into supervisor_role from public.account_profiles where id=new.supervisor_id;
 if consultant_role<>'consultor' then raise exception 'CONSULTANT_PROFILE_REQUIRED'; end if;
 if supervisor_role not in ('master','admin') then raise exception 'MASTER_OR_ADMIN_REQUIRED'; end if;
 return new;
end $$;
revoke all on function private.validate_consultant_supervision() from public,anon,authenticated;
create trigger validate_consultant_supervision before insert or update on public.consultant_supervision for each row execute function private.validate_consultant_supervision();

create table public.family_consultants (
 family_id uuid primary key references public.account_profiles(id) on delete cascade,
 consultant_id uuid not null references public.account_profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 check(family_id<>consultant_id)
);
create index family_consultants_consultant on public.family_consultants(consultant_id);

create function private.validate_family_consultant() returns trigger language plpgsql security definer set search_path='' as $$
declare family_role text; consultant_role text;
begin
 select role into family_role from public.account_profiles where id=new.family_id;
 select role into consultant_role from public.account_profiles where id=new.consultant_id;
 if family_role<>'familia' then raise exception 'FAMILY_PROFILE_REQUIRED'; end if;
 if consultant_role<>'consultor' then raise exception 'CONSULTANT_PROFILE_REQUIRED'; end if;
 return new;
end $$;
revoke all on function private.validate_family_consultant() from public,anon,authenticated;
create trigger validate_family_consultant before insert or update on public.family_consultants for each row execute function private.validate_family_consultant();

alter table public.consultant_supervision enable row level security;
alter table public.family_consultants enable row level security;
create policy supervision_participants_read on public.consultant_supervision for select to authenticated using ((select auth.uid()) in (consultant_id,supervisor_id));
create policy supervision_supervisor_write on public.consultant_supervision for all to authenticated using ((select auth.uid())=supervisor_id) with check ((select auth.uid())=supervisor_id);
create policy family_participants_read on public.family_consultants for select to authenticated using ((select auth.uid()) in (family_id,consultant_id));
create policy family_consultant_write on public.family_consultants for all to authenticated using ((select auth.uid())=consultant_id) with check ((select auth.uid())=consultant_id);
revoke all on public.consultant_supervision,public.family_consultants from anon;
grant select,insert,update,delete on public.consultant_supervision,public.family_consultants to authenticated;
