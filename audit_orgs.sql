-- Audit Organizations
SELECT id, name, bonding_capacity, created_at FROM public.organizations;

-- Audit Members
SELECT user_id, org_id, role, created_at FROM public.organization_members;

-- Check if any orphan orgs exist (created but no members)
SELECT * FROM public.organizations 
WHERE id NOT IN (SELECT org_id FROM public.organization_members);
