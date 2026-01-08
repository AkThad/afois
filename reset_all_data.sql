-- DANGER: DATA RESET SCRIPT
-- This deletes ALL Organizations, Members, and Pipeline Items.
-- It does NOT delete Users (to avoid auth breakage), but it removes their associations.

BEGIN;

-- 1. Remove all Memberships
DELETE FROM public.organization_members;

-- 2. Remove all Organizations (Cascades to Pipeline Items, Documents, AI Analysis via FKs)
DELETE FROM public.organizations;

COMMIT;

-- After running this, go to /config and click "Initialize New Organization" to start fresh.
