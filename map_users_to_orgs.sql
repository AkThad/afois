-- Show me who owns what
SELECT 
    u.email,
    u.id as user_id,
    o.name as organization_name,
    o.id as org_id,
    o.bonding_capacity,
    m.role
FROM auth.users u
LEFT JOIN public.organization_members m ON u.id = m.user_id
LEFT JOIN public.organizations o ON m.org_id = o.id;
