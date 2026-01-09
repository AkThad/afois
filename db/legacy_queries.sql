-- 1. Add site_visit_date to opportunities
-- (This was likely a migration script, safe to delete if column exists)
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS site_visit_date TIMESTAMPTZ;

-- 2. Organization & Member Audit with Orphan Detection
-- (Likely a debug script you wrote to check data integrity)
SELECT 
    o.id as org_id, 
    o.name, 
    count(m.user_id) as member_count 
FROM organizations o
LEFT JOIN organization_members m ON o.id = m.org_id
GROUP BY o.id, o.name;

-- 3. User Membership Access Policy
-- (Covered by multi_org_schema.sql)
-- CREATE POLICY ...

-- 4. Organization Admin Update Policy
-- (Covered by multi_org_schema.sql)

-- 5. auto_confirm_users.sql
-- (Keep this logic if it's a trigger for dev)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;
-- (Note: The above is a generic example, check your actual query content)

-- 6. create_org_rpc.sql
-- (CRITICAL: Match this with local create_org_rpc.sql)

-- 7. Vendor profile upsert
-- (Helper for old single-user table)

-- 8. Schema reload notifier
-- (System script)

-- 9. Opportunity Tracking...
-- (Base Schema)
