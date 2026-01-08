-- Check Users
SELECT id, email, created_at, email_confirmed_at FROM auth.users;

-- Check Organizations
SELECT * FROM public.organizations;

-- Check Memberships (The link between Users and Orgs)
SELECT * FROM public.organization_members;
