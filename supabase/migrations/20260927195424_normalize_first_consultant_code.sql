update public.account_profiles set profile_code='CO0000001',updated_at=now() where id='96a63c5a-f6e3-417b-8afd-65716ff5faa1';
select setval('private.consultant_code_seq',1,true);
